import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
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

async function startTestServer() {
  const instance = startSidecarServer(createRuntime(), {
    host: "127.0.0.1",
    port: 0,
    authToken: token,
    allowedOrigins: [trustedOrigin],
    maxBodyBytes: 1024,
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
  const instance = await startTestServer();
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
