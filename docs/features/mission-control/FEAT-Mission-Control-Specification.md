---
doc_id: "FEAT-MISSION-CONTROL-SPECIFICATION"
uid: "01KVXGFVBPJMF0NB22NKTY0PCA"
title: "Feature Spec: GoVibe Mission Control Center (React Migration)"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:b9d512dc16a930c4"
updated: "2026-06-24"
owner: "GoVibe"
type: feature
---
# Feature Spec: GoVibe Mission Control Center (React Migration)

**Version:** 1.0.0
**Status:** `DRAFT`
**Document Type:** `feature-spec`
**Target Path:** `apps/desktop/src/features/mission-control/`

---

## 🚀 1. Overview
The **Mission Control Center** is the central nervous system of the GoVibe platform. It provides a high-fidelity, interactive dashboard for project management, AI agent orchestration, and system telemetry. This document outlines the requirements for migrating the legacy `GoVibe-Mission-Control-template.html` into a modular, type-safe React application within the Tauri desktop shell.

---

## 🎨 2. Visual Design & UI System (Glassmorphism 2.5)
The interface adheres to the **Glassmorphism 2.5** standard defined in `DESIGN_SYSTEM.md`.

- **Design Tokens**:
  - `Glass-Bg`: `rgba(30, 30, 35, 0.65)` with 20px blur.
  - `Glass-Border`: `rgba(255, 255, 255, 0.08)`.
  - `Neon-Accents`: Emerald (Success), Indigo (Knowledge), Cyber-Orange (Warning).
- **Themes**:
  - **Cyber-Dark (Default)**: Deep obsidian backgrounds with neon highlights.
  - **Vibe-Light**: High-contrast frosted glass with soft shadows.
- **Interactions**:
  - **Raycast 3D Cards**: 3D tilt/flip effect for agent configuration.
  - **Ambient Orbs**: Floating animated background elements for depth.

---

## 🏗️ 3. Functional Architecture (The 4 Domains)

### 3.1 Project Overview (Domain A)
- **Dashboard View (A1)**: Real-time telemetry cards (LLM Cost, Call counts, Execution time).
- **Roadmap Tracker (A2)**: Interactive accordion-based feature checklist.
  - **Phase-based grouping** (Phase 0 to Phase 4).
  - **Drag-and-Drop Assignment**: Assign agents to tasks via card dragging.
  - **Progress Persistence**: State synced via GenesisBlockDB.
- **Agent Management (A5)**: A 3D carousel for managing the agent fleet.
  - **Portrait Sector**: High-res agent visuals with video feeds.
  - **Config Back-face**: Granular control over System Prompts, Temperature, and Knowledge sources.

### 3.2 Genesis Knowledge System (Domain B)
- **AST Explorer (B1)**: Real-time code parsing visualization using Tree-Sitter.
- **Graph Studio (B3)**: Interactive 2D graph space (Cytoscape.js) for mapping symbol relationships.

### 3.3 Block DB (Domain C)
- **GenesisBlockDB Explorer**: Direct interface for viewing vector embeddings and symbol links.
- **Schema Mapping**: ERD-style visualization of the internal data structure.

### 3.4 AI Benchmark (Domain D)
- **Model Comparison**: Side-by-side performance metrics for different LLMs (Gemini, Claude, GPT-4).
- **Hardware Telemetry**: Monitoring GPU temperature, memory usage, and thermal headroom.

---

## 📡 4. Integration & Logic

### 4.1 WebSocket Reactor
- **Real-time Sync**: Bi-directional communication with the Rust backend for telemetry updates.
- **Connection States**: Visual markers for WS health (Disconnected/Active).

### 4.2 Agent Orchestration (The EVA Protocol)
- **Capability Matrix**: Agents are assigned roles based on their model strengths (e.g., Qwen for Coding, EVA for PM).
- **Tool Hooks**: Pre-configured bash and file access permissions per agent.

---

## ✅ 5. Acceptance Criteria
1. [ ] **Theme parity**: Toggle between Dark and Light mode without layout break.
2. [ ] **Component Portability**: All UI elements (cards, charts, sidebars) migrated to `@govibe/ui`.
3. [ ] **Performance**: 60fps animations for 3D flips and carousel transitions.
4. [ ] **Data Integrity**: Roadmap state persists across application restarts.
5. [ ] **Tauri Integration**: All "Test Run" buttons trigger actual Rust commands via IPC.

---

## 📅 6. Migration Roadmap
1. **Sprint 1**: Core Layout & Theme Engine (Sidebar + Header).
2. **Sprint 2**: Domain A - Dashboard & Telemetry Charts.
3. **Sprint 3**: Domain A - Roadmap Accordion & Task Logic.
4. **Sprint 4**: Domain A - Agent 3D Carousel & Configuration.
5. **Sprint 5**: Domain B - Graph Studio Integration.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-24 | GoVibe | Brought under document governance (docs:backfill): frontmatter + changelog. |
