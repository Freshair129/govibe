---
version: "0.1.0"
created_at: "2026-06-12T00:00:00+07:00,ATHER"
last_update: "2026-06-12T00:00:00+07:00,ATHER"
status: "active"
attributes:
  domain: "agent-governance"
  scope: "G:/govibe"
  doc_type: "agent-operating-contract"
---

# GoVibe Root Agent Operating Contract

## Scope

This file applies to agents working in the GoVibe workspace root:

```text
G:/govibe
```

## Operating Mode

GoVibe uses Documentation-Driven Development, Root Cause Analysis for bug fixes, and surgical implementation.

For non-trivial work, agents must identify:

- source document
- primary PRD system
- complexity level
- context tier
- expected verification evidence

## Source Of Truth

Read sources in this order when conflicts exist:

1. `docs/PRD-GoVibe-Platform-Overview.md`
2. `docs/architecture/C4-GoVibe-Platform.md`
3. `docs/SDD-System-Design.md`
4. `docs/STD-Execution-Governance.md`
5. `docs/DOCS-Human-First-Atom-Extraction.md`
6. `docs/features/README.md`
7. `docs/design/DESIGN_SYSTEM.md`
8. `docs/design/SITE_MAP.md`
9. `docs/design/DOMAIN_DETAILS.md`
10. `docs/design/TEMPLATE_REFERENCE.md`
11. `docs/design/TEMPLATE_MODULARIZATION.md`

Human-readable SWE documents are canonical. Genesis atoms and generated files are derived artifacts.

## Agent Roles

- PM planning: `.agents/pm/LYRA.md`
- Documentation writer: `.agents/doc_writer/THESEUS.md`
- Auditor: `.agents/auditor/ATHER.md`
- QA and release verification: `.agents/qa/ghost.md`
- Multi-agent runbook: `.agents/RUNBOOK-GoVibe-Multi-Agent.md`

## Required Workflows

### Docs To Code

Approved PRD/SRS/SDD/LLD/API/Runbook/Test Plan/Feature documents drive implementation. Code must not become the hidden source of truth for product behavior.

### Document-Driven Roadmap

PM/LYRA-created roadmap, backlog, sprint, task, micro-task, and atomic-task documents should be written as approved `.md` or `.html` source files under documented paths such as:

```text
docs/roadmap/ROADMAP-<slug>.md
docs/roadmap/BACKLOG-<slug>.md
docs/roadmap/SPRINT-<slug>.md
docs/roadmap/ROADMAP-<slug>.html
docs/roadmap/imports/<source-name>.html
```

Mission Control A2 must render approved roadmap state from document-derived data or explicit roadmap events, not from hardcoded React rows.

### Template Migration

`GoVibe-Mission-Control-template.html` is legacy reference material. React/Vite is the implementation source. Use:

- `docs/design/TEMPLATE_REFERENCE.md`
- `docs/design/TEMPLATE_MODULARIZATION.md`
- `comp/mission-control-template/`

Do not reintroduce raw HTML injection or legacy imperative runtime as the dashboard driver.

## Engineering Rules

- Keep changes surgical and task-scoped.
- Prefer existing project patterns.
- Use typed React/TypeScript boundaries.
- Do not treat mock/template data as live project state.
- Preserve traceability from source document to task, agent assignment, artifact, review, and verification evidence.
- Do not manage third-party provider billing, subscription, quota, or runtime ownership as GoVibe scope.

## Verification Rules

- Run `npm run lint` and `npm run build` for code changes when feasible.
- Use browser verification for UI changes.
- Use QA checklists in `.agents/qa/asset/` for visual, E2E, and deployment work.
- Use auditor checklists in `.agents/auditor/asset/` before marking C-2/C-3 work done.
- Report any verification that could not be run.

## Git Rules

- Check `git status --short` before staging.
- Stage only task-relevant files.
- Keep unrelated dirty changes out of the commit.
- Use readable commit messages.
- Use `git mv` for intentional renames.

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.1.0 | 2026-06-12 | Added root agent operating contract aligned with GoVibe PRD, C4, execution governance, PM roadmap source, QA, and auditor workflows. |
