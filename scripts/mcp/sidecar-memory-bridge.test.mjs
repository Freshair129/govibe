// AC-03 (WP-17): the protocol allow-list additions are proven to work end
// to end. Given packages/mission-protocol/index.js's silent-drop failure
// mode (an event whose isMissionEvent case is missing/wrong is dropped with
// only a console warning, never an error -- the bridge looks connected and
// delivers nothing), an integration-level assertion that an emitted memory
// event actually survives the sidecar's gate and reaches a real WebSocket
// subscriber is worth more than a unit assertion that the predicate returns
// true (already covered separately in src/missionProtocol.test.ts). Mirrors
// scripts/mcp/sidecar-server.security.mjs's real-server harness.
import { once } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";

import { startSidecarServer } from "./sidecar-server.mjs";

const trustedOrigin = "http://localhost:1420";
const token = "test-token-123";

function createRuntime() {
  const listeners = new Set();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(event) {
      for (const listener of listeners) listener(event);
    },
    getSnapshot() {
      return { connectionState: "connected", terminal: [] };
    },
    async listRoadmapSources() {
      return [];
    },
    async reloadRoadmap() {},
    async handleMissionCommand(command) {
      return { accepted: command.type };
    },
    appendTerminal() {},
  };
}

let activeInstance;
let activeRuntime;

async function startTestServer() {
  activeRuntime = createRuntime();
  const instance = startSidecarServer(activeRuntime, {
    host: "127.0.0.1",
    port: 0,
    authToken: token,
    allowedOrigins: [trustedOrigin],
    maxBodyBytes: 1024 * 1024,
  });
  await once(instance.server, "listening");
  const address = instance.server.address();
  activeInstance = instance;
  return { ...instance, wsUrl: `ws://127.0.0.1:${address.port}/mission/ws?token=${token}` };
}

afterEach(async () => {
  if (!activeInstance) return;
  for (const client of activeInstance.wss.clients) client.terminate();
  await new Promise((resolve) => activeInstance.wss.close(resolve));
  if (activeInstance.server.listening) {
    await new Promise((resolve, reject) => {
      activeInstance.server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  activeInstance = undefined;
  activeRuntime = undefined;
});

async function connectClient(wsUrl, { origin = trustedOrigin } = {}) {
  const socket = new WebSocket(wsUrl, { origin });
  // Register the listener for the initial snapshot frame BEFORE awaiting
  // "open" -- the server sends it synchronously on connection, so awaiting
  // "open" first risks missing it (once() only catches future events) and
  // hanging forever on a subsequent message wait, mirroring
  // sidecar-server.security.mjs's own "accepts authenticated WebSocket
  // upgrades and emits a snapshot" test ordering.
  const snapshotPromise = once(socket, "message");
  await once(socket, "open");
  await snapshotPromise;
  return socket;
}

function nextMessage(socket) {
  return once(socket, "message").then(([data]) => JSON.parse(data.toString("utf8")));
}

describe("AC-03: memory.* protocol events survive the sidecar's isMissionEvent gate end to end", () => {
  it("a well-formed memory.search.result event reaches a real WebSocket subscriber", async () => {
    const { wsUrl } = await startTestServer();
    const socket = await connectClient(wsUrl);
    try {
      const pending = nextMessage(socket);
      activeRuntime.emit({
        type: "memory.search.result",
        result: { query: "hello", vaultId: "vault_a", hits: [], layersUsed: [], vectorAvailable: false, searchMode: "fts_only", updatedAt: new Date().toISOString() },
      });
      const received = await pending;
      expect(received).toMatchObject({ type: "memory.search.result", result: { query: "hello" } });
    } finally {
      socket.terminate();
    }
  });

  it("a well-formed memory.decay.result event reaches a real WebSocket subscriber", async () => {
    const { wsUrl } = await startTestServer();
    const socket = await connectClient(wsUrl);
    try {
      const pending = nextMessage(socket);
      activeRuntime.emit({ type: "memory.decay.result", result: { vaultId: "vault_a", evaluated: 3, transitioned: [], dryRun: false, updatedAt: new Date().toISOString() } });
      const received = await pending;
      expect(received).toMatchObject({ type: "memory.decay.result", result: { vaultId: "vault_a", evaluated: 3 } });
    } finally {
      socket.terminate();
    }
  });

  it("a malformed memory event (extra field the protocol does not allow) is silently dropped -- never reaches the subscriber", async () => {
    const { wsUrl } = await startTestServer();
    const socket = await connectClient(wsUrl);
    try {
      const messages = [];
      socket.on("message", (data) => messages.push(JSON.parse(data.toString("utf8"))));

      activeRuntime.emit({ type: "memory.search.result", result: { query: "hello" }, unauthorizedField: "should never pass" });

      // Prove liveness of the channel too (a well-formed canary event still
      // gets through on the same connection), so "nothing arrived" can't be
      // explained by a broken connection rather than the gate doing its job.
      const pending = nextMessage(socket);
      activeRuntime.emit({ type: "memory.selection", entityId: null });
      await pending;

      expect(messages.some((message) => message.type === "memory.search.result")).toBe(false);
      expect(messages.some((message) => message.type === "memory.selection")).toBe(true);
    } finally {
      socket.terminate();
    }
  });

  it("an oversized memory.search.result event (a body preview far beyond eventBytes) is silently dropped -- never reaches the subscriber", async () => {
    const { wsUrl } = await startTestServer();
    const socket = await connectClient(wsUrl);
    try {
      const messages = [];
      socket.on("message", (data) => messages.push(JSON.parse(data.toString("utf8"))));

      activeRuntime.emit({
        type: "memory.search.result",
        result: { query: "q", vaultId: "vault_a", hits: [{ entity: { bodyPreview: "x".repeat(2_000_000) } }] },
      });

      const pending = nextMessage(socket);
      activeRuntime.emit({ type: "memory.selection", entityId: null });
      await pending;

      expect(messages.some((message) => message.type === "memory.search.result")).toBe(false);
      expect(messages.some((message) => message.type === "memory.selection")).toBe(true);
    } finally {
      socket.terminate();
    }
  });
});
