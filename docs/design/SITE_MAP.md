# GoVibe Mission Control Site Map

This document tracks the implemented React route structure in `src/App.tsx` and the domain metadata in `src/mission.ts`.

## Domain A: Project Overview

- **A1: Real-time Dashboard**
  - Implemented.
  - Reads `snapshot.metrics`, `snapshot.chart`, and `snapshot.reactor`.
  - Shows empty states when no telemetry has arrived.
- **A2: Roadmap Board**
  - Live-data shell.
  - Expects future roadmap task snapshots through the mission gateway.
- **A3: Capability Plugins**
  - Live-data shell.
  - Expects plugin capability data through the mission gateway.
- **A4: Brain & Config**
  - Live-data shell.
  - Expects model/runtime configuration through the mission gateway.
- **A5: Agent Management**
  - Implemented.
  - Reads `snapshot.agents`.
  - Sends `agent.select` commands through the mission gateway.

## Domain B: Genesis Knowledge

- **B1: AST Hierarchy Tree**
  - Live-data shell.
  - Expects AST records through `snapshot.graph` or future AST event types.
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
  - Live-data shell.
  - Expects capability experiment records through the mission gateway.
- **C3: SRS-G Data Ingest**
  - Implemented.
  - Manual JSON entrypoint for `MissionEvent` payloads.
  - Used to verify real gateway updates without backend availability.
- **C4: Database ERD Schema**
  - Currently routes to vector/data shell behavior.
  - Needs schema-specific event shape before final ERD implementation.
- **C5: HNSW Vector Space Map**
  - Live-data shell.
  - Expects vector map data through `graph.update` or a future vector event.

## Domain D: AI Benchmark

- **D1: Reactor Run Trigger**
  - Implemented as command entry.
  - Header Run button sends `reactor.run`.
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
