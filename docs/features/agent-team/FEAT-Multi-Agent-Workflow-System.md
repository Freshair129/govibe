# FEAT: Multi-Agent Workflow System

**Status:** `DRAFT`
**Updated:** 2026-06-13
**Primary PRD System:** `SYSTEM-05::Agent-Team-Management-System`
**Supporting PRD Systems:** `SYSTEM-02::Project-Roadmap-Management-System`, `SYSTEM-06::Integration-Bridge-System`, `SYSTEM-07::Governance-Access-Control-System`, `SYSTEM-09::Traceability-Audit-Verification-System`, `SYSTEM-10::Execution-Governance-System`
**Owner:** THESEUS
**Auditor:** ATHER
**Complexity:** `C-2`
**Context Tier:** `H4`
**W-Scale:** `W3`
**Risk:** `MEDIUM`

## 1. Goal

Define the canonical workflow system for multi-agent execution in GoVibe.

This system governs how human users, lead agents, PM agents, execution agents, QA, auditors, and third-party tool bridges coordinate planning, assignment, implementation, handoff, review, and closure.

## 2. Why This Exists

GoVibe is not a billing wrapper around third-party AI tools. It is the orchestration, progress tracking, traceability, and project-management layer for developer-owned agent teams.

The workflow system exists to ensure:

- approved docs drive execution
- roadmap state is document-derived, not hardcoded
- assignment and execution remain traceable
- human users and agent subjects follow separate access-control models
- local and cloud agents can collaborate without requiring identical provider runtime assumptions

## 3. System Scope

Included:

- work intake and governance classification
- doc-first gate for non-trivial work
- PM decomposition from roadmap to atomic-task
- assignment routing to human or agent team
- handoff workflow between PM, executor, QA, and auditor
- event/state expectations for Mission Control visibility
- evidence and closure requirements
- bounded local-sidecar execution for atomic-task work

Excluded:

- provider billing or quota enforcement for Claude Code, Gemini CLI, OpenClaw, Hermes, or other external tools
- low-level MCP implementation specifics beyond the interface contract
- visual-only office simulation details that do not affect workflow semantics

## 4. Core Workflow

```text
Request
  -> Classification
  -> Source Doc Gate
  -> PM Decomposition
  -> Roadmap Source Publish
  -> Assignment + Policy Check
  -> Execution
  -> Handoff
  -> QA Verification
  -> Auditor Review
  -> Approval
  -> Delivery Closeout
```

## 5. Functional Requirements

### 5.1 Intake and classification

- The system must classify work by `C-0` to `C-3`.
- The system must classify context depth by `H0` to `H6`.
- The system must declare `W-Scale` when branching width or decomposition fan-out matters.
- The system must identify one primary PRD system owner for each task.

### 5.2 Source document gate

- `C-2` and `C-3` work must not start implementation without an approved human-readable source document.
- Accepted source documents include PRD, SRS, SDD, C4, FEAT, API contract, runbook, and test plan, depending on scope.
- If the implementation contradicts an approved source document, the source document remains canonical until explicitly revised.

### 5.3 Planning decomposition

- PM/LYRA must be able to decompose work through:
  - master plan
  - roadmap
  - phase
  - epic
  - sprint
  - task
  - sub-task
  - micro-task
  - atomic-task
- Micro-task and atomic-task granularity must support local-model context limits when required.

### 5.4 Document-driven roadmap source

- Planning output must be written to approved `.md` or `.html` documents under `docs/roadmap/`.
- Mission Control A2 must consume roadmap state from parsed docs, explicit mission events, or approved API/MCP payloads.
- Hardcoded React rows may be used only as honest empty-state fallback, never as canonical live project state.

### 5.5 Assignment and access control

- Human assignment must be checked through RBAC.
- Agent assignment must be checked through ABAC.
- Assignment must preserve project, scope, role, action, and execution-context constraints.
- Each task assignment must be traceable to a stable roadmap or task ID.

### 5.6 Multi-agent execution and handoff

- The system must support sequential and parallel agent execution.
- The system must support Codex-led orchestration with Ollama sidecar execution for bounded atomic-task work.
- A task handoff must identify:
  - source task ID
  - handoff from
  - handoff to
  - required artifact or evidence
  - expected next state
- The system must support internal agent teams and external tool bridges as execution participants.
- Local sidecar execution must be restricted to bounded context and must not silently widen scope beyond atomic context policy.

### 5.7 Verification and closeout

- User-visible work must pass QA before closure.
- Non-trivial work must pass auditor review before being marked done.
- Closeout must preserve:
  - source document reference
  - roadmap/task reference
  - implementation artifact
  - review artifact
  - verification evidence

## 6. Workflow States

Minimum shared lifecycle:

| State | Meaning |
|---|---|
| `proposed` | request exists but not yet classified |
| `classified` | C/H/W/risk are declared |
| `awaiting_doc` | blocked on source document |
| `ready_for_plan` | source doc approved, PM can decompose |
| `planned` | roadmap/backlog/task structure exists |
| `ready_for_assignment` | policy checks and scope are ready |
| `assigned` | owner or agent team selected |
| `in_progress` | work is actively executing |
| `handoff_pending` | next role is required to continue |
| `qa_review` | QA evidence is pending |
| `audit_review` | auditor evidence is pending |
| `blocked` | execution cannot proceed |
| `done` | acceptance and evidence complete |

## 7. Mission Control Visibility Contract

Mission Control must be able to display multi-agent workflow state through typed snapshot/event data rather than hidden local logic.

At minimum, the workflow system must expose:

- task and roadmap identifiers
- current workflow state
- assigned human or agent owner
- handoff chain
- artifact links
- review status
- verification status

Primary consumers:

- `A2` Roadmap Board
- `A5` Agent Management
- future `A6` Visual Office / collaboration playback

## 8. Integration Rules

- GoVibe may orchestrate external tools through API, MCP, webhook, local bridge, or file-based exchange.
- External tools are treated as execution providers, not as the source of truth for project state.
- Workflow state must be normalized into GoVibe-owned documents, snapshots, or events before it is considered canonical.
- In v1, Ollama is a local sidecar executor for `atomic` work only and is not a replacement for Codex-led orchestration.

## 9. Acceptance Criteria

- A task can be classified with `C`, `H`, `W`, and risk metadata.
- A `C-2` or `C-3` task is blocked when the source document is missing.
- A PM-authored roadmap/backlog document can produce assignable task IDs.
- An assignment can target a human or an agent subject with the correct policy model.
- A handoff can be represented as explicit workflow state rather than inferred from UI-only behavior.
- Mission Control can display workflow status without relying on hardcoded rows as canonical state.
- Auditor can trace source doc -> task -> assignment -> artifact -> review -> verification evidence.
- A bounded local sidecar run can complete an atomic-task or escalate back to Codex with a structured result.

## 10. Verification

- Review against `docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md`
- Review against `docs/features/project-roadmap/FEAT-Document-Driven-Roadmap-Source.md`
- Review against `docs/features/governance-access/FEAT-RBAC-ABAC-Governance.md`
- Confirm event/schema coverage through `docs/api/API-003-Mission-Workflow-Event-Schema.md`

## 11. Related Docs

- `docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md`
- `docs/srs/SRS-Ollama-Sidecar-Execution.md`
- `docs/lld/LLD-Agent-Launcher-Execution-Router.md`
- `docs/architecture/SEQ-Ollama-Sidecar-Flow.md`
- `docs/features/project-roadmap/FEAT-Document-Driven-Roadmap-Source.md`
- `docs/features/governance-access/FEAT-RBAC-ABAC-Governance.md`
- `docs/features/traceability-audit/FEAT-Traceability-Audit-Verification.md`
- `docs/api/API-003-Mission-Workflow-Event-Schema.md`
