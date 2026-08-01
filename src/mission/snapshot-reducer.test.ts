import { describe, expect, it, vi } from "vitest";
import { MissionSnapshotStore } from "./snapshot-store";
import { emptyMissionSnapshot, reduceMissionEvent } from "./snapshot-reducer";

describe("mission snapshot ownership", () => {
  it("reduces domain events without I/O", () => {
    const next = reduceMissionEvent(emptyMissionSnapshot, { type: "metrics.update", metrics: [{ label: "CPU", value: "10%" }] });
    expect(next.metrics).toEqual([{ label: "CPU", value: "10%" }]);
    expect(emptyMissionSnapshot.metrics).toEqual([]);
  });

  it("publishes all mutation through the explicit store", () => {
    const store = new MissionSnapshotStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.apply({ type: "agents.update", agents: [] });
    store.patch({ connectionState: "connected" });
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(3);
    expect(store.getSnapshot().connectionState).toBe("connected");
  });
});
