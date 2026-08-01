---
doc_id: "POC-H6-BUDGET-SUFFICIENCY"
title: "PoC-2: R0-R6 Retrieval Radius + Budget Sufficiency"
status: "approved"
version: "0.2.0"
updated: "2026-08-01"
owner: "Boss (CEO)"
type: audit
legacy_title: "PoC-2: H0-H6 + budget is sufficient & complete as agent context"
---

# PoC-2: R0-R6 Retrieval Radius + Budget Sufficiency

> The filename and `doc_id` retain `H6` as a stable legacy identifier. All active semantics in this document use **Retrieval Radius `R0-R6`**. Executor **Access Scope remains `H0-H4`** under `STD-Execution-Governance` and ADR-021.

## 1. Claim

Retrieval-radius tiers `R0-R6`, combined with a separate context-budget axis, are sufficient to supply bounded agent context when the graph and rendering preconditions below hold.

This is a two-dimensional model:

```text
R = retrieval reach / graph-hop radius
context budget = rendered token/content volume
```

Neither dimension grants tools or permissions. Executor capability is governed independently by Access Scope `H0-H4`.

## 2. Method

The claim separates into two checkable conditions:

- **Reach:** every relevant node is reachable within the approved retrieval radius, reducing to a graph-diameter and anchor-selection condition.
- **Volume:** the rendered context fits the approved budget or the request is kicked back for decomposition/refactoring.

## 3. Reach

| Radius | Typical retrieval scope |
|---|---|
| R0 | selected anchor / exact item |
| R1 | immediate neighbourhood |
| R2 | task or component neighbourhood |
| R3 | feature or module neighbourhood |
| R4 | architecture neighbourhood |
| R5 | roadmap or cross-system neighbourhood |
| R6 | full-network ceiling |

`R6` can reach an entire connected graph only when the graph's effective diameter is no greater than six. This depends on adequate cross-links and must be measured rather than assumed.

Retrieval normally teleports to anchors using exact, lexical, or vector lookup and then expands within the approved radius. Multi-region tasks use multiple anchor-scoped queries rather than one uncontrolled traversal.

## 4. Volume

When the selected neighbourhood exceeds the context budget, the renderer must degrade or escalate in this order:

1. resolution-gradient compaction
2. governed compression
3. K-Impact/authority ranking
4. governance kickback for atom refactor, task decomposition, or multi-pass execution

No path silently truncates required context and pretends completeness.

## 5. Measurable invariants

| Condition | Gate metric |
|---|---|
| graph reach | graph diameter / path-length metrics and anchor coverage |
| neighbourhood control | returned node distance is no greater than requested `R_n` |
| volume | rendered tokens/content are within approved budget |
| safety | kickback and decomposition events are explicit and auditable |
| semantic separation | no retrieval request infers `R` or budget from `H` |

## 6. Limits

- Full-network reach is conditional on graph topology and cross-link quality.
- Compression may be lossy and therefore must preserve provenance and disclose resolution level.
- A bounded packet may still be insufficient for a poorly scoped task; kickback is a valid safe outcome.
- Access Scope `H0-H4`, W-scale, complexity, risk, retrieval radius, and budget remain separate policy axes.

## 7. Traceability

- `STD-Execution-Governance` for Access Scope H0-H4, C, and W
- `ADR-021-H-AXIS-ACCESS-SCOPE-SEPARATION`
- `SRS-GKS-RETRIEVAL-LAYER` for R0-R6 retrieval behavior
- ADR-018 for graph cross-link structure
- GenesisBlockDB graph benchmarks and K-Impact evidence

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0 | 2026-08-01 | ATHER / ARCHON | Converted active reach semantics from legacy H0-H6 wording to Retrieval Radius R0-R6 while retaining stable filename/doc_id compatibility. |
| 0.1.1 | 2026-07-10 | ClaudeFable / Boss (CEO) sign-off | Added an initial terminology note distinguishing retrieval radius from Access Scope. |
| 0.1.0+draft | 2026-06-22 | Boss (CEO) | Initial reach and budget sufficiency analysis. |
