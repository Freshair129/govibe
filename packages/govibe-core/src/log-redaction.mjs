// TASK-PRD-028 (AUD-10c): session/tool-call logs previously persisted full call args verbatim
// (e.g. scripts/mcp/runtime-core.mjs's `sessionTracker.logEvent("agent_run", { args, result })`),
// so a credential-bearing field passed as a tool argument (a connector token, an API key)
// would land in a durable `.jsonl` log. This is a generic, non-mutating redactor: any object
// key that LOOKS like a credential has its value replaced before the structure is logged,
// regardless of which call site produced it — new call sites are covered automatically.

const SENSITIVE_KEY_PATTERN = /token|secret|password|passwd|api[_-]?key|apikey|credential|authoriz|private[_-]?key|access[_-]?key|client[_-]?secret/i;
const REDACTED = "[REDACTED]";
const DEFAULT_MAX_DEPTH = 8;

function redactValue(value, depth) {
  if (depth <= 0) return value;
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth - 1));
  if (value && typeof value === "object") {
    const result = {};
    for (const [key, entryValue] of Object.entries(value)) {
      result[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactValue(entryValue, depth - 1);
    }
    return result;
  }
  return value;
}

/**
 * Returns a deep-cloned copy of `value` with every object key matching a credential-shaped
 * name (token, secret, password, apiKey, credential, authorization, privateKey, ...) replaced
 * by a fixed redaction marker. Non-object/array values pass through unchanged. Never mutates
 * its input.
 */
export function redactSensitiveFields(value, { maxDepth = DEFAULT_MAX_DEPTH } = {}) {
  return redactValue(value, maxDepth);
}
