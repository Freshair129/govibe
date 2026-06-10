# GoVibe — GEMINI.md

Welcome to the **GoVibe** workspace. This file provides instructional context for AI agents (like Gemini) to understand the project structure, goals, and development workflows.

## 🚀 Project Overview

**GoVibe** is an "AI-Native Visual Vibe Code Platform" designed with the philosophy of "No coding No problem" (🇹🇭 "Visual Vibe Code Platform ของไทย"). It aims to provide a high-fidelity, interactive environment for AI-assisted development and system orchestration.

### Key Technologies (Target Stack)
- **Architecture**: Monorepo (Turborepo + npm Workspaces).
- **Frontend**: Vite + React (TypeScript) + Tailwind CSS + Lucide Icons.
- **Backend (Desktop)**: Tauri v2 (Rust-based).
- **Database**: GenesisBlockDB (Rust) for code embedding and symbol linking.
- **Native**: Capacitor (for mobile deployment).

### Current State
The project has successfully established its **Monorepo Foundation** (ADR-001) and completed Phase 4 of the migration plan, including UI component migration, GenesisBlockDB IPC integration, and real-time overlays (Terminal/WebSocket).

---

## 📂 Directory Structure

- `apps/`
  - `desktop/`: Tauri v2 + React main application.
  - `mobile/`: Capacitor mobile shell (Future).
- `packages/`
  - `ui/`: Shared Glassmorphism components (migrated from `/components`).
  - `core/`: Platform-agnostic business logic.
  - `genesis-db/`: Rust backend logic and GenesisBlockDB integration.
  - `config/`: Shared configurations (ESLint, TS, Tailwind).
- `docs/`: Centralized documentation (ADRs, Specs, RCAs).
- `standards/`: Project standards and methodology SSOTs.
- `templates/`: Documentation templates and generator scripts.
- `UI Components/`: Reference UI assets for migration.
- `GoVibe-Mission-Control.html`: The master template for UI/Logic reference.

---

## 🛠️ Building and Running

The project uses **Turborepo** for task orchestration.

### Key Commands
- `npm install`: Install dependencies for the entire workspace.
- `npm run dev`: Start all applications in development mode (`turbo dev`).
- `npm run build`: Build all applications and packages (`turbo build`).
- `npm run lint`: Run linting across the workspace (`turbo lint`).
- `npm run format`: Format code using Prettier.

---

## 📐 Development Conventions (Documentation-Driven Development)

This project strictly follows **Documentation-Driven Development (DDD)** as mandated by the `METHODOLOGY-SSOT.md`.

1.  **Doc-First**: Never write or modify code without an approved documentation/spec.
2.  **RCA First**: Never fix a bug without identifying its root cause with evidence.
3.  **Surgical Changes**: Only modify code directly related to the task.
4.  **Verification**: A task is only "Done" when acceptance, success, and exit criteria are met and verified (see `Definition-of-Done.md`).

---

## 🗺️ Migration Roadmap (The Ultraplan)

Refer to **`GoVibe_Implementation_Plan.md`** for the detailed phase-by-step migration tasks, sprint goals, and dependency graphs.
