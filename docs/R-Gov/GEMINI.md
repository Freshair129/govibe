# GoVibe — GEMINI.md

Welcome to the **GoVibe** workspace. This file provides instructional context for AI agents (like Gemini) to understand the project structure, goals, and development workflows.

## 🚀 Project Overview

**GoVibe** is an "AI-Native Visual Vibe Code Platform" designed with the philosophy of "No coding No problem" (🇹🇭 "Visual Vibe Code Platform ของไทย"). It aims to provide a high-fidelity, interactive environment for AI-assisted development and system orchestration.

### Key Technologies (Target Stack)
- **Architecture**: Monorepo (Turborepo + npm Workspaces).
- **Frontend**: Vite + React 19 (TypeScript) + Tailwind CSS v4 + Lucide Icons.
- **Backend (Desktop)**: Tauri v2 (Rust-based).
- **Database**: GenesisBlockDB (HNSW-simulated vector storage in Rust).
- **Testing**: Vitest (Unit) + Playwright (E2E).
- **Native**: Capacitor (for mobile deployment).

### Current State
The project has successfully completed **Phase 0 through Phase 4**. We have a fully functional Mission Control with AST visualization, HNSW Vector Space mapping, AI Stress Testing (Reactor Run), and Multi-Agent Collaboration loops. The project is currently in a **✅ COMPLIANT** state according to the ATHER auditor.

---

## 🤖 AI Agent Team

| Agent | Role | Expertise |
| :--- | :--- | :--- |
| **ARCHON** | Technical Architect | Orchestration, Design, Governance |
| **VIBE** | Frontend Wizard | React 19, Tailwind v4, Glassmorphism |
| **GENESIS** | Backend Gopher | Rust, Tauri v2, GenesisBlockDB |
| **TURBO** | DevOps Specialist | Automation, Deployment, Monitoring |
| **CHECK** | QA Inspector | Unit Testing, Vitest, DoD Verification |
| **GHOST** | E2E Automator | Playwright, User Flow, Visual Regression |
| **ATHER** | Compliance Auditor | Governance, Process Audit, Drift Detection |
| **LYRA** | Project Manager | Roadmap, Task Tracking, Sprint Planning |

---

## 📂 Directory Structure

- `apps/`
  - `desktop/`: Tauri v2 + React main application.
  - `mobile/`: Capacitor mobile shell (Future).
- `packages/`
  - `ui/`: Shared Glassmorphism components (migrated from `/components`).
  - `core/`: Platform-agnostic business logic.
  - `genesis-db/`: Rust backend logic and GenesisBlockDB integration.
  - `packages/config/`: Shared configurations (ESLint, TS, Tailwind).
  - `docs/design/`:
    - [`DESIGN_SYSTEM.md`](docs/design/DESIGN_SYSTEM.md): Visual vibe, colors, and component tokens.
    - [`SITE_MAP.md`](docs/design/SITE_MAP.md): Application hierarchy and domain routing.
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

This project strictly follows **Documentation-Driven Development (DDD)** and the **R10 Complexity-Based Execution Path (v2.0)**.

### 🚥 Complexity & Context Mandate (R10)
ทุกงานต้องระบุระดับความซับซ้อน (C-Scale) และขอบเขตบริบท (H-Scale) ในการตอบกลับครั้งแรก:
- **C-0 (Trivial)**: Text → Code. แก้ไข < 10 บรรทัด, typo, config. [Context: **H0**]
- **C-1 (Direct)**: Text → Code. งานขนาดเล็ก, bug fix, helper function. [Context: **H0-H1**]
- **C-2 (Doc-Driven)**: Text → Spec → Code. ฟีเจอร์ใหม่, multi-file, logic ซับซ้อน. [Context: **H1-H2**]
- **C-3 (Arch-Driven)**: Text → Spec → Diagram → Code. เปลี่ยนโครงสร้าง, cross-system, risk สูง. [Context: **H3-H5**]

### 📝 Mandatory Output Format (First Response)
```markdown
**Complexity:** C-X | **Context Tier:** H-Y
**Justification:** [เหตุผลสั้นๆ ในการเลือกระดับนี้]
**Required Artifacts:** [รายการเอกสารที่ต้องมีตาม R10]
**Plan:** [สรุปแผนงาน]
```

1.  **Doc-First**: ห้ามเขียนโค้ด C-2/C-3 หากไม่มีเอกสารสเปกที่ได้รับอนุมัติ.
2.  **RCA Mandatory**: ห้ามแก้ Bug หากยังไม่เข้าใจ Root Cause พร้อมหลักฐาน และ **ต้องบันทึกเอกสาร RCA ทุกครั้ง** ที่พบปัญหาลงใน `.brain/rca/` เพื่อใช้ในการตรวจสอบและป้องกันปัญหาซ้ำ.
3.  **Design-First**: ทุกครั้งที่ทำการแก้ไข Frontend (UI/UX) **ต้องตรวจสอบความถูกต้องจากเอกสารใน `docs/design/` (โดยเฉพาะ `SITE_MAP.md` และ `DESIGN_SYSTEM.md`) ก่อนเริ่มลงมือทำ** เพื่อให้แน่ใจว่าการเปลี่ยนแปลงสอดคล้องกับมาตรฐานการออกแบบของโปรเจค.
4.  **Verification**: งาน "Done" เมื่อผ่านเกณฑ์ใน `Definition-of-Done.md` และ R10 Verification requirements.

---

## 🗺️ Migration Roadmap (The Ultraplan)

Refer to **`GoVibe_Implementation_Plan.md`** for the detailed phase-by-step migration tasks, sprint goals, and dependency graphs.
