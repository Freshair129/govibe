# GoVibe - GEMINI.md

This file gives Gemini and other AI coding agents the current operating context for the GoVibe workspace.

For the canonical root agent contract, also read:

- `agent.md`
- `.agents/RUNBOOK-GoVibe-Multi-Agent.md`

## Project Overview

GoVibe is an AI-native visual CoDev and project management platform. It coordinates human developers, their agent teams, project documents, roadmap progress, artifacts, access policy, and third-party AI coding tools through API and MCP integrations.

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
6. `docs/features/README.md`
7. `docs/design/DESIGN_SYSTEM.md`
8. `docs/design/SITE_MAP.md`
9. `docs/design/DOMAIN_DETAILS.md`
10. `docs/design/TEMPLATE_REFERENCE.md`
11. `docs/design/TEMPLATE_MODULARIZATION.md`

Human SWE docs are canonical. Atoms and generated views are derived.

## Agent Operating Contracts

- PM and roadmap planning: `.agents/pm/LYRA.md`
- Documentation writer and templates: `.agents/doc_writer/THESEUS.md`, `.agents/doc_writer/template/`
- Auditor and compliance gates: `.agents/auditor/ATHER.md`, `.agents/auditor/asset/`
- QA and release verification: `.agents/qa/ghost.md`, `.agents/qa/asset/`

## Development Rules

- Use Documentation-Driven Development for non-trivial changes.
- Use Root Cause Analysis before bug fixes.
- Keep changes surgical and scoped.
- Do not reintroduce raw single-file HTML runtime as the dashboard driver.
- Do not treat template/mock data as live project state.
- Prefer document-derived roadmap state over hardcoded UI rows.
- Preserve traceability from source document to task, agent assignment, artifact, review, and verification evidence.

## Document-Driven Roadmap

PM/LYRA may create roadmap, backlog, sprint, task, micro-task, and atomic-task source files under:

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

For UI changes, also perform browser verification and console-error checks. Use `.agents/qa/asset/` for detailed QA checklists.

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.2.0 | 2026-06-12 | Updated to current Vite React app, GoVibe docs SSOT, PM/QA/auditor contracts, document-driven roadmap, design/template parity, and Vercel deployment guidance. |
