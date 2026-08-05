// scripts/mcp/runtime/memory-service: the govibe.memory.* runtime service
// (WP-17 Bounded Scope item 3), in the established shape every other runtime
// service uses -- a plain class constructed with an options object, whose
// methods call out (here, through the typed MSP client) and then
// snapshotStore.patch({...}) + .emit({type, ...}). Mirrors
// scripts/mcp/runtime/workspace-service.mjs's shape most closely (a thin
// pass-through over a governed capability), not roadmap-service.mjs's
// (which owns its own parsing/scoring domain logic this service has no
// equivalent of).
//
// Layering: this file must never import runtime-core.mjs, sidecar-server.mjs,
// or govibe-mcp-server.mjs (scripts/mcp/runtime/dependency-boundaries.test.mjs
// enforces this for every file in this directory, AC-04).
//
// Server-side caps (Bounded Scope item 3 / AC-05): a legitimate large memory
// (a big body_json) must not produce a mission event exceeding
// MISSION_PROTOCOL_LIMITS.eventBytes (1,000,000 bytes) and silently
// blackhole its own update -- packages/mission-protocol/index.js's
// isMissionEvent gate drops an oversized event with no error, only a
// console warning (see that file's header comment). Both caps below are
// enforced here, server-side, before an event is ever built -- never left to
// the UI to truncate.
import { createTypedMemoryMsp } from "../msp-memory-contracts.mjs";

const MAX_RESULT_HITS = 20; // matches msp_memory_search's own default limit; re-enforced here defensively.
const MAX_BODY_PREVIEW_CHARS = 500; // 20 hits * ~600 bytes/hit (preview + short fields) is far under the 1,000,000-byte eventBytes cap.

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} is required.`);
  return value.trim();
}

function truncate(text, maxChars) {
  if (typeof text !== "string") return "";
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}

function summarizeEntity(entity = {}) {
  return {
    entityId: entity.entity_id ?? null,
    vaultId: entity.vault_id ?? null,
    category: entity.category ?? null,
    key: entity.key ?? null,
    bodyPreview: truncate(JSON.stringify(entity.body_json ?? {}), MAX_BODY_PREVIEW_CHARS),
    epistemicState: entity.epistemic_state ?? null,
    confidence: typeof entity.confidence === "number" ? entity.confidence : null,
    lifecycleState: entity.lifecycle_state ?? null,
    decayScore: typeof entity.decay_score === "number" ? entity.decay_score : null,
  };
}

function emptyMemorySlice() {
  return { results: [], selectedEntityId: null, lastQuery: null, lastSearchedAt: null, lastDecayResult: null };
}

export class MemoryService {
  constructor(options) {
    Object.assign(this, options);
  }

  get snapshot() {
    return this.snapshotStore.getSnapshot();
  }

  set snapshot(value) {
    this.snapshotStore.replace(value);
  }

  emit(event) {
    this.snapshotStore.emit(event);
  }

  memorySlice() {
    return this.snapshot.memory ?? emptyMemorySlice();
  }

  patchMemory(patch) {
    this.snapshot = { ...this.snapshot, memory: { ...this.memorySlice(), ...patch }, updatedAt: new Date().toISOString() };
  }

  typedClient() {
    return createTypedMemoryMsp(this.mspClient);
  }

  // govibe.memory.search (API-009 SS4.6 via msp_memory_search). Server-side
  // hit-count and body-preview caps applied before the snapshot patch/emit --
  // never trusts msp_memory_search's own limit clamping alone.
  async search(args = {}) {
    const vaultId = requireString(args.vault_id, "vault_id");
    const query = requireString(args.query, "query");
    const mode = args.mode;
    const limit = typeof args.limit === "number" ? args.limit : undefined;

    const typed = this.typedClient();
    const result = await typed.searchMemory({ vaultId, query, mode, limit });

    const hits = result.hits.slice(0, MAX_RESULT_HITS).map((hit) => ({
      entity: summarizeEntity(hit.entity),
      score: typeof hit.score === "number" ? hit.score : 0,
      matchedBy: Array.isArray(hit.matched_by) ? hit.matched_by : [],
    }));

    const searchResult = {
      query,
      vaultId,
      hits,
      layersUsed: result.layersUsed,
      vectorAvailable: result.vectorAvailable,
      searchMode: result.searchMode,
      updatedAt: new Date().toISOString(),
    };

    this.patchMemory({ results: hits, lastQuery: query, lastSearchedAt: searchResult.updatedAt });
    this.emit({ type: "memory.search.result", result: searchResult });
    return searchResult;
  }

  // govibe.memory.select. Records a Mission Control operator's selection for
  // detail viewing; updates local snapshot/UI state only, never calls MSP
  // (API-009 SS2's own documented behavior for this tool).
  select(args = {}) {
    const entityId = typeof args.entity_id === "string" && args.entity_id.trim() ? args.entity_id.trim() : null;
    this.patchMemory({ selectedEntityId: entityId });
    this.emit({ type: "memory.selection", entityId });
    return { selectedEntityId: entityId };
  }

  // govibe.memory.forget (msp_memory_forget). Soft delete only -- the typed
  // client already asserts the response reports lifecycle_state: "forgotten"
  // before this method ever runs. Drops the forgotten entity out of the
  // current results list (it is no longer in default recall on the MSP
  // side either), rather than leaving a stale hit in the snapshot.
  async forget(args = {}) {
    const entityId = requireString(args.entity_id, "entity_id");
    const reason = requireString(args.reason, "reason");

    const typed = this.typedClient();
    const { entity } = await typed.forgetMemory({ entityId, reason });

    const remaining = this.memorySlice().results.filter((hit) => hit.entity.entityId !== entityId);
    this.patchMemory({ results: remaining });
    this.emit({ type: "memory.forgotten", entityId, vaultId: entity.vault_id ?? null });
    return { entity };
  }

  // govibe.memory.decay.run (msp_memory_decay_tick). The runtime never
  // self-schedules a decay sweep (API-009 SS4.7) -- this tool (or an
  // equivalent external cron trigger calling it) is the only way one runs.
  async decayRun(args = {}) {
    const vaultId = requireString(args.vault_id, "vault_id");
    const dryRun = args.dry_run === true;

    const typed = this.typedClient();
    const result = await typed.runDecayTick({ vaultId, dryRun });

    const decayResult = {
      vaultId,
      evaluated: result.evaluated,
      transitioned: result.transitioned.map((item) => ({ entityId: item.entity_id, from: item.from, to: item.to })),
      dryRun: result.dryRun,
      updatedAt: new Date().toISOString(),
    };

    this.patchMemory({ lastDecayResult: decayResult });
    this.emit({ type: "memory.decay.result", result: decayResult });
    return decayResult;
  }
}
