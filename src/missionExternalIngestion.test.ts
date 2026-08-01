import { describe, expect, it } from "vitest";
import { ingestExternalMissionEvent, missionGateway as legacyGateway } from "./mission";
import { ingestReliableExternalMissionEvent, missionGateway as reliableGateway } from "./missionGateway";

describe("browser external MissionEvent ingestion", () => {
  it("rejects invalid payloads before either gateway mutates state", () => {
    const invalid = { type: "metrics.update", metrics: [], trusted: true };
    const legacyBefore = legacyGateway.getSnapshot();
    const reliableBefore = reliableGateway.getSnapshot();

    expect(ingestExternalMissionEvent(invalid)).toBe(false);
    expect(ingestReliableExternalMissionEvent(invalid)).toBe(false);
    expect(legacyGateway.getSnapshot()).toBe(legacyBefore);
    expect(reliableGateway.getSnapshot()).toBe(reliableBefore);
  });

  it("accepts a valid shared-protocol event in both gateways", () => {
    const valid = { type: "metrics.update", metrics: [] };

    expect(ingestExternalMissionEvent(valid)).toBe(true);
    expect(ingestReliableExternalMissionEvent(valid)).toBe(true);
    expect(legacyGateway.getSnapshot().metrics).toEqual([]);
    expect(reliableGateway.getSnapshot().metrics).toEqual([]);
  });
});
