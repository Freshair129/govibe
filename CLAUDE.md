# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

GoVibe Mission Control — a React/Vite dashboard ("Mission Control") plus a Node MCP server that
governs and feeds it. The frontend is an operational command center for the GoVibe agent system;
the backend exposes governed agent/roadmap/doc tools over the Model Context Protocol and a local
HTTP/WebSocket sidecar. There is **no mock data** by design — panels render live `MissionSnapshot`
state or honest empty states.

## Commands

```bash
npm run dev            # Vite dev server on port 1420 (strictPort: false)
npm run build          # tsc (typecheck) && vite build → dist/
npm run lint           # tsc --noEmit — this is the only "lint" (no ESLint configured)
npm test               # vitest run
npm run test:watch     # vitest (watch)

npm run mcp:dev        # start MCP server (stdio JSON-RPC) + HTTP/WS sidecar on 127.0.0.1:4310
npm run mission:dev    # alias of mcp:dev
npm run mcp:smoke      # spin up the MCP server and assert the tool catalog responds
npm run roadmap:export # export the live roadmap snapshot to Markdown under docs/roadmap

npm run docs:validate  # governance check: doc frontmatter, required templates, path refs
npm run baseline:check # docs:validate && lint && build — the full gate before a baseline
npm run diff:check     # docs/source diff governance check (add :staged for staged-only)
```

Running a single test:
```bash
npx vitest run src/roadmapExport.test.ts          # one file
npx vitest run -t "scoring"                       # by test name
npx vitest run scripts/mcp/runtime-core.test.mjs  # backend test
npx vitest run packages/govibe-core/impact-engine.test.mjs
```

## Architecture

### Frontend (`src/`)
- Entry `main.tsx` → `App.tsx`. The whole app is a single-window shell: `Header` (domain tabs),
  `Sidebar` (sub-views), `main` (active view), `StatusBar`, `Terminal`, `footer`.
- **`src/mission.ts` is the spine.** It defines every domain/view type, the `MissionSnapshot` and
  `MissionEvent`/`MissionCommand` unions, the `missionDomains` navigation map, and the
  `MissionGateway` class (singleton `missionGateway`). Read this first — most features just consume
  slices of `MissionSnapshot`.
- Navigation is a fixed 4-domain × N-view map (A1–A5, B1–B4, C1–C5, D1–D3). `app/RenderView.tsx`
  is the switchboard: `activeView` → feature component. Each view lives in `src/features/<area>/`.
  Adding a view means: add the `ViewId` + `subModules` entry in `mission.ts`, then a branch in
  `RenderView.tsx`, then the component.
- **State flow:** components never fetch directly. `useMissionSnapshot()` subscribes to
  `missionGateway`; `send(command)` pushes a `MissionCommand` back out. The gateway merges partial
  patches via `mergeSnapshot` and notifies listeners.
- **Transport resolution** (in `MissionGateway`): prefers `VITE_GOVIBE_WS_URL` (WebSocket), else
  `VITE_GOVIBE_API_URL` (HTTP bootstrap + derived WS), else — only on localhost — falls back to the
  sidecar at `http://127.0.0.1:4310`. With no transport, commands log a warning instead of throwing.
- **External ingestion:** the gateway also accepts events via the `govibe:mission-event`
  CustomEvent and `window.postMessage` (source `"govibe-mission-control"`), and exposes
  `window.__govibeMissionGateway`. This is how the HTML template / data-ingest view feed live state.

### Backend (`scripts/mcp/` and `packages/govibe-core/`)
- `govibe-mcp-server.mjs` — the MCP entrypoint plus sidecar bootstrap.
- `runtime-core.mjs` — `GovibeRuntime` / `govibeRuntime`: owns the server-side snapshot, agent
  registry parsing, roadmap loading, and mission-command handling.
- `registry.mjs` — `toolCatalog` and `resourceCatalog`. Add a public MCP tool here.
- `handlers.mjs` — dispatches `tools/call` and `resources/read` to the runtime.
- `sidecar-server.mjs` — HTTP/WS bridge: `GET /mission/snapshot`, `GET /roadmap/sources`,
  `POST /mission/commands`, `/mission/ws`. Port via `GOVIBE_MCP_PORT`.
- `packages/govibe-core/src/scan/` — canonical 12-stage decomposition and observed graph discovery.
- `packages/govibe-core/src/impact/impact-engine.mjs` — local observed link graph, backlink index,
  and explainable reverse-dependency traversal used by `govibe.workspace.impact`.
- `packages/govibe-core/src/context-*.mjs` — context profile, packet, cache, injection, replay lineage.
- `packages/govibe-core/src/vaults.mjs` — project/workspace/agent vault identities and bindings.

The **roadmap is document-driven**: the board's data originates from Markdown/HTML planning files in
`docs/roadmap/`, not a database. Editing those docs changes the board.

## Conventions & gotchas

- **`npm run lint` is `tsc --noEmit`**, with `strict`, `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch`. Unused imports/vars and un-handled switch cases fail the build.
- Vitest collects `src/**/*.test.ts`, `scripts/**/*.test.mjs`, and `packages/**/*.test.mjs`.
  Tests under a root `tests/` folder are not collected by the canonical config.
- Frontend and backend share *type intent* but not files: `src/mission.ts` (TS types) and the
  `.mjs` runtime produce the same snapshot shape independently. Keep them in sync when changing the
  `MissionSnapshot`/event contract.
- Live-data-only is a product rule (`PRODUCT.md`): do not introduce fake telemetry or mock values
  presented as backend state; use empty states that explain the missing feed.

## Session memory and vaults

The canonical memory model is defined by `docs/architecture/ARCH-Vault-and-Context-Model.md`.

- Shared Vault: governed project source of truth for authorized agent teams.
- Workspace Private Vault: detailed episodic/experiential memory for one agent in the current workspace.
- Global Private Vault: compressed durable memory for one agent across workspaces.
- `V-space` means workspace. It is not another memory tier.

Workspace materialization uses `.brain/<project-slug>/` for the project Shared Vault and
`.brain/private/<agent-id>/` for Workspace Private memory. Folder names are not canonical identities;
use `vault_id`, `project_id`, `workspace_id`, and `agent_id` from `.govibe/vaults.json`.

Start of session: read the applicable Shared/Workspace context selected by the GoVibe context packet.
Do not blindly ingest every `.brain/` file. End of session: persist bounded summaries, decisions,
outcomes, and lessons. Never store hidden chain-of-thought.

## Context profiles and replay

- `T-ctx`: system plus task/event context, normally worker or headless agents.
- `V-ctx`: Global Private plus current Workspace Private context.
- `W-ctx`: V-ctx plus exactly one active multi-agent workflow.
- `M-ctx`: per-turn synchronized Global/Workspace context with diff lineage.

Every dispatched turn must retain `contextId`, `cacheId`, optional runtime-issued `kvId`, exact source
versions/hashes, and injection metadata. M-ctx forms a parent-linked chain. Never silently replay with
newer vault content. Context reproducibility, execution reproducibility, and identical output are
separate claims.

## Knowledge, links, backlinks, and impact

Deep Scan creates observed candidates. It does not create canonical GKS truth.

- Stage 3 discovers Markdown documents, sections/atom candidates, wikilinks, and references.
- Stage 5 discovers symbols and call links.
- Stages 6-10 add route/tool/ORM/import/inheritance links.
- MSP authorizes and mediates promotion.
- GKS assigns canonical document, atom, symbol, entity, and relation identities.
- GenesisBlockDB persists/indexes canonical records.

A backlink is the incoming projection of the same forward relation, not a duplicate semantic edge.
When a contract, schema, architecture decision, or runtime symbol changes, run
`govibe.workspace.impact` or `calculateWorkspaceImpact` with the changed paths. Review every returned
`must_update` and `review_and_update` artifact. The result must explain relation chain, distance,
score, and unresolved links. Plain substring search is not accepted as impact analysis.

## Canonical governance axes

GoVibe's `docs/STD-Execution-Governance.md` (v2.4.0+ga §12.1) is the canonical single source of
truth for Execution Governance; RWANG-PROMAX (`skills/rwang/references/EXECUTION-GOVERNANCE.md`)
holds a read-only distribution mirror. `docs/adr/ADR-021-H-Axis-Access-Scope-Semantic-Separation.md`
is the binding GoVibe semantic separation decision.

Claude must keep these meanings separate in planning, docs, schemas, symbols, and code:

| Axis | Meaning | Values / representation |
|---|---|---|
| `C` | process complexity | `C-0..C-3` |
| `H` | executor Access Scope / tool-permission ceiling | `H0..H4` |
| `R` | retrieval radius / graph distance | `R0..R6`, `maxHops`, or retrieval policy |
| `D` | compaction / resolution depth | repository-defined `D` scale |
| `W` | fan-out / branching width | `W2..W4` |
| Budget | token/content allowance | explicit numeric or budget policy |
| Risk | operational/security impact | repository-defined risk class |

Access defaults from complexity:

```text
C-0 -> H0
C-1 -> H1
C-2 -> H2
C-3 -> H3
```

`C-3/H4` is an explicit upward override for architecture, cross-system, or platform work and
requires owner approval before implementation. H4 is not unrestricted authority; task scope,
repository policy, deny rules, and human gates still apply.

Never use or introduce active semantics where:

```text
H = graph hops
H = retrieval radius
H = context/token budget
H = risk
H = operating mode
H5/H6 = active access tiers
```

Migration rules:

- use `access_scope` for H metadata; do not introduce `context_scaling_tier` as an alias
- use `retrieval_radius`, `max_hops`, or a retrieval-policy object for graph distance
- use `D` for compaction/resolution depth
- use `context_budget` or `max_tokens` for context allowance
- treat `context_tier` as legacy and ambiguous; classify its actual behavior before renaming
- do not create symbols such as `HLevelClassifier` or `classifyHLevel`; use explicit names such as
  `AccessScopeClassifier`, `RetrievalRadiusPlanner`, and `ContextBudgetPlanner`
- historical changelog references may remain only when clearly historical

For any non-trivial task, report C and the effective H. Report R, D, W, Budget, and Risk only when
those concerns are actually involved. Do not stuff them into H merely because one letter feels
administratively convenient.

## Working agreement (from AGENTS.md / AGENT.md)

This repo runs under a documented agent operating contract — the canonical file is `AGENTS.md`
(`AGENT.md` and `GEMINI.md` are compatibility bridges). The points that affect day-to-day edits:

- **Docs First:** substantial code changes follow an approved Blueprint/Spec; the doc set under
  `docs/` is the source of truth, and `docs:validate` gates it.
- **Surgical edits:** change only what the task requires; don't invent unrelated architecture.
- **Project reality check / no imagined capability:** verify real files, code, tests, and CI before
  claiming a feature, command, or integration exists.
- **Impact before completion:** run reverse-dependency impact analysis for semantic, schema,
  authority-boundary, or runtime-behavior changes and update the required dependents.
- **Best Code Rule:** prefer skipping work, or a docs/config/process/one-line fix, over new code.
