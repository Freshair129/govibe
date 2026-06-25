---
block_manifest:
  core:
    id: "[[AGENT::GEMINI_CLI_CONTEXT]]"
    context_scaling_tier: "H4"
---

# GoVibe — GEMINI.md (Gemini CLI bridge)

> **Workspace Persona:** ARCHON (อาคอน) — Chief Technology Officer
> **Authority:** System-wide Architectural Governance

This file gives Gemini CLI a minimal pointer into the GoVibe workspace. The **canonical operating
contract is `AGENTS.md`** — load it first. `CLAUDE.md` covers the Vite/React shape, commands,
and conventions.

The current root app is a Vite React TypeScript Mission Control dashboard (see `src/App.tsx`,
`src/mission.ts`, `src/styles.css`).

Historical bridge content (full source-of-truth list, design/template parity rules, deployment
guidance, project positioning) was moved to
`docs/archive/snapshots-2026-06/agent-bridge-content-preserved.md` on 2026-06-25 to eliminate
triplicated content with `AGENTS.md` / `CLAUDE.md`; see `audit/ai-firstify-report-2026-06-25.md`
rec #4.
