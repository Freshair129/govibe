// TASK-PRD-026 (AUD-04): the sidecar's mission-command surface must pass a governed
// workspace.scan command through the SAME enforceToolRbac decision point the stdio tool
// surface uses (scripts/mcp/handlers.mjs), with the SAME allow/deny audit trail — not the
// pre-fix behavior of a hardcoded `actor: "mission-control"` calling the service directly.
// This mirrors scripts/mcp/rbac-enforcement.test.mjs, but drives the real HTTP and
// WebSocket transports (scripts/mcp/sidecar-server.mjs) instead of calling handleToolCall
// in-process, so the fix is proven at the transport boundary the audit finding named.

import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { WebSocket } from "ws";

import { startSidecarServer, WS_ECHO_SUBPROTOCOL } from "./sidecar-server.mjs";
import { MissionCommandRouter } from "./runtime/mission-command-router.mjs";
import { RBAC_STATE_SCHEMA } from "./runtime/rbac-enforcement.mjs";

const trustedOrigin = "http://localhost:1420";
const authToken = "sidecar-rbac-test-token";
const WS_ID = "workspace_aaaaaaaaaaaaaaaaaaaaaaaa";
const PROJECT_ID = "project_bbbbbbbbbbbbbbbbbbbbbbbb";

const roots = [];
// TASK-PRD-007 (B3, round 3): a governed `deep: true` workspace.scan now spawns
// `git -C <path> ls-files` (packages/govibe-core/src/scan/scan.mjs). On Windows, a just-exited
// child process can hold the directory tree's handle for a few ms after its promise resolves,
// which can race this cleanup into EBUSY -- maxRetries/retryDelay is Node's own documented
// mitigation for exactly this (see fs.promises.rm docs), not a real leak.
async function cleanupRoots() {
  for (const root of roots.splice(0).reverse()) await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

function ownerAssignment(subjectId) {
  return {
    subject_id: subjectId,
    subject_type: "agent",
    role: "owner",
    scope: { project_id: null, workspace_id: WS_ID },
    status: "active",
    granted_by: "bootstrap",
    granted_at: "2026-08-19T00:00:00.000Z",
    approval: null,
  };
}

async function rbacWorkspaceFixture({ assignments = [] } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "govibe-sidecar-rbac-"));
  roots.push(root);
  await mkdir(path.join(root, ".govibe"), { recursive: true });
  await writeFile(path.join(root, ".govibe", "config.json"), JSON.stringify({
    schema: "govibe-workspace-config/v1", workspaceId: WS_ID, projectId: PROJECT_ID, projectSlug: "demo", createdAt: "2026-08-19T00:00:00.000Z",
  }));
  await writeFile(path.join(root, ".govibe", "rbac.json"), JSON.stringify({ schema: RBAC_STATE_SCHEMA, assignments }));
  return root;
}

async function readAuditLines(root) {
  const text = await readFile(path.join(root, ".govibe", "rbac-audit.jsonl"), "utf8");
  return text.trim().split("\n").map((line) => JSON.parse(line));
}

// A lightweight `services` double for MissionCommandRouter -- exercises the REAL router
// (and therefore the real enforceToolRbac call it now makes) without paying for a full
// GovibeRuntime instance (roadmap parsing, agent registry, MSP/GKS clients, ...).
function createStubServices() {
  const scanCalls = [];
  return {
    scanCalls,
    appendTerminal() {},
    async scanWorkspace(args) {
      scanCalls.push(args);
      return { level: args.deep ? "deep" : "l1", status: "scanned" };
    },
    getSnapshot() {
      return { connectionState: "connected", terminal: [] };
    },
  };
}

function createRuntime(services) {
  const router = new MissionCommandRouter(services);
  return {
    subscribe: () => () => {},
    getSnapshot: () => services.getSnapshot(),
    async listRoadmapSources() { return []; },
    async reloadRoadmap() {},
    appendTerminal() {},
    handleMissionCommand: (command) => router.route(command),
  };
}

async function startTestServer(runtime) {
  const instance = startSidecarServer(runtime, {
    host: "127.0.0.1",
    port: 0,
    authToken,
    allowedOrigins: [trustedOrigin],
    maxBodyBytes: 65536,
  });
  await once(instance.server, "listening");
  const address = instance.server.address();
  assert.ok(address && typeof address === "object");
  return { ...instance, baseUrl: `http://127.0.0.1:${address.port}`, wsUrl: `ws://127.0.0.1:${address.port}/mission/ws` };
}

async function stopTestServer(instance) {
  for (const client of instance.wss.clients) client.terminate();
  await new Promise((resolve) => instance.wss.close(resolve));
  if (instance.server.listening) {
    await new Promise((resolve, reject) => instance.server.close((error) => (error ? reject(error) : resolve())));
  }
}

async function postCommand(instance, body) {
  const response = await fetch(`${instance.baseUrl}/mission/commands`, {
    method: "POST",
    headers: { Origin: trustedOrigin, Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

// TASK-PRD-028 (AUD-10b / AUD-32): the auth token rides as the last offered
// Sec-WebSocket-Protocol subprotocol (base64url-encoded), not a URL query string; the fixed
// WS_ECHO_SUBPROTOCOL sentinel is offered alongside it so the server has a non-secret protocol
// to select/echo in its 101 response (review-gate hardening).
async function connectAndAwaitSnapshot(wsUrl) {
  const socket = new WebSocket(wsUrl, [WS_ECHO_SUBPROTOCOL, Buffer.from(authToken, "utf8").toString("base64url")], { origin: trustedOrigin });
  const snapshot = once(socket, "message");
  await once(socket, "open");
  await snapshot;
  return socket;
}

function sendWsCommand(socket, body) {
  const acknowledgement = once(socket, "message");
  socket.send(JSON.stringify(body));
  return acknowledgement.then(([message]) => JSON.parse(message.toString("utf8")));
}

async function closeSocket(socket) {
  if (socket.readyState === WebSocket.CLOSED) return;
  const closed = once(socket, "close");
  socket.terminate();
  await closed;
}

test("HTTP: an unauthorized actor's governed workspace.scan is denied through enforceToolRbac and audited", async () => {
  const root = await rbacWorkspaceFixture({ assignments: [] }); // no covering assignment
  const services = createStubServices();
  const instance = await startTestServer(createRuntime(services));
  try {
    const result = await postCommand(instance, {
      type: "workspace.scan", workspacePath: root, deep: false, actor: "intruder-agent",
    });
    assert.equal(result.status, 500, "an RBAC denial must surface as a failed command, not a silent scan");
    assert.match(result.body.message, /rbac denied/i);
    assert.equal(services.scanCalls.length, 0, "the scan handler body must never run for a denied actor");

    const lines = await readAuditLines(root);
    assert.equal(lines.length, 1);
    assert.match(lines[0].operation, /govibe\.workspace\.scan\.l1/);
    assert.equal(lines[0].decision, "deny");
    assert.equal(lines[0].subject_id, "intruder-agent");
  } finally {
    await stopTestServer(instance);
    await cleanupRoots();
  }
});

test("HTTP: an authorized actor's governed workspace.scan passes the gate and is audited as an allow", async () => {
  const root = await rbacWorkspaceFixture({ assignments: [ownerAssignment("trusted-agent")] });
  const services = createStubServices();
  const instance = await startTestServer(createRuntime(services));
  try {
    const result = await postCommand(instance, {
      type: "workspace.scan", workspacePath: root, deep: true, actor: "trusted-agent",
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(services.scanCalls.length, 1);
    assert.equal(services.scanCalls[0].actor, "trusted-agent", "attribution comes from the command, not a hardcoded constant");

    const lines = await readAuditLines(root);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].decision, "allow");
    assert.equal(lines[0].subject_id, "trusted-agent");
  } finally {
    await stopTestServer(instance);
    await cleanupRoots();
  }
});

test("WebSocket: an unauthorized actor's governed workspace.scan is denied through enforceToolRbac and audited", async () => {
  const root = await rbacWorkspaceFixture({ assignments: [] });
  const services = createStubServices();
  const instance = await startTestServer(createRuntime(services));
  const socket = await connectAndAwaitSnapshot(instance.wsUrl);
  try {
    const ack = await sendWsCommand(socket, { type: "workspace.scan", workspacePath: root, deep: false, actor: "intruder-agent" });
    assert.equal(ack.ok, false);
    assert.match(ack.message, /rbac denied/i);
    assert.equal(services.scanCalls.length, 0);

    const lines = await readAuditLines(root);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].decision, "deny");
    assert.equal(lines[0].subject_id, "intruder-agent");
  } finally {
    await closeSocket(socket);
    await stopTestServer(instance);
    await cleanupRoots();
  }
});

test("WebSocket: an authorized actor's governed workspace.scan passes the gate and is audited as an allow", async () => {
  const root = await rbacWorkspaceFixture({ assignments: [ownerAssignment("trusted-agent")] });
  const services = createStubServices();
  const instance = await startTestServer(createRuntime(services));
  const socket = await connectAndAwaitSnapshot(instance.wsUrl);
  try {
    const ack = await sendWsCommand(socket, { type: "workspace.scan", workspacePath: root, deep: false, actor: "trusted-agent" });
    assert.equal(ack.ok, true);
    assert.equal(services.scanCalls.length, 1);
    assert.equal(services.scanCalls[0].actor, "trusted-agent");

    const lines = await readAuditLines(root);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].decision, "allow");
  } finally {
    await closeSocket(socket);
    await stopTestServer(instance);
    await cleanupRoots();
  }
});

test("a workspace without .govibe/rbac.json keeps the pre-RBAC posture (no silent break of unconfigured local dev)", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "govibe-sidecar-norbac-"));
  roots.push(root);
  const services = createStubServices();
  const instance = await startTestServer(createRuntime(services));
  try {
    const result = await postCommand(instance, { type: "workspace.scan", workspacePath: root, deep: false });
    assert.equal(result.status, 200);
    assert.equal(services.scanCalls.length, 1);
    assert.equal(services.scanCalls[0].actor, "sidecar-shared-token", "no client-declared actor falls back to an honest, non-impersonating label");
  } finally {
    await stopTestServer(instance);
    await cleanupRoots();
  }
});
