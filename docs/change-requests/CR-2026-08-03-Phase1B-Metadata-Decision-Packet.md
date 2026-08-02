---
title: "CR: Phase 1-B Metadata Decision Packet"
doc_id: "CR-2026-08-03-PHASE1B-METADATA-DECISION-PACKET"
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
  - "docs/change-requests/manifests/results/DOC-CLEANSING-B04-EXECUTION-ROLLBACK-v1.md"
  - "docs/STD-Document-Versioning-Governance.md"
---

# CR: Phase 1-B Metadata Decision Packet

## 1. Decision boundary

This is a draft owner-decision packet, not an authorization to edit corpus
metadata, relocate documents, change lifecycle, or assign canonical identity.
The eight B04 candidates remain `execution_authorized: false`. Titles are the
only deterministic H1 observations for every row. The only deterministic
version mappings are `0.1.1b -> 0.1.1-beta` for the CoDev/CoVibe CR and
`2.2.0-Release -> 2.2.0-ga` for GVDOC-1004; neither is applied by this packet.

Classification: `C-3`, `H3`, `HIGH`. Workers use `T-ctx`; the integrator and
final gate use one bounded `W-ctx` workflow. No private history, direct
MSP/GKS access, or canonical GKS identity is in scope.

## 2. Candidate decision table

| # | Current path | Deterministic H1 title / version observation | Missing owner decision fields | Proposed target | Authority |
|---|---|---|---|---|---|
| 1 | `docs/audit/AUDIT-GoVibe-RWANG-Cutover-Readiness-2026-07-30.md` | `GoVibe RWANG Cutover Readiness Audit` | owner, lifecycle, identity, status, complete metadata, exact inverse | relocation deferred | deferred |
| 2 | `docs/audit/IMPACT-ANALYSIS-PHASE4.md` | `Dependency & Impact Analysis Report :: Phase 4 Post-Execution` | owner, lifecycle, identity, status, complete metadata, exact inverse | relocation deferred | deferred |
| 3 | `docs/audit/UAT-Plan.md` | `User Acceptance Testing (UAT) Plan - GoVibe Phase 3/4` | owner, lifecycle, identity, status, complete metadata, exact inverse | relocation deferred | deferred |
| 4 | `docs/change-requests/CR-2026-06-15-CoDev-CoVibe-Positioning-Review.md` | `Change Request: CoDev and CoVibe Positioning Review`; candidate version `0.1.1b -> 0.1.1-beta` | owner, lifecycle, identity, status, complete metadata, exact inverse | relocation deferred | deferred |
| 5 | `docs/handover/GVDOC-1004-Handover Specification.md` | `GKS System Handover Specification`; candidate version `2.2.0-Release -> 2.2.0-ga` | owner, lifecycle, identity, status, complete metadata, exact inverse | relocation deferred | deferred |
| 6 | `docs/migration/MIG-001-Mission-Control-React.md` | `MIG-001: Mission Control React Migration Plan` | owner, lifecycle, identity, status, complete metadata, exact inverse | relocation deferred | deferred |
| 7 | `docs/rca/RCA-2026-06-14-Visual-Agent-Fleet-Governance-Failure.md` | `[ROOT CAUSE] Visual Agent Fleet Documentation Governance Failure` | owner, lifecycle, identity, status, complete metadata, exact inverse | relocation deferred | deferred |
| 8 | `docs/security/PATH-CONTAINMENT.md` | `Canonical Path Containment` | owner, lifecycle, identity, status, complete metadata, exact inverse | relocation deferred | deferred |

For each row, the owner must explicitly provide: `owner`, `lifecycle`,
`document identity`, `status`, full frontmatter values, whether relocation is
approved, and an exact forward metadata patch plus its exact inverse. Blank
fields are intentional; no value may be inferred from filename, text, or
candidate disposition.

## 3. Assumptions and gaps

- The B04 result establishes observations and pre-change snapshots, not a
  governing relation or mutation authority.
- Proposed targets are taxonomy candidates only; all relocations are deferred.
- Backlink coverage in the B04 packet is bounded discovery evidence, not a
  completeness proof.
- No owner approval, lifecycle decision, or canonical identity relation was
  provided for any of the eight documents.

## 4. Conditional execution and rollback

After an owner selects every required field, a separate execution packet must:

1. pin each source version/hash and the exact approved forward patch;
2. run bounded backlink impact review for every approved metadata or path edit;
3. record exact inverse patches and post-change hashes before mutation;
4. apply only owner-approved rows, preserving all unselected rows unchanged;
5. validate registry/frontmatter parity and attach review evidence.

Rollback must restore each selected row's exact pre-change blob, metadata and
path in deterministic order. A missing inverse, hash, owner field, lifecycle,
or review result fails closed and prevents execution.

## 5. Acceptance, success, exit, and review chain

- AC: all eight rows have explicit owner decisions; each authorized mutation has
  a source hash, exact forward patch, exact inverse, and bounded impact result.
- SC: no title or version observation becomes lifecycle, owner, identity, or
  relocation authority by implication.
- Exit Criteria / DoD: an owner-approved execution packet exists; worker,
  noise-review, integration, final-gate, and owner evidence are all recorded;
  validations pass; unselected candidates remain deferred.

Review chain: `worker -> noise reviewer -> integrator -> final gate -> owner`.
The noise reviewer is read-only; the final gate does not repair a worker diff.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-03 | ATHER | Created owner-gated Phase 1-B metadata decision packet; no metadata, lifecycle, identity, or relocation is authorized. |
