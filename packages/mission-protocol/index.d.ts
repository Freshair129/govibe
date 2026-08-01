export const MISSION_PROTOCOL_VERSION: "1.0.0";
export const MISSION_PROTOCOL_COMPATIBILITY: 1;
export const MAX_PROTOCOL_MESSAGE_LENGTH: 240;

export type MissionCommand =
  | { type: "terminal.command"; command: string }
  | { type: "agent.select"; agentId: string }
  | { type: "roadmap.select"; sourcePath: string }
  | { type: "masterplan.preview"; sourcePath: string }
  | { type: "workspace.scan"; workspacePath: string; deep: boolean; runId?: string }
  | { type: "reactor.run"; profile: string }
  | { type: "file.save"; hash: string; data: number[] | ArrayBuffer; meta: Record<string, unknown> };

export type MissionSnapshot = {
  connectionState: "disconnected" | "connecting" | "connected" | "error";
  updatedAt?: string;
  metrics: unknown[];
  chart: Record<string, unknown>;
  reactor: unknown[];
  agents: unknown[];
  capabilities?: unknown[];
  terminal: unknown[];
  graph: Record<string, unknown>;
  specs: unknown[];
  symbols: unknown[];
  heatmap?: Record<string, unknown>;
  campaignLogs: unknown[];
  roadmap?: Record<string, unknown>;
  masterPlanPreview?: Record<string, unknown>;
  roadmapSources?: unknown[];
  workflowRuns?: unknown[];
  providers?: unknown[];
  [forwardCompatibleField: string]: unknown;
};

export type MissionEvent =
  | { type: "snapshot"; snapshot: Partial<MissionSnapshot> }
  | { type: "terminal.line"; line: Record<string, unknown> & { id: string } }
  | { type: "metrics.update"; metrics: unknown[] }
  | { type: "chart.update"; chart: Record<string, unknown> }
  | { type: "agents.update"; agents: unknown[] }
  | { type: "graph.update"; graph: Record<string, unknown> }
  | { type: "heatmap.update"; heatmap: Record<string, unknown> }
  | { type: "roadmap.snapshot"; roadmap: Record<string, unknown> }
  | { type: "roadmap.node.update"; node: Record<string, unknown> & { id: string } }
  | { type: "roadmap.assignment"; assignment: Record<string, unknown> & { taskId: string } }
  | { type: "roadmap.handoff"; handoff: Record<string, unknown> & { taskId: string } }
  | { type: "roadmap.verification"; verification: Record<string, unknown> & { taskId: string } }
  | { type: "workflow.run"; run: Record<string, unknown> & { runId: string } }
  | { type: "command.ack"; commandId: string; ok: boolean; message?: string; snapshot?: Partial<MissionSnapshot> };

export type CommandResponse = {
  protocolVersion: typeof MISSION_PROTOCOL_VERSION;
  compatibilityVersion: typeof MISSION_PROTOCOL_COMPATIBILITY;
  commandId: string;
  ok: boolean;
  message?: string;
  snapshot?: Partial<MissionSnapshot>;
  result?: unknown;
};

export function isRecord(value: unknown): value is Record<string, unknown>;
export function boundedProtocolMessage(value: unknown): string;
export function isMissionCommand(value: unknown): value is MissionCommand;
export function isMissionSnapshot(value: unknown): value is MissionSnapshot;
export function isMissionEvent(value: unknown): value is MissionEvent;
export function createCommandResponse(input: {
  commandId: string;
  ok: boolean;
  message?: unknown;
  snapshot?: Partial<MissionSnapshot>;
  result?: unknown;
}): CommandResponse;
export function isCommandResponse(value: unknown): value is CommandResponse;
