const MAX_STRING = 4096;
const MAX_META_KEYS = 64;
const MAX_FILE_BYTES = 1_000_000;

function fail(message) {
  const error = new Error(message);
  error.code = "INVALID_MISSION_COMMAND";
  return error;
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw fail(`${label} must be an object.`);
  return value;
}

function requireString(value, label, max = MAX_STRING) {
  if (typeof value !== "string" || value.length === 0 || value.length > max) {
    throw fail(`${label} must be a non-empty string no longer than ${max} characters.`);
  }
  return value;
}

function optionalString(value, label, max = MAX_STRING) {
  if (value === undefined) return undefined;
  return requireString(value, label, max);
}

function rejectUnknownKeys(object, allowed) {
  const unknown = Object.keys(object).filter((key) => !allowed.has(key));
  if (unknown.length > 0) throw fail(`Unknown mission command field(s): ${unknown.join(", ")}`);
}

export function validateMissionCommand(input) {
  const command = requireObject(input, "Mission command");
  const type = requireString(command.type, "Mission command type", 128);

  switch (type) {
    case "terminal.command":
      rejectUnknownKeys(command, new Set(["type", "command"]));
      return { type, command: requireString(command.command, "command", 16_384) };
    case "agent.select":
      rejectUnknownKeys(command, new Set(["type", "agentId"]));
      return { type, agentId: requireString(command.agentId, "agentId", 256) };
    case "roadmap.select":
    case "masterplan.preview":
      rejectUnknownKeys(command, new Set(["type", "sourcePath"]));
      return { type, sourcePath: requireString(command.sourcePath, "sourcePath", MAX_STRING) };
    case "workspace.scan":
      rejectUnknownKeys(command, new Set(["type", "workspacePath", "deep", "runId"]));
      if (typeof command.deep !== "boolean") throw fail("deep must be a boolean.");
      return {
        type,
        workspacePath: requireString(command.workspacePath, "workspacePath", MAX_STRING),
        deep: command.deep,
        runId: optionalString(command.runId, "runId", 256),
      };
    case "reactor.run":
      rejectUnknownKeys(command, new Set(["type", "profile"]));
      return { type, profile: requireString(command.profile, "profile", 512) };
    case "file.save": {
      rejectUnknownKeys(command, new Set(["type", "hash", "data", "meta"]));
      if (!Array.isArray(command.data) || command.data.length > MAX_FILE_BYTES || command.data.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
        throw fail(`data must be a byte array no larger than ${MAX_FILE_BYTES} bytes.`);
      }
      const meta = requireObject(command.meta, "meta");
      if (Object.keys(meta).length > MAX_META_KEYS) throw fail(`meta may contain at most ${MAX_META_KEYS} keys.`);
      return { type, hash: requireString(command.hash, "hash", 256), data: command.data, meta };
    }
    default:
      throw fail(`Unsupported mission command type: ${type}`);
  }
}

export const missionProtocolLimits = {
  maxRequestBytes: 1_048_576,
  maxFileBytes: MAX_FILE_BYTES,
};
