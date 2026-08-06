---
title: "WP-18: Persistent-Memory MSP Runtime — Phase 5 Stage B (Mission Control Domain E)"
doc_id: "WP-18-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-5-STAGE-B"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-05"
owner: "Boss (CEO)"
proposal_author: "Claude (final-gate session)"
approval_owner: "Boss (CEO)"
source_of_truth: false
approval_recorded_at: ""
execution_authorized: false
execution_complete: false
complexity: "C-2"
access_scope: "H2"
risk: "MEDIUM"
parent_change_request: "CR-2026-08-04-PERSISTENT-MEMORY-MSP-RUNTIME"
depends_on: "WP-17-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-5-STAGE-A"
related_adrs: ["ADR-027"]
related_apis: ["API-009"]
---

# WP-18: Persistent-Memory MSP Runtime — Phase 5 Stage B (Mission Control Domain E)

## Objective

Deliver the presentation half of Phase 5: Mission Control's Domain E
(Memory) — navigation registration and the view components that render the
`MissionSnapshot` memory slice WP-17 (Stage A) already delivers. This packet
adds no new data path, no new tool, and no new protocol type; every byte it
displays is already flowing by the time it starts.

The risk being accepted is presentational and bounded: a defect here shows
wrong or missing information in one domain's views. It cannot corrupt stored
memory, cannot cross a vault boundary (scoping is enforced server-side by
WP-14 and WP-17), and cannot break other domains' data flow — though it can
break their *rendering* if a shared shell component or stylesheet is
mishandled, which is why the repo-root `lint`/`build` gates are acceptance
criteria here.

## Why this packet is Stage B of two

Phase 5 was originally authored as one work packet carrying a split
recommendation; the owner authorized the split on 2026-08-05. WP-17 is
Stage A (data), this is Stage B (presentation). The boundary is drawn so
that Stage A is independently verifiable end to end — its
`snapshot-reducer.test.ts` assertions prove the memory slice survives merge
and reduction, which is exactly the guarantee this packet builds on.

Consequence worth stating plainly: **if Stage A closed correctly, this
packet cannot be blocked by a data problem.** If a data problem surfaces
during Stage B, that is a Stage A defect and belongs in a Stage A
remediation record, not in this packet's scope.

## Ground truth as of 2026-08-05 (verify before editing; do not assume)

This packet is written to be executable by a session with no prior context.

### What Stage A (WP-17) will have delivered before this packet starts

- A `memory` slice on `MissionSnapshot` in `src/mission/domain.ts`, with its
  `MissionEvent` and `MissionCommand` variants.
- `emptyMissionSnapshot`, `mergeMissionSnapshot`, and `reduceMissionEvent`
  in `src/mission/snapshot-reducer.ts` all handling that slice, with tests.
- `packages/mission-protocol/index.js` allow-listing the memory events and
  commands, so they actually cross the wire.
- `govibe.memory.*` MCP tools and the `scripts/mcp/runtime/memory-service.mjs`
  bridge feeding the slice.
- **Stage A deliberately does not add `DomainId` `"E"` or any `ViewId`** —
  those are this packet's first additions.

Read the delivered Stage A code before writing anything here; the slice's
actual field names are its contract, not whatever this document guesses.

### Mission Control frontend conventions

- `src/mission/domain.ts` holds `DomainId` (currently `"A" | "B" | "C" | "D"`
  before this packet) and `ViewId`.
- `src/mission/navigation.ts` holds `missionDomains` and
  `defaultViewByDomain`. `src/App.tsx` and `src/app/Header.tsx` iterate
  `Object.values(missionDomains)` generically, so **adding a domain is a data
  change, not a tab-bar code change** — no edit to App/Header is needed for
  the domain to appear.
- `src/app/RenderView.tsx` is a flat `if (activeView === "X1") return <.../>`
  chain **with a fallback `return` at the end**. A new view without an
  explicit branch silently renders the fallback component instead of an
  error. Always add an explicit branch per view.
- `src/app/Sidebar.tsx`'s `SidebarIcon()` falls back to a generic glyph for
  an unrecognized `icon` string, so a dedicated SVG is polish, not a blocker.
- **Empty-state rule (non-negotiable house rule, stated in `PRODUCT.md` and
  `CLAUDE.md`)**: panels render live `MissionSnapshot` state or an honest
  `<EmptyState>` explaining which feed is missing. **Never fabricate
  placeholder rows or mock values.** See `src/shared/EmptyState.tsx` and
  `src/shared/ViewHeader.tsx`.
- **Best template to copy**: `src/features/symbols/SymbolExplorerView.tsx`
  (~50 lines: `ViewHeader` + a `.table-filter` input + client-side filter +
  `EmptyState` when the slice is empty + a `.panel.table-panel` table). For
  row-level detail drill-down, `src/features/roadmap/WorkflowTaskRow.tsx`
  shows the per-row expand/collapse pattern. For a two-pane layout,
  `src/features/graph/GraphView.tsx` shows the `minmax(220px,320px)
  minmax(0,1fr)` grid convention shared by `.graph-layout`,
  `.roadmap-layout`, and `.hnsw-layout` in `src/styles/views.css`.
- **Styling**: plain CSS files imported through `src/styles.css`; theme
  tokens (`--bg`, `--panel`, `--border`, `--text`, `--muted`, `--accent`) in
  `src/styles/shell.css`; per-domain accent injected as a CSS variable from
  `domain.color`. No CSS-in-JS, no CSS modules, no Tailwind.
- **Testing precedent**: this repo has **no per-component `.tsx` tests** for
  any feature view. Coverage lives in `src/mission/snapshot-reducer.test.ts`
  and the protocol tests, with Playwright e2e specs under `e2e/`. Follow that
  precedent — do not invent a new component-test convention for this packet.
- `src/features/ingest/DataIngestView.tsx` (view C3) lets an operator paste a
  raw `MissionEvent` JSON and inject it into the gateway — useful for
  exercising these views without a live MSP runtime.

### Governed design docs

`docs/design/SITE_MAP.md` and `docs/design/DOMAIN_DETAILS.md` (both at
version `1.1.0`) already document Domain E as **planned**, including its
three intended sub-views and the `MemorySnapshot` field contract. This packet
updates both from planned to delivered, reconciling them against what was
actually built.

## Preconditions

- WP-17 (Stage A) is execution-complete and independently verified. This
  packet renders a snapshot slice; if that slice is not yet delivered and
  proven to survive merge, there is nothing to render.
- `docs/design/SITE_MAP.md` and `docs/design/DOMAIN_DETAILS.md` are the
  design record for Domain E's intended shape. Where they disagree with what
  Stage A actually delivered, the delivered code wins and the docs are
  corrected — record any such reconciliation rather than silently following
  one side.

## Bounded scope

1. **Domain and view registration**: `DomainId` gains `"E"` and `ViewId`
   gains this packet's view ids in `src/mission/domain.ts`;
   `missionDomains.E` and `defaultViewByDomain.E` added in
   `src/mission/navigation.ts`; an explicit branch per view in
   `src/app/RenderView.tsx`.

2. **View components** under `src/features/memory/`, following
   `SymbolExplorerView.tsx`'s shape and the house empty-state rule.
   `docs/design/SITE_MAP.md` documents three planned sub-views (memory
   browser, temporal/decay, vault/promotion). **Shipping fewer than three is
   an acceptable outcome if the delivered snapshot slice does not support
   one of them** — in that case do not build a view with nothing real to
   show; record which was deferred and why, and reconcile SITE_MAP
   accordingly. A view that renders an honest empty state forever is worse
   than a view that does not exist yet.

3. **Degraded-mode visibility**: whatever retrieval mode WP-15 reports
   (hybrid vs. keyword-only when the vector backend is unavailable) must be
   **visible in the UI**, not silently hidden. An operator looking at
   keyword-only results should be able to tell they are keyword-only.

4. **Styling**: a `src/features/memory/*.css` (or an addition to
   `src/styles/views.css`) following the existing conventions — theme tokens,
   the shared `.panel` / `.table-panel` / `.empty-state` / `.status-pill`
   classes, and the established grid convention if a two-pane layout is used.

5. **Design-doc reconciliation**: `docs/design/SITE_MAP.md` and
   `docs/design/DOMAIN_DETAILS.md` updated from planned to delivered
   (including any deferred sub-view from item 2), each with a version bump
   and Changelog row, and their rows synchronized in
   `docs/DOC-VERSION-REGISTRY.md`.

## Explicit exclusions

- Any change to `packages/msp-runtime/**`. If a runtime change proves
  necessary, that is evidence of a Stage A gap: stop, record it, and handle
  it as a Stage A remediation rather than widening this packet.
- Any change to `packages/mission-protocol/**`,
  `scripts/mcp/runtime/memory-service.mjs`, `scripts/mcp/memory-surface.mjs`,
  or `scripts/mcp/msp-memory-contracts.mjs` — all Stage A's, and all frozen
  by the time this packet runs. Needing to touch them means Stage A did not
  actually close.
- New `MissionEvent` / `MissionCommand` types, or new snapshot fields.
  This packet consumes the contract Stage A delivered; extending it is a
  Stage A change.
- A new component-testing framework or convention for `.tsx` views.
- Pointing `GOVIBE_MSP_COMMAND` at `packages/msp-runtime` in GoVibe's real
  runtime configuration — still a separate, later decision, unchanged from
  every prior packet in this series.
- Any mock, placeholder, or fabricated data in any view, under any
  circumstance, including "just for the screenshot."

## Acceptance and exit gate

- AC-01: Domain E appears in the domain navigation and each of its views is
  reachable, with an explicit `RenderView.tsx` branch per view (no view
  reaching the fallback `return`).
- AC-02: with no memory data present, every view renders an honest
  `EmptyState` naming the feed that would populate it. No fabricated rows
  anywhere, verified by review of the components as well as by test.
- AC-03: with memory data present in the snapshot, the views render it —
  exercised at minimum through `src/features/ingest/DataIngestView.tsx`'s
  raw-event injection path or an equivalent, so the assertion is about real
  rendering rather than a hand-built fixture object.
- AC-04: the retrieval mode from item 3 is visibly surfaced when degraded.
- AC-05: repo-root gates pass — `npm run lint` (`tsc --noEmit`), `npm test`,
  and `npm run build`. Since this packet is entirely frontend, these are its
  primary correctness gates.
- AC-06: `node scripts/docs/validate-docs.mjs` and
  `node scripts/docs/diff-check.mjs` pass, with the SITE_MAP /
  DOMAIN_DETAILS / registry updates landed in the same change as the code.
- AC-07: any deferred sub-view from Bounded scope item 2 is recorded, with
  its reason, in the execution report and reconciled in SITE_MAP — not left
  as an unexplained gap between the design doc and the shipped app.
- AC-08: independent review and owner approval recorded **before** closure.

## Rollback

Capture pre-change source hashes and inverse patches before any mutation.
This packet's changes are confined to `src/**` plus two design docs and the
registry, and it adds no schema, no migration, and no protocol change —
rollback is a revert of its commit(s) and re-running
`npm run baseline:check`. Because `DomainId` gains a member, verify after
rollback that no leftover reference to `"E"` or its `ViewId`s remains in
`src/mission/navigation.ts` or `src/app/RenderView.tsx`, or `tsc --noEmit`
will fail on a dangling union member.

## Owner accepted-risk record

Not applicable at proposal time. This packet is not authorized for execution
(`execution_authorized: false`). Per the process correction established by
WP-14, authorization must be recorded in this document's frontmatter
**before** implementation is dispatched — an executing session must not set
its own authorization flags.

## Execution closure

Not yet executed.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-05 | Boss (CEO) / Claude (final-gate session) | Proposed WP-18 as Phase 5 Stage B, created by the owner-directed split of the original combined Phase 5 packet. Scoped to Mission Control Domain E presentation only: domain/view registration, view components under `src/features/memory/`, degraded-retrieval-mode visibility, styling, and reconciliation of `docs/design/SITE_MAP.md` / `DOMAIN_DETAILS.md` from planned to delivered. Consumes the `MissionSnapshot` memory slice WP-17 (Stage A) delivers; adds no data path, tool, or protocol type. Records the frontend conventions, the `RenderView.tsx` fallback trap, the no-mock-data house rule, and the repo's no-component-test precedent so a session with no prior context can execute it. Execution remains unauthorized at proposal time. |
