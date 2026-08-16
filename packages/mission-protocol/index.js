export const MISSION_PROTOCOL_VERSION = "2.0.0";
export const MISSION_PROTOCOL_COMPATIBILITY = 2;
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
  sessionBufferChars: 24000,
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

const orchestrationTaskStatuses = new Set(["queued", "running", "verifying", "done", "failed", "blocked"]);
const orchestrationWaveStatuses = new Set(["pending", "active", "complete", "skipped"]);
const agentSessionAccessScopes = new Set(["H0", "H1", "H2", "H3", "H4"]);
const agentSessionStates = new Set(["running", "exited"]);

function isAgentSessionRecord(value) {
  return isBoundedRecord(value)
    && hasOnlyKeys(value, ["id", "agentId", "cwd", "state", "accessScope", "startedAt", "buffer", "exitCode"])
    && isBoundedString(value.id, MISSION_PROTOCOL_LIMITS.idChars)
    && isBoundedString(value.agentId, MISSION_PROTOCOL_LIMITS.idChars)
    && isBoundedString(value.cwd, MISSION_PROTOCOL_LIMITS.pathChars)
    && agentSessionStates.has(value.state)
    && agentSessionAccessScopes.has(value.accessScope)
    && isBoundedString(value.startedAt, MISSION_PROTOCOL_LIMITS.idChars)
    && isBoundedString(value.buffer, MISSION_PROTOCOL_LIMITS.sessionBufferChars, { allowEmpty: true })
    && (value.exitCode === undefined || value.exitCode === null || Number.isInteger(value.exitCode));
}

function isMissionOrchestrationTask(value) {
  return isBoundedRecord(value)
    && hasOnlyKeys(value, ["taskId", "assigneeId", "status", "attempts"])
    && isBoundedString(value.taskId, MISSION_PROTOCOL_LIMITS.idChars)
    && (value.assigneeId === undefined || isBoundedString(value.assigneeId, MISSION_PROTOCOL_LIMITS.idChars))
    && orchestrationTaskStatuses.has(value.status)
    && Number.isInteger(value.attempts) && value.attempts >= 0;
}

function isMissionOrchestrationWave(value) {
  return isBoundedRecord(value)
    && hasOnlyKeys(value, ["id", "index", "level", "status", "taskIds", "tasks", "concurrency", "startedAt", "completedAt"])
    && isBoundedString(value.id, MISSION_PROTOCOL_LIMITS.idChars)
    && Number.isInteger(value.index) && value.index >= 0
    && Number.isInteger(value.level) && value.level >= 0
    && orchestrationWaveStatuses.has(value.status)
    && isBoundedArray(value.taskIds) && value.taskIds.every((taskId) => isBoundedString(taskId, MISSION_PROTOCOL_LIMITS.idChars))
    && isBoundedArray(value.tasks) && value.tasks.every(isMissionOrchestrationTask)
    && Number.isInteger(value.concurrency) && value.concurrency >= 0
    && (value.startedAt === undefined || isBoundedString(value.startedAt, MISSION_PROTOCOL_LIMITS.idChars))
    && (value.completedAt === undefined || isBoundedString(value.completedAt, MISSION_PROTOCOL_LIMITS.idChars));
}

function isMissionOrchestrationSnapshot(value) {
  return isBoundedRecord(value)
    && hasOnlyKeys(value, ["waves", "updatedAt"])
    && isBoundedArray(value.waves)
    && value.waves.every(isMissionOrchestrationWave)
    && isBoundedString(value.updatedAt, MISSION_PROTOCOL_LIMITS.idChars);
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
    case "memory.search": return hasOnlyKeys(value, ["type", "vaultId", "query", "mode", "limit"])
      && isBoundedString(value.vaultId, MISSION_PROTOCOL_LIMITS.idChars)
      && isBoundedString(value.query, MISSION_PROTOCOL_LIMITS.commandChars)
      && (value.mode === undefined || ["hybrid", "fts", "vector"].includes(value.mode))
      && (value.limit === undefined || (Number.isInteger(value.limit) && value.limit > 0 && value.limit <= MISSION_PROTOCOL_LIMITS.arrayItems));
    case "memory.select": return hasOnlyKeys(value, ["type", "entityId"])
      && (value.entityId === null || isBoundedString(value.entityId, MISSION_PROTOCOL_LIMITS.idChars));
    case "memory.forget": return hasOnlyKeys(value, ["type", "entityId", "reason"])
      && isBoundedString(value.entityId, MISSION_PROTOCOL_LIMITS.idChars)
      && isBoundedString(value.reason, MISSION_PROTOCOL_LIMITS.commandChars);
    case "memory.decay.run": return hasOnlyKeys(value, ["type", "vaultId", "dryRun"])
      && isBoundedString(value.vaultId, MISSION_PROTOCOL_LIMITS.idChars)
      && (value.dryRun === undefined || typeof value.dryRun === "boolean");
    case "agent.session.start": return hasOnlyKeys(value, ["type", "agent", "cwd", "accessScope", "approvalRef", "cols", "rows"])
      && isBoundedString(value.agent, MISSION_PROTOCOL_LIMITS.idChars)
      && isBoundedString(value.cwd, MISSION_PROTOCOL_LIMITS.pathChars)
      && agentSessionAccessScopes.has(value.accessScope)
      && (value.approvalRef === undefined || isBoundedString(value.approvalRef, MISSION_PROTOCOL_LIMITS.idChars))
      && (value.cols === undefined || (Number.isInteger(value.cols) && value.cols > 0 && value.cols <= 500))
      && (value.rows === undefined || (Number.isInteger(value.rows) && value.rows > 0 && value.rows <= 500));
    case "agent.session.input": return hasOnlyKeys(value, ["type", "sessionId", "data"])
      && isBoundedString(value.sessionId, MISSION_PROTOCOL_LIMITS.idChars)
      && isBoundedString(value.data, MISSION_PROTOCOL_LIMITS.commandChars, { allowEmpty: true });
    case "agent.session.stop": return hasOnlyKeys(value, ["type", "sessionId"])
      && isBoundedString(value.sessionId, MISSION_PROTOCOL_LIMITS.idChars);
    case "agent.session.resize": return hasOnlyKeys(value, ["type", "sessionId", "cols", "rows"])
      && isBoundedString(value.sessionId, MISSION_PROTOCOL_LIMITS.idChars)
      && Number.isInteger(value.cols) && value.cols > 0 && value.cols <= 500
      && Number.isInteger(value.rows) && value.rows > 0 && value.rows <= 500;
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
    && isMissionOrchestrationSnapshot(value.orchestration)
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
    case "orchestration.update": return hasOnlyKeys(value, ["type", "orchestration"]) && isMissionOrchestrationSnapshot(value.orchestration);
    case "workflow.run": return hasOnlyKeys(value, ["type", "run"]) && isBoundedRecord(value.run) && isBoundedString(value.run.runId, MISSION_PROTOCOL_LIMITS.idChars);
    case "memory.search.result": return hasOnlyKeys(value, ["type", "result"]) && isBoundedRecord(value.result) && isBoundedString(value.result.query, MISSION_PROTOCOL_LIMITS.commandChars);
    case "memory.selection": return hasOnlyKeys(value, ["type", "entityId"]) && (value.entityId === null || isBoundedString(value.entityId, MISSION_PROTOCOL_LIMITS.idChars));
    case "memory.forgotten": return hasOnlyKeys(value, ["type", "entityId", "vaultId"]) && isBoundedString(value.entityId, MISSION_PROTOCOL_LIMITS.idChars) && (value.vaultId === null || isBoundedString(value.vaultId, MISSION_PROTOCOL_LIMITS.idChars));
    case "memory.decay.result": return hasOnlyKeys(value, ["type", "result"]) && isBoundedRecord(value.result) && isBoundedString(value.result.vaultId, MISSION_PROTOCOL_LIMITS.idChars);
    case "usage.update": return hasOnlyKeys(value, ["type", "usage"]) && isBoundedRecord(value.usage);
    case "sessions.update": return hasOnlyKeys(value, ["type", "sessions"])
      && isBoundedArray(value.sessions)
      && value.sessions.every(isAgentSessionRecord);
    case "agent.session.output": return hasOnlyKeys(value, ["type", "sessionId", "data"])
      && isBoundedString(value.sessionId, MISSION_PROTOCOL_LIMITS.idChars)
      && isBoundedString(value.data, MISSION_PROTOCOL_LIMITS.commandChars, { allowEmpty: true });
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
