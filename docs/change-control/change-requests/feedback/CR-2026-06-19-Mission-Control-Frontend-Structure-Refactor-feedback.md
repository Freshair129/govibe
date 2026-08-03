---
title: "Feedback: CR-2026-06-19 Mission Control Frontend Structure Refactor"
doc_id: "FEEDBACK-CR-2026-06-19-MISSION-CONTROL-FRONTEND-STRUCTURE-REFACTOR"
status: "draft"
version: "0.1.3"
updated: "2026-06-19"
owner: "ARCHON"
source_of_truth: true
related_docs:
  - "docs/change-control/change-requests/CR-2026-06-19-Mission-Control-Frontend-Structure-Refactor.md"
---

# Feedback: CR-2026-06-19 Mission Control Frontend Structure Refactor

## 1. Review Scope

- scope source: `docs/change-control/change-requests/CR-2026-06-19-Mission-Control-Frontend-Structure-Refactor.md`
- requested reviewer: `ARCHON`
- downstream implementation owner: `VIBE`
- ADR author when required: `ARCHON`

## 2. Review Response

### Decision

`APPROVED`

This refactor should stay inside the current live Vite React TypeScript app.

An ADR is **not required** for this change because the approved direction does not alter:

- product scope
- system routing in the PRD
- runtime schema in `src/mission.ts`
- transport behavior
- source-of-truth policy

What is being approved is a bounded frontend module reorganization of the existing live `src/` implementation so `VIBE` can work with narrower context and `RKOI` can review smaller diffs.

### Complexity

`C-3`

### Context Tier

`H4`

### W-Scale

`W3`

### Risk

`MEDIUM`

## 3. Approved Target Structure

Approved target structure for the live app:

```text
src/
  App.tsx
  main.tsx
  mission.ts
  roadmapExport.ts
  app/
    Header.tsx
    Sidebar.tsx
    StatusBar.tsx
    RenderView.tsx
    Terminal.tsx
  shared/
    EmptyState.tsx
    ViewHeader.tsx
  hooks/
    useMissionSnapshot.ts
    useCanvasChart.ts
  features/
    dashboard/
      RealTimeDashboard.tsx
    roadmap/
      RoadmapBoard.tsx
      WorkflowTaskRow.tsx
      RoadmapAgentCard.tsx
      roadmapSelectors.ts
    agents/
      AgentManagement.tsx
      AgentFleetMetadataPanel.tsx
    capabilities/
      CapabilityPlugins.tsx
    config/
      BrainConfig.tsx
    ast/
      AstTreeView.tsx
    specs/
      BusinessSpecificationsView.tsx
    graph/
      GraphView.tsx
      GraphStudioView.tsx
    symbols/
      SymbolExplorerView.tsx
    zoo/
      IntelligenceZoo.tsx
    erd/
      DatabaseErdView.tsx
    vector/
      HnswVectorView.tsx
    benchmark/
      ReactorRunTrigger.tsx
      Heatmap.tsx
      CampaignLogsView.tsx
    ingest/
      DataIngestView.tsx
  styles/
    shell.css
    roadmap.css
    agents.css
    views.css
  styles.css
```

Structure constraints:

- `src/mission.ts` stays centralized as the runtime contract and event gateway surface.
- `src/roadmapExport.ts` may stay at root in this pass to avoid unnecessary import churn. Do not move it unless the roadmap slice is already green.
- `src/styles.css` stays as the single imported stylesheet entry and may become an import aggregator for `src/styles/*.css`.
- No `ref/` path may be imported or used as implementation truth.
- No new package, workspace, monorepo layer, or fake shared library is approved.

## 4. Required ADR Or Plan

`PLAN_ONLY`

ADR is not required.

Reason:

- current repo truth shows one live frontend app under `src/`
- the refactor is internal to `SYSTEM-01::Mission-Control-Experience-System`
- runtime schema and transport remain unchanged
- the architectural question is primarily responsibility partitioning, not system redesign

This feedback file is the approved implementation plan and boundary contract.

## 5. Implementation Sequence

Use bounded slices only. Do not combine multiple slices into one broad move.

### Slice 1 - App shell extraction

Move only shell-level UI out of `src/App.tsx`:

- `Header`
- `Sidebar`
- `Terminal`
- status row
- `RenderView`
- `EmptyState`
- `ViewHeader`
- `useMissionSnapshot`

Verification for Slice 1:

- app loads
- top navigation still switches domains correctly
- sidebar still resets to default module per domain
- terminal still opens, sends, and shows warning when no transport exists

### Slice 2 - Roadmap feature extraction

Move A2-only code out of `src/App.tsx` into `src/features/roadmap/`:

- `RoadmapBoard`
- `WorkflowTaskRow`
- `RoadmapAgentCard`
- roadmap-only selectors/helpers:
  - `formatRoadmapState`
  - `getRoadmapScope`
  - `getRoadmapAssignee`
  - `getRoadmapVerificationBadges`
  - `getRoadmapSourceMeta`
  - `getRoadmapStats`
  - `getPrimaryRoadmapPhase`

Verification for Slice 2:

- approved roadmap gating still blocks non-approved sources
- A2 header wording remains unchanged
- export/reset behavior still works
- derived sprint shell behavior still works
- task detail placeholders still remain honest as `unavailable`

### Slice 3 - Agent feature extraction

Move A5-only code into `src/features/agents/`:

- `AgentManagement`
- `AgentFleetMetadataPanel`

Verification for Slice 3:

- no-agent fallback still works
- live roster still renders from `snapshot.agents`
- `agent.select` still sends
- A5 visual interaction contract remains intact

### Slice 4 - Remaining views by feature boundary

Extract remaining feature views without changing behavior:

- A1 into `dashboard/`
- A3 into `capabilities/`
- A4 into `config/`
- B1 into `ast/`
- B2 into `specs/`
- B3 and B4 into `graph/`
- C1 into `symbols/`
- C2 into `zoo/`
- C3 into `ingest/`
- C4 into `erd/`
- C5 into `vector/`
- D1, D2, D3 into `benchmark/`

Verification for Slice 4:

- all A/B/C/D modules still route correctly
- no blank panel regressions
- no console errors on view switch

### Slice 5 - Style partitioning

Only after the components are already extracted:

- keep `src/styles.css` as entrypoint
- move shell-level rules to `src/styles/shell.css`
- move A2 rules to `src/styles/roadmap.css`
- move A5 rules to `src/styles/agents.css`
- move remaining feature rules to `src/styles/views.css`

Verification for Slice 5:

- no layout regressions on desktop
- no horizontal overflow regressions on mobile
- no loss of A2/A5 parity behaviors

## 6. What Must Stay In src/App.tsx

`src/App.tsx` should remain the thin composition root only.

Keep in `src/App.tsx`:

- app-level theme state
- app-level active domain state
- app-level active view state
- app-level sidebar open/expand state
- composition of `Header`, `Sidebar`, `StatusBar`, `RenderView`, and `Terminal`
- top-level `send` wiring from mission gateway hooks
- top-level JSON ingest adapter passed down to the debugger view
- root accent selection from the active domain

Do not keep in `src/App.tsx` after refactor:

- per-view JSX implementations
- roadmap-specific helper functions
- roadmap task detail rendering
- A5 interaction-heavy UI internals
- chart canvas drawing hook logic
- feature-specific placeholder copy blocks that belong to one module only

Target end-state:

- `src/App.tsx` should be a composition/root-orchestration file, not the primary feature implementation file.

## 7. Blocked Risks

Implementation must stop and escalate if any slice requires:

- changing `src/mission.ts` schema or event types
- changing mission transport behavior
- introducing mock runtime data to keep a moved component rendering
- inventing new shared abstractions that do not already have at least two real consumers
- importing from `ref/`
- combining roadmap refactor with product changes

Additional risk notes:

- A2 is high-sensitivity because approval gating, export behavior, and honest unavailable states are part of the current live contract.
- A5 is high-sensitivity because motion, drag, media sequencing, and mobile behavior are easy to regress during file movement.
- CSS is globally coupled today, so style splitting must happen after component boundaries stabilize, not before.

## 8. Verification Expectations

Minimum verification expectation for every implementation slice:

- `npm run lint`
- `npm run build`
- browser sanity check for every touched view
- console must stay clean on touched flows

Required browser checks by sensitivity:

- Shell changes: domain switching, sidebar behavior, footer text, terminal open/send/close
- A2 changes: roadmap header copy, approved-source gating, export menu, reset board, sprint shell rendering, task detail dropdowns, mobile wrapping
- A5 changes: no-agent fallback, live roster selection, carousel/media behavior, drag/follow-cursor behavior, mobile layout
- Graph/ERD/vector views: no blank render surface after navigation
- D1/D2/D3 changes: command send behavior, heatmap rendering, campaign log rendering

Release-blocking conditions:

- blank critical view
- console/runtime error introduced by the refactor
- changed A2 wording or semantics without approval
- any runtime schema drift
- any behavior that implies fake live data

## 9. Verification Evidence

Verification run completed on `2026-06-19`.

### Static Verification

- `npm run lint` passed after the structure refactor and CSS partitioning
- `npm run build` passed after the structure refactor, CSS partitioning, and favicon fix

### Browser Sanity Evidence

Local preview checked at:

- `http://127.0.0.1:4173/`
- `http://127.0.0.1:4174/`

Verified outcomes:

- root shell loaded without runtime crash
- domain switching still worked across `Project Overview` and `Block DB`
- `A2` rendered the approved roadmap surface with:
  - `GoVibe Development Roadmap`
  - approved-source badge
  - export/reset controls
  - AI assist roster
  - phase and sprint shells
  - task rows and task detail entrypoints
- `A5` rendered the live agent-management surface with:
  - registry-backed roster
  - active stats shell
  - role metadata panel
  - footer and domain state preserved
- `C4` rendered the ERD view shell without blank-screen regression
- `C5` rendered the vector map view shell without blank-screen regression

### Console Outcome

- initial browser sanity pass exposed one non-runtime console error: missing `/favicon.ico`
- fix applied by adding `public/favicon.svg` and linking it from `index.html`
- post-fix browser sanity pass on the root shell completed with `0` console errors and `0` warnings

### Architecture Verification Result

The approved refactor intent is satisfied:

- `src/App.tsx` is now a thin composition root
- feature views are separated into bounded folders under `src/features/`
- runtime schema stayed centralized in `src/mission.ts`
- style entrypoint stayed stable at `src/styles.css` while internal CSS was partitioned
- no `ref/` path was promoted to implementation truth
