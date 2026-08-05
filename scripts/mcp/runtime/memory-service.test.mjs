// WP-17 Bounded Scope item 3: MemoryService (govibe.memory.*) round-trips
// through a fake MSP client, proving the search/select/forget/decay.run
// chain patches the snapshot and emits the documented event shapes.
// Includes the server-side result-count/body-preview caps (AC-05) and an
// end-to-end pass through GovibeRuntime.handleMissionCommand (mirroring
// runtime-core.test.mjs's workspace.scan integration-style coverage).
import { describe, expect, it } from "vitest";

import { MspClient } from "../../../packages/govibe-core/src/index.mjs";
import { GovibeRuntime } from "../runtime-core.mjs";
import { RuntimeSnapshotStore, createRuntimeSnapshot } from "./snapshot-store.mjs";
import { MemoryService } from "./memory-service.mjs";

function fakeMspClient(handlers) {
  return new MspClient(async (name, input) => {
    const handler = handlers[name];
    if (!handler) throw new Error(`Unexpected MSP call: ${name}`);
    return typeof handler === "function" ? handler(input) : handler;
  });
}

function freshService(handlers) {
  const snapshotStore = new RuntimeSnapshotStore(createRuntimeSnapshot());
  const service = new MemoryService({ snapshotStore, mspClient: fakeMspClient(handlers) });
  const events = [];
  snapshotStore.subscribe((event) => events.push(event));
  return { service, snapshotStore, events };
}

describe("MemoryService.search", () => {
  it("patches memory.results and emits memory.search.result with the documented shape", async () => {
    const { service, snapshotStore, events } = freshService({
      msp_memory_search: (input) => {
        expect(input).toEqual({ vault_id: "vault_a", query: "hello", mode: "hybrid", limit: undefined });
        return {
          hits: [{ entity: { entity_id: "msp:entity/x", vault_id: "vault_a", category: "note", key: "k", body_json: { text: "hi" }, epistemic_state: "confirmed", confidence: 0.9, lifecycle_state: "active", decay_score: 1 }, score: 0.9, matched_by: ["fts"] }],
          layers_used: ["fts"],
          vector_available: false,
          searchMode: "fts_only",
        };
      },
    });

    const result = await service.search({ vault_id: "vault_a", query: "hello" });

    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].entity).toMatchObject({ entityId: "msp:entity/x", vaultId: "vault_a", category: "note", key: "k" });
    expect(result.hits[0].entity.bodyPreview).toBe(JSON.stringify({ text: "hi" }));
    expect(result.searchMode).toBe("fts_only");

    expect(snapshotStore.getSnapshot().memory.results).toHaveLength(1);
    expect(snapshotStore.getSnapshot().memory.lastQuery).toBe("hello");
    expect(events.some((event) => event.type === "memory.search.result" && event.result.query === "hello")).toBe(true);
  });

  it("caps result hits at 20 and truncates each body preview to 500 chars (AC-05, server-side)", async () => {
    const manyHits = Array.from({ length: 30 }, (_, index) => ({
      entity: { entity_id: `msp:entity/${index}`, vault_id: "vault_a", category: "note", key: `k${index}`, body_json: { text: "x".repeat(2000) } },
      score: 1,
      matched_by: ["fts"],
    }));
    const { service } = freshService({
      msp_memory_search: () => ({ hits: manyHits, layers_used: ["fts"], vector_available: false, searchMode: "fts_only" }),
    });

    const result = await service.search({ vault_id: "vault_a", query: "big" });

    expect(result.hits).toHaveLength(20);
    for (const hit of result.hits) {
      expect(hit.entity.bodyPreview.length).toBeLessThanOrEqual(500);
    }
    // Sanity bound: serialized event must be nowhere near the 1MB eventBytes limit.
    expect(JSON.stringify({ type: "memory.search.result", result }).length).toBeLessThan(50_000);
  });
});

describe("MemoryService.select", () => {
  it("updates selectedEntityId and emits memory.selection without calling MSP", () => {
    const { service, snapshotStore, events } = freshService({});
    const result = service.select({ entity_id: "msp:entity/x" });
    expect(result).toEqual({ selectedEntityId: "msp:entity/x" });
    expect(snapshotStore.getSnapshot().memory.selectedEntityId).toBe("msp:entity/x");
    expect(events).toEqual([{ type: "memory.selection", entityId: "msp:entity/x" }]);
  });

  it("accepts null to clear a selection", () => {
    const { service, snapshotStore } = freshService({});
    service.select({ entity_id: "msp:entity/x" });
    service.select({});
    expect(snapshotStore.getSnapshot().memory.selectedEntityId).toBeNull();
  });
});

describe("MemoryService.forget", () => {
  it("removes the forgotten entity from results and emits memory.forgotten", async () => {
    const { service, snapshotStore, events } = freshService({
      msp_memory_search: () => ({
        hits: [{ entity: { entity_id: "msp:entity/x", vault_id: "vault_a", category: "note", key: "k", body_json: {} }, score: 1, matched_by: ["fts"] }],
        layers_used: ["fts"], vector_available: false, searchMode: "fts_only",
      }),
      msp_memory_forget: (input) => {
        expect(input).toEqual({ entity_id: "msp:entity/x", reason: "gdpr" });
        return { entity: { entity_id: "msp:entity/x", vault_id: "vault_a", lifecycle_state: "forgotten" } };
      },
    });

    await service.search({ vault_id: "vault_a", query: "k" });
    expect(snapshotStore.getSnapshot().memory.results).toHaveLength(1);

    const result = await service.forget({ entity_id: "msp:entity/x", reason: "gdpr" });
    expect(result.entity.lifecycle_state).toBe("forgotten");
    expect(snapshotStore.getSnapshot().memory.results).toHaveLength(0);
    expect(events.some((event) => event.type === "memory.forgotten" && event.entityId === "msp:entity/x")).toBe(true);
  });
});

describe("MemoryService.decayRun", () => {
  it("patches lastDecayResult and emits memory.decay.result", async () => {
    const { service, snapshotStore, events } = freshService({
      msp_memory_decay_tick: (input) => {
        expect(input).toEqual({ vault_id: "vault_a", dry_run: true });
        return { evaluated: 5, transitioned: [{ entity_id: "msp:entity/x", from: "active", to: "decayed" }], dry_run: true };
      },
    });

    const result = await service.decayRun({ vault_id: "vault_a", dry_run: true });
    expect(result).toMatchObject({ vaultId: "vault_a", evaluated: 5, dryRun: true, transitioned: [{ entityId: "msp:entity/x", from: "active", to: "decayed" }] });
    expect(snapshotStore.getSnapshot().memory.lastDecayResult).toMatchObject({ evaluated: 5 });
    expect(events.some((event) => event.type === "memory.decay.result")).toBe(true);
  });
});

describe("GovibeRuntime.handleMissionCommand memory.* (end-to-end router wiring)", () => {
  it("routes memory.search through the command router to MemoryService and back", async () => {
    const runtime = new GovibeRuntime({
      mspClient: fakeMspClient({
        msp_memory_search: () => ({ hits: [], layers_used: [], vector_available: false, searchMode: "fts_only" }),
      }),
    });

    const response = await runtime.handleMissionCommand({ type: "memory.search", vaultId: "vault_a", query: "hello" });
    expect(response).toMatchObject({ ok: true, action: "memory.search" });
    expect(response.result.query).toBe("hello");
    expect(response.snapshot.memory.lastQuery).toBe("hello");
  });

  it("routes memory.decay.run through the command router", async () => {
    const runtime = new GovibeRuntime({
      mspClient: fakeMspClient({
        msp_memory_decay_tick: () => ({ evaluated: 0, transitioned: [], dry_run: true }),
      }),
    });

    const response = await runtime.handleMissionCommand({ type: "memory.decay.run", vaultId: "vault_a", dryRun: true });
    expect(response).toMatchObject({ ok: true, action: "memory.decay.run" });
    expect(response.result.dryRun).toBe(true);
  });
});
