import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { assertNoLinksWithin } from "../path-safety.mjs";
import { MODE2_METADATA_ROOT, sha256 } from "./metadata-store.mjs";

/**
 * The WorkspaceAdapter is the only seam where client-specific behaviour is allowed. Every
 * module below it is provider-neutral and must never branch on `client`.
 *
 * Client adapters differ only in the data they declare: identity, capability hints,
 * instruction locations, and workspace conventions. They deliberately share one filesystem
 * implementation — a client adapter that needs to override read/stat/search would be a
 * Phase-1 design smell.
 */

export const WORKSPACE_CLIENTS = ["claude-code", "gemini-cli", "codex", "generic"];

export const DEFAULT_EXCLUSIONS = [
  ".git",
  ".next",
  ".nuxt",
  ".turbo",
  ".vercel",
  ".vite",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor",
];

const ADAPTER_PROFILES = {
  "claude-code": {
    adapterId: "claude-code",
    instructionSources: [
      { path: "CLAUDE.md", kind: "agent-instruction" },
      { path: ".claude/CLAUDE.md", kind: "agent-instruction" },
      { path: "AGENTS.md", kind: "governor" },
      { path: "README.md", kind: "readme" },
    ],
    agentConfigurationRoots: [".claude", ".agents"],
    capabilities: { skills: true, subagents: true, mcp_client: true, hooks: true, slash_commands: true, memory: true },
  },
  "gemini-cli": {
    adapterId: "gemini-cli",
    instructionSources: [
      { path: "GEMINI.md", kind: "agent-instruction" },
      { path: ".gemini/GEMINI.md", kind: "agent-instruction" },
      { path: "AGENTS.md", kind: "governor" },
      { path: "README.md", kind: "readme" },
    ],
    agentConfigurationRoots: [".gemini", ".agents"],
    capabilities: { skills: false, subagents: false, mcp_client: true, hooks: false, slash_commands: true, memory: true },
  },
  codex: {
    adapterId: "codex",
    instructionSources: [
      { path: "AGENTS.md", kind: "agent-instruction" },
      { path: "AGENT.md", kind: "agent-instruction" },
      { path: "README.md", kind: "readme" },
    ],
    agentConfigurationRoots: [".agents"],
    capabilities: { skills: false, subagents: false, mcp_client: true, hooks: false, slash_commands: false, memory: false },
  },
  generic: {
    adapterId: "generic-filesystem",
    instructionSources: [
      { path: "AGENTS.md", kind: "agent-instruction" },
      { path: "AGENT.md", kind: "agent-instruction" },
      { path: "README.md", kind: "readme" },
    ],
    agentConfigurationRoots: [".agents"],
    capabilities: { skills: false, subagents: false, mcp_client: false, hooks: false, slash_commands: false, memory: false },
  },
};

/** An unrecognised client is a first-class citizen, not an error. Provider neutrality. */
export function resolveClient(client) {
  const value = String(client ?? "generic").trim().toLowerCase();
  return Object.hasOwn(ADAPTER_PROFILES, value) ? value : "generic";
}

function toPosix(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

/**
 * Codepoint ordering, not `localeCompare`. Adapter output is hashed and those hashes back
 * the reproducibility claim, so ordering must not vary with the host locale.
 */
export function byCodepoint(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/**
 * Typed so that callers branch on `reason`, never on message text. A guard whose message can
 * be reworded must not be able to change another module's control flow.
 */
export class PathBoundaryError extends Error {
  constructor(message, reason) {
    super(message);
    this.name = "PathBoundaryError";
    this.reason = reason;
  }
}

function assertWorkspaceRelative(relativePath) {
  const value = toPosix(relativePath);
  if (!value) throw new PathBoundaryError("Workspace path must not be empty.", "empty_path");
  if (value.startsWith("/") || path.isAbsolute(relativePath) || /^[a-zA-Z]:/.test(value)) {
    throw new PathBoundaryError(`Workspace path must be relative: ${relativePath}`, "not_relative");
  }
  if (value.split("/").includes("..")) {
    throw new PathBoundaryError(`Workspace path escapes its root: ${relativePath}`, "escapes_root");
  }
  return value;
}

function globToRegExp(glob) {
  let pattern = "";
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index];
    if (character === "*") {
      if (glob[index + 1] === "*") {
        pattern += glob[index + 2] === "/" ? "(?:.*/)?" : ".*";
        index += glob[index + 2] === "/" ? 2 : 1;
        continue;
      }
      pattern += "[^/]*";
      continue;
    }
    if (character === "?") {
      pattern += "[^/]";
      continue;
    }
    pattern += character.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${pattern}$`);
}

export function createWorkspaceAdapter({ client = "generic", workspaceRoot, exclusions = DEFAULT_EXCLUSIONS } = {}) {
  if (!workspaceRoot) throw new Error("An external workspace adapter requires a workspace root.");
  const resolvedClient = resolveClient(client);
  const profile = ADAPTER_PROFILES[resolvedClient];
  const root = path.resolve(workspaceRoot);
  const excluded = new Set(exclusions);

  async function absolute(relativePath) {
    const normalized = assertWorkspaceRelative(relativePath);
    const target = path.join(root, ...normalized.split("/"));
    try {
      await assertNoLinksWithin(root, target);
    } catch (error) {
      if (error instanceof PathBoundaryError) throw error;
      throw new PathBoundaryError(String(error?.message ?? error), "link_or_escape");
    }
    return { normalized, target };
  }

  async function readText(relativePath) {
    const { target } = await absolute(relativePath);
    return readFile(target, "utf8");
  }

  let cachedFiles = null;

  async function discoverProjectFiles() {
    if (cachedFiles) return cachedFiles;
    const files = [];
    const directories = [];
    const unreadable = [];

    async function visit(directory, relativeDirectory) {
      let entries;
      try {
        entries = await readdir(directory, { withFileTypes: true });
      } catch (error) {
        // A directory we cannot read is recorded, never silently dropped. Scanning a
        // workspace GoVibe does not own makes permission-restricted subtrees ordinary, and
        // a smaller inventory presented without explanation would let every later stage
        // reconstruct semantics from a partial tree while reporting full confidence.
        if (error?.code === "ENOENT" || error?.code === "EACCES" || error?.code === "EPERM") {
          unreadable.push({ path: relativeDirectory || ".", code: error.code });
          return;
        }
        throw error;
      }
      for (const entry of entries) {
        if (excluded.has(entry.name)) continue;
        const relative = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
        if (relative === MODE2_METADATA_ROOT) continue;
        const full = path.join(directory, entry.name);
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
          directories.push(relative);
          await visit(full, relative);
          continue;
        }
        if (!entry.isFile()) continue;
        const info = await stat(full);
        files.push({
          path: relative,
          size: info.size,
          extension: path.extname(entry.name).toLowerCase(),
          mtimeMs: Math.trunc(info.mtimeMs),
        });
      }
    }

    await visit(root, "");
    files.sort((left, right) => byCodepoint(left.path, right.path));
    directories.sort(byCodepoint);
    unreadable.sort((left, right) => byCodepoint(left.path, right.path));
    cachedFiles = { files, directories, unreadable, exclusions: [...excluded].sort() };
    return cachedFiles;
  }

  return {
    identify() {
      return {
        schema: "govibe-mode2-workspace-identity/v1",
        adapter_id: profile.adapterId,
        client: resolvedClient,
        workspace_mode: "external",
        workspace_root: root,
        write_policy: "metadata-only",
        metadata_root: MODE2_METADATA_ROOT,
      };
    },

    getRoot() {
      return root;
    },

    async discoverCapabilities() {
      const instructions = await this.discoverInstructions();
      return {
        schema: "govibe-mode2-capability-manifest/v1",
        adapter_id: profile.adapterId,
        capabilities: {
          ...profile.capabilities,
          instruction_files: instructions.filter((source) => source.exists).map((source) => source.path),
        },
      };
    },

    /**
     * Well-known paths that do not exist are reported with `exists: false` rather than
     * omitted, so that absence is recorded as evidence instead of silence.
     */
    async discoverInstructions() {
      const sources = [];
      for (const declared of profile.instructionSources) {
        let info = null;
        let content = null;
        let note = null;
        try {
          const { target } = await absolute(declared.path);
          info = await stat(target);
          content = await readFile(target, "utf8");
        } catch (error) {
          // Branch on a code, never on message text: a reworded guard message must not
          // change control flow. A well-known instruction path that is a symlink, or that
          // resolves outside the root, is reported as an unreadable source rather than
          // aborting the whole inspection — symlinked CLAUDE.md is legitimate in many repos.
          if (error?.code === "ENOENT") note = null;
          else if (error?.code === "EACCES" || error?.code === "EPERM") note = error.code;
          else if (error instanceof PathBoundaryError) note = error.reason;
          else throw error;
        }
        sources.push({
          path: declared.path,
          kind: declared.kind,
          client_affinity: resolvedClient,
          exists: Boolean(info?.isFile()),
          bytes: info?.isFile() ? info.size : 0,
          sha256: content === null ? null : sha256(content),
          unreadable: note,
        });
      }
      return sources;
    },

    discoverProjectFiles,

    async discoverAgentConfiguration() {
      const { files } = await discoverProjectFiles();
      const roots = profile.agentConfigurationRoots;
      return files
        .filter((file) => roots.some((configRoot) => file.path === configRoot || file.path.startsWith(`${configRoot}/`)))
        .map((file) => ({ path: file.path, root: roots.find((configRoot) => file.path.startsWith(configRoot)), size: file.size }));
    },

    async discoverExistingArtifacts() {
      const { files } = await discoverProjectFiles();
      const artifactRoots = ["docs", "doc", "documentation", "adr", "specs", "spec", "architecture", "rfc"];
      return files
        .filter((file) => artifactRoots.some((artifactRoot) => file.path.startsWith(`${artifactRoot}/`)))
        .map((file) => ({ path: file.path, kind: "documentation-artifact", size: file.size }));
    },

    read: readText,

    async stat(relativePath) {
      const { normalized, target } = await absolute(relativePath);
      const info = await stat(target);
      return { path: normalized, size: info.size, mtimeMs: Math.trunc(info.mtimeMs), isFile: info.isFile(), isDirectory: info.isDirectory() };
    },

    /** Bounded by construction: max_results is enforced and excluded paths are never read. */
    async search({ pattern, glob, regex = true, maxResults = 200 } = {}) {
      if (!pattern) throw new Error("A workspace search requires a pattern.");
      const matcher = regex ? new RegExp(pattern) : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const globMatcher = glob ? globToRegExp(glob) : null;
      const { files } = await discoverProjectFiles();
      const results = [];
      for (const file of files) {
        if (results.length >= maxResults) break;
        if (globMatcher && !globMatcher.test(file.path)) continue;
        let text;
        try {
          text = await readText(file.path);
        } catch {
          continue;
        }
        const lines = text.split(/\r?\n/);
        for (let index = 0; index < lines.length && results.length < maxResults; index += 1) {
          if (matcher.test(lines[index])) results.push({ path: file.path, line: index + 1, text: lines[index].trim() });
        }
      }
      return results;
    },
  };
}
