---
title: "WP-16: Persistent-Memory MSP Runtime — Phase 4 (Temporal Decay Lifecycle)"
doc_id: "WP-16-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-4"
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
complexity: "C-2"
access_scope: "H3"
risk: "MEDIUM"
parent_change_request: "CR-2026-08-04-PERSISTENT-MEMORY-MSP-RUNTIME"
depends_on: "WP-15-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-3"
related_adrs: ["ADR-027", "ADR-020"]
related_apis: ["API-009"]
---

# WP-16: Persistent-Memory MSP Runtime — Phase 4 (Temporal Decay Lifecycle)

## Objective

Deliver Phase 4: Ebbinghaus-style decay scoring and the
`active -> decayed -> archived -> forgotten` lifecycle for
`packages/msp-runtime`'s entities, exposed through `msp_memory_decay_tick`
(API-009 §4.7). The risk being accepted is that a decay policy which is too
aggressive silently removes memories an agent still needs from default
recall. That risk is bounded by three properties this packet must preserve:
decay is **caller-triggered, never a background daemon**; archival is
**reversible** (rows are never hard-deleted); and `dry_run` must let an
operator see exactly what a sweep would do before it does it.

## Ground truth as of 2026-08-05 (verify before editing; do not assume)

This packet is written to be executable by a session with no prior context.
State of `packages/msp-runtime` after WP-12/13/14 (and, by the time this
packet runs, WP-15):

- **Test baseline before WP-15**: 92 tests passing (70 vitest + 22
  `node --test`). WP-15 will have raised this; re-measure the real baseline
  with `npm test` inside `packages/msp-runtime` before starting, and treat
  whatever it is as the no-regression floor.
- **`entities` already has** `decay_score REAL NOT NULL DEFAULT 1.0`,
  `lifecycle_state TEXT NOT NULL DEFAULT 'active'`, and
  `access_count INTEGER NOT NULL DEFAULT 0` (created in `0001_init.sql`,
  carried through `0003_vault_scoping.sql`'s table rebuild). **Do not add
  these columns again.** There is **no `last_accessed_at` column** — this
  packet adds it.
- **`lifecycle_state` currently has no CHECK constraint** and only two
  values are ever written today: `'active'` (default) and `'forgotten'`
  (by `domain/entity-store.mjs`'s `forget()`). `'decayed'` and `'archived'`
  are new in this packet.
- **`domain/entity-store.mjs`'s `forget()` already sets
  `lifecycle_state = 'forgotten'`** as a soft delete, and WP-12's tests
  assert forgotten rows are excluded from default `list()` but remain
  reachable via `history()`. The decay lifecycle's terminal state is the
  same value — see the reconciliation requirement in Bounded scope item 4.
- **Layering rule**, enforced by `test/dependency-boundaries.test.mjs`:
  `db <- domain <- retrieval`, `domain <- contracts`,
  `{db, domain, retrieval, contracts} <- transport`; `domain` never imports
  `retrieval` or `contracts`; `server.mjs` is the composition root
  (excluded). The decay engine belongs in `domain/`, so it must not import
  `retrieval/` — if decay needs to know an entity was read by a search, the
  transport handler passes that in, it is not pulled across the layer.
- **Wire contract**: newline-delimited JSON-RPC 2.0 over stdio matching
  `packages/govibe-core/src/msp-stdio-transport.mjs` (readline, one JSON
  object per line) — **not** the Content-Length/LSP framing
  `scripts/mcp/govibe-mcp-server.mjs` uses for its own inbound server.
- **Test conventions**: `*.test.mjs` run under `vitest`; `*.security.mjs`
  run under `node --test` via this package's own `test:security` script.
  Adversarial/boundary assertions belong in `*.security.mjs`.

## Preconditions

- WP-15 is execution-complete and independently verified. Phase 4's
  touch-on-access behavior (Bounded scope item 3) modifies handlers WP-15
  creates; running Phase 4 first would mean editing files that do not exist.
- `docs/api/API-009-Persistent-Memory-Contract.md` §4.7 defines
  `msp_memory_decay_tick`'s exact request/response shape, including its
  `dry_run` parameter. Read that section directly — it is the wire contract,
  not a summary.
- `docs/adr/ADR-020-Per-Agent-Memory-Unit.md` is the governing decision for
  per-agent memory shape and is the origin of the tiered/decay concept being
  ported here. Read its constraints — in particular, this packet implements
  decay scoring only; ADR-020's `T0`/`T1`/`T2` tiering, 8-8-8 distillation
  cadence, and LCA conflict resolution remain explicitly out of scope (see
  Explicit exclusions).

## Bounded scope

1. **Migration `0005_decay_lifecycle.sql`**:
   - Add `entities.last_accessed_at TEXT` (nullable; NULL means "never read
     since creation", which the scorer must handle explicitly rather than
     coercing to epoch zero).
   - Add a `CHECK` constraint restricting `lifecycle_state` to
     `('active', 'decayed', 'archived', 'forgotten')`. Note that
     `0003_vault_scoping.sql` used the SQLite rebuild pattern
     (`CREATE TABLE ... INSERT ... DROP ... RENAME`) precisely because a
     table-level constraint cannot be added by `ALTER TABLE`; follow that
     established pattern, and re-create any `entities_fts` triggers WP-15
     added (WP-15's migration is required to leave a comment saying so —
     if it did not, record that as a finding).
   - An index supporting the sweep query (decay score and/or lifecycle
     state), if the sweep's query plan warrants one.

2. **`domain/decay-engine.mjs`** — a pure, deterministic scorer plus the
   sweep logic:
   - `recomputeDecayScore(entity, now)` implementing Ebbinghaus-style
     retention (score decreasing with elapsed time since last access,
     reinforced by `access_count`). **Must be a pure function of its inputs
     with an explicitly injected `now`** — no `Date.now()` inside, so tests
     are deterministic under a fake clock rather than timing-dependent.
   - `runDecayTick(db, {vaultId, dryRun, now, thresholds})` recomputing
     scores and applying threshold-crossing transitions
     `active -> decayed -> archived`, returning a per-state count and the
     affected entity refs. `dryRun: true` computes and returns exactly what
     would change **without writing anything** — verified by a test that
     asserts the DB is byte-identical before and after a dry run.
   - `touch(db, entityId, now)` bumping `access_count` and
     `last_accessed_at` (reinforcement on read).

3. **Reinforcement on access**: wire `touch()` into the read paths WP-15
   built — at minimum `msp_memory_get` and `msp_memory_search` result hits.
   Because `domain/` may not import `retrieval/`, the wiring belongs in the
   transport handler, which already has both collaborators in hand.

4. **Reconcile `forgotten` with `forget()`** (do not skip this): the manual
   `forget()` path and the decay lifecycle's terminal state write the same
   `lifecycle_state = 'forgotten'` value, but they mean different things
   (explicit operator/agent intent vs. automatic expiry). Decide and record
   one of: (a) decay's terminal state stops at `archived` and never
   auto-writes `forgotten`, leaving `forgotten` exclusively for explicit
   intent — **this is the recommended resolution**, since it keeps automatic
   processes from ever masquerading as deliberate deletion; or (b) both
   write `forgotten` and a separate column distinguishes the cause. Whichever
   is chosen, state it plainly in the execution report and make it visible in
   the code, not implicit.

5. **`msp_memory_decay_tick` handler** (API-009 §4.7) in the existing
   `transport/handlers/memory-handlers.mjs` from WP-15, vault-scoped through
   the same `contracts/vault-scope-guard.mjs` + `isVaultAccessibleTo`
   pattern WP-14 established (handler computes the boolean, guard receives
   it — `contracts/` must not import `domain/vault-registry.mjs`). Writes
   one `journal` row per invocation, including for `dry_run` calls (an
   operator asking "what would this do" is itself an auditable event).

6. **Default-recall exclusion**: archived entities must be excluded from
   `msp_memory_list` and `msp_memory_search` by default, while remaining
   retrievable by an explicit `lifecycle_state` filter and always reachable
   through `msp_memory_history`. Nothing in this packet may hard-delete a
   row from `entities` or `entity_history`.

## Explicit exclusions

- Any background scheduler, cron, timer, or self-triggering sweep.
  `msp_memory_decay_tick` is **caller-triggered only** — the process must not
  grow a daemon loop. Operational scheduling guidance belongs in
  `docs/operations/runbooks/RUNBOOK-Persistent-Memory-Runtime.md`, not in
  this runtime's process.
- ADR-020's `T0`/`T1`/`T2` tiering, 8-8-8 distillation cadence, LCA
  (Latched Contextual Anchor) conflict resolution, and epistemic-state
  transitions. The `epistemic_state` column exists and is written on upsert,
  but this packet does not make decay drive it.
- `domain/links.mjs`, the two `links` tools, the GoVibe-side bridge, and the
  Mission Control Domain E dashboard — Phase 5, WP-17.
- Re-embedding, re-indexing, or any retrieval-quality change. Decay adjusts
  scores and lifecycle state; it must not touch `embeddings` or
  `entities_fts` beyond whatever the existing sync triggers do on their own.
- Hard deletion / vacuum / purge of any kind.
- Any relaxation of the `gks_provider_unconfigured` fail-closed stubs.
- Pointing `GOVIBE_MSP_COMMAND` at `packages/msp-runtime` in GoVibe's real
  runtime configuration.
- Any file outside `packages/msp-runtime/**`.

## Acceptance and exit gate

- AC-01: migration `0005_decay_lifecycle.sql` applies idempotently through
  the existing runner (checksum-drift and downgrade guards unmodified);
  `last_accessed_at` exists; the `lifecycle_state` CHECK constraint rejects
  an out-of-enum value; any `entities_fts` triggers survive the rebuild,
  verified by a test that mutates `entities` post-migration and asserts the
  FTS projection still follows.
- AC-02: `recomputeDecayScore` is proven deterministic under an injected
  clock — the same inputs produce the same score across runs, and a test
  covers at minimum: a never-accessed entity, a just-accessed entity, an
  entity at each threshold boundary, and a high-`access_count` entity
  decaying more slowly than a low-`access_count` one of the same age.
- AC-03: a full lifecycle-transition test advances a fake clock and asserts
  an untouched entity crosses `active -> decayed -> archived` at the
  expected thresholds, while a periodically-touched entity does not.
- AC-04: `dry_run: true` changes nothing — asserted by comparing the
  relevant table state before and after, not merely by trusting the returned
  counts.
- AC-05: archived entities are excluded from default `msp_memory_list` /
  `msp_memory_search` results, still returned under an explicit
  `lifecycle_state` filter, and always present in `msp_memory_history`.
  No row is ever hard-deleted by this packet's code paths.
- AC-06: `msp_memory_decay_tick` is vault-scoped — a sweep scoped to vault A
  never alters an entity in vault B. This is a security-relevant assertion
  (it is the same isolation class WP-14 closed) and belongs in a
  `*.security.mjs` file.
- AC-07: the `forgotten`-state reconciliation from Bounded scope item 4 is
  implemented, tested, and stated explicitly in the execution report.
- AC-08: no regression against the WP-15 test baseline; report the final
  count and how many pre-existing tests required modification and why.
- AC-09: required test/lint/build/docs-validation/diff-check gates pass.
- AC-10: independent review and owner approval recorded **before** closure.

## Rollback

Capture pre-change source hashes and inverse patches before any runtime or
test mutation. Rollback is a revert of this packet's commit(s) plus a
downgrade migration dropping `last_accessed_at` and the `lifecycle_state`
CHECK constraint (via the same rebuild pattern), restoring the prior
`entities` shape. Because no row is ever hard-deleted, no data is
unrecoverable by a rollback; entities left in `decayed`/`archived` state by a
pre-rollback sweep must be reset to `active` by the downgrade migration, and
that reset must be stated in the rollback record.

## Owner accepted-risk record

Authorized 2026-08-05 by Boss (CEO), owner and approval owner, in the
resuming session's chat channel (directive: "เริ่ม WP-16" — start WP-16),
after that session presented this packet's Ground truth section, Bounded
scope, and risk framing (caller-triggered only, reversible archival, `dry_run`
required) for review. Recorded here, in frontmatter, before implementation is
dispatched, per the process correction established by WP-14 (and the
deviation recorded in WP-13): an executing session must not set its own
`execution_authorized` / `execution_complete` flags. This entry sets
`execution_authorized` only; `execution_complete` remains false until
independent post-execution verification is recorded separately.

## Execution closure

Not yet executed.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1+draft | 2026-08-05 | Boss (CEO) | Owner-authorized for execution in chat ("เริ่ม WP-16"), with WP-15 already execution-complete and independently verified on `feat/wp-15-msp-runtime-phase-3` (commit `9bb5a6a`). `execution_authorized` set to `true`, `approval_recorded_at` set; `execution_complete` remains `false` pending independent verification after implementation. Authorization recorded before dispatch, per the process WP-14 established. |
| 0.1.0+draft | 2026-08-05 | Claude (final-gate session) | Proposed WP-16, scoped to Phase 4 (Ebbinghaus decay scoring, `active -> decayed -> archived -> forgotten` lifecycle, reinforcement-on-access, `msp_memory_decay_tick` per API-009 §4.7). Records the ground-truth state of `packages/msp-runtime` as of 2026-08-05, the pre-existing decay columns not to re-add, the missing `last_accessed_at` column, and an explicit requirement to reconcile the decay lifecycle's terminal state with the existing manual `forget()` path rather than silently overloading `forgotten`. Caller-triggered only — no background daemon. Execution remains unauthorized at proposal time. |
