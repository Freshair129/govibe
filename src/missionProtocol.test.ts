import { describe, expect, it } from "vitest";
import {
  MISSION_PROTOCOL_COMPATIBILITY,
  MISSION_PROTOCOL_VERSION,
  createCommandResponse,
  isCommandResponse,
  isMissionCommand,
  isMissionEvent,
  isMissionSnapshot,
} from "../packages/mission-protocol/index.js";

const snapshotFixture = {
  connectionState: "connected",
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
