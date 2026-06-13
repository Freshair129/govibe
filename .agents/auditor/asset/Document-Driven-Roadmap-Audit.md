# Document-Driven Roadmap Audit

Use this checklist for Project Roadmap Management, A2 Roadmap Board, Docs to Code, PM planning output, and progress tracking changes.

## Required Sources

- `docs/PRD-GoVibe-Platform-Overview.md`
- `docs/SDD-System-Design.md`
- `docs/DOCS-Human-First-Atom-Extraction.md`
- `docs/features/project-roadmap/`
- `.agents/pm/AGENT.md`
- `.agents/pm/asset/Roadmap-Template.md`
- `.agents/pm/asset/Backlog-Template.md`

## Audit Checks

- [ ] LYRA output has a stable source path under a documented roadmap/backlog/sprint location.
- [ ] Source files are approved Markdown or HTML documents before they become canonical UI state.
- [ ] Parsed roadmap model includes phase, epic, sprint, task, sub-task, micro-task, and atomic-task where applicable.
- [ ] Progress is calculated from task status, not from a hardcoded percentage.
- [ ] Agent assignment links back to a task ID from the source document.
- [ ] Artifacts, reviews, and verification evidence link back to roadmap/task IDs.
- [ ] Hardcoded rows are allowed only as explicitly labeled empty-state/template fallback.
- [ ] Mission Control A2 has no live-looking mock progress when no document or event source exists.

## Drift Conditions

Mark the task as drift or non-compliant when:

- A2 treats `roadmapRows`, `TASK_DEFINITIONS`, or similar local arrays as canonical roadmap state.
- PM-created `.md` / `.html` files exist but are not represented in the roadmap UI contract.
- Progress, assignment, or completion state cannot be traced to a source document section or event payload.
- The UI displays blueprint/template data as if it were live project progress.
