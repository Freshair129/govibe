// AC-02 (WP-17): scripts/mcp/msp-memory-contracts.mjs rejects a
// gks:-namespaced reference in any response field, proven with a fake
// client returning one -- mirrors the "fake client" test convention already
// used for msp-vault-context-contracts.mjs's own promoteMemory guard.
import { describe, expect, it } from "vitest";

import { createTypedMemoryMsp } from "./msp-memory-contracts.mjs";

function fakeClient(responses) {
  return {
    async call(name, input) {
      const handler = responses[name];
      if (!handler) throw new Error(`Unexpected MSP call: ${name}`);
      return typeof handler === "function" ? handler(input) : handler;
    },
  };
}

describe("scripts/mcp/msp-memory-contracts (AC-02)", () => {
  it("throws when createTypedMemoryMsp is given no client", () => {
    expect(() => createTypedMemoryMsp(undefined)).toThrow(/unavailable/i);
  });

  it("searchMemory rejects a gks:-namespaced reference nested anywhere in the response", async () => {
    const typed = createTypedMemoryMsp(
      fakeClient({
        msp_memory_search: () => ({
          hits: [{ entity: { entity_id: "msp:entity/x", category: "note", key: "k", canonical_source: "gks:atom/abc123" }, score: 1, matched_by: ["exact"] }],
          layers_used: ["exact"],
          vector_available: false,
          searchMode: "exact",
        }),
      }),
    );
    await expect(typed.searchMemory({ vaultId: "vault_a", query: "k" })).rejects.toThrow(/gks:-namespaced/i);
  });

  it("searchMemory passes through a clean response unmodified", async () => {
    const typed = createTypedMemoryMsp(
      fakeClient({
        msp_memory_search: (input) => {
          expect(input).toEqual({ vault_id: "vault_a", query: "hello", mode: "hybrid", limit: undefined });
          return {
            hits: [{ entity: { entity_id: "msp:entity/x", category: "note", key: "k" }, score: 0.9, matched_by: ["fts"] }],
            layers_used: ["fts"],
            vector_available: false,
            searchMode: "fts_only",
          };
        },
      }),
    );
    const result = await typed.searchMemory({ vaultId: "vault_a", query: "hello" });
    expect(result.hits).toHaveLength(1);
    expect(result.searchMode).toBe("fts_only");
    expect(result.vectorAvailable).toBe(false);
  });

  it("forgetMemory rejects a gks:-namespaced reference in the returned entity", async () => {
    const typed = createTypedMemoryMsp(
      fakeClient({
        msp_memory_forget: () => ({
          entity: { entity_id: "msp:entity/x", lifecycle_state: "forgotten", provenance: "GKS:atom/uppercase-prefix" },
        }),
      }),
    );
    await expect(typed.forgetMemory({ entityId: "msp:entity/x", reason: "gdpr" })).rejects.toThrow(/gks:-namespaced/i);
  });

  it("forgetMemory rejects a response that does not report lifecycle_state: forgotten", async () => {
    const typed = createTypedMemoryMsp(
      fakeClient({
        msp_memory_forget: () => ({ entity: { entity_id: "msp:entity/x", lifecycle_state: "active" } }),
      }),
    );
    await expect(typed.forgetMemory({ entityId: "msp:entity/x", reason: "gdpr" })).rejects.toThrow(/forgotten/i);
  });

  it("runDecayTick rejects a gks:-namespaced reference inside a transitioned entry", async () => {
    const typed = createTypedMemoryMsp(
      fakeClient({
        msp_memory_decay_tick: () => ({
          evaluated: 1,
          transitioned: [{ entity_id: "gks:atom/should-never-appear-here", from: "active", to: "decayed" }],
          dry_run: false,
        }),
      }),
    );
    await expect(typed.runDecayTick({ vaultId: "vault_a", dryRun: false })).rejects.toThrow(/gks:-namespaced/i);
  });

  it("runDecayTick passes through a clean response unmodified", async () => {
    const typed = createTypedMemoryMsp(
      fakeClient({
        msp_memory_decay_tick: (input) => {
          expect(input).toEqual({ vault_id: "vault_a", dry_run: true });
          return { evaluated: 3, transitioned: [{ entity_id: "msp:entity/x", from: "active", to: "decayed" }], dry_run: true };
        },
      }),
    );
    const result = await typed.runDecayTick({ vaultId: "vault_a", dryRun: true });
    expect(result).toEqual({ evaluated: 3, transitioned: [{ entity_id: "msp:entity/x", from: "active", to: "decayed" }], dryRun: true });
  });
});
