import { describe, expect, it, vi } from "vitest";
import { AGENT_SESSION_BUFFER_CHARS, type AgentSessionRecord, type MissionMemoryHit } from "./domain";
import { MissionSnapshotStore } from "./snapshot-store";
import { emptyMissionSnapshot, mergeMissionSnapshot, reduceMissionEvent } from "./snapshot-reducer";

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

describe("orchestration snapshot slice (TASK-PRD-005)", () => {
  const orchestration = {
    waves: [{ id: "wave-0", index: 0, level: 0, status: "pending" as const, taskIds: ["TASK-PRD-005"], tasks: [{ taskId: "TASK-PRD-005", status: "queued" as const, attempts: 0 }], concurrency: 1 }],
    updatedAt: "2026-08-10T00:00:00.000Z",
  };

  it("has a required empty orchestration slice from first render", () => {
    expect(emptyMissionSnapshot.orchestration).toEqual({ waves: [], updatedAt: expect.any(String) });
  });

  it("reduces orchestration.update and preserves it through unrelated patches", () => {
    const updated = reduceMissionEvent(emptyMissionSnapshot, { type: "orchestration.update", orchestration });
    expect(updated.orchestration).toEqual(orchestration);
    expect(mergeMissionSnapshot(updated, { connectionState: "connected" }).orchestration).toEqual(orchestration);
  });
});

describe("agent session slice (GLS-001)", () => {
  const session: AgentSessionRecord = {
    id: "session-1", agentId: "claude-code", cwd: "G:/workspace", state: "running",
    accessScope: "H2", startedAt: "2026-08-17T00:00:00.000Z", buffer: "", exitCode: null,
  };

  it("has a real empty sessions slice from first render", () => {
    expect(emptyMissionSnapshot.sessions).toEqual([]);
  });

  it("reduces sessions.update and preserves the slice through unrelated patches", () => {
    const next = reduceMissionEvent(emptyMissionSnapshot, { type: "sessions.update", sessions: [session] });
    expect(next.sessions).toEqual([session]);
    expect(mergeMissionSnapshot(next, { connectionState: "connected" }).sessions).toEqual([session]);
  });

  it("appends agent.session.output to the matching session's buffer with the shared cap", () => {
    const withSession = reduceMissionEvent(emptyMissionSnapshot, { type: "sessions.update", sessions: [session] });
    const once = reduceMissionEvent(withSession, { type: "agent.session.output", sessionId: "session-1", data: "hello " });
    const twice = reduceMissionEvent(once, { type: "agent.session.output", sessionId: "session-1", data: "world" });
    expect(twice.sessions?.[0]?.buffer).toBe("hello world");

    const flooded = reduceMissionEvent(twice, { type: "agent.session.output", sessionId: "session-1", data: "x".repeat(AGENT_SESSION_BUFFER_CHARS + 100) });
    expect(flooded.sessions?.[0]?.buffer).toHaveLength(AGENT_SESSION_BUFFER_CHARS);
  });

  it("ignores output for unknown sessions without corrupting the slice", () => {
    const withSession = reduceMissionEvent(emptyMissionSnapshot, { type: "sessions.update", sessions: [session] });
    const next = reduceMissionEvent(withSession, { type: "agent.session.output", sessionId: "ghost", data: "boo" });
    expect(next.sessions).toEqual([session]);
  });
});

// WP-17 AC-06: covers the new memory.* event reduction AND the merge
// fallback -- specifically, a patch that omits the memory slice must not
// drop it. This is the assertion that proves Stage B (WP-18) will have data
// to render.
describe("memory snapshot slice (WP-17 AC-06)", () => {
  const hit: MissionMemoryHit = {
    entity: { entityId: "msp:entity/x", vaultId: "vault_a", category: "note", key: "k", bodyPreview: "{}", epistemicState: "confirmed", confidence: 0.9, lifecycleState: "active", decayScore: 1 },
    score: 0.9,
    matchedBy: ["fts"],
  };

  it("emptyMissionSnapshot's memory slice is a real empty object, never undefined", () => {
    expect(emptyMissionSnapshot.memory).toEqual({ results: [], selectedEntityId: null, lastQuery: null, lastSearchedAt: null, lastDecayResult: null });
  });

  it("reduces memory.search.result into memory.results/lastQuery/lastSearchedAt", () => {
    const next = reduceMissionEvent(emptyMissionSnapshot, {
      type: "memory.search.result",
      result: { query: "hello", vaultId: "vault_a", hits: [hit], layersUsed: ["fts"], vectorAvailable: false, searchMode: "fts_only", updatedAt: "2026-08-06T00:00:00Z" },
    });
    expect(next.memory).toEqual({ results: [hit], selectedEntityId: null, lastQuery: "hello", lastSearchedAt: "2026-08-06T00:00:00Z", lastDecayResult: null });
  });

  it("reduces memory.selection without disturbing existing search results", () => {
    const withResults = reduceMissionEvent(emptyMissionSnapshot, {
      type: "memory.search.result",
      result: { query: "hello", vaultId: "vault_a", hits: [hit], layersUsed: [], vectorAvailable: false, searchMode: "exact", updatedAt: "2026-08-06T00:00:00Z" },
    });
    const next = reduceMissionEvent(withResults, { type: "memory.selection", entityId: "msp:entity/x" });
    expect(next.memory?.selectedEntityId).toBe("msp:entity/x");
    expect(next.memory?.results).toEqual([hit]);
  });

  it("reduces memory.forgotten by removing the forgotten entity from results", () => {
    const withResults = reduceMissionEvent(emptyMissionSnapshot, {
      type: "memory.search.result",
      result: { query: "hello", vaultId: "vault_a", hits: [hit], layersUsed: [], vectorAvailable: false, searchMode: "exact", updatedAt: "2026-08-06T00:00:00Z" },
    });
    const next = reduceMissionEvent(withResults, { type: "memory.forgotten", entityId: "msp:entity/x", vaultId: "vault_a" });
    expect(next.memory?.results).toEqual([]);
  });

  it("reduces memory.decay.result into memory.lastDecayResult", () => {
    const next = reduceMissionEvent(emptyMissionSnapshot, {
      type: "memory.decay.result",
      result: { vaultId: "vault_a", evaluated: 3, transitioned: [{ entityId: "msp:entity/x", from: "active", to: "decayed" }], dryRun: false, updatedAt: "2026-08-06T00:00:00Z" },
    });
    expect(next.memory?.lastDecayResult).toEqual({ vaultId: "vault_a", evaluated: 3, transitioned: [{ entityId: "msp:entity/x", from: "active", to: "decayed" }], dryRun: false, updatedAt: "2026-08-06T00:00:00Z" });
  });

  it("mergeMissionSnapshot: a patch that omits the memory slice does not drop it (the merge-fallback assertion Stage B depends on)", () => {
    const withMemory = reduceMissionEvent(emptyMissionSnapshot, {
      type: "memory.search.result",
      result: { query: "hello", vaultId: "vault_a", hits: [hit], layersUsed: [], vectorAvailable: false, searchMode: "exact", updatedAt: "2026-08-06T00:00:00Z" },
    });
    const merged = mergeMissionSnapshot(withMemory, { connectionState: "connected" });
    expect(merged.memory).toEqual(withMemory.memory);
    expect(merged.memory?.results).toEqual([hit]);
  });
});
