import { afterEach, describe, expect, it, vi } from "vitest";
import { ReliableMissionGateway } from "./missionGateway";

type Listener = (event: { data?: unknown }) => void;

class FakeSocket {
  static OPEN = 1;
  static CLOSING = 2;
  readyState = 0;
  sent: string[] = [];
  listeners = new Map<string, Listener[]>();

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  send(value: string) {
    this.sent.push(value);
  }

  close() {
    this.readyState = FakeSocket.CLOSING;
    this.emit("close", {});
  }

  emit(type: string, event: { data?: unknown }) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  open() {
    this.readyState = FakeSocket.OPEN;
    this.emit("open", {});
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ReliableMissionGateway command lifecycle", () => {
  it("returns a structured success result and reconciles the optimistic terminal line", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ message: "accepted" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const gateway = new ReliableMissionGateway({ httpBaseUrl: "http://localhost:4310", fetchImpl });

    const result = await gateway.send({ type: "terminal.command", command: "status" });

    expect(result.status).toBe("succeeded");
    expect(result.commandId).toBeTruthy();
    const line = gateway.getSnapshot().terminal[0] as { commandId?: string; commandStatus?: string };
    expect(line.commandId).toBe(result.commandId);
    expect(line.commandStatus).toBe("succeeded");
    const request = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(request.commandId).toBe(result.commandId);
  });

  it("surfaces bounded non-2xx feedback", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: "x".repeat(500) }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }));
    const gateway = new ReliableMissionGateway({ httpBaseUrl: "http://localhost:4310", fetchImpl });

    const result = await gateway.send({ type: "terminal.command", command: "status" });

    expect(result.status).toBe("failed");
    expect(result.message?.length).toBeLessThanOrEqual(240);
    expect((gateway.getSnapshot().terminal[0] as { commandStatus?: string }).commandStatus).toBe("failed");
  });

  it("distinguishes timeout from server rejection", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const gateway = new ReliableMissionGateway({
      httpBaseUrl: "http://localhost:4310",
      fetchImpl: fetchImpl as typeof fetch,
      requestTimeoutMs: 25,
    });

    const pending = gateway.send({ type: "terminal.command", command: "status" });
    await vi.advanceTimersByTimeAsync(25);
    const result = await pending;

    expect(result.status).toBe("timed-out");
  });

  it("retries only documented idempotent commands", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException("Aborted", "AbortError");
    });
    const idempotentGateway = new ReliableMissionGateway({ httpBaseUrl: "http://localhost:4310", fetchImpl });
    await idempotentGateway.send({ type: "agent.select", agentId: "vibe" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    fetchImpl.mockClear();
    const nonIdempotentGateway = new ReliableMissionGateway({ httpBaseUrl: "http://localhost:4310", fetchImpl });
    await nonIdempotentGateway.send({ type: "terminal.command", command: "run" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("correlates WebSocket acknowledgements and prevents duplicate terminal entries", async () => {
    const socket = new FakeSocket();
    const gateway = new ReliableMissionGateway({
      wsUrl: "ws://localhost/mission/ws",
      webSocketFactory: () => socket as unknown as WebSocket,
    });
    void gateway.connect();
    socket.open();

    const pending = gateway.send({ type: "terminal.command", command: "status" });
    const outbound = JSON.parse(socket.sent[0]);
    socket.emit("message", { data: JSON.stringify({
      type: "command.ack",
      commandId: outbound.commandId,
      ok: true,
      message: "done",
    }) });
    const result = await pending;

    expect(result.status).toBe("succeeded");
    expect(gateway.getSnapshot().terminal).toHaveLength(1);
    gateway.handleRawFrame(JSON.stringify({
      type: "terminal.line",
      line: {
        id: "runtime-line",
        commandId: outbound.commandId,
        commandStatus: "succeeded",
        type: "user",
        text: "status",
        time: "12:00:00",
      },
    }));
    expect(gateway.getSnapshot().terminal).toHaveLength(1);
    expect(gateway.getSnapshot().terminal[0]?.id).toBe("runtime-line");
  });
});

describe("ReliableMissionGateway WebSocket resilience", () => {
  it("ignores malformed JSON and binary frames without mutating operational state", () => {
    const gateway = new ReliableMissionGateway();
    const before = gateway.getSnapshot();

    gateway.handleRawFrame("{");
    gateway.handleRawFrame(new ArrayBuffer(8));

    expect(gateway.getSnapshot().metrics).toEqual(before.metrics);
    expect(gateway.getSnapshot().terminal).toHaveLength(2);
  });

  it("recovers from constructor failure with bounded reconnect and stops after dispose", async () => {
    vi.useFakeTimers();
    const factory = vi.fn(() => {
      throw new Error("constructor failed");
    });
    const gateway = new ReliableMissionGateway({
      wsUrl: "ws://localhost/mission/ws",
      webSocketFactory: factory,
      reconnectBaseDelayMs: 10,
      reconnectMaxDelayMs: 10,
      reconnectMaxAttempts: 2,
      random: () => 0.5,
    });

    await gateway.connect();
    expect(factory).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10);
    expect(factory).toHaveBeenCalledTimes(2);

    gateway.dispose();
    await vi.advanceTimersByTimeAsync(100);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("supports explicit HTTP-only re-bootstrap", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      connectionState: "connected",
      metrics: [], chart: { labels: [], series: [] }, reactor: [], agents: [], capabilities: [],
      terminal: [], graph: { nodes: [], edges: [] }, specs: [], symbols: [], campaignLogs: [],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const gateway = new ReliableMissionGateway({ httpBaseUrl: "http://localhost:4310", fetchImpl });

    await gateway.connect();
    await gateway.reconnect();

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(gateway.getSnapshot().connectionState).toBe("connected");
  });
});
