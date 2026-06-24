---
doc_id: "FEAT-DOC-CONTENT-INTEGRITY"
uid: "01KVXGFTXY8AKW2G0PRBAM83Z9"
title: "Doc Content Integrity (atom-merkle drift gate)"
status: "approved"
version: "0.1.0+draft"
content_hash: "atom:476f4bca92947bd4"
updated: "2026-06-25"
owner: "ATHER"
type: feat
related_docs:
  - "docs/adr/ADR-021-doc-identity-model.md"
  - "docs/features/genesis-knowledge-system/FEAT-GKS-Node-Identity.md"
  - "docs/adr/ADR-007-Deterministic-Governance.md"
  - "docs/DOC-VERSION-REGISTRY.md"
---

# Doc Content Integrity (atom-merkle drift gate)

> GoVibe consumer of [[FEAT-GKS-NODE-IDENTITY]] / [[ADR-021-DOC-IDENTITY-MODEL]]. Applies the
> content-address primitive to the doc corpus as a `validate` gate. **Blocked pending ADR-021
> ratification** — no implementation until the contract is Accepted.

## 1. Purpose

Detect **content drift**: a doc body edited without bumping its `version`. Today `validate` checks
only that frontmatter↔registry versions are *consistent*, not that the recorded version still matches
the *content* — so silent staleness is undetected.

## 2. Scope

**In (this FEAT):** `content_hash` frontmatter field on governed `docs/**`, a `validate` drift gate,
a deterministic `docs:hash` backfill, and `docs:bump` recomputing the hash on every bump.
**Out:** `uid` minting and reference-by-id migration (foundation — [[FEAT-GKS-NODE-IDENTITY]]); atom
store persistence + JIT (GenesisBlockDB epic).

### Functional Requirements

- **FR-1:** `content_hash` (per [[FEAT-GKS-NODE-IDENTITY]] FR-2) is stored in each governed doc's
  frontmatter.
- **FR-2:** `validate` recomputes the hash and **errors** when it mismatches (`content drifted — run
  docs:bump`); a missing hash is a warning until backfilled.
- **FR-3:** `docs:bump` recomputes + writes `content_hash` on every bump, so version and hash always
  move together.
- **FR-4:** the hash excludes frontmatter + the Changelog section, so version bumps and crosslink
  edits never register as drift.

## 3. Acceptance Criteria

- Editing a doc body without bumping → `npm run docs:validate` FAILS with a drift error.
- Running `docs:bump` after the edit → validate PASSES (hash recomputed).
- Adding a Changelog row / `related_docs` entry alone → no drift error.

## 4. Success Criteria

- Drift is impossible to merge undetected (gate runs in pre-commit + CI alongside the existing
  location/registration gates).

## 5. Definition of Done

- ADR-021 Accepted; `content_hash` backfilled across governed `docs/**`; drift gate green in
  `baseline:check`; negative test (edit-without-bump → FAIL) proven.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-25 | ATHER | Drafted the doc content-drift gate (atom-merkle content_hash + validate gate + docs:hash + bump-sync), depending on FEAT-GKS-Node-Identity / ADR-021. Implementation blocked pending ratification. |
