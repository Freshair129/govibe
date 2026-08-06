export type DomainId = "A" | "B" | "C" | "D";
export type ViewId =
  | "A1" | "A2" | "A3" | "A4" | "A5" | "A6"
  | "B1" | "B2" | "B3" | "B4"
  | "C1" | "C2" | "C3" | "C4" | "C5"
  | "D1" | "D2" | "D3";

export type ThemeMode = "dark" | "light";
export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export type TerminalLine = {
  id: string;
  type: "sys" | "agent" | "warn" | "user";
  text: string;
  time: string;
};

export type AgentScopeStatus = "in_scope" | "needs_change_request" | "blocked_by_missing_req" | "ready_for_assignment";

export type AgentFleetMetadata = {
  fleetRole?: string;
  jobTitleEquivalent?: string;
  domain?: string;
  cluster?: string;
  responsibility?: string[];
  authority?: { can?: string[]; cannot?: string[] };
  sourceRefs?: string[];
  approvalGate?: string;
  scopeBoundary?: string;
  outOfScope?: string[];
  scopeStatus?: AgentScopeStatus;
};

export type AgentRecord = {
  id: string;
  name: string;
  role: string;
  model: string;
  status: "registered" | "online" | "idle" | "offline" | "error";
  tasks: string;
  accuracy: string;
  speed: string;
  accent?: string;
  avatarUrl?: string;
  fleet?: AgentFleetMetadata;
};

export type MetricCard = { label: string; value: string; icon?: string };
export type CapabilityRecord = { id: string; title: string; description: string; status: "registered"; sourcePath: string };
export type ChartSeries = { label: string; values: number[]; color?: string };

export type WorkflowTaskState =
  | "proposed" | "classified" | "awaiting_doc" | "ready_for_plan" | "planned"
  | "ready_for_assignment" | "assigned" | "in_progress" | "handoff_pending"
  | "qa_review" | "audit_review" | "blocked" | "done";

export type WorkflowTaskType = "roadmap" | "phase" | "epic" | "sprint" | "task" | "sub-task" | "micro-task" | "atomic-task";

export type TemporalVersion = {
  version?: string;
  validFrom?: string;
  validTo?: string;
  recordedAt?: string;
  supersededAt?: string;
};

export type WorkflowTaskNode = TemporalVersion & {
  id: string;
  parentId?: string;
  type: WorkflowTaskType;
  title: string;
  summary?: string;
  state: WorkflowTaskState;
  assigneeId?: string;
  assigneeType?: "human" | "agent" | "team" | "service";
  progress?: number;
  tags?: string[];
  artifactLinks?: string[];
  reviewLinks?: string[];
  verificationLinks?: string[];
  sourcePath?: string;
  sourceSection?: string;
};

export type WorkflowAssignment = TemporalVersion & {
  taskId: string;
  subjectId: string;
  subjectType: "human" | "agent" | "team" | "service";
  policyModel: "RBAC" | "ABAC";
  assignedAt: string;
  assignedBy?: string;
};

export type WorkflowHandoff = TemporalVersion & {
  taskId: string;
  fromId: string;
  toId: string;
  requiredArtifact?: string;
  note?: string;
  createdAt: string;
  state: "pending" | "accepted" | "rejected" | "completed";
};

export type WorkflowVerification = TemporalVersion & {
  taskId: string;
  qaStatus?: "pending" | "passed" | "failed";
  auditStatus?: "pending" | "passed" | "failed";
  deploymentStatus?: "pending" | "passed" | "failed" | "n/a";
  lastUpdatedAt?: string;
};

export type RoadmapSourceRecord = {
  title: string;
  sourcePath: string;
  sourceType: "masterplan" | "roadmap" | "backlog" | "sprint";
  transportType: "markdown" | "html";
  approvalStatus?: string;
  updatedAt: string;
  score?: number;
  scoreBreakdown?: string[];
  active: boolean;
};

export type TaskContainerCriterion = { criterion: string; checked: boolean | string };

export type TaskContainer = {
  task_container_id: string;
  task_id: string;
  legacy_task_id?: string;
  legacy_code?: string;
  parent_phase_id?: string;
  parent_sprint_id?: string;
  title: string;
  requirement_type?: string;
  complexity?: string;
  status?: string;
  version?: string;
  pic?: string;
  executor?: string;
  approver?: string;
  auditor?: string;
  assignee?: string;
  completed_by?: string;
  symbol_links?: { code?: string; doc?: string; test?: string };
  definition_of_done?: {
    acceptance_criteria?: TaskContainerCriterion[];
    success_criteria?: TaskContainerCriterion[];
    exit_criteria?: TaskContainerCriterion[];
  };
  changelog?: string;
  created_at?: string;
  last_update?: string;
  token_telemetry?: {
    model_name?: string;
    context_length?: string;
    predicted_token_usage?: string | number;
    actual_input_tokens?: string | number;
    actual_output_tokens?: string | number;
    tool_calling_tokens?: string | number;
    total_token_usage?: string | number;
  };
  export?: { json?: string; yaml?: string; markdown?: string };
  ui_state?: { dropdown_default?: string; expanded?: boolean | string; disabled_reason?: string };
  complete?: boolean;
  missingFields?: string[];
};

export type RoadmapSnapshot = TemporalVersion & {
  sourcePath: string;
  sourceType: "markdown" | "html" | "api" | "mcp" | "event";
  planningType?: "masterplan" | "roadmap" | "backlog" | "sprint";
  sourceVersion?: string;
  approvalStatus?: string;
  title?: string;
  score?: number;
  scoreBreakdown?: string[];
  updatedAt: string;
  nodes: WorkflowTaskNode[];
  assignments: WorkflowAssignment[];
  handoffs: WorkflowHandoff[];
  verifications: WorkflowVerification[];
  taskContainers?: TaskContainer[];
};

export type MissionScanStage = {
  stage: number;
  name: string;
  status: string;
  method?: string;
  confidence?: number;
  outputRefs?: string[];
  error?: string;
};

export type MissionWorkflowRun = {
  runId: string;
  status: string;
  currentTask: string | null;
  tasks: Array<{ id: string; status: string; outputRefs?: string[] }>;
  kind?: "workflow" | "scan";
  level?: "L1" | "L2";
  stageRuns?: MissionScanStage[];
  graphValidation?: { passed: boolean; errors?: string[] };
};

export type MissionSnapshot = {
  connectionState: ConnectionState;
  updatedAt?: string;
  metrics: MetricCard[];
  chart: { labels: string[]; series: ChartSeries[] };
  reactor: Array<{ label: string; value: string; tone?: "good" | "warn" | "bad" }>;
  agents: AgentRecord[];
  capabilities: CapabilityRecord[];
  terminal: TerminalLine[];
  graph: { nodes: Array<{ id: string; label: string }>; edges: Array<{ source: string; target: string }> };
  specs: Array<{ title: string; body: string }>;
  symbols: Array<{ name: string; path: string; kind: string }>;
  heatmap?: { cells: number[]; coreTemp: number };
  campaignLogs: string[];
  roadmap?: RoadmapSnapshot;
  masterPlanPreview?: RoadmapSnapshot;
  roadmapSources?: RoadmapSourceRecord[];
  workflowRuns?: MissionWorkflowRun[];
  providers?: Array<{ id: string; available: boolean; capabilities: string[] }>;
};

export type MissionEvent =
  | { type: "snapshot"; snapshot: Partial<MissionSnapshot> }
  | { type: "terminal.line"; line: TerminalLine }
  | { type: "metrics.update"; metrics: MetricCard[] }
  | { type: "chart.update"; chart: MissionSnapshot["chart"] }
  | { type: "agents.update"; agents: AgentRecord[] }
  | { type: "graph.update"; graph: MissionSnapshot["graph"] }
  | { type: "heatmap.update"; heatmap: NonNullable<MissionSnapshot["heatmap"]> }
  | { type: "roadmap.snapshot"; roadmap: RoadmapSnapshot }
  | { type: "roadmap.node.update"; node: WorkflowTaskNode }
  | { type: "roadmap.assignment"; assignment: WorkflowAssignment }
  | { type: "roadmap.handoff"; handoff: WorkflowHandoff }
  | { type: "roadmap.verification"; verification: WorkflowVerification }
  | { type: "workflow.run"; run: MissionWorkflowRun };

export type MissionCommand =
  | { type: "terminal.command"; command: string }
  | { type: "agent.select"; agentId: string }
  | { type: "roadmap.select"; sourcePath: string }
  | { type: "masterplan.preview"; sourcePath: string }
  | { type: "workspace.scan"; workspacePath: string; deep: boolean; runId?: string }
  | { type: "reactor.run"; profile: string }
  | { type: "file.save"; hash: string; data: ArrayBuffer; meta: Record<string, unknown> };
