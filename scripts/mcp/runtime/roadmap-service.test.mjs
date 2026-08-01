import { describe, expect, it } from "vitest";
import { RoadmapService } from "./roadmap-service.mjs";
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
