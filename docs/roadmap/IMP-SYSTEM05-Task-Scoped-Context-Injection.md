---
title: "IMP: Task-Scoped Context Injection"
doc_id: "IMP-SYSTEM05-TASK-SCOPED-CONTEXT-INJECTION"
status: "approved"
version: "0.1.2"
updated: "2026-06-19"
owner: "LYRA / ARCHON / ATHER"
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
  - "docs/lld/LLD-Task-Scoped-Context-Injection-Core.md"
  - "docs/design/GoVibe-Document-Hierarchy.md"
---

# IMP: Task-Scoped Context Injection

**ImpId:** `IMP-SYSTEM05-TASK-SCOPED-CONTEXT-INJECTION`  
**Source Spec:** `docs/features/agent-team/FEAT-Task-Scoped-Context-Injection.md`  
**Supporting Specs:** `docs/srs/SRS-GoVibe-Task-Scoped-Context-Injection.md`, `docs/architecture/BLUEPRINT-Task-Scoped-Context-Injection.md`, `docs/api/API-004-Task-Scoped-Context-Packet-Schema.md`, `docs/lld/LLD-Task-Scoped-Context-Injection-Core.md`  
**Product Boundary:** `SYSTEM-05::Agent-Team-Management-System`  
**Methodology:** `DDD + CoDev multi-agent execution`  
**Complexity:** `C-3`  
**Risk:** `MEDIUM`  
**Gate:** `Doc/spec first -> approval -> implementation`  
**Status:** `pending`  
**Progression:** `0%`  
**Target:** `task -> sub-task -> micro-task -> atomic-task`  
**Plan Source Path:** `docs/roadmap/IMP-SYSTEM05-Task-Scoped-Context-Injection.md`

## Goal

Translate the approved `FEAT + SRS + ADR + BLUEPRINT + API + LLD` stack for `Task-Scoped Context Injection` into a bounded implementation sequence that local executors and sub-agents can perform without reopening architecture, schema, or taxonomy decisions.

This plan exists to lock:

- implementation order
- slice boundaries
- handoff and executor contract
- verification gates
- escalation expectations when required context is missing

## Source Hierarchy Check

- [x] Work belongs under an existing platform PRD system
- [x] Module source doc is identified
- [x] SRS exists for implementation-facing requirements
- [x] Architecture and design docs are identified for this C-3 slice

## Execution Rules

### Source-Of-Truth Precedence

1. approved source docs and governed runtime metadata
2. explicit execution policy and verification requirements
3. approved critical known issues
4. approved promoted prior learnings
5. executor-generated notes and observations

Precedence is fixed by BLUEPRINT §7 / LLD §3; this plan does not re-order it. Raw debug history is evidence only and is never canonical task context.

### Bounded Executor Contract

Executors for each slice may:

- read only the source docs named in the slice packet
- inspect only files directly named by the slice packet
- write only files assigned by the slice packet
- escalate instead of widening scope

Executors for each slice must not:

- use `docs/ref/` as source of truth
- use raw chat history as default packet content
- promote `nonPromotedNotes` into shared durable context
- widen module or workspace scope without lead approval
- redefine packet or result schema already fixed by `API-004`

### Escalation Rule

Escalate immediately when the slice encounters:

- `missing_source_truth`
- `needs_more_context`
- `scope_conflict`
- `verification_blocked`

No slice may respond to these conditions by broad repo scanning or implicit scope growth.

## Delivery Sequence

### Sequential Slices

The following slices must remain sequential because each later slice consumes the contract locked by the earlier slice:

1. assembly skeleton
2. source and verification injection
3. packet assembly integration
4. result normalization and classification
5. promotion gate and review loop

### Parallelizable Work

The following work may run in parallel only after the owning sequential slice is implemented:

- unit tests for deterministic components inside the current slice
- packet fixture creation for positive and negative paths
- audit and verification evidence wiring that does not change upstream contracts

## Execution Table

| Status | Task ID | Task Details | Pt | Mode | Dependency | Symbollink | Assign To | Model Name | Context | Verification Link | Predicted Tokens | Actual Input | Actual Output | Tool Calling | Total Tokens | Start | End |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| waiting | `TASK-TSCI-01` | Assembly skeleton | 5 | SERIAL | - | `docs/lld/LLD-Task-Scoped-Context-Injection-Core.md` | lead agent or module worker | codex | 32k | `[#verification-expectations](#verification-expectations)` | 1800 | - | - | - | - | - | - |
| waiting | `TASK-TSCI-02` | Source and verification injection | 8 | SERIAL | `TASK-TSCI-01` | `docs/api/API-004-Task-Scoped-Context-Packet-Schema.md` | lead agent or module worker | codex | 16k | `[#verification-expectations](#verification-expectations)` | 2600 | - | - | - | - | - | - |
| waiting | `TASK-TSCI-03` | Packet assembly integration | 5 | SERIAL | `TASK-TSCI-02` | `docs/architecture/BLUEPRINT-Task-Scoped-Context-Injection.md` | lead agent or module worker | codex | 24k | `[#verification-expectations](#verification-expectations)` | 2200 | - | - | - | - | - | - |
| waiting | `TASK-TSCI-04` | Result normalization and classification | 5 | SERIAL | `TASK-TSCI-03` | `docs/api/API-004-Task-Scoped-Context-Packet-Schema.md` | lead agent or module worker | codex | 24k | `[#verification-expectations](#verification-expectations)` | 2200 | - | - | - | - | - | - |
| waiting | `TASK-TSCI-05` | Promotion gate and review loop | 5 | SERIAL | `TASK-TSCI-04` | `docs/lld/LLD-Task-Scoped-Context-Injection-Core.md` | lead agent or module worker | codex | 24k | `[#verification-expectations](#verification-expectations)` | 2000 | - | - | - | - | - | - |
| waiting | `TASK-TSCI-06` | Audit and operational closure | 3 | PARALLEL-ELIGIBLE | `TASK-TSCI-05` | `docs/features/agent-team/FEAT-Task-Scoped-Context-Injection.md` | lead agent or auditor support | codex | 16k | `[#verification-expectations](#verification-expectations)` | 1400 | - | - | - | - | - | - |

## Assignments

| Task ID | Subject ID | Subject Type | Policy Model | Assigned By | Default Role |
|---|---|---|---|---|---|
| `TASK-TSCI-01` | `system-05-parent` | lead agent | ABAC | `LYRA` | assembly owner |
| `TASK-TSCI-02` | `system-05-parent` | lead agent | ABAC | `LYRA` | selector owner |
| `TASK-TSCI-03` | `system-05-parent` | lead agent | ABAC | `LYRA` | packet integration owner |
| `TASK-TSCI-04` | `system-05-parent` | lead agent | ABAC | `LYRA` | result contract owner |
| `TASK-TSCI-05` | `system-05-parent` | lead agent | ABAC | `LYRA` | promotion review owner |
| `TASK-TSCI-06` | `ather-support` | auditor support | ABAC | `LYRA` | traceability owner |

## Task Breakdown

### TASK-TSCI-01: Assembly skeleton

- [ ] `S-TSCI-01.1` Build the packet shell from task metadata and baseline policy only.
  - [ ] `M-TSCI-01.1` Implement task metadata intake and baseline policy block construction.
    - [ ] `A-TSCI-01.1` Verify required packet shell fields exist before any source or learning injection.
- [ ] `S-TSCI-01.2` Lock the packet completeness checks that are possible before source selection begins.
  - [ ] `M-TSCI-01.2` Keep learning promotion logic out of this slice.
    - [ ] `A-TSCI-01.2` Verify incomplete shell states return bounded failure output, not expanded scope.

Entry criteria:

- `FEAT`, `SRS`, `BLUEPRINT`, `API`, and `LLD` are approved for use
- required packet shell fields are fixed by `API-004`

Expected outputs:

- packet shell implementation
- baseline policy block integration
- early completeness checks for task metadata and policy fields

Verification gate:

- shell matches required `API-004` packet fields that belong to this slice
- missing metadata or policy owner yields escalation, not inference

### TASK-TSCI-02: Source and verification injection

- [ ] `S-TSCI-02.1` Implement approved source ref selection and relevant file ref selection.
  - [ ] `M-TSCI-02.1` Exclude stale, speculative, or transcript-first input paths.
    - [ ] `A-TSCI-02.1` Verify `missing_source_truth`, `needs_more_context`, and `scope_conflict` paths.
- [ ] `S-TSCI-02.2` Implement verification expectation injection and critical issue injection.
  - [ ] `M-TSCI-02.2` Keep verification and issue sets limited to the current bounded slice.
    - [ ] `A-TSCI-02.2` Verify `verification_blocked` is emitted when required verification basis is unavailable.

Entry criteria:

- packet shell and baseline policy block exist
- source-of-truth precedence rules are available from blueprint and LLD

Expected outputs:

- approved source refs
- relevant file refs
- verification expectation set
- critical known issue set
- explicit exclusion reasons for rejected refs

Verification gate:

- no raw chat history becomes default packet input
- no out-of-scope repo traversal is used to compensate for missing refs

### TASK-TSCI-03: Packet assembly integration

- [ ] `S-TSCI-03.1` Merge selected inputs into one bounded `TaskScopedContextPacket`.
  - [ ] `M-TSCI-03.1` Apply deterministic assembly order from the blueprint and LLD.
    - [ ] `A-TSCI-03.1` Verify precedence where approved docs outrank promoted prior learnings.
- [ ] `S-TSCI-03.2` Add optional promoted prior learning lookup without changing precedence rules.
  - [ ] `M-TSCI-03.2` Keep debug history refs optional and non-primary.
    - [ ] `A-TSCI-03.2` Verify missing optional inputs do not widen retrieval.

Entry criteria:

- source and verification injectors exist
- packet wire shape is fixed

Expected outputs:

- one complete bounded packet
- deterministic ordering behavior
- bounded handling for optional promoted learnings

Verification gate:

- packet order follows the blueprint exactly
- promoted prior learnings never override approved docs

### TASK-TSCI-04: Result normalization and classification

- [ ] `S-TSCI-04.1` Normalize raw executor output into `TaskScopedExecutionResult`.
  - [ ] `M-TSCI-04.1` Separate `status`, `filesTouched`, `resultSummary`, and `verificationStatus`.
    - [ ] `A-TSCI-04.1` Verify malformed executor output produces bounded escalation rather than best-guess synthesis.
- [ ] `S-TSCI-04.2` Classify result knowledge into governed buckets.
  - [ ] `M-TSCI-04.2` Separate `criticalIssues`, `criticalKnowledge`, `durableLearnings`, and `nonPromotedNotes`.
    - [ ] `A-TSCI-04.2` Verify `nonPromotedNotes` do not enter any promotable path.

Entry criteria:

- bounded packet assembly is complete
- result schema is fixed by `API-004`

Expected outputs:

- normalized execution result
- explicit classification buckets
- preserved escalation reason when present

Verification gate:

- no bucket ambiguity remains for implementers
- classifier does not invent missing verification evidence

### TASK-TSCI-05: Promotion gate and review loop

- [ ] `S-TSCI-05.1` Implement lead-review-driven approval and rejection flow.
  - [ ] `M-TSCI-05.1` Review `criticalKnowledge` and `durableLearnings` separately.
    - [ ] `A-TSCI-05.1` Verify source-of-truth conflicts reject promotion candidates.
- [ ] `S-TSCI-05.2` Keep private notes and issue tracking outside automatic promotion.
  - [ ] `M-TSCI-05.2` Preserve issue visibility without turning issue records into promoted knowledge.
    - [ ] `A-TSCI-05.2` Verify no automatic promotion bypass exists.

Entry criteria:

- normalized result structure exists
- lead review policy is fixed by upstream docs

Expected outputs:

- approved promotion set
- rejected promotion set
- retained private notes set

Verification gate:

- `nonPromotedNotes` remain private by default
- unresolved source-of-truth conflicts force rejection or escalation

### TASK-TSCI-06: Audit and operational closure

- [ ] `S-TSCI-06.1` Add packet lineage and promotion decision trace points where current runtime already has a suitable audit surface.
  - [ ] `M-TSCI-06.1` Keep audit closure bounded to existing traceability surfaces.
    - [ ] `A-TSCI-06.1` Verify no new tenant or vault schema is introduced.
- [ ] `S-TSCI-06.2` Finalize cross-slice verification evidence and closure notes.
  - [ ] `M-TSCI-06.2` Keep traceability explicit from packet assembly to promotion decision.
    - [ ] `A-TSCI-06.2` Verify audit additions do not alter source-of-truth precedence.

Entry criteria:

- promotion gate flow exists
- target audit surface is already present in runtime

Expected outputs:

- trace points for packet lineage
- trace points for promotion decisions
- verification closure evidence

Verification gate:

- traceability improves without schema expansion
- operational closure remains inside current governed runtime boundaries

## Verification Expectations

### Unit Coverage

- baseline policy injection
- source ref selection
- relevant file ref selection
- verification expectation injection
- critical issue injection
- packet assembly
- result normalization
- result classification

### Integration Coverage

- complete happy path from task metadata to approved promotion set
- missing source truth
- ambiguous module scope
- missing required file refs
- verification blocked
- malformed executor result
- rejected promotion candidate due to source-of-truth conflict

### Governance Coverage

- raw transcript-first assembly is blocked
- approved docs outrank promoted learnings
- `nonPromotedNotes` never become shared durable context automatically
- escalation classes remain bounded to the upstream contract

### Repo Validation

- `npm run docs:validate`
- lint, test, and typecheck commands relevant to implementation slices once coding starts

## Definition Of Done

Acceptance Criteria

- [ ] Implementation follows this plan without reopening FEAT, SRS, blueprint, API, or LLD decisions.
- [ ] Each slice has explicit entry criteria, outputs, and verification gate.
- [ ] Bounded executor packets are defined before sub-agent execution begins.

Success Criteria

- [ ] Implementation can proceed slice by slice without hidden design decisions.
- [ ] Packet lifecycle behavior is reviewable by lead and auditor with explicit evidence.
- [ ] Context growth is reduced because slice packets remain narrow and disposable.

Exit Criteria

- [ ] Verification evidence exists for unit, integration, and governance checks.
- [ ] Audit closure does not require new schema or source-of-truth exceptions.
- [ ] Docs remain aligned in the document version registry.

## Local LLM Packets (H0 Tier)

> These packets are bounded drafting aids only. Output remains draft until reviewed by the lead agent or auditor.

### Micro-task Packet: `M-TSCI-01.1`

```text
source excerpt: API-004 packet minimum fields, LLD section 7.1 and 7.6, FEAT sections 4 to 6
target path: packet shell and baseline policy implementation files chosen by the lead
instruction: implement task metadata intake and baseline policy block creation only; stop before source ref, verification, issue, or learning injection
constraints: do not add schema fields; do not add promotion logic; do not infer missing review ownership
acceptance check: packet shell contains required task and policy fields for slice 1 and emits bounded escalation when metadata or owner is missing
model name: local-coder or equivalent
max context: 16k
predicted token usage: 1800
max output tokens: 1200
rollback note: revert only packet shell and baseline policy changes if any logic reaches beyond slice 1
escalation rule: escalate_to_lead_when_required_packet_shell_fields_or_policy_owner_are_ambiguous
```

### Micro-task Packet: `M-TSCI-02.1`

```text
source excerpt: FEAT-TASK-SCOPED-CONTEXT-INJECTION sections 3 to 7, BLUEPRINT sections 4 to 6, LLD sections 7.2 and 9
target path: source-ref selector implementation files chosen by the lead
instruction: implement approved source ref selection and relevant file ref selection without broad repo traversal; return explicit exclusion reasons for rejected refs
constraints: do not use docs/ref as source of truth; do not add schema fields; do not use raw chat history as default input
acceptance check: selector returns approved refs, file refs, and bounded escalation for missing source truth or scope conflict
model name: local-coder or equivalent
max context: 16k
predicted token usage: 2200
max output tokens: 1400
rollback note: revert only the files named in the packet if selector behavior widens scope or changes schema assumptions
escalation rule: escalate_to_lead_when_required_refs_or_scope_rules_are_ambiguous
```

### Atomic-task Packet: `A-TSCI-02.2`

```text
target: verification expectation injector escalation handling
single action: enforce verification_blocked when required verification basis is unavailable for the bounded slice
acceptance check: injector returns explicit verification_blocked instead of widening validation scope or synthesizing a fallback expectation set
model name: local-coder or equivalent
rollback note: revert the injector hunk if it introduces fallback verification rules not defined in upstream docs
max context: 8k
predicted token usage: 800
max output tokens: 450
escalation rule: escalate_to_lead_when_fix_requires_new_verification_schema_or_cross-slice_behavior
```

### Micro-task Packet: `M-TSCI-03.1`

```text
source excerpt: BLUEPRINT assembly order, LLD section 7.6, API-004 packet contract
target path: task context assembler implementation files chosen by the lead
instruction: merge packet shell, baseline policy, approved source refs, file refs, verification expectations, critical issues, and optional promoted learnings into one bounded packet using the locked order only
constraints: debug history refs must remain optional and non-primary; approved docs must outrank promoted prior learnings; no broad retrieval fallback
acceptance check: assembled packet preserves deterministic order and rejects precedence inversions
model name: local-coder or equivalent
max context: 16k
predicted token usage: 2100
max output tokens: 1300
rollback note: revert assembly changes if packet order or precedence no longer matches blueprint and LLD
escalation rule: escalate_to_lead_when_order_or_precedence_requires_new_design_decision
```

### Atomic-task Packet: `A-TSCI-03.2`

```text
target: promoted prior learning merge point
single action: keep promoted prior learnings subordinate to approved docs and skip debug history refs from primary reasoning fields
acceptance check: packet assembly still succeeds without optional learnings and debug refs never become primary source inputs
model name: local-coder or equivalent
rollback note: revert the merge hunk if optional inputs become required or primary
max context: 8k
predicted token usage: 850
max output tokens: 450
escalation rule: escalate_to_lead_when_optional_inputs_start_affecting_schema_or_required_field_rules
```

### Micro-task Packet: `M-TSCI-04.1`

```text
source excerpt: API-004 result shape, LLD section 7.7, FEAT outputs list
target path: executor result normalization and classifier implementation files chosen by the lead
instruction: normalize raw executor output into TaskScopedExecutionResult and separate result summary, files touched, verification status, critical issues, critical knowledge, durable learnings, and non-promoted notes
constraints: do not invent missing evidence; preserve escalation reason when present; do not auto-promote any bucket
acceptance check: malformed executor output yields bounded normalization failure and each output bucket is explicit
model name: local-coder or equivalent
max context: 16k
predicted token usage: 2200
max output tokens: 1400
rollback note: revert classifier changes if any bucket becomes ambiguous or if missing evidence gets synthesized
escalation rule: escalate_to_lead_when_result_shape_interpretation_requires_schema_change
```

### Atomic-task Packet: `A-TSCI-04.2`

```text
target: result-classifier bucket mapping for nonPromotedNotes
single action: enforce that nonPromotedNotes remain private and never enter any promotion candidate set
acceptance check: classifier output keeps nonPromotedNotes separate from criticalKnowledge and durableLearnings
model name: local-coder or equivalent
rollback note: revert the classifier hunk if any promotable bucket receives private notes
max context: 8k
predicted token usage: 900
max output tokens: 500
escalation rule: escalate_to_lead_when_more_than_one_bucket_policy_or_schema_change_is_required
```

### Micro-task Packet: `M-TSCI-05.1`

```text
source excerpt: LLD sections 7.8 and 7.9, FEAT promotion control responsibility, BLUEPRINT promotion policy
target path: lead review and promotion gate implementation files chosen by the lead
instruction: implement separate review and decision flow for criticalKnowledge and durableLearnings, return approved, rejected, and retained private note sets, and reject source-of-truth conflicts
constraints: nonPromotedNotes must remain private; criticalIssues are not promoted knowledge; no automatic approval path
acceptance check: promotion output is review-gated, conflict-aware, and keeps private notes non-canonical
model name: local-coder or equivalent
max context: 16k
predicted token usage: 2000
max output tokens: 1300
rollback note: revert promotion gate changes if any path promotes notes automatically or bypasses review
escalation rule: escalate_to_lead_when_conflict_resolution_requires_new_governance_policy
```

### Atomic-task Packet: `A-TSCI-05.2`

```text
target: review outcome handling for source-of-truth conflict
single action: reject conflicting promotion candidates and preserve explicit escalation or rejection reason
acceptance check: promotion gate never silently resolves conflicts in favor of promoted learnings over approved docs
model name: local-coder or equivalent
rollback note: revert the conflict branch if promoted learnings can override approved docs
max context: 8k
predicted token usage: 750
max output tokens: 400
escalation rule: escalate_to_lead_when_conflict_handling_needs_new_precedence_rule
```

### Micro-task Packet: `M-TSCI-06.1`

```text
source excerpt: FEAT traceability responsibilities, LLD section 10, existing runtime audit surface chosen by the lead
target path: audit trace point integration files chosen by the lead
instruction: add packet lineage and promotion decision trace points only where the current runtime already has a suitable audit surface; do not introduce new tenant or vault schema
constraints: keep traceability bounded to existing governed runtime surfaces; do not redefine persistence model
acceptance check: audit metadata captures packet lineage and promotion decision references without schema expansion
model name: local-coder or equivalent
max context: 12k
predicted token usage: 1500
max output tokens: 900
rollback note: revert audit wiring if it introduces new durable schema or changes source-of-truth precedence
escalation rule: escalate_to_lead_when_traceability_requires_new_storage_contract
```

### Atomic-task Packet: `A-TSCI-06.2`

```text
target: final verification closure notes and evidence references
single action: wire verification evidence references from unit, integration, and governance checks into the closure surface already used by the runtime
acceptance check: closure references exist without adding new evidence schema or changing packet semantics
model name: local-coder or equivalent
rollback note: revert closure wiring if evidence tracking starts requiring schema expansion
max context: 8k
predicted token usage: 700
max output tokens: 350
escalation rule: escalate_to_lead_when_evidence_tracking_needs_new_runtime_contract
```

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.2 | 2026-06-20 | LYRA / ARCHON / ATHER | Signed off; promoted draft -> approved. |
| 0.1.2+draft | 2026-06-20 | LYRA / ARCHON / ATHER | Realigned the Source-Of-Truth Precedence list to defer to BLUEPRINT §7 / LLD §3 (removed the divergent "API and implementation-facing contracts" tier and the debug-history precedence tier; debug history is evidence-only); corrected the TASK-TSCI-02 execution-table context budget from 32k to 16k for internal consistency with the IMP micro-task packet. |
| 0.1.1+draft | 2026-06-19 | LYRA / ARCHON / ATHER | Expanded the implementation plan with explicit assignments and full micro-task plus atomic-task packet coverage for all bounded slices. |
| 0.1.0+draft | 2026-06-19 | LYRA / ARCHON / ATHER | Added the canonical implementation plan for task-scoped context injection with bounded slices, executor contract, and verification gates. |
