# ADR-001: GoVibe Monorepo Architecture & Workspace Strategy

**Status:** `APPROVED`
**Date:** 2026-06-06
**Approved By:** User (Boss)
**Impact to:** `Project Structure`, `Build System`, `Developer Workflow`

---

## 1. Context (บริบทและปัญหา)
ปัจจุบัน GoVibe มีโครงสร้างไฟล์แบบกระจายตัวใน Root directory (เช่น `/components`, `/backend`, `/fontend`) ซึ่งจะจัดการได้ยากเมื่อโปรเจกต์ขยายตัวไปสู่ Desktop (Tauri) และ Mobile (Capacitor) พร้อมกัน เราต้องการระบบที่สามารถแชร์โค้ดระหว่าง platform ได้อย่างมีประสิทธิภาพ และจัดการ dependencies ได้จากจุดเดียว

## 2. Decision (การตัดสินใจ)
เราตัดสินใจใช้โครงสร้าง **Monorepo** โดยใช้ **npm Workspaces** เป็นฐาน และใช้ **Turborepo** เป็น Build System/Task Orchestrator

### 🏗️ Proposed Structure
```text
D:/GoVibe/
├── apps/
│   ├── desktop/          # Tauri + React (The main command center)
│   └── mobile/           # Capacitor + React (Future)
├── packages/
│   ├── core/             # Business Logic (Platform-agnostic)
│   ├── ui/               # Shared Glassmorphism Components
│   ├── config/           # Shared Tailwind/ESLint/TS configs
│   └── genesis-db/       # Rust/TS Bindings for GenesisBlockDB
├── docs/                 # Documentation (Specs, ADRs, RCAs)
├── standards/            # Project Standards (SSOTs)
├── package.json          # Root workspace config
└── turbo.json            # Turborepo pipeline config
```

## 3. Alternatives Considered (ทางเลือกอื่น)
*   **Polyrepo**: แยกโปรเจกต์ละ Repo -> *ไม่เลือก* เพราะแชร์โค้ด UI และ Core logic ยากเกินไป
*   **Nx**: ทรงพลังมากแต่มีความซับซ้อนสูง -> *ไม่เลือก* เราต้องการความเรียบง่ายและยืดหยุ่นของ Turborepo ในเฟสแรก

## 4. Consequences (ผลกระทบ)
**Impact to:** `code`, `docs`, `tests`, `ci-cd`

*   **Positive:**
    *   แชร์ UI Components และ Core Logic ระหว่าง Tauri และ Capacitor ได้ 100%
    *   รัน `npm run dev` เพียงครั้งเดียวเพื่อ Start ทุกบริการที่เกี่ยวข้อง
    *   จัดการ Version ของ Dependencies (เช่น React, Tailwind) ให้ตรงกันทั้งโปรเจกต์ได้ง่าย
*   **Negative:**
    *   ต้องมีการย้ายไฟล์ (Migration) จาก Root เข้าสู่โครงสร้างใหม่
    *   ทีมต้องเรียนรู้คำสั่งของ Turborepo

---

## 📅 CHANGELOG
- 2026-06-06: Initial draft for GoVibe architecture.

---

**Please review and approve this ADR. Once approved, I will proceed to Step 1: Scaffolding and File Migration.**
