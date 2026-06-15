---
title: "RUNBOOK: CoVibe Freelance Executor Workflow"
doc_id: "RUNBOOK-COVIBE-FREELANCE-EXECUTOR"
status: "draft"
version: "0.1.0"
updated: "2026-06-15"
owner: "LYRA"
auditor: "ATHER"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - "docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md"
  - "docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md"
  - "docs/features/integration-bridge/FEAT-MCP-Integration-Bridge.md"
  - "docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md"
  - ".agents/context/CONTEXT-CoVibe-Freelance-Executor.md"
---

# RUNBOOK: CoVibe Freelance Executor Workflow

## 1. Purpose

Define how GoVibe can use `CoVibe` as a practical execution mode where a primary owner or main agent hires an external executor such as Gemini CLI for bounded work, similar to hiring a freelancer in a real delivery workflow.

This runbook is an operating model, not a PRD system change.

## 2. CoVibe Operating Model

In this runbook:

- `Human owner` or `main agent` remains the accountable lead.
- `Gemini CLI` acts as a bounded external executor or freelance worker.
- `GoVibe` remains the coordination and traceability layer.

Canonical shape:

```text
[Human]
  -> [Main Agent / Lead Orchestrator]
  -> [CoVibe packet]
  -> [Freelance Executor: Gemini CLI]
  -> [Returned artifact / feedback]
  -> [QA / Audit / Human decision]
```

## 3. When To Use

Use this workflow when all of the following are true:

- one primary owner or lead agent is still in charge
- the work can be bounded to a clear packet
- the external executor does not need broad repo authority
- the goal is to save primary quota, reduce cost, or parallelize support work

Typical use cases:

- terminology review
- doc audit
- bounded extraction or summarization
- narrow feature review
- focused prompt-driven implementation planning

## 4. When Not To Use

Do not use this workflow when:

- the task changes architecture or system ownership without approved docs
- the executor would need broad uncontrolled repo access
- the packet is too vague to bound
- the result would be treated as final without QA, audit, or human review

## 5. Plan Template

### 5.1 Engagement Plan

```yaml
execution_mode: covibe
lead_owner:
lead_agent:
external_executor: gemini_cli
task_type:
primary_goal:
bounded_scope:
source_docs:
context_container:
expected_output:
verification_gate:
return_path:
out_of_scope:
```

### 5.2 Example

```yaml
execution_mode: covibe
lead_owner: Boss
lead_agent: Codex
external_executor: gemini_cli
task_type: terminology_review
primary_goal: collect structured review feedback on a bounded feature doc
bounded_scope: one feature note plus four upstream docs
source_docs:
  - docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md
  - docs/PRD-GoVibe-Platform-Overview.md
  - docs/architecture/C4-GoVibe-Platform.md
context_container: .agents/context/CONTEXT-CoVibe-Freelance-Executor.md
expected_output: YAML review response or feedback artifact
verification_gate: docs:validate plus lead-agent review
return_path: docs/change-requests/feedback/
out_of_scope:
  - PRD rewrite
  - C4 rewrite
  - runtime ownership change
```

## 6. Prompt Template

Use this prompt when sending a bounded freelance packet to Gemini CLI.

```text
You are acting as a freelance support executor inside the GoVibe CoVibe workflow.

Role:
- You are not the product owner.
- You are not the final approver.
- You are a bounded external executor working under a lead orchestrator.

Task:
<replace with exact task>

Required inputs:
- Source packet: <path>
- Context container: <path>
- Additional reference docs:
  - <path>
  - <path>

Rules:
- Stay inside the supplied scope only.
- Do not redefine product architecture unless the packet explicitly asks for analysis only.
- Do not edit unrelated files.
- If information is missing, say what is missing instead of inventing it.
- Return structured output only in the requested schema.
- Treat all output as draft support work pending lead review.

Expected output:
<replace with exact schema or artifact shape>

Out of scope:
- <item>
- <item>
```

## 7. Gemini CLI Invocation Pattern

### 7.1 Direct prompt mode

```powershell
gemini --skip-trust -m gemini-3.1-flash-lite --approval-mode plan -p "<prompt>"
```

### 7.2 Prompt plus file-context mode

```text
Use @{path} references or the local command/runner pattern when a reusable packet is needed.
```

### 7.3 CoVibe packet handoff

Minimum packet to send:

- task statement
- context container path
- exact review or execution schema
- allowed files
- return artifact path

## 8. Context Container Contract

Every CoVibe freelance run should have one compact context container that includes:

- mission and role framing
- source-of-truth order
- in-scope docs
- forbidden expansions
- expected output shape
- approval and return path

The context container should be compact, derived, and source-cited.

## 9. Acceptance Criteria

- A lead owner and lead agent are identified.
- Gemini CLI is framed as a bounded support executor, not a system owner.
- The packet includes a context container path and explicit out-of-scope rules.
- The workflow defines how results come back for lead review.
- The runbook does not imply automatic final approval by the external executor.

## 10. Success Criteria

- CoVibe can be used as a practical freelancer-style operating mode.
- External executor work is bounded and reviewable.
- The main agent can offload support work without losing governance control.

## 11. Definition Of Done

- Plan template exists.
- Prompt template exists.
- Context container contract exists.
- A concrete context container is linked for Gemini CLI packet usage.
- The workflow is ready for review before further automation is added.
