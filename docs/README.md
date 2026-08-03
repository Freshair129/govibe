---
title: "GoVibe Documentation Navigation Hub"
doc_id: "DOCS-NAVIGATION-HUB"
status: "draft"
version: "0.2.8+draft"
updated: "2026-08-03"
owner: "THESEUS / ATHER"
source_of_truth: true
related_docs:
  - "docs/STD-Execution-Governance.md"
  - "docs/STD-Document-Versioning-Governance.md"
  - "docs/DOC-VERSION-REGISTRY.md"
  - "docs/design/GoVibe-Document-Hierarchy.md"
---

# GoVibe Documentation Navigation Hub

## Start Here

- Execution authority: `docs/STD-Execution-Governance.md`
- Metadata and lifecycle: `docs/STD-Document-Versioning-Governance.md`
- Registered active documents: `docs/DOC-VERSION-REGISTRY.md`
- Document hierarchy: `docs/design/GoVibe-Document-Hierarchy.md`
- Platform intent: `docs/BRD-GoVibe-Platform.md` and
  `docs/PRD-GoVibe-Platform-Overview.md`

## Main Collections

| Need | Current collection |
|---|---|
| Product and feature contracts | `docs/features/`, `docs/srs/` |
| Architecture and decisions | `docs/architecture/`, `docs/adr/`, `docs/blueprints/`, `docs/lld/` |
| Interfaces | `docs/api/` |
| Planning | `docs/roadmap/` |
| Operations | `docs/operations/runbooks/`, `docs/handover/` |
| Change and failure control | `docs/change-control/change-requests/`, `docs/change-control/rca/`, `docs/migration/` |
| Assurance | `docs/assurance/audit/`, `docs/assurance/security/` |
| Historical candidates | `docs/archive/` |

These are current paths, not canonical graph identities. The proposed target
projection and controlled migration gates are defined in the Document IA
blueprint and migration plan. Do not move files from this index alone.

## Cleansing Control Packet

- `docs/change-requests/CR-2026-08-03-Document-IA-and-Knowledge-Graph-Readiness.md`
- `docs/blueprints/BLUEPRINT-Document-Information-Architecture-and-Graph-Contract.md`
- `docs/migration/MIGRATION-Document-IA-and-Graph-Readiness.md`
- `docs/change-requests/ROLLBACK-Document-IA-Cleansing-Phase1.md`
- `docs/change-requests/manifests/DOC-CLEANSING-INVENTORY-v1.json`
- `docs/change-requests/manifests/DOC-CLEANSING-B01-v1.json` through
  `docs/change-requests/manifests/DOC-CLEANSING-B05-v1.json`
- `docs/change-requests/CR-2026-08-03-Phase1B-Metadata-Decision-Packet.md`
- `docs/change-requests/CR-2026-08-03-Phase2-Semantic-Authority-Decision-Packet.md`
- `docs/change-requests/manifests/results/DOC-CLEANSING-PHASE1B-PHASE2-INTEGRATION-RESULT-v1.json`

Phase 1B / Phase 2 document-cleansing execution is complete and closed to
further mutation. The active multi-agent guidance is
`docs/operations/runbooks/RUNBOOK-GoVibe-Multi-Agent.md`; old active runbook
paths are retained only in historical manifests, results, rollback evidence, or
non-canonical `.brain` history. The integration result preserves the accepted
maps and exact recovery chain. It does not close the separate 77 criteria, 14
legacy-roadmap, or six runtime-test follow-up queues.

## Approval-Gated Runtime Repair

- `docs/change-requests/CR-2026-08-03-Context-Authority-Runtime-Repair.md`
- `docs/rca/RCA-2026-08-03-Context-Authority-Runtime-Repair.md`
- `docs/change-control/change-requests/work-packets/WP-06-Context-Authority-Runtime-Repair.md`

Boss approved the bounded runtime-repair packet on 2026-08-03: D-01 Option A
contract alignment, D-02 caller-supplied valid authority propagation for legacy
`resolveContext`, and D-03 WP-06 execution. WP-06 completed through merged PR
[#89](https://github.com/Freshair129/govibe/pull/89) with remote E2E, P0 verify,
and Vercel success. API-008 remains draft; the later owner-authorized WP-11
removes the schema-less principal-only compatibility path without promoting the
API or asserting external-consumer safety.

## Execution-Binding v1 Lifecycle Decision

- `docs/change-requests/CR-2026-08-03-Execution-Binding-v1-Lifecycle-and-Legacy-Sunset-Decision.md`
- `docs/change-control/change-requests/work-packets/WP-10-Execution-Binding-v1-Fixture-Migration-and-Consumer-Discovery.md`
- `docs/change-control/change-requests/work-packets/WP-11-Execution-Binding-Schemaless-Legacy-Removal.md`

Boss approved this decision packet on 2026-08-03. WP-10's fixture-only v1
migration and consumer-discovery scope is complete with merged PR #93 and
recorded CI/Vercel/local-review evidence. Boss then approved and authorized
WP-11 on 2026-08-03, explicitly accepting the remaining HIGH risk from unknown
external consumers and GKS coverage with mandatory rollback. The parent
multi-provider CR, API-007, and API-008 remain drafts; this does not promote an
API/ADR or claim runtime conformance.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.8+draft | 2026-08-03 | ATHER | Updated navigation for the authorized WP-11 schema-less compatibility removal and canonical D-07 lifecycle correction; API-008 remains draft and external-consumer risk remains accepted, not resolved. |
| 0.2.7+draft | 2026-08-03 | ATHER | Updated execution-binding navigation for Boss's D-07 WP-11 authorization and explicit accepted-risk/rollback boundary; parent/API drafts remain unchanged. |
| 0.2.6+draft | 2026-08-03 | ATHER | Updated the execution-binding navigation with the authorized WP-10 PR #93 closure while retaining parent/API drafts and the WP-11 removal block. |
| 0.2.5+draft | 2026-08-03 | Boss / ATHER | Recorded Boss approval of the execution-binding decision and WP-10 only; retained API/ADR promotion and WP-11 as unauthorized. |
| 0.2.4+draft | 2026-08-03 | ATHER | Added navigation for the owner-gated execution-binding v1 lifecycle and schema-less sunset decision; no execution or promotion is authorized. |
| 0.2.3+draft | 2026-08-03 | ATHER | Recorded merged WP-06 closure evidence while retaining API-008 draft status and the governed legacy compatibility residual. |
| 0.2.2+draft | 2026-08-03 | Boss / THESEUS | Recorded owner authorization for the bounded runtime-repair packet while preserving API-008 draft status pending validation. |
| 0.2.1+draft | 2026-08-03 | THESEUS / ATHER | Added navigation for the owner-gated context-authority runtime repair packet without authorizing runtime mutation. |
| 0.2.0+draft | 2026-08-03 | THESEUS / ATHER | Added Phase 1B / Phase 2 completion, current runbook navigation, integration evidence, and explicit unresolved-queue boundaries. |
| 0.1.0+draft | 2026-08-03 | THESEUS / ATHER | Added the human navigation hub and cleansing control-packet entry points without changing canonical paths. |
