import {
  boundedProtocolMessage,
  isCommandResponse,
  isMissionCommand,
  isMissionEvent,
  isMissionSnapshot,
  isRecord,
  type MissionCommand,
  type MissionEvent,
} from "../packages/mission-protocol/index.js";
import type {
  MissionSnapshot,
  RoadmapSnapshot,
  TerminalLine,
  WorkflowAssignment,
  WorkflowHandoff,
  WorkflowTaskNode,
  WorkflowVerification,
} from "./mission";

export type CommandStatus = "pending" | "succeeded" | "failed" | "timed-out";

export type CommandResult = {
  commandId: string;
  status: Exclude<CommandStatus, "pending">;
  message?: string;
  snapshot?: Partial<MissionSnapshot>;
};

export type CommandTerminalLine = TerminalLine & {
  commandId?: string;
  commandStatus?: CommandStatus;
};

type WireEvent = MissionEvent;

type PendingCommand = {
  command: MissionCommand;
  resolve: (result: CommandResult) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

export type MissionGatewayOptions = {
  wsUrl?: string;
  httpBaseUrl?: string;
  requestTimeoutMs?: number;
  acknowledgementTimeoutMs?: number;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
  reconnectMaxAttempts?: number;
  fetchImpl?: typeof fetch;
  webSocketFactory?: (url: string) => WebSocket;
  random?: () => number;
};

const IDEMPOTENT_COMMANDS = new Set<MissionCommand["type"]>([
  "agent.select",
  "roadmap.select",
  "masterplan.preview",
]);

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_ACK_TIMEOUT_MS = 10_000;
const DEFAULT_RECONNECT_BASE_MS = 500;
const DEFAULT_RECONNECT_MAX_MS = 15_000;
const DEFAULT_RECONNECT_ATTEMPTS = 8;

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const emptySnapshot: MissionSnapshot = {
  connectionState: "disconnected",
  metrics: [],
  chart: { labels: [], series: [] },
  reactor: [],
  agents: [],
  capabilities: [],
  terminal: [],
  graph: { nodes: [], edges: [] },
  specs: [],
  symbols: [],
  campaignLogs: [],
  roadmapSources: [],
  workflowRuns: [],
  providers: [],
};

function mergeSnapshot(current: MissionSnapshot, patch: Partial<MissionSnapshot>): MissionSnapshot {
  return {
    ...current,
    ...patch,
    metrics: patch.metrics ?? current.metrics,
    chart: patch.chart ?? current.chart,
    reactor: patch.reactor ?? current.reactor,
    agents: patch.agents ?? current.agents,
    capabilities: patch.capabilities ?? current.capabilities,
    terminal: patch.terminal ?? current.terminal,
    graph: patch.graph ?? current.graph,
    specs: patch.specs ?? current.specs,
    symbols: patch.symbols ?? current.symbols,
    campaignLogs: patch.campaignLogs ?? current.campaignLogs,
    roadmap: patch.roadmap ?? current.roadmap,
    roadmapSources: patch.roadmapSources ?? current.roadmapSources,
    workflowRuns: patch.workflowRuns ?? current.workflowRuns,
    providers: patch.providers ?? current.providers,
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

function upsertByKey<T>(items: T[], next: T, matches: (item: T) => boolean): T[] {
  const index = items.findIndex(matches);
  return index === -1 ? [...items, next] : items.map((item, i) => i === index ? next : item);
}

export class ReliableMissionGateway {
  private snapshot: MissionSnapshot = emptySnapshot;
  private listeners = new Set<(snapshot: MissionSnapshot) => void>();
  private socket?: WebSocket;
  private bootstrapPromise?: Promise<void>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempt = 0;
  private disposed = false;
  private intentionalDisconnect = false;
  private pendingCommands = new Map<string, PendingCommand>();

  constructor(private readonly options: MissionGatewayOptions = {}) {}

  getSnapshot(): MissionSnapshot {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: MissionSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  connect(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.intentionalDisconnect = false;
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrap().finally(() => {
        this.bootstrapPromise = undefined;
      });
    }
    return this.bootstrapPromise;
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    this.resetSocket(true);
    this.setSnapshot({ connectionState: "disconnected" });
  }

  dispose(): void {
    this.disposed = true;
    this.disconnect();
    this.listeners.clear();
    for (const [commandId, pending] of this.pendingCommands) {
      clearTimeout(pending.timeoutId);
      pending.resolve({ commandId, status: "failed", message: "Gateway disposed." });
    }
    this.pendingCommands.clear();
  }

  async reconnect(): Promise<void> {
    this.disconnect();
    this.intentionalDisconnect = false;
    this.reconnectAttempt = 0;
    await this.connect();
  }

  async send(command: MissionCommand): Promise<CommandResult> {
    const commandId = crypto.randomUUID();
    if (!isMissionCommand(command)) {
      return { commandId, status: "failed", message: "Mission command failed protocol validation." };
    }
    this.appendCommandLine(commandId, command, "pending");

    if (command.type === "file.save") {
      const result = await this.sendFileHttp(command, commandId);
      this.reconcileCommand(result);
      return result;
    }

    const correlated = { ...command, commandId };

    if (this.socket?.readyState === WebSocket.OPEN) {
      return new Promise<CommandResult>((resolve) => {
        const timeoutId = setTimeout(() => {
          this.pendingCommands.delete(commandId);
          const result: CommandResult = { commandId, status: "timed-out", message: "WebSocket acknowledgement timed out." };
          this.reconcileCommand(result);
          resolve(result);
        }, this.options.acknowledgementTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS);
        this.pendingCommands.set(commandId, { command, resolve, timeoutId });
        this.socket?.send(JSON.stringify(correlated));
      });
    }

    if (!this.options.httpBaseUrl) {
      const result: CommandResult = {
        commandId,
        status: "failed",
        message: `No transport configured for ${command.type}. Set VITE_GOVIBE_WS_URL or VITE_GOVIBE_API_URL.`,
      };
      this.reconcileCommand(result);
      return result;
    }

    const maxAttempts = IDEMPOTENT_COMMANDS.has(command.type) ? 2 : 1;
    let lastResult: CommandResult | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      lastResult = await this.sendHttp(correlated, commandId);
      if (lastResult.status === "succeeded" || lastResult.status === "failed") break;
    }
    this.reconcileCommand(lastResult!);
    return lastResult!;
  }

  handleRawFrame(data: unknown): void {
    if (typeof data !== "string") {
      this.appendTerminal("warn", "Ignored non-text WebSocket frame.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      this.appendTerminal("warn", "Ignored malformed WebSocket JSON frame.");
      return;
    }
    if (!isMissionEvent(parsed)) {
      this.appendTerminal("warn", "Ignored WebSocket frame that failed Mission Control schema validation.");
      return;
    }
    this.handleEvent(parsed);
  }

  handleEvent(event: WireEvent): void {
    switch (event.type) {
      case "command.ack": {
        const pending = this.pendingCommands.get(event.commandId);
        const result: CommandResult = {
          commandId: event.commandId,
          status: event.ok ? "succeeded" : "failed",
          message: event.message,
          snapshot: event.snapshot as Partial<MissionSnapshot> | undefined,
        };
        if (pending) {
          clearTimeout(pending.timeoutId);
          this.pendingCommands.delete(event.commandId);
          pending.resolve(result);
        }
        this.reconcileCommand(result);
        return;
      }
      case "snapshot":
        this.setSnapshot(event.snapshot as Partial<MissionSnapshot>);
        return;
      case "terminal.line":
        this.reconcileTerminalLine(event.line as CommandTerminalLine);
        return;
      case "metrics.update":
        this.setSnapshot({ metrics: event.metrics as MissionSnapshot["metrics"] });
        return;
      case "chart.update":
        this.setSnapshot({ chart: event.chart as MissionSnapshot["chart"] });
        return;
      case "agents.update":
        this.setSnapshot({ agents: event.agents as MissionSnapshot["agents"] });
        return;
      case "graph.update":
        this.setSnapshot({ graph: event.graph as MissionSnapshot["graph"] });
        return;
      case "heatmap.update":
        this.setSnapshot({ heatmap: event.heatmap as NonNullable<MissionSnapshot["heatmap"]> });
        return;
      case "roadmap.snapshot":
        this.setSnapshot({ roadmap: event.roadmap as RoadmapSnapshot });
        return;
      case "roadmap.node.update":
        this.updateRoadmapNode(event.node as WorkflowTaskNode);
        return;
      case "roadmap.assignment":
        this.updateRoadmapAssignment(event.assignment as WorkflowAssignment);
        return;
      case "roadmap.handoff":
        this.updateRoadmapHandoff(event.handoff as WorkflowHandoff);
        return;
      case "roadmap.verification":
        this.updateRoadmapVerification(event.verification as WorkflowVerification);
        return;
      case "workflow.run": {
        const run = event.run as NonNullable<MissionSnapshot["workflowRuns"]>[number];
        this.setSnapshot({ workflowRuns: [...(this.snapshot.workflowRuns ?? []).filter((item) => item.runId !== run.runId), run] });
        return;
      }
      default: {
        const exhaustive: never = event;
        return exhaustive;
      }
    }
  }

  private async bootstrap(): Promise<void> {
    const hasHttp = Boolean(this.options.httpBaseUrl);
    const wsUrl = this.options.wsUrl ?? this.deriveWsUrl();
    if (!hasHttp && !wsUrl) return;

    this.setSnapshot({ connectionState: "connecting" });
    if (hasHttp) {
      try {
        const response = await this.fetchWithTimeout(`${this.options.httpBaseUrl!.replace(/\/$/, "")}/mission/snapshot`, {});
        if (!response.ok) throw new Error(`Snapshot bootstrap failed with ${response.status}`);
        const payload: unknown = await response.json();
        if (!isMissionSnapshot(payload)) throw new Error("Snapshot bootstrap failed Mission Control schema validation.");
        this.setSnapshot({ ...(payload as MissionSnapshot), connectionState: wsUrl ? "connecting" : "connected" });
      } catch (error) {
        if (!wsUrl) {
          this.appendTerminal("warn", boundedProtocolMessage(error));
          this.setSnapshot({ connectionState: "error" });
          return;
        }
      }
    }
    if (wsUrl && !this.socket && !this.disposed && !this.intentionalDisconnect) this.openSocket(wsUrl);
  }

  private openSocket(url: string): void {
    try {
      const socket = this.options.webSocketFactory?.(url) ?? new WebSocket(url);
      this.socket = socket;
      socket.addEventListener("open", () => {
        if (this.socket !== socket) return;
        this.reconnectAttempt = 0;
        this.setSnapshot({ connectionState: "connected" });
      });
      socket.addEventListener("message", (event) => {
        if (this.socket === socket) this.handleRawFrame(event.data);
      });
      socket.addEventListener("close", () => {
        if (this.socket !== socket) return;
        this.resetSocket(false);
        this.setSnapshot({ connectionState: "disconnected" });
        this.scheduleReconnect();
      });
      socket.addEventListener("error", () => {
        if (this.socket !== socket) return;
        this.setSnapshot({ connectionState: "error" });
        this.resetSocket(false);
        this.scheduleReconnect();
      });
    } catch (error) {
      this.resetSocket(false);
      this.appendTerminal("warn", boundedProtocolMessage(error));
      this.setSnapshot({ connectionState: "error" });
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.intentionalDisconnect || this.reconnectTimer) return;
    const maxAttempts = this.options.reconnectMaxAttempts ?? DEFAULT_RECONNECT_ATTEMPTS;
    if (this.reconnectAttempt >= maxAttempts) {
      this.setSnapshot({ connectionState: "error" });
      this.appendTerminal("warn", "Mission transport reached its reconnect limit.");
      return;
    }
    const attempt = this.reconnectAttempt++;
    const base = this.options.reconnectBaseDelayMs ?? DEFAULT_RECONNECT_BASE_MS;
    const cap = this.options.reconnectMaxDelayMs ?? DEFAULT_RECONNECT_MAX_MS;
    const jitter = 0.75 + (this.options.random?.() ?? Math.random()) * 0.5;
    const delay = Math.min(cap, base * (2 ** attempt)) * jitter;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, delay);
  }

  private resetSocket(close: boolean): void {
    const socket = this.socket;
    this.socket = undefined;
    if (close && socket && socket.readyState < WebSocket.CLOSING) socket.close();
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
  }

  private async sendHttp(body: Record<string, unknown>, commandId: string): Promise<CommandResult> {
    try {
      const response = await this.fetchWithTimeout(`${this.options.httpBaseUrl!.replace(/\/$/, "")}/mission/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await this.readJson(response);
      if (!response.ok) {
        const message = isCommandResponse(payload)
          ? payload.message
          : payload?.error ?? `Server rejected command with ${response.status}.`;
        return { commandId, status: "failed", message: boundedProtocolMessage(message) };
      }

      if (isCommandResponse(payload)) {
        if (payload.commandId !== commandId) {
          return { commandId, status: "failed", message: "Server response commandId did not match the outbound command." };
        }
        const result: CommandResult = {
          commandId,
          status: payload.ok ? "succeeded" : "failed",
          message: payload.message,
          snapshot: payload.snapshot as Partial<MissionSnapshot> | undefined,
        };
        if (result.snapshot) this.setSnapshot(result.snapshot);
        return result;
      }

      const result: CommandResult = {
        commandId,
        status: "succeeded",
        message: typeof payload?.message === "string" ? payload.message : undefined,
        snapshot: isRecord(payload?.snapshot) ? payload.snapshot as Partial<MissionSnapshot> : undefined,
      };
      if (result.snapshot) this.setSnapshot(result.snapshot);
      else if (isRecord(payload?.roadmap)) this.setSnapshot({ roadmap: payload.roadmap as RoadmapSnapshot });
      return result;
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      return { commandId, status: timedOut ? "timed-out" : "failed", message: boundedProtocolMessage(error) };
    }
  }

  private async sendFileHttp(command: Extract<MissionCommand, { type: "file.save" }>, commandId: string): Promise<CommandResult> {
    if (!this.options.httpBaseUrl) {
      return { commandId, status: "failed", message: "No HTTP transport configured for file.save." };
    }
    try {
      const response = await this.fetchWithTimeout(`${this.options.httpBaseUrl.replace(/\/$/, "")}/mission/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-GoVibe-File-Hash": command.hash,
          "X-GoVibe-File-Meta": encodeBase64Url(JSON.stringify(command.meta)),
        },
        body: command.data instanceof ArrayBuffer ? command.data : new Uint8Array(command.data).buffer,
      });
      const payload = await this.readJson(response);
      return {
        commandId,
        status: response.ok ? "succeeded" : "failed",
        message: response.ok ? undefined : boundedProtocolMessage(payload?.error ?? `Server rejected file transfer with ${response.status}.`),
        snapshot: isRecord(payload?.snapshot) ? payload.snapshot as Partial<MissionSnapshot> : undefined,
      };
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      return { commandId, status: timedOut ? "timed-out" : "failed", message: boundedProtocolMessage(error) };
    }
  }

  private async fetchWithTimeout(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);
    try {
      return await (this.options.fetchImpl ?? fetch)(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async readJson(response: Response): Promise<Record<string, unknown> | undefined> {
    try {
      const payload: unknown = await response.json();
      return isRecord(payload) ? payload : undefined;
    } catch {
      return undefined;
    }
  }

  private appendCommandLine(commandId: string, command: MissionCommand, status: CommandStatus): void {
    const text = command.type === "terminal.command" ? command.command : command.type;
    const line: CommandTerminalLine = {
      id: `command:${commandId}`,
      commandId,
      commandStatus: status,
      type: "user",
      text,
      time: new Date().toLocaleTimeString("en-US", { hour12: false }),
    };
    this.setSnapshot({ terminal: [...this.snapshot.terminal.slice(-199), line] });
  }

  private reconcileCommand(result: CommandResult): void {
    const terminal = this.snapshot.terminal.map((line) => {
      const candidate = line as CommandTerminalLine;
      return candidate.commandId === result.commandId
        ? { ...candidate, commandStatus: result.status, text: result.message ? `${candidate.text} — ${result.message}` : candidate.text }
        : line;
    });
    this.setSnapshot({ terminal });
    if (result.snapshot) this.setSnapshot(result.snapshot);
  }

  private reconcileTerminalLine(line: CommandTerminalLine): void {
    if (line.commandId) {
      const index = this.snapshot.terminal.findIndex((item) => (item as CommandTerminalLine).commandId === line.commandId);
      if (index >= 0) {
        this.setSnapshot({ terminal: this.snapshot.terminal.map((item, i) => i === index ? line : item) });
        return;
      }
    }
    const duplicate = this.snapshot.terminal.some((item) => item.id === line.id);
    if (!duplicate) this.setSnapshot({ terminal: [...this.snapshot.terminal.slice(-199), line] });
  }

  private appendTerminal(type: TerminalLine["type"], text: string): void {
    const line: TerminalLine = {
      id: crypto.randomUUID(),
      type,
      text,
      time: new Date().toLocaleTimeString("en-US", { hour12: false }),
    };
    this.setSnapshot({ terminal: [...this.snapshot.terminal.slice(-199), line] });
  }

  private updateRoadmapNode(node: WorkflowTaskNode): void {
    const roadmap = ensureRoadmapSnapshot(this.snapshot.roadmap);
    this.setSnapshot({ roadmap: { ...roadmap, updatedAt: new Date().toISOString(), nodes: upsertByKey(roadmap.nodes, node, (item) => item.id === node.id) } });
  }

  private updateRoadmapAssignment(assignment: WorkflowAssignment): void {
    const roadmap = ensureRoadmapSnapshot(this.snapshot.roadmap);
    this.setSnapshot({ roadmap: { ...roadmap, updatedAt: new Date().toISOString(), assignments: upsertByKey(roadmap.assignments, assignment, (item) => item.taskId === assignment.taskId) } });
  }

  private updateRoadmapHandoff(handoff: WorkflowHandoff): void {
    const roadmap = ensureRoadmapSnapshot(this.snapshot.roadmap);
    this.setSnapshot({ roadmap: { ...roadmap, updatedAt: new Date().toISOString(), handoffs: upsertByKey(roadmap.handoffs, handoff, (item) => item.taskId === handoff.taskId && item.fromId === handoff.fromId && item.toId === handoff.toId) } });
  }

  private updateRoadmapVerification(verification: WorkflowVerification): void {
    const roadmap = ensureRoadmapSnapshot(this.snapshot.roadmap);
    this.setSnapshot({ roadmap: { ...roadmap, updatedAt: new Date().toISOString(), verifications: upsertByKey(roadmap.verifications, verification, (item) => item.taskId === verification.taskId) } });
  }

  private deriveWsUrl(): string | undefined {
    if (!this.options.httpBaseUrl) return undefined;
    const url = new URL(this.options.httpBaseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/mission/ws";
    url.search = "";
    return url.toString();
  }

  private setSnapshot(patch: Partial<MissionSnapshot>): void {
    this.snapshot = mergeSnapshot(this.snapshot, patch);
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}

function resolveLocalApiFallback(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const { hostname, protocol } = window.location;
  if (hostname !== "127.0.0.1" && hostname !== "localhost") return undefined;
  return `${protocol}//${hostname}:4310`;
}

export const missionGateway = new ReliableMissionGateway({
  wsUrl: import.meta.env.VITE_GOVIBE_WS_URL,
  httpBaseUrl: import.meta.env.VITE_GOVIBE_API_URL ?? resolveLocalApiFallback(),
});

export function ingestReliableExternalMissionEvent(value: unknown): boolean {
  if (!isMissionEvent(value)) return false;
  missionGateway.handleEvent(value);
  return true;
}

if (typeof window !== "undefined") {
  window.addEventListener("govibe:mission-event", ((event: CustomEvent<unknown>) => {
    ingestReliableExternalMissionEvent(event.detail);
  }) as EventListener);
  window.addEventListener("message", (event: MessageEvent<{ source?: string; event?: unknown }>) => {
    if (event.data?.source === "govibe-mission-control") ingestReliableExternalMissionEvent(event.data.event);
  });
}
