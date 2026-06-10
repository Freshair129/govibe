# FEAT-TESTING: Automated Testing Infrastructure & Core Unit Tests

**Status:** `APPROVED`
**Date:** 2026-06-06
**Approved By:** User (Boss)
**Task ID:** `GV-S104` (New Task for Phase 1)
**Impact to:** Workspace-wide, `@govibe/core`, `@govibe/ui`

---

## 1. Goal (เป้าหมาย)
ติดตั้งโครงสร้างพื้นฐานสำหรับการทำ Automated Testing โดยใช้ **Vitest** เพื่อให้เป็นไปตามเกณฑ์ Definition of Done (DoD) และเริ่มเขียน Unit Tests สำหรับ Core Logic และ Shared UI Components

## 2. Technical Stack (เครื่องมือ)
- **Test Runner:** `Vitest` (Blazing fast unit test framework powered by Vite)
- **UI Testing:** `React Testing Library` + `jsdom`
- **Coverage:** `@vitest/coverage-v8`

## 3. Test Coverage Strategy (กลยุทธ์การทดสอบ)

### 🧠 `@govibe/core` (100% Coverage Target)
- **State Store (`state.ts`)**: 
    - ทดสอบการเปลี่ยน Domain (`setDomain`)
    - ทดสอบการเปลี่ยน SubModule (`setSubModule`)
    - ทดสอบการอัปเดต Agent Config (`updateAgentConfig`)
    - ทดสอบความถูกต้องของ Initial State

### 🧩 `@govibe/ui` (Component Unit Tests)
- **`NeonBadge`**: ตรวจสอบการแสดงผลตาม Variant (green, red, etc.) และสถานะ Pulsing
- **`GlassPanel`**: ตรวจสอบการ Render children และ Interactive state

## 4. Implementation Plan (ขั้นตอนการดำเนินการ)

1.  **Infrastructure Setup**:
    *   ติดตั้ง `vitest`, `jsdom`, `@testing-library/react` ที่ Root Workspace
    *   ตั้งค่า `vitest.config.ts`
2.  **Core Tests**:
    *   สร้าง `packages/core/src/state.test.ts`
3.  **UI Tests**:
    *   สร้าง `packages/ui/src/NeonBadge.test.tsx`
4.  **Implementation Plan Update**: เพิ่ม Task ID สำหรับการทดสอบในเฟสอื่นๆ

## 5. Verification (การตรวจสอบ)
- [ ] รัน `npm run test` แล้วผ่านทั้งหมด (Green)
- [ ] มีรายงาน Code Coverage สำหรับ `@govibe/core`
- [ ] ทดสอบ Edge Cases (เช่น ส่ง index ที่ไม่มีอยู่จริงเข้า `setSelectedAgentIdx`)

---
**Please review and approve this Testing Spec. Once approved, I will setup Vitest and write the first batch of unit tests.**
