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
  workflowRuns: [],
  orchestrationState: { activeRunId: null },
};

describe("mission protocol v1", () => {
  it("publishes an explicit semantic and compatibility version", () => {
    expect(MISSION_PROTOCOL_VERSION).toBe("1.0.0");
    expect(MISSION_PROTOCOL_COMPATIBILITY).toBe(1);
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
      { type: "workflow.run", run: { runId: "run-1" } },
      { type: "command.ack", commandId: "cmd-1", ok: true },
    ];
    expect(events.every(isMissionEvent)).toBe(true);
  });

  it("rejects unknown fields, wrong types, and unknown discriminators", () => {
    expect(isMissionCommand({ type: "agent.select", agentId: "agent-1", admin: true })).toBe(false);
    expect(isMissionCommand({ type: "workspace.scan", workspacePath: "C:/workspace", deep: "yes" })).toBe(false);
    expect(isMissionCommand({ type: "unknown.command" })).toBe(false);
    expect(isMissionEvent({ type: "metrics.update", metrics: [], trusted: true })).toBe(false);
    expect(isMissionEvent({ type: "command.ack", commandId: 1, ok: true })).toBe(false);
    expect(isMissionEvent({ type: "unknown.event" })).toBe(false);
  });

  it("enforces documented string, path, array, metadata, and file limits", () => {
    expect(isMissionCommand({ type: "terminal.command", command: "x".repeat(MISSION_PROTOCOL_LIMITS.commandChars + 1) })).toBe(false);
    expect(isMissionCommand({ type: "roadmap.select", sourcePath: "x".repeat(MISSION_PROTOCOL_LIMITS.pathChars + 1) })).toBe(false);
    expect(isMissionEvent({ type: "metrics.update", metrics: Array(MISSION_PROTOCOL_LIMITS.arrayItems + 1).fill(null) })).toBe(false);
    expect(isMissionCommand({ type: "file.save", hash: "hash", data: [256], meta: {} })).toBe(false);
    expect(isMissionCommand({ type: "file.save", hash: "hash", data: [], meta: { payload: "x".repeat(MISSION_PROTOCOL_LIMITS.metadataBytes) } })).toBe(false);
    expect(isMissionCommand({ type: "file.save", hash: "hash", data: new ArrayBuffer(MISSION_PROTOCOL_LIMITS.fileBytes + 1), meta: {} })).toBe(false);
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
      protocolVersion: "1.0.0",
      compatibilityVersion: 1,
      commandId: "cmd-1",
      ok: true,
    });
  });

  it("fails contract validation for a breaking compatibility version", () => {
    const response = createCommandResponse({ commandId: "cmd-1", ok: true });
    expect(isCommandResponse({ ...response, compatibilityVersion: 2 })).toBe(false);
  });
});
