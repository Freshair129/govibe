---
version: "1.1.0"
created_at: "2026-06-12T00:00:00+07:00,[[AGENT::ATHER]]"
last_update: "2026-06-13T16:00:00+07:00,[[AGENT::THESEUS]]"
status: "active"
attributes:
  domain: "agent-governance"
  scope: "G:/govibe"
# --- METADATA SPOKE LINKAGE ---
block_manifest:
  core:
    id: "[[AGENT::ROOT_CONTRACT]]"
    block_id: "[[GKS::GENESIS_BLOCK_V3]]"
    context_scaling_tier: "H4"
---

# GoVibe Root Agent Operating Contract

> **Base Contract:** This repository is an overlay of `[[AGENT::UNIVERSAL_HUB]]` (defined in `setup/AGENT.md`). Agents must comply with universal principles first, using this overlay for repository-specific configurations.

## 🎯 1. METADATA HUB & SPOKE
This contract is a **Spoke** linked to the **Universal Hub** (`setup/AGENT.md`). 

## 🛡️ 2. GOVERNANCE FRAMEWORK
### 2.1 Context Scaling Tiers (H0-H6) - Governance Boundaries
Agents must strictly operate within their authorized data tier:
- **H0 (Atomic):** Single file only.
- **H1 (Task):** Direct dependencies.
- **H2 (Story):** Feature folder + sibling metadata.
- **H3 (Epic):** Module-wide scope.
- **H4 (Phase):** System-wide architecture.
- **H5 (Masterplan):** Full GKS knowledge base traversal.
- **H6 (Ceiling):** Full enterprise network.

### 2.2 Complexity Assessment (C-1 to C-3) - Execution Metadata
Used for routing and resource allocation planning:
- **C-1 (Direct):** Simple, verifiable text/code changes.
- **C-2 (Doc-Driven):** Requires specs/doc alignment before code.
- **C-3 (Architecture):** Requires ADR/Spec/Diagrams + Team review.

## 🔗 3. COMMUNICATION PROTOCOL (Handoff)
- **Handoff Tracking:** All agent transitions must be logged in `.agents/devops/handoff/log.jsonl`.
- **Revocation:** Incomplete tasks must explicitly define `blocker` reasons in the handoff log.
- **Traceability:** Failure to record handoff state is a violation of the Execution Governance protocol.

## 🚀 4. OPERATING MODE
GoVibe uses Documentation-Driven Development (DDD) with MemoryOS V3 (Native Runtime / GenesisBlockDB). Read source documents in the declared order of truth (see standard order).

## Agent Roles (ID-based)

- PM planning: `[[AGENT::LYRA]]`
- Documentation writer: `[[AGENT::THESEUS]]`
- Auditor: `[[AGENT::ATHER]]`
- QA and release verification: `[[AGENT::GHOST]]`
- Multi-agent runbook: `docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md`

Bounded atomic-task sidecar execution may run through Ollama via the launcher scripts, while Codex remains the lead orchestrator for broader task coordination.

## Required Workflows

### Docs To Code

Approved PRD/SRS/SDD/LLD/API/Runbook/Test Plan/Feature documents drive implementation. Code must not become the hidden source of truth for product behavior.

### Document-Driven Roadmap

`[[AGENT::LYRA]]`-created roadmap, backlog, sprint, task, micro-task, and atomic-task documents should be written as approved `.md` or `.html` source files under documented paths such as:

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
| 1.1.0 | 2026-06-13 | ID-based agent references, MemoryOS V3 alignment, traceability headers. |
| 0.1.0 | 2026-06-12 | Added root agent operating contract aligned with GoVibe PRD, C4, execution governance, PM roadmap source, QA, and auditor workflows. |
