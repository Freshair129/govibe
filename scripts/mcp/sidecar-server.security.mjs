import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { WebSocket } from "ws";

import { startSidecarServer } from "./sidecar-server.mjs";
import { createCommandDedupWindow } from "../../packages/mission-protocol/index.js";

const trustedOrigin = "http://localhost:1420";
const token = "test-token-123";

function createRuntime(handledCommands = []) {
  const listeners = new Set();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return { connectionState: "connected", terminal: [] };
    },
    async listRoadmapSources() {
      return [];
    },
    async reloadRoadmap() {},
    async handleMissionCommand(command) {
      handledCommands.push(command);
      return { accepted: command.type };
    },
    appendTerminal() {},
  };
}

// 033-A: a runtime whose snapshot visibly changes on every call, so a stale cached snapshot
// (vs. a freshly-fetched one) is observably distinguishable in a replayed acknowledgement.
function createRuntimeWithLiveSnapshot(handledCommands = []) {
  const listeners = new Set();
  let snapshotVersion = 0;
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      snapshotVersion += 1;
      return { connectionState: "connected", terminal: [], snapshotVersion };
    },
    async listRoadmapSources() {
      return [];
    },
    async reloadRoadmap() {},
    async handleMissionCommand(command) {
      handledCommands.push(command);
      return { accepted: command.type };
    },
    appendTerminal() {},
  };
}

async function startTestServer({ handledCommands = [], maxBodyBytes = 1024, runtime, commandDedup } = {}) {
  const instance = startSidecarServer(runtime ?? createRuntime(handledCommands), {
    host: "127.0.0.1",
    port: 0,
    authToken: token,
    allowedOrigins: [trustedOrigin],
    maxBodyBytes,
    ...(commandDedup ? { commandDedup } : {}),
  });
  await once(instance.server, "listening");
  const address = instance.server.address();
  assert.ok(address && typeof address === "object");
  return {
    ...instance,
    baseUrl: `http://127.0.0.1:${address.port}`,
    wsUrl: `ws://127.0.0.1:${address.port}/mission/ws`,
  };
}

async function stopTestServer(instance) {
  for (const client of instance.wss.clients) client.terminate();
  await new Promise((resolve) => instance.wss.close(resolve));
  if (instance.server.listening) {
    await new Promise((resolve, reject) => {
      instance.server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function closeSocket(socket) {
  if (socket.readyState === WebSocket.CLOSED) return;
  const closed = once(socket, "close");
  socket.terminate();
  await closed;
}

test("rejects startup without an auth token", () => {
  assert.throws(
    () => startSidecarServer(createRuntime(), { host: "127.0.0.1", port: 0, authToken: "" }),
    /GOVIBE_MCP_TOKEN is required/,
  );
});

test("rejects untrusted HTTP origins", async () => {
  const instance = await startTestServer();
  try {
    const response = await fetch(`${instance.baseUrl}/mission/snapshot`, {
      headers: { Origin: "https://attacker.example", Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  } finally {
    await stopTestServer(instance);
  }
});

test("rejects missing bearer auth", async () => {
  const instance = await startTestServer();
  try {
    const response = await fetch(`${instance.baseUrl}/mission/snapshot`, {
      headers: { Origin: trustedOrigin },
    });
    assert.equal(response.status, 401);
  } finally {
    await stopTestServer(instance);
  }
});

test("rejects invalid bearer auth", async () => {
  const instance = await startTestServer();
  try {
    const response = await fetch(`${instance.baseUrl}/mission/snapshot`, {
      headers: { Origin: trustedOrigin, Authorization: "Bearer invalid-token" },
    });
    assert.equal(response.status, 401);
  } finally {
    await stopTestServer(instance);
  }
});

test("supports the default local Vite origins without exposing the token", async () => {
  const instance = startSidecarServer(createRuntime(), {
    host: "127.0.0.1",
    port: 0,
    authToken: token,
    maxBodyBytes: 1024,
  });
  await once(instance.server, "listening");
  const address = instance.server.address();
  assert.ok(address && typeof address === "object");
  try {
    assert.ok(instance.allowedOrigins.includes("http://localhost:1420"));
    assert.ok(instance.allowedOrigins.includes("http://localhost:5173"));
    const response = await fetch(`http://127.0.0.1:${address.port}/mission/snapshot`, {
      headers: { Origin: trustedOrigin, Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), trustedOrigin);
    assert.equal((await response.text()).includes(token), false);
  } finally {
    await stopTestServer(instance);
  }
});

test("preserves command acknowledgements for authenticated requests", async () => {
  const handledCommands = [];
  const instance = await startTestServer({ handledCommands });
  try {
    const response = await fetch(`${instance.baseUrl}/mission/commands`, {
      method: "POST",
      headers: {
        Origin: trustedOrigin,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ commandId: "cmd-1", type: "agent.select", agentId: "agent-1" }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.commandId, "cmd-1");
    assert.equal(body.ok, true);
    assert.deepEqual(handledCommands, [{ type: "agent.select", agentId: "agent-1" }]);
  } finally {
    await stopTestServer(instance);
  }
});

test("returns 413 for oversized request bodies", async () => {
  const instance = await startTestServer();
  try {
    const response = await fetch(`${instance.baseUrl}/mission/commands`, {
      method: "POST",
      headers: {
        Origin: trustedOrigin,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "terminal.command", command: "x".repeat(2048) }),
    });
    assert.equal(response.status, 413);
  } finally {
    await stopTestServer(instance);
  }
});

test("rejects WebSocket upgrades from untrusted origins", async () => {
  const instance = await startTestServer();
  const socket = new WebSocket(`${instance.wsUrl}?token=${encodeURIComponent(token)}`, {
    origin: "https://attacker.example",
  });
  try {
    const [error] = await once(socket, "error");
    assert.match(error.message, /Unexpected server response: 403/);
  } finally {
    await closeSocket(socket);
    await stopTestServer(instance);
  }
});

for (const [name, body] of [
  ["malformed JSON", "{"],
  ["wrong field types", JSON.stringify({ type: "agent.select", agentId: 42 })],
  ["unknown discriminators", JSON.stringify({ type: "agent.destroy", agentId: "agent-1" })],
  ["unknown top-level fields", JSON.stringify({ type: "agent.select", agentId: "agent-1", admin: true })],
  ["JSON-encoded file transfers", JSON.stringify({ type: "file.save", hash: "abc", data: [1], meta: {} })],
]) {
  test(`rejects ${name} before runtime execution`, async () => {
    const handledCommands = [];
    const instance = await startTestServer({ handledCommands });
    try {
      const response = await fetch(`${instance.baseUrl}/mission/commands`, {
        method: "POST",
        headers: {
          Origin: trustedOrigin,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
      });
      assert.equal(response.status, 400);
      assert.deepEqual(handledCommands, []);
    } finally {
      await stopTestServer(instance);
    }
  });
}

test("accepts bounded binary file transfers through the dedicated endpoint", async () => {
  const handledCommands = [];
  const instance = await startTestServer({ handledCommands });
  try {
    const metadata = Buffer.from(JSON.stringify({ name: "proof.bin" })).toString("base64url");
    const response = await fetch(`${instance.baseUrl}/mission/files`, {
      method: "POST",
      headers: {
        Origin: trustedOrigin,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "X-GoVibe-File-Hash": "sha256:proof",
        "X-GoVibe-File-Meta": metadata,
      },
      body: Buffer.from([1, 2, 3]),
    });
    assert.equal(response.status, 200);
    assert.equal(handledCommands.length, 1);
    assert.equal(handledCommands[0].type, "file.save");
    assert.equal(handledCommands[0].hash, "sha256:proof");
    assert.deepEqual(handledCommands[0].meta, { name: "proof.bin" });
    assert.deepEqual([...new Uint8Array(handledCommands[0].data)], [1, 2, 3]);
  } finally {
    await stopTestServer(instance);
  }
});

test("returns 413 for oversized binary file transfers", async () => {
  const handledCommands = [];
  const instance = await startTestServer({ handledCommands, maxBodyBytes: 8 });
  try {
    const response = await fetch(`${instance.baseUrl}/mission/files`, {
      method: "POST",
      headers: {
        Origin: trustedOrigin,
        Authorization: `Bearer ${token}`,
        "X-GoVibe-File-Hash": "sha256:proof",
        "X-GoVibe-File-Meta": Buffer.from("{}").toString("base64url"),
      },
      body: Buffer.alloc(9),
    });
    assert.equal(response.status, 413);
    assert.deepEqual(handledCommands, []);
  } finally {
    await stopTestServer(instance);
  }
});

for (const [name, credential] of [["missing", ""], ["invalid", "invalid-token"]]) {
  test(`rejects WebSocket upgrades with ${name} authentication`, async () => {
    const instance = await startTestServer();
    const suffix = credential ? `?token=${encodeURIComponent(credential)}` : "";
    const socket = new WebSocket(`${instance.wsUrl}${suffix}`, { origin: trustedOrigin });
    try {
      const [error] = await once(socket, "error");
      assert.match(error.message, /Unexpected server response: 403/);
    } finally {
      await closeSocket(socket);
      await stopTestServer(instance);
    }
  });
}

test("accepts authenticated WebSocket upgrades and emits a snapshot", async () => {
  const instance = await startTestServer();
  const socket = new WebSocket(`${instance.wsUrl}?token=${encodeURIComponent(token)}`, {
    origin: trustedOrigin,
  });
  try {
    const messagePromise = once(socket, "message");
    await once(socket, "open");
    const [message] = await messagePromise;
    const event = JSON.parse(message.toString("utf8"));
    assert.equal(event.type, "snapshot");
  } finally {
    await closeSocket(socket);
    await stopTestServer(instance);
  }
});

test("rejects invalid WebSocket commands before runtime execution", async () => {
  const handledCommands = [];
  const instance = await startTestServer({ handledCommands });
  const socket = new WebSocket(`${instance.wsUrl}?token=${encodeURIComponent(token)}`, {
    origin: trustedOrigin,
  });
  try {
    const snapshot = once(socket, "message");
    await once(socket, "open");
    await snapshot;
    const acknowledgement = once(socket, "message");
    socket.send(JSON.stringify({ commandId: "bad-1", type: "agent.select", agentId: 42 }));
    const [message] = await acknowledgement;
    const event = JSON.parse(message.toString("utf8"));
    assert.equal(event.type, "command.ack");
    assert.equal(event.commandId, "bad-1");
    assert.equal(event.ok, false);
    assert.deepEqual(handledCommands, []);
  } finally {
    await closeSocket(socket);
    await stopTestServer(instance);
  }
});

// TASK-PRD-033 (AUD-18): commandId was echoed but never deduplicated, so a client retry or a
// WS reconnect replay could double-apply a mutating command. workflow.node.action stands in for
// "a command that mutates the roadmap" here — it is the only MissionCommand type that reaches
// RoadmapService#applyRoadmapMutation over this transport (a bare "roadmap.update" is not a
// MissionCommand; the roadmap board mutates via this action, not a separate command type).

async function postCommand(instance, body) {
  const response = await fetch(`${instance.baseUrl}/mission/commands`, {
    method: "POST",
    headers: { Origin: trustedOrigin, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

function sendWsCommand(socket, body) {
  const acknowledgement = once(socket, "message");
  socket.send(JSON.stringify(body));
  return acknowledgement.then(([message]) => JSON.parse(message.toString("utf8")));
}

// Mirrors the ordering the other WebSocket tests in this file rely on: the "message"
// listener for the initial snapshot MUST be attached before awaiting "open" — the server
// sends the snapshot as soon as its own "connection" handler runs, which can race an
// out-of-order `await once(socket, "open")` followed by a separately-attached listener.
async function connectAndAwaitSnapshot(wsUrl) {
  const socket = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`, { origin: trustedOrigin });
  const snapshot = once(socket, "message");
  await once(socket, "open");
  await snapshot;
  return socket;
}

test("HTTP: applies a mutating command once and replays the original acknowledgement for a duplicate commandId", async () => {
  const handledCommands = [];
  const instance = await startTestServer({ handledCommands });
  try {
    const command = { commandId: "dup-1", type: "workflow.node.action", taskId: "T1", action: "approve", actor: "tester" };
    const first = await postCommand(instance, command);
    const second = await postCommand(instance, command);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(handledCommands.length, 1, "the mutating command must apply exactly once");
    assert.deepEqual(second.body, first.body, "the duplicate must return the original acknowledgement");
  } finally {
    await stopTestServer(instance);
  }
});

test("WebSocket: applies a mutating command once and replays the original acknowledgement for a duplicate commandId", async () => {
  const handledCommands = [];
  const instance = await startTestServer({ handledCommands });
  const socket = await connectAndAwaitSnapshot(instance.wsUrl);
  try {
    const command = { commandId: "dup-ws-1", type: "workflow.node.action", taskId: "T1", action: "approve", actor: "tester" };
    const first = await sendWsCommand(socket, command);
    const second = await sendWsCommand(socket, command);
    assert.equal(handledCommands.length, 1, "the mutating command must apply exactly once");
    assert.equal(first.ok, true);
    assert.deepEqual(second, first, "the duplicate must return the original acknowledgement");
  } finally {
    await closeSocket(socket);
    await stopTestServer(instance);
  }
});

test("cross-transport: a mutating command applied over HTTP is not re-applied when replayed over WebSocket with the same commandId", async () => {
  const handledCommands = [];
  const instance = await startTestServer({ handledCommands });
  const socket = await connectAndAwaitSnapshot(instance.wsUrl);
  try {
    const command = { commandId: "dup-cross-1", type: "workflow.node.action", taskId: "T1", action: "approve", actor: "tester" };
    const httpResult = await postCommand(instance, command);
    assert.equal(httpResult.status, 200);
    const wsReplay = await sendWsCommand(socket, command);
    assert.equal(handledCommands.length, 1, "the shared dedup window must span both transports");
    assert.equal(wsReplay.ok, true);
    assert.equal(wsReplay.commandId, "dup-cross-1");
  } finally {
    await closeSocket(socket);
    await stopTestServer(instance);
  }
});

test("does not deduplicate a read-shaped idempotent-retry command — each delivery actually re-executes", async () => {
  const handledCommands = [];
  const instance = await startTestServer({ handledCommands });
  try {
    const command = { commandId: "retry-1", type: "agent.select", agentId: "agent-1" };
    const first = await postCommand(instance, command);
    const second = await postCommand(instance, command);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(handledCommands.length, 2, "agent.select is retry-safe and must not be cached by the dedup window");
  } finally {
    await stopTestServer(instance);
  }
});

test("a failed mutating command is cached too — a duplicate does not retry it against the runtime", async () => {
  const handledCommands = [];
  const instance = startSidecarServer({
    subscribe: () => () => {},
    getSnapshot: () => ({ connectionState: "connected", terminal: [] }),
    async listRoadmapSources() { return []; },
    async reloadRoadmap() {},
    async handleMissionCommand(command) {
      handledCommands.push(command);
      throw new Error("simulated runtime failure");
    },
    appendTerminal() {},
  }, { host: "127.0.0.1", port: 0, authToken: token, allowedOrigins: [trustedOrigin], maxBodyBytes: 1024 });
  await once(instance.server, "listening");
  const address = instance.server.address();
  const wrapped = { ...instance, baseUrl: `http://127.0.0.1:${address.port}` };
  try {
    const command = { commandId: "dup-fail-1", type: "workflow.node.action", taskId: "T1", action: "approve", actor: "tester" };
    const first = await postCommand(wrapped, command);
    const second = await postCommand(wrapped, command);
    assert.equal(first.status, 500);
    assert.equal(second.status, 500);
    assert.equal(handledCommands.length, 1);
    assert.deepEqual(second.body, first.body);
  } finally {
    await stopTestServer(wrapped);
  }
});

test("033-A: a duplicate delivery's acknowledgement carries a FRESH snapshot, never the one cached at first execution", async () => {
  const handledCommands = [];
  const instance = await startTestServer({ handledCommands, runtime: createRuntimeWithLiveSnapshot(handledCommands) });
  try {
    const command = { commandId: "snap-1", type: "workflow.node.action", taskId: "T1", action: "approve", actor: "tester" };
    const first = await postCommand(instance, command);
    const second = await postCommand(instance, command);
    assert.equal(handledCommands.length, 1, "still applied exactly once");
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.ok(
      second.body.snapshot.snapshotVersion > first.body.snapshot.snapshotVersion,
      `replay must fetch a fresh snapshot (got ${second.body.snapshot.snapshotVersion}, expected > ${first.body.snapshot.snapshotVersion})`,
    );
  } finally {
    await stopTestServer(instance);
  }
});

test("033-B: a server-minted commandId (client sent none) is never cached — it can never be replayed with the same id anyway", async () => {
  const handledCommands = [];
  const setCalls = [];
  const realWindow = createCommandDedupWindow();
  const spyWindow = {
    has: (key) => realWindow.has(key),
    get: (key) => realWindow.get(key),
    set: (key, value) => {
      setCalls.push(key);
      realWindow.set(key, value);
    },
    get size() {
      return realWindow.size;
    },
  };
  const instance = await startTestServer({ handledCommands, commandDedup: spyWindow });
  try {
    const response = await fetch(`${instance.baseUrl}/mission/commands`, {
      method: "POST",
      headers: { Origin: trustedOrigin, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "workflow.node.action", taskId: "T1", action: "approve", actor: "tester" }), // no commandId
    });
    assert.equal(response.status, 200);
    assert.equal(handledCommands.length, 1);
    assert.equal(setCalls.length, 0, "a minted commandId must never be written into the dedup window");
  } finally {
    await stopTestServer(instance);
  }
});

test("033-C: two different command types sharing the same client-supplied commandId do not share a cached acknowledgement", async () => {
  const handledCommands = [];
  const instance = await startTestServer({ handledCommands });
  try {
    const sharedId = "shared-commandid-across-types";
    const first = await postCommand(instance, { commandId: sharedId, type: "workflow.node.action", taskId: "T1", action: "approve", actor: "tester" });
    const second = await postCommand(instance, { commandId: sharedId, type: "workspace.scan", workspacePath: "C:/repo", deep: false });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(handledCommands.length, 2, "different command types sharing a commandId must both execute, not share one cached ack");
    assert.equal(first.body.result.accepted, "workflow.node.action");
    assert.equal(second.body.result.accepted, "workspace.scan"); // not workflow.node.action's cached result
  } finally {
    await stopTestServer(instance);
  }
});
