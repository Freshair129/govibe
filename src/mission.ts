export type DomainId = "A" | "B" | "C" | "D";
export type ViewId =
  | "A1" | "A2" | "A3" | "A4" | "A5"
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

export type AgentRecord = {
  id: string;
  name: string;
  role: string;
  model: string;
  status: "online" | "idle" | "offline" | "error";
  tasks: string;
  accuracy: string;
  speed: string;
  accent?: string;
  avatarUrl?: string;
};

export type MetricCard = {
  label: string;
  value: string;
  icon?: string;
};

export type ChartSeries = {
  label: string;
  values: number[];
  color?: string;
};

export type WorkflowTaskState =
  | "proposed"
  | "classified"
  | "awaiting_doc"
  | "ready_for_plan"
  | "planned"
  | "ready_for_assignment"
  | "assigned"
  | "in_progress"
  | "handoff_pending"
  | "qa_review"
  | "audit_review"
  | "blocked"
  | "done";

export type WorkflowTaskType =
  | "roadmap"
  | "phase"
  | "epic"
  | "sprint"
  | "task"
  | "sub-task"
  | "micro-task"
  | "atomic-task";

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

export type RoadmapSnapshot = TemporalVersion & {
  sourcePath: string;
  sourceType: "markdown" | "html" | "api" | "mcp" | "event";
  sourceVersion?: string;
  approvalStatus?: string;
  updatedAt: string;
  nodes: WorkflowTaskNode[];
  assignments: WorkflowAssignment[];
  handoffs: WorkflowHandoff[];
  verifications: WorkflowVerification[];
};

export type MissionSnapshot = {
  connectionState: ConnectionState;
  updatedAt?: string;
  metrics: MetricCard[];
  chart: {
    labels: string[];
    series: ChartSeries[];
  };
  reactor: Array<{ label: string; value: string; tone?: "good" | "warn" | "bad" }>;
  agents: AgentRecord[];
  terminal: TerminalLine[];
  graph: {
    nodes: Array<{ id: string; label: string }>;
    edges: Array<{ source: string; target: string }>;
  };
  specs: Array<{ title: string; body: string }>;
  symbols: Array<{ name: string; path: string; kind: string }>;
  heatmap?: {
    cells: number[];
    coreTemp: number;
  };
  campaignLogs: string[];
  roadmap?: RoadmapSnapshot;
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
  | { type: "roadmap.verification"; verification: WorkflowVerification };

export type MissionCommand =
  | { type: "terminal.command"; command: string }
  | { type: "agent.select"; agentId: string }
  | { type: "reactor.run"; profile: string }
  | { type: "file.save"; hash: string; data: ArrayBuffer; meta: Record<string, unknown> };

export type MissionDomain = {
  id: DomainId;
  title: string;
  shortTitle: string;
  color: string;
  icon: string;
  subModules: Array<{ id: ViewId; name: string; icon: string }>;
};

export const missionDomains: Record<DomainId, MissionDomain> = {
  A: {
    id: "A",
    title: "Project Overview",
    shortTitle: "Project Overview",
    color: "#10b981",
    icon: "compass",
    subModules: [
      { id: "A1", name: "Real-time Dashboard", icon: "chart" },
      { id: "A2", name: "Roadmap Board", icon: "timeline" },
      { id: "A3", name: "Capability Plugins", icon: "plug" },
      { id: "A4", name: "Brain & Config", icon: "brain" },
      { id: "A5", name: "Agent Management", icon: "robot" },
    ],
  },
  B: {
    id: "B",
    title: "Genesis Knowledge",
    shortTitle: "Genesis Knowledge",
    color: "#6366f1",
    icon: "brain",
    subModules: [
      { id: "B1", name: "AST Hierarchy Tree", icon: "tree" },
      { id: "B2", name: "Business Specifications", icon: "doc" },
      { id: "B3", name: "Interactive Graph", icon: "nodes" },
      { id: "B4", name: "Live Call Graph", icon: "trace" },
    ],
  },
  C: {
    id: "C",
    title: "Block DB",
    shortTitle: "Block DB",
    color: "#06b6d4",
    icon: "blocks",
    subModules: [
      { id: "C1", name: "Symbol Explorer Hub", icon: "search" },
      { id: "C2", name: "Intelligence Zoo", icon: "flask" },
      { id: "C3", name: "SRS-G Debugger", icon: "terminal" },
      { id: "C4", name: "Database ERD Schema", icon: "db" },
      { id: "C5", name: "HNSW Vector Space Map", icon: "vector" },
    ],
  },
  D: {
    id: "D",
    title: "AI Benchmark",
    shortTitle: "AI Benchmark",
    color: "#f59e0b",
    icon: "gauge",
    subModules: [
      { id: "D1", name: "Reactor Run Trigger", icon: "bolt" },
      { id: "D2", name: "Cyber Reactor Heatmap", icon: "fire" },
      { id: "D3", name: "EABS-01 Campaign Logs", icon: "log" },
    ],
  },
};

export const defaultViewByDomain: Record<DomainId, ViewId> = {
  A: "A1",
  B: "B1",
  C: "C1",
  D: "D1",
};

const emptySnapshot: MissionSnapshot = {
  connectionState: "disconnected",
  metrics: [],
  chart: { labels: [], series: [] },
  reactor: [],
  agents: [],
  terminal: [],
  graph: { nodes: [], edges: [] },
  specs: [],
  symbols: [],
  campaignLogs: [],
};

function mergeSnapshot(current: MissionSnapshot, patch: Partial<MissionSnapshot>): MissionSnapshot {
  return {
    ...current,
    ...patch,
    metrics: patch.metrics ?? current.metrics,
    chart: patch.chart ?? current.chart,
    reactor: patch.reactor ?? current.reactor,
    agents: patch.agents ?? current.agents,
    terminal: patch.terminal ?? current.terminal,
    graph: patch.graph ?? current.graph,
    specs: patch.specs ?? current.specs,
    symbols: patch.symbols ?? current.symbols,
    campaignLogs: patch.campaignLogs ?? current.campaignLogs,
    roadmap: patch.roadmap ?? current.roadmap,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };
}

function ensureRoadmapSnapshot(current?: RoadmapSnapshot): RoadmapSnapshot {
  return current ?? {
    sourcePath: "event://mission-gateway",
    sourceType: "event",
    updatedAt: new Date().toISOString(),
    nodes: [],
    assignments: [],
    handoffs: [],
    verifications: [],
  };
}

function upsertByKey<T>(items: T[], next: T, matches: (item: T) => boolean) {
  const index = items.findIndex(matches);
  if (index === -1) return [...items, next];
  return items.map((item, itemIndex) => itemIndex === index ? next : item);
}

export class MissionGateway {
  private snapshot = emptySnapshot;
  private listeners = new Set<(snapshot: MissionSnapshot) => void>();
  private socket?: WebSocket;
  private bootstrapPromise?: Promise<void>;

  constructor(private options: { wsUrl?: string; httpBaseUrl?: string } = {}) {}

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: MissionSnapshot) => void) {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  connect() {
    if (this.bootstrapPromise) return;
    this.bootstrapPromise = this.bootstrap();
  }

  private async bootstrap() {
    const hasHttp = Boolean(this.options.httpBaseUrl);
    const wsUrl = this.options.wsUrl ?? this.deriveWsUrl();

    if (!hasHttp && !wsUrl) return;

    this.setSnapshot({ connectionState: "connecting" });

    if (hasHttp) {
      try {
        const response = await fetch(`${this.options.httpBaseUrl?.replace(/\/$/, "")}/mission/snapshot`);
        if (!response.ok) {
          throw new Error(`Snapshot bootstrap failed with ${response.status}`);
        }
        const snapshot = await response.json() as MissionSnapshot;
        this.setSnapshot({
          ...snapshot,
          connectionState: wsUrl ? "connecting" : "connected",
        });
      } catch {
        if (!wsUrl) {
          this.setSnapshot({ connectionState: "error" });
          return;
        }
      }
    }

    if (!wsUrl || this.socket) {
      return;
    }

    try {
      const socket = new WebSocket(wsUrl);
      this.socket = socket;
      socket.addEventListener("open", () => this.setSnapshot({ connectionState: "connected" }));
      socket.addEventListener("message", (event) => this.handleEvent(JSON.parse(event.data) as MissionEvent));
      socket.addEventListener("close", () => {
        this.socket = undefined;
        this.setSnapshot({ connectionState: "disconnected" });
        this.bootstrapPromise = undefined;
      });
      socket.addEventListener("error", () => this.setSnapshot({ connectionState: "error" }));
    } catch {
      this.setSnapshot({ connectionState: "error" });
      this.bootstrapPromise = undefined;
    }
  }

  private deriveWsUrl() {
    if (!this.options.httpBaseUrl) return undefined;
    const url = new URL(this.options.httpBaseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/mission/ws";
    url.search = "";
    return url.toString();
  }

  handleEvent(event: MissionEvent) {
    if (event.type === "snapshot") this.setSnapshot(event.snapshot);
    if (event.type === "terminal.line") this.setSnapshot({ terminal: [...this.snapshot.terminal, event.line] });
    if (event.type === "metrics.update") this.setSnapshot({ metrics: event.metrics });
    if (event.type === "chart.update") this.setSnapshot({ chart: event.chart });
    if (event.type === "agents.update") this.setSnapshot({ agents: event.agents });
    if (event.type === "graph.update") this.setSnapshot({ graph: event.graph });
    if (event.type === "heatmap.update") this.setSnapshot({ heatmap: event.heatmap });
    if (event.type === "roadmap.snapshot") this.setSnapshot({ roadmap: event.roadmap });
    if (event.type === "roadmap.node.update") {
      const roadmap = ensureRoadmapSnapshot(this.snapshot.roadmap);
      this.setSnapshot({
        roadmap: {
          ...roadmap,
          updatedAt: new Date().toISOString(),
          nodes: upsertByKey(roadmap.nodes, event.node, (node) => node.id === event.node.id),
        },
      });
    }
    if (event.type === "roadmap.assignment") {
      const roadmap = ensureRoadmapSnapshot(this.snapshot.roadmap);
      this.setSnapshot({
        roadmap: {
          ...roadmap,
          updatedAt: new Date().toISOString(),
          assignments: upsertByKey(
            roadmap.assignments,
            event.assignment,
            (assignment) => assignment.taskId === event.assignment.taskId,
          ),
        },
      });
    }
    if (event.type === "roadmap.handoff") {
      const roadmap = ensureRoadmapSnapshot(this.snapshot.roadmap);
      this.setSnapshot({
        roadmap: {
          ...roadmap,
          updatedAt: new Date().toISOString(),
          handoffs: upsertByKey(
            roadmap.handoffs,
            event.handoff,
            (handoff) => (
              handoff.taskId === event.handoff.taskId
              && handoff.fromId === event.handoff.fromId
              && handoff.toId === event.handoff.toId
            ),
          ),
        },
      });
    }
    if (event.type === "roadmap.verification") {
      const roadmap = ensureRoadmapSnapshot(this.snapshot.roadmap);
      this.setSnapshot({
        roadmap: {
          ...roadmap,
          updatedAt: new Date().toISOString(),
          verifications: upsertByKey(
            roadmap.verifications,
            event.verification,
            (verification) => verification.taskId === event.verification.taskId,
          ),
        },
      });
    }
  }

  async send(command: MissionCommand) {
    if (command.type === "terminal.command") this.appendTerminal("user", command.command);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(command));
      return;
    }
    if (!this.options.httpBaseUrl) {
      this.appendTerminal("warn", `No transport configured for ${command.type}. Set VITE_GOVIBE_WS_URL or VITE_GOVIBE_API_URL.`);
      return;
    }
    const body = command.type === "file.save" ? { ...command, data: Array.from(new Uint8Array(command.data)) } : command;
    await fetch(`${this.options.httpBaseUrl.replace(/\/$/, "")}/mission/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  private appendTerminal(type: TerminalLine["type"], text: string) {
    const line: TerminalLine = {
      id: crypto.randomUUID(),
      type,
      text,
      time: new Date().toLocaleTimeString("en-US", { hour12: false }),
    };
    this.setSnapshot({ terminal: [...this.snapshot.terminal.slice(-199), line] });
  }

  private setSnapshot(patch: Partial<MissionSnapshot>) {
    this.snapshot = mergeSnapshot(this.snapshot, patch);
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}

function resolveLocalApiFallback() {
  if (typeof window === "undefined") return undefined;
  const { hostname, protocol } = window.location;
  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    return undefined;
  }
  return `${protocol}//${hostname}:4310`;
}

export const missionGateway = new MissionGateway({
  wsUrl: import.meta.env.VITE_GOVIBE_WS_URL,
  httpBaseUrl: import.meta.env.VITE_GOVIBE_API_URL ?? resolveLocalApiFallback(),
});

declare global {
  interface Window {
    __govibeMissionGateway: MissionGateway;
  }
}

window.__govibeMissionGateway = missionGateway;

window.addEventListener("govibe:mission-event", ((event: CustomEvent<MissionEvent>) => {
  missionGateway.handleEvent(event.detail);
}) as EventListener);

window.addEventListener("message", (event: MessageEvent<{ source?: string; event?: MissionEvent }>) => {
  if (event.data?.source === "govibe-mission-control" && event.data.event) {
    missionGateway.handleEvent(event.data.event);
  }
});

export function saveFile(hash: string, data: ArrayBuffer, meta: Record<string, unknown>) {
  return missionGateway.send({ type: "file.save", hash, data, meta });
}
