import { describe, expect, it, vi } from "vitest";
import { createRuntimeSnapshot, RuntimeSnapshotStore } from "./snapshot-store.mjs";

describe("runtime snapshot store", () => {
  it("is the explicit snapshot and event publication owner", () => {
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const listener = vi.fn();
    store.subscribe(listener);
    store.patch({ agents: [{ id: "a" }] });
    store.appendTerminal("sys", "ready");
    expect(store.getSnapshot().agents).toEqual([{ id: "a" }]);
    expect(store.getSnapshot().terminal[0].text).toBe("ready");
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: "terminal.line" }));
  });
});
