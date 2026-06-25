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
npx vitest run -t "scoring"                         # by test name
npx vitest run scripts/mcp/runtime-core.test.mjs    # runtime tests also run under `npm test`
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

### Backend (`scripts/mcp/`)
- `govibe-mcp-server.mjs` — the entrypoint. Speaks MCP JSON-RPC (`Content-Length` framed) over
  stdio AND boots the sidecar. On start it calls `govibeRuntime.initialize()`.
- `runtime-core.mjs` — `GovibeRuntime` / `govibeRuntime`: owns the server-side snapshot, agent
  registry parsing (`.agents/agent-registry.yaml`), roadmap loading, and mission-command handling.
- `registry.mjs` — `toolCatalog` (the `govibe.*` tools: agent.run, docs.resolve, roadmap.load/
  update/export, deploy.vercel, workspace.*, doc.create) and `resourceCatalog`. Add a tool here.
- `handlers.mjs` — dispatches `tools/call` and `resources/read` to the runtime.
- `sidecar-server.mjs` — the HTTP/WS bridge the browser talks to: `GET /mission/snapshot`,
  `GET /roadmap/sources`, `POST /mission/commands`, `/mission/ws`. Port via `GOVIBE_MCP_PORT`.
- `roadmap-parser.mjs` — parses planning docs matching
  `^(MASTERPLAN|ROADMAP|BACKLOG|SPRINT)-*.{md,html}` under `docs/roadmap/` into
  `WorkflowTaskNode`s, and scores/ranks candidate sources.
- `temporal-versioning.mjs` — bitemporal (`validFrom/validTo`, `recordedAt/supersededAt`) helpers;
  roadmap queries accept `asOfValidAt`/`asOfRecordedAt`.

The **roadmap is document-driven**: the board's data originates from Markdown/HTML planning files in
`docs/roadmap/`, not a database. Editing those docs changes the board.

## Conventions & gotchas

- **`npm run lint` is `tsc --noEmit`**, with `strict`, `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch`. Unused imports/vars and un-handled switch cases fail the build.
- **Vitest collects `src/**/*.test.ts` and `scripts/**/*.test.mjs`** (`vitest.config.ts`), running
  `scripts/**` under a Node environment. So `npm test` **does** run the MCP runtime tests
  (`scripts/mcp/*.test.mjs`); you can still target one by explicit path.
- Frontend and backend share *type intent* but not files: `src/mission.ts` (TS types) and the
  `.mjs` runtime produce the same snapshot shape independently. Keep them in sync when changing the
  `MissionSnapshot`/event contract.
- Live-data-only is a product rule (`PRODUCT.md`): do not introduce fake telemetry or mock values
  presented as backend state; use empty states that explain the missing feed.

## Subtrees & scope (don't mistake them for what they look like)

These look like things they aren't — clarifying so future reviewers don't re-flag them:

- **`.agents/`** — governance documentation, per-role contracts (`AGENT.md` per folder), context
  packets, and session traceability. **Not a custom agent framework / not runtime.** No LLM SDK
  is loaded, no agent loop runs. The role-named folders mirror an org chart for documentation
  only. Session logs (`session_logs/*.jsonl`) are gitignored as runtime traceability.
- **`scripts/mcp/`** — MCP JSON-RPC server (a standard open protocol). It exposes the
  `govibe.*` tool catalog; it is not an LLM agent.
- **`ref/`** — reference subtree of code used for comparison only. **Not live GoVibe source.**
  Its tests do not run under `npm test`.
- **`engine/`** — the forked, GoVibe-owned G-orchestra engine published to npm as `hybrid-meter`
  (see `engine/PROVENANCE.md`). Outside `tsc` and `vitest` by design (uses `node --test`).

## Working agreement (from AGENTS.md / AGENT.md)

This repo runs under a documented agent operating contract — the canonical file is `AGENTS.md`
(`AGENT.md` and `GEMINI.md` are compatibility bridges). The points that affect day-to-day edits:

- **Docs First:** substantial code changes follow an approved Blueprint/Spec; the doc set under
  `docs/` (PRD, SDD, STD-*, roadmap) is the source of truth, and `docs:validate` gates it.
- **Surgical edits:** change only what the task requires; don't invent new architecture, docs, or
  scope to answer a narrow request.
- **Project reality check / no imagined capability:** verify against real state (`git status`,
  the referenced files, actual code) before claiming a feature, command, or integration exists.
- **Best Code Rule:** prefer skipping work, or a docs/config/process/one-line fix, over new code.
