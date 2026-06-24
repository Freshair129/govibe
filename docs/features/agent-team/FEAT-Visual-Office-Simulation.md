---
doc_id: "FEAT-VISUAL-OFFICE-SIMULATION"
uid: "01KVXGFTXV5F54VXG4X8W7ZJC2"
title: "FEAT-VISUAL-OFFICE: Visual Dev Office Simulation Spec"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:79ea861d347e83be"
updated: "2026-06-24"
owner: "GoVibe"
type: feature
---
# FEAT-VISUAL-OFFICE: Visual Dev Office Simulation Spec

**Status:** `DRAFT` / `PENDING APPROVAL`
**Task ID:** `GV-S205` (New Task for Phase 0/1)
**Impact to:** `@govibe/core`, `apps/desktop`, `packages/ui`

---

## 1. Goal (เป้าหมาย)
จำลองสภาพแวดล้อมการทำงานแบบ **Visual Dev Office** โดยสร้างทีม AI Agent ที่มีหน้าที่ชัดเจน (Architect, FE, BE, DevOps, QA) และแสดงผลในรูปแบบ "Living Office" ที่มีการเคลื่อนไหวและทำงานจริงตาม Roadmap

## 2. Agent Roster (รายชื่อทีมพัฒนา)

| Name | Role | Core Stack | Visual Theme |
| :--- | :--- | :--- | :--- |
| **ARCHON** | Technical Architect | Orchestration, Design | Indigo / Purple |
| **VIBE** | Frontend Wizard | React, Tailwind, UI | Emerald / Cyan |
| **GENESIS** | Backend Gopher | Rust, GenesisDB | Amber / Orange |
| **TURBO** | DevOps Specialist | Monorepo, CI/CD, Tauri | Rose / Red |
| **CHECK** | QA Inspector | Vitest, Verification | Blue / Silver |

## 3. UI Design (การออกแบบ)

### 🏢 View A6: Office Floor
- **Layout**: แผนผังห้องทำงานจำลอง (Isometric หรือ Grid) หรือการ์ดแบบ "Desk View"
- **Status Bubbles**: แสดงสถานะเรียลไทม์ เช่น `Coding...`, `Planning...`, `Reviewing Spec...`
- **Activity Stream**: แถบ Log ด้านข้างที่แสดงว่าใครทำ Task อะไรอยู่ (เชื่อมกับ Roadmap Board)

### ✨ Interactions
- **Pulse Aura**: พื้นหลังการ์ดของ Agent ที่กำลัง "Active" จะมีแสง Neon กระพริบ
- **Live Telemetry**: แสดงค่าความร้อน (Hardware Temp) และ Token usage ของแต่ละคนขณะทำงาน

## 4. Implementation Plan (ขั้นตอน)

1.  **Constants Update**: อัปเดต `AGENTS_DATA` ใน `@govibe/core` ให้มีทีม Dev Office ครบชุด
2.  **State Extension**: เพิ่ม `activeWorkLogs` ใน Zustand เพื่อเก็บประวัติการทำงานจำลอง
3.  **UI Scaffolding**: สร้าง `apps/desktop/src/views/OfficeView.tsx`
4.  **Simulated Loop**: เขียน Hook `useOfficeSimulation` เพื่อสุ่มสถานะการทำงานของ Agent ให้ดูมีชีวิต

## 5. Verification (การตรวจสอบ)
- [ ] รายชื่อ Agent ทั้ง 5 ปรากฏในระบบพร้อมข้อมูลที่ถูกต้อง
- [ ] หน้าจอ Office (A6) แสดงผลการทำงานจำลองได้ต่อเนื่อง
- [ ] สถานะของ Agent เปลี่ยนแปลงตามเวลา (สุ่ม) เพื่อให้ดูเหมือนออฟฟิศจริง

---
**Please review and approve this Office Simulation Spec. Once approved, I will build the Dev Team roster and the Office View.**

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-24 | GoVibe | Brought under document governance (docs:backfill): frontmatter + changelog. |
