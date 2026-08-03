---
title: "BLUEPRINT: GoVibe Translator-Core Slice"
doc_id: "BLUEPRINT-TRANSLATOR-CORE-SLICE"
status: "draft"
version: "0.1.0+draft"
updated: "2026-06-22"
owner: "ARCHON / ATHER"
type: blueprint
source_of_truth: true
prd_system: "SYSTEM-08::Genesis-Knowledge-System"
related_adrs: ["ADR-016", "ADR-017", "ADR-019"]
related_docs:
  - "docs/srs/SRS-GoVibe-Translator-Core-Slice.md"
  - "docs/assurance/audit/AUDIT-User-Flow-Runtime-Gaps-2026-06-22.md"
  - "docs/CONCEPT--HYBRID-JIT-CONTEXT.md"
  - "docs/features/genesis-knowledge-system/FEAT-Doc-Format-Template-Extraction.md"
  - "docs/api/API-002-Symbol-Linking.md"
  - "docs/lld/LLD-Translator-Core-Slice.md"
---

# BLUEPRINT: GoVibe Translator-Core Slice

Architecture for the smallest runnable translator path specified in `SRS-GoVibe-Translator-Core-Slice`. Implements three resolved decisions: **hybrid** language-pack curation, **both** fidelity metrics, **local-jsonl** provenance (interim → MSP).

## 1. Pipeline (data flow)

```text
ingest path:
  repo (code + docs)
    -> [Ingestor]          decompose code -> GKS atoms (ADR-019, slice subset)
    -> [Symbol-Linker]     link atoms <-> code symbols (API-002)
    -> [Format-Extractor]  scan repo docs -> format template (hybrid: auto-draft + low-confidence flags)
    -> atom store + template store (+ provenance jsonl)

render path:
  request (selector + scope hop + target template)
    -> [Selector]          gather atoms by scope (CONCEPT--HYBRID-JIT scope dimension)
    -> [Renderer]          fill target format template (CONCEPT--HYBRID-JIT format dimension)
    -> [Fidelity Gate]     round-trip + semantic; verdict pass|flag|block
    -> output doc + cited atoms + fidelity verdict + provenance jsonl
```

## 2. Components

| Component | Responsibility | Key decision |
|---|---|---|
| Ingestor | Code/docs → GKS atoms with source refs (slice subset of the 12-step). | Provider-neutral (code-in, not framework-in). |
| Symbol-Linker | Bind atoms ↔ concrete code symbols; report orphans. | Consumes `API-002` / `SDD-Symbol-Graph-Traceability-Boundary`. |
| Format-Extractor | Derive a reusable doc-format template per repo. | **Hybrid:** auto-draft; flag sections under confidence threshold for confirm. |
| Selector | Pick atoms within a hop-bounded scope (H0–H6). | Reuses `CONCEPT--HYBRID-JIT` scope dimension. |
| Renderer | Emit a document from atoms into the target format template. | `render = scope × format` (CONCEPT §4). |
| Fidelity Gate | Decide pass/flag/block before output is deliverable. | **Both** round-trip + semantic + confidence. |
| Provenance Writer | Append an audit record per ingest/render. | **Local jsonl** now; MSP-shaped fields for later migration. |

## 3. Stores (interim)

- **Atom store** — GKS atoms (Markdown-compacted per `CONCEPT--HYBRID-JIT` storage layer; in-memory graph at compute time).
- **Template store** — one format template per repo/convention (part of the `ADR-017` language pack).
- **Provenance store** — append-only `.jsonl`; one record per ingest/render with MSP-compatible fields.

## 4. Boundaries (slice scope)

- ONE repo / one convention end-to-end. Multi-team CoDev conflict (audit #6) is **out**.
- No MSP coupling — provenance is local; fields are MSP-shaped so migration is mechanical.
- No visual GKS UI (audit #8). No "every framework" breadth — prove one path.
- Governance: rendered output passes a fidelity + governance check before it is treated as deliverable (extends the gate beyond GoVibe's own docs, audit #4).

## 5. Risks

| Risk | Mitigation |
|---|---|
| Atomizer over/under-decomposes | Slice uses a bounded subset; fidelity gate catches loss. |
| Semantic metric false-positives on lossy-by-design formats | Round-trip is structural; semantic carries a confidence band → flag, not block, on uncertainty. |
| Local provenance diverges from future MSP schema | Author jsonl fields to MSP shape now; one migration adapter later. |
| Hybrid curation stalls on too many confirms | Tune confidence threshold; batch confirmations; default-accept high-confidence. |

## 6. Traceability

SRS FR-1→Ingestor · FR-2→Format-Extractor · FR-3→Symbol-Linker · FR-4→Selector+Renderer · FR-5→Fidelity Gate · FR-6→Provenance Writer · FR-7→MCP tool contracts (see `LLD-Translator-Core-Slice`).

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-22 | ARCHON / ATHER | Initial architecture for the translator-core slice: ingest/render pipeline, 7 components, interim stores, slice boundaries, risks; encodes the hybrid / both-metric / local-jsonl decisions. |
