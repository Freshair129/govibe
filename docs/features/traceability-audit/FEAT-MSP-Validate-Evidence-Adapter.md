---
title: "FEAT: MSP Validate Evidence Adapter"
doc_id: "FEAT-MSP-VALIDATE-EVIDENCE-ADAPTER"
status: "approved"
version: "0.1.1"
updated: "2026-06-20"
owner: "ATHER / KIN"
source_of_truth: true
prd_system: "SYSTEM-09::Traceability-Audit-Verification-System"
related_docs:
  - "docs/change-control/change-requests/CR-2026-06-14-MSP-GKS-GoVibe-Integration.md"
  - "docs/change-control/change-requests/feedback/CR-2026-06-14-MSP-GKS-GoVibe-Integration-feedback.md"
  - "docs/architecture/MSP-GKS-Taxonomy-Mapping.md"
  - "docs/architecture/SDD-MSP-External-Evidence-Boundary.md"
  - "docs/operations/runbooks/RUNBOOK-MSP-Validate-Evidence-Adapter.md"
---

# FEAT: MSP Validate Evidence Adapter

## 1. Purpose

Define the minimum adapter that lets GoVibe collect `msp:validate` evidence from an external MSP/GKS source repo without treating that validator as a GoVibe final approval gate.

## 2. Boundary Rules

- `msp:validate` is a source consistency validator for the MSP/GKS repo.
- `docs:validate`, `diff:check`, and `baseline:check` remain GoVibe governance validators.
- MSP pass does not equal GoVibe pass.
- GoVibe consumes MSP output through an evidence packet plus taxonomy mapping.
- GKS remains internal behind MSP in v1; GoVibe agents must not call GKS directly.
- MSP is treated as an external evidence boundary in v1; service splitting is deferred until adapter evidence is stable.

## 3. Evidence Packet Contract

The adapter must return at least:

```yaml
source_repo:
source_commit:
source_git_status:
source_validator: msp_validate
command:
exit_code:
started_at:
ended_at:
validated_source_artifacts:
msp_result:
msp_warnings:
govibe_taxonomy_mapping:
unmapped_governance_concepts:
govibe_impact:
recommended_decision: accept_reference | import_inbound | reject | create_change_request | blocked_by_missing_evidence
confidence:
```

The packet is evidence, not an automatic state mutation. It must not edit the MSP source repo or GoVibe docs.

This packet is the canonical evidence/decision contract for MSP-derived evidence. The `recommended_decision` key and its enum are authoritative. Boundary SDDs (for example `SDD-MSP-External-Evidence-Boundary.md` and `SDD-Symbol-Graph-Traceability-Boundary.md`) must reference this contract and may only ADD boundary-specific extension fields or explicitly documented enum extensions; they must not silently rename the decision key or replace enum values.

## 4. Failure Policy

| Condition | Adapter Result | GoVibe Meaning |
|---|---|---|
| MSP repo path missing | `blocked_by_missing_evidence` | No source claim can be accepted. |
| MSP command unavailable | `blocked_by_missing_evidence` | Operator config must be fixed before review. |
| `msp:validate` exits non-zero | `create_change_request` | Source is not self-consistent; do not import as canonical. |
| `msp:validate` exits zero with unmapped concepts | `accept_reference` | Source may be referenced, but GoVibe mapping work remains. |
| `msp:validate` exits zero with complete mapping | `accept_reference` | Eligible for lead review; still not GoVibe final approval. |

## 5. Acceptance Criteria

- Running `npm run msp:evidence` returns an evidence packet rather than mutating files.
- Missing `MSP_REPO_ROOT` or invalid source paths return `blocked_by_missing_evidence`.
- MSP validation pass is not reported as GoVibe validation pass.
- The packet includes git status and source commit from the MSP repo.
- The packet includes GoVibe taxonomy mapping and unmapped concepts.

## 6. Success Criteria

- ATHER can trace source repo state, MSP validation result, mapping result, and GoVibe decision.
- LYRA can decide whether to accept as reference, import inbound, reject, or open a CR.
- KIN can later swap CLI collection for MCP collection without changing the evidence contract.

## 7. Definition Of Done

- Feature contract exists.
- Taxonomy mapping exists.
- Runbook exists.
- `msp:evidence` command exists and is non-invasive by default.
- `docs:validate` passes after the slice.

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1 | 2026-06-21 | ATHER / KIN | Signed off; promoted draft -> approved (MSP/GKS gate decision recorded in ADR-014). |
| 0.1.1+draft | 2026-06-20 | ATHER / KIN | Marked this packet as the canonical evidence/decision contract; clarified that boundary SDDs reference it and may only add documented extension fields/enum values, not rename the decision key. |
| 0.1.0+draft | 2026-06-16 | ATHER / KIN | Defined the MSP validate evidence adapter boundary, packet contract, and failure policy. |
