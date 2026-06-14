# GoVibe Mission Control Site Map

This document tracks the implemented React route structure in `src/App.tsx` and the domain metadata in `src/mission.ts`.

## Domain A: Project Overview

- **A1: Real-time Dashboard**
  - Implemented.
  - Reads `snapshot.metrics`, `snapshot.chart`, and `snapshot.reactor`.
  - Shows empty states when no telemetry has arrived.
- **A2: Roadmap Board**
  - Implemented as a React roadmap surface.
  - Shows Development Roadmap hierarchy: roadmap source, phase containers, sprint containers, task containers, and task detail dropdowns.
  - Expects roadmap hierarchy snapshots and Task Container records through the mission gateway.
  - Task detail dropdowns show symbol links, Definition of Done, changelog, task metadata, PIC/Executor/Approver/Auditor, token telemetry, and per-task export controls.
- **A3: Capability Plugins**
  - Implemented as a React capability surface.
  - Shows Transport, Runtime, and Workspace capability slots.
  - Expects plugin capability data through the mission gateway.
- **A4: Brain & Config**
  - Implemented as a React configuration surface.
  - Shows Models, Memory, and Safety configuration lanes.
  - Expects model/runtime configuration through the mission gateway.
- **A5: Agent Management**
  - Implemented.
  - Reads `snapshot.agents`.
  - Sends `agent.select` commands through the mission gateway.

## Domain B: Genesis Knowledge

- **B1: AST Hierarchy Tree**
  - Implemented as a React AST tree surface.
  - Reads `snapshot.graph.nodes` while the dedicated AST event shape is pending.
- **B2: Business Specifications**
  - Implemented.
  - Reads `snapshot.specs`.
- **B3: Interactive Graph**
  - Implemented.
  - Reads `snapshot.graph.nodes` and `snapshot.graph.edges`.
- **B4: Live Call Graph**
  - Implemented with the same graph renderer as B3.
  - Reads `snapshot.graph`.

## Domain C: Block DB

- **C1: Symbol Explorer Hub**
  - Implemented.
  - Reads `snapshot.symbols`.
- **C2: Intelligence Zoo**
  - Implemented as a React experiment surface.
  - Shows Candidate, Observed, and Promoted lanes.
  - Expects capability experiment records through the mission gateway.
- **C3: SRS-G Debugger**
  - Implemented.
  - Manual JSON entrypoint for `MissionEvent` payloads.
  - Used to verify real gateway updates without backend availability.
- **C4: Database ERD Schema**
  - Implemented as a React ERD surface.
  - Reads `snapshot.symbols` as the current schema-adjacent data source.
  - Needs schema-specific event shape before final ERD rendering.
- **C5: HNSW Vector Space Map**
  - Implemented as a React vector topology surface.
  - Reads `snapshot.graph.nodes` while the dedicated vector event shape is pending.

## Domain D: AI Benchmark

- **D1: Reactor Run Trigger**
  - Implemented as a dedicated command view.
  - View button and header Run button both send `reactor.run`.
- **D2: Cyber Reactor Heatmap**
  - Implemented.
  - Reads `snapshot.heatmap.cells` and `snapshot.heatmap.coreTemp`.
- **D3: EABS-01 Campaign Logs**
  - Implemented.
  - Reads `snapshot.campaignLogs`.

## Global Overlays

- **Floating Terminal**
  - Sends `terminal.command`.
  - Displays user command and transport warnings from the gateway.
- **Theme Switcher**
  - Local state persisted in `localStorage` under `govibe-theme`.
- **Sidebar**
  - Local expanded/collapsed state.
- **Status Row**
  - Displays gateway connection state and last snapshot update time.

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.2.0 | 2026-06-14 | Clarified that A2 consumes roadmap hierarchy plus Task Container detail records for template-parity dropdowns. |
| 0.1.0 | 2026-06-12 | Added implemented React route map for Mission Control domains, modules, and global overlays. |
