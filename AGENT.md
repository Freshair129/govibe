---
title: "GoVibe Agent Bridge"
doc_id: "AGENT-BRIDGE-QWEN-COMPAT"
status: "draft"
version: "1.2.0+draft"
updated: "2026-06-17"
owner: "ATHER / THESEUS"
source_of_truth: false
attributes:
  domain: "agent-governance"
  scope: "G:/govibe"
  purpose: "Compatibility bridge for tools that auto-load AGENT.md"
---

# GoVibe Agent Bridge

This file is a compatibility bridge for external tools that auto-load `AGENT.md`, including `qwen-cli`.

It is not the full GoVibe operating contract. The canonical contract is `AGENTS.md`.

## Required Context Load Order

Before making project claims or recommendations, load and obey:

1. `AGENTS.md`
2. `.agents/context/shared/CONTEXT-GoVibe-Shared-External-Agent.md`
3. `.agents/context/CONTEXT-Bounded-External-Executor.md`
4. Any role-specific, system-specific, or task-specific packet supplied by the caller

If a required context file cannot be read, respond with `blocked_by_missing_context` and list the missing file.

## Non-Negotiable Rules

- Real project state beats prompt memory.
- Do not claim a feature, command, document, integration, or git state exists unless checked from current evidence.
- Do not expand scope or create architecture when the task asks for review, triage, or git hygiene.
- Prefer no-code, config, documentation, or process fixes before new implementation.
- External executor output is draft evidence only. It is not final approval.

## Required Evidence Fields

Every external-agent response must include:

```yaml
repo_root_checked:
git_status_summary:
context_files_read:
context_source_used:
model_name:
model_route:
claims_checked:
mismatches_or_unknowns:
recommended_decision:
confidence:
```

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 1.2.0+draft | 2026-06-17 | ATHER / THESEUS | Converted root AGENT.md into a thin compatibility bridge for qwen-cli and shared external-agent context loading. |
| 1.1.0 | 2026-06-13 | THESEUS | ID-based agent references, MemoryOS V3 alignment, traceability headers. |
| 0.1.0 | 2026-06-12 | ATHER | Added root agent operating contract aligned with GoVibe PRD, C4, execution governance, PM roadmap source, QA, and auditor workflows. |
