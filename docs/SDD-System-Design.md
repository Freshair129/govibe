# SDD: GoVibe System Architecture

**Status:** `APPROVED` (via ADR-001)
**Author:** Rwang (Senior Dev)
**Date:** 2026-06-06

## 1. System Overview
The GoVibe platform is built as a highly modular **Monorepo** to support multiple distribution channels (Desktop, Mobile, Web) while sharing the same "brain" (Core Logic) and "jewelry" (UI Components).

## 2. Technology Stack
- **Orchestration**: Turborepo + npm Workspaces.
- **Desktop Shell**: Tauri v2 (Rust).
- **Frontend Framework**: Vite + React 19 (TypeScript).
- **Styling**: Tailwind CSS v4 + Glassmorphism CSS.
- **State Management**: Zustand v5 + Persistence Middleware.
- **Icons**: Lucide React + FontAwesome 6 (CDN).

## 3. Architecture Layers
### 3.1 `@govibe/core` (The Brain)
- **Store**: Zustand-based global state.
- **SSOT**: Centralized types, constants, and data models.
- **Utilities**: Shared logic (Data fetching, Terminal simulation).

### 3.2 `@govibe/ui` (The Jewelry)
- **Components**: Shared Glassmorphism UI elements (Buttons, Cards, Modals).
- **Design System**: Atomic components following the visual vibe.

### 3.3 `@govibe/desktop` (The Body)
- **Tauri**: Rust backend for local system access.
- **React**: Main application shell and domain views.

## 4. Data Flow
1. **User Action**: Triggered in `@govibe/desktop`.
2. **State Change**: Action dispatched to `@govibe/core` store.
3. **UI Sync**: Store notifies all subscribing components across the app.
4. **Persistence**: Store automatically saves state to `localStorage`.

## 5. Security & Safety
- **Tauri Isolation**: Only exposed Rust commands can be called by the frontend.
- **Strict Typing**: TypeScript enforced across all packages.
