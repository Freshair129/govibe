import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertNoLinksWithin, mkdirSafe } from "./path-safety.mjs";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function definitionHash(definition) {
  const { contentHash: _ignored, sourcePath: _sourcePath, ...content } = definition;
  return `sha256:${createHash("sha256").update(JSON.stringify(stable(content))).digest("hex")}`;
}

export async function readSkillDefinition(filePath) {
  const raw = await readFile(filePath, "utf8");
  let definition;
  try {
    const json = raw.trimStart().startsWith("{")
      ? raw
      : raw.match(/```json\s*([\s\S]*?)```/i)?.[1];
    if (!json) throw new Error("missing JSON contract block");
    definition = JSON.parse(json);
  } catch {
    throw new Error(`Invalid Skill Definition JSON: ${filePath}`);
  }
  if (definition.schema !== "govibe-skill-definition/v1" || !definition.id || !definition.version) {
    throw new Error(`Invalid govibe-skill-definition/v1: ${filePath}`);
  }
  const stringArrays = ["aliases", "permissions", "verificationRequirements"];
  if (stringArrays.some((field) => !Array.isArray(definition[field]) || definition[field].some((item) => typeof item !== "string"))) {
    throw new Error(`Invalid govibe-skill-definition/v1 string arrays: ${filePath}`);
  }
  if (!definition.inputSchema || typeof definition.inputSchema !== "object" || Array.isArray(definition.inputSchema)
    || !definition.outputSchema || typeof definition.outputSchema !== "object" || Array.isArray(definition.outputSchema)) {
    throw new Error(`Invalid govibe-skill-definition/v1 schemas: ${filePath}`);
  }
  if (!Array.isArray(definition.stageHooks) || definition.stageHooks.some((hook) => !Number.isInteger(hook?.stage) || hook.stage < 1 || typeof hook.handler !== "string" || !hook.handler)) {
    throw new Error(`Invalid govibe-skill-definition/v1 stage hooks: ${filePath}`);
  }
  const computedHash = definitionHash(definition);
  if (definition.contentHash !== computedHash) {
    throw new Error(`Skill content hash mismatch for ${definition.id}@${definition.version}.`);
  }
  return { ...definition, sourcePath: filePath };
}

function skillPath(root, id, version) {
  for (const [label, value] of [["skill id", id], ["skill version", version]]) {
    if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(value) || value.includes("..")) {
      throw new Error(`Invalid ${label}: ${value}`);
    }
  }
  return path.join(root, id, version, "SKILL.md");
}

async function readOptional(filePath, registryRoot) {
  try {
    await assertNoLinksWithin(registryRoot, filePath);
    return await readSkillDefinition(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

export async function resolveSkill({ workspacePath, globalRoot, id, version, contentHash, trustWorkspaceSkills = false, trustedWorkspaceHashes = [] }) {
  const workspaceFile = skillPath(path.join(workspacePath, ".govibe", "skills"), id, version);
  const globalFile = skillPath(globalRoot, id, version);
  const [workspaceDefinition, globalDefinition] = await Promise.all([
    readOptional(workspaceFile, path.join(workspacePath, ".govibe", "skills")),
    readOptional(globalFile, globalRoot),
  ]);

  if (workspaceDefinition && globalDefinition && workspaceDefinition.contentHash !== globalDefinition.contentHash) {
    throw new Error(`Untrusted override rejected for ${id}@${version}.`);
  }
  const workspaceTrusted = workspaceDefinition
    && (trustWorkspaceSkills || trustedWorkspaceHashes.includes(workspaceDefinition.contentHash));
  const selected = workspaceDefinition
    ? (globalDefinition || workspaceTrusted ? workspaceDefinition : undefined)
    : globalDefinition;
  if (workspaceDefinition && !globalDefinition && !workspaceTrusted) {
    throw new Error(`Untrusted workspace skill rejected for ${id}@${version}.`);
  }
  if (!selected) throw new Error(`Missing skill version ${id}@${version}.`);
  if (contentHash && selected.contentHash !== contentHash) {
    throw new Error(`Pinned skill hash mismatch for ${id}@${version}.`);
  }
  return selected;
}

export async function loadGlobalTrustPolicy(globalGovibeRoot) {
  const policyPath = path.join(globalGovibeRoot, "trust-policy.json");
  try {
    const policy = JSON.parse(await readFile(policyPath, "utf8"));
    if (policy.schema !== "govibe-skill-trust-policy/v1") throw new Error(`Invalid global skill trust policy: ${policyPath}`);
    return {
      trustWorkspaceSkills: policy.allowWorkspaceSkills === true,
      trustedWorkspaceHashes: Array.isArray(policy.trustedContentHashes) ? policy.trustedContentHashes : [],
    };
  } catch (error) {
    if (error?.code === "ENOENT") return { trustWorkspaceSkills: false, trustedWorkspaceHashes: [] };
    throw error;
  }
}

export async function loadSkillLock(workspacePath) {
  const lockPath = path.join(workspacePath, ".govibe", "skill-lock.json");
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  if (lock.schema !== "govibe-skill-lock/v1" || !Array.isArray(lock.skills)) {
    throw new Error(`Invalid skill lock: ${lockPath}`);
  }
  return lock;
}

export async function installSkillDefinition(definition, destinationRoot) {
  const { sourcePath: _sourcePath, ...portableDefinition } = definition;
  const computedHash = definitionHash(portableDefinition);
  const normalized = { ...portableDefinition, contentHash: computedHash };
  const destination = skillPath(destinationRoot, normalized.id, normalized.version);
  const existing = await readOptional(destination, destinationRoot);
  if (existing && existing.contentHash !== computedHash) {
    throw new Error(`Immutable skill collision for ${normalized.id}@${normalized.version}.`);
  }
  await mkdirSafe(path.dirname(destinationRoot), path.dirname(destination));
  if (!existing) {
    const markdown = `# ${normalized.id} ${normalized.version}\n\n\`\`\`json\n${JSON.stringify(normalized, null, 2)}\n\`\`\`\n`;
    await writeFile(destination, markdown, { flag: "wx" });
  }
  return { definition: normalized, path: destination };
}
