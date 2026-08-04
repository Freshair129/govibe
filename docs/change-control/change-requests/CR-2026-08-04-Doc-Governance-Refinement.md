---
title: "CR: Documentation Governance Refinement"
doc_id: "CR-2026-08-04-DOC-GOVERNANCE-REFINEMENT"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-04"
owner: "Boss (CEO)"
source_of_truth: true
proposal_author: "Claude (final-gate session)"
decision_owner: "Boss (CEO)"
approval_owner: "Boss (CEO)"
approval_recorded_at: ""
decision_authorized: false
execution_authorized: true
execution_complete: true
promotion_authorized: false
complexity: "C-2"
access_scope: "H2"
risk: "MEDIUM"
baseline_commit: ""
parent_change_request: "none"
related_adrs: []
related_apis: []
proposed_work_packets: []
---

# CR: Documentation Governance Refinement

## Context

GoVibe's documentation governance has grown organically: `docs/STD-Document-Versioning-Governance.md`
defines the metadata/versioning contract, `scripts/docs/validate-docs.mjs` enforces a subset of it,
and `docs/DOC-VERSION-REGISTRY.md` tracks canonical documents. A review of that stack found several
small but real gaps:

- Change Request (CR) and Work Packet (WP) artifacts have no canonical templates, even though
  `docs/change-control/change-requests/` has become the de facto home for new CRs (see
  `docs/change-control/change-requests/CR-2026-08-02-Multi-Provider-Entitlement-Routing.md` and the
  `work-packets/` subfolder) while an older `docs/change-requests/` tree still holds legacy CRs.
- The validator's `governedDocPatterns` list does not cover the new CR/WP home, so new CRs only get
  warning-level frontmatter enforcement instead of error-level.
- `docs/STD-Document-Versioning-Governance.md` does not state which directory is canonical for new
  CR/WP, RCA, and audit artifacts, and its Section 13 status enum is missing `proposed` and
  `candidate`, both of which are already used in practice (e.g. `docs/adr/ADR-020-Per-Agent-Memory-Unit.md`
  uses `status: proposed`; the roadmap promotion contract in `validate-docs.mjs` already allows
  `candidate`).
- `docs/adr/ADR-020-Per-Agent-Memory-Unit.md` references a `docs:register` → `docs:ratify` command
  pair that does not exist in this repository's `package.json` or scripts.
- `CLAUDE.md`'s "Canonical governance axes" section claims RWANG PROMAX is canonical for Execution
  Governance and `docs/STD-Execution-Governance.md` is a mirror. This is stale: `docs/STD-Execution-Governance.md`
  v2.4.0+ga Section 12.1 and `docs/DOC-VERSION-REGISTRY.md` Section 1 both already state GoVibe is
  canonical and RWANG-PROMAX holds a read-only mirror.
- `docs/design/SITE_MAP.md` and `docs/design/DOMAIN_DETAILS.md` are real, actively-referenced design
  documents with no governance frontmatter at all, so they are invisible to the registry and to
  `docs:validate`'s frontmatter checks.
- `scripts/docs/diff-check.mjs`'s `classify()` function tests a generic `^docs\/` pattern before its
  masterplan-specific patterns (roadmap, `STD-*`, `DOC-VERSION-REGISTRY.md`, `.agents/pm/**`), so the
  masterplan branch is unreachable dead code.
- `docs/DOC-VERSION-REGISTRY.md` Section 9 states change-request artifacts are "not required in this
  registry," which contradicts Section 3's actual practice of registering CRs that carry decision
  authority (e.g. the Execution-Binding v1 lifecycle CR).

None of these are behavioral bugs in running code; they are documentation-governance debt that makes
the doc system harder to trust and easier to drift.

## Decision Requested

Approve the bounded refinement executed under this CR (T1-T10 below), all already applied as
documentation-only changes with `node scripts/docs/validate-docs.mjs` passing at 0 errors before and
after. This CR records the change-set for owner review; it does not request authorization for any
runtime, code, or policy change, and it does not promote any other document's lifecycle status.

## Scope & Bounded Changes

1. **T1** - Added `.agents/doc_writer/template/CR-template.md`, a canonical CR template based on the
   frontmatter and section set of `docs/change-requests/CR-2026-08-03-Execution-Binding-v1-Lifecycle-and-Legacy-Sunset-Decision.md`.
2. **T2** - Added `.agents/doc_writer/template/WP-template.md`, a canonical WP template based on the
   structure of the existing `WP-NN-*.md` files in `docs/change-control/change-requests/work-packets/`.
3. **T3** - Registered both templates in `requiredTemplates` in `scripts/docs/validate-docs.mjs`, and
   added a `governedDocPatterns` entry for CR files directly under `docs/change-control/change-requests/`
   (top-level only; see Section "Deviations" below) so new CRs get error-level frontmatter
   enforcement. The legacy `docs/change-requests/` tree is intentionally excluded.
4. **T4** - Added Section 9.1 "Canonical Artifact Homes" to `docs/STD-Document-Versioning-Governance.md`,
   naming `docs/change-control/change-requests/` as the canonical home for new CR/WP artifacts,
   `docs/change-requests/` as frozen legacy, `docs/change-control/rca/` as the RCA canonical home, and
   `docs/assurance/audit/` as the audit canonical home.
5. **T5** - Added `proposed` and `candidate` to the allowed status values in Section 13 of the same
   STD file, with one-line definitions, and a note that the roadmap promotion contract in
   `validate-docs.mjs` restricts roadmap docs to the subset `{draft, candidate, approved, superseded,
   deprecated}`.
6. **T6** - Replaced the dead `docs:register` / `docs:ratify` reference in `docs/adr/ADR-020-Per-Agent-Memory-Unit.md`'s
   Status section with the actual acceptance procedure (owner-approval frontmatter fields plus a
   `docs/DOC-VERSION-REGISTRY.md` row update). ADR-020's `status` remains `proposed`; acceptance is
   still the owner's call.
7. **T7** - Reversed the stale "Canonical governance axes" authority statement in `CLAUDE.md` to match
   `docs/STD-Execution-Governance.md` v2.4.0+ga Section 12.1: GoVibe's file is canonical, RWANG-PROMAX
   holds the read-only mirror.
8. **T8** - Backfilled 7-field governance frontmatter and a Changelog table into
   `docs/design/SITE_MAP.md` (`DESIGN-SITE-MAP`, approved, `1.0.0`) and `docs/design/DOMAIN_DETAILS.md`
   (`DESIGN-DOMAIN-DETAILS`, approved, `1.0.0`), and registered both in `docs/DOC-VERSION-REGISTRY.md`
   Section 3. Body content of both files is unchanged.
9. **T9** - Reordered `classify()` in `scripts/docs/diff-check.mjs` so the masterplan-specific patterns
   are tested before the generic `docs/` pattern, making the previously unreachable masterplan branch
   reachable. Behavior for non-masterplan docs/code/other files is unchanged.
10. **T10** - Amended `docs/DOC-VERSION-REGISTRY.md` Section 9 so it states that change requests
    carrying decision authority are registered (matching Section 3 practice), while feedback and
    work-packet artifacts remain optional to register.

All touched governed documents (`docs/STD-Document-Versioning-Governance.md`, `docs/adr/ADR-020-Per-Agent-Memory-Unit.md`,
`docs/DOC-VERSION-REGISTRY.md`, the two design docs) received a version bump and a Changelog row, and
`docs/DOC-VERSION-REGISTRY.md` rows were kept in sync with each touched document's frontmatter.

### Deviation from the requesting brief

T3's brief asked for a `governedDocPatterns` entry "covering `docs/change-control/change-requests/`."
A pattern matching that whole subtree recursively would also govern
`docs/change-control/change-requests/work-packets/**` and `docs/change-control/change-requests/feedback/**`,
which include six pre-existing WP files and six pre-existing feedback files that predate this
refinement and do not have a `## Changelog` section. Applying error-level enforcement to them would
have failed `docs:validate` immediately, and fixing those unrelated files was out of this CR's bounded
scope (and out of the "do not touch files not listed" instruction under which this refinement was
executed). The applied pattern therefore matches only files directly under
`docs/change-control/change-requests/` (i.e. `CR-*.md` at that top level), which still delivers
error-level enforcement for new CRs - including this one - without breaking the pre-existing WP/feedback
files. Extending enforcement to `work-packets/` and `feedback/` is left to a follow-up CR that first
brings those files into Changelog compliance.

## Explicit Exclusions

- Full frontmatter backfill for the remaining ~55 in-scope Markdown files that still lack governance
  frontmatter (only the two files named in T8 were backfilled here).
- Warning-debt cleanup: the ~80 existing "Task-driving doc has no explicit Acceptance/Success
  Criteria / Definition of Done section" warnings are unchanged by this CR.
- Any CI workflow addition to run `docs:validate` / `diff:check` automatically.
- A full fix of the THESEUS.md `Documentation Types` location table (e.g. adding CR/WP rows to that
  table) beyond registering the two new templates in the validator.
- Any runtime, code, policy, or lifecycle-promotion change. This CR is documentation-governance
  tooling and standards text only.
- Extending error-level `governedDocPatterns` enforcement to `docs/change-control/change-requests/work-packets/`
  and `docs/change-control/change-requests/feedback/` (see Deviation note above).

These are deferred to a follow-up CR.

## Acceptance Criteria

- AC-01: `.agents/doc_writer/template/CR-template.md` and `.agents/doc_writer/template/WP-template.md`
  exist, are registered in `requiredTemplates`, and are internally consistent with the Execution-Binding
  CR and WP-11 examples they were modeled on.
- AC-02: New CR files placed directly under `docs/change-control/change-requests/` receive error-level
  frontmatter/Changelog enforcement from `docs:validate`; the legacy `docs/change-requests/` tree is
  unaffected.
- AC-03: `docs/STD-Document-Versioning-Governance.md` names the canonical homes for CR/WP, RCA, and
  audit artifacts, and its status enum includes `proposed` and `candidate` with the roadmap-subset
  note.
- AC-04: `docs/adr/ADR-020-Per-Agent-Memory-Unit.md` no longer references a nonexistent command; its
  `status` is unchanged.
- AC-05: `CLAUDE.md`'s governance-axes statement matches `docs/STD-Execution-Governance.md` Section 12.1.
- AC-06: `docs/design/SITE_MAP.md` and `docs/design/DOMAIN_DETAILS.md` carry full governance
  frontmatter, are registered in `docs/DOC-VERSION-REGISTRY.md`, and have unchanged body content.
- AC-07: `scripts/docs/diff-check.mjs`'s masterplan branch is reachable for a file such as
  `docs/STD-Execution-Governance.md` or `docs/DOC-VERSION-REGISTRY.md`.
- AC-08: `docs/DOC-VERSION-REGISTRY.md` Section 9 no longer contradicts Section 3's registration
  practice for decision-bearing CRs.
- AC-09: `node scripts/docs/validate-docs.mjs` exits 0 (errors: 0) both before and after this CR's
  changes, with the warning count unchanged (80).

## Rollback

Every change in this CR is a Markdown or `.mjs` diff with no runtime behavior change. Rollback is a
revert of this CR's commit(s):

- Revert `scripts/docs/validate-docs.mjs` and `scripts/docs/diff-check.mjs` to their pre-CR state.
- Delete `.agents/doc_writer/template/CR-template.md` and `.agents/doc_writer/template/WP-template.md`.
- Revert the frontmatter/Changelog additions in `docs/design/SITE_MAP.md` and `docs/design/DOMAIN_DETAILS.md`,
  and remove their two rows from `docs/DOC-VERSION-REGISTRY.md` Section 3.
- Revert the Section 9.1 addition and Section 13 status-enum addition in
  `docs/STD-Document-Versioning-Governance.md`, and its version/Changelog row.
- Revert the Status-section correction in `docs/adr/ADR-020-Per-Agent-Memory-Unit.md`, and its
  version/Changelog row.
- Revert the governance-axes correction in `CLAUDE.md`.
- Revert the Section 9 wording change in `docs/DOC-VERSION-REGISTRY.md`, and its version/Changelog
  row, and remove this CR's own registry row.
- Re-run `node scripts/docs/validate-docs.mjs` after any rollback step to confirm it still exits 0.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-04 | Claude (final-gate session) | Recorded the bounded documentation-governance refinement (T1-T10): CR/WP templates, validator registration and governed-pattern scoping, canonical artifact-home and status-enum additions to STD-Document-Versioning-Governance, ADR-020 dead-command fix, CLAUDE.md authority-statement correction, design-doc frontmatter backfill, diff-check.mjs classify() reordering, and the registry Section 9 contradiction fix. `node scripts/docs/validate-docs.mjs` passes with 0 errors before and after. |
