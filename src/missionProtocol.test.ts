import { describe, expect, it } from "vitest";
import {
  IDEMPOTENT_RETRY_COMMAND_TYPES,
  MISSION_PROTOCOL_COMPATIBILITY,
  MISSION_PROTOCOL_LIMITS,
  MISSION_PROTOCOL_VERSION,
  createCommandDedupWindow,
  createCommandResponse,
  isCommandResponse,
  isMissionCommand,
  isMissionEvent,
  isMissionSnapshot,
  isMutatingMissionCommandType,
} from "../packages/mission-protocol/index.js";

const snapshotFixture = {
  connectionState: "connected" as const,
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
  orchestration: { waves: [], updatedAt: "2026-08-10T00:00:00.000Z" },
  workflowRuns: [],
};

describe("mission protocol v2", () => {
  it("publishes an explicit semantic and compatibility version", () => {
    expect(MISSION_PROTOCOL_VERSION).toBe("2.0.0");
    expect(MISSION_PROTOCOL_COMPATIBILITY).toBe(2);
  });

  it("validates the shared snapshot fixture and allows unknown optional fields", () => {
    expect(isMissionSnapshot(snapshotFixture)).toBe(true);
  });

  it("rejects snapshots missing required compatibility fields", () => {
    const { graph: _graph, ...breakingSnapshot } = snapshotFixture;
    expect(isMissionSnapshot(breakingSnapshot)).toBe(false);
  });

  it("validates command and event discriminators", () => {
    expect(isMissionCommand({ type: "terminal.command", command: "status" })).toBe(true);
    expect(isMissionCommand({ type: "terminal.command" })).toBe(false);
    expect(isMissionEvent({ type: "command.ack", commandId: "cmd-1", ok: true })).toBe(true);
    expect(isMissionEvent({ type: "command.ack", ok: true })).toBe(false);
  });

  it("validates every current MissionCommand variant", () => {
    const commands = [
      { type: "terminal.command", command: "status" },
      { type: "agent.select", agentId: "agent-1" },
      { type: "roadmap.select", sourcePath: "docs/roadmap/ROADMAP.md" },
      { type: "masterplan.preview", sourcePath: "docs/roadmap/MASTERPLAN.md" },
      { type: "workspace.scan", workspacePath: "C:/workspace", deep: true, runId: "run-1" },
      { type: "reactor.run", profile: "safe" },
      { type: "file.save", hash: "a".repeat(64), data: [0, 127, 255], meta: { name: "proof.bin" } },
      { type: "memory.search", vaultId: "vault_a", query: "hello" },
      { type: "memory.search", vaultId: "vault_a", query: "hello", mode: "fts", limit: 10 },
      { type: "memory.select", entityId: "msp:entity/x" },
      { type: "memory.select", entityId: null },
      { type: "memory.forget", entityId: "msp:entity/x", reason: "gdpr" },
      { type: "memory.decay.run", vaultId: "vault_a" },
      { type: "memory.decay.run", vaultId: "vault_a", dryRun: true },
      { type: "agent.session.start", agent: "claude-code", cwd: "G:/workspace", accessScope: "H2" },
      { type: "agent.session.start", agent: "claude-code", cwd: "G:/workspace", accessScope: "H4", approvalRef: "adr-029", cols: 120, rows: 32 },
      { type: "agent.session.input", sessionId: "session-1", data: "ls\r" },
      { type: "agent.session.stop", sessionId: "session-1" },
      { type: "agent.session.resize", sessionId: "session-1", cols: 120, rows: 32 },
      { type: "workflow.node.action", taskId: "task-1", action: "approve", actor: "Boss" },
      { type: "workflow.node.action", taskId: "task-1", action: "assign", actor: "Boss", assigneeId: "VIBE" },
      { type: "workflow.node.action", taskId: "task-1", action: "rerun", actor: "Boss", approvalRef: "adr-021" },
    ];
    expect(commands.every(isMissionCommand)).toBe(true);
  });

  it("validates every current MissionEvent variant", () => {
    const events = [
      { type: "snapshot", snapshot: { connectionState: "connected" } },
      { type: "terminal.line", line: { id: "line-1" } },
      { type: "metrics.update", metrics: [] },
      { type: "chart.update", chart: {} },
      { type: "agents.update", agents: [] },
      { type: "graph.update", graph: {} },
      { type: "heatmap.update", heatmap: {} },
      { type: "roadmap.snapshot", roadmap: {} },
      { type: "dag.update", dag: {} },
      { type: "dag.update", dag: { nodes: {}, edges: [] } },
      { type: "roadmap.node.update", node: { id: "node-1" } },
      { type: "roadmap.assignment", assignment: { taskId: "task-1" } },
      { type: "roadmap.handoff", handoff: { taskId: "task-1" } },
      { type: "roadmap.verification", verification: { taskId: "task-1" } },
      { type: "orchestration.update", orchestration: { waves: [], updatedAt: "2026-08-10T00:00:00.000Z" } },
      { type: "workflow.run", run: { runId: "run-1" } },
      { type: "memory.search.result", result: { query: "hello", vaultId: "vault_a", hits: [] } },
      { type: "memory.selection", entityId: "msp:entity/x" },
      { type: "memory.selection", entityId: null },
      { type: "memory.forgotten", entityId: "msp:entity/x", vaultId: "vault_a" },
      { type: "memory.decay.result", result: { vaultId: "vault_a", evaluated: 0, transitioned: [] } },
      { type: "sessions.update", sessions: [] },
      { type: "sessions.update", sessions: [{ id: "session-1", agentId: "claude-code", cwd: "G:/workspace", state: "running", accessScope: "H2", startedAt: "2026-08-17T00:00:00.000Z", buffer: "" }] },
      { type: "agent.session.output", sessionId: "session-1", data: "hello" },
      { type: "workflow.node.audit", entry: { id: "audit-1", actor: "Boss", taskId: "task-1", action: "approve", at: "2026-08-17T00:00:00.000Z" } },
      { type: "workflow.node.audit", entry: { id: "audit-2", actor: "Boss", taskId: "task-1", action: "rerun", at: "2026-08-17T00:00:00.000Z", approvalRef: "adr-021" } },
      { type: "command.ack", commandId: "cmd-1", ok: true },
    ];
    expect(events.every(isMissionEvent)).toBe(true);
  });

  it("rejects unknown fields, wrong types, and unknown discriminators", () => {
    expect(isMissionCommand({ type: "agent.select", agentId: "agent-1", admin: true })).toBe(false);
    expect(isMissionCommand({ type: "workspace.scan", workspacePath: "C:/workspace", deep: "yes" })).toBe(false);
    expect(isMissionCommand({ type: "unknown.command" })).toBe(false);
    expect(isMissionEvent({ type: "metrics.update", metrics: [], trusted: true })).toBe(false);
    expect(isMissionEvent({ type: "orchestration.update", orchestration: { waves: [], updatedAt: "2026-08-10T00:00:00.000Z" }, trusted: true })).toBe(false);
    expect(isMissionEvent({ type: "orchestration.update", orchestration: { waves: [{ id: "wave-0" }], updatedAt: "2026-08-10T00:00:00.000Z" } })).toBe(false);
    expect(isMissionEvent({ type: "command.ack", commandId: 1, ok: true })).toBe(false);
    expect(isMissionEvent({ type: "unknown.event" })).toBe(false);
    // dag.update: rejects unknown fields and a non-record dag payload,
    // matching every other bounded-record discriminator.
    expect(isMissionEvent({ type: "dag.update", dag: {}, trusted: true })).toBe(false);
    expect(isMissionEvent({ type: "dag.update", dag: "not-a-record" })).toBe(false);
    expect(isMissionEvent({ type: "dag.update" })).toBe(false);
    // WP-17: memory.* commands/events reject unknown fields, missing
    // required fields, and wrong types, matching every other discriminator.
    expect(isMissionCommand({ type: "memory.search", vaultId: "vault_a", query: "hello", admin: true })).toBe(false);
    expect(isMissionCommand({ type: "memory.search", vaultId: "vault_a" })).toBe(false);
    expect(isMissionCommand({ type: "memory.search", vaultId: "vault_a", query: "hello", mode: "not-a-mode" })).toBe(false);
    expect(isMissionCommand({ type: "memory.forget", entityId: "msp:entity/x" })).toBe(false);
    expect(isMissionCommand({ type: "memory.decay.run", vaultId: "vault_a", dryRun: "yes" })).toBe(false);
    expect(isMissionEvent({ type: "memory.search.result", result: { query: "hello" }, trusted: true })).toBe(false);
    expect(isMissionEvent({ type: "memory.forgotten", entityId: "msp:entity/x" })).toBe(false);
    // GLS-001: agent.session.* discriminators enforce the allowlisted key sets,
    // the H0..H4 scope vocabulary, and session-record field boundaries.
    expect(isMissionCommand({ type: "agent.session.start", agent: "claude-code", cwd: "G:/workspace", accessScope: "H9" })).toBe(false);
    expect(isMissionCommand({ type: "agent.session.start", agent: "claude-code", cwd: "G:/workspace", accessScope: "H2", command: "rm -rf" })).toBe(false);
    expect(isMissionCommand({ type: "agent.session.input", sessionId: "session-1" })).toBe(false);
    expect(isMissionCommand({ type: "agent.session.resize", sessionId: "session-1", cols: 0, rows: 32 })).toBe(false);
    // GLS-003: workflow.node.action enforces the approve/rerun/assign vocabulary
    // and rejects unknown fields; workflow.node.audit requires a well-formed entry.
    expect(isMissionCommand({ type: "workflow.node.action", taskId: "task-1", action: "delete", actor: "Boss" })).toBe(false);
    expect(isMissionCommand({ type: "workflow.node.action", taskId: "task-1", action: "approve" })).toBe(false);
    expect(isMissionCommand({ type: "workflow.node.action", taskId: "task-1", action: "approve", actor: "Boss", admin: true })).toBe(false);
    expect(isMissionEvent({ type: "workflow.node.audit", entry: { actor: "Boss", taskId: "task-1", action: "approve", at: "t" } })).toBe(false);
    expect(isMissionEvent({ type: "workflow.node.audit", entry: { id: "a1", actor: "Boss", taskId: "task-1", action: "nuke", at: "t" } })).toBe(false);
    expect(isMissionEvent({ type: "sessions.update", sessions: [{ id: "session-1" }] })).toBe(false);
    expect(isMissionEvent({ type: "agent.session.output", sessionId: "session-1", data: "x", trusted: true })).toBe(false);
    expect(isMissionEvent({ type: "agent.session.output", sessionId: "session-1", data: "x".repeat(MISSION_PROTOCOL_LIMITS.commandChars + 1) })).toBe(false);
  });

  it("enforces documented string, path, array, metadata, and file limits", () => {
    expect(isMissionCommand({ type: "terminal.command", command: "x".repeat(MISSION_PROTOCOL_LIMITS.commandChars + 1) })).toBe(false);
    expect(isMissionCommand({ type: "roadmap.select", sourcePath: "x".repeat(MISSION_PROTOCOL_LIMITS.pathChars + 1) })).toBe(false);
    expect(isMissionEvent({ type: "metrics.update", metrics: Array(MISSION_PROTOCOL_LIMITS.arrayItems + 1).fill(null) })).toBe(false);
    expect(isMissionCommand({ type: "file.save", hash: "hash", data: [256], meta: {} })).toBe(false);
    expect(isMissionCommand({ type: "file.save", hash: "hash", data: [], meta: { payload: "x".repeat(MISSION_PROTOCOL_LIMITS.metadataBytes) } })).toBe(false);
    expect(isMissionCommand({ type: "file.save", hash: "hash", data: new ArrayBuffer(MISSION_PROTOCOL_LIMITS.fileBytes + 1), meta: {} })).toBe(false);
    // WP-17 AC-05: an oversized memory.search.result event is rejected by
    // the same generic isBoundedJson(eventBytes) check every event goes
    // through -- proving the gate itself would catch a cap that somehow
    // slipped past scripts/mcp/runtime/memory-service.mjs's own server-side
    // truncation, not relying on that service alone.
    expect(
      isMissionEvent({
        type: "memory.search.result",
        result: { query: "q", vaultId: "vault_a", hits: [{ entity: { bodyPreview: "x".repeat(MISSION_PROTOCOL_LIMITS.eventBytes) } }] },
      }),
    ).toBe(false);
    expect(isMissionCommand({ type: "memory.search", vaultId: "vault_a", query: "x".repeat(MISSION_PROTOCOL_LIMITS.commandChars + 1) })).toBe(false);
  });

  it("creates and validates correlated command response envelopes", () => {
    const response = createCommandResponse({
      commandId: "cmd-1",
      ok: true,
      snapshot: snapshotFixture,
      result: { accepted: true },
    });
    expect(isCommandResponse(response)).toBe(true);
    expect(response).toMatchObject({
      protocolVersion: "2.0.0",
      compatibilityVersion: 2,
      commandId: "cmd-1",
      ok: true,
    });
  });

  it("fails contract validation for a breaking compatibility version", () => {
    const response = createCommandResponse({ commandId: "cmd-1", ok: true });
    expect(isCommandResponse({ ...response, compatibilityVersion: 3 })).toBe(false);
  });
});

// TASK-PRD-033 (AUD-18): the shared mutating/idempotent-retry command classification and the
// bounded dedup window both sides of the wire (src/mission/gateway.ts and
// scripts/mcp/sidecar-server.mjs) read from this module.
describe("mission protocol v2 — command idempotency classification (TASK-PRD-033)", () => {
  it("classifies exactly the frontend gateway's retry-safe set as non-mutating", () => {
    expect([...IDEMPOTENT_RETRY_COMMAND_TYPES].sort()).toEqual(["agent.select", "masterplan.preview", "roadmap.select"]);
    for (const type of IDEMPOTENT_RETRY_COMMAND_TYPES) {
      expect(isMutatingMissionCommandType(type)).toBe(false);
    }
  });

  it("classifies workflow.node.action and every other command type as mutating", () => {
    expect(isMutatingMissionCommandType("workflow.node.action")).toBe(true);
    expect(isMutatingMissionCommandType("terminal.command")).toBe(true);
    expect(isMutatingMissionCommandType("memory.forget")).toBe(true);
    expect(isMutatingMissionCommandType("agent.session.start")).toBe(true);
  });

  it("treats an unknown/empty type as mutating (fail closed: dedup by default, never silently skip it)", () => {
    expect(isMutatingMissionCommandType("")).toBe(true);
    expect(isMutatingMissionCommandType("some.unknown.type")).toBe(true);
  });
});

describe("createCommandDedupWindow (TASK-PRD-033)", () => {
  it("returns the cached value for a known commandId without needing to be told it happened again", () => {
    const window = createCommandDedupWindow();
    expect(window.has("cmd-1")).toBe(false);
    window.set("cmd-1", { ok: true });
    expect(window.has("cmd-1")).toBe(true);
    expect(window.get("cmd-1")).toEqual({ ok: true });
    expect(window.get("missing")).toBeUndefined();
  });

  it("evicts the least-recently-used entry once maxEntries is exceeded", () => {
    const window = createCommandDedupWindow({ maxEntries: 2 });
    window.set("a", 1);
    window.set("b", 2);
    window.set("c", 3); // evicts "a"
    expect(window.has("a")).toBe(false);
    expect(window.size).toBe(2);
    expect(window.get("b")).toBe(2);
    expect(window.get("c")).toBe(3);
  });

  it("get() bumps recency, so a recently-read entry survives eviction over an untouched one", () => {
    const window = createCommandDedupWindow({ maxEntries: 2 });
    window.set("a", 1);
    window.set("b", 2);
    window.get("a"); // "a" is now more recent than "b"
    window.set("c", 3); // evicts "b", not "a"
    expect(window.has("a")).toBe(true);
    expect(window.has("b")).toBe(false);
  });

  it("rejects a non-positive-integer maxEntries", () => {
    expect(() => createCommandDedupWindow({ maxEntries: 0 })).toThrow(TypeError);
    expect(() => createCommandDedupWindow({ maxEntries: -1 })).toThrow(TypeError);
    expect(() => createCommandDedupWindow({ maxEntries: 1.5 })).toThrow(TypeError);
  });
});
