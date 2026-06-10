# GoVibe Migration Roadmap — Ultraplan (DDD Execution)

> **Project**: GoVibe :: AI-Native Visual Vibe Code Platform (🇹🇭 "No coding No problem")
> **Source**: `GoVibe-Mission-Control.html`
> **Target Stack**: Monorepo (Tauri v2 + Vite/React-TS + GenesisBlockDB + Capacitor)
> **Methodology**: Documentation-Driven Development (DDD)
> **Version**: 1.1.0
> **Status**: Phase 0 (Foundation) in progress

## ⚙️ Conventions

| Symbol | Meaning |
|--------|---------|
| `🔓 LOCK` | Dependency blocked — ต้องรอ task ที่ระบุเสร็จก่อน |
| `🔀 PARALLEL` | สามารถทำพร้อมกันได้กับ task อื่นในกลุ่มเดียวกัน |
| `⛓️ SERIAL` | ต้องทำลำดับ ไม่สามารถ parallel ได้ |
| `📐 DDD` | ต้องเขียน Doc spec ก่อน → รอ approve → แล้วค่อย code |
| `⚡ HOTFIX` | Bypass doc-first (typo, syntax, linting fix) |

---

## Phase 0 — Foundation Scaffold & Monorepo Setup

> **Goal**: สร้าง project structure, setup Monorepo (Turbo), และย้ายทรัพยากรเดิม
> **Sprint**: S0

### Sprint S0 — Project Bootstrap

| Task ID | Task | Mode | Status | Dependency |
|---------|------|------|--------|------------|
| **GV-S000** | `📐 DDD` Define Monorepo Architecture (ADR-001) | `⛓️ SERIAL` | **DONE** | - |
| **GV-S001** | `⚡ HOTFIX` Scaffold Monorepo (Workspaces, Turbo) | `⛓️ SERIAL` | **DONE** | `GV-S000` |
| **GV-S002** | `📐 DDD` Scaffold Tauri v2 + Vite React-TS in `apps/desktop` | `⛓️ SERIAL` | `TODO` | `GV-S001` |
| **GV-S003** | `📐 DDD` Setup `packages/ui` (Tailwind, Tokens) | `🔀 PARALLEL` | `TODO` | `GV-S001` |
| **GV-S004** | `📐 DDD` Setup `packages/core` (Zustand/State scaffold) | `🔀 PARALLEL` | `TODO` | `GV-S001` |
| **GV-S005** | `📐 DDD` Setup Capacitor in `apps/mobile` | `🔀 PARALLEL` | `TODO` | `GV-S001` |

**DoD - Phase 0**:
- [x] Monorepo structure created.
- [ ] `apps/desktop` runs with `npm run dev`.
- [ ] `packages/ui` components can be imported by apps.

---

## Phase 1 — Core Logic Extraction (Platform-Agnostic)

> **Goal**: แยก Business Logic ออกจาก DOM ไปไว้ใน `packages/core`
> **Sprint**: S1

| Task ID | Task | Mode | Dependency |
|---------|------|------|------------|
| **GV-S101** | `📐 DDD` สร้าง Global State ใน `packages/core/state` | `⛓️ SERIAL` | `GV-S004` |
| **GV-S102** | `📐 DDD` ย้าย Logic คำนวณ Dashboard / Cost จาก HTML | `🔀 PARALLEL` | `GV-S101` |
| **GV-S103** | `📐 DDD` ย้าย Logic Agent Management จาก HTML | `🔀 PARALLEL` | `GV-S101` |

---

## Phase 2 — UI Component Migration

> **Goal**: ย้าย UI จาก HTML เข้าสู่ `packages/ui` (Shared) และ `apps/desktop`
> **Sprint**: S2

| Task ID | Task | Mode | Dependency |
|---------|------|------|------------|
| **GV-S201** | `📐 DDD` Create Layout components (Header, Sidebar) in `packages/ui` | `🔀 PARALLEL` | `GV-S003` |
| **GV-S202** | `📐 DDD` Create Dashboard views in `apps/desktop` | `🔀 PARALLEL` | `GV-S201` |
| **GV-S203** | `📐 DDD` Create Agent Selection & Config views | `🔀 PARALLEL` | `GV-S201` |

---

## Phase 3 — GenesisBlockDB Integration (Rust IPC)

> **Goal**: เชื่อมต่อ Frontend กับ Rust Backend ผ่าน Tauri IPC
> **Sprint**: S3

| Task ID | Task | Mode | Dependency |
|---------|------|------|------------|
| **GV-S301** | `📐 DDD` Implement Symbol Link commands in Rust | `⛓️ SERIAL` | `GV-S002` |
| **GV-S302** | `📐 DDD` Create `useGenesisDb` hook in `packages/core` | `🔓 LOCK` | `GV-S301` |

---

## 📌 สรุปความคืบหน้า
- **Foundation**: Setup Monorepo (Turbo + npm Workspaces) เรียบร้อยแล้ว (Phase 0 DONE)
- **Core State**: Global Zustand Store พร้อม Persistence เรียบร้อยแล้ว (Phase 1 DONE)
- **Desktop Integration**: เชื่อมต่อ React Frontend กับ Rust Backend (Tauri IPC) เรียบร้อยแล้ว (Phase 2 DONE)
- **Next Step**: เริ่ม Phase 3: GenesisBlockDB Integration (Symbol Linking & AST Graph)
