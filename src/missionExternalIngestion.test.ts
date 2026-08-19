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

  // TASK-PRD-021 (AUD-24): a value ingested through this generic external entrypoint must
  // carry a provenance marker distinguishing it from sidecar-delivered state once it merges
  // into the snapshot.
  it("marks a generically-ingested event with non-sidecar provenance by default", () => {
    const valid = { type: "metrics.update", metrics: [] };

    ingestReliableExternalMissionEvent(valid);

    expect(reliableGateway.getSnapshot().lastIngest?.source).toBe("external-postmessage");
    expect(reliableGateway.getSnapshot().lastIngest?.source).not.toBe("sidecar");
  });
});
