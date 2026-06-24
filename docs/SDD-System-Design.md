---
doc_id: "SDD-SYSTEM-DESIGN"
uid: "01KVXGFW95C4W4NH90724NTQ8S"
title: "SDD: GoVibe System Architecture"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:4d55b337def41a08"
updated: "2026-06-24"
owner: "Rwang (Senior Dev)"
type: sdd
related_docs:
  - "docs/adr/ADR-001-Monorepo-Architecture.md"
---
# SDD: GoVibe System Architecture

**Status:** `APPROVED` (via ADR-001)
**Author:** Rwang (Senior Dev)
**Date:** 2026-06-06
**Runtime:** GoVibe-native (IPC-based)

## 1. System Overview
The GoVibe platform is built as a highly modular **Monorepo** to support multiple distribution channels (Desktop, Mobile, Web) while sharing the same "brain" (Core Logic) and "jewelry" (UI Components). The platform has shifted to a GoVibe-native IPC-based runtime backed by GenesisBlockDB, replacing earlier Obsidian-based prototyping.

The C4 architecture view for this system is maintained in `docs/architecture/C4-GoVibe-Platform.md`.

## 2. Technology Stack
- **Orchestration**: Turborepo + npm Workspaces.
- **Desktop Shell**: Tauri v2 (Rust).
- **Frontend Framework**: Vite + React 19 (TypeScript).
- **Styling**: Tailwind CSS v4 + Glassmorphism CSS.
- **State Management**: Zustand v5 + Persistence Middleware.
- **Runtime Backend**: GoVibe-native IPC (Rust-managed)
- **Knowledge Backend**: GenesisBlockDB (Atomic/Vector)
- **Icons**: Lucide React + FontAwesome 6 (CDN).

## 3. Architecture Layers
### 3.1 `@govibe/core` (The Brain)
- **Store**: Zustand-based global state.
- **SSOT**: Centralized types, constants, and data models.
- **Utilities**: Shared logic (Data fetching, Terminal simulation).
- **Runtime IPC Client**: Connector for native runtime services.

### 3.2 `@govibe/ui` (The Jewelry)
- **Components**: Shared Glassmorphism UI elements (Buttons, Cards, Modals).
- **Design System**: Atomic components following the visual vibe.

### 3.3 `@govibe/desktop` (The Body)
- **Tauri**: Rust backend for local system access, IPC bridge.
- **React**: Main application shell and domain views.

## 4. Data Flow
1. **User Action**: Triggered in `@govibe/desktop`.
2. **IPC Dispatch**: Action sent via IPC to native runtime.
3. **State Change**: Action dispatched to `@govibe/core` store after runtime confirmation.
4. **UI Sync**: Store notifies all subscribing components across the app.
5. **Persistence**: Store updates GenesisBlockDB.

## 5. Documentation Pipeline Architecture
GoVibe uses human-first SWE documents as the canonical authoring format. Genesis atoms are derived knowledge artifacts for agent retrieval, graph linking, compaction, and Mission Control visualization, now managed directly in GenesisBlockDB.

### 5.1 Canonical Document Types
- **PRD**: Product intent, target users, goals, non-goals, success metrics.
- **SRD**: Functional and non-functional software requirements.
- **SDD**: System structure, architecture boundaries, data flow, integration, security model.
- **LLD**: Component-level logic, data shapes, algorithms, edge cases.
- **API Contract**: Interface, event, MCP, webhook, and file contract details.
- **Runbook**: Human or agent execution procedure.
- **Test Plan**: Verification strategy, acceptance criteria, regression coverage, and evidence.

### 5.2 Docs to Code Flow
1. A human or agent writes a normal SWE document.
2. The document is reviewed and approved as the source of truth.
3. GoVibe extracts structured requirements, tasks, acceptance criteria, policy hints, and artifact links.
4. Mission Control renders roadmap, assignment, progress, and review state from the document-derived model in GenesisBlockDB.
5. Agents implement against the approved document context.
6. Verification evidence links back to document sections and task records.

### 5.3 Diagram to Doc Flow
1. A human or agent supplies a diagram such as C4, sequence, flow, ERD, dependency graph, or site map.
2. GoVibe converts the diagram into draft PRD, SRD, SDD, LLD, API Contract, or Runbook sections.
3. The draft document is reviewed by the responsible human owner.
4. Once approved, the document can enter the Docs to Code flow.

### 5.4 Atom Extraction Boundary
Atoms are internal derived artifacts managed by the IPC runtime, not the required writing format for developers.

| SWE Source | Derived Atom Examples |
|---|---|
| PRD / Vision | `CONCEPT`, `MCP` overview |
| SRD / Feature Spec | `FEAT`, `RUNBOOK`, `PARAMS` |
| SDD | `MOD`, `FLOW`, `STACK`, `GUARD`, `API`, `MCP` |
| LLD | `ALGO`, `PARAMS`, `SAFTY` |
| API Contract | `API`, `PROTOCOL`, `HOOK`, `PARAMS` |
| Data Model | `ENTITY`, `AUDIT` |
| Security Model | `GUARD`, `SAFTY`, `AUDIT` |

If a human-readable SWE document conflicts with a derived atom, the SWE document remains canonical until the owner approves a document update.

## 6. Security & Safety
- **Tauri Isolation**: Only exposed Rust commands can be called by the frontend via IPC.
- **Strict Typing**: TypeScript enforced across all packages.
- **Human Review Gate**: Diagram-derived and atom-derived content must be approved before it becomes canonical.
- **Access Control Split**: RBAC applies to human users; ABAC applies to agents, subagents, MCP clients, services, and scheduled jobs within the GenesisBlockDB governance model.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-24 | Rwang (Senior Dev) | Brought under document governance (docs:backfill): frontmatter + changelog. |
