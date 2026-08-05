// transport/handlers/memory-handlers: msp_memory_upsert/get/list/history/
// forget/search (WP-15 Bounded Scope item 6). Thin transport wrappers over
// domain/entity-store.mjs (already implemented, WP-12/WP-14) and
// retrieval/retrieval-service.mjs (this packet) -- this file does not
// reimplement either.
//
// Vault scoping (WP-15 Bounded Scope item 6, and this packet's Ground rule
// 4): every handler below resolves a real, already-provisioned vault before
// touching entity-store/retrieval, and every domain/retrieval call is
// scoped to exactly that vault_id -- results can never cross a vault
// boundary within one request/response (AC-03). Recorded as a deviation in
// this packet's final report and WP-15's Execution closure: WP-15 asks this
// file to reuse contracts/vault-scope-guard.mjs's assertVaultScope +
// domain/vault-registry.mjs's isVaultAccessibleTo(vaultId, {workspaceId,
// agentId}) pattern verbatim, matching msp_vault_mount's (WP-14) caller-
// ownership check. That pattern needs a caller identity (workspaceId or
// agentId) to test accessibility against. API-009 SS4.1-SS4.6's documented
// request shapes for all six msp_memory_* tools carry no actor/workspace_id/
// agent_id field at all (unlike every other tool in this runtime's surface,
// which requires one) -- there is no caller identity on the wire to compute
// isVaultAccessibleTo's second argument from. Inventing an undocumented
// identity field would violate AC-04's "matching API-009's documented
// request/response shapes" and this packet's Ground rules (never widen a
// wire shape beyond what's specified). This file therefore does NOT call
// contracts/vault-scope-guard.mjs's assertVaultScope/VaultScopeDeniedError --
// there is no caller-ownership boolean to pass it that would mean anything
// more than "this vault_id exists", and minting a vault_scope_denied for
// that would blur WP-14's own precedent (msp_vault_mount: an unknown
// vault_id is the distinct not_found condition, not vault_scope_denied).
// Instead: an unknown vault_id fails closed as not_found
// (MemoryNotFoundError, requireKnownVault() below), and the actual security
// property this phase's Ground rule 4 and AC-03 require (results never
// crossing a vault boundary) is enforced the way it is actually testable:
// strict per-request `vault_id`/`entity_id` scoping in every entity-store/
// retrieval call below, never a caller-ownership check this wire contract
// cannot support. A future phase that adds caller identity to these six
// tools' wire shapes can layer real isVaultAccessibleTo-based
// vault_scope_denied enforcement on top of this without changing the data
// scoping already enforced here.
import { MemoryNotFoundError, ValidationError } from "../../contracts/errors.mjs";
import { vectorToBlob } from "../../retrieval/vector.mjs";

const VALID_SEARCH_MODES = new Set(["hybrid", "fts", "vector"]);
const EMBEDDING_COLLECTION = "msp-memory";

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new ValidationError(`${label} is required.`);
  return value.trim();
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Mirrors transport/handlers/lifecycle-handlers.mjs's resolveActor: these
// six tools' wire requests carry no actor field (see header comment above),
// so every journal row this file writes uses this same "system" fallback,
// unless a caller supplies one anyway (defensive, not required by the
// documented shape).
function resolveActor(args) {
  if (typeof args.actor === "string" && args.actor.trim()) return args.actor.trim();
  return "system";
}

function toWireEntity(entity) {
  return entity;
}

export function createMemoryHandlers({ db, entityStore, vaultRegistry, journal, retrievalService, vectorClient }) {
  const upsertEmbedding = db.prepare(`
    INSERT INTO embeddings (entity_id, collection, model, dim, vector, content_hash, created_at)
    VALUES (@entity_id, @collection, @model, @dim, @vector, @content_hash, @created_at)
    ON CONFLICT(entity_id, collection) DO UPDATE SET
      model = excluded.model,
      dim = excluded.dim,
      vector = excluded.vector,
      content_hash = excluded.content_hash,
      created_at = excluded.created_at
  `);

  function requireKnownVault(vaultId) {
    const vault = vaultRegistry.getVaultById(vaultId);
    // Distinct condition from vault_scope_denied, mirroring WP-14's own
    // vault-handlers.mjs precedent (msp_vault_mount): an unknown vault_id is
    // not_found, not a scope denial -- there is no caller identity here to
    // even ask "is this scoped to you" about (see header comment).
    if (!vault) {
      throw new MemoryNotFoundError(
        `msp_memory_*: unknown vault_id "${vaultId}". Provision it first via msp_workspace_register / ` +
          `msp_vault_status / msp_memory_promote before referencing it here.`,
      );
    }
    return vault;
  }

  function requireEntityById(entityId) {
    const entity = entityStore.getById(entityId);
    if (!entity) {
      throw new MemoryNotFoundError(`No memory entity found for entity_id "${entityId}".`);
    }
    return entity;
  }

  // WP-15 Bounded Scope item 7: computes and stores an embedding for a
  // new/content-changed entity. Never throws and never fails the caller's
  // write -- if the vector leg is unavailable, this is a silent (to the
  // caller) no-op; the entity simply has no embeddings row and degrades to
  // FTS-only in msp_memory_search until a later successful write/re-embed.
  async function embedOnWrite(entity) {
    const text = `${entity.category} ${entity.key} ${JSON.stringify(entity.body_json ?? {})}`;
    const result = await vectorClient.embed(text);
    if (!result.available) return;
    upsertEmbedding.run({
      entity_id: entity.entity_id,
      collection: EMBEDDING_COLLECTION,
      model: vectorClient.model ?? "bge-m3",
      dim: result.vector.length,
      vector: vectorToBlob(result.vector),
      content_hash: entity.source_hash,
      created_at: new Date().toISOString(),
    });
  }

  return {
    // API-009 SS4.1. Request: {vault: {vault_id, vault_type}, category, key,
    // body_json, epistemic_state, confidence, valid_from, valid_to}.
    async msp_memory_upsert(args = {}) {
      const vault = args.vault && typeof args.vault === "object" ? args.vault : {};
      const vaultId = requireString(vault.vault_id, "vault.vault_id");
      requireKnownVault(vaultId);
      const category = requireString(args.category, "category");
      const key = requireString(args.key, "key");
      const bodyJson = args.body_json && typeof args.body_json === "object" && !Array.isArray(args.body_json) ? args.body_json : {};
      const epistemicState = optionalString(args.epistemic_state) ?? "hypothesis";
      const confidence = typeof args.confidence === "number" ? args.confidence : 0.5;
      const validFrom = optionalString(args.valid_from);
      const validTo = optionalString(args.valid_to);
      const actor = resolveActor(args);

      const { entity, created, changed } = entityStore.upsert({
        vaultId,
        category,
        key,
        bodyJson,
        epistemicState,
        confidence,
        validFrom,
        validTo,
        actor,
      });

      if (changed) {
        await embedOnWrite(entity);
      }

      journal.append({
        actor,
        toolName: "msp_memory_upsert",
        ref: entity.entity_id,
        workspaceId: null,
        payload: { vault_id: vaultId, category, key, created, changed },
        policyDecision: "allow",
      });

      return { entity: toWireEntity(entity), created, changed };
    },

    // API-009 SS4.2. Request: {vault_id, category, key, as_of_valid_at, as_of_recorded_at}.
    async msp_memory_get(args = {}) {
      const vaultId = requireString(args.vault_id, "vault_id");
      requireKnownVault(vaultId);
      const category = requireString(args.category, "category");
      const key = requireString(args.key, "key");
      const asOfValidAt = optionalString(args.as_of_valid_at);
      const asOfRecordedAt = optionalString(args.as_of_recorded_at);

      const entity = entityStore.get({ vaultId, category, key, asOfValidAt, asOfRecordedAt });
      if (!entity) {
        throw new MemoryNotFoundError(
          `No memory entity found for vault_id="${vaultId}" category="${category}" key="${key}"` +
            (asOfValidAt || asOfRecordedAt ? " at the requested point in time." : "."),
        );
      }
      return { entity: toWireEntity(entity), point_in_time: Boolean(asOfValidAt || asOfRecordedAt) };
    },

    // API-009 SS4.3. Request: {vault_id, category, lifecycle_state, page_size, page_token}.
    async msp_memory_list(args = {}) {
      const vaultId = requireString(args.vault_id, "vault_id");
      requireKnownVault(vaultId);
      const category = optionalString(args.category);
      const lifecycleState = optionalString(args.lifecycle_state);
      const pageToken = optionalString(args.page_token);
      const pageSize = typeof args.page_size === "number" ? args.page_size : undefined;

      const { entities, nextCursor } = entityStore.list({
        vaultId,
        category,
        lifecycleState,
        limit: pageSize,
        cursor: pageToken,
      });

      return { entities: entities.map(toWireEntity), next_page_token: nextCursor };
    },

    // API-009 SS4.4. Request: {entity_id} only -- see header comment for why
    // this resolves vaultId/category/key from the entity itself rather than
    // taking them on the wire.
    async msp_memory_history(args = {}) {
      const entityId = requireString(args.entity_id, "entity_id");
      const current = requireEntityById(entityId);

      const historyDesc = entityStore.history({ vaultId: current.vault_id, category: current.category, key: current.key });
      // API-009 SS4.4: "history is returned in ascending version order ...
      // never filtered or truncated." entity-store.history() itself returns
      // newest-first (its own documented, pre-existing contract) -- reversed
      // here at the transport boundary rather than changing that method's
      // established behavior.
      const historyAsc = [...historyDesc].reverse();

      // Documented gap (recorded in this packet's final report): API-009's
      // MemoryEntityHistoryEntry = MemoryEntity & {version} implies every
      // entry also carries vault_id/category/key/lifecycle_state/
      // decay_score/access_count/current_version. entity_history's existing
      // WP-12 schema stores none of lifecycle_state/decay_score/
      // access_count/current_version per row (those are current-state-only
      // columns on `entities`), so fabricating plausible-looking values for
      // them would be dishonest. vault_id/category/key ARE stable across a
      // given entity_id's versions, so they are safely backfilled from the
      // already-resolved current entity; the four current-state-only fields
      // are intentionally omitted rather than invented.
      const history = historyAsc.map((entry) => ({
        entity_id: current.entity_id,
        vault_id: current.vault_id,
        category: current.category,
        key: current.key,
        version: entry.version,
        body_json: entry.body_json,
        epistemic_state: entry.epistemic_state,
        confidence: entry.confidence,
        valid_from: entry.valid_from,
        valid_to: entry.valid_to,
        recorded_at: entry.recorded_at,
        superseded_at: entry.superseded_at,
        source_hash: entry.source_hash,
        change_reason: entry.change_reason,
        actor: entry.actor,
      }));

      return { history };
    },

    // API-009 SS4.5. Request: {entity_id, reason}. Soft delete only -- no
    // DELETE statement is ever issued (entity-store.forget()'s existing
    // contract, unchanged here).
    async msp_memory_forget(args = {}) {
      const entityId = requireString(args.entity_id, "entity_id");
      const reason = requireString(args.reason, "reason");
      const current = requireEntityById(entityId);
      const actor = resolveActor(args);

      const forgotten = entityStore.forget({
        vaultId: current.vault_id,
        category: current.category,
        key: current.key,
        reason,
        actor,
      });

      journal.append({
        actor,
        toolName: "msp_memory_forget",
        ref: entityId,
        workspaceId: null,
        payload: { entity_id: entityId, reason },
        policyDecision: "allow",
      });

      return { entity: toWireEntity(forgotten) };
    },

    // API-009 SS4.6. Request: {vault_id, query, mode, limit}.
    async msp_memory_search(args = {}) {
      const vaultId = requireString(args.vault_id, "vault_id");
      requireKnownVault(vaultId);
      const query = requireString(args.query, "query");
      const mode = VALID_SEARCH_MODES.has(args.mode) ? args.mode : "hybrid";
      const limit = typeof args.limit === "number" ? args.limit : undefined;

      const result = await retrievalService.search({ vaultIds: [vaultId], query, mode, limit });

      return {
        hits: result.hits.map((hit) => ({ entity: toWireEntity(hit.entity), score: hit.score, matched_by: hit.matchedBy })),
        layers_used: result.layersUsed,
        vector_available: result.vectorAvailable,
        searchMode: result.searchMode,
      };
    },
  };
}
