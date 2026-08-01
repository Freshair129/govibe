---
doc_id: "SRS-GKS-RETRIEVAL-LAYER"
title: "SRS: GKS 4-Layer Hybrid Retrieval (the Retriever / Compute layer)"
status: "draft"
version: "0.1.1+draft"
updated: "2026-08-01"
owner: "Boss (CEO)"
type: srs
---

# SRS: GKS 4-Layer Hybrid Retrieval

## 1. Purpose & scope
Specify the **Retriever / Compute layer** that sits between an orchestrator and GKS storage and renders **Just-In-Time context** for agents. GKS is the corpus/format; this layer is the engine over it. Per ADR-016 it currently lives in MSP (§13); per ADR-019 it is reached via MCP. See `CONCEPT--HYBRID-JIT-CONTEXT`, `CONCEPT--HYBRID-RETRIEVAL-FTS-LAYER`, and `API-004`.

This SRS uses separate governance axes:

```text
H0-H4 = executor Access Scope / capability ceiling
R0-R6 = retrieval radius / graph-hop distance
context budget = token/content volume ceiling
W-scale = fan-out / branching width
```

## 2. Functional requirements — the 4 retrieval layers (cheap → expensive cascade)
| # | Layer | Tool | Behaviour | Cost |
|---|---|---|---|---|
| L1 | Atomic exact lookup | `gks_lookup` | exact ID match; short-circuits the cascade | O(1) |
| L2 | Full-Text Search | FTS | keyword, pure-Node, no binary dependency; token-overlap score; frontmatter stripped | cheap |
| L3 | Vector semantic | `gks_recall` | HNSW through the GenesisBlockDB Rust core; semantic recall | medium |
| L4 | Graph backlink traversal | `gks_backlinks` | radius-bounded neighbourhood from anchors; acyclic loop lock | bounded |

- **FR-1** Cascade short-circuits at the cheapest layer that satisfies the query, beginning with L1.
- **FR-2** Anchor-then-radius: L1-L3 produce anchor nodes at radius `R0`; L4 expands no farther than the approved retrieval radius around them.
- **FR-3** Results are fused by RRF, ranked top-K, and returned as an **API-004 ContextPacket** with provenance.
- **FR-4** Write-back uses byte-offset section overwrite of the source `.md` according to `SPEC-Genesis-Block §4`.

## 3. Retrieval and budget control (2-D: reach × volume)
- **FR-5 (reach):** graph retrieval is bounded by **Retrieval Radius `R0-R6`**. The normal policy cap is `R5`; `R6` is a full-network/enterprise retrieval ceiling requiring explicit human approval. Retrieval radius does not grant tools or permissions.
- **FR-6 (volume):** rendered tokens MUST remain at or below the caller's context budget through resolution-gradient compaction, compression, and K-Impact ranking, in that order.
- **FR-7 (governance kickback):** if one atom alone exceeds budget at `R0`, flag a god-atom/refactor condition; if a task requires more than the approved budget, decompose the task or use a governed multi-pass flow. No silent truncation.
- **FR-8 (access independence):** executor Access Scope `H0-H4` is evaluated separately by execution governance. Increasing `R` MUST NOT increase `H`, and increasing `H` MUST NOT imply a larger retrieval radius or token budget.

## 4. Non-functional requirements
- **NFR-1** Backend remains swappable behind a `StorageDriver` interface, with GenesisBlockDB as default and Obsidian/vector alternatives governed by ADR-016.
- **NFR-2** Backlink traversal must prevent uncontrolled cycles during a single retrieval expansion.
- **NFR-3** Local L1/L4 queries target microsecond-class operation where supported by the backend.
- **NFR-4** Retrieval requests and responses record radius, budget, access-scope decision reference, and provenance as separate fields.

## 5. Acceptance criteria
- **AC-1** Given an exact ID, retrieval returns in O(1) without touching L2-L4.
- **AC-2** Given retrieval radius `R_n`, returned graph nodes are no farther than `n` hops from the selected anchor set.
- **AC-3** The rendered packet is always within budget or the request is kicked back under FR-7; it is never silently truncated.
- **AC-4** Every returned node carries source path and lineage provenance.
- **AC-5** No API, test, or document in this retrieval layer treats `H` as hop count, retrieval radius, or context budget.

## 6. Traceability
ADR-016 (placement), ADR-019 (MCP-out), ADR-021 (H/R semantic separation), API-004 (packet schema), `CONCEPT--HYBRID-JIT-CONTEXT`, `POC-H6-BUDGET-SUFFICIENCY` (legacy filename; current semantics are R0-R6), and `FRAMEWORK--MSP-ARCHITECTURE-V2` §13.

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1+draft | 2026-08-01 | ATHER / ARCHON | Replaced retrieval-side H0-H6 semantics with Retrieval Radius R0-R6 and made Access Scope H0-H4 independent from radius and context budget. |
| 0.1.0+draft | 2026-06-22 | Boss (CEO) | Initial SRS for the 4-layer hybrid retriever and two-dimensional reach/budget control. |
