---
title: "CR: THESEUS Canonical Home Correction"
doc_id: "CR-2026-08-12-THESEUS-CANONICAL-HOME-CORRECTION"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-12"
owner: "Boss (CEO)"
source_of_truth: true
proposal_author: "Claude (doc-architect override session)"
decision_owner: "THESEUS"
approval_owner: "Boss (CEO)"
approval_recorded_at: ""
decision_authorized: false
execution_authorized: false
execution_complete: false
promotion_authorized: false
complexity: "C-1"
access_scope: "H1"
risk: "MEDIUM"
baseline_commit: "53e9269"
parent_change_request: "none"
related_adrs: []
related_apis: []
proposed_work_packets: []
---

# CR: THESEUS Canonical Home Correction

## Context

`.agents/doc_writer/THESEUS.md` §Documentation Types is the canonical map from document type
to canonical filesystem home. Every doc-authoring path in this repository reads it, including
the repository-local `doc-architect` skill override at `.claude/skills/doc-architect/SKILL.md`.

While building that override on 2026-08-12 the declared homes were checked against the
working tree at commit `53e9269`. **Three rows are stale** and one row is declared but never
materialised. A generated document that follows the stale rows would be filed into a
directory that no existing document of that type uses, silently forking each home in two.

One of the three is also an internal contradiction: THESEUS's own §Source of Truth Order
item 8 cites `docs/operations/runbooks/RUNBOOK-GoVibe-Multi-Agent.md`, which disagrees with
the path its own §Documentation Types table declares for Runbooks.

A second is a cross-document conflict: `docs/STD-Document-Versioning-Governance.md` §9.1
names `docs/change-control/rca/` the canonical RCA home, while THESEUS names `docs/rca/`.
Both directories currently exist and both hold RCA files, so the split is already real.

### Evidence

Verified by direct filesystem inspection at commit `53e9269`, not read from a document:

| Doc type | THESEUS declares | Observed in tree | Files present |
|---|---|---|---|
| Runbook | `docs/runbooks/RUNBOOK-*.md` | `docs/operations/runbooks/` | 6 |
| RCA | `docs/rca/RCA-*.md` | both `docs/rca/` and `docs/change-control/rca/` | 2 and 1 |
| Migration plan | `docs/migrations/MIG-*.md` | `docs/migration/` (singular) | 2 |
| Test Plan | `docs/test-plans/TEST-PLAN-*.md` | directory absent | 0 repo-wide |

`docs/runbooks/`, `docs/migrations/`, and `docs/test-plans/` do not exist.

## Decision Requested

Approve correcting three rows of the THESEUS §Documentation Types table to the observed
canonical homes, and record the RCA split as a migration obligation.

| # | Row | From | To | Basis |
|---|---|---|---|---|
| 1 | Runbook | `docs/runbooks/RUNBOOK-*.md` | `docs/operations/runbooks/RUNBOOK-*.md` | 6 existing files; THESEUS §Source of Truth Order item 8 already cites this path |
| 2 | RCA | `docs/rca/RCA-*.md` | `docs/change-control/rca/RCA-*.md` | `STD-Document-Versioning-Governance.md` §9.1 names it canonical and outranks THESEUS |
| 3 | Migration plan | `docs/migrations/MIG-*.md` | `docs/migration/MIG-*.md` | 2 existing files |

The Test Plan row is **left unchanged**. `docs/test-plans/` is a forward declaration with no
files to contradict it; first use should create it as declared.

### Options considered

- **Option A (recommended)** — correct the table to observed reality. Zero file moves, zero
  broken inbound references, immediate effect on every future authoring run.
- **Option B** — move the files to match the table. Creates 8 file moves and breaks every
  inbound path reference; `docs:validate` path-reference checking would flag them until each
  referrer is updated. Rejected: the table is wrong, not the tree.
- **Option C** — do nothing and let each authoring session decide. Rejected: this is exactly
  how the RCA home forked in the first place.

## Scope & Bounded Changes

This change request authorizes edits to exactly one file:

- `.agents/doc_writer/THESEUS.md`
  - §Documentation Types: three table rows above.
  - Frontmatter: bump `version` `2.1.0` → `2.2.0`, set `last_update`.
  - Append a `## Changelog` row describing the correction.

And exactly one follow-on record:

- Register the `docs/rca/` → `docs/change-control/rca/` consolidation as a migration
  obligation, so the two RCA homes converge rather than persisting as a permanent split.

## Explicit Exclusions

This change request does **not** authorize:

- Moving, renaming, or deleting any document. The two RCA files under `docs/rca/` stay put
  until a separate migration is approved; this CR only records the obligation.
- Creating `docs/test-plans/`, `docs/runbooks/`, or `docs/migrations/`.
- Editing `docs/STD-Document-Versioning-Governance.md` or any other `docs/STD-*.md`.
- Changing `docs/DOC-VERSION-REGISTRY.md` rows for any affected document.
- Adding, removing, or renaming a document *type*. Only the home path of three existing
  types changes.
- Any change to `.claude/skills/doc-architect/SKILL.md`, which already encodes the observed
  homes plus a footnote recording this discrepancy. It becomes redundant once this CR lands,
  but removing the footnote is a later cleanup, not part of this change.

## Acceptance Criteria

- AC-01: `.agents/doc_writer/THESEUS.md` §Documentation Types lists
  `docs/operations/runbooks/RUNBOOK-*.md`, `docs/change-control/rca/RCA-*.md`, and
  `docs/migration/MIG-*.md`.
- AC-02: No row in that table names a directory that neither exists nor is an intentional
  forward declaration. Given `Given` the table after edit, `When` each path's parent
  directory is checked against the tree, `Then` only the Test Plan row resolves to an absent
  directory, and it is annotated as a forward declaration.
- AC-03: THESEUS §Source of Truth Order item 8 and §Documentation Types agree on the Runbook
  path.
- AC-04: `THESEUS.md` frontmatter `version` is `2.2.0` and the latest `## Changelog` row
  matches it.
- AC-05: `npm run docs:validate` reports PASS with no new errors or warnings attributable to
  `THESEUS.md`.
- AC-06: The RCA home consolidation is recorded as a tracked migration obligation with a
  named owner.

## Rollback

Revert the single-file diff to `.agents/doc_writer/THESEUS.md` and restore
`version: "2.1.0"`. No documents move under this CR, so there is nothing else to undo and no
evidence to capture beyond the diff itself. Re-run `npm run docs:validate` to confirm the
pre-change baseline is restored.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-12 | Boss (CEO) | Raise correction of three stale canonical-home rows in THESEUS.md, verified against the tree at commit 53e9269. |
