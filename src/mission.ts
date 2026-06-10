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
};

export type MissionEvent =
  | { type: "snapshot"; snapshot: Partial<MissionSnapshot> }
  | { type: "terminal.line"; line: TerminalLine }
  | { type: "metrics.update"; metrics: MetricCard[] }
  | { type: "chart.update"; chart: MissionSnapshot["chart"] }
  | { type: "agents.update"; agents: AgentRecord[] }
  | { type: "graph.update"; graph: MissionSnapshot["graph"] }
  | { type: "heatmap.update"; heatmap: NonNullable<MissionSnapshot["heatmap"]> };

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
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };
}

export class MissionGateway {
  private snapshot = emptySnapshot;
  private listeners = new Set<(snapshot: MissionSnapshot) => void>();
  private socket?: WebSocket;

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
    if (!this.options.wsUrl || this.socket) return;
    this.setSnapshot({ connectionState: "connecting" });
    try {
      const socket = new WebSocket(this.options.wsUrl);
      this.socket = socket;
      socket.addEventListener("open", () => this.setSnapshot({ connectionState: "connected" }));
      socket.addEventListener("message", (event) => this.handleEvent(JSON.parse(event.data) as MissionEvent));
      socket.addEventListener("close", () => {
        this.socket = undefined;
        this.setSnapshot({ connectionState: "disconnected" });
      });
      socket.addEventListener("error", () => this.setSnapshot({ connectionState: "error" }));
    } catch {
      this.setSnapshot({ connectionState: "error" });
    }
  }

  handleEvent(event: MissionEvent) {
    if (event.type === "snapshot") this.setSnapshot(event.snapshot);
    if (event.type === "terminal.line") this.setSnapshot({ terminal: [...this.snapshot.terminal, event.line] });
    if (event.type === "metrics.update") this.setSnapshot({ metrics: event.metrics });
    if (event.type === "chart.update") this.setSnapshot({ chart: event.chart });
    if (event.type === "agents.update") this.setSnapshot({ agents: event.agents });
    if (event.type === "graph.update") this.setSnapshot({ graph: event.graph });
    if (event.type === "heatmap.update") this.setSnapshot({ heatmap: event.heatmap });
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

export const missionGateway = new MissionGateway({
  wsUrl: import.meta.env.VITE_GOVIBE_WS_URL,
  httpBaseUrl: import.meta.env.VITE_GOVIBE_API_URL,
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
