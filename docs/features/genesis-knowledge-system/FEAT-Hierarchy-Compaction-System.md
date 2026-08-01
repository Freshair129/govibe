# FEAT: Hierarchy Compaction System

**Status:** `DRAFT`  
**Version:** `0.2.0+draft`  
**Updated:** `2026-08-01`  
**Primary PRD System:** `SYSTEM-08::Genesis-Knowledge-System`  
**Supporting PRD System:** `SYSTEM-03::Docs-to-Code-System`  
**Owner:** ARCHON  
**Auditor:** ATHER

## 1. Goal

Provide a hierarchy-compaction and retrieval-planning model that decides how much document, graph, and contextual detail should be rendered for an agent task without reusing `H` as a retrieval or compaction scale.

Canonical separation:

```text
H0-H4 = executor Access Scope / tool-permission ceiling
R0-R6 = graph retrieval radius
D = representation/compaction depth or resolution
W2-W4 = fan-out / branching width
context budget = token/content allowance
```

## 2. Core Responsibilities

- select retrieval radius `R0-R6` from task and retrieval policy
- select compaction/resolution depth `D` independently of retrieval radius
- resolve context boundaries through anchors, graph distance, hierarchy, and provenance
- enforce W-scale limits on peer branching or node degree
- compact multiple atomic knowledge fragments into human-manageable source views
- preserve enough structure for later graph extraction and just-in-time retrieval
- consume an Access Scope decision without deriving retrieval radius or budget from it

## 3. Output Model

```text
request
  -> policy and source-of-truth resolution
  -> Access Scope authorization (H0-H4, external governance decision)
  -> retrieval radius selection (R0-R6)
  -> compaction/resolution selection (D)
  -> context-budget enforcement
  -> bounded document or section set
  -> downstream graph and JIT consumption
```

## 4. Naming Contract

Use:

```text
RetrievalRadiusPlanner
CompactionDepthPlanner
ContextBudgetPlanner
resolveGraphScope(target, retrievalPolicy)
```

Do not use:

```text
HLevelClassifier for retrieval
H0-H6 context tier
H6 full-network traversal
classifyHLevel as graph-radius selection
```

## 5. Acceptance Criteria

- Access Scope is represented only as `H0-H4` and governs capabilities, not content reach.
- Retrieval-radius selection is explicit, reviewable, and represented as `R0-R6` or an equivalent structured retrieval policy.
- Compaction depth `D` and context budget are explicit and independent.
- Fan-out width remains reviewable through W-scale.
- Human-readable source documents remain canonical after compaction.
- Compaction reduces document sprawl without erasing traceability or provenance.
- Downstream systems can build graph and retrieval context from compacted views.
- Increasing H does not silently increase R, D, or budget.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0+draft | 2026-08-01 | ARCHON / ATHER | Replaced legacy H0-H6 compaction/retrieval semantics with separate R, D, W, budget, and H0-H4 Access Scope axes. |
| legacy | 2026-06-12 | ARCHON / ATHER | Initial draft used H0-H6 as a context-compaction scale. |
