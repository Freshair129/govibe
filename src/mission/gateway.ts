import {
  boundedProtocolMessage,
  IDEMPOTENT_RETRY_COMMAND_TYPES,
  isCommandResponse,
  isMissionCommand,
  isMissionEvent,
  isMissionSnapshot,
  isRecord,
  type MissionCommand,
  type MissionEvent,
} from "../../packages/mission-protocol/index.js";
import type {
  EventProvenance,
  MissionSnapshot,
  RoadmapSnapshot,
  TerminalLine,
} from "./domain";
import { MissionSnapshotStore } from "./snapshot-store";
import { MissionHttpTransport } from "./transport/http";
import { createMissionWebSocket, deriveMissionWebSocketUrl } from "./transport/websocket";
import {
  readDevelopmentCustomMissionEvent,
  readTrustedMissionMessage,
  resolveMissionEventOrigins,
} from "./browser-ingestion";

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

// TASK-PRD-033 (AUD-18): reconciled with the sidecar's server-side dedup window — both sides
// now read the same Set from packages/mission-protocol/index.js instead of maintaining two
// hand-written lists that could drift.
const IDEMPOTENT_COMMANDS: ReadonlySet<MissionCommand["type"]> = IDEMPOTENT_RETRY_COMMAND_TYPES;

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

export class ReliableMissionGateway {
  private readonly store = new MissionSnapshotStore();
  private readonly http?: MissionHttpTransport;
  private socket?: WebSocket;
  private bootstrapPromise?: Promise<void>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempt = 0;
  private disposed = false;
  private intentionalDisconnect = false;
  private pendingCommands = new Map<string, PendingCommand>();

  constructor(private readonly options: MissionGatewayOptions = {}) {
    if (options.httpBaseUrl) {
      this.http = new MissionHttpTransport(options.httpBaseUrl, options.fetchImpl, options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);
    }
  }

  private get snapshot(): MissionSnapshot {
    return this.store.getSnapshot();
  }

  getSnapshot(): MissionSnapshot {
    return this.store.getSnapshot();
  }

  subscribe(listener: (snapshot: MissionSnapshot) => void): () => void {
    return this.store.subscribe(listener);
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
    this.store.clear();
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

  // TASK-PRD-021 (AUD-24): `provenance` defaults to "sidecar" -- the normal case, a WebSocket
  // frame or HTTP command response from the governed mission sidecar (see handleRawFrame).
  // Every other call site (the C3 debug-ingress form, a trusted postMessage payload, the
  // dev-only govibe:mission-event CustomEvent) passes its real provenance explicitly so an
  // event that bypassed the sidecar is never indistinguishable from one that came from it.
  handleEvent(event: WireEvent, provenance: EventProvenance = "sidecar"): void {
    if (event.type === "command.ack") {
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
    if (event.type === "terminal.line") {
      this.reconcileTerminalLine(event.line as CommandTerminalLine);
      return;
    }
    this.store.apply(event as import("./domain").MissionEvent);
    this.setSnapshot({ lastIngest: { source: provenance, eventType: event.type, at: new Date().toISOString() } });
  }

  private async bootstrap(): Promise<void> {
    const hasHttp = Boolean(this.options.httpBaseUrl);
    const wsUrl = this.options.wsUrl ?? deriveMissionWebSocketUrl(this.options.httpBaseUrl);
    if (!hasHttp && !wsUrl) return;

    this.setSnapshot({ connectionState: "connecting" });
    if (hasHttp) {
      try {
        const response = await this.http!.request("/mission/snapshot");
        // TASK-PRD-021 (AUD-24): a 401 bootstrap gets its own dedicated state rather than
        // falling into the generic "error" branch below -- the fix here is signing in /
        // configuring credentials, not retrying a broken transport, and the same bearer
        // token would fail the WebSocket upgrade too, so this returns without attempting it.
        if (response.status === 401) {
          this.appendTerminal("warn", "Mission sidecar rejected the bootstrap request as unauthorized (401).");
          this.setSnapshot({ connectionState: "unauthorized" });
          return;
        }
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
      const socket = createMissionWebSocket(url, this.options.webSocketFactory);
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
      const response = await this.http!.request("/mission/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await this.http!.readJson(response);
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
      const response = await this.http!.request("/mission/files", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-GoVibe-File-Hash": command.hash,
          "X-GoVibe-File-Meta": encodeBase64Url(JSON.stringify(command.meta)),
        },
        body: command.data instanceof ArrayBuffer ? command.data : new Uint8Array(command.data).buffer,
      });
      const payload = await this.http!.readJson(response);
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

  private setSnapshot(patch: Partial<MissionSnapshot>): void {
    this.store.patch(patch);
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

// TASK-PRD-021 (AUD-24): this is a general-purpose external ingestion entrypoint (not tied to
// any one caller), so it defaults to the "external-postmessage" provenance rather than
// "sidecar" -- a caller with more specific knowledge of its own origin may override it.
export function ingestReliableExternalMissionEvent(value: unknown, provenance: EventProvenance = "external-postmessage"): boolean {
  if (!isMissionEvent(value)) return false;
  missionGateway.handleEvent(value, provenance);
  return true;
}

if (typeof window !== "undefined") {
  const allowedMissionEventOrigins = resolveMissionEventOrigins(
    import.meta.env.VITE_GOVIBE_EVENT_ORIGINS as string | undefined,
    window.location.origin,
  );
  const allowDevelopmentCustomEvents = import.meta.env.VITE_GOVIBE_ALLOW_CUSTOM_EVENTS === "true";
  if (allowDevelopmentCustomEvents) {
    window.addEventListener("govibe:mission-event", ((event: CustomEvent<unknown>) => {
      const missionEvent = readDevelopmentCustomMissionEvent(event.detail, allowDevelopmentCustomEvents);
      if (missionEvent) missionGateway.handleEvent(missionEvent, "development-custom-event");
      else console.warn("Rejected invalid development mission event.");
    }) as EventListener);
  }
  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    const missionEvent = readTrustedMissionMessage(event, window, allowedMissionEventOrigins);
    if (missionEvent) missionGateway.handleEvent(missionEvent, "external-postmessage");
    else console.warn("Rejected untrusted or invalid mission message.");
  });
}
