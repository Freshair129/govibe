---
title: "FEAT: Task-Scoped Context Injection"
doc_id: "FEAT-TASK-SCOPED-CONTEXT-INJECTION"
status: "approved"
version: "0.1.0"
updated: "2026-06-19"
owner: "ARCHON / ATHER"
auditor: "ATHER"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
supporting_prd_systems:
  - "SYSTEM-03::Docs-to-Code-System"
  - "SYSTEM-08::Genesis-Knowledge-HCS-System"
  - "SYSTEM-09::Traceability-Audit-Verification-System"
  - "SYSTEM-10::Execution-Governance-System"
related_docs:
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/adr/ADR-013-Task-Scoped-Context-Injection.md"
  - "docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md"
  - "docs/features/genesis-knowledge-system/FEAT-Hybrid-JIT-Context-System.md"
  - "docs/runbooks/RUNBOOK-Bounded-External-Executor-Workflow.md"
  - "docs/srs/SRS-GoVibe-Task-Scoped-Context-Injection.md"
---

# FEAT: Task-Scoped Context Injection

## 1. Goal

Define the GoVibe feature module that assembles bounded, traceable, and reviewable execution packets for sub-agents and bounded support executors without inflating the lead agent context window.

This feature exists inside `SYSTEM-05::Agent-Team-Management-System`, but it depends on document-derived context, governed retrieval, and execution policy from supporting systems.

## 2. Why This Exists

Broad-context orchestration creates repeated failure modes:

- the lead agent accumulates too much working context
- support agents receive packets that are either too broad or too incomplete
- raw chat history and temporary notes can leak into runtime behavior
- critical learnings are hard to preserve without also preserving irrelevant reasoning noise

GoVibe needs a governed packet builder that prefers approved docs, scoped retrieval, and explicit constraints over free-form prompt stuffing.

## 3. Module Boundary

`Task-Scoped Context Injection` means bounded execution context assembly.

Canonical shape:

```text
approved docs + task state + workspace scope + module scope + policy
  -> context assembler
  -> bounded packet
  -> sub-agent execution
  -> result + evidence + durable learnings
  -> lead review + promotion
```

What belongs here:

- baseline policy and role-context injection
- task-scoped packet assembly
- source-of-truth document and file references
- verification expectation injection
- critical known issue injection
- escalation when context is insufficient
- selective learning promotion after review

What does not belong here:

- raw repo-wide retrieval by default
- unbounded executor autonomy
- full chat replay as the default packet format
- external cognitive-state modeling as a core product dependency
- final approval by support agents

## 4. Module Responsibilities

| Responsibility | Description |
|---|---|
| Baseline injection | Inject stable governance, role, and execution-policy context. |
| Packet assembly | Build one bounded packet around one task or narrow slice. |
| Scope control | Keep packet inputs limited to declared task, module, and workspace boundaries. |
| Escalation | Return control to the lead agent when context is insufficient or scope must widen. |
| Result capture | Normalize result summary, files touched, evidence, issues, and learnings. |
| Promotion control | Allow only selected critical or durable knowledge to flow back into durable context. |

## 5. Module Components

- baseline policy injector
- task context assembler
- source-ref selector
- verification expectation injector
- critical-issue injector
- escalation contract
- result and learning classifier
- promotion gate

## 6. Inputs And Outputs

### Inputs

- task ID and task objective
- tenant and workspace scope
- module scope
- approved source docs
- relevant file refs
- execution constraints
- verification expectations
- promoted prior learnings when explicitly allowed

### Outputs

- bounded context packet
- result summary
- files touched
- evidence and verification state
- critical issues
- critical knowledge
- durable learnings
- non-promoted notes
- escalation request when context is insufficient

## 7. Workflow Contract

```text
Request
  -> classify task/module/workspace scope
  -> inject baseline policy context
  -> resolve approved source refs
  -> build bounded packet
  -> execute through sub-agent or bounded executor
  -> collect structured result
  -> promote only selected learnings
  -> return to lead review
```

## 8. Acceptance Criteria

- The feature is defined as a bounded context assembly module, not a second product-level PRD.
- The module keeps the lead agent as reviewer and approval owner.
- The module prefers approved docs, scoped refs, and explicit constraints over raw chat history by default.
- The module supports escalation instead of silent scope widening.
- The module separates critical knowledge from general notes before promotion.

## 9. Success Criteria

- Lead-agent context growth is reduced because sub-agent working context is disposable.
- Delegated tasks become easier to review because packet input and output are explicit.
- Sub-agents receive enough context to succeed without loading the whole repo or session history.
- Critical learnings can be preserved without promoting every note into canonical context.

## 10. Definition Of Done

- Feature doc is registered in the document version registry.
- Supporting SRS exists for implementation-facing requirements.
- `docs:validate` passes after the doc is added.
- Blueprint work stays blocked until this feature contract and the SRS are reviewed.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0 | 2026-06-20 | ARCHON / ATHER | Signed off; promoted draft -> approved. |
| 0.1.0+draft | 2026-06-19 | ARCHON / ATHER | Added canonical feature module doc for task-scoped context injection under Agent-Team Management. |
