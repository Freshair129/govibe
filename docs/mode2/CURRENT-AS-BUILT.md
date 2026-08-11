---
title: "Mode 2 Deliverable 1: Current As-Built Map"
doc_id: "MODE2-CURRENT-AS-BUILT"
status: "draft"
version: "0.1.0"
updated: "2026-08-11"
owner: "Boss (CEO)"
source_of_truth: false
access_scope: "H2"
complexity: "C-2"
related_docs:
  - "docs/mode2/MODE2-ARCHITECTURE.md"
  - "docs/specs/SPEC-Workspace-System.md"
  - "docs/architecture/ARCH-Vault-and-Context-Model.md"
  - "docs/STD-Execution-Governance.md"
---

# Mode 2 Deliverable 1: Current As-Built Map

## 1. Purpose

This document records what GoVibe **actually contains today**, verified by direct file
inspection at commit `53e9269`, as the factual baseline for GoVibe Mode 2 (Agent-Native
Workspace Integration). It exists because Mode 2 planning must not assume capability that
is not present, and must not duplicate capability that already is.

Every claim below cites a real path. Nothing here is inferred from other documents.

## 2. Runtime Topology

```text
src/                     React/Vite Mission Control (frontend)
scripts/mcp/             MCP server + HTTP/WS sidecar (backend)
packages/govibe-core/    Governed core library (.mjs, no build step)
packages/msp-runtime/    MSP parent-boundary runtime
packages/mission-protocol/
```

| Layer | Entry | Responsibility |
|---|---|---|
| MCP | `scripts/mcp/govibe-mcp-server.mjs` | stdio JSON-RPC entrypoint, sidecar bootstrap |
| Catalog | `scripts/mcp/registry.mjs` | `toolCatalog` / `resourceCatalog` |
| Dispatch | `scripts/mcp/handlers.mjs` | `tools/call`, `resources/read` |
| Runtime | `scripts/mcp/runtime-core.mjs` | `GovibeRuntime`, server-side snapshot |
| Services | `scripts/mcp/runtime/*.mjs` | workspace, roadmap, orchestration, memory, RBAC |
| Sidecar | `scripts/mcp/sidecar-server.mjs` | `GET /mission/snapshot`, `POST /mission/commands`, `/mission/ws` |

## 3. Existing Tool Surface

Twenty `govibe.*` names are registered in `scripts/mcp/registry.mjs`:

```text
govibe.agent.run              govibe.plan.create
govibe.deploy.vercel          govibe.render
govibe.doc.create             govibe.review.run
govibe.docs.resolve           govibe.roadmap.export
govibe.docs.version           govibe.roadmap.load
govibe.ingest.code            govibe.roadmap.update
govibe.optimize.run           govibe.workflow.continue
govibe.orchestrate.step       govibe.workflow.status
govibe.workspace.impact       govibe.workspace.initialize
govibe.workspace.scan         govibe.workspace.validate
```

None of the eight Mode 2 capability names proposed in the implementation prompt §25
(`govibe.workspace.inspect`, `govibe.scan.start`, `govibe.scan.status`,
`govibe.semantic.resolve`, `govibe.semantic.coverage`, `govibe.view.generate`,
`govibe.impact.analyze`, `govibe.roadmap.generate`) exists today.

`govibe.workspace.impact` already covers the responsibility that `govibe.impact.analyze`
would duplicate. Mode 2 MUST extend it rather than mint a second impact tool.

## 4. Existing Scan Capability

`packages/govibe-core/src/scan/` contains a **resumable, MSP-mediated, 12-stage deep scan**
that is already production-shaped — but its stage axis is *mechanical extraction*, not the
*semantic reconstruction* axis Mode 2 requires.

### 4.1 Current canonical stages

`packages/govibe-core/src/scan/stage-contract.mjs` fixes this ordered list and validates
every stage record against it:

| # | Stage | # | Stage |
|---|---|---|---|
| 1 | Scan | 7 | Tools |
| 2 | Structure | 8 | ORM |
| 3 | Markdown Parse | 9 | Cross-File Resolution |
| 4 | COBOL Parse | 10 | MRO |
| 5 | Symbolic Parse | 11 | Communities |
| 6 | Routes | 12 | Processes |

### 4.2 What is genuinely reusable

| Asset | Path | Mode 2 use |
|---|---|---|
| Filesystem inventory | `scan/scan.mjs` → `inventoryWorkspace` | Direct input to Mode 2 Stage 2 |
| Terminal stage statuses | `scan/stage-contract.mjs` | Pattern reused verbatim |
| Resume-by-run-directory | `scan/stage-runner.mjs` | Pattern reused; storage root differs |
| MSP knowledge promotion | `scan/stage-runner.mjs` | Reused unchanged — no scanner mints GKS identity |
| TypeScript AST extraction | `scan/stage-adapters.mjs` | Feeds Mode 2 Stage 3 / Stage 4 |
| Import resolution | `scan/stage-adapters.mjs` | Feeds Mode 2 Stage 4 dependency graph |
| Path-escape / symlink guard | `packages/govibe-core/src/path-safety.mjs` | Mandatory for external roots |
| Observed link graph + impact | `packages/govibe-core/src/impact/impact-engine.mjs` | Backs `govibe.workspace.impact` extension |

### 4.3 What is missing for Mode 2

- No workspace-ownership concept. `scanWorkspace` takes a bare `workspacePath` and assumes
  it may write `state/runs/<runId>/` **into that path**.
- No language/framework/package-manager/build-system detection (prompt §8 Stage 1).
- No artifact classification taxonomy (prompt §8 Stage 2). `inventoryWorkspace` records
  only `path`, `size`, `extension`.
- No dependency *classification* (compile-time / runtime / data / event / network).
- No interface, data-semantic, behavioural, state, cross-cutting, test, or agentic stage
  in the semantic sense the prompt requires.
- No Candidate Semantic IR, no coverage engine, no view router, no roadmap compiler.
- No incremental rescan. Every deep scan re-runs all twelve stages over a full inventory.

## 5. Existing Workspace Capability

`packages/govibe-core/src/workspace.mjs` → `initializeWorkspace` is **Mode 1**: GoVibe owns
the workspace. It creates, in the target root:

```text
.govibe/{config,skill-lock,project-state,vaults}.json
.govibe/skills/
.govibe/brain/{skills,rca,sessions}/  + MEMORY.md
.brain/<project-slug>/manifest.json
.brain/private/<agent-id>/manifest.json
.govibe-knowledge-block/{adr,api,architecture,data-model,domain,feature,report,spec,templates}/
.govibe-knowledge-block/SCHEMA.md
local_model/auto_scanned_models.json
```

### 5.1 Binding finding

This is **incompatible with the Mode 2 write policy**. The implementation prompt §2 forbids
forcing the project into a GoVibe-specific directory layout, and §26 proposes
`"write_policy": "metadata-only"`. `initializeWorkspace` creates eleven directories and
three seeded content files outside `.govibe/`.

Prompt §26 also requires the existing capability to **remain compatible**. Therefore Mode 2
MUST NOT modify `initializeWorkspace`. It requires a separate, additive binding path.

### 5.2 Identity model is reusable as-is

`packages/govibe-core/src/vaults.mjs` → `createWorkspaceVaultBindings` derives
`project_id` / `workspace_id` deterministically from project slug and resolved path
(`docs/specs/SPEC-Workspace-System.md` §3.1). Mode 2 reuses this unchanged, so an external
workspace and a GoVibe-owned workspace at the same path resolve to the same identity.

## 6. Governance Constraints That Bind Mode 2

| Constraint | Source | Effect on Mode 2 |
|---|---|---|
| `H` is Access Scope, `H0..H4`; `H5`/`H6` abolished | `docs/adr/ADR-021-H-Axis-Access-Scope-Semantic-Separation.md`, `CLAUDE.md` | Prompt §19's `H0–H5` complexity ladder is **rejected**; see §7 |
| Complexity axis is `C-0..C-3` | `docs/STD-Execution-Governance.md` §12.1 | Mode 2 work items carry `C`, not `H`, for complexity |
| Deep Scan creates observed candidates, never canonical GKS truth | `CLAUDE.md` | Mode 2 Stage 12 output is Candidate IR only |
| MSP mediates every canonical knowledge write | `SPEC-Workspace-System.md` | Mode 2 pipeline keeps the existing MSP promotion path |
| No mock data | `PRODUCT.md` | Missing semantics render as `UNRESOLVED`, never as invented values |
| Docs First | `AGENTS.md` | This deliverable set precedes the implementation |

## 7. Resolved Conflict: The Complexity Ladder

The implementation prompt §19 proposes:

```text
H0 — isolated atomic task ... H5 — platform / cross-system
```

This collides head-on with the repository's binding semantics, where `H` is the executor
Access Scope / tool-permission ceiling and `H5` does not exist. Prompt §19 itself defers:
*"Use the project's canonical complexity model if it already exists."* It does.

**Resolution.** Mode 2 classifies proposed work items on the canonical axes:

| Prompt §19 intent | Canonical mapping |
|---|---|
| H0 isolated atomic task | `C-0`, access default `H0` |
| H1 local component | `C-1`, access default `H1` |
| H2 feature | `C-2`, access default `H2` |
| H3 cross-module | `C-3`, access default `H3` |
| H4 system architecture | `C-3` + explicit `H4` override, owner approval required |
| H5 platform / cross-system | **No canonical equivalent.** Represented as `C-3`/`H4` with an explicit `cross_system: true` attribute, not a new tier. |

## 8. Baseline Gate State

Carried from `docs/roadmap/MASTERPLAN-govibe-production-readiness.md` §3 (recorded
2026-08-06, commit `87c313d`): typecheck, 417 unit tests, 50 security tests, build,
`docs:validate`, `roadmap:validate`, and `mcp:smoke` all pass. Mode 2 must not regress any
of them.

## 9. Changelog

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1.0 | 2026-08-11 | Initial as-built map for Mode 2 Phase 1 planning. | Claude Code |
