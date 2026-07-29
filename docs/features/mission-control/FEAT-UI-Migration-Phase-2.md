# FEAT-UI-MIGRATION: Layout & Dashboard Migration Spec

> **Historical migration task — not current source of truth (2026-07-19, design-doc audit).**
> path `packages/ui` / `apps/desktop` / `DashboardView.tsx` ที่อ้างในนี้ไม่ตรงกับแอปปัจจุบัน —
> ใช้ `src/app/`, `src/features/dashboard/`, `src/styles/` ของจริงแทน.

**Status:** `APPROVED`
**Date:** 2026-06-06
**Approved By:** User (Boss)
**Task IDs:** `GV-S201`, `GV-S202`
**Impact to:** `packages/ui`, `apps/desktop`

---

## 1. Goal (เป้าหมาย)
Migrate โครงสร้าง Layout (Header/Sidebar) เข้าสู่ `@govibe/ui` เพื่อให้แชร์ได้ และสร้าง View A1 (Real-time Dashboard) ให้ทำงานได้จริงด้วย React

## 2. Component Design (การออกแบบคอมโพเนนต์)

### 🧩 Shared UI (`packages/ui`)
1.  **`Header`**: รับ `domains` (SITE_MAP), `activeDomain`, และ `onDomainChange`
2.  **`Sidebar`**: รับ `subModules`, `activeSubModule`, `isExpanded`, และ `onToggle`
3.  **`StatCard`**: คอมโพเนนต์แสดงตัวเลขสถิติ พร้อมไอคอนและ Glare effect
4.  **`NeonBadge`**: (Done)

### 📊 Desktop Views (`apps/desktop`)
1.  **`DashboardView`**:
    *   แสดง Stat grid 4 ช่อง (Cost, Calls, Tools, Forecast)
    *   Integrated **`EfficiencyChart`** (ใช้ Chart.js)
    *   แสดง Reactor Telemetry list (Tokens, Time, Thermal)

## 3. Implementation Plan (ขั้นตอน)

1.  **Extract Header/Sidebar**: ย้าย logic จาก `App.tsx` ไปไว้ใน `@govibe/ui`
2.  **Build StatCard**: สร้างคอมโพเนนต์การ์ดสถิติแบบ Glassmorphism
3.  **Implement DashboardView**:
    *   Create the dashboard view in the active dashboard feature structure; the historical `src/views` location is not part of the current app.
    *   ใช้ `useAppStore` ดึงข้อมูลสถิติ (Mock ไว้ก่อนใน core state)
4.  **Chart.js Integration**: สร้าง hook `useEfficiencyChart` เพื่อจัดการ Canvas lifecycle

## 4. Verification (การตรวจสอบ)
- [ ] Header/Sidebar แสดงผลถูกต้องและตอบสนองต่อ Domain switching
- [ ] DashboardView แสดง Chart.js ได้สมบูรณ์
- [ ] StatCard มี Hover effect (Glare) ตรงตาม Master Template

---
**Please review and approve this UI Spec. Once approved, I will begin implementing these components.**
