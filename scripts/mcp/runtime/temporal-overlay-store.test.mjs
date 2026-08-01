import { describe, expect, it } from "vitest";
import { TemporalOverlayStore } from "./temporal-overlay-store.mjs";

describe("temporal overlay store", () => {
  it("supersedes prior records and returns the latest visible value", () => {
    const store = new TemporalOverlayStore();
    store.record("nodes", "task-1", { id: "task-1", version: "1.0.0", recordedAt: "2026-01-01T00:00:00Z" });
    store.record("nodes", "task-1", { id: "task-1", version: "1.1.0", recordedAt: "2026-02-01T00:00:00Z" });
    expect(store.getHistory("nodes", "task-1")[0].supersededAt).toBe("2026-02-01T00:00:00Z");
    expect(store.active("nodes", (node) => node.id)).toMatchObject([{ version: "1.1.0" }]);
  });
});
