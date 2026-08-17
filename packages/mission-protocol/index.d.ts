export const MISSION_PROTOCOL_VERSION: "2.0.0";
export const MISSION_PROTOCOL_COMPATIBILITY: 2;
export const MAX_PROTOCOL_MESSAGE_LENGTH: 240;
export const MISSION_PROTOCOL_LIMITS: Readonly<{
  typeChars: 64;
  idChars: 256;
  pathChars: 4096;
  commandChars: 16384;
  arrayItems: 10000;
  metadataKeys: 64;
  metadataBytes: 16384;
  fileBytes: 262144;
  eventBytes: 1000000;
  jsonBodyBytes: 1000000;
  sessionBufferChars: 24000;
}>;

export type AgentSessionRecord = {
  id: string;
  agentId: string;
  cwd: string;
  state: "running" | "exited";
  accessScope: "H0" | "H1" | "H2" | "H3" | "H4";
  startedAt: string;
  buffer: string;
  exitCode?: number | null;
};

export type WorkflowNodeAction = "approve" | "rerun" | "assign";

export type WorkflowNodeAuditEntry = {
  id: string;
  actor: string;
  taskId: string;
  action: WorkflowNodeAction;
  at: string;
  approvalRef?: string;
};

export type MissionCommand =
  | { type: "terminal.command"; command: string }
  | { type: "agent.select"; agentId: string }
  | { type: "roadmap.select"; sourcePath: string }
  | { type: "masterplan.preview"; sourcePath: string }
  | { type: "workspace.scan"; workspacePath: string; deep: boolean; runId?: string }
  | { type: "reactor.run"; profile: string }
  | { type: "file.save"; hash: string; data: number[] | ArrayBuffer; meta: Record<string, unknown> }
  | { type: "memory.search"; vaultId: string; query: string; mode?: "hybrid" | "fts" | "vector"; limit?: number }
  | { type: "memory.select"; entityId: string | null }
  | { type: "memory.forget"; entityId: string; reason: string }
  | { type: "memory.decay.run"; vaultId: string; dryRun?: boolean }
  | { type: "agent.session.start"; agent: string; cwd: string; accessScope: AgentSessionRecord["accessScope"]; approvalRef?: string; cols?: number; rows?: number }
  | { type: "agent.session.input"; sessionId: string; data: string }
  | { type: "agent.session.stop"; sessionId: string }
  | { type: "agent.session.resize"; sessionId: string; cols: number; rows: number }
  | { type: "workflow.node.action"; taskId: string; action: WorkflowNodeAction; actor: string; assigneeId?: string; approvalRef?: string };

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
  orchestration: MissionOrchestrationSnapshot;
  workflowRuns?: unknown[];
  providers?: unknown[];
  memory?: Record<string, unknown>;
  usage?: Record<string, unknown>;
  sessions?: unknown[];
  auditLog?: WorkflowNodeAuditEntry[];
  [forwardCompatibleField: string]: unknown;
};

export type MissionOrchestrationTask = {
  taskId: string;
  assigneeId?: string;
  status: "queued" | "running" | "verifying" | "done" | "failed" | "blocked";
  attempts: number;
};

export type MissionOrchestrationWave = {
  id: string;
  index: number;
  level: number;
  status: "pending" | "active" | "complete" | "skipped";
  taskIds: string[];
  tasks: MissionOrchestrationTask[];
  concurrency: number;
  startedAt?: string;
  completedAt?: string;
};

export type MissionOrchestrationSnapshot = {
  waves: MissionOrchestrationWave[];
  updatedAt: string;
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
  | { type: "dag.update"; dag: Record<string, unknown> }
  | { type: "roadmap.node.update"; node: Record<string, unknown> & { id: string } }
  | { type: "roadmap.assignment"; assignment: Record<string, unknown> & { taskId: string } }
  | { type: "roadmap.handoff"; handoff: Record<string, unknown> & { taskId: string } }
  | { type: "roadmap.verification"; verification: Record<string, unknown> & { taskId: string } }
  | { type: "orchestration.update"; orchestration: MissionOrchestrationSnapshot }
  | { type: "workflow.run"; run: Record<string, unknown> & { runId: string } }
  | { type: "memory.search.result"; result: Record<string, unknown> & { query: string } }
  | { type: "memory.selection"; entityId: string | null }
  | { type: "memory.forgotten"; entityId: string; vaultId: string | null }
  | { type: "memory.decay.result"; result: Record<string, unknown> & { vaultId: string } }
  | { type: "usage.update"; usage: Record<string, unknown> }
  | { type: "sessions.update"; sessions: AgentSessionRecord[] }
  | { type: "agent.session.output"; sessionId: string; data: string }
  | { type: "workflow.node.audit"; entry: WorkflowNodeAuditEntry }
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
export function isFileSaveMetadata(value: unknown): value is Record<string, unknown>;
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
