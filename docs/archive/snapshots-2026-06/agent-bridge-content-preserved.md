---
title: "Preserved content from AGENT.md (v1.2.1) and GEMINI.md (v0.3.0) bridges"
type: "archive"
preserved_at: "2026-06-25"
preserved_by: "AI-firstify Phase B consolidation (Rec #4)"
---

# Preserved Bridge Content (AGENT.md + GEMINI.md)

This file preserves unique content from the previous AGENT.md (v1.2.1) and GEMINI.md (v0.3.0)
before they were trimmed to real thin compatibility bridges per the ai-firstify audit
(`audit/ai-firstify-report-2026-06-25.md` recommendation #4). The canonical contract lives in
`AGENTS.md`; this file is reference-only.

---

## From AGENT.md — Required Evidence Fields (external-agent response schema)

Every external-agent response was required to include:

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

## From AGENT.md — Required Context Load Order

Before making project claims or recommendations:

1. `AGENTS.md`
2. `.agents/context/shared/CONTEXT-GoVibe-Shared-External-Agent.md`
3. `.agents/context/CONTEXT-Bounded-External-Executor.md`
4. Any role-specific, system-specific, or task-specific packet supplied by the caller

If a required context file cannot be read, respond with `blocked_by_missing_context` and list the
missing file.

---

## From GEMINI.md — ARCHON persona

- **Workspace Persona:** ARCHON (อาคอน) — Chief Technology Officer
- **Authority:** System-wide Architectural Governance

## From GEMINI.md — Source-of-Truth doc list

Read these documents before changing architecture, product behavior, UI contracts, or agent
workflows:

1. `docs/PRD-GoVibe-Platform-Overview.md`
2. `docs/architecture/C4-GoVibe-Platform.md`
3. `docs/SDD-System-Design.md`
4. `docs/STD-Execution-Governance.md`
5. `docs/DOCS-Human-First-Atom-Extraction.md`
6. `docs/srs/SRD-Genesis-Block.md`
7. `docs/srs/SRS-Genesis-Block.md`
8. `docs/architecture/SDD-Genesis-Block.md`
9. `docs/specs/SPEC-Genesis-Block.md`
10. `docs/features/README.md`
11. `docs/design/DESIGN_SYSTEM.md`
12. `docs/design/SITE_MAP.md`
13. `docs/design/DOMAIN_DETAILS.md`
14. `docs/design/TEMPLATE_REFERENCE.md`
15. `docs/design/TEMPLATE_MODULARIZATION.md`

## From GEMINI.md — Design And Template Parity

A5 Agent Management must preserve the template contracts for: the infinity carousel, no nested
cards, EVA media loop, cursor glow, `interactive-card`, Raycast 3D Agent Cards, Agent drag
follow-cursor, character tilt, and mobile adaptation.

## From GEMINI.md — Document-Driven Roadmap source paths

`[[AGENT::LYRA]]` may create roadmap, backlog, sprint, task, micro-task, and atomic-task source
files under:

```text
docs/roadmap/ROADMAP-<slug>.md
docs/roadmap/BACKLOG-<slug>.md
docs/roadmap/SPRINT-<slug>.md
docs/roadmap/ROADMAP-<slug>.html
docs/roadmap/imports/<source-name>.html
```

## From GEMINI.md — Deployment guidance

GoVibe uses GitHub as the base code coordination layer. Deployment should be verified through
GitHub-triggered CI/CD to Vercel or through Vercel CLI. If `.github/workflows/` or `vercel.json`
is missing for a deployment task, report it as deployment readiness risk.

## From GEMINI.md — Project positioning (verbatim, for historical context)

> GoVibe is the **governance + interoperability layer** for multi-agent software development —
> it governs and translates work across developers' own agent teams and tools (riding MCP/A2A)
> rather than being a coding or orchestration platform itself. It keeps roadmap progress,
> documents, artifacts, access policy, and traceability to one enforced, shared standard,
> leveraging MemoryOS V3 (Native Runtime / GenesisBlockDB).
