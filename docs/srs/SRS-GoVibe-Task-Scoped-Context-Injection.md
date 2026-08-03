---
title: "SRS: GoVibe Task-Scoped Context Injection"
doc_id: "SRS-GOVIBE-TASK-SCOPED-CONTEXT-INJECTION"
status: "approved"
version: "0.1.0"
updated: "2026-06-19"
owner: "ARCHON / ATHER"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - "docs/features/agent-team/FEAT-Task-Scoped-Context-Injection.md"
  - "docs/adr/ADR-013-Task-Scoped-Context-Injection.md"
  - "docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md"
  - "docs/features/genesis-knowledge-system/FEAT-Hybrid-JIT-Context-System.md"
  - "docs/operations/runbooks/RUNBOOK-Bounded-External-Executor-Workflow.md"
---

# SRS: GoVibe Task-Scoped Context Injection

## 1. Introduction

This document defines the software requirements for the GoVibe task-scoped context injection module.

The module's job is to assemble bounded execution packets for sub-agents and bounded external executors from approved GoVibe sources, execution policy, and scoped knowledge retrieval without making raw chat history the default context medium.

Key terms:

- `lead agent`: the primary orchestrator and final reviewer
- `sub-agent`: a bounded execution agent that acts on a narrow packet
- `context packet`: a structured execution payload containing task, scope, constraints, refs, and verification expectations
- `durable learning`: a promoted finding that should outlive one execution turn
- `critical knowledge`: a finding that must be surfaced to the lead agent before closeout

## 2. Product/System Context

- Primary system:
  - `SYSTEM-05::Agent-Team-Management-System`
- Supporting systems:
  - `SYSTEM-03::Docs-to-Code-System`
  - `SYSTEM-08::Genesis-Knowledge-HCS-System`
  - `SYSTEM-10::Execution-Governance-System`
  - `SYSTEM-09::Traceability-Audit-Verification-System`
- Primary users:
  - lead human operator
  - lead orchestration agent
  - PM/planning agent
  - bounded sub-agent executor
  - auditor / QA

## 3. Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-001 | The system must assemble task-scoped context packets from canonical GoVibe inputs. | MUST | Packet includes task identity, source refs, constraints, and verification expectations. |
| FR-002 | The system must support baseline policy injection separate from task-specific context. | MUST | Stable governance and role context can be injected without replaying full history. |
| FR-003 | The system must support context selection by task type, module, and workspace scope. | MUST | Packet assembly can narrow source selection using declared task and module boundaries. |
| FR-004 | The system must identify authoritative source documents and files in every packet. | MUST | Packet explicitly lists source-of-truth paths or references. |
| FR-005 | The system must avoid raw chat history as a default packet input. | MUST | Default packet assembly uses structured summaries and refs unless audit/debug mode requests history. |
| FR-006 | The system must support bounded context size and truncation policy. | MUST (DEFERRED) | Packet assembly applies explicit size/budget rules before handoff. Note: the concrete context-budget/truncation policy is DEFERRED this round (no schema/design realization yet) and must be resolved before implementation. See §9. |
| FR-007 | The system must support critical-known-issue injection. | MUST | Packet may include known hazards, contracts, or migration risks that must remain visible during execution. |
| FR-008 | The system must require an escalation response when a packet is insufficient. | MUST | Sub-agent can return `needs_more_context`, `scope_conflict`, or equivalent escalation status instead of widening scope silently. |
| FR-009 | The system must capture structured execution results from sub-agents. | MUST | Return payload includes result summary, files touched, evidence, issues, and learnings. |
| FR-010 | The system must distinguish critical knowledge from general notes. | MUST | Output schema separates `critical_knowledge`, `durable_learnings`, and `non_promoted_notes`. |
| FR-011 | The system must let the lead agent absorb only selected promoted knowledge. | MUST | Promotion path allows selective ingest rather than replaying the whole sub-agent note set. |
| FR-012 | The system must preserve traceability from packet input to packet result. | MUST | Reviewers can trace task -> packet -> files touched -> evidence -> promotion decision. |

## 4. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-001 | Scope safety | Sub-agents must not silently widen scope beyond the declared packet. |
| NFR-002 | Context efficiency | Packet assembly should prefer structured refs and summaries over raw transcript replay. |
| NFR-003 | Auditability | Inputs, outputs, promotion decisions, and escalation events must remain reviewable. |
| NFR-004 | Replaceability | The assembly layer must remain GoVibe-owned even if utility primitives were inspired by external systems. |
| NFR-005 | Compatibility | The design must remain compatible with Mission Control, MCP, CLI, and bounded executor workflows. |

## 5. Data Requirements

### 5.1 Packet Inputs

- `task_id`
- `workspace_id`
- `module_id` or module scope
- task objective
- execution constraints
- source-of-truth docs
- relevant file refs
- verification expectations
- critical known issues
- optional promoted prior learnings

### 5.2 Packet Outputs

- execution status
- result summary
- files touched
- evidence and verification status
- critical issues
- critical knowledge
- durable learnings
- non-promoted notes
- escalation request when context is insufficient

### 5.3 Persistence

- packet metadata may be persisted for audit
- promoted learnings may be persisted to governed knowledge stores
- non-promoted notes may remain private or ephemeral by policy

## 6. Interface Requirements

### 6.1 Assembly Interface

The system must expose an assembly boundary that accepts:

- task metadata
- system policy
- scoped retrieval inputs
- source refs

and returns:

- one bounded context packet

### 6.2 Sub-Agent Contract

The system must expose a sub-agent execution contract that returns:

- result summary
- touched artifacts
- evidence
- escalation state
- learning classification

### 6.3 Review Interface

The system must expose enough metadata for a lead reviewer to:

- confirm packet scope
- inspect source refs
- review output
- accept or reject promoted learnings

## 7. Security and Governance Requirements

- RBAC:
  - human owners and reviewers decide when delegated work may start or close
- ABAC:
  - sub-agents and external executors remain bounded by action, scope, and context rules
- Source-of-truth control:
  - packet content must prefer approved documents and governed runtime metadata
- Escalation:
  - missing context must be surfaced rather than guessed
- Promotion control:
  - only approved or policy-accepted learnings may be promoted into shared durable context

## 8. Traceability Matrix

| Requirement | PRD Goal/System | Related Doc | Verification Direction |
|---|---|---|---|
| FR-001 to FR-004 | SYSTEM-05 bounded execution and SYSTEM-03 docs-to-code scoping | `docs/adr/ADR-013-Task-Scoped-Context-Injection.md` | packet schema and source-ref validation |
| FR-005 to FR-008 | bounded packet safety and escalation | `docs/operations/runbooks/RUNBOOK-Bounded-External-Executor-Workflow.md` | packet assembly tests and escalation-path checks |
| FR-009 to FR-012 | reviewability and traceability | `docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md` | structured result contract and audit-link verification |

## 9. Open Questions

- Should packet budgets be declared globally, per module, or per executor tier in v1? (DEFERRED — the context-budget/truncation policy behind FR-006 has no schema or design realization this round and is intentionally out of scope; it must be resolved before implementation.)
- Should private non-promoted notes expire automatically after session close?
- Should Mission Control expose packet lineage directly in a future operator view?

## 10. Acceptance Criteria

- A canonical SRS exists for the task-scoped context injection module.
- Requirements distinguish packet assembly, escalation, result capture, and learning promotion.
- Requirements preserve GoVibe ownership of the assembly layer even when external patterns inspired the design.
- The SRS remains consistent with ADR-013 and the platform PRD.

## 11. Success Criteria

- Packet completeness becomes a governed interface problem, not a confidence-only agent judgment problem.
- Lead-agent context growth is reduced without sacrificing reviewability.
- Sub-agent outputs become easier to audit, compare, and promote selectively.
- Context injection becomes portable across MCP, CLI, and future runtime surfaces.

## 12. Definition Of Done

- SRS is registered in `docs/DOC-VERSION-REGISTRY.md`.
- `docs:validate` passes.
- A later blueprint can derive component boundaries from this SRS without redefining product intent.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0 | 2026-06-20 | ARCHON / ATHER | Signed off; promoted draft -> approved. |
| 0.1.0 | 2026-06-20 | ARCHON / ATHER | Initial SRS for task-scoped context injection requirements. |
