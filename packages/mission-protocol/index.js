export const MISSION_PROTOCOL_VERSION = "1.0.0";
export const MISSION_PROTOCOL_COMPATIBILITY = 1;
export const MAX_PROTOCOL_MESSAGE_LENGTH = 240;

export function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function boundedProtocolMessage(value) {
  const message = value instanceof Error ? value.message : String(value ?? "Unknown error");
  return message.length > MAX_PROTOCOL_MESSAGE_LENGTH
    ? `${message.slice(0, MAX_PROTOCOL_MESSAGE_LENGTH - 1)}…`
    : message;
}

export function isMissionCommand(value) {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  switch (value.type) {
    case "terminal.command": return typeof value.command === "string";
    case "agent.select": return typeof value.agentId === "string";
    case "roadmap.select":
    case "masterplan.preview": return typeof value.sourcePath === "string";
    case "workspace.scan": return typeof value.workspacePath === "string" && typeof value.deep === "boolean";
    case "reactor.run": return typeof value.profile === "string";
    case "file.save": return typeof value.hash === "string" && isRecord(value.meta) && Array.isArray(value.data);
    default: return false;
  }
}

export function isMissionSnapshot(value) {
  return isRecord(value)
    && typeof value.connectionState === "string"
    && Array.isArray(value.metrics)
    && isRecord(value.chart)
    && Array.isArray(value.agents)
    && Array.isArray(value.terminal)
    && isRecord(value.graph)
    && Array.isArray(value.specs)
    && Array.isArray(value.symbols)
    && Array.isArray(value.campaignLogs);
}

export function isMissionEvent(value) {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  switch (value.type) {
    case "snapshot": return isRecord(value.snapshot);
    case "terminal.line": return isRecord(value.line) && typeof value.line.id === "string";
    case "metrics.update": return Array.isArray(value.metrics);
    case "chart.update": return isRecord(value.chart);
    case "agents.update": return Array.isArray(value.agents);
    case "graph.update": return isRecord(value.graph);
    case "heatmap.update": return isRecord(value.heatmap);
    case "roadmap.snapshot": return isRecord(value.roadmap);
    case "roadmap.node.update": return isRecord(value.node) && typeof value.node.id === "string";
    case "roadmap.assignment": return isRecord(value.assignment) && typeof value.assignment.taskId === "string";
    case "roadmap.handoff": return isRecord(value.handoff) && typeof value.handoff.taskId === "string";
    case "roadmap.verification": return isRecord(value.verification) && typeof value.verification.taskId === "string";
    case "workflow.run": return isRecord(value.run) && typeof value.run.runId === "string";
    case "command.ack": return typeof value.commandId === "string" && typeof value.ok === "boolean";
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
