---
title: "Mode 2 Deliverable 9: Phase 1 Implementation Roadmap"
doc_id: "MODE2-IMPLEMENTATION-ROADMAP"
status: "draft"
version: "0.13.0"
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
| T1 Foundation | 1–6 | Adapters, external binding, Stages 1–4 (library only, no MCP surface) | done |
| T2 Extraction | 7 | Stages 5–11 | done |
| T3 Semantics | 8–9 | Candidate IR, F1–F4, coverage engine, intent pass | done |
| T4 Projection | 10–11 | 5 views, WHAT-IS vs WHAT-SHOULD-BE | done |
| T5 Compilation | 12–16 | Roadmap compiler, POC matrix, measurement | done |
| T6 Context | — | Bounded context packet for executors (prompt §1 responsibility 7) + RCA corrective actions | in-progress |

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
| TASK-M2-008 | T2 | task | Implement Stages 5–6 (interface, data) | C-2 | H2 | done |
| TASK-M2-009 | T2 | task | Implement Stages 7–9 (behaviour, state, cross-cutting) — parser half only; inference tier deferred | C-3 | H3 | done |
| TASK-M2-010 | T2 | task | Implement Stage 10 (verification evidence) incl. `@req`/`@spec`/`@designs`/`@tested` annotation extractor per ADR-028 D1 | C-2 | H2 | review |
| TASK-M2-011 | T2 | task | Implement Stage 11 agentic scan and capability manifest | C-3 | H3 | done |
| TASK-M2-012 | T3 | task | Implement Stage 12 Candidate Semantic IR and the Mode 2 F1–F4 finalization operations per AMENDMENT-2026-08-12 | C-3 | H3 | done |
| TASK-M2-013 | T3 | task | Implement the semantic coverage engine and Block Profiles, incl. the section-coverage second axis and `R3` default traversal radius per ADR-028 D4/D6 | C-3 | H3 | review |
| TASK-M2-014 | T3 | task | Implement the top-down intent scan | C-3 | H3 | done |
| TASK-M2-015 | T4 | task | Implement the view router and five projections | C-3 | H3 | done |
| TASK-M2-016 | T4 | task | Implement WHAT-IS vs WHAT-SHOULD-BE gap analysis, incl. two-axis contradiction ranking and finding severity per ADR-028 D2/D3 | C-3 | H3 | review |
| TASK-M2-017 | T5 | task | Implement the roadmap compiler, incl. effort points and critical-path analysis per ADR-028 D5 (effort score must never write `C` or `H`) | C-3 | H3 | review |
| TASK-M2-018 | T5 | task | Extend `govibe.workspace.impact` for Mode 2 rather than duplicating it | C-2 | H2 | done |
| TASK-M2-019 | T5 | task | Run the five-class POC repository matrix | C-2 | H2 | done |
| TASK-M2-020 | T5 | task | Measure coverage, false relations, unresolved meaning, scan and rebuild time | C-2 | H2 | done |
| TASK-M2-022 | T6 | task | Emit a bounded context packet from the Mode 2 model so an executor can consume it | C-3 | H3 | done |
| TASK-M2-023 | T6 | task | RCA CA-02: extend Stage 3 to extract exported `VariableDeclaration` symbols | C-2 | H2 | done |
| TASK-M2-024 | T6 | task | RCA CA-03/CA-04: add a `context` semantic dimension and an `unconsumed_capability` gap class | C-2 | H2 | done |
| TASK-M2-025 | T6 | task | RCA CA-05: add acceptance criteria for prompt §1 responsibility 7 and audit the other eight | C-2 | H2 | done |
| TASK-M2-026 | T6 | task | Add a non-JavaScript POC class so AC-H1 can be met | C-2 | H2 | planned |
| TASK-M2-027 | T6 | task | RCA CA-06 done; CA-07 raised: deduplicate or annotate `REPORTED_TOKEN_FIELDS` | C-0 | H0 | planned |

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

### 3.1.3 Three tasks are `review` pending ADR-028

`TASK-M2-016` and `TASK-M2-017` join `TASK-M2-010` and `TASK-M2-013` in `review`. Each ships
working code whose governing decision is still `proposed`: D2/D3 (contradiction ranking and
severity) for the gap analysis, and D5 (effort and critical path) for the compiler. Every one is
an isolated attribute or export, so acceptance or rejection is a small change either way.

### 3.1.4 Known limitation: task dependencies are not inferred

The compiler emits `dependencies: []` for every task, so `analyzeSchedule` reports a critical
path of length 1 on real input. The scheduling maths is implemented and tested against
hand-built graphs, but nothing yet derives inter-task dependencies from the gap set. Recorded
so the result is not mistaken for a computed schedule.

### 3.1.2 TASK-M2-013 is `review`, not `done`

The coverage engine ships, but its section-coverage second axis and `R3` traversal default are
ADR-028 Decisions 4 and 6, and that ADR is `proposed`. Both are isolated exports so either
outcome is a small change. Same posture as TASK-M2-010.

### 3.1.1 TASK-M2-010 is `review`, not `done`

Stage 10 ships complete, but its annotation extractor implements ADR-028 Decision 1 and that
ADR is `proposed`. The task cannot close until the owner accepts D1 or the extractor is
removed. It is isolated in `extractAnnotations` precisely so that either outcome is a small,
clean change.

### 3.1.6 RCA: why the scan never reported this gap itself

`docs/change-control/rca/RCA-2026-08-12-Context-Profiles-Not-Detected.md` records why five
tranches of Mode 2 scanned a repository containing `CONTEXT_PROFILES` and never reported the
missing capability. Four causes had to hold at once:

- Stage 3 handles six declaration kinds and **not** `VariableDeclaration`, so every exported
  constant in the codebase is invisible to it — the widest of the four causes;
- no `context` semantic dimension exists, so coverage had no slot to report the gap in;
- no gap class covers *implemented, exported, consumed by nobody*;
- **root cause:** the acceptance criteria inherited from prompt §29 cover eight of §1's nine
  responsibilities. Responsibility 7 has none, so no tranche was obliged to deliver it and no
  gate could fail for its absence.

Corrective actions CA-02 through CA-05 are bound to `TASK-M2-023`..`TASK-M2-025`.

### 3.1.5 Not implemented: context profiles and the context packet

**Resolved by `TASK-M2-022`.** `packages/govibe-core/src/mode2/context-bridge.mjs` now selects a
budget-bounded slice of the Mode 2 model and hands it to the existing `buildContextPacket`,
which retains ownership of lineage, profile invariants, and hashing. The section below records
the reasoning that led there and the constraints the bridge enforces.

Before that task, Mode 2 contained **no reference** to `T-ctx`, `V-ctx`, `W-ctx`, `M-ctx`,
`contextId`, or `buildContextPacket`.

This is an unimplemented capability, not a violation. The profiles govern *agent memory context
for a dispatched turn*, and a Mode 2 scan dispatches nothing — so `CLAUDE.md`'s rule that "every
dispatched turn must retain `contextId`, `cacheId`, ... and injection metadata" does not bind the
scan itself. Mode 2 would **feed** a profile, never select one.

What is genuinely missing is implementation-prompt §1 responsibility 7, *prepare bounded context
for humans and agents*. Mode 2 now produces the IR, coverage, gaps, views, and a roadmap, but
nothing turns them into a bounded, budget-aware packet an executor can consume. That is the
missing link between "GoVibe understands the workspace" and §32's "the executor is smarter
because it receives better structured meaning".

The machinery already exists in `packages/govibe-core/src/context-lineage.mjs`
(`CONTEXT_PROFILES`, `validateContextProfile`, `createContextLineage`) and
`context-packet.mjs` (`buildContextPacket`). `TASK-M2-022` binds the work of feeding them from
the Mode 2 model. Two constraints will apply when it is built: the packet carries
`context_budget` as its own axis — not `H`, not `R` — and Mode 2 output enters as a *candidate*
source, so a packet must not present unpromoted candidates as canonical knowledge.

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
| 10 | `POC-TEST-MATRIX.md` | `docs/mode2/POC-TEST-MATRIX.md` | done |

## 5. Phase 1 Acceptance Criteria

### 5.0 Responsibility traceability (RCA-2026-08-12 CA-05)

The criteria below were traced from implementation prompt §29. `RCA-2026-08-12` RC-4 found that
§29 is **not a complete decomposition of §1's nine responsibilities** — responsibility 7 had no
criterion at all, so no tranche was obliged to deliver it and no gate could fail for its absence.

This matrix is the corrective. **Every responsibility must map to at least one criterion, and a
partial mapping must name what is missing rather than be rounded up to covered.**

| # | §1 responsibility | Criteria | Verdict |
|---|---|---|---|
| 1 | understand heterogeneous projects | AC-W3, AC-S1..S3, **AC-H1** | **partial** — every criterion and every POC class is JavaScript or TypeScript |
| 2 | reconstruct software meaning from existing artifacts | AC-M1..M4, **AC-Q1** | covered once AC-Q1 is stated |
| 3 | normalize into Candidate Semantic IR | AC-M1, AC-M2 | covered |
| 4 | detect missing semantics and contradictions | AC-G1, AC-G2 | covered |
| 5 | generate multiple governed views | AC-V1..V3 | covered |
| 6 | preserve traceability | AC-M1/M2 (IR→source), AC-R2 (roadmap→gap) | covered |
| 7 | **prepare bounded context for humans and agents** | **AC-C1..C4** | covered by T6; had **no criterion at all** before this audit |
| 8 | build implementation and change roadmaps | AC-R1..R3 | covered |
| 9 | coordinate external execution systems through a provider-neutral interface | AC-X1, AC-X2, **AC-X5** | **partial** — neutrality is tested; coordination is not, because no invocable interface exists |

**The audit corrects the RCA's own estimate.** RC-4 stated that eight of nine responsibilities
had criteria. Checking each criterion against what it actually tests rather than what it sounds
adjacent to, three of those eight were only partial:

- **R1** — `AC-S*` tests scan *mechanics* (resumability, precedence, incrementality), not
  heterogeneity, and `AC-W3` tests one adapter rather than multiple language stacks.
  `POC-TEST-MATRIX` §8 already disclaims non-JavaScript behaviour. `AC-H1` names it.
- **R2** — `AC-M*` tests the *shape* of the reconstruction (provenance, marking, unresolved), not
  whether anything was reconstructed correctly. Accuracy was already measured by the POC fixtures
  but was never stated as a criterion; `AC-Q1` promotes the measurement to an obligation.
- **R9** — `AC-X1`/`AC-X2` test that the design is provider-neutral. Nothing tests coordination,
  because the MCP surface was withdrawn (§3.1) and Mode 2 currently has no invocable interface at
  all. `AC-X5` states this plainly instead of letting neutrality stand in for it.

Being adjacent to a responsibility is not the same as testing it. That substitution is what let
responsibility 7 go unbuilt for five tranches.

### 5.1 Criteria

A criterion is met only when the named evidence exists — never by assertion.

| ID | Criterion | Tranche | Status |
|---|---|---|---|
| AC-W1 | Claude Code can invoke GoVibe against its current repository | T2 | **unmet** — no MCP surface after the §3.1 withdrawal; the `claude-code` adapter works and is tested at the library level only |
| AC-W2 | Gemini CLI can invoke GoVibe against its current repository | T2 | **unmet** — same as AC-W1; the `gemini-cli` adapter is library-tested |
| AC-W3 | Generic filesystem adapter works | T1 | met — library level |
| AC-W4 | No project import or copy is required | T1 | met |
| AC-S1 | The twelve-stage scan is resumable | T1 | met |
| AC-S2 | Deterministic scanning precedes LLM inference | T1 | met |
| AC-S3 | Incremental rescan works for changed files | T1 | met |
| AC-M1 | Candidate atoms preserve provenance | T3 | met |
| AC-M2 | Candidate relations preserve provenance | T3 | met |
| AC-M3 | Inferred semantics are marked | T3 | met |
| AC-M4 | Unresolved meaning is explicit | T3 | met |
| AC-V1 | The view router selects relevant diagrams | T4 | met |
| AC-V2 | Multiple views derive from one semantic model | T4 | met |
| AC-V3 | View regeneration creates no new canonical identity | T4 | met |
| AC-G1 | WHAT-IS and WHAT-SHOULD-BE can be compared | T4 | met |
| AC-G2 | Missing/stale/drift candidates are reported with evidence | T4 | met |
| AC-A1 | External agent capabilities and governor can be analysed | T2 | met |
| AC-A2 | GoVibe does not replace the external governor | T2 | met |
| AC-A3 | `NATIVE`/`PLATFORM`/`MISSING` classification works | T2 | met |
| AC-R1 | The roadmap derives from observed gaps | T5 | met |
| AC-R2 | Phases/epics/features/tasks preserve source traceability | T5 | met |
| AC-R3 | Every major roadmap item has acceptance and verification criteria | T5 | met |
| AC-X1 | GoVibe remains provider-neutral | T1 | met |
| AC-X2 | External clients are adapters | T1 | met |
| AC-X3 | Workspace ownership remains external | T1 | met |
| AC-X4 | Canonical knowledge authority is not bypassed | T1 | met |
| AC-X5 | An external client can coordinate with Mode 2 through a governed interface | T2 | **unmet** — the MCP surface was withdrawn; blocked on TASK-M2-021 |
| AC-H1 | A repository whose primary language has no parser is represented in the POC matrix and produces an honest `incomplete` record | T6 | **unmet** — all five POC classes are JavaScript or TypeScript; bound to TASK-M2-026 |
| AC-Q1 | Extraction accuracy is measured against declared ground truth for every POC fixture class | T5 | met — `mode2/poc-matrix.test.mjs` asserts precision and recall for classes A, B, and E |
| AC-C1 | A bounded context packet can be produced from the Mode 2 model | T6 | met — `mode2/context-bridge.test.mjs` |
| AC-C2 | `context_budget` is enforced and never widens access scope | T6 | met — a 30× budget increase leaves `contextProfile` identical and adds no access field |
| AC-C3 | Mode 2 output enters a packet as a candidate, never as canonical knowledge | T6 | met — findings enter as `taskEventRefs`; `knowledgeRefs` is asserted empty |
| AC-C4 | A truncated packet declares its truncation in-band | T6 | met — `projection_state: PARTIAL` plus an executor-facing constraint |

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
| 0.13.0 | 2026-08-12 | RCA CA-03/CA-04 applied (TASK-M2-024 done). Every corrective action except CA-07 is closed. Implementing CA-03 exposed and fixed a latent incremental-invalidation defect in stages 7 and 12. | Claude Code |
| 0.12.0 | 2026-08-12 | RCA CA-06 applied: the duplicate `CONTEXT_PROFILES` declaration is gone. CA-02 surfaced two more duplications while doing it — CA-07 raised as TASK-M2-027; the second is an annotated cross-package mirror and not a defect. | Claude Code |
| 0.11.0 | 2026-08-12 | RCA CA-05 applied (TASK-M2-025 done): §5.0 responsibility traceability matrix added. The audit corrects the RCA's own estimate — three of the eight responsibilities it counted as covered were only partial. AC-C1..C4 added for responsibility 7; AC-H1, AC-Q1, AC-X5 added for the partials, two of them honestly unmet. TASK-M2-026 raised. | Claude Code |
| 0.10.0 | 2026-08-12 | RCA CA-02 applied (TASK-M2-023 done): Stage 3 now extracts exported variable declarations; symbols on this repository rose 1557 -> 2218 and the duplicate CONTEXT_PROFILES declaration is now machine-detectable. | Claude Code |
| 0.9.0 | 2026-08-12 | Tranche 6: context bridge shipped (TASK-M2-022 done). RCA-2026-08-12 recorded and its corrective actions bound to TASK-M2-023..025. | Claude Code |
| 0.8.0 | 2026-08-12 | Record that context profiles and the context packet are unimplemented (§3.1.5) and add TASK-M2-022 / tranche T6. | Claude Code |
| 0.7.0 | 2026-08-12 | Tranche 5 closed: TASK-M2-019/020 done, POC-TEST-MATRIX authored. All 20 implementation tasks are done or in review; only the four ADR-028-dependent tasks and the two RBAC-blocked tasks remain open. | Claude Code |
| 0.6.0 | 2026-08-12 | Tranches 4 and 5: TASK-M2-015/018 done; TASK-M2-016/017 `review` pending ADR-028 D2/D3/D5. AC-V1..V3, AC-G1/G2, AC-R1..R3 met. T3 and T4 closed. Recorded that task dependencies are not inferred. | Claude Code |
| 0.5.0 | 2026-08-12 | Tranche 3: TASK-M2-012/014 done, TASK-M2-013 `review` pending ADR-028 D4/D6. AC-M1..M4 met; AC-G1 partial. T2 closed. | Claude Code |
| 0.4.0 | 2026-08-12 | Tranche 2: TASK-M2-008/009/011 done, TASK-M2-010 `review` pending ADR-028 D1 acceptance. AC-A1/A2/A3 met. T1 closed. | Claude Code |
| 0.3.0 | 2026-08-12 | Withdraw the `govibe.workspace.inspect` MCP surface on owner direction after adversarial review rated exposure-before-ratification high. TASK-M2-007 moved to T2/`blocked`; AC-W1 and AC-W2 corrected from `met` to `unmet` because no client can invoke Mode 2 without a tool. The library capability is retained and tested. | Claude Code |
