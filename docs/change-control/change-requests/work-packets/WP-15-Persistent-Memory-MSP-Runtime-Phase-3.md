---
title: "WP-15: Persistent-Memory MSP Runtime — Phase 3 (Hybrid Retrieval)"
doc_id: "WP-15-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-3"
status: "draft"
version: "0.1.3+draft"
updated: "2026-08-05"
owner: "Boss (CEO)"
proposal_author: "Claude (final-gate session)"
approval_owner: "Boss (CEO)"
source_of_truth: false
approval_recorded_at: "2026-08-05"
execution_authorized: true
execution_complete: true
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

Executed 2026-08-05 by the implementation session (this record), after
authorization was already set in this document's frontmatter by the owner
(see the Changelog row below and the Owner accepted-risk record above).
`execution_complete` is deliberately left `false` in frontmatter by this
session — per this packet's Ground rule 3, only the dispatching/final-gate
session sets that flag, after its own independent re-verification. This
section is the executing session's own honest record of what was built and
tested, not a self-certification of AC-09.

**Bounded Scope items 1-8: all built.**

- **Item 1 (migration `0004_retrieval.sql`)**: `entities_fts` (FTS5 virtual
  table over `category`/`key`/`body_text`, with `entity_id`/`vault_id`
  `UNINDEXED`), three sync triggers (`AFTER INSERT`/`AFTER UPDATE`/`AFTER
  DELETE` on `entities`), and `embeddings` (`entity_id` FK, `collection`,
  `model`, `dim`, `vector` BLOB, `content_hash`, `UNIQUE(entity_id,
  collection)`). Applies as migration version 4 through the existing
  `db/migrate.mjs` runner with its checksum-drift/downgrade guards
  unmodified. The migration's header comment records that any future
  `entities` table rebuild (following `0003`'s 12-step pattern) must
  explicitly recreate the three FTS sync triggers, since triggers — unlike
  foreign keys — do not re-attach automatically by table name.
- **Item 2 (`retrieval/fts.mjs`)**: `ftsSearch(db, {query, vaultIds,
  category, limit})`. Empty query or empty `vaultIds` returns `[]`.
  Vault-scoped and excludes `lifecycle_state='forgotten'`. One
  implementation note: FTS5's whole-table `MATCH` had to be written against
  the virtual table's real name (`entities_fts MATCH ?`), not its `f` alias
  used elsewhere in the same query — `f MATCH ?` raises `"no such column:
  f"` once the table is joined under an alias (verified directly against
  better-sqlite3's FTS5 integration; not documented anywhere obviously, so
  recorded here and in the file's own comment).
- **Item 3 (`retrieval/vector.mjs`)**: `embed(text)` (POSTs to
  `${OLLAMA_BASE_URL}/api/embeddings`, model `bge-m3`) and `vectorSearch(db,
  {queryVector, vaultIds, collection, limit})` (vault-scoped cosine scan).
  Every failure mode — connection refusal, timeout (`AbortController`),
  non-200, malformed JSON, dimension mismatch — resolves to `{available:
  false, diagnostic}`, never throws. A consecutive-failure circuit breaker
  (`createCircuitBreaker`, default threshold 3, cooldown 30s, half-open
  retry after cooldown) is included and unit-tested directly (mocked
  `fetch`, no real network).
- **Item 4 (`retrieval/fusion.mjs`)**: `rrfFuse(hitLists, {k=60})`. Pure,
  no I/O, no DB handle. Exhaustively unit-tested: deterministic ordering
  (tie-break by id), correct `1/(k+rank)` accumulation for disjoint and
  overlapping lists, configurable `k`.
- **Item 5 (`retrieval/retrieval-service.mjs`)**: façade implementing
  exact-match short-circuit → FTS → vector (skipped entirely for
  `mode:"fts"`) → RRF fuse, reporting `layersUsed`/`vectorAvailable`/
  `searchMode`. See Deviations below for the exact-match short-circuit's
  documented interpretation (the wire request has no separate category/key
  field to short-circuit on).
- **Item 6 (`transport/handlers/memory-handlers.mjs`)**: all six tools
  (`msp_memory_upsert`/`_get`/`_list`/`_history`/`_forget`/`_search`) as
  thin wrappers over the pre-existing `domain/entity-store.mjs` and the new
  `retrieval/retrieval-service.mjs`. Every mutating call
  (`upsert`/`forget`) writes exactly one `journal` row. See Deviations below
  for the vault-scope-enforcement gap this item's literal instruction ran
  into (no caller-identity field exists on these six tools' documented wire
  requests).
- **Item 7 (embedding-on-write)**: `msp_memory_upsert` computes and stores
  an embedding via `embedOnWrite()` whenever `changed:true` (new or
  content-changed entity). If the vector leg is unavailable, the write still
  succeeds and no `embeddings` row is written — verified directly by
  `test/memory-search-degradation.test.mjs`'s first test (upsert succeeds
  against a guaranteed-closed `OLLAMA_BASE_URL`).
- **Item 8 (dependency-boundary test extension)**: `test/dependency-boundaries.test.mjs`
  extended, not replaced: `retrieval/` may import `db/`/`domain/` only,
  never `contracts/`/`transport/`; the pre-existing "`domain/`/`contracts/`
  never import `retrieval/`" belt-and-braces assertion is kept; `transport/`'s
  allowed-imports test widened to include `retrieval/` (the new
  `memory-handlers.mjs` is the first `transport/` file to import it).

**One small, surgical addition to the already-implemented `domain/entity-store.mjs`**
(not a reimplementation of its CRUD methods, which Ground truth says this
packet consumes, not rebuilds): `rowToEntity` was exported (was a private
function) so `retrieval/fts.mjs` and `retrieval/vector.mjs` reuse the exact
same row-to-`MemoryEntity` mapping instead of a second, drifting copy; and a
new `getById(entityId)` method was added because `msp_memory_history`/
`msp_memory_forget`'s documented wire requests (API-009 §4.4/§4.5) carry
only `entity_id` — no `vaultId`/`category`/`key` — so the handler needs a
direct by-primary-key lookup to resolve those before calling the existing
(unmodified) `vaultId`-scoped `history()`/`forget()` methods.

**Verification actually run by this session** (reproducible; commands and
counts below, not summarized):

- `cd packages/msp-runtime && npm test`: **132 vitest tests + 26 `node
  --test` security tests = 158/158 passing, 0 failures.** Reproduced twice:
  once against this machine's ambient environment (which, contrary to this
  packet's assumption, actually has a live Ollama server with a real
  `bge-m3` model reachable at the default `http://localhost:11434` — see
  Deviations below), and once with `OLLAMA_BASE_URL=http://127.0.0.1:1`
  forced globally to simulate "no Ollama running at all" — both runs
  132/132 vitest + 26/26 security, identical pass count, confirming no test
  in the suite silently depends on the ambient live Ollama.
  - Baseline reproduced first, before any change: 70 vitest + 22 `node
    --test` = 92/92, matching this packet's Ground truth exactly.
  - Net added: 62 new vitest tests (13 new test files: fusion, FTS sync,
    vector client, retrieval-service, memory CRUD real-process round trip,
    memory search degradation) + 4 new `node --test` security tests
    (`test/memory-search-vault-scoping.security.mjs`, AC-03).
  - **3 pre-existing tests required modification, purely mechanical**: two
    assertions in `test/migrate.test.mjs` and one in
    `test/vault-scoping.test.mjs` hard-coded the pre-WP-15 migration count
    (3) and the newest migration's version number; updated to 4 to account
    for `0004_retrieval.sql`. No behavioral assertion was changed, weakened,
    or removed.
- From repo root, `node scripts/docs/validate-docs.mjs`: **PASS, errors: 0.**
  Warnings are pre-existing, all pointing at WP-17/WP-18/SRS/API-009
  references to files future phases build (`memory-surface.mjs`,
  `memory-service.mjs`, `msp-memory-contracts.mjs`, the Domain E view
  files) — none of these are this packet's files to create, per Explicit
  Exclusions.
- From repo root, `node scripts/docs/diff-check.mjs`: initially **FAIL**
  (18 code files changed, 0 docs) until this Execution closure section was
  written — this is that doc change; re-run after this edit is expected to
  PASS.
- AC-05's no-Ollama claim tested explicitly, not assumed: see the dedicated
  bullet above and `test/memory-search-degradation.test.mjs` /
  `test/memory-search-vault-scoping.security.mjs`, both of which bind-then-
  close an ephemeral TCP port and point `OLLAMA_BASE_URL` at it for every
  runtime they spawn, guaranteeing a real `ECONNREFUSED` regardless of the
  host's ambient state. `msp_memory_search` is confirmed to still return
  real FTS hits with `searchMode: "fts_only"` and `vector_available: false`
  — the exact API-009 §4.6 field name and values, not invented.

AC-01 through AC-08, as built and tested by this session, are believed met
per the evidence above; AC-09 (independent review and owner approval
recorded before closure) is explicitly the dispatching/final-gate session's
and owner's to close, not this session's — `execution_complete` is left
`false` for that reason.

**AC-09 closure (independent re-verification, dispatching session, 2026-08-05).**
The final-gate session that dispatched this packet's execution independently
reproduced, rather than trusted, the evidence above: re-ran `cd
packages/msp-runtime && npm test` directly (132 vitest + 26 `node --test` =
158/158, matching the executing session's count exactly), re-ran the full
suite a second time with `OLLAMA_BASE_URL=http://127.0.0.1:1` forced
globally to independently confirm AC-05's no-Ollama claim, re-ran
`node scripts/docs/validate-docs.mjs` and `node scripts/docs/diff-check.mjs`
from the repo root (both PASS), and read `retrieval/vector.mjs`,
`retrieval/fusion.mjs`, `retrieval/retrieval-service.mjs`,
`transport/handlers/memory-handlers.mjs`, `db/migrations/0004_retrieval.sql`,
and `test/memory-search-vault-scoping.security.mjs` directly to confirm the
Execution closure narrative above matches the actual code, not just the
prose. The HIGH-severity deviation (no caller-identity field in API-009
§4.1-4.6's memory-tool wire shapes, so these six tools enforce vault-scoped
data isolation but not caller-ownership authorization) was independently
confirmed by reading API-009 §4.1-4.6 directly, not taken on the executing
session's word. Presented to Boss (CEO) in chat with that deviation
explicitly flagged; owner responded "ok" to both closing `execution_complete`
now and leaving the caller-identity gap as a documented gap for a future
work packet to resolve (not urgent-escalated). `execution_complete` is set
`true` on that basis.

## Deviations

| Severity | Type | Description | Remediation |
|---|---|---|---|
| MEDIUM | Documentation conflict (API-009 wins, per this packet's own resolution rule) | `docs/api/API-009-Persistent-Memory-Contract.md` §3's `SearchHit.matched_by` type is `Array<"exact" \| "fts" \| "vector">` (snake_case field, lowercase `"exact"` literal). This packet's own Bounded Scope item 5 prose instead says `matchedBy: "atomic"` (camelCase field name, different literal value). The two cannot both be implemented. | Implemented API-009's literal wire shape: `matched_by` (snake_case, inside each `SearchHit`), with the literal string `"exact"` for the short-circuit case — never `"atomic"`, never `matchedBy`. `layers_used`/`vector_available`/`searchMode` (the odd mixed-case field, API-009's own literal name) were implemented exactly as API-009 §4.6 documents them, not paraphrased. |
| MEDIUM | Precondition gap (API-009 request shape underspecifies this packet's own prose) | API-009 §4.6's `msp_memory_search` request is `{vault_id, query, mode, limit}` — there is no separate `category`/`key` field. This packet's Bounded Scope item 5 describes the exact-match short-circuit as "an exact category+key hit," which cannot be built literally against that request shape. | Resolved by treating `query` as a candidate literal `key`, matched across every `category` within the vault(s) the request is scoped to (`retrieval/retrieval-service.mjs`'s `findExactMatch`). Documented in that file's own header comment, not silently guessed. Verified vault-scoped by `test/memory-search-vault-scoping.security.mjs`'s dedicated exact-match test. |
| HIGH | Precondition that does not hold (Bounded Scope item 6's literal instruction vs. the actual wire contract) | Bounded Scope item 6 instructs reusing `contracts/vault-scope-guard.mjs`'s `assertVaultScope` + `domain/vault-registry.mjs`'s `isVaultAccessibleTo(vaultId, {workspaceId, agentId})` — the exact caller-ownership check WP-14 built for `msp_vault_mount`. That check requires a caller identity (`workspaceId` or `agentId`) to test accessibility against. API-009 §4.1-§4.6's documented request shapes for **all six** `msp_memory_*` tools carry **no** `actor`/`workspace_id`/`agent_id` field at all — unique among this runtime's whole tool surface, where every other tool requires one. There is therefore no caller identity on the wire from which to compute `isVaultAccessibleTo`'s second argument, and inventing an undocumented identity field would itself violate AC-04's "matching API-009's documented request/response shapes." | `transport/handlers/memory-handlers.mjs` does **not** call `assertVaultScope`/`isVaultAccessibleTo` for these six tools (see that file's header comment). Instead: (1) an unknown `vault_id`/`entity_id` fails closed as `not_found`, consistent with WP-14's own precedent that "unknown" and "known but not owned" are distinct conditions; (2) the actual, testable security property this phase's Ground rule 4 and AC-03 require — results never crossing a vault boundary within one request/response — is enforced as strict per-request `vault_id`/`entity_id` scoping in every `entity-store`/`retrieval` call, proven by `test/memory-search-vault-scoping.security.mjs`'s four tests (FTS mode, hybrid/degraded mode, the exact-match short-circuit, and get/list/history/forget). What this does **not** provide, and is not claimed to: caller-ownership authorization — any caller that knows a real, mounted `vault_id` (from any source) can currently call any `msp_memory_*` tool against it, because the wire contract gives no way to check whether that caller is the vault's legitimate owner. This is a real gap versus a full multi-tenant authorization model, not a data-isolation bug; AC-03's literal requirement (data never crosses a vault boundary) is met. Remediation: a future work packet must decide whether to add caller identity to these six tools' wire shapes (an API-009 breaking change requiring a version bump) before this runtime is exposed to callers who should not be trusted with an arbitrary `vault_id`. |
| LOW | Documented gap vs. API-009's type definition | API-009 §3's `MemoryEntityHistoryEntry = MemoryEntity & {version}` implies every history entry carries the full `MemoryEntity` shape (`vault_id`, `category`, `key`, `lifecycle_state`, `decay_score`, `access_count`, `current_version`) plus `version`. The already-implemented (WP-12, unmodified by this packet) `entity_history` table and `historyRowToEntry()` do not persist `lifecycle_state`/`decay_score`/`access_count`/`current_version` per historical version at all — those are current-state-only columns on `entities`. | `msp_memory_history`'s handler backfills `vault_id`/`category`/`key` from the already-resolved current entity (these three ARE stable across a given `entity_id`'s versions), and intentionally **omits** the four current-state-only fields from each historical entry rather than fabricate plausible-but-wrong values for them. Recorded here per this packet's "no imagined capability" convention; a future phase that needs true per-version lifecycle/decay snapshots would need a schema change to `entity_history`, out of this packet's scope. |
| INFO | Environment finding, not a code/doc conflict | This sandbox's development machine actually has a live Ollama server, with a real `bge-m3` model, reachable at the default `http://localhost:11434` — contrary to what "no Ollama running at all" might suggest is the default dev environment. | No remediation needed; recorded so AC-05's "verify this is actually true, don't just assume it" instruction is answered honestly. Every degradation-focused test (`test/memory-search-degradation.test.mjs`, `test/memory-search-vault-scoping.security.mjs`) pins `OLLAMA_BASE_URL` to a freshly-bound-then-closed TCP port rather than relying on ambient absence, and the full suite was independently re-run a second time with `OLLAMA_BASE_URL=http://127.0.0.1:1` forced globally to confirm no test silently depends on the live server. |

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.3+draft | 2026-08-05 | Boss (CEO) | AC-09 closed: `execution_complete` set `true` after the dispatching/final-gate session independently reproduced the 158/158 test result (including a second full run with Ollama forced unreachable), independently re-ran `validate-docs.mjs`/`diff-check.mjs`, and independently confirmed the HIGH-severity caller-identity deviation by reading API-009 §4.1-4.6 directly. Presented to owner in chat with that deviation flagged; owner approved closure and elected to leave the caller-identity gap as a documented gap for a future work packet, not an urgent escalation. See the AC-09 closure note under Execution closure for the full record. |
| 0.1.2+draft | 2026-08-05 | Claude (WP-15 execution session) | Executed WP-15's Bounded Scope items 1-8: migration `0004_retrieval.sql` (`entities_fts` FTS5 + sync triggers, `embeddings`); `retrieval/fts.mjs`, `retrieval/vector.mjs` (fail-soft, circuit breaker), `retrieval/fusion.mjs` (RRF), `retrieval/retrieval-service.mjs` (façade); `transport/handlers/memory-handlers.mjs` (all six `msp_memory_*` tools); embedding-on-write; `test/dependency-boundaries.test.mjs` extended for `retrieval/`. 132 vitest + 26 `node --test` = 158/158 passing (baseline 92/92 reproduced first), `docs:validate` PASS, `diff-check` addressed by this Execution closure section. Recorded five Deviations: two documentation conflicts resolved per the API-009-wins-for-wire-shapes rule (`matched_by`/`"exact"` vs this packet's own `matchedBy`/`"atomic"` prose; the exact-match short-circuit's undocumented category/key gap), one HIGH-severity precondition gap (Bounded Scope item 6's `assertVaultScope`/`isVaultAccessibleTo` caller-ownership pattern cannot be built against API-009's actual memory-tool wire shapes, which carry no caller-identity field at all — data-isolation scoping was built and proven instead, caller-ownership authorization was not, and is flagged for a future work packet), one LOW documentation gap (`MemoryEntityHistoryEntry` fields `entity_history` does not persist), and one environment finding (this sandbox has a live Ollama server; AC-05 verified by explicit closed-port pinning, not ambient absence). `execution_complete` intentionally left `false` — AC-09 (independent review, owner approval before closure) remains the dispatching/final-gate session's and owner's to close. |
| 0.1.1+draft | 2026-08-05 | Boss (CEO) | Owner-authorized for execution in chat after WP-14 was committed (`feat/wp-14-vault-scoping-msp-runtime`, commit `30ee737`). `execution_authorized` set to `true`, `approval_recorded_at` set; `execution_complete` remains `false` pending independent verification after implementation. Authorization recorded before dispatch, per the process WP-14 established. |
| 0.1.0+draft | 2026-08-05 | Claude (final-gate session) | Proposed WP-15, scoped to Phase 3 (hybrid retrieval: FTS5, bge-m3 vectors via Ollama with fail-soft circuit breaker, RRF fusion, retrieval-service façade) plus API-009 §4.1-4.6's entity CRUD and search tools. Records the scope decision moving the five CRUD tools from Phase 5 into Phase 3 (search is untestable without a write path) and the ground-truth state of `packages/msp-runtime` as of 2026-08-05 so a session with no prior context can execute this packet. Execution remains unauthorized at proposal time. |
