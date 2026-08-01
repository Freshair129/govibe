const MAX_STRING = 4096;
const MAX_COMMAND = 16384;
const MAX_METADATA_KEYS = 100;
const MAX_FILE_BYTES = 1_000_000;

export class MissionProtocolError extends Error {
  constructor(message, statusCode = 400, code = "invalid-command") {
    super(message);
    this.name = "MissionProtocolError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MissionProtocolError(`${label} must be an object.`);
  }
  return value;
}

function requireString(value, label, max = MAX_STRING) {
  if (typeof value !== "string" || value.length === 0 || value.length > max) {
    throw new MissionProtocolError(`${label} must be a non-empty string no longer than ${max} characters.`);
  }
}

function rejectUnknownFields(command, allowed) {
  for (const key of Object.keys(command)) {
    if (!allowed.has(key)) throw new MissionProtocolError(`Unknown field '${key}' for ${command.type}.`);
  }
}

export function validateMissionCommand(input) {
  const command = requireObject(input, "command");
  requireString(command.type, "command.type", 128);

  switch (command.type) {
    case "terminal.command":
      rejectUnknownFields(command, new Set(["type", "command"]));
      requireString(command.command, "command.command", MAX_COMMAND);
      break;
    case "agent.select":
      rejectUnknownFields(command, new Set(["type", "agentId"]));
      requireString(command.agentId, "command.agentId");
      break;
    case "roadmap.select":
    case "masterplan.preview":
      rejectUnknownFields(command, new Set(["type", "sourcePath"]));
      requireString(command.sourcePath, "command.sourcePath");
      break;
    case "workspace.scan":
      rejectUnknownFields(command, new Set(["type", "workspacePath", "deep", "runId"]));
      requireString(command.workspacePath, "command.workspacePath");
      if (typeof command.deep !== "boolean") throw new MissionProtocolError("command.deep must be boolean.");
      if (command.runId !== undefined) requireString(command.runId, "command.runId", 128);
      break;
    case "reactor.run":
      rejectUnknownFields(command, new Set(["type", "profile"]));
      requireString(command.profile, "command.profile");
      break;
    case "file.save": {
      rejectUnknownFields(command, new Set(["type", "hash", "data", "meta"]));
      requireString(command.hash, "command.hash", 256);
      if (!Array.isArray(command.data) || command.data.length > MAX_FILE_BYTES || command.data.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
        throw new MissionProtocolError(`command.data must be a byte array no larger than ${MAX_FILE_BYTES} bytes.`);
      }
      const meta = requireObject(command.meta, "command.meta");
      if (Object.keys(meta).length > MAX_METADATA_KEYS) throw new MissionProtocolError("command.meta has too many keys.");
      break;
    }
    default:
      throw new MissionProtocolError(`Unknown mission command type '${command.type}'.`);
  }

  return command;
}

export async function readBoundedJsonBody(request, maxBytes = MAX_FILE_BYTES) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBytes) throw new MissionProtocolError("Request body too large.", 413, "payload-too-large");
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new MissionProtocolError("Malformed JSON request body.", 400, "malformed-json");
  }
}
