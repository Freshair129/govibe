---
title: "WP-14: Vault Scoping for msp-runtime Entities"
doc_id: "WP-14-VAULT-SCOPING-MSP-RUNTIME-ENTITIES"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-05"
owner: "Boss (CEO)"
proposal_author: "Claude (final-gate session)"
approval_owner: "Boss (CEO)"
source_of_truth: false
approval_recorded_at: ""
execution_authorized: false
execution_complete: false
complexity: "C-2"
access_scope: "H2"
risk: "HIGH"
parent_change_request: "CR-2026-08-04-PERSISTENT-MEMORY-MSP-RUNTIME"
depends_on: "WP-13-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-2"
related_adrs: ["ADR-027"]
related_apis: ["API-009"]
---

# WP-14: Vault Scoping for msp-runtime Entities

## Objective

Close the vault-scoping gap recorded as a HIGH-severity technical deviation
during WP-13's gate review: `packages/msp-runtime`'s `entities` table has no
`vault_id` column, no code path enforces vault scoping or returns
`vault_scope_denied`, and `promotions.idempotency_key` is a globally unique
column rather than one scoped per vault/agent — so two different agents
reusing the same `idempotency_key` collide, and the second agent's
`msp_memory_promote` call silently receives the *first* agent's
`promotion_ref`/`target_ref`. That is a cross-agent Global-Private
disclosure, not a cosmetic defect. This packet delivers the schema change,
the domain-layer id-derivation fix, the re-keyed `promotions` uniqueness
constraint, and the contract-layer enforcement needed to close that gap. The
risk being accepted is the risk of getting a security-relevant schema/
enforcement change wrong; the risk of *not* doing this work (leaving the
collision live) is the reason this packet is a blocking gate on further
multi-agent use, not an optional follow-up.

Reference: this packet's justification is recorded in
`docs/change-control/change-requests/work-packets/WP-13-Persistent-Memory-MSP-Runtime-Phase-2.md`'s
Deviations section (Deviation 2, technical) and in
`docs/api/API-009-Persistent-Memory-Contract.md` §6's amendment note, both
dated 2026-08-05.

## Preconditions

- WP-13 is execution-complete (Phase 2's eleven-tool `msp_*` contract
  surface exists in `packages/msp-runtime`), so there is a real `contracts/`
  layer and a real `promotions` table for this packet to modify rather than
  a hypothetical one.
- `docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md` (governing
  layering: `db <- domain <- retrieval`, `domain <- contracts`,
  `{db, domain, retrieval, contracts} <- transport`) remains the governing
  architecture record; this packet does not change that layering, only adds
  a scoping dimension within it.
- `docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md` §5 (Data Model)
  already documents `vaults.role` and `entities.vault_id` as canonical
  columns; the implemented schema (`packages/msp-runtime/src/db/migrations/`)
  does not yet match that record for either column. This packet brings the
  implementation into alignment with the already-approved design, it does
  not propose a new design.

## Bounded scope

1. **Migration `0003`** adding `entities.vault_id` (`FK -> vaults`) and
   replacing `entities`' `UNIQUE(category, key)` constraint with
   `UNIQUE(vault_id, category, key)`. If `entity_history` mirrors the
   `(category, key)` uniqueness shape rather than only `(entity_id,
   version)`, apply the corresponding change there too; if it does not (its
   current uniqueness is `UNIQUE(entity_id, version)`, which already
   presupposes a vault-scoped `entity_id`), record that no change was needed
   and why.
2. **Fold `vault_id` into the entity-id derivation** in
   `domain/entity-store.mjs`'s `computeEntityId` (currently
   `sha256(["entity", category, key].join(NUL))`, ignoring vault entirely).
   The new derivation must include `vault_id` so two different vaults never
   collide on the same `(category, key)` pair's `entity_id`, matching the
   `UNIQUE(vault_id, category, key)` constraint from item 1.
3. **Re-key `promotions` to `UNIQUE(vault_id, idempotency_key)`**, replacing
   the current global `UNIQUE(idempotency_key)`. This is the fix for the
   cross-agent collision this packet exists to close: after this change, two
   different vaults (agents) may reuse the same `idempotency_key` value
   without colliding, while idempotent retry within the same vault still
   returns the same `promotion_ref`/`target_ref` it did before.
4. **Enforce vault scoping in `contracts/`**, returning the
   `vault_scope_denied` error documented in API-009 §5/§6: reject a request
   whose `vault_id` is not mounted for the caller *before* the request
   reaches `domain/`, for every tool in this contract's surface that accepts
   a `vault_id` (directly, or via `vault: { vault_id, vault_type }`).
5. **Add the missing `vaults.role` column**, per
   `docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md` §5 (Data Model
   table, `vaults` row, line ~119), which already documents `role` as a key
   column that the current `0002_phase2.sql` `vaults` table does not have.

## Explicit exclusions

- Any change to the `msp_*`/`msp_memory_*` wire request/response shapes
  beyond the new `vault_scope_denied` error path already documented in
  API-009 §5 — this packet implements an existing documented error, it does
  not add a new one.
- Any change to `domain/temporal-engine.mjs`, retrieval (`retrieval/`,
  Phase 3), decay lifecycle (Phase 4), or links/bridge work (Phase 5).
- Any relaxation of `msp_knowledge_promote` / `msp_memory_promote
  (target_scope=shared)`'s fail-closed `gks_provider_unconfigured` stub —
  vault scoping is orthogonal to, and does not touch, the GKS-provider
  boundary ADR-023/ADR-027 establish.
- Backfilling `vault_id` for any pre-existing `entities`/`promotions` rows
  from a prior phase's manual testing. If such rows exist in a shared
  development database at execution time, the migration strategy for them
  (assign a default vault, or treat the migration as schema-only against an
  empty/dev-only database) must be decided and recorded during execution,
  not silently assumed here.
- Pointing `GOVIBE_MSP_COMMAND` at `packages/msp-runtime` in GoVibe's actual
  runtime configuration — unchanged from WP-12/WP-13's exclusion; still a
  separate, later decision.

## Acceptance and exit gate

- AC-01: migration `0003` applies idempotently; `entities.vault_id` exists
  with a foreign-key reference to `vaults`; `UNIQUE(vault_id, category,
  key)` replaces the old `UNIQUE(category, key)` constraint, verified by a
  test that two different vaults can hold an entity with the same
  `(category, key)` without conflict, and that the same vault cannot.
- AC-02: `domain/entity-store.mjs`'s entity-id derivation includes
  `vault_id`; two entities with identical `category`/`key` in different
  vaults receive different `entity_id` values, verified by a direct test.
- AC-03: `promotions` is re-keyed to `UNIQUE(vault_id, idempotency_key)`;
  a test proves the specific collision this packet exists to close is gone:
  two different vaults using the same `idempotency_key` each get their own
  `promotion_ref`/`target_ref`, while a retry within the same vault and same
  `idempotency_key` still returns the original `promotion_ref`/`target_ref`
  (idempotent-retry behavior from WP-13 AC-04 is preserved, not broken).
- AC-04: every tool accepting a `vault_id` (directly or via `vault:
  {vault_id, vault_type}`) returns `vault_scope_denied` (API-009 §5) when
  the caller's `vault_id` is not mounted, verified against the real running
  process, not only in-process unit calls.
- AC-05: `vaults.role` column exists, matching
  `docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md` §5's `vaults` row.
- AC-06: the dependency-boundary test (extended from WP-12/WP-13) continues
  to pass for `db`, `domain`, `contracts`, `transport` and fails closed if a
  future edit violates the layering rule; this packet's new `contracts/`
  enforcement code is covered by that test.
- AC-07: required test/lint/build/docs-validation/diff-check gates pass
  (`vitest` for `*.test.mjs`; `node --test` for any `*.security.mjs` this
  packet adds — the vault-scope-denial and idempotency-collision checks in
  AC-03/AC-04 are adversarial/boundary tests and should live as
  `*.security.mjs` per repo convention, not `*.test.mjs`).
- AC-08: independent review and owner approval recorded before closure —
  before, not after, unlike the process deviation this packet exists partly
  to remediate (see WP-13's Deviations section).

## Rollback

Capture pre-change source hashes and inverse patches before any runtime or
test mutation. Because this packet only extends the still-unwired
`packages/msp-runtime` package (no `GOVIBE_MSP_COMMAND` wiring, per Explicit
Exclusions) and its schema change is additive plus one constraint re-key,
rollback is a revert of this packet's commit(s) plus a downgrade migration
restoring the prior `UNIQUE(category, key)` / `UNIQUE(idempotency_key)`
constraints and dropping `entities.vault_id`/`vaults.role`. If an approved
rollback trigger occurs after a later phase has begun depending on this
packet, restore the exact prior state, rerun the approved baseline, and
record the trigger without widening scope or restoring an authority bypass.

## Owner accepted-risk record

Not applicable. This packet is not authorized for execution
(`execution_authorized: false`); no residual risk has been accepted yet.
This packet is itself the remediation of a previously accepted-without-
authorization risk (WP-13's Deviation 2); it must not repeat WP-13's
process deviation of executing before authorization.

## Execution closure

Not yet executed.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-05 | Claude (final-gate session) | Proposed WP-14: vault scoping for `packages/msp-runtime` entities, closing the HIGH-severity technical deviation recorded during WP-13's gate review (no `entities.vault_id`, no `vault_scope_denied` enforcement, globally-unique `promotions.idempotency_key` causing cross-agent Global-Private disclosure). Scoped to migration `0003`, entity-id derivation, `promotions` re-keying, `contracts/` enforcement, and the missing `vaults.role` column. Gated: must land and be independently verified before any real multi-agent use of `msp_memory_promote`. Execution remains unauthorized at proposal time. |
