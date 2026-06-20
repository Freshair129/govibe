---
title: "Architecture: MSP/GKS Taxonomy Mapping"
doc_id: "MSP-GKS-TAXONOMY-MAPPING"
status: "approved"
version: "0.1.0"
updated: "2026-06-16"
owner: "THESEUS / KIN"
source_of_truth: true
prd_system: "SYSTEM-09::Traceability-Audit-Verification-System"
related_docs:
  - "docs/features/traceability-audit/FEAT-MSP-Validate-Evidence-Adapter.md"
  - "docs/architecture/SDD-MSP-External-Evidence-Boundary.md"
  - "docs/change-requests/CR-2026-06-14-MSP-GKS-GoVibe-Integration.md"
---

# Architecture: MSP/GKS Taxonomy Mapping

## 1. Purpose

Map GoVibe governance documents to the closest MSP/GKS atom or validation concept so external MSP validation can be used as source evidence without leaking GKS internals into GoVibe ownership.

## 2. Mapping Table

| GoVibe Concept | MSP/GKS Closest Concept | Confidence | Adapter Treatment |
|---|---|---|---|
| `PRD` | `CONCEPT` plus `FEAT` intent chain | medium | Accept as product intent evidence only. |
| `ADR` | `ADR` | high | Accept as decision evidence when IDs and links are present. |
| `FEAT` | `FEAT` | high | Accept as feature evidence when source links are present. |
| `SDD` | `BLUEPRINT` plus architecture decision refs | medium | Accept as design evidence, not runtime proof. |
| `RUNBOOK` | `BLUEPRINT` or operational procedure note | medium | Accept as operating evidence; mapping may remain partial. |
| `CONTEXT` | context packet or derived atom set | low | Record as `unmapped_governance_concept` until MSP has a first-class equivalent. |
| `ROADMAP` | planning chain outside MSP atom core | low | Record as `unmapped_governance_concept`; LYRA remains owner. |
| `DOC_VERSION_REGISTRY` | registry/index evidence | low | Record as `unmapped_governance_concept`; ATHER remains owner. |

## 3. Trust Boundary

- MSP validates MSP/GKS source consistency.
- GoVibe validates GoVibe governance consistency.
- Mapping gaps must be reported, not inferred.
- Direct GKS access by GoVibe agents is out of scope in v1.
- MSP is the v1 external evidence boundary; GKS is mapped only as an internal subsystem behind MSP.

## 4. Adapter Output Rules

- Mapped concepts go under `govibe_taxonomy_mapping`.
- Unmapped concepts go under `unmapped_governance_concepts`.
- No mapping row may imply automatic GoVibe approval.
- ATHER may reject packets with missing mapping evidence.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0 | 2026-06-21 | THESEUS / KIN | Signed off; promoted draft -> approved (MSP/GKS gate decision recorded in ADR-014). |
| 0.1.0+draft | 2026-06-16 | THESEUS / KIN | Added initial GoVibe-to-MSP/GKS taxonomy mapping for evidence adapter use. |
