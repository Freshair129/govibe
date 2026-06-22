---
doc_id: "SRS-GKS-RETRIEVAL-LAYER"
title: "SRS: GKS 4-Layer Hybrid Retrieval (the Retriever / Compute layer)"
status: "draft"
version: "0.1.0+draft"
updated: "2026-06-22"
owner: "Boss (CEO)"
type: srs
---

# SRS: GKS 4-Layer Hybrid Retrieval

## 1. Purpose & scope
Specify the **Retriever / Compute layer** that sits between an orchestrator and GKS storage and renders **Just-In-Time context** for agents. GKS is the corpus/format; this layer is the *engine* over it. Per ADR-016 it currently lives in MSP (§13); per ADR-019 it is reached via MCP. (See `CONCEPT--HYBRID-JIT-CONTEXT`, `CONCEPT--HYBRID-RETRIEVAL-FTS-LAYER`, `API-004`.)

## 2. Functional requirements — the 4 retrieval layers (cheap → expensive cascade)
| # | Layer | Tool | Behaviour | Cost |
|---|---|---|---|---|
| L1 | Atomic exact lookup | `gks_lookup` | exact ID match; **short-circuits** the cascade | O(1) |
| L2 | Full-Text Search | (FTS) | keyword, pure-Node, no binary dep; token-overlap score; frontmatter stripped | cheap |
| L3 | Vector semantic | `gks_recall` | HNSW (GenesisBlockDB Rust core); semantic recall | medium |
| L4 | Graph backlink traversal | `gks_backlinks` | hop-bounded neighbourhood from anchors; **acyclic loop lock** | bounded |

- **FR-1** Cascade short-circuits at the cheapest layer that satisfies the query (L1 first).
- **FR-2** Anchor-then-hop: L1–L3 produce anchor nodes (0-hop teleport); L4 expands ≤ H hops around them.
- **FR-3** Results fused (RRF) → ranked top-K → returned as an **API-004 ContextPacket** (Virtual Document) with provenance.
- **FR-4** Write-back via byte-offset **section overwrite** of the source `.md` (hot-swap write side; `SPEC-Genesis-Block §4`).

## 3. Context & budget control (2-D: reach × volume)
- **FR-5 (reach):** hop radius bounded by tier **H0–H6** (`STD-Execution-Governance`); normal cap 5 hops, H6 = enterprise ceiling (human sign-off).
- **FR-6 (volume):** rendered tokens MUST stay ≤ the caller's budget via, in order: **resolution-gradient** (load distant atoms at higher compaction depth `D`), **compression** (summarise), **K-Impact ranking** (drop lowest-authority first).
- **FR-7 (governance kickback):** if an atom alone exceeds budget at H0 → flag **god-atom / refactor**; if a task needs > budget → **decompose** (lower complexity tier). No silent truncation.

## 4. Non-functional
- **NFR-1** Backend swappable behind a `StorageDriver` interface (GenesisBlockDB default; Obsidian / vectorDB alternates) — ADR-016.
- **NFR-2** Acyclic backlink invariant enforced (no cycles).
- **NFR-3** µs-class local queries for L1/L4 (GenesisBlockDB benchmarks).

## 5. Acceptance criteria
- AC-1 Given an exact ID, retrieval returns in O(1) without touching L2–L4.
- AC-2 Given a query at tier H_n, the returned packet contains only nodes within n hops of the anchor(s).
- AC-3 The rendered packet is **always ≤ budget**, or the request is kicked back (FR-7) — never silently truncated.
- AC-4 Every returned node carries provenance (source path + lineage).

## 6. Traceability
ADR-016 (placement), ADR-019 (MCP-out), API-004 (packet schema), `CONCEPT--HYBRID-JIT-CONTEXT`, `POC-H6-BUDGET-SUFFICIENCY` (sufficiency proof), `FRAMEWORK--MSP-ARCHITECTURE-V2` §13.

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-22 | Boss (CEO) | Initial SRS for the 4-layer hybrid retriever + 2-D (reach×budget) control. |
