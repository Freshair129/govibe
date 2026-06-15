# SESSION-2026-06-16T00-08-23+07-00: CoDev CoVibe Terminology and Executor

```yaml
session_id: SESSION-2026-06-16T00-08-23+07-00-CoDev-CoVibe-Terminology-and-Executor
title: CoDev CoVibe terminology, Gemini role-review tooling, and bounded external executor workflow
status: docs_ready_for_commit
complexity: C-3
risk: HIGH
methodology: DDD + CoDev multi-agent execution
primary_pic: LYRA
architecture_pic: ARCHON
doc_pic: THESEUS
audit_pic: ATHER
execution_support: Gemini CLI
created_at: 2026-06-16T00:08:23+07:00
source_refs:
  - G:/govibe/docs/PRD-GoVibe-Platform-Overview.md
  - G:/govibe/docs/architecture/C4-GoVibe-Platform.md
  - G:/govibe/docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md
  - G:/govibe/docs/features/integration-bridge/FEAT-MCP-Integration-Bridge.md
  - G:/govibe/docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md
target_artifacts:
  - G:/govibe/docs/change-requests/CR-2026-06-15-CoDev-CoVibe-Positioning-Review.md
  - G:/govibe/docs/change-requests/feedback/CR-2026-06-15-CoDev-CoVibe-Positioning-Review-feedback.md
  - G:/govibe/docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md
  - G:/govibe/docs/change-requests/feedback/FEAT-CoDev-CoVibe-Terminology-Definition-feedback.md
  - G:/govibe/docs/runbooks/RUNBOOK-CoVibe-Freelance-Executor.md
  - G:/govibe/.agents/context/CONTEXT-CoVibe-Freelance-Executor.md
  - G:/govibe/docs/change-requests/feedback/RUNBOOK-CoVibe-Freelance-Executor-feedback.md
  - G:/govibe/.gemini/commands/govibe/role-review.toml
  - G:/govibe/.gemini/commands/govibe/new-feature-review.toml
  - C:/Users/freshair/.agents/skills/gemini-role-review/SKILL.md
  - C:/Users/freshair/.agents/skills/gemini-role-review/agents/openai.yaml
  - C:/Users/freshair/.agents/skills/gemini-role-review/scripts/invoke-gemini-role-review.ps1
gate_status:
  terminology_note: approved_for_doc_refinement
  external_executor_workflow: ready_for_trial
  prd_c4_propagation: pending_next_session
  pilot_execution: pending_next_session
  commit: pending
```

## Session Summary

This session established the narrow terminology and operating model for `CoDev` and `CoVibe`, then extended that work into a practical external-executor workflow where Gemini CLI can act as a bounded support worker under GoVibe governance.

The session also produced reusable Gemini review tooling:

- a Codex skill for role-simulated Gemini review
- a PowerShell runner for sequential LYRA / ARCHON / THESEUS / ATHER review
- Gemini project slash commands for GoVibe review flows

## Major Decisions

1. `CoDev` and `CoVibe` were kept as collaboration-mode terminology, not new top-level PRD systems.
2. `MCP` was not replaced or downgraded.
3. `CoVibe` was accepted as the product-facing idea for intra-owner orchestration.
4. A SWE-friendly naming direction was preferred for future workflow documents, but the current runbook/context artifacts remain on the older `CoVibe Freelance Executor` naming and should be renamed in the next session.
5. Gemini CLI is treated as a bounded external executor or freelance support worker, never as final approver or product owner.

## Review Outcomes

### CR: CoDev / CoVibe Positioning Review

- Feedback artifact created at `docs/change-requests/feedback/CR-2026-06-15-CoDev-CoVibe-Positioning-Review-feedback.md`
- Consensus:
  - terminology clarification first
  - no top-level system restructure
  - no MCP replacement

### FEAT: CoDev / CoVibe Terminology Definition

- Terminology note created at `docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md`
- Feedback artifact created at `docs/change-requests/feedback/FEAT-CoDev-CoVibe-Terminology-Definition-feedback.md`
- Consensus:
  - LYRA approve
  - ARCHON approve
  - ATHER approve
  - THESEUS approve_with_changes
- Result:
  - terminology note accepted as terminology-only layer
  - next step should propagate a narrow terminology section into the PRD

### RUNBOOK: CoVibe Freelance Executor Workflow

- Runbook created at `docs/runbooks/RUNBOOK-CoVibe-Freelance-Executor.md`
- Context container created at `.agents/context/CONTEXT-CoVibe-Freelance-Executor.md`
- Feedback artifact created at `docs/change-requests/feedback/RUNBOOK-CoVibe-Freelance-Executor-feedback.md`
- Consensus:
  - LYRA ready_for_trial
  - ARCHON ready_for_trial
  - THESEUS ready_for_trial
  - ATHER ready_for_trial

## Tooling Added

### Codex Skill

- `C:/Users/freshair/.agents/skills/gemini-role-review/SKILL.md`
- `C:/Users/freshair/.agents/skills/gemini-role-review/agents/openai.yaml`
- `C:/Users/freshair/.agents/skills/gemini-role-review/scripts/invoke-gemini-role-review.ps1`

Purpose:

- package the role-review workflow for Gemini CLI
- enforce structured prompts and output schemas
- generate review artifacts and append handoff traces

### Gemini Slash Commands

- `G:/govibe/.gemini/commands/govibe/role-review.toml`
- `G:/govibe/.gemini/commands/govibe/new-feature-review.toml`

Purpose:

- allow review flows from Gemini CLI via project slash commands
- support CR review and feature review with hierarchical feedback collection

## Validation

- `npm run docs:validate` passed repeatedly throughout the session
- only pre-existing repo warnings remained

## Known Follow-Up Items

1. Rename:
   - `RUNBOOK-CoVibe-Freelance-Executor.md`
   - `CONTEXT-CoVibe-Freelance-Executor.md`
   - `RUNBOOK-CoVibe-Freelance-Executor-feedback.md`
   to SWE-friendly names such as `Bounded External Executor Workflow`

2. Propagate terminology:
   - add `CoDev` / `CoVibe` terminology section into `docs/PRD-GoVibe-Platform-Overview.md`
   - sync terminology in `docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md`

3. Run bounded pilot:
   - choose one real task
   - attach context container
   - send packet to Gemini CLI
   - record artifact, token cost, and failure notes

## Recommended Next Session

Recommended priority order:

1. rename CoVibe freelance executor docs to SWE-friendly names
2. insert narrow terminology section into PRD
3. prepare `PILOT-01` bounded external executor packet

## Working Tree Note

At session close, the worktree still contains uncommitted documentation and handoff-log changes related to:

- CoDev / CoVibe positioning review
- terminology-definition note and feedback
- CoVibe freelance executor workflow and feedback
- project Gemini slash commands
- `.agents/devops/handoff/log.jsonl`
