import { describe, expect, it } from "vitest";
import {
  MISSION_PROTOCOL_COMPATIBILITY,
  MISSION_PROTOCOL_LIMITS,
  MISSION_PROTOCOL_VERSION,
  createCommandResponse,
  isCommandResponse,
  isMissionCommand,
  isMissionEvent,
  isMissionSnapshot,
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
