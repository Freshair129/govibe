---
title: "LLD: Task-Scoped Context Injection Core"
doc_id: "LLD-TASK-SCOPED-CONTEXT-INJECTION-CORE"
uid: "01KVXGFW1HNET9S20GYQPMMDPQ"
status: "approved"
version: "0.1.1"
content_hash: "atom:72957291b83ebc06"
updated: "2026-06-19"
owner: "ARCHON / ATHER"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
supporting_prd_systems:
  - "SYSTEM-03::Docs-to-Code-System"
  - "SYSTEM-08::Genesis-Knowledge-HCS-System"
  - "SYSTEM-09::Traceability-Audit-Verification-System"
  - "SYSTEM-10::Execution-Governance-System"
related_docs:
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/features/agent-team/FEAT-Task-Scoped-Context-Injection.md"
  - "docs/srs/SRS-GoVibe-Task-Scoped-Context-Injection.md"
  - "docs/adr/ADR-013-Task-Scoped-Context-Injection.md"
  - "docs/architecture/BLUEPRINT-Task-Scoped-Context-Injection.md"
  - "docs/api/API-004-Task-Scoped-Context-Packet-Schema.md"
  - "docs/design/GoVibe-Document-Hierarchy.md"
---

# LLD: Task-Scoped Context Injection Core

## 1. Purpose

Define the component-level execution logic for the `Task-Scoped Context Injection` core packet lifecycle.

This LLD is implementation-facing and sits below:

- `PRD-GoVibe-Platform-Overview`
- `FEAT-Task-Scoped-Context-Injection`
- `SRS-GoVibe-Task-Scoped-Context-Injection`
- `ADR-013-Task-Scoped-Context-Injection`
- `BLUEPRINT-Task-Scoped-Context-Injection`
- `API-004-Task-Scoped-Context-Packet-Schema`

This document does not reopen:

- feature scope
- taxonomy
- packet or result wire schema
- escalation class taxonomy
- tenant or vault persistence design

## 2. Design Scope

This LLD covers the internal execution logic for all eight fixed components defined in BLUEPRINT §5:

- `Baseline Policy Injector`
- `Source Ref Selector`
- `Verification Expectation Injector`
- `Critical Issue Injector`
- `Escalation Contract` (BLUEPRINT §5.6) — realized here as cross-component escalation behavior, with ownership mapped explicitly in §9 Escalation Ownership Map rather than as a standalone component section, to avoid duplicating escalation logic
- `Task Context Assembler`
- `Result and Learning Classifier`
- `Promotion Gate`

This LLD treats the following as fixed upstream contracts:

- packet and result schema from `API-004`
- assembly order and context precedence from the blueprint
- module boundary and non-goals from the FEAT and SRS

## 3. Governing Rules

The implementation must preserve the following rules from upstream source documents:

1. Approved source docs and governed runtime metadata outrank all promoted learnings and executor notes.
2. Raw chat history is never a default input to packet assembly.
3. Missing required context must trigger escalation, not wider retrieval.
4. `nonPromotedNotes` never become shared durable context without explicit downstream approval.
5. Promotion review is lead-owned and must remain separate from bounded executor output generation.

## 4. Core Execution Flow

```text
task metadata
  -> baseline policy injection
  -> source ref selection
  -> verification expectation injection
  -> critical issue injection
  -> optional promoted prior learning lookup
  -> task context assembly
  -> bounded executor
  -> result normalization and learning classification
  -> lead review
  -> promotion gate decision
```

## 5. Stage Model

| Stage | Component | Type | Output Class |
|---|---|---|---|
| 1 | Baseline Policy Injector | deterministic transform | baseline policy block |
| 2 | Source Ref Selector | deterministic selection | approved source refs and file refs |
| 3 | Verification Expectation Injector | deterministic selection | verification expectation set |
| 4 | Critical Issue Injector | deterministic selection | critical known issue set |
| 5 | Optional promoted learning lookup | deterministic retrieval | promoted prior learning set |
| 6 | Task Context Assembler | deterministic assembly | `TaskScopedContextPacket` |
| 7 | Bounded executor | external execution | raw executor result |
| 8 | Result and Learning Classifier | deterministic normalization | `TaskScopedExecutionResult` |
| 9 | Lead review | review-gated decision | review outcome |
| 10 | Promotion Gate | review-gated decision | approved, rejected, and retained note sets |

Deterministic stages may compute, filter, order, and normalize data, but may not widen task scope.

Review-gated stages may approve or reject promoted knowledge, but may not override source-of-truth precedence.

## 6. Input Sources

### 6.1 Required Inputs

| Input Source | Used By | Notes |
|---|---|---|
| task metadata | all assembly stages | includes task id, objective, constraints, workspace scope, and module scope |
| workspace scope | source selection and assembly | must already be governed by the caller |
| module scope | source selection and assembly | must be narrow enough to avoid cross-module drift |
| approved source refs | source selection and assembly | doc refs and governed refs only |
| relevant file refs | source selection and assembly | live repo refs only, never speculative refs |
| verification expectations | verification injector and assembly | must align to task slice |
| critical known issues | critical issue injector and assembly | only issues material to current execution slice |

### 6.2 Optional Inputs

| Input Source | Used By | Notes |
|---|---|---|
| promoted prior learnings | learning lookup and assembly | subordinate to approved docs |
| debug history refs | assembler passthrough only | audit or debug only, never primary assembly input |

## 7. Component Design

## 7.1 Baseline Policy Injector

### Purpose

Inject the stable execution policy required for bounded delegation.

### Inputs

- task metadata
- actor class or executor class
- execution governance policy
- review ownership policy

### Computed Output

- normalized baseline policy block

### Pass-Through Fields

- task id
- workspace id
- module scope

### Responsibilities

- apply stable constraints that must hold for the full task slice
- attach bounded execution policy
- attach review and escalation ownership
- keep policy separate from task-specific evidence or refs

### Failure Handling

- if task metadata lacks a usable execution class or review owner, emit `needs_more_context`
- component must not infer a broader policy from unrelated tasks

## 7.2 Source Ref Selector

### Purpose

Select approved source refs and relevant file refs for the bounded packet.

### Inputs

- task metadata
- workspace scope
- module scope
- source-of-truth precedence rules
- approved doc indexes or governed source catalogs

### Computed Output

- approved source refs
- relevant file refs
- excluded ref set with exclusion reason

### Pass-Through Fields

- task id
- workspace id
- module scope

### Responsibilities

- prefer approved docs, live repo refs, and structured references
- exclude stale, speculative, or non-authoritative refs
- maintain traceable selection reasons
- avoid transcript-first assembly

### Failure Handling

| Condition | Escalation Class | Reason |
|---|---|---|
| no approved source refs available for required task slice | `missing_source_truth` | task cannot proceed without governed source truth |
| required file refs cannot be identified within bounded scope | `needs_more_context` | selection cannot complete safely |
| module scope resolves to multiple conflicting module candidates | `scope_conflict` | caller must narrow scope before execution |

## 7.3 Verification Expectation Injector

### Purpose

Attach the verification expectations that the bounded executor must satisfy or report against.

### Inputs

- task metadata
- module scope
- feature or system verification requirements
- governed verification baselines

### Computed Output

- verification expectation set

### Pass-Through Fields

- task id
- module scope

### Responsibilities

- map task slice to relevant verification expectations
- include only expectations relevant to the bounded slice
- avoid expanding into unrelated validation suites

### Failure Handling

| Condition | Escalation Class | Reason |
|---|---|---|
| required verification basis exists but cannot be resolved for this slice | `verification_blocked` | executor cannot verify against an incomplete requirement set |
| task implies verification beyond bounded scope | `scope_conflict` | caller must split or narrow the task |

## 7.4 Critical Issue Injector

### Purpose

Inject known critical issues that must shape execution or review.

### Inputs

- task metadata
- module scope
- approved issue or risk references
- governed known-problem set

### Computed Output

- critical known issue set

### Pass-Through Fields

- task id
- module scope

### Responsibilities

- include only issues with real impact on current task execution
- distinguish material blockers from informational notes
- preserve issue traceability

### Failure Handling

- absence of critical issues is valid and returns an empty set
- if issue sources conflict with approved docs, approved docs win and conflicting issue refs are excluded

## 7.5 Optional Promoted Learning Lookup

### Purpose

Retrieve promoted prior learnings that may reduce repeated mistakes without becoming source of truth.

### Inputs

- task metadata
- workspace scope
- module scope
- approved promoted learning index

### Computed Output

- promoted prior learning set

### Pass-Through Fields

- task id
- workspace id
- module scope

### Responsibilities

- include only already-promoted learnings relevant to the current task slice
- keep learnings subordinate to approved docs and runtime metadata
- exclude private notes and non-promoted notes

### Failure Handling

- no matching promoted learnings is valid and returns an empty set
- retrieval failure does not widen search and may return empty only when approved docs remain sufficient

## 7.6 Task Context Assembler

### Purpose

Construct one bounded `TaskScopedContextPacket` from the selected inputs.

### Inputs

- task metadata
- baseline policy block
- approved source refs
- relevant file refs
- verification expectation set
- critical known issue set
- optional promoted prior learning set
- optional debug history refs

### Computed Output

- one assembled `TaskScopedContextPacket`

### Pass-Through Fields

- `status` (set to `ready` on the assembled packet)
- `taskId`
- `workspaceId`
- `moduleScope`
- `objective`
- `constraints`
- `sourceRefs`
- `fileRefs`
- `verificationExpectations`
- `criticalKnownIssues`
- optional `promotedPriorLearnings`
- optional `debugHistoryRefs`

### Responsibilities

- enforce the upstream assembly order exactly
- merge inputs into one bounded packet
- ensure required fields are present before execution
- keep optional debug history out of primary reasoning fields

### Assembly Order

1. start packet shell from task metadata
2. attach baseline policy block
3. attach approved source refs and relevant file refs
4. attach verification expectations
5. attach critical known issues
6. attach optional promoted prior learnings
7. attach optional debug history refs
8. run packet completeness and scope-boundary checks
9. emit final packet or escalation-ready failure output

### Failure Handling

| Condition | Escalation Class | Raised By |
|---|---|---|
| missing required source refs after selection phase | `missing_source_truth` | Task Context Assembler |
| missing required file refs after selection phase | `needs_more_context` | Task Context Assembler |
| ambiguous or conflicting module scope after upstream resolution | `scope_conflict` | Task Context Assembler |
| required verification expectations absent for task slice | `verification_blocked` | Task Context Assembler |

### Required Behavior

- stop on missing required inputs
- emit escalation-ready output instead of widening retrieval
- preserve approved-doc precedence over promoted learnings
- preserve bounded scope even when packet is incomplete

## 7.7 Result and Learning Classifier

### Purpose

Normalize raw bounded executor output into the governed result contract defined in `API-004`.

### Inputs

- raw executor result
- task metadata
- verification expectation set
- critical known issue set

### Computed Output

- normalized `TaskScopedExecutionResult`

### Pass-Through Fields

- executor-reported status
- files touched
- result summary
- executor-reported verification evidence

### Responsibilities

- normalize executor output into the required result shape
- separate critical issues from critical knowledge
- separate durable learnings from non-promoted notes
- preserve escalation reason when present

### Classification Rules

| Output Bucket | Meaning | Promotion Eligibility |
|---|---|---|
| `criticalIssues` | blockers, scope conflicts, or defects that materially affect delivery | no automatic promotion |
| `criticalKnowledge` | high-impact implementation knowledge worth lead review | review-gated |
| `durableLearnings` | reusable learnings that may reduce future repetition | review-gated |
| `nonPromotedNotes` | local observations, scratch notes, or low-confidence details | never auto-promoted |

### Failure Handling

- malformed executor result is normalized into a failed result with `needs_more_context` only when required fields cannot be interpreted
- classifier must not invent missing evidence or verification status

## 7.8 Lead Review

### Purpose

Apply human or lead-agent approval before any knowledge becomes shared durable context.

### Inputs

- normalized `TaskScopedExecutionResult`
- task metadata
- source-of-truth precedence rules
- lead review policy

### Output

- review outcome with accepted, rejected, and needs-escalation signals

### Responsibilities

- validate that promoted candidates do not contradict approved docs
- validate that critical issues were surfaced correctly
- determine whether execution result is complete enough for promotion review

### Failure Handling

- contradictions with approved docs force rejection of conflicting promoted items
- unresolved source-of-truth gaps may escalate as `missing_source_truth`

## 7.9 Promotion Gate

### Purpose

Convert the reviewed execution result into governed promotion outputs.

### Inputs

- `TaskScopedExecutionResult`
- lead review outcome

### Outputs

- approved promotion set
- rejected promotion set
- retained private notes set

### Responsibilities

- review `criticalKnowledge` and `durableLearnings` separately
- block automatic promotion of `nonPromotedNotes`
- preserve precedence where approved docs remain dominant over promoted learnings
- separate governance approval from downstream persistence

### Decision Rules

| Candidate Bucket | Default Treatment | Allowed Outcome |
|---|---|---|
| `criticalKnowledge` | review-required | approve or reject |
| `durableLearnings` | review-required | approve or reject |
| `nonPromotedNotes` | private by default | retain private only |
| `criticalIssues` | issue tracking, not promotion | retain in result or escalate |

### Failure Handling

- if lead review is incomplete, no promotion occurs
- if source-of-truth conflict remains unresolved, conflicting items are rejected and may escalate

## 8. Computed vs Pass-Through Boundary

### Computed Within This Module

- baseline policy block
- selected source refs
- selected file refs
- verification expectation set
- critical known issue set
- optional promoted prior learning set
- assembled packet ordering and completeness state
- normalized result buckets
- promotion approval or rejection outcome

### Passed Through From Upstream or Executor Contracts

- task identifiers and workspace identifiers
- task objective and constraints
- approved source materials themselves
- executor raw work output before normalization
- result schema fields defined by `API-004`

This module computes selection, ordering, normalization, and review decisions. It does not redefine external schemas.

## 9. Escalation Ownership Map

| Component | Escalation Class | Trigger |
|---|---|---|
| Baseline Policy Injector | `needs_more_context` | missing execution policy, review owner, or bounded task metadata |
| Source Ref Selector | `missing_source_truth` | no approved source truth for required task slice |
| Source Ref Selector | `needs_more_context` | required file refs cannot be safely identified |
| Source Ref Selector | `scope_conflict` | module scope maps to conflicting candidates |
| Verification Expectation Injector | `verification_blocked` | required verification basis unavailable |
| Verification Expectation Injector | `scope_conflict` | task implies verification beyond bounded scope |
| Task Context Assembler | `missing_source_truth` | required source refs still absent at assembly |
| Task Context Assembler | `needs_more_context` | required packet fields remain incomplete |
| Task Context Assembler | `scope_conflict` | packet cannot be assembled without widening scope |
| Task Context Assembler | `verification_blocked` | packet lacks required verification expectations |
| Result and Learning Classifier | `needs_more_context` | executor result cannot be normalized safely |
| Lead Review | `missing_source_truth` | promoted items conflict with or lack approved source truth |

Bounded executors consume these escalation classes and must escalate instead of silently broadening scope.

## 10. Persistence Boundary

This LLD does not define new durable storage schemas.

The persistence boundary is limited to conceptual ownership:

- packet metadata may be logged for audit by a downstream governed system
- approved promoted learnings may be persisted by a downstream governed store
- rejected promotion candidates remain non-canonical
- retained private notes remain private or ephemeral

Packet assembly, classification, and promotion review must work without introducing new tenant or vault schema in this round.

## 11. Non-Goals

- runtime implementation details
- new API payload schema
- tenant or vault storage expansion
- Mission Control UI behavior
- raw transcript-centric context loading

## 12. Verification Expectations

The LLD round is considered ready when:

1. the execution sequence is explicit end to end
2. each component lists inputs, outputs, and failure behavior
3. escalation ownership is explicit and aligned to `API-004`
4. promotion review boundaries are explicit
5. no key packet-lifecycle decision is left to implementer inference
6. the document is registered in `docs/DOC-VERSION-REGISTRY.md`

## 13. Traceability

- Primary system: `SYSTEM-05::Agent-Team-Management-System`
- Supporting systems:
  - `SYSTEM-03::Docs-to-Code-System`
  - `SYSTEM-08::Genesis-Knowledge-HCS-System`
  - `SYSTEM-09::Traceability-Audit-Verification-System`
  - `SYSTEM-10::Execution-Governance-System`
- Upstream contracts:
  - `docs/features/agent-team/FEAT-Task-Scoped-Context-Injection.md`
  - `docs/srs/SRS-GoVibe-Task-Scoped-Context-Injection.md`
  - `docs/adr/ADR-013-Task-Scoped-Context-Injection.md`
  - `docs/architecture/BLUEPRINT-Task-Scoped-Context-Injection.md`
  - `docs/api/API-004-Task-Scoped-Context-Packet-Schema.md`

## 14. Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1 | 2026-06-20 | ARCHON / ATHER | Signed off; promoted draft -> approved. |
| 0.1.1 | 2026-06-20 | ARCHON / ATHER | Converted §7.6 Pass-Through Fields to camelCase and added the `status` (ready) field to assembler output for API-004 alignment; corrected §2 Design Scope to acknowledge all eight BLUEPRINT components and map the Escalation Contract (BLUEPRINT §5.6) to the §9 Escalation Ownership Map. |
| 0.1.0 | 2026-06-19 | ARCHON / ATHER | Initial component-level LLD for the task-scoped context injection core packet lifecycle and promotion review loop. |
