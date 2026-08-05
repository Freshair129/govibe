---
title: "WP-15: Persistent-Memory MSP Runtime — Phase 3 (Hybrid Retrieval)"
doc_id: "WP-15-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-3"
status: "draft"
version: "0.1.1+draft"
updated: "2026-08-05"
owner: "Boss (CEO)"
proposal_author: "Claude (final-gate session)"
approval_owner: "Boss (CEO)"
source_of_truth: false
approval_recorded_at: "2026-08-05"
execution_authorized: true
execution_complete: false
complexity: "C-3"
access_scope: "H3"
risk: "MEDIUM"
parent_change_request: "CR-2026-08-04-PERSISTENT-MEMORY-MSP-RUNTIME"
depends_on: "WP-14-VAULT-SCOPING-MSP-RUNTIME-ENTITIES"
related_adrs: ["ADR-027", "ADR-020"]
related_apis: ["API-009"]
---

# WP-15: Persistent-Memory MSP Runtime — Phase 3 (Hybrid Retrieval)

## Objective

Deliver Phase 3 of the persistent-memory MSP runtime: the hybrid retrieval
layer (FTS5 keyword + bge-m3 dense vectors + Reciprocal Rank Fusion), plus
the entity CRUD tool surface that makes retrieval testable end to end. The
risk being accepted is retrieval-quality risk, not data-integrity risk: a
mis-tuned fusion or a mis-scoped FTS query returns wrong-but-visible results
rather than corrupting stored state, and the vector leg is designed to fail
soft (degrade to keyword-only) rather than fail the request.

## Ground truth as of 2026-08-05 (verified directly; do not assume, but do
re-verify before editing)

This packet is written to be executable by a session with no prior context.
The following is the actual state of `packages/msp-runtime` after WP-12,
WP-13, and WP-14 landed and were independently verified:

- **Test baseline**: `npm test` inside `packages/msp-runtime` runs
  `vitest run && npm run test:security` and currently passes **70 vitest +
  22 `node --test` = 92 tests, 0 failures**. Any regression against this
  baseline is a blocking defect, not an acceptable trade.
- **Existing `src/` layout**: `db/` (connection, migrate, migrations
  `0001_init.sql`, `0002_phase2.sql`, `0003_vault_scoping.sql`), `domain/`
  (entity-store, errors, ids, journal, temporal-engine, vault-registry),
  `contracts/` (errors, namespace-guard, refs, vault-scope-guard),
  `transport/` (stdio-jsonrpc-server, tool-registry,
  `handlers/{vault,context,lifecycle}-handlers.mjs`), `server.mjs`
  (composition root).
- **Existing tables**: `entities`, `entity_history`, `schema_migrations`
  (0001); `vaults`, `vault_mounts`, `contexts`, `journal`, `state`,
  `promotions` (0002); vault-scoping rebuilds of `entities`/`promotions`
  plus `vaults.role` (0003). **There is no `entities_fts` table, no
  `embeddings` table, and no `links` table yet.**
- **`domain/entity-store.mjs` already implements**, vault-scoped and tested:
  `upsert({vaultId, category, key, ...})`, `get({vaultId, category, key,
  asOfValidAt, asOfRecordedAt})`, `list({vaultId, category, lifecycleState,
  limit, cursor})`, `history({vaultId, category, key})`,
  `forget({vaultId, category, key, reason, actor})`. Phase 3 consumes these;
  it does not reimplement them.
- **`entities` already carries** `decay_score`, `lifecycle_state`, and
  `access_count` columns (unused until Phase 4) — do not add them again.
- **Registered tools today**: `msp_ping` plus WP-13's eleven `msp_*`
  contract tools. **None of API-009's nine `msp_memory_*` tools are
  implemented yet.**
- **Wire contract**: newline-delimited JSON-RPC 2.0 over stdio, matching
  `packages/govibe-core/src/msp-stdio-transport.mjs`'s `createMspStdioCaller`
  (readline, one JSON object per line). This is **not** the
  Content-Length/LSP framing used by `scripts/mcp/govibe-mcp-server.mjs`'s
  own inbound server; the two must never be conflated.
- **Layering rule**, enforced by `test/dependency-boundaries.test.mjs`:
  `db <- domain <- retrieval`, `domain <- contracts`,
  `{db, domain, retrieval, contracts} <- transport`; `domain` never imports
  `retrieval` or `contracts`; `server.mjs` is the composition root and is
  excluded. `retrieval/` does not exist yet — this packet creates it and is
  the first to exercise that half of the rule.

## Preconditions

- WP-14 is execution-complete and independently verified (vault scoping:
  `entities.vault_id`, `UNIQUE(vault_id, category, key)`,
  `UNIQUE(vault_id, idempotency_key)` on `promotions`, `vault_scope_denied`
  enforcement). Phase 3's retrieval must be vault-scoped from the first line
  of code — searching across vault boundaries would reintroduce exactly the
  cross-agent disclosure class WP-14 closed.
- `docs/api/API-009-Persistent-Memory-Contract.md` §4.1-4.6 defines the exact
  request/response shapes for `msp_memory_upsert`, `_get`, `_list`,
  `_history`, `_forget`, and `_search`. Read those sections directly; they
  are the wire contract this packet implements against, not a summary.
- `docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md` §5-§6 documents
  the intended `embeddings`/`entities_fts` schema and the four-layer
  retrieval model. Where SDD and API-009 disagree, API-009 wins for wire
  shapes and SDD wins for internal structure; record any conflict found.
- Ollama is expected at `http://localhost:11434` with the `bge-m3` model
  (1024-dim) for the vector leg. **Its absence must not fail the build or
  the test suite** — see AC-05.

## Bounded scope

1. **Migration `0004_retrieval.sql`**:
   - `entities_fts`: an FTS5 virtual table over the searchable projection of
     `entities` (at minimum `category`, `key`, and the text extracted from
     `body_json`), with `entity_id` and `vault_id` carried as `UNINDEXED`
     columns so results can be vault-filtered and joined back.
   - Sync triggers (`AFTER INSERT`, `AFTER UPDATE`, `AFTER DELETE` on
     `entities`) keeping `entities_fts` consistent. Note `0003`'s rebuild
     pattern: any future table rebuild must recreate these triggers — leave
     a comment in the migration saying so.
   - `embeddings`: one row per embedded entity — `entity_id` (FK →
     `entities`), `collection` (default `'msp-memory'`), `model`
     (`'bge-m3'`), `dim` (`1024`), `vector` (BLOB, Float32Array bytes),
     `content_hash` (staleness detection against `entities.source_hash`),
     `created_at`. `UNIQUE(entity_id, collection)`.
   - Must apply cleanly through the existing `db/migrate.mjs` runner with its
     checksum-drift and downgrade guards unmodified.

2. **`retrieval/fts.mjs`** — `ftsSearch(db, {query, vaultIds, category,
   limit})` against `entities_fts`, scoped to the supplied `vaultIds` and
   excluding `lifecycle_state = 'forgotten'` rows. Empty query or empty
   `vaultIds` returns `[]` rather than throwing or matching everything.

3. **`retrieval/vector.mjs`** — `embed(text)` posting to
   `${OLLAMA_BASE_URL}/api/embeddings` with `model: "bge-m3"`, and
   `vectorSearch(db, {queryVector, vaultIds, collection, limit})` doing a
   cosine scan over the vault-filtered `embeddings` rows. **This module must
   never throw and never block a request**: a connection refusal, timeout,
   non-200, malformed payload, or dimension mismatch resolves to
   `{hits: [], available: false, diagnostic}`. Include a circuit breaker
   (open after N consecutive failures, cooldown before retry) so a dead
   Ollama does not cost every subsequent request its full timeout.

4. **`retrieval/fusion.mjs`** — `rrfFuse(hitLists, {k = 60})` implementing
   standard Reciprocal Rank Fusion across the ranked lists it is given.
   Pure function, no I/O, no DB handle — this is the one piece that should
   be exhaustively unit-testable without any fixture.

5. **`retrieval/retrieval-service.mjs`** — the façade:
   exact-match short-circuit (an exact `category`+`key` hit returns
   immediately, `matchedBy: "atomic"`) → FTS → vector (only if the breaker
   is closed and an embedding for the query can be produced) → RRF fuse.
   Supports an explicit `mode: "fts"` that skips the vector leg entirely
   regardless of Ollama health, and reports which legs actually ran.

6. **Entity CRUD + search tool surface** (`transport/handlers/memory-handlers.mjs`,
   new): `msp_memory_upsert` (§4.1), `msp_memory_get` (§4.2),
   `msp_memory_list` (§4.3), `msp_memory_history` (§4.4),
   `msp_memory_forget` (§4.5), `msp_memory_search` (§4.6). All six are thin
   transport wrappers over `domain/entity-store.mjs` (already implemented)
   and `retrieval/retrieval-service.mjs` (this packet), with vault-scope
   enforcement via the existing `contracts/vault-scope-guard.mjs` pattern:
   the handler computes accessibility via `domain/vault-registry.mjs`'s
   `isVaultAccessibleTo` and passes the boolean into the guard, keeping
   `contracts/` free of `domain/vault-registry.mjs` imports (the layering
   decision WP-14 established — follow it, do not re-litigate it).
   Every mutating call writes exactly one `journal` row, per WP-13's
   established pattern.

7. **Embedding-on-write**: `msp_memory_upsert` computes and stores an
   embedding for new or content-changed entities. If the vector leg is
   unavailable at write time, the write **still succeeds** and the
   `embeddings` row is simply absent — that entity degrades to FTS-only
   until a later successful write or re-embed. Never fail a durable write
   because an optional enrichment service is down.

8. **Extend `test/dependency-boundaries.test.mjs`** (extend, do not replace —
   the same way WP-13 and WP-14 each extended it) to cover the new
   `retrieval/` layer: `retrieval/` may import `db/` and `domain/`;
   `domain/` must still never import `retrieval/`. The test must fail closed
   if a later edit violates this.

## Explicit exclusions

- Decay scoring and the `active -> decayed -> archived -> forgotten`
  lifecycle, and `msp_memory_decay_tick` (§4.7) — Phase 4, WP-16.
- `domain/links.mjs`, `msp_memory_links_list`/`_links_create` (§4.8/§4.9),
  the GoVibe-side bridge, and the Mission Control Domain E dashboard —
  Phase 5, WP-17.
- Graph traversal, community detection, or any GraphRAG-style retrieval
  layer. `retrieval/fusion.mjs` fuses at most the atomic/FTS/vector legs;
  the graph leg is permanently out of scope for this runtime per the
  governing CR's exclusions.
- Historical-version search: only current `entities` rows are indexed into
  `entities_fts`/`embeddings`. `entity_history` rows are exact-lookup only.
- Any relaxation of `msp_knowledge_promote` / `msp_memory_promote
  (target_scope=shared)`'s fail-closed `gks_provider_unconfigured` stub.
- Pointing `GOVIBE_MSP_COMMAND` at `packages/msp-runtime` in GoVibe's real
  runtime configuration — unchanged from WP-12/13/14; still a separate,
  later decision.
- Any file outside `packages/msp-runtime/**`. Phase 3 remains entirely
  inside the unwired package.

## Scope decision recorded (amends a forward-looking statement in WP-13)

`docs/change-control/change-requests/work-packets/WP-13-Persistent-Memory-MSP-Runtime-Phase-2.md`'s
Explicit Exclusions state that the `msp_memory_upsert`/`get`/`list`/
`history`/`forget`/`search` surface is "Phase 5's bridge work." That was a
forward guess made before Phase 3 existed, and following it literally would
make Phase 3 untestable: `msp_memory_search` would have nothing to search,
because the only way to create an entity today is the `global_private` path
of `msp_memory_promote`. This packet therefore moves the five CRUD tools
(§4.1-4.5) into Phase 3 alongside `msp_memory_search` (§4.6). The domain
layer for all five already exists and is tested (WP-12, re-verified WP-14),
so this is thin transport work, and it materially de-risks Phase 5 — already
the largest phase — by removing six tools from it. WP-17 inherits only the
two `links` tools from API-009's memory surface.

## Acceptance and exit gate

- AC-01: migration `0004_retrieval.sql` applies idempotently through the
  existing runner; `entities_fts` stays in sync with `entities` across
  insert, update, and delete, verified by a test that mutates `entities` and
  asserts the FTS projection followed.
- AC-02: `retrieval/fusion.mjs`'s RRF is unit-tested as a pure function
  (deterministic ordering, correct `1/(k+rank)` accumulation across
  overlapping and disjoint lists, `k` configurable), with no DB or network.
- AC-03: `msp_memory_search` returns vault-scoped results only — a test
  proves an entity in vault A is never returned to a caller scoped to
  vault B, for every `mode` (`hybrid`, `fts`, and exact-match
  short-circuit). This is a security-relevant assertion and belongs in a
  `*.security.mjs` file per this package's convention.
- AC-04: the five CRUD tools (§4.1-4.5) each round-trip over the **real**
  stdio child process via `createMspStdioCaller` (not in-process calls),
  matching API-009's documented request/response shapes;
  `msp_memory_forget` is proven to be a soft delete (row persists,
  `lifecycle_state = 'forgotten'`, absent from default `list`, still
  reachable through `history`).
- AC-05: **graceful degradation is proven, not asserted.** With the vector
  leg unavailable (point `OLLAMA_BASE_URL` at a closed port, or stop a stub
  server mid-test), `msp_memory_search` still returns FTS results and
  reports its degraded mode honestly in the response (per API-009 §4.6's
  documented field — read that section for the exact field name and
  values; do not invent one). The whole test suite must pass on a machine
  with **no Ollama running at all**.
- AC-06: the dependency-boundary test covers `retrieval/` and fails closed
  on violation.
- AC-07: no regression against the 92-test baseline; report the final count
  and explicitly state how many pre-existing tests required modification and
  why.
- AC-08: required test/lint/build/docs-validation/diff-check gates pass
  (`vitest` for `*.test.mjs`; `node --test` for `*.security.mjs`;
  `node scripts/docs/diff-check.mjs` from the repo root).
- AC-09: independent review and owner approval recorded **before** closure —
  before, not after. Authorization must precede execution; see the Owner
  accepted-risk record below.

## Rollback

Capture pre-change source hashes and inverse patches before any runtime or
test mutation. This packet only extends the still-unwired
`packages/msp-runtime` package; rollback is a revert of its commit(s) plus a
downgrade migration dropping `entities_fts`, its triggers, and `embeddings`.
If an approved rollback trigger occurs after a later phase depends on this
packet, restore the exact prior state, rerun the approved baseline, and
record the trigger without widening scope or restoring an authority bypass.

## Owner accepted-risk record

Authorized 2026-08-05 by Boss (CEO), owner and approval owner, in the
resuming session's chat channel (directive: "commit WP-14 ก่อน แล้วค่อยเริ่ม
WP-15" — commit WP-14 first, then start WP-15), after that session presented
this packet's Ground truth section, scope, and risk framing for review.
Recorded here, in frontmatter, before implementation is dispatched, per the
process correction established by WP-14 (and the deviation recorded in
WP-13): an executing session must not set its own `execution_authorized` /
`execution_complete` flags. This entry sets `execution_authorized` only;
`execution_complete` remains false until independent post-execution
verification is recorded separately.

## Execution closure

Not yet executed.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1+draft | 2026-08-05 | Boss (CEO) | Owner-authorized for execution in chat after WP-14 was committed (`feat/wp-14-vault-scoping-msp-runtime`, commit `30ee737`). `execution_authorized` set to `true`, `approval_recorded_at` set; `execution_complete` remains `false` pending independent verification after implementation. Authorization recorded before dispatch, per the process WP-14 established. |
| 0.1.0+draft | 2026-08-05 | Claude (final-gate session) | Proposed WP-15, scoped to Phase 3 (hybrid retrieval: FTS5, bge-m3 vectors via Ollama with fail-soft circuit breaker, RRF fusion, retrieval-service façade) plus API-009 §4.1-4.6's entity CRUD and search tools. Records the scope decision moving the five CRUD tools from Phase 5 into Phase 3 (search is untestable without a write path) and the ground-truth state of `packages/msp-runtime` as of 2026-08-05 so a session with no prior context can execute this packet. Execution remains unauthorized at proposal time. |
