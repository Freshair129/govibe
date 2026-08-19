// TASK-PRD-028 (AUD-10a): spawned agent processes and PTY sessions previously inherited the
// FULL parent `process.env`, including server secrets such as GOVIBE_MCP_TOKEN and the
// GOVIBE_MSP_* family. A child process (a user-facing shell, or a CLI agent binary) has no
// legitimate need for the sidecar's own bearer token or MSP client credentials. This module is
// the single allowlisted-env builder both spawn sites (scripts/mcp/runtime/agent-session-service.mjs
// and scripts/mcp/runtime-core.mjs's runAgent) use, so the allowlist has one home rather than
// two hand-maintained copies.

// Deliberately an ALLOWLIST of variable NAMES (not a blocklist of secret names): a name added
// to `process.env` in the future that happens to look like a secret is safe by default; a
// genuinely-needed variable must be added here explicitly and reviewed.
export const CHILD_ENV_ALLOWLIST = Object.freeze([
  // PATH resolution (spawning a shell / shim / binary at all)
  "PATH",
  "Path",
  "PATHEXT",
  // Windows process/shell plumbing (cmd.exe, ConPTY, npm .cmd/.ps1 shims)
  "SystemRoot",
  "SystemDrive",
  "windir",
  "ComSpec",
  "PSModulePath",
  // Temp/home/profile directories tools commonly assume exist
  "TEMP",
  "TMP",
  "TMPDIR",
  "HOME",
  "HOMEDRIVE",
  "HOMEPATH",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "USERNAME",
  "USER",
  // Locale/terminal presentation
  "LANG",
  "LC_ALL",
  "TERM",
  // Non-secret runtime hints some CLIs read
  "NODE_ENV",
  "NUMBER_OF_PROCESSORS",
  "PROCESSOR_ARCHITECTURE",
]);

/**
 * Builds an explicit, allowlisted environment for a spawned child process (agent CLI, PTY
 * session, or the PowerShell agent launcher). Never returns `process.env` itself or a
 * superset of it — only the names in `allowlist` are copied across, plus any caller-supplied
 * `extra` overrides (e.g. an agent-scoped token the child DOES need).
 */
export function buildAllowlistedChildEnv(extra = {}, { allowlist = CHILD_ENV_ALLOWLIST, source = process.env } = {}) {
  const env = {};
  for (const key of allowlist) {
    if (source[key] !== undefined) env[key] = source[key];
  }
  return { ...env, ...extra };
}
