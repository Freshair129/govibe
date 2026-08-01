export const MISSION_PROTOCOL_VERSION = "1.0.0";
export const MISSION_PROTOCOL_COMPATIBILITY = 1;
export const MAX_PROTOCOL_MESSAGE_LENGTH = 240;
export const MISSION_PROTOCOL_LIMITS = Object.freeze({
  typeChars: 64,
  idChars: 256,
  pathChars: 4096,
  commandChars: 16384,
  arrayItems: 10000,
  metadataKeys: 64,
  metadataBytes: 16384,
  fileBytes: 262144,
  eventBytes: 1000000,
  jsonBodyBytes: 1000000,
});

const encoder = new TextEncoder();

export function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value, keys) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isBoundedString(value, max, { allowEmpty = false } = {}) {
  return typeof value === "string" && (allowEmpty || value.length > 0) && value.length <= max;
}

function isBoundedArray(value) {
  return Array.isArray(value) && value.length <= MISSION_PROTOCOL_LIMITS.arrayItems;
}

function isBoundedJson(value, maxBytes = MISSION_PROTOCOL_LIMITS.eventBytes) {
  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === "string" && encoder.encode(serialized).byteLength <= maxBytes;
  } catch {
    return false;
  }
}

function isBoundedRecord(value) {
  return isRecord(value) && isBoundedJson(value);
}

export function isFileSaveMetadata(value) {
  return isRecord(value)
    && Object.keys(value).length <= MISSION_PROTOCOL_LIMITS.metadataKeys
    && Object.keys(value).every((key) => isBoundedString(key, MISSION_PROTOCOL_LIMITS.idChars))
    && isBoundedJson(value, MISSION_PROTOCOL_LIMITS.metadataBytes);
}

function isFileData(value) {
  if (value instanceof ArrayBuffer) return value.byteLength <= MISSION_PROTOCOL_LIMITS.fileBytes;
  return Array.isArray(value)
    && value.length <= MISSION_PROTOCOL_LIMITS.fileBytes
    && value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255);
}

export function boundedProtocolMessage(value) {
  const message = value instanceof Error ? value.message : String(value ?? "Unknown error");
  return message.length > MAX_PROTOCOL_MESSAGE_LENGTH
    ? `${message.slice(0, MAX_PROTOCOL_MESSAGE_LENGTH - 1)}…`
    : message;
}

export function isMissionCommand(value) {
  if (!isRecord(value) || !isBoundedString(value.type, MISSION_PROTOCOL_LIMITS.typeChars)) return false;
  switch (value.type) {
    case "terminal.command": return hasOnlyKeys(value, ["type", "command"]) && isBoundedString(value.command, MISSION_PROTOCOL_LIMITS.commandChars);
    case "agent.select": return hasOnlyKeys(value, ["type", "agentId"]) && isBoundedString(value.agentId, MISSION_PROTOCOL_LIMITS.idChars);
    case "roadmap.select":
    case "masterplan.preview": return hasOnlyKeys(value, ["type", "sourcePath"]) && isBoundedString(value.sourcePath, MISSION_PROTOCOL_LIMITS.pathChars);
    case "workspace.scan": return hasOnlyKeys(value, ["type", "workspacePath", "deep", "runId"])
      && isBoundedString(value.workspacePath, MISSION_PROTOCOL_LIMITS.pathChars)
      && typeof value.deep === "boolean"
      && (value.runId === undefined || isBoundedString(value.runId, MISSION_PROTOCOL_LIMITS.idChars));
    case "reactor.run": return hasOnlyKeys(value, ["type", "profile"]) && isBoundedString(value.profile, MISSION_PROTOCOL_LIMITS.idChars);
    case "file.save": return hasOnlyKeys(value, ["type", "hash", "data", "meta"])
      && isBoundedString(value.hash, MISSION_PROTOCOL_LIMITS.idChars)
      && isFileData(value.data)
      && isFileSaveMetadata(value.meta);
    default: return false;
  }
}

export function isMissionSnapshot(value) {
  return isRecord(value)
    && ["disconnected", "connecting", "connected", "error"].includes(value.connectionState)
    && isBoundedArray(value.metrics)
    && isBoundedRecord(value.chart)
    && isBoundedArray(value.agents)
    && isBoundedArray(value.terminal)
    && isBoundedRecord(value.graph)
    && isBoundedArray(value.specs)
    && isBoundedArray(value.symbols)
    && isBoundedArray(value.campaignLogs)
    && isBoundedJson(value);
}

export function isMissionEvent(value) {
  if (!isRecord(value) || !isBoundedString(value.type, MISSION_PROTOCOL_LIMITS.typeChars) || !isBoundedJson(value)) return false;
  switch (value.type) {
    case "snapshot": return hasOnlyKeys(value, ["type", "snapshot"]) && isBoundedRecord(value.snapshot);
    case "terminal.line": return hasOnlyKeys(value, ["type", "line"]) && isBoundedRecord(value.line) && isBoundedString(value.line.id, MISSION_PROTOCOL_LIMITS.idChars);
    case "metrics.update": return hasOnlyKeys(value, ["type", "metrics"]) && isBoundedArray(value.metrics);
    case "chart.update": return hasOnlyKeys(value, ["type", "chart"]) && isBoundedRecord(value.chart);
    case "agents.update": return hasOnlyKeys(value, ["type", "agents"]) && isBoundedArray(value.agents);
    case "graph.update": return hasOnlyKeys(value, ["type", "graph"]) && isBoundedRecord(value.graph);
    case "heatmap.update": return hasOnlyKeys(value, ["type", "heatmap"]) && isBoundedRecord(value.heatmap);
    case "roadmap.snapshot": return hasOnlyKeys(value, ["type", "roadmap"]) && isBoundedRecord(value.roadmap);
    case "roadmap.node.update": return hasOnlyKeys(value, ["type", "node"]) && isBoundedRecord(value.node) && isBoundedString(value.node.id, MISSION_PROTOCOL_LIMITS.idChars);
    case "roadmap.assignment": return hasOnlyKeys(value, ["type", "assignment"]) && isBoundedRecord(value.assignment) && isBoundedString(value.assignment.taskId, MISSION_PROTOCOL_LIMITS.idChars);
    case "roadmap.handoff": return hasOnlyKeys(value, ["type", "handoff"]) && isBoundedRecord(value.handoff) && isBoundedString(value.handoff.taskId, MISSION_PROTOCOL_LIMITS.idChars);
    case "roadmap.verification": return hasOnlyKeys(value, ["type", "verification"]) && isBoundedRecord(value.verification) && isBoundedString(value.verification.taskId, MISSION_PROTOCOL_LIMITS.idChars);
    case "workflow.run": return hasOnlyKeys(value, ["type", "run"]) && isBoundedRecord(value.run) && isBoundedString(value.run.runId, MISSION_PROTOCOL_LIMITS.idChars);
    case "command.ack": return hasOnlyKeys(value, ["type", "commandId", "ok", "message", "snapshot"])
      && isBoundedString(value.commandId, MISSION_PROTOCOL_LIMITS.idChars)
      && typeof value.ok === "boolean"
      && (value.message === undefined || isBoundedString(value.message, MAX_PROTOCOL_MESSAGE_LENGTH, { allowEmpty: true }))
      && (value.snapshot === undefined || isBoundedRecord(value.snapshot));
    default: return false;
  }
}

export function createCommandResponse({ commandId, ok, message, snapshot, result }) {
  return {
    protocolVersion: MISSION_PROTOCOL_VERSION,
    compatibilityVersion: MISSION_PROTOCOL_COMPATIBILITY,
    commandId,
    ok,
    ...(message === undefined ? {} : { message: boundedProtocolMessage(message) }),
    ...(snapshot === undefined ? {} : { snapshot }),
    ...(result === undefined ? {} : { result }),
  };
}

export function isCommandResponse(value) {
  return isRecord(value)
    && value.protocolVersion === MISSION_PROTOCOL_VERSION
    && value.compatibilityVersion === MISSION_PROTOCOL_COMPATIBILITY
    && typeof value.commandId === "string"
    && typeof value.ok === "boolean"
    && (value.message === undefined || typeof value.message === "string")
    && (value.snapshot === undefined || isRecord(value.snapshot));
}
