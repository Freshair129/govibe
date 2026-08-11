---
title: "Mode 2 Deliverable 9: Phase 1 Implementation Roadmap"
doc_id: "MODE2-IMPLEMENTATION-ROADMAP"
status: "draft"
version: "0.3.0"
updated: "2026-08-12"
owner: "Boss (CEO)"
source_of_truth: false
access_scope: "H3"
complexity: "C-3"
related_docs:
  - "docs/mode2/CURRENT-AS-BUILT.md"
  - "docs/mode2/MODE2-ARCHITECTURE.md"
  - "docs/mode2/WORKSPACE-ADAPTER-CONTRACT.md"
  - "docs/mode2/DEEP-SCAN-12-STAGE-SPEC.md"
  - "docs/roadmap/MASTERPLAN-govibe-production-readiness.md"
  - "docs/adr/ADR-028-RWANG-Skill-Absorption-into-Mode-2-Deep-Scan.md"
  - "docs/change-control/change-requests/amendments/AMENDMENT-2026-08-12-F1-F4-Finalization-Definition.md"
---

# Mode 2 Deliverable 9: Phase 1 Implementation Roadmap

## 1. Plan-of-Record Boundary

`docs/roadmap/MASTERPLAN-govibe-production-readiness.md` states its own scope boundary:
*"this plan governs readiness, not new product surface."* Mode 2 **is** new product surface.
Mode 2 work therefore binds to `TASK-M2-*` in this document, not to `TASK-PRD-*`.

This plan does not supersede the readiness masterplan and must not regress any gate in its
§3 evidence baseline.

This document is `draft`. Ratification to `approved` is the owner's decision and is never
self-applied.

## 2. Tranche Plan

The implementation prompt §31 forbids implementing all diagrams, all adapters, and all
ontology types in one pass. Work proceeds in five tranches.

| Tranche | Prompt steps | Outcome | Status |
|---|---|---|---|
| T1 Foundation | 1–6 | Adapters, external binding, Stages 1–4 (library only, no MCP surface) | in-progress |
| T2 Extraction | 7 | Stages 5–11 | planned |
| T3 Semantics | 8–9 | Candidate IR, coverage engine | planned |
| T4 Projection | 10–11 | 5 views, WHAT-IS vs WHAT-SHOULD-BE | planned |
| T5 Compilation | 12–16 | Roadmap compiler, POC matrix, measurement | planned |

## 3. Backlog Items

| ID | Tranche | Type | Title | C | H | Status |
|---|---|---|---|---|---|---|
| TASK-M2-001 | T1 | task | Author the Mode 2 governing deliverable set | C-2 | H2 | done |
| TASK-M2-002 | T1 | task | Implement the metadata-only write choke point | C-1 | H1 | done |
| TASK-M2-003 | T1 | task | Implement `WorkspaceAdapter` and the three Phase-1 adapters | C-2 | H2 | done |
| TASK-M2-004 | T1 | task | Implement external workspace binding without touching Mode 1 | C-2 | H2 | done |
| TASK-M2-005 | T1 | task | Implement the Mode 2 stage contract and resumable pipeline | C-2 | H2 | done |
| TASK-M2-006 | T1 | task | Implement Stages 1–4 | C-2 | H2 | done |
| TASK-M2-007 | T2 | task | Expose `govibe.workspace.inspect` on the MCP catalog — **withdrawn 2026-08-12**, blocked on TASK-M2-021 | C-2 | H2 | blocked |
| TASK-M2-021 | T2 | task | Ratify `govibe.workspace.inspect` into the SPEC-Workspace-System §6.2 RBAC matrix | C-2 | H2 | blocked |
| TASK-M2-008 | T2 | task | Implement Stages 5–6 (interface, data) | C-2 | H2 | planned |
| TASK-M2-009 | T2 | task | Implement Stages 7–9 (behaviour, state, cross-cutting) | C-3 | H3 | planned |
| TASK-M2-010 | T2 | task | Implement Stage 10 (verification evidence) incl. `@req`/`@spec`/`@designs`/`@tested` annotation extractor per ADR-028 D1 | C-2 | H2 | planned |
| TASK-M2-011 | T2 | task | Implement Stage 11 agentic scan and capability manifest | C-3 | H3 | planned |
| TASK-M2-012 | T3 | task | Implement Stage 12 Candidate Semantic IR and the Mode 2 F1–F4 finalization operations per AMENDMENT-2026-08-12 | C-3 | H3 | planned |
| TASK-M2-013 | T3 | task | Implement the semantic coverage engine and Block Profiles, incl. the section-coverage second axis and `R3` default traversal radius per ADR-028 D4/D6 | C-3 | H3 | planned |
| TASK-M2-014 | T3 | task | Implement the top-down intent scan | C-3 | H3 | planned |
| TASK-M2-015 | T4 | task | Implement the view router and five projections | C-3 | H3 | planned |
| TASK-M2-016 | T4 | task | Implement WHAT-IS vs WHAT-SHOULD-BE gap analysis, incl. two-axis contradiction ranking and finding severity per ADR-028 D2/D3 | C-3 | H3 | planned |
| TASK-M2-017 | T5 | task | Implement the roadmap compiler, incl. effort points and critical-path analysis per ADR-028 D5 (effort score must never write `C` or `H`) | C-3 | H3 | planned |
| TASK-M2-018 | T5 | task | Extend `govibe.workspace.impact` for Mode 2 rather than duplicating it | C-2 | H2 | planned |
| TASK-M2-019 | T5 | task | Run the five-class POC repository matrix | C-2 | H2 | planned |
| TASK-M2-020 | T5 | task | Measure coverage, false relations, unresolved meaning, scan and rebuild time | C-2 | H2 | planned |

### 3.1 Withdrawn: the `govibe.workspace.inspect` MCP Surface

`govibe.workspace.inspect` was briefly registered on the MCP catalog and has been **withdrawn**
on owner direction, 2026-08-12.

It was exposed on the governed `govibe.workspace.*` namespace while absent from the
`RBAC_OPERATIONS` matrix in `packages/govibe-core/src/rbac.mjs` — the normative mirror of
`docs/specs/SPEC-Workspace-System.md` §6.2, which is `approved` and owner-owned. That inverted
the gate order: expose first, ratify later. Recording the gap in a `draft` plan is disclosure,
not authorization.

The withdrawal removes **both** layers. `scripts/mcp/handlers.mjs` `handleToolCall` dispatches
on its `switch` and never validates the name against `toolCatalog`, so removing only the
catalog entry would have left the tool callable but unadvertised — security by obscurity, worse
than either clean option. The catalog entry, the handler case, the `runtime-core` delegation,
and the `workspace-service` method are all gone; `scripts/mcp/` is byte-identical to `53e9269`.

**The capability itself is intact and proven.** `inspectExternalWorkspace` and
`bindExternalWorkspace` remain in `packages/govibe-core/src/mode2/external-binding.mjs`,
exported from the package index, and covered by tests. What T1 delivered is a library
capability, not a client-invocable tool. TASK-M2-021 must ratify §6.2 before the MCP surface
returns.

### 3.2 Bound Decisions

`docs/adr/ADR-028-RWANG-Skill-Absorption-into-Mode-2-Deep-Scan.md` (accepted 2026-08-12)
absorbs five RWANG document-intelligence mechanisms into this plan. Each is bound to the
task that must implement it, above. Two constraints from that ADR are load-bearing and must
not be lost in implementation:

- The imported effort score is an `effort_estimate` attribute. It must never be written into
  `complexity` (`C-0..C-3`) or `access_scope` (`H0..H4`).
- RWANG's flat `Code > SDD > PRD` trust hierarchy is adopted **only** for behavioural
  contradictions. For governed semantics the order is `STD / ADR > SDD > Code`. Ranking never
  auto-resolves a contradiction.

## 4. Deliverable Set Status

Prompt §30 names ten engineering deliverables. Those governing already-written code exist
now; the rest are authored in the tranche that builds what they govern — writing a spec for
unbuilt code ahead of its tranche produces documentation that the implementation then
contradicts.

| # | Deliverable | Path | Status |
|---|---|---|---|
| 1 | `CURRENT-AS-BUILT.md` | `docs/mode2/CURRENT-AS-BUILT.md` | done |
| 2 | `MODE2-ARCHITECTURE.md` | `docs/mode2/MODE2-ARCHITECTURE.md` | done |
| 3 | `WORKSPACE-ADAPTER-CONTRACT.md` | `docs/mode2/WORKSPACE-ADAPTER-CONTRACT.md` | done |
| 4 | `DEEP-SCAN-12-STAGE-SPEC.md` | `docs/mode2/DEEP-SCAN-12-STAGE-SPEC.md` | done |
| 5 | `SEMANTIC-IR-MAPPING.md` | `docs/mode2/` | T3 |
| 6 | `VIEW-ROUTER-SPEC.md` | `docs/mode2/` | T4 |
| 7 | `AGENTIC-CAPABILITY-MANIFEST.md` | `docs/mode2/` | T2 |
| 8 | `ROADMAP-COMPILER-SPEC.md` | `docs/mode2/` | T5 |
| 9 | `IMPLEMENTATION-ROADMAP.md` | this document | done |
| 10 | `POC-TEST-MATRIX.md` | `docs/mode2/` | T5 |

## 5. Phase 1 Acceptance Criteria

Traced from implementation prompt §29. A criterion is met only when the named evidence
exists — never by assertion.

| ID | Criterion | Tranche | Status |
|---|---|---|---|
| AC-W1 | Claude Code can invoke GoVibe against its current repository | T2 | **unmet** — no MCP surface after the §3.1 withdrawal; the `claude-code` adapter works and is tested at the library level only |
| AC-W2 | Gemini CLI can invoke GoVibe against its current repository | T2 | **unmet** — same as AC-W1; the `gemini-cli` adapter is library-tested |
| AC-W3 | Generic filesystem adapter works | T1 | met — library level |
| AC-W4 | No project import or copy is required | T1 | met |
| AC-S1 | The twelve-stage scan is resumable | T1 | met |
| AC-S2 | Deterministic scanning precedes LLM inference | T1 | met |
| AC-S3 | Incremental rescan works for changed files | T1 | met |
| AC-M1 | Candidate atoms preserve provenance | T3 | unmet |
| AC-M2 | Candidate relations preserve provenance | T3 | unmet |
| AC-M3 | Inferred semantics are marked | T3 | unmet |
| AC-M4 | Unresolved meaning is explicit | T3 | unmet |
| AC-V1 | The view router selects relevant diagrams | T4 | unmet |
| AC-V2 | Multiple views derive from one semantic model | T4 | unmet |
| AC-V3 | View regeneration creates no new canonical identity | T4 | unmet |
| AC-G1 | WHAT-IS and WHAT-SHOULD-BE can be compared | T4 | unmet |
| AC-G2 | Missing/stale/drift candidates are reported with evidence | T4 | unmet |
| AC-A1 | External agent capabilities and governor can be analysed | T2 | unmet |
| AC-A2 | GoVibe does not replace the external governor | T2 | unmet |
| AC-A3 | `NATIVE`/`PLATFORM`/`MISSING` classification works | T2 | unmet |
| AC-R1 | The roadmap derives from observed gaps | T5 | unmet |
| AC-R2 | Phases/epics/features/tasks preserve source traceability | T5 | unmet |
| AC-R3 | Every major roadmap item has acceptance and verification criteria | T5 | unmet |
| AC-X1 | GoVibe remains provider-neutral | T1 | met |
| AC-X2 | External clients are adapters | T1 | met |
| AC-X3 | Workspace ownership remains external | T1 | met |
| AC-X4 | Canonical knowledge authority is not bypassed | T1 | met |

## 6. POC Repository Matrix

| Class | Description | Candidate | Tranche |
|---|---|---|---|
| A | Simple single-service application | fixture tree | T5 |
| B | Medium modular application | fixture tree | T5 |
| C | Monorepo | this repository (`packages/*`) | T5 |
| D | Agentic-agent repository | RWANG | T5 |
| E | Repository with poor or no documentation | fixture tree | T5 |

RWANG is the reference agentic case precisely because it has its own execution and
governance system. GoVibe must understand it without replacing it.

## 7. Changelog

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1.0 | 2026-08-11 | Initial Phase 1 implementation roadmap. | Claude Code |
| 0.2.0 | 2026-08-12 | Bind ADR-028 decisions to TASK-M2-010/013/016/017; add TASK-M2-021 (RBAC ratification) and §3.1/§3.2. | Claude Code |
| 0.2.1 | 2026-08-12 | Bind Mode 2 F1–F4 finalization to TASK-M2-012 per AMENDMENT-2026-08-12. | Claude Code |
| 0.3.0 | 2026-08-12 | Withdraw the `govibe.workspace.inspect` MCP surface on owner direction after adversarial review rated exposure-before-ratification high. TASK-M2-007 moved to T2/`blocked`; AC-W1 and AC-W2 corrected from `met` to `unmet` because no client can invoke Mode 2 without a tool. The library capability is retained and tested. | Claude Code |
