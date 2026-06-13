import fs from "node:fs";
import path from "node:path";

function parseScalar(raw) {
  const value = raw.trim();
  if (value === "") return "";
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (!Number.isNaN(Number(value)) && /^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return value;
}

function nextRelevantLine(lines, startIndex) {
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    return {
      raw,
      trimmed,
      indent: raw.match(/^ */)?.[0].length ?? 0,
    };
  }
  return null;
}

function parseYaml(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const root = {};
  const stack = [{ indent: -1, container: root }];

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const indent = raw.match(/^ */)?.[0].length ?? 0;

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].container;

    if (trimmed.startsWith("- ")) {
      if (!Array.isArray(parent)) {
        throw new Error(`Invalid YAML list item at line ${index + 1}`);
      }
      parent.push(parseScalar(trimmed.slice(2)));
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      throw new Error(`Invalid YAML key/value at line ${index + 1}`);
    }

    const key = trimmed.slice(0, colonIndex).trim();
    const rest = trimmed.slice(colonIndex + 1).trim();

    if (rest !== "") {
      parent[key] = parseScalar(rest);
      continue;
    }

    const nextLine = nextRelevantLine(lines, index);
    const childIsArray =
      nextLine && nextLine.indent > indent && nextLine.trimmed.startsWith("- ");
    const child = childIsArray ? [] : {};
    parent[key] = child;
    stack.push({ indent, container: child });
  }

  return root;
}

function normalizeRel(relPath) {
  return relPath.replace(/\\/g, "/").replace(/\/+$/, "");
}

function dedupe(items) {
  return [...new Set(items)];
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function resolvePath(rootDir, relOrAbs) {
  if (path.isAbsolute(relOrAbs)) return relOrAbs;
  return path.resolve(rootDir, relOrAbs);
}

function listFilesRecursive(dirPath, allowedExtensions) {
  const out = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(fullPath, allowedExtensions));
      continue;
    }
    if (allowedExtensions.has(path.extname(entry.name).toLowerCase())) {
      out.push(fullPath);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function readContextEntries(rootDir, entries, allowedExtensions, maxFiles) {
  const files = [];
  for (const entry of entries) {
    const resolved = resolvePath(rootDir, entry);
    if (!fs.existsSync(resolved)) continue;
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      files.push(...listFilesRecursive(resolved, allowedExtensions));
    } else {
      files.push(resolved);
    }
  }
  return dedupe(files).slice(0, maxFiles);
}

function findScopeConfig(registry, requestedScope) {
  if (!requestedScope) return null;
  const scopeKey = normalizeRel(requestedScope);
  if (registry.scopes?.[scopeKey]) {
    return { key: scopeKey, value: registry.scopes[scopeKey] };
  }

  const candidates = Object.keys(registry.scopes ?? {})
    .filter((key) => scopeKey.startsWith(normalizeRel(key)))
    .sort((a, b) => b.length - a.length);
  if (candidates.length === 0) return null;
  const best = candidates[0];
  return { key: best, value: registry.scopes[best] };
}

function ensureAgentAllowed(agentConfig, scopeKey) {
  const allowedScopes = agentConfig.allowed_scopes ?? [];
  if (allowedScopes.length === 0 || !scopeKey) return;
  const ok = allowedScopes.some((allowed) => scopeKey.startsWith(normalizeRel(allowed)));
  if (!ok) {
    throw new Error(`Agent is not allowed for scope: ${scopeKey}`);
  }
}

function buildPrompt({
  rootDir,
  agentConfig,
  scopeKey,
  scopeConfig,
  mode,
  task,
  contextFiles,
  maxCharsPerFile,
}) {
  const sections = [];
  sections.push(`You are operating as ${agentConfig.label} (${agentConfig.role}).`);
  sections.push(`Mode: ${mode}`);
  if (scopeKey) sections.push(`Scope: ${scopeKey}`);
  sections.push(`Task: ${task}`);

  const guidance = [
    "Read and follow the global contracts first.",
    "Treat human-readable SWE docs as canonical.",
    "Use the injected files as the bounded working context for this task.",
    "If two sources conflict, follow the source-of-truth order declared in the contracts.",
  ];

  const fileParts = contextFiles.map((filePath) => {
    const relPath = normalizeRel(path.relative(rootDir, filePath));
    const raw = fs.readFileSync(filePath, "utf8");
    const truncated = raw.length > maxCharsPerFile;
    const content = truncated ? `${raw.slice(0, maxCharsPerFile)}\n\n[TRUNCATED]` : raw;
    return `===== FILE: ${relPath} =====\n${content}`;
  });

  return [
    sections.join("\n"),
    "Context rules:",
    guidance.map((item) => `- ${item}`).join("\n"),
    "Injected context files:",
    contextFiles
      .map((filePath, index) => `  ${index + 1}. ${normalizeRel(path.relative(rootDir, filePath))}`)
      .join("\n"),
    scopeConfig?.preferred_agent
      ? `Preferred agent for this scope from registry: ${scopeConfig.preferred_agent}`
      : "",
    fileParts.join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const rootDir = path.resolve(args.root ?? process.cwd());
  const registryPath = resolvePath(rootDir, args.registry ?? ".agents/agent-registry.yaml");
  const registry = parseYaml(fs.readFileSync(registryPath, "utf8"));
  const scopeInfo = findScopeConfig(registry, args.scope ?? "");

  let agentKey = args.agent;
  if (!agentKey && scopeInfo?.value?.preferred_agent) {
    agentKey = scopeInfo.value.preferred_agent;
  }
  if (!agentKey) {
    throw new Error("No agent specified and no preferred agent found for scope.");
  }

  const agentConfig = registry.agents?.[agentKey];
  if (!agentConfig) {
    throw new Error(`Unknown agent: ${agentKey}`);
  }

  const scopeKey = scopeInfo?.key ?? (args.scope ? normalizeRel(args.scope) : "");
  ensureAgentAllowed(agentConfig, scopeKey);

  const mode = args.mode ?? registry.defaults?.mode ?? "doc";
  const maxFiles = Number(args.maxFiles ?? registry.defaults?.max_files ?? 16);
  const maxCharsPerFile = Number(
    args.maxCharsPerFile ?? registry.defaults?.max_chars_per_file ?? 12000,
  );
  const includeExtensions = new Set(
    (registry.defaults?.include_extensions ?? [".md", ".html"]).map((item) =>
      String(item).toLowerCase(),
    ),
  );
  const task = args.task ?? "No task provided.";
  const modeConfig = registry.modes?.[mode] ?? registry.modes?.doc ?? {};
  const includeKeys = asArray(modeConfig.include);
  const contextEntryBuckets = {
    global_context: registry.root_contract?.global_context ?? [],
    agent_contract: agentConfig.contract ? [agentConfig.contract] : [],
    agent_default_context: agentConfig.default_context ?? [],
    scope_context: scopeInfo?.value?.context ?? [],
    scope_atomic_context: scopeInfo?.value?.atomic_context ?? [],
    scope_verification_context: scopeInfo?.value?.verification_context ?? [],
  };
  const contextEntries = dedupe(
    includeKeys.flatMap((key) => asArray(contextEntryBuckets[key] ?? [])),
  );

  const contextFiles = readContextEntries(rootDir, contextEntries, includeExtensions, maxFiles);
  const prompt = buildPrompt({
    rootDir,
    agentConfig,
    scopeKey,
    scopeConfig: scopeInfo?.value ?? null,
    mode,
    task,
    contextFiles,
    maxCharsPerFile,
  });

  const result = {
    agent: agentKey,
    label: agentConfig.label,
    role: agentConfig.role,
    mode,
    scope: scopeKey || null,
    registry: normalizeRel(path.relative(rootDir, registryPath)),
    includeKeys,
    contextFiles: contextFiles.map((filePath) => normalizeRel(path.relative(rootDir, filePath))),
    executorDefaults: registry.executor_defaults ?? {},
    executors: registry.executors ?? {},
    localSidecar: registry.local_sidecar ?? {},
    agentExecutionPolicy: agentConfig.execution_policy ?? {},
    scopeExecutionPolicy: scopeInfo?.value?.execution_policy ?? {},
    prompt,
  };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(prompt);
}

main();
