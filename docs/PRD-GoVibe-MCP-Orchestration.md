---
title: "PRD: GoVibe MCP Orchestration"
doc_id: "PRD-GOVIBE-MCP-ORCHESTRATION"
status: "draft"
version: "0.2.2+draft"
updated: "2026-08-19"
owner: "GoVibe"
source_of_truth: true
related_adrs: ["ADR-016", "ADR-017", "ADR-019", "ADR-021"]
block_manifest:
  core:
    id: "[[DOC::PRD_MCP_ORCHESTRATION]]"
    block_id: "[[GKS::GENESIS_BLOCK_V3]]"
    access_scope: "H4"
---

# PRD: GoVibe MCP Orchestration

## 1. Product Intent

GoVibe needs a stable orchestration interface that can coordinate human operators, Mission Control UI, local scripts, external coding agents, and future services without hardwiring orchestration logic into one UI runtime or one vendor CLI.

The MCP layer is the primary integration and orchestration surface for this job, leveraging MemoryOS V3 (Native Runtime / GenesisBlockDB) for context and state.

Mission Control remains the visual control plane. A GoVibe CLI may exist as a thin operator surface. Neither should become the canonical home of orchestration logic.

## 2. Problem Statement

Today, orchestration behavior is spread across:

- documentation-driven workflows
- agent registry configuration
- launcher scripts
- external tool adapters
- Mission Control operational behavior

Without a primary protocol surface, GoVibe risks:

- duplicated orchestration logic across UI, CLI, and scripts
- weak permission boundaries for tools and resources
- inconsistent audit trails between human and agent execution
- tight coupling to one executor or provider
- brittle context injection behavior as the platform grows

## 3. Goals

- Make MCP the primary orchestration interface for GoVibe agent operations.
- Keep Mission Control focused on visual coordination, state display, and operator actions.
- Keep CLI usage lightweight and ergonomic for humans, CI, and local automation.
- Provide one capability surface for agent execution, roadmap sync, document resolution, progress updates, and deployment triggers.
- Preserve RBAC for humans and ABAC for agents, subagents, MCP clients, and services.
- Preserve document-driven execution, traceability, and auditability.

## 4. Non-Goals

- Replace external coding tools such as Claude Code, Gemini CLI, OpenClaw, or Hermes.
- Take ownership of third-party billing, quota, or provider runtime policy.
- Make CLI scripts the canonical orchestration contract.
- Bypass approved SWE documents as the source of planning and execution intent.
- Expose unrestricted repo-wide tool access to every agent or MCP client.

## 5. Primary Actors

| Actor | Need |
|---|---|
| Human operator | Trigger work, inspect status, approve actions, and review outcomes |
| Mission Control UI | Visualize state and invoke controlled platform capabilities |
| Lead orchestration agent | Delegate work, retrieve context, and coordinate other agents |
| External coding agent | Receive scoped work and report execution results |
| Local sidecar executor | Perform bounded micro-task or atomic-task work |
| CI/CD automation | Trigger validation, deployment, and status reporting through stable interfaces |

## 6. Product Position

GoVibe should treat its orchestration surfaces as layered:

1. `MCP Server` as the primary orchestration interface
2. `Mission Control UI` as the visual control plane
3. `GoVibe CLI` as a thin operator and automation surface

The business rules for permissions, context injection, task routing, and state mutation should live behind the orchestration interface, not inside presentation layers.

## 7. Capability Surface

The orchestration surface is exposed as a governed catalog of MCP tools (`scripts/mcp/registry.mjs`). The current runtime ships ten `govibe.*` tools grouped by capability domain. Each capability is described below as a product capability; the tool names are the as-built contract from `docs/lld/LLD-GoVibe-MCP-Tools.md`.

The MCP runtime speaks MCP JSON-RPC (`Content-Length`-framed) over stdio and additionally boots an HTTP/WebSocket sidecar bound to `127.0.0.1:4310` (port via `GOVIBE_MCP_PORT`, host via `GOVIBE_MCP_HOST`) so Mission Control and other browser surfaces can reach the same capabilities. The sidecar exposes `GET /mission/snapshot`, `GET /roadmap/sources`, `POST /mission/commands`, and a `/mission/ws` WebSocket channel.

### 7.1 Agent Execution

- **`govibe.agent.run`** — request one governed agent execution. A caller supplies an `actor`, a `task`, and an `agent_id`, optionally with `project`, `scope`, `mode` (`doc | plan | audit | atomic`), and an executor preference. The capability resolves source documents/context, resolves execution policy, dispatches to the configured executor, and returns an execution summary, artifact links, blocker/denial metadata, and an audit reference.

This is the capability that lets the lead orchestration agent, Mission Control, and CI all request bounded execution through one contract rather than each re-implementing dispatch.

### 7.2 Document Resolution

- **`govibe.docs.resolve`** — resolve approved document content or a bounded context packet. A caller supplies an `actor` and `selectors`, optionally scope, context tier, and max-context bounds. The capability loads approved documents only and returns resolved document metadata, cited sections/files, and a bounded content packet or references according to policy.

This keeps document-driven execution honest: agents receive bounded, approved context rather than unrestricted repository access.

### 7.3 Roadmap Load / Update / Export

The roadmap is document-driven: board data originates from Markdown/HTML planning files under `docs/roadmap/`, not a database.

- **`govibe.roadmap.load`** — load document-driven roadmap or backlog state (requires `actor`). Resolves the roadmap source from approved Markdown, HTML, or explicit mission events, transforms it into the canonical board payload, and records source provenance. Returns a roadmap snapshot, source references, and parse warnings if present.
- **`govibe.roadmap.update`** — update roadmap, task, assignment, handoff, or verification state (requires `actor`, `nodeId`, `mutationType`). Validates the mutation against allowed workflow transitions, persists or emits a normalized event, and returns an updated state summary plus audit metadata.
- **`govibe.roadmap.export`** — export the live roadmap snapshot to a task-level Markdown artifact under `docs/roadmap` (requires `actor`). Supports `project`, `source`, `outputPath`, `overwrite`, and bitemporal selectors (`asOfValidAt` / `asOfRecordedAt`). Returns source, output path, and task count.

### 7.4 Workspace Initialize / Validate

- **`govibe.workspace.initialize`** — initialize the GoVibe agent workspace infrastructure (requires `actor`); runs `node scripts/agents/govibe-init.mjs` from the workspace root and returns its output.
- **`govibe.workspace.validate`** — validate the current workspace against execution-governance standards (requires `actor`); runs `node packages/govibe-core/bin/validate.mjs` and returns its output.

### 7.5 Document Creation

- **`govibe.doc.create`** — create a new GoVibe documentation file from a template (requires `type`, `slug`, `title`, `owner`, `complexity`). Scaffolds a new doc from the matching template with governed frontmatter, keeping new documents aligned with the versioning governance standard.

### 7.6 Deployment Trigger

- **`govibe.deploy.vercel`** — trigger or inspect a Vercel-oriented deployment flow (requires `actor`, `action`), optionally with `project` and target environment.

> Status: this capability is currently a **scaffold** (planned). `handlers.mjs` accepts the request and returns an acknowledgement plus an `auditRef`; it is not yet bound to a governed Vercel CLI / GitHub deployment adapter. It is described here so the deployment capability has a stable contract, but it must not be presented as live deployment behavior.

### 7.7 Step Orchestration

- **`govibe.orchestrate.step`** — execute one bounded StEP (a single step of a roadmap DAG / wave). It runs the step's agent action through `govibe.agent.run`, then evaluates the step's Definition-of-Done against the real verify-gate (`lint` / `build` / `test` / `docs:validate` / `roadmap:validate`) before advancing the task. Returns the step verdict, gate results, and an audit reference. This is the orchestration primitive the `.agents` system uses to advance work deterministically — orchestration here is a runtime capability, not a separate product identity.

## 8. Permission Model

GoVibe's intended governance model is two-tier:

- **RBAC for humans** — human caller permissions are evaluated by role.
- **ABAC for agents, subagents, MCP clients, and services** — non-human callers are evaluated by attributes (subject, resource, action, context, project/scope).

The model requires that deny paths be explicit and inspectable, that tool execution never silently widens scope beyond granted context, and that deployment or mutation operations remain attributable to an actor and project context.

> **Honest current state (per `docs/srs/SRS-GoVibe-MCP-Server.md`, FR-005 and §7):** the policy model above is the **planned** governance contract. The current runtime labels its capability surface as RBAC/ABAC (`describeCapabilitySurface` in `handlers.mjs`) and tool calls accept an `actor` argument, but **permission enforcement is not yet wired into the runtime** — there is no deny path applied to tool calls today. Permission enforcement is a future phase (see §11). This PRD does not claim live enforcement.

## 9. Surface Boundaries

GoVibe's orchestration responsibilities are layered across three surfaces, with business rules behind the orchestration interface rather than in any presentation layer:

| Surface | Role | Boundary |
|---|---|---|
| MCP Server | Primary orchestration interface | Owns the governed tool/resource catalog, context injection, task routing, and state mutation. The canonical home of orchestration logic. |
| Mission Control UI | Visual control plane | Consumes orchestration capabilities to visualize state and invoke controlled actions. Does not own execution policy or roadmap-mutation business rules. Renders live snapshot state or honest empty states (live-data-only rule). |
| GoVibe CLI | Thin operator/automation surface | Ergonomic surface for humans, CI, and local automation over the same orchestration rules. Not the canonical orchestration contract. |

The rule across all three: permissions, context injection, task routing, and state mutation live behind the MCP orchestration interface, so the same action behaves identically regardless of caller surface.

## 10. Success Metrics

Measured against the orchestration contract and current runtime, not aspirational targets:

- **Single orchestration contract reused by multiple surfaces** — Mission Control, CLI, and CI/CD invoke the same `govibe.*` capabilities; presentation layers carry no separate business-rule implementation for the same action (SRS FR-008, NFR-001).
- **No duplicated orchestration logic** — execution policy, context resolution, and roadmap mutation exist once, behind MCP, rather than copied into UI or scripts.
- **Auditable trail per execution** — every state-changing operation preserves an audit reference and links to source document, task, or project context where available (SRS FR-006, NFR-002).
- **Document-driven traceability preserved** — roadmap state derives from approved planning documents, and resolved context is bounded to approved sources (SRS FR-002, FR-004).
- **Provider neutrality maintained** — the interface does not assume one external coding-tool vendor; executors remain swappable behind adapters (SRS NFR-005).
- **Capability discoverability** — callers can enumerate the available tool/resource catalog (SRS FR-007).

Numeric targets (e.g. enforced-denial coverage, latency) are deferred until permission enforcement and a deployment adapter are bound; setting them now would not be grounded in current runtime behavior.

## 11. Rollout / Phasing

Phasing is derived from the current as-built runtime and the work the SRS/LLD mark as planned.

- **Phase 1 — Orchestration baseline (shipped).** MCP JSON-RPC over stdio plus the HTTP/WS sidecar on `127.0.0.1:4310`; the ten `govibe.*` tools (agent.run, orchestrate.step, docs.resolve, roadmap.load/update/export, workspace.initialize/validate, doc.create, deploy.vercel scaffold); document-driven roadmap; audit references surfaced on tool responses and the mission snapshot.
- **Phase 2 — Permission enforcement (planned).** Wire the RBAC/ABAC policy decision/enforcement points into the runtime so unauthorized actions fail with an explicit, inspectable denial reason (SRS FR-005, §7). Until this lands, the policy labels are descriptive, not enforced.
- **Phase 3 — Deployment binding (planned).** Bind `govibe.deploy.vercel` to a governed Vercel CLI / GitHub workflow adapter, replacing the current acknowledgement-only scaffold (LLD §3.5).
- **Phase 4 — Resource/discovery hardening (planned).** Decide which read-only data is offered as MCP resources versus tool-return payloads, and broaden capability-discovery metadata (SRS Open Questions).

## 12. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Policy labels are mistaken for live enforcement, creating a false sense of governance. | State enforcement status honestly in this PRD and the SRS; treat Phase 2 as a hard prerequisite before claiming governed access control. |
| Orchestration logic leaks back into Mission Control or CLI. | Keep business rules behind MCP (SRS FR-008); review surface changes against the §9 boundaries. |
| Deployment scaffold is used as if it deploys. | Mark `deploy.vercel` as a scaffold everywhere it appears until Phase 3 binds a real adapter. |
| Coupling to a single external executor or provider. | Preserve provider-neutral adapters behind tool implementations (SRS NFR-005, LLD §2). |
| Context scope overflow or unbounded resolution during execution. | Honor context tiers/max-context bounds in `govibe.docs.resolve`; preserve executor policy caps for bounded/sidecar execution (SRS NFR-004). |
| Drift between the TS snapshot types (`src/mission.ts`) and the `.mjs` runtime contract. | Keep the `MissionSnapshot`/event contract in sync when changing either side (CLAUDE.md). |
| Audit gaps for state-changing operations. | Require audit references and source/task/project links on every mutation (SRS FR-006, NFR-002). |

## 13. Open Questions

- Should read-only resources always be offered as MCP resources, or can some remain tool-return payloads in the first implementation? (SRS Open Questions)
- Should deployment operations be split into separate trigger and status capabilities from the first deployment release? (SRS Open Questions)
- What is the minimum RBAC/ABAC policy set required for Phase 2 to be considered "enforced," and where does the policy decision point live relative to `handlers.mjs`?
- Which roadmap mutation transitions require human approval versus agent-eligible automation once enforcement is active?

> TODO: the Phase 2/3 acceptance thresholds and the concrete policy schema are not specified in the current approved SRS/LLD; they should be resolved in the governance-access feature/spec set rather than invented here.

## 14. Traceability

| Item | Reference |
|---|---|
| Primary PRD system | `SYSTEM-06::Integration-Bridge-System` |
| Software requirements | `docs/srs/SRS-GoVibe-MCP-Server.md` |
| Tool-level design | `docs/lld/LLD-GoVibe-MCP-Tools.md` |
| Parent platform PRD | `docs/PRD-GoVibe-Platform-Overview.md` |
| Capability surface (§7) | SRS FR-001–FR-004, FR-009, FR-010; LLD §3 |
| Permission model (§8) | SRS FR-005, §7 (planned enforcement) |
| Success metrics (§10) | SRS FR-006, FR-007, FR-008; NFR-001, NFR-002, NFR-005 |

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.2+draft | 2026-08-19 | ATHER | Corrected abolished H-axis semantics per ADR-021/AUD-14 (TASK-PRD-022 sweep): `block_manifest.core.context_scaling_tier` renamed to `access_scope`; no status change. |
| 0.2.1+draft | 2026-06-22 | GoVibe | Corrected the tool count (nine → ten) and added the missing `govibe.orchestrate.step` capability (§7.7); framed orchestration as a runtime capability, not a separate product identity. |
| 0.2.0+draft | 2026-06-21 | GoVibe | Authored the previously-stubbed PRD body (capability surface, permission model, boundaries, metrics, rollout, risks, traceability) synthesized from the approved MCP SRS and tools LLD. |
| 0.1.1+draft | 2026-06-20 | GoVibe | Added missing title frontmatter field. Body remains stubbed and incomplete for sign-off. |
| 0.1.0 | 2026-06-15 | GoVibe | Added canonical doc_id metadata to align the orchestration PRD with the document versioning governance standard. |
