---
title: "SRS: Ollama Sidecar Execution"
doc_id: "SRS-OLLAMA-SIDECAR-EXECUTION"
uid: "01KVXGFWC1ZR2EF8YRRDD0MQMQ"
status: "approved"
version: "0.2.1"
content_hash: "atom:0b60af1a0b8aefc5"
updated: "2026-06-20"
owner: "THESEUS"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - "docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md"
  - "docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md"
  - "docs/api/API-003-Mission-Workflow-Event-Schema.md"
---

# SRS: Ollama Sidecar Execution

## 1. Introduction

This document defines the software requirements for the Ollama sidecar execution path inside GoVibe.

The goal is to let GoVibe route bounded local subagent work through Ollama for atomic-task execution via the agent launcher (`scripts/agents/invoke-agent.ps1`, which spawns the `ollama` CLI) while preserving the existing registry-driven prompt-building workflow and keeping Codex as the lead orchestrator.

Key terms:

- `lead orchestrator`: the primary high-context executor, currently Codex
- `sidecar executor`: a bounded local executor used for narrow tasks only
- `atomic-task`: the smallest task unit intended to fit in a local model context window
- `context packet`: the bounded set of files injected into one execution run

## 2. Product/System Context

- PRD system: `SYSTEM-05::Agent-Team-Management-System`
- Supporting systems:
  - `SYSTEM-06::Integration-Bridge-System`
  - `SYSTEM-10::Execution-Governance-System`
- Primary users:
  - lead human operator
  - lead orchestration agent
  - PM/planning agent
  - bounded local subagent executor
- External dependencies:
  - `ollama` CLI
  - local model inventory on the machine
  - existing agent registry and prompt builder

## 3. Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-001 | The system must support executor selection between `codex` and `ollama`. | MUST | Launcher accepts executor selection and resolves a working execution path. |
| FR-002 | The system must keep one shared prompt-building pipeline for both executors. | MUST | Prompt/context generation still comes from the same registry + builder flow. |
| FR-003 | The system must allow Ollama execution only for bounded local work in v1. | MUST | Non-atomic Ollama invocation is rejected with a clear error. |
| FR-004 | The system must resolve executor policy from the registry. | MUST | Registry defines default executor, allowed executors, and local-sidecar policy. |
| FR-005 | The system must resolve a default local model tier for Ollama execution. | MUST | Launcher chooses the configured model when no override is passed. |
| FR-006 | The system must support one retry with a larger local model. | MUST | If the first local run fails or returns no usable output, one retry is attempted with the retry-tier model. |
| FR-007 | The system must return a structured escalation response after bounded retry failure. | MUST | Failed local execution returns task summary, blockers, files inspected, and next-step guidance. |
| FR-008 | The system must provide local wrappers for THESEUS, LYRA, and ATHER. | SHOULD | Wrapper scripts invoke the generic launcher with Ollama defaults and atomic mode. |
| FR-009 | The system must preserve registry-bounded context injection for local sidecars. | MUST | Local execution uses root contracts plus atomic context and obeys local caps. |
| FR-010 | The system must allow manual local model override when needed. | SHOULD | Caller can pass a specific local model name to override the default tier. |

## 4. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-001 | Scope safety | Ollama execution is restricted to `atomic` mode in v1. |
| NFR-002 | Context safety | Local sidecars use bounded file count and per-file char limits from registry policy. |
| NFR-003 | Predictable output | Local sidecar output always includes summary, blockers, files inspected, and next step. |
| NFR-004 | Compatibility | Existing Codex execution flow remains functional without requiring caller changes. |
| NFR-005 | Governance alignment | Local sidecar execution follows execution-governance and ABAC assumptions already defined for subagents. |

## 5. Data Requirements

- Inputs:
  - agent key
  - scope
  - task
  - mode
  - registry-driven execution policy
  - optional executor override
  - optional local model override
- Outputs:
  - built prompt
  - executor result text
  - escalation result when local execution fails
- Persistence:
  - no new persistent store in v1
  - registry remains the source of execution policy

## 6. Interface Requirements

- CLI / launcher:
  - executor selection
  - local model override
  - retry-larger-model switch
  - output format selection
- File/document:
  - `.agents/agent-registry.yaml`
  - `scripts/agents/build-agent-prompt.mjs`
  - `scripts/agents/invoke-agent.ps1`
- Human/operator:
  - local role wrappers for THESEUS, LYRA, and ATHER

## 7. Security and Governance Requirements

- RBAC:
  - human operators decide when to invoke the launcher
- ABAC:
  - local subagents remain subject to the same conceptual ABAC class as other agents/subagents
  - note: ABAC is a governance assumption at this layer; it is not yet machine-enforced by the launcher or the MCP runtime
- Audit:
  - launcher behavior must be explainable from registry policy and injected context files
- Scope control:
  - local sidecars must not silently widen context beyond atomic policy

## 8. Traceability Matrix

| Requirement | PRD Goal/System | Design Doc | Test Evidence |
|---|---|---|---|
| FR-001 to FR-004 | SYSTEM-05 orchestration and agent-team execution | `docs/lld/LLD-Agent-Launcher-Execution-Router.md` | launcher JSON output and executor smoke tests |
| FR-005 to FR-007 | bounded local sidecar execution | `docs/lld/LLD-Agent-Launcher-Execution-Router.md` | local success, retry, and escalation smoke tests |
| FR-008 to FR-010 | operator usability and bounded override path | `docs/architecture/SEQ-Ollama-Sidecar-Flow.md` | wrapper invocation smoke tests |

## 9. Open Questions

- Should future v2 local sidecars support `plan` mode for bounded decomposition?
- Should JSON output become the required default for machine-to-machine orchestration?

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.1 | 2026-06-20 | THESEUS | Signed off; promoted draft -> approved (as-built, verified against current runtime code). |
| 0.2.0 | 2026-06-20 | THESEUS | Replaced the "IPC-based runtime" characterization with the real launcher path (`scripts/agents/invoke-agent.ps1` spawning the `ollama` CLI); noted that ABAC is an assumption, not yet machine-enforced. |
| 0.1.0 | 2026-06-13 | THESEUS | Initial Ollama sidecar execution requirements draft. |
