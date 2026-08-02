---
title: "GKS System Handover Specification"
summary: Draft handover guidance for MSP-scoped context assembly, H0-H4 executor access, and separately declared R/D/W/Budget/Risk/contextProfile controls.
doc_id: "GVDOC-1004"
created: "2026-06-12T19:15:00+07:00,GKS Lead Architect"
updated: "2026-08-03"
version: "2.3.0+draft"
status: "draft"
owner: "THESEUS"
source_of_truth: false
type: handover-specification
tags:
  - handover
  - architecture
  - routing
  - implementation
  - phase-4
wikilink: "[[GKS-HANDOVER-SPEC-PHASE4]]"
crosslink:
  - "[[FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS]]"
  - "[[STD-Execution-Governance]]"
  - "[[CONCEPT--HYBRID-JIT-CONTEXT]]"
  - "[[CONCEPT--HYBRID-RETRIEVAL-FTS-LAYER]]"
---

# GKS Handover Specification

**To:** System AI Agents / Core Engineering Team  
**Subject:** Draft handover for MSP-scoped context assembly, executor access, and bounded retrieval guidance
**Status:** Draft guidance; no implementation authorization

## 1. Canonical Standards

This handover does not define the platform standard by itself. It inherits from and must remain consistent with:

- `docs/STD-Execution-Governance.md`
- `.agents/FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS.md`
- `docs/CONCEPT--HYBRID-JIT-CONTEXT.md`
- `docs/CONCEPT--HYBRID-RETRIEVAL-FTS-LAYER.md`

When this handover conflicts with a current standard, the standard wins and this handover must be updated.

## 2. Execution Access and Context Axes

### 2.1 Complexity to Access Mapping

The old `R10` wording is now legacy naming. The canonical standard name is `Execution Governance Standard`.

Required mapping:

- `C-0` -> `H0`
- `C-1` -> `H1`
- `C-2` -> `H2`
- `C-3` -> `H3`

`H4` is an explicit upward access declaration that requires owner approval. It
is not a complexity default and it is not a retrieval or graph-depth value.

Operational meaning:

- `H0` = one bounded file read
- `H1` = search
- `H2` = write and multi-file edit
- `H3` = shell execution
- `H4` = network and full configured capabilities, subject to approval

### 2.2 Retrieval, Compaction, Fan-out, and Context Policy

`H` must not be used for graph hops, retrieval radius, compaction depth, token
budget, risk, or context profile. `H5` and `H6` are abolished and must not be
introduced as compatibility tiers.

```yaml
context_packet_controls:
  retrieval_radius: "R0..R6 or explicit policy"
  compaction_depth: "D: repository-defined"
  fan_out: "W: explicit scale"
  budget: "explicit object or value"
  risk: "explicit class"
  contextProfile: "packet-specified T-ctx, V-ctx, W-ctx, or M-ctx"
```

Any retrieval must be authorized through an MSP-provided context packet with its
relation policy, exclusions, permissions, budget, and source lineage. This
document does not assign a default graph-hop ceiling or authorize traversal.

### 2.3 W-Scale Fan-out Control

Fan-out must be governed by `W-Scale`, measured by node degree or equivalent branching count in the same working plane.

| W Scale | Meaning | Rule |
|---|---|---|
| `W2` | Optimal | `3-5` connections; normal operation |
| `W3` | Warning | `6-8` connections; require lead review |
| `W4` | Super-hub danger | `9+` connections; block deployment until refactored |

Purpose:

- prevent token explosion
- prevent oversized super-hub nodes
- surface coupling problems before deployment

## 3. Scoped Context Requirements

When an approved context packet permits relation traversal, it may identify
bounded upstream and downstream relations:

- upward through parent relationships
- downward through child relationships

GoVibe does not call GKS or GenesisBlockDB directly. The runtime boundary is:

```text
Executor / Claude Code -> GoVibe MCP -> MSP -> GKS -> GenesisBlockDB
```

The context packet is MSP-scoped. An agent must not assemble unrestricted graph
context, read another agent's private vault, or substitute `context_tier` for
the packet's `contextProfile`.

Minimum behavior:

```text
pivot node
  -> MSP-authorized bounded relation policy
  -> source versions and exclusions
  -> context packet
  -> agent consumes only the scoped packet
```

## 4. Hybrid Retrieval Guidance

If an approved hybrid retrieval design selects these layers, its intended order
is:

1. atomic or exact match
2. FTS layer
3. vector or semantic layer
4. graph expansion or reranking layer

This handover does not itself enforce a retrieval implementation or claim that
any layer is available at runtime.

## 5. Verification Boundary

- Verify that this document does not introduce `H5`, `H6`, or `context_tier`.
- Verify that declared access, retrieval, compaction, fan-out, budget, risk,
  and context profile are not conflated.
- Verify the GoVibe -> MSP -> GKS -> GenesisBlockDB boundary is retained.
- Treat runtime behavior, retrieval-layer availability, and any broader legacy
  content as separate evidence or follow-up work.

## 6. Handover Outcome

This draft records a corrected handover posture for:

- H0-H4 executor access
- separately declared R/D/W/Budget/Risk/contextProfile controls
- MSP-scoped context assembly
- conditional hybrid-retrieval guidance

The long-term source of truth for these rules remains the current GoVibe
standards and approved architecture documents. This handover is not a
canonical authority or an implementation transfer approval.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 2.3.0+draft | 2026-08-03 | THESEUS | Replaced obsolete multi-tier access semantics with H0-H4 executor access and separate packet controls; preserved the MSP-only runtime boundary without asserting runtime availability. |
| 2.2.0-ga | 2026-08-03 | THESEUS | Normalized legacy release version and governed metadata under delegated Phase 1B authority; no handover content is approved as canonical. |
