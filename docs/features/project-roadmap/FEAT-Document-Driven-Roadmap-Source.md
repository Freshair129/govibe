# FEAT: Document-Driven Roadmap Source

**Status:** `DRAFT`
**Date:** 2026-06-12
**Primary PRD System:** `SYSTEM-02::Project-Roadmap-Management-System`
**Supporting PRD System:** `SYSTEM-03::Docs-to-Code-System`
**Owner:** LYRA / PM
**Auditor:** ATHER

## 1. Goal

Make Development Roadmap data come from approved `.md` or `.html` documents produced by PM/LYRA, then render that document-derived state in Mission Control A2.

This removes the current long-term problem where roadmap rows, progress, and task state can be hardcoded inside React.

## 2. Source Workflow

```text
PM/LYRA creates roadmap/backlog/sprint docs
  -> human approval marks the document as source of truth
  -> Docs to Code parser extracts structured roadmap state
  -> Mission Control receives RoadmapSnapshot through file loader, API, MCP, or MissionEvent
  -> A2 renders phases, epics, sprints, tasks, assignment, progress, artifacts, review, and verification
```

## 3. Canonical Source Paths

Default paths:

```text
docs/roadmap/ROADMAP-<slug>.md
docs/roadmap/BACKLOG-<slug>.md
docs/roadmap/SPRINT-<slug>.md
```

HTML input is allowed when imported or generated:

```text
docs/roadmap/ROADMAP-<slug>.html
docs/roadmap/imports/<source-name>.html
```

If these paths change, update:

- `.agents/pm/LYRA.md`
- `.agents/pm/asset/Roadmap-Template.md`
- `.agents/pm/asset/Backlog-Template.md`
- `.agents/auditor/asset/Document-Driven-Roadmap-Audit.md`
- `docs/features/project-roadmap/`

## 4. Roadmap Model

The parsed model should preserve this hierarchy:

```text
Master Plan
+-- Roadmap
    +-- Phase
        +-- Epic
            +-- Sprint
                +-- Task
                    +-- Sub-task
                        +-- Micro-task
                            +-- Atomic-task
```

Minimum fields:

| Field | Purpose |
| --- | --- |
| `id` | readable stable ID |
| `title` | display title |
| `type` | roadmap, phase, epic, sprint, task, sub-task, micro-task, atomic-task |
| `status` | todo, in-progress, blocked, review, done |
| `owner` | human or agent owner |
| `agentAssignment` | assigned agent/team when present |
| `sourcePath` | `.md` or `.html` file path |
| `sourceSection` | heading, anchor, or line reference |
| `artifacts` | linked PRs, docs, code paths, evidence |
| `verification` | test, review, or audit evidence |

## 5. A2 Rendering Rules

- A2 must render document-derived roadmap data when available.
- Hardcoded rows are allowed only as clearly labeled empty-state/template fallback.
- Progress must be calculated from task status.
- Agent assignment must update a roadmap task ID from the parsed document model.
- Review and verification evidence must remain visible or accessible from task details.

## 6. Acceptance Criteria

- A sample Markdown roadmap can render in A2.
- A sample HTML roadmap or HTML-derived payload can render in A2.
- A2 shows source path and section for a selected task.
- Progress changes when task status changes.
- Auditor can trace roadmap item -> task -> agent assignment -> artifact -> review -> verification evidence.
- ATHER blocks work that treats hardcoded React rows as canonical project roadmap state.
