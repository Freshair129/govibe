---
title: "SRS: GoVibe Translator-Core Slice (Ingest → Render → Fidelity Gate)"
doc_id: "SRS-GOVIBE-TRANSLATOR-CORE-SLICE"
uid: "01KVXGFWANM2W3MDV7G7RVT5VT"
status: "draft"
version: "0.1.1+draft"
content_hash: "atom:00f060102d576a47"
updated: "2026-06-22"
owner: "Boss (CEO)"
auditor: "ATHER"
type: srs
source_of_truth: true
prd_system: "SYSTEM-08::Genesis-Knowledge-System"
supporting_prd_systems:
  - "SYSTEM-06::Integration-Bridge-System"
  - "SYSTEM-09::Traceability-Audit-Verification-System"
  - "SYSTEM-10::Execution-Governance-System"
related_adrs: ["ADR-016", "ADR-017", "ADR-019"]
related_docs:
  - "docs/audit/AUDIT-User-Flow-Runtime-Gaps-2026-06-22.md"
  - "docs/CONCEPT--HYBRID-JIT-CONTEXT.md"
  - "docs/features/genesis-knowledge-system/FEAT-Doc-Format-Template-Extraction.md"
  - "docs/api/API-002-Symbol-Linking.md"
  - "docs/architecture/SDD-Symbol-Graph-Traceability-Boundary.md"
  - "docs/PRD-GoVibe-Platform-Overview.md"
---

# SRS: GoVibe Translator-Core Slice

## 1. Purpose

Specify the **smallest end-to-end vertical slice** that turns GoVibe's translator positioning into runnable behavior: take a user's repo, decompose it into GKS atoms, and render a requested document back in **that repo's own doc format** — with a fidelity check that proves meaning was preserved. This closes findings #1–#3 of `AUDIT-User-Flow-Runtime-Gaps-2026-06-22`.

## 2. Scope

### In scope
- A single repo (one convention) end-to-end: `ingest → atomize → symbol-link → render → fidelity-verify`.
- Format-adaptive render driven by an extracted doc-format template (`FEAT-DOC-FORMAT-TEMPLATE-EXTRACTION`).
- A fidelity gate that blocks or flags low-confidence output.

### Out of scope (later)
- Multi-team CoDev cross-atom conflict/merge (audit #6).
- Full MSP wiring (tracked separately; until then provenance is local).
- The full-eco visual GKS UI (audit #8).
- Coverage of "every framework" — this slice proves one path, not breadth.

## 3. Functional Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| FR-1 | Ingest a repo's code (and docs) and decompose to GKS atoms (universal code-in, `ADR-019`). | MUST | Running ingest on a sample repo yields atoms with source provenance (file/symbol refs). |
| FR-2 | Extract the repo's doc-format as a reusable **format template** (`FEAT-DOC-FORMAT-TEMPLATE-EXTRACTION`). | MUST | A template is produced and stored, keyed to the repo/convention. |
| FR-3 | Symbol-link code symbols ↔ atoms (`API-002`, `SDD-Symbol-Graph-Traceability-Boundary`). | MUST | Atoms resolve back to concrete symbols; orphans are reported. |
| FR-4 | Render a requested document from atoms (scope-bounded) into the target format template (`CONCEPT--HYBRID-JIT-CONTEXT` §4). | MUST | One atom set renders into two different format templates → two format-correct docs. |
| FR-5 | Every render emits a **fidelity verdict** (e.g. round-trip `A1→GKS→A1` and/or semantic-equivalence + confidence). Below threshold ⇒ blocked or flagged for human confirm — never silently emitted. | MUST | A deliberately lossy mapping is blocked/flagged, not returned as clean. |
| FR-6 | Rendered output carries provenance (cited source atoms + audit reference). | MUST | Output lists the atoms it was built from. |
| FR-7 | Expose the slice as MCP tools (e.g. `govibe.ingest.code`, `govibe.render`) consistent with the existing `govibe.*` catalog. | SHOULD | Tools appear in the catalog and round-trip through the smoke test. |

## 4. Non-Functional Requirements

| ID | NFR | Requirement |
|---|---|---|
| NFR-1 | Live-data-only | No fake atoms or mock renders presented as real output (`PRODUCT.md`). |
| NFR-2 | Token efficiency | Native-GKS render path; render is scope-bounded (hop H0–H6). |
| NFR-3 | Determinism | Same atoms + same template ⇒ same output. |
| NFR-4 | Governance | Rendered output passes a governance check before it is treated as deliverable (extends the gate beyond GoVibe's own docs — audit #4). |
| NFR-5 | Provider-neutral | Ingest/atomize must not assume one coding tool or framework (`ADR-019` code-in, not framework-in). |

## 5. Acceptance Criteria

- Given a sample repo with code and docs, when the slice runs, then GKS atoms are produced, symbol-linked, and carry provenance.
- Given one atom set, when two format templates (e.g. Feature-Base and System-Base) are applied, then two format-correct documents are produced from the same source.
- Given a render whose fidelity confidence is below threshold, when it completes, then the output is blocked or flagged for human confirmation rather than returned as clean.

## 6. Success Criteria

- One real `ingest → render` path works on a sample repo with a **passing fidelity check**.
- The same knowledge renders into two different doc paradigms without editing the source atoms.

## 7. Definition of Done

- This SRS is registered in `docs/DOC-VERSION-REGISTRY.md`.
- A blueprint/LLD and MCP tool contracts (`govibe.ingest.code`, `govibe.render`) are drafted before implementation (Docs-First).
- Open question (§9) on language-pack curation is resolved.
- `docs:validate` passes after the doc is added.

## 8. Traceability

| Need (audit finding) | Requirement | Upstream |
|---|---|---|
| #1 no runtime entry | FR-1, FR-4, FR-7 | `ADR-019`, `CONCEPT--HYBRID-JIT-CONTEXT` |
| #2 no ingest/onboarding | FR-1, FR-2 | `FEAT-DOC-FORMAT-TEMPLATE-EXTRACTION` |
| #3 no fidelity verification | FR-5 | `ADR-017` §3 |
| #4 gate not on output | NFR-4 | `STD-Execution-Governance` |

## 9. Decisions (resolved 2026-06-22)

- **Language-pack curation = HYBRID.** Auto-derive a draft mapping (vocabulary + format template) from the repo scan; sections below a confidence threshold are flagged for human/agent confirmation. Scales by default, stays correct on ambiguous mappings. (Drives FR-2; ties to the fidelity gate FR-5.)
- **Fidelity metric = BOTH.** (a) Round-trip structural check `A1 → GKS → A1` to catch structural loss, **and** (b) semantic-similarity score with a confidence threshold to catch meaning drift. Verdict = pass / flag (human-confirm) / block. (Defines FR-5.)
- **Provenance home = LOCAL JSONL (interim).** Write provenance/audit to a local `.jsonl` store now; migrate to MSP when MSP is wired (audit #5). Unblocks the slice without waiting on MSP. (Defines FR-6.)

Downstream design: `BLUEPRINT-Translator-Core-Slice` (architecture) and `LLD-Translator-Core-Slice` (tool contracts + algorithms).

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1+draft | 2026-06-22 | Boss (CEO) | Resolved the three open questions: language-pack curation = hybrid (auto-draft + confirm low-confidence); fidelity = both (round-trip + semantic threshold); provenance = local jsonl interim → migrate to MSP. Linked downstream Blueprint + LLD. |
| 0.1.0+draft | 2026-06-22 | Boss (CEO) | Initial SRS for the translator-core slice (ingest → atomize → symbol-link → render → fidelity gate) addressing audit findings #1–#3; carries open questions on curation, fidelity metric, and provenance home. |
