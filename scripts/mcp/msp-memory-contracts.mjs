// scripts/mcp/msp-memory-contracts: typed client for the msp_memory_* wire
// surface (WP-17 Bounded Scope item 3), mirroring
// scripts/mcp/msp-vault-context-contracts.mjs's createTypedVaultContextMsp
// shape exactly -- same requireString/optionalString/requireObject
// validation style, same "validate every response field before GoVibe
// trusts it" posture. This file covers only the three msp_memory_* tools
// this packet's govibe.memory.* bridge actually calls (search, forget,
// decay_tick) -- msp_memory_upsert/get/list/history and the two links tools
// are backend-only in this phase (see docs/api/API-009-Persistent-Memory-Contract.md
// SS2's govibe.memory.* list: no search/select/forget/decay.run counterpart
// exists for links in this phase). govibe.memory.promote already has its own
// typed method (promoteMemory) in msp-vault-context-contracts.mjs and is
// reused, not duplicated, here.
const HASH = /^[a-f0-9]{64}$/i;

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} is required.`);
  return value.trim();
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value;
}

function requireHash(value, label) {
  if (typeof value !== "string" || !HASH.test(value)) throw new Error(`MSP returned an invalid ${label}.`);
  return value.toLowerCase();
}

// ADR-023 / ADR-027: GoVibe may never mint or forward a gks:-namespaced
// canonical identity. This packet's persistent-memory bridge only ever talks
// to packages/msp-runtime (never GKS directly), so a gks: reference
// surfacing anywhere in an msp_memory_* response is a contract violation --
// recursively rejected here, defense in depth, independent of any guard on
// the write side (contracts/namespace-guard.mjs, mirrored client-side in
// scripts/mcp/msp-vault-context-contracts.mjs's rejectCanonicalCandidate).
function assertNoGksNamespace(value, path = "response") {
  if (typeof value === "string") {
    if (value.toLowerCase().startsWith("gks:")) {
      throw new Error(
        `MSP memory contract violation: ${path} contains a gks:-namespaced reference. ` +
          `This bridge must never forward a canonical GKS identity.`,
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoGksNamespace(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) assertNoGksNamespace(item, `${path}.${key}`);
  }
}

export function createTypedMemoryMsp(client) {
  if (!client || typeof client.call !== "function") throw new Error("MSP parent capability is unavailable.");

  return {
    // API-009 SS4.6. input: {vaultId, query, mode?, limit?}.
    async searchMemory(input) {
      const result = await client.call("msp_memory_search", {
        vault_id: requireString(input.vaultId, "vaultId"),
        query: requireString(input.query, "query"),
        mode: input.mode ?? "hybrid",
        limit: typeof input.limit === "number" ? input.limit : undefined,
      });
      const response = requireObject(result, "memory search response");
      assertNoGksNamespace(response, "memory search response");
      if (!Array.isArray(response.hits)) throw new Error("MSP returned an invalid memory search response: hits must be an array.");
      return {
        hits: response.hits,
        layersUsed: Array.isArray(response.layers_used) ? response.layers_used : [],
        vectorAvailable: response.vector_available === true,
        searchMode: requireString(response.searchMode, "searchMode"),
      };
    },

    // API-009 SS4.5. input: {entityId, reason}. Soft delete only -- asserts
    // the response actually reports lifecycle_state: "forgotten" rather than
    // trusting a bare 2xx-equivalent response, matching this contract
    // family's "validate every response field" posture.
    async forgetMemory(input) {
      const result = await client.call("msp_memory_forget", {
        entity_id: requireString(input.entityId, "entityId"),
        reason: requireString(input.reason, "reason"),
      });
      const response = requireObject(result, "memory forget response");
      assertNoGksNamespace(response, "memory forget response");
      const entity = requireObject(response.entity, "forgotten entity");
      if (entity.lifecycle_state !== "forgotten") {
        throw new Error("MSP memory forget response did not report lifecycle_state: \"forgotten\".");
      }
      requireString(entity.entity_id, "forgotten entity.entity_id");
      return { entity };
    },

    // API-009 SS4.7. input: {vaultId, dryRun?}.
    async runDecayTick(input) {
      const result = await client.call("msp_memory_decay_tick", {
        vault_id: requireString(input.vaultId, "vaultId"),
        dry_run: input.dryRun === true,
      });
      const response = requireObject(result, "memory decay tick response");
      assertNoGksNamespace(response, "memory decay tick response");
      if (!Number.isFinite(response.evaluated)) throw new Error("MSP returned an invalid memory decay tick response: evaluated must be a number.");
      if (!Array.isArray(response.transitioned)) throw new Error("MSP returned an invalid memory decay tick response: transitioned must be an array.");
      return {
        evaluated: response.evaluated,
        transitioned: response.transitioned,
        dryRun: response.dry_run === true,
      };
    },
  };
}

// Exported for this file's own test (AC-02) and any future memory-service.mjs
// need to validate a source_hash the same way msp-client.mjs's other typed
// responses do.
export { assertNoGksNamespace, requireHash, requireObject, requireString };
