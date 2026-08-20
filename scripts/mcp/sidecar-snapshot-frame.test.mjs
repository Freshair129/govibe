// TASK-PRD-007 (round 5): the connect-time {type:"snapshot"} frame used to be the one payload
// the sidecar sent WITHOUT running it through isMissionEvent -- while src/mission/gateway.ts's
// handleRawFrame() validates every inbound frame. An oversized snapshot was therefore discarded
// by the client with a generic "failed Mission Control schema validation" line and nothing
// server-side to explain it, which is exactly the kind of asymmetry that makes a size ceiling
// undiagnosable in the field. The snapshot frame is also the EARLIER ceiling to break: it is a
// strict superset of the graph.update payload (measured on this repository: 869,491 bytes of
// snapshot frame against 667,348 of graph.update).
//
// Mirrors scripts/mcp/sidecar-memory-bridge.test.mjs's real-server harness.
import { once } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";

import { MISSION_PROTOCOL_LIMITS } from "../../packages/mission-protocol/index.js";
import { startSidecarServer, WS_ECHO_SUBPROTOCOL } from "./sidecar-server.mjs";

const trustedOrigin = "http://localhost:1420";
const token = "test-token-123";

function createRuntime(snapshot) {
  const listeners = new Set();
  const terminal = [];
  return {
    terminal,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    emit(event) { for (const listener of listeners) listener(event); },
    getSnapshot() { return snapshot; },
    async listRoadmapSources() { return []; },
    async reloadRoadmap() {},
    async handleMissionCommand(command) { return { accepted: command.type }; },
    appendTerminal(type, text) { terminal.push({ type, text }); },
  };
}

// A snapshot whose serialized size is over MISSION_PROTOCOL_LIMITS.eventBytes while every array in
// it stays far under the item cap -- the same shape a deep scan of a large repository produces.
function oversizedSnapshot() {
  const nodes = Array.from({ length: 1800 }, (_, index) => ({ id: `file:${String(index).padStart(6, "0")}${"x".repeat(600)}`, label: `node-${index}` }));
  return { connectionState: "connected", terminal: [], graph: { nodes, edges: [] } };
}

let activeInstance;
let activeRuntime;

async function startTestServer(snapshot) {
  activeRuntime = createRuntime(snapshot);
  const instance = startSidecarServer(activeRuntime, {
    host: "127.0.0.1",
    port: 0,
    authToken: token,
    allowedOrigins: [trustedOrigin],
    maxBodyBytes: 1024 * 1024,
  });
  await once(instance.server, "listening");
  activeInstance = instance;
  return { ...instance, wsUrl: `ws://127.0.0.1:${instance.server.address().port}/mission/ws` };
}

afterEach(async () => {
  if (!activeInstance) return;
  for (const client of activeInstance.wss.clients) client.terminate();
  await new Promise((resolve) => activeInstance.wss.close(resolve));
  if (activeInstance.server.listening) {
    await new Promise((resolve, reject) => { activeInstance.server.close((error) => (error ? reject(error) : resolve())); });
  }
  activeInstance = undefined;
  activeRuntime = undefined;
});

// Registers the message collector BEFORE awaiting "open" -- the server sends the connect frame
// synchronously on connection, so awaiting "open" first can miss it.
async function connectCollecting(wsUrl) {
  const socket = new WebSocket(wsUrl, [WS_ECHO_SUBPROTOCOL, Buffer.from(token, "utf8").toString("base64url")], { origin: trustedOrigin });
  const messages = [];
  socket.on("message", (data) => messages.push(JSON.parse(data.toString("utf8"))));
  await once(socket, "open");
  return { socket, messages };
}

describe("sidecar connect-time snapshot frame is size-checked", () => {
  it("sends the snapshot frame when it fits the protocol ceiling", async () => {
    const { wsUrl } = await startTestServer({ connectionState: "connected", terminal: [] });
    const { socket, messages } = await connectCollecting(wsUrl);
    try {
      const pending = once(socket, "message").then(([data]) => JSON.parse(data.toString("utf8")));
      const first = messages[0] ?? (await pending);
      expect(first).toMatchObject({ type: "snapshot" });
      expect(activeRuntime.terminal).toEqual([]);
    } finally {
      socket.terminate();
    }
  });

  it("does not send an oversized snapshot frame, and reports its measured size instead of failing silently", async () => {
    const snapshot = oversizedSnapshot();
    expect(snapshot.graph.nodes.length).toBeLessThan(MISSION_PROTOCOL_LIMITS.arrayItems);
    const frameBytes = Buffer.byteLength(JSON.stringify({ type: "snapshot", snapshot }), "utf8");
    expect(frameBytes).toBeGreaterThan(MISSION_PROTOCOL_LIMITS.eventBytes);

    const { wsUrl } = await startTestServer(snapshot);
    const { socket, messages } = await connectCollecting(wsUrl);
    try {
      // Prove liveness of the channel: a well-formed event on the same connection still arrives,
      // so "no snapshot frame" cannot be explained by a broken connection.
      const pending = once(socket, "message").then(([data]) => JSON.parse(data.toString("utf8")));
      activeRuntime.emit({ type: "memory.selection", entityId: null });
      expect(await pending).toEqual({ type: "memory.selection", entityId: null });

      expect(messages.some((message) => message.type === "snapshot")).toBe(false);

      const warning = activeRuntime.terminal.find((line) => line.type === "warn" && /snapshot frame failed protocol validation/i.test(line.text));
      expect(warning).toBeDefined();
      expect(warning.text).toContain(String(frameBytes));
      expect(warning.text).toContain(String(MISSION_PROTOCOL_LIMITS.eventBytes));
    } finally {
      socket.terminate();
    }
  });
});
