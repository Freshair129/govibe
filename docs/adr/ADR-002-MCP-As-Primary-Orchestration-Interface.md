---
doc_id: "ADR-002-MCP-AS-PRIMARY-ORCHESTRATION-INTERFACE"
uid: "01KVXGFRV06947TRKB9T8MDSNS"
title: "ADR-002: MCP As Primary Orchestration Interface"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:29d531e446139e38"
updated: "2026-06-24"
owner: "GoVibe"
type: adr
---
# ADR-002: MCP As Primary Orchestration Interface

**Status:** `PROPOSED`
**Date:** 2026-06-13
**Impact to:** `Integration Bridge`, `Mission Control`, `CLI`, `Agent Execution`, `Governance`, `Audit`

---

## 1. Context

GoVibe is growing into a platform that coordinates:

- Mission Control UI actions
- human operator workflows
- lead-agent orchestration
- external coding agents and adapters
- local bounded executors
- roadmap, progress, and deployment operations

If orchestration logic lives directly inside UI runtime code, ad hoc shell scripts, or vendor-specific wrappers, the platform will drift into multiple incompatible control paths.

That drift would weaken:

- permission enforcement
- audit trail consistency
- document-driven execution behavior
- provider-neutral integration
- long-term maintainability

GoVibe already has the early shape of a shared orchestration layer through registry-driven prompts, launcher scripts, document-driven context, and adapter concepts. The platform now needs one primary orchestration interface.

## 2. Decision

GoVibe will adopt an `MCP Server` as its primary orchestration interface.

The platform surfaces are normalized as:

1. `MCP Server` as the primary orchestration contract
2. `Mission Control UI` as the visual control plane
3. `GoVibe CLI` as a thin human/operator and automation surface

Business rules for:

- tool and resource access
- context resolution
- execution policy
- roadmap state mutation
- progress reporting
- deployment actions
- audit logging

must live behind the orchestration interface rather than inside the UI or CLI.

## 3. Alternatives Considered

### Alternative A: CLI-first architecture

Use a GoVibe CLI as the primary orchestration surface and let UI or automation call shell commands.

Why not chosen:

- weak protocol boundary for agent-to-platform integration
- harder to govern resource/tool exposure cleanly
- audit and permission behavior tend to scatter across scripts
- less natural fit for multi-agent tool invocation

### Alternative B: UI-first orchestration

Keep Mission Control as the main product entrypoint and embed orchestration logic in the app runtime.

Why not chosen:

- couples orchestration to one presentation surface
- makes automation and agent integration secondary
- raises long-term maintenance cost

### Alternative C: MCP-only with no CLI

Expose only MCP and remove the need for a CLI.

Why not chosen:

- human operators and CI flows still benefit from a simple command surface
- local debugging and operational smoke tests are easier through a thin CLI

## 4. Consequences

**Positive**

- one stable orchestration contract for UI, CLI, agents, and automation
- clearer permission and capability boundaries
- stronger audit and traceability consistency
- better provider-neutral integration strategy
- easier long-term growth for roadmap, docs, deployment, and execution tools

**Negative**

- requires up-front design for tool/resource taxonomy
- adds an interface layer that must be maintained carefully
- can become bloated if capability boundaries are not kept narrow

## 5. Resulting Architectural Direction

- `Mission Control UI` calls governed platform capabilities rather than owning orchestration rules.
- `GoVibe CLI` wraps the same capabilities in a human-usable shell surface.
- external coding tools integrate through GoVibe adapters or governed execution tools.
- local bounded executors remain subordinate to the same orchestration and policy model.

## 6. Follow-on Documentation

This ADR is implemented by the following document set:

- `docs/PRD-GoVibe-MCP-Orchestration.md`
- `docs/srs/SRS-GoVibe-MCP-Server.md`
- `docs/lld/LLD-GoVibe-MCP-Tools.md`
- `docs/features/integration-bridge/FEAT-MCP-Integration-Bridge.md`

## 7. Review Note

This ADR is proposed and should be kept aligned with:

- `docs/PRD-GoVibe-Platform-Overview.md`
- `docs/architecture/C4-GoVibe-Platform.md`
- `docs/STD-Execution-Governance.md`

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-24 | GoVibe | Brought under document governance (docs:backfill): frontmatter + changelog. |
