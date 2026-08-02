---
title: "MIG-001: Mission Control React Migration Plan"
doc_id: "MIG-001-MISSION-CONTROL-REACT"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-03"
owner: "LYRA"
source_of_truth: false
---

# MIG-001: Mission Control React Migration Plan

**Status:** `APPROVED`
**Date:** 2026-06-06
**Approved By:** User (Boss)
**Impact to:** `apps/desktop`, `packages/ui`, `packages/core`

---

## 1. Overview (ภาพรวม)
ย้ายระบบ Mission Control จาก Vanilla HTML/JS ใน `public/` เข้าสู่ **Component-Based Architecture** โดยใช้ React + Vite ภายใน `apps/desktop` เพื่อรองรับการขยายตัวในระยะยาวและความสามารถของ Tauri v2

## 2. Architecture Target (โครงสร้างเป้าหมาย)

### ⚛️ Component Breakdown
1.  **`Layout` Components**: `Sidebar`, `Header`, `Footer`, `MainShell`
2.  **`View` Components**: `DashboardView`, `RoadmapView`, `AgentManagementView`, `BenchmarkView`
3.  **`Feature` Components**:
    *   `AgentCard`: 3D Flip Card logic
    *   `TaskItem`: Roadmap task logic
    *   `TelemetryCharts`: Chart.js wrappers
    *   `FloatingTerminal`: Command-line interface component

### 🧠 State Management
ใช้ **Zustand** ใน `packages/core/state` เพื่อจัดการ Global State (Active Domain, Roadmap Progress, Telemetry Data)

### 🎨 Styling
ย้าย `dashboard.css` เข้าสู่ Tailwind CSS Config และใช้ PostCSS ในการจัดการ Glassmorphism tokens

## 3. Step-by-Step Execution (ขั้นตอนการดำเนินการ)

| Step | Action | Responsibility | Mode |
| :--- | :--- | :--- | :--- |
| 1 | Scaffold Vite React-TS ใน `apps/desktop` | Agent | `⛓️ SERIAL` |
| 2 | ย้าย Data จาก `dashboard_data.js` เข้าสู่ `packages/core/constants` | Agent | `📐 DDD` |
| 3 | สร้าง UI Base Components ใน `packages/ui` (GlassPanel, NeonBadge) | Agent | `🔀 PARALLEL` |
| 4 | Implement Header & Sidebar (Domain Switching Logic) | Agent | `🔓 LOCK` (Step 1, 3) |
| 5 | Migrate View A1 (Dashboard) & View A5 (Agents) | Agent | `🔓 LOCK` (Step 4) |
| 6 | Integrate Floating Terminal | Agent | `🔀 PARALLEL` |

## 4. Verification (การตรวจสอบ)
- [ ] `npm run dev` ใน `apps/desktop` รันได้ปกติ
- [ ] UI ตรงตาม `GoVibe-Mission-Control-template.html` 100%
- [ ] เปลี่ยน Domain/View ผ่าน React State ได้สมบูรณ์
- [ ] 3D Effects และ Animations ทำงานผ่าน React Hooks

---
**Please review and approve this Migration Plan. Once approved, I will begin Step 1: Scaffolding.**

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-03 | LYRA | Added governed metadata under delegated Phase 1B authority; previous approval prose is retained as historical content, not current lifecycle approval. |
