---
title: "GoVibe Documentation Navigation Hub"
doc_id: "DOCS-NAVIGATION-HUB"
status: "draft"
version: "0.2.0+draft"
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

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0+draft | 2026-08-03 | THESEUS / ATHER | Added Phase 1B / Phase 2 completion, current runbook navigation, integration evidence, and explicit unresolved-queue boundaries. |
| 0.1.0+draft | 2026-08-03 | THESEUS / ATHER | Added the human navigation hub and cleansing control-packet entry points without changing canonical paths. |
