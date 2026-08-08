import { describe, expect, it } from "vitest";
import { RoadmapService, scoreApprovedSources } from "./roadmap-service.mjs";
import { RuntimeSnapshotStore, createRuntimeSnapshot } from "./snapshot-store.mjs";
import { TemporalOverlayStore } from "./temporal-overlay-store.mjs";

describe("roadmap service", () => {
  it("loads roadmap state without starting HTTP, WebSocket, stdio, or executors", async () => {
    const root = process.cwd();
    const service = new RoadmapService({
      snapshotStore: new RuntimeSnapshotStore(createRuntimeSnapshot()),
      temporalOverlayStore: new TemporalOverlayStore(),
      allowedRoadmapReadRoots: [`${root}/docs/roadmap`],
      allowedRoadmapWriteRoots: [`${root}/docs/roadmap`],
    });
    const sources = await service.discoverSources();
    expect(sources.length).toBeGreaterThan(0);
    await expect(service.reloadRoadmap()).resolves.toMatchObject({ approvalStatus: "approved" });
  });
});

// TASK-PRD-012 (GAP-10): a source with no authored updatedAt must not receive a
// recency bonus. Only an authored timestamp is a real freshness signal.
describe("scoreApprovedSources — recency scoring (TASK-PRD-012)", () => {
  const baseItem = (overrides) => ({
    path: overrides.path,
    approvalStatus: "approved",
    planningType: "roadmap",
    actionableDepthLabel: "phase-only",
    actionableDepthBonus: 0,
    taskCount: 0,
    ...overrides,
  });

  it("gives no recency bonus to a source with an undefined updatedAt", () => {
    const undated = baseItem({ path: "undated.md", updatedAt: undefined });
    const older = baseItem({ path: "older.md", updatedAt: "2026-01-01T00:00:00Z" });
    const newer = baseItem({ path: "newer.md", updatedAt: "2026-08-01T00:00:00Z" });
    const [scoredUndated, scoredOlder, scoredNewer] = scoreApprovedSources([undated, older, newer], undefined);

    expect(scoredUndated.scoreBreakdown).not.toContain("recent");
    expect(scoredNewer.scoreBreakdown).toContain("recent");
    expect(scoredUndated.score).toBeLessThan(scoredNewer.score);
    expect(scoredUndated.score).toBeLessThanOrEqual(scoredOlder.score);
  });

  it("does not let an undated source outscore an authored-recent one of equal weight", () => {
    // Regression shape for GAP-10: before the fix, an unauthored source's
    // updatedAt fell back to parse time (effectively "now"), which reads as the
    // newest item in the set and wins the recency bonus outright over a
    // genuinely old-but-authored plan.
    const undated = baseItem({ path: "undated.md", updatedAt: undefined });
    const oldAuthored = baseItem({ path: "old.md", updatedAt: "2026-01-01T00:00:00Z" });
    const newAuthored = baseItem({ path: "new.md", updatedAt: "2026-08-01T00:00:00Z" });
    const [scoredUndated, , scoredNew] = scoreApprovedSources([undated, oldAuthored, newAuthored], undefined);

    expect(scoredUndated.scoreBreakdown).not.toContain("recent");
    expect(scoredUndated.score).toBeLessThan(scoredNew.score);
  });
});
