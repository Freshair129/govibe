---
doc_id: "POC-H6-BUDGET-SUFFICIENCY"
title: "PoC-2: H0–H6 + budget is sufficient & complete as agent context"
status: "draft"
version: "0.1.0+draft"
updated: "2026-06-22"
owner: "Boss (CEO)"
type: audit
---

# PoC-2: H0–H6 + Budget Sufficiency

## 1. Claim
The hop tiers **H0–H6**, **combined with a budget axis**, are **sufficient and complete** to supply any agent task the context it needs — reaching everything required while always staying within the token budget.

## 2. Method (reduce to two checkable conditions)
Context control is **2-dimensional**: `H` = reach (breadth) × `budget` = volume. The claim splits into:
- **(reach)** every relevant node is reachable within the tier ⇢ reduces to **graph diameter ≤ 6**.
- **(volume)** the rendered context always fits the budget ⇢ reduces to **"can always render a ≤budget, task-sufficient packet"**.

## 3. Reach — sufficiency & completeness
- **Sufficiency (ceiling):** by Six Degrees of Separation, from any node 6 hops reach the whole connected graph ⇒ **H6 reaches everything**. Empirically GenesisBlockDB measured hop-6 traversal at 1M nodes (~9 ms) ⇒ feasible.
- **Practical:** retrieval teleports to anchors (L1–L3, 0-hop) then expands ≤ H hops ⇒ task context = anchor neighbourhood, not a linear 6-hop walk.
- **Completeness (no granularity gap):**

| H0 | H1 | H2 | H3 | H4 | H5 | H6 |
|---|---|---|---|---|---|---|
| subtask | task/comp | story/feat | epic/module | phase/arch | roadmap/cross-sys | full-network |

- **Honest precondition:** diameter ≤ 6 holds only for a **small-world** graph. A pure deep containment tree (no cross-links) can exceed 6 ⇒ **the wikilink/backlink discipline (ADR-018) is the precondition** that guarantees reach. W-scale caps fan-out so neighbourhoods don't explode.

## 4. Volume — always-fits-or-kicks-back
When the H-neighbourhood exceeds budget (even at low H), degrade in order, then escalate:
1. **Resolution-gradient** — load distant atoms at higher compaction depth `D` (System summary, not Method detail).
2. **Compression** — summarise the neighbourhood (MSP compressor).
3. **K-Impact ranking** — keep highest-authority (core/central); drop lowest first.
4. **Governance kickback** — H0 alone > budget ⇒ **god-atom / refactor**; task needs > budget ⇒ **decompose** (lower C-tier), multi-pass.

**Guarantee:** resolution can always abstract further until it fits (worst case = a tiny System-level summary). Therefore the render **always fits, or the request is kicked back to governance** — never silent truncation.

## 5. Result
Both conditions reduce to **measurable invariants**, not faith:
| Condition | Metric the gate can assert |
|---|---|
| reach (diameter ≤ 6) | `avg_path_length`, `clustering_coefficient` on the GKS graph (after cross-link) |
| volume (≤ budget) | `rendered_tokens ≤ budget` per tier; kickback rate |

## 6. Honest limits
- Reach proof is conditional on adequate cross-linking (a metric, continuously checkable — not assumed).
- Multi-region tasks run K anchor-scoped queries (each ≤ H), not one giant traversal.
- Lossy degradation (resolution-gradient/compression) trades completeness for fit — acceptable because the alternative is silent failure; the governance kickback is the safety valve.

## 7. Traceability
`STD-Execution-Governance` (H/W/C), `SRS-GKS-RETRIEVAL-LAYER` (FR-5..7), ADR-018 (wikilink precondition), GenesisBlockDB K-Impact + graph benchmarks.

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-22 | Boss (CEO) | PoC-2: H0–H6 + budget sufficiency via reach(diameter≤6) × volume(always-fits-or-kickback). |
