---
title: "CR: Phase 2 Semantic and Authority Decision Packet"
doc_id: "CR-2026-08-03-PHASE2-SEMANTIC-AUTHORITY-DECISION-PACKET"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-03"
owner: "Boss (Product Authority)"
decision_owner: null
execution_authorized: false
complexity: "C-3"
access_scope: "H3"
context_profiles: ["T-ctx", "W-ctx"]
risk: "HIGH"
related_docs:
  - "docs/change-requests/CR-2026-08-03-Document-IA-and-Knowledge-Graph-Readiness.md"
  - "docs/STD-Execution-Governance.md"
  - "docs/adr/ADR-021-H-Axis-Access-Scope-Semantic-Separation.md"
---

# CR: Phase 2 Semantic and Authority Decision Packet

## 1. Decision boundary

This draft separates semantic and authority decisions from Phase 1-A evidence.
It authorizes no merge, delete, archive, lifecycle change, H-axis rewrite, or
runtime change. Classification is `C-3` / `H3` / `HIGH`; workers use `T-ctx`
and the review workflow uses one bounded `W-ctx`.

## 2. Owner decisions required

| Decision | Risk | Required owner choice | Current constraint |
|---|---|---|---|
| Divergent `TDD-Phase1-Core-State` pair | HIGH | retain both, select a governing survivor, or define a supersession/alias relation | do not merge or delete |
| Exact duplicate `TDD-Phase2-Desktop-Integration` pair | MEDIUM | select survivor and explicit alias/retention disposition | no deletion before decision |
| Typo-path legacy design outline | MEDIUM | approve archive target and authority/lifecycle basis | archive candidate only; authority missing |
| `LANDING Copy` template with legacy H0-H5 | MEDIUM-HIGH | choose retain-and-correct, supersede, or archive after semantic owner review | legacy terms are not executable authority |
| `RUNBOOK-GoVibe-Multi-Agent` | HIGH | resolve lifecycle and SOT conflict; choose replacement/retention posture | legacy H0-H6 and 15 bounded backlinks require impact review |

The 14 roadmap warnings are intentional legacy fixtures and require no action
under this packet. The following remain separate future packets, not implied
implementation work:

- `FUTURE-CR-CRITERIA-SEMANTIC-DOCUMENTATION`: scope the 77 AC/SC/DoD warnings
  as a semantic documentation change request.
- `FUTURE-CR-CONTEXT-AUTHORITY-RUNTIME-REPAIR`: scope the six contextAuthority
  test failures as a runtime change request with RCA and tests.

## 3. Impact and rollback requirements

Each approved decision must resolve its governing relation, source version,
authority and acceptance criteria before implementation. For any semantic,
authority, lifecycle, archive, or SOT change, the execution packet must provide
bounded backlink analysis: affected artifact, relation chain, graph distance,
impact score, required action, cycle handling, and unresolved links. The 15
RUNBOOK backlinks are bounded discovery evidence, not a claim of completeness.

Every approved mutation requires a pre-change hash, exact forward patch or
operation, exact inverse, deterministic rollback order, and post-change hash.
No archive/delete/merge may proceed without the selected survivor or destination
and a reversible recovery path.

## 4. Acceptance, success, exit, and review gate

- AC: each of the five decision rows has an explicit owner choice, governing
  authority, bounded impact evidence, and rollback evidence before execution.
- SC: no duplicate, typo-path, legacy H term, or lifecycle conflict is resolved
  by inference; the 77 criteria warnings and six runtime failures stay isolated.
- Exit Criteria / DoD: a separately approved execution packet has passed
  documentation review, relevant tests where applicable, and all gated
  validations; unresolved rows remain `execution_authorized: false`.

Review chain: `worker -> noise reviewer -> integrator -> final gate -> owner`.
The worker may not expand scope; the noise reviewer is read-only; the final
gate does not repair worker output. Owner approval is required before any
semantic or authority mutation.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-03 | ATHER | Created owner-gated Phase 2 semantic and authority decision packet; all mutation remains unauthorized. |
