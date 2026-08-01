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
    async reloadRoadmap() {
      return undefined;
    },
    async handleMissionCommand(command) {
      return { ok: true, command };
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
  instance.wss.close();
  await new Promise((resolve, reject) => {
    instance.server.close((error) => error ? reject(error) : resolve());
  });
}

test("rejects startup without an auth token", () => {
  assert.throws(
    () => startSidecarServer(createRuntime(), { host: "127.0.0.1", port: 0, authToken: "" }),
    /GOVIBE_MCP_TOKEN is required/,
  );
});

test("rejects an untrusted HTTP origin", async () => {
  const instance = await startTestServer();
  try {
    const response = await fetch(`${instance.baseUrl}/mission/snapshot`, {
      headers: {
        Origin: "https://attacker.example",
        Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  } finally {
    await stopTestServer(instance);
  }
});

test("rejects a missing bearer token", async () => {
  const instance = await startTestServer();
  try {
    const response = await fetch(`${instance.baseUrl}/mission/snapshot`, {
      headers: { Origin: trustedOrigin },
    });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("access-control-allow-origin"), trustedOrigin);
  } finally {
    await stopTestServer(instance);
  }
});

test("returns snapshot for a trusted origin and valid token", async () => {
  const instance = await startTestServer();
  try {
    const response = await fetch(`${instance.baseUrl}/mission/snapshot`, {
      headers: {
        Origin: trustedOrigin,
        Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), trustedOrigin);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { connectionState: "connected", terminal: [] });
  } finally {
    await stopTestServer(instance);
  }
});

test("rejects WebSocket upgrade from an untrusted origin", async () => {
  const instance = await startTestServer();
  try {
    const socket = new WebSocket(`${instance.wsUrl}?token=${encodeURIComponent(token)}`, {
      origin: "https://attacker.example",
    });
    const [error] = await once(socket, "error");
    assert.match(error.message, /Unexpected server response: 403/);
  } finally {
    await stopTestServer(instance);
  }
});

test("accepts WebSocket upgrade with trusted origin and valid token", async () => {
  const instance = await startTestServer();
  try {
    const socket = new WebSocket(`${instance.wsUrl}?token=${encodeURIComponent(token)}`, {
      origin: trustedOrigin,
    });
    await once(socket, "open");
    const [message] = await once(socket, "message");
    const event = JSON.parse(message.toString("utf8"));
    assert.equal(event.type, "snapshot");
    socket.close();
    await once(socket, "close");
  } finally {
    await stopTestServer(instance);
  }
});
