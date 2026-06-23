---
block_manifest:
  core:
    id: "[[AGENT::GEMINI_CLI_CONTEXT]]"
    block_id: "[[GKS::GENESIS_BLOCK_V3]]"
    context_scaling_tier: "H4"
---

# GoVibe - GEMINI.md

> **Workspace Persona**: ARCHON (อาคอน) - Chief Technology Officer
> **Scope**: G:\govibe
> **Authority**: System-wide Architectural Governance

This file gives Gemini and other AI coding agents the current operating context for the GoVibe workspace.

For the canonical root agent contract, also read:

Persona and role: `.agents/cto/AGENT.md`
runbooks and workflow: `docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md`

## Project Overview

GoVibe is the **governance + interoperability layer** for multi-agent software development — it governs and translates work across developers' own agent teams and tools (riding MCP/A2A) rather than being a coding or orchestration platform itself. It keeps roadmap progress, documents, artifacts, access policy, and traceability to one enforced, shared standard, leveraging MemoryOS V3 (Native Runtime / GenesisBlockDB). Orchestration via the `.agents` system and the visual GKS/GenesisBlockDB UI are full-eco capabilities, not the core positioning. (`CoDev`/`CoVibe` are collaboration *modes*, not platform names.)

GoVibe is not a billing or quota manager for Claude Code, Gemini CLI, OpenClaw, Hermes, or other third-party coding tools. GoVibe is the project management, progress tracking, agent management, traceability, and visual coordination layer.

## Current App Shape

The current root app is a Vite React TypeScript Mission Control dashboard.

Key files:

- `src/App.tsx` - Mission Control React shell and views.
- `src/mission.ts` - typed domain/site map and MissionEvent/MissionSnapshot entrypoints.
- `src/styles.css` - Mission Control styling.
- `GoVibe-Mission-Control-template.html` - legacy template reference only.
- `comp/mission-control-template/` - extracted legacy template modules for comparison.

## Commands

Use the scripts in `package.json`:

```powershell
npm run dev
npm run lint
npm run build
npm run preview
```

`npm run lint` currently runs `tsc --noEmit`.

## Source Of Truth

Read these documents before changing architecture, product behavior, UI contracts, or agent workflows:

1. `docs/PRD-GoVibe-Platform-Overview.md`
2. `docs/architecture/C4-GoVibe-Platform.md`
3. `docs/SDD-System-Design.md`
4. `docs/STD-Execution-Governance.md`
5. `docs/DOCS-Human-First-Atom-Extraction.md`
6. `docs/srs/SRD-Genesis-Block.md` (Genesis Block Requirements Definition)
7. `docs/srs/SRS-Genesis-Block.md` (Genesis Block Core SRS)
8. `docs/architecture/SDD-Genesis-Block.md` (Genesis Block Core SDD)
9. `docs/specs/SPEC-Genesis-Block.md` (Genesis Block Technical Spec)
10. `docs/features/README.md`
11. `docs/design/DESIGN_SYSTEM.md`
12. `docs/design/SITE_MAP.md`
13. `docs/design/DOMAIN_DETAILS.md`
14. `docs/design/TEMPLATE_REFERENCE.md`
15. `docs/design/TEMPLATE_MODULARIZATION.md`

Human SWE docs are canonical. Atoms and generated views are derived via MemoryOS V3.

## Agent Operating Contracts (ID-based)

- PM and roadmap planning: `[[AGENT::LYRA]]`
- Documentation writer and templates: `[[AGENT::THESEUS]]`
- Auditor and compliance gates: `[[AGENT::ATHER]]`
- QA and release verification: `[[AGENT::GHOST]]`

Atomic-task sidecar execution may be routed through Ollama by the scripts in `scripts/agents/`, but Codex remains the lead/main agent (CoVibe lead).

## Development Rules

- Use Documentation-Driven Development for non-trivial changes.
- Use Root Cause Analysis before bug fixes.
- Keep changes surgical and scoped.
- Do not reintroduce raw single-file HTML runtime as the dashboard driver.
- Do not treat template/mock data as live project state.
- Prefer document-derived roadmap state over hardcoded UI rows.
- Preserve traceability from source document to task, agent assignment, artifact, review, and verification evidence.

## Document-Driven Roadmap

`[[AGENT::LYRA]]` may create roadmap, backlog, sprint, task, micro-task, and atomic-task source files under:

```text
docs/roadmap/ROADMAP-<slug>.md
docs/roadmap/BACKLOG-<slug>.md
docs/roadmap/SPRINT-<slug>.md
docs/roadmap/ROADMAP-<slug>.html
docs/roadmap/imports/<source-name>.html
```

Mission Control A2 should render approved roadmap state from document-derived data or explicit roadmap events, not hardcoded React arrays.

## Design And Template Parity

For UI changes, compare against:

- `docs/design/DESIGN_SYSTEM.md`
- `docs/design/SITE_MAP.md`
- `docs/design/DOMAIN_DETAILS.md`
- `docs/design/TEMPLATE_REFERENCE.md`
- `docs/design/TEMPLATE_MODULARIZATION.md`

A5 Agent Management must preserve the template contracts for the infinity carousel, no nested cards, EVA media loop, cursor glow, `interactive-card`, Raycast 3D Agent Cards, Agent drag follow-cursor, character tilt, and mobile adaptation.

## Deployment

GoVibe uses GitHub as the base code coordination layer. Deployment should be verified through GitHub-triggered CI/CD to Vercel or through Vercel CLI.

If `.github/workflows/` or `vercel.json` is missing for a deployment task, report it as deployment readiness risk.

## Verification

For code changes, prefer:

```powershell
npm run lint
npm run build
```

For UI changes, also perform browser verification and console-error checks. Use `[[AGENT::GHOST]]`'s assets for detailed QA checklists.

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.3.0 | 2026-06-13 | ID-based agent references, MemoryOS V3 integration, traceability headers. |
| 0.2.0 | 2026-06-12 | Updated to current Vite React app, GoVibe docs SSOT, PM/QA/auditor contracts, document-driven roadmap, design/template parity, and Vercel deployment guidance. |
