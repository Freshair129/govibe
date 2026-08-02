---
title: "GKS System Handover Specification"
summary: Handover instructions for the GKS JIT Context Engine, H0-H6 routing, W-Scale fan-out control, and hybrid retrieval enforcement after Phase 4.
doc_id: "GVDOC-1004"
created: "2026-06-12T19:15:00+07:00,GKS Lead Architect"
updated: "2026-08-03"
version: "2.2.0-ga"
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
**Subject:** Mandatory handover for JIT context routing, H0-H6 depth policy, W-Scale fan-out control, and 4-layer hybrid retrieval  
**Status:** Mandatory implementation

## 1. Canonical Standards

This handover does not define the platform standard by itself. It inherits from and must remain consistent with:

- `docs/STD-Execution-Governance.md`
- `.agents/FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS.md`
- `docs/CONCEPT--HYBRID-JIT-CONTEXT.md`
- `docs/CONCEPT--HYBRID-RETRIEVAL-FTS-LAYER.md`

When this handover conflicts with a current standard, the standard wins and this handover must be updated.

## 2. Required Routing Corrections

### 2.1 Complexity to Hop Mapping

The old `R10` wording is now legacy naming. The canonical standard name is `Execution Governance Standard`.

Required mapping:

- `C-0` -> `H0`
- `C-1` -> `H1`
- `C-2` -> `H2`
- `C-3` -> `H3-H6`

Operational meaning:

- `H0` = isolated subtask or PR-sized change
- `H1` = local task and immediate component boundary
- `H2` = feature/story context
- `H3` = epic or module integration
- `H4` = phase or architecture boundary
- `H5` = roadmap or cross-system operating context
- `H6` = enterprise-wide or full-network traversal ceiling

### 2.2 H0-H6 Graph Depth Policy

JIT traversal must support a maximum depth of `6` hops.

```yaml
graph_traversal:
  max_depth_hops: 6
  acyclic_loop_check: true
```

The `H6` tier exists as the hard ceiling for full-network reasoning and should be rare. If ordinary work regularly needs `H6`, the architecture likely has excessive coupling and needs refactoring.

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

## 3. Traversal Requirements

Traversal must remain bi-directional:

- upward through parent relationships
- downward through child relationships

The renderer must build a bespoke virtual document from the visited node set rather than exposing the raw source tree.

Minimum behavior:

```text
pivot node
  -> bounded traversal by H tier
  -> visited node set
  -> virtual document render
  -> agent consumes scoped context only
```

## 4. Hybrid Retrieval Enforcement

The retrieval stack must preserve the 4-layer order:

1. atomic or exact match
2. FTS layer
3. vector or semantic layer
4. graph expansion or reranking layer

FTS is mandatory as layer 2 and must not be skipped when exact atomic match fails.

## 5. Verification and Enforcement

- Run verification guards before merge or deployment.
- Reject traversal configs that exceed `H6`.
- Reject graph states that exceed `W4`.
- Fail handover compliance when implementation still references legacy `R10` naming as canonical.

## 6. Handover Outcome

This document hands over the operational instructions for:

- H0-H6 depth routing
- W-Scale fan-out limiting
- bi-directional JIT traversal
- hybrid retrieval enforcement

The long-term source of truth for these rules must remain in the standard and feature documents, with this handover acting as an implementation transfer layer.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 2.2.0-ga | 2026-08-03 | THESEUS | Normalized legacy release version and governed metadata under delegated Phase 1B authority; no handover content is approved as canonical. |
