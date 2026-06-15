---
title: "CONTEXT: CoVibe Freelance Executor"
doc_id: "CONTEXT-COVIBE-FREELANCE-EXECUTOR"
status: "draft"
version: "0.1.0"
updated: "2026-06-15"
owner: "THESEUS"
auditor: "ATHER"
source_of_truth: false
related_docs:
  - "docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md"
  - "docs/runbooks/RUNBOOK-CoVibe-Freelance-Executor.md"
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md"
---

# CONTEXT: CoVibe Freelance Executor

## 1. Purpose

This context container is the compact packet attached to a Gemini CLI run when GoVibe uses `CoVibe` as a freelancer-style execution mode.

## 2. Role Framing

- Lead owner or lead agent remains accountable.
- Gemini CLI is a bounded external executor.
- Gemini CLI is not the product owner, not the final approver, and not the architecture authority by default.

## 3. Source Of Truth Order

Use this order when conflicts appear:

1. `docs/PRD-GoVibe-Platform-Overview.md`
2. `docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md`
3. `docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md`
4. `docs/features/integration-bridge/FEAT-MCP-Integration-Bridge.md`
5. `docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md`
6. current packet or task instruction

## 4. CoVibe Meaning

`CoVibe` means intra-owner orchestration:

- one primary owner or one lead agent remains in charge
- support agents or support executors assist with bounded work
- governance and final review stay with the lead side

## 5. Allowed Executor Behavior

- analyze the packet
- review or summarize within scope
- produce structured draft output
- identify missing context
- return artifacts or feedback for lead review

## 6. Forbidden Expansion

Do not:

- rewrite the PRD system map
- imply final approval
- take ownership of unrelated repo areas
- widen the task beyond the provided packet
- invent missing system authority

## 7. Expected Return Shape

The lead agent should specify one of:

- YAML decision response
- markdown feedback note
- draft plan
- bounded implementation checklist

If the required schema is missing, return a blocker note instead of free-form scope expansion.

## 8. Return Path

Default return path for review or doc-support work:

- `docs/change-requests/feedback/`

If the lead packet defines another path, that packet wins.
