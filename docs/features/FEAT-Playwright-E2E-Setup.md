# FEAT-PLAYWRIGHT-SETUP: E2E Testing Infrastructure

**Task ID:** GV-S105 (New Task for Phase 1)
**Status:** DRAFT
**Complexity:** C-2
**Context Tier:** H1
**Author:** CHECK (QA Agent)

---

## 1. Goal (เป้าหมาย)
ติดตั้งและตั้งค่า **Playwright** เพื่อทำ End-to-End (E2E) Testing สำหรับ GoVibe โดยเน้นการตรวจสอบความถูกต้องของ UI Flow และระบบนำทาง (Navigation) ทั่วทั้ง Monorepo

## 2. Technical Stack
- **Framework**: Playwright
- **Target**: `apps/desktop` (Vite Dev Server URL)
- **Reporting**: HTML Report & Trace Viewer

## 3. Implementation Plan (ขั้นตอน)

1.  **Installation**: 
    *   ติดตั้ง `@playwright/test` ที่ Root Workspace
    *   รัน `npx playwright install` เพื่อโหลด Browsers
2.  **Configuration**:
    *   สร้าง `playwright.config.ts`
    *   ตั้งค่าให้ทดสอบที่ `http://localhost:5173` (Vite Port)
3.  **First E2E Tests**:
    *   **Navigation Test**: ตรวจสอบว่าสามารถสลับ Domain A -> B -> C -> D ได้จริง
    *   **Command Palette Test**: กด `Ctrl+K` แล้วพิมพ์ค้นหา "Agent" -> ตรวจสอบว่าหน้าจอเปลี่ยนเป็น View A5
4.  **Integration**: เพิ่มคำสั่ง `npm run test:e2e` ใน `package.json`

## 4. Verification (DoD)
- [ ] สั่งรัน `npx playwright test` แล้วผ่านทั้งหมด
- [ ] มี Trace file บันทึกขั้นตอนการทดสอบสำหรับวิเคราะห์หากเกิด Error

---
**Please review and approve this E2E Spec. Once approved, I will setup Playwright and write the first navigation tests.**
