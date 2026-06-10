# FEAT-ROADMAP-MIGRATION: Roadmap Board View Spec

**Status:** `APPROVED`
**Date:** 2026-06-06
**Approved By:** User (Boss)
**Task ID:** `GV-S204` (New Task for Phase 2)
**Impact to:** `apps/desktop`, `packages/ui`, `@govibe/core`

---

## 1. Goal (เป้าหมาย)
Migrate หน้า **Roadmap Board (View A2)** มาเป็น React Components โดยรองรับการจัดการสถานะงานแบบ 3-state, การคำนวณ Progress อัตโนมัติ และระบบ Side Panel สำหรับดูรายละเอียดงาน (Task Info)

## 2. Component Design (การออกแบบคอมโพเนนต์)

### 🧩 New Shared UI (`packages/ui`)
1.  **`ProgressBar`**: แถบความคืบหน้าแบบ Gradient พร้อมเปอร์เซ็นต์
2.  **`AccordionPhase`**: ส่วนขยายสำหรับแบ่ง Phase ของงาน (เปิด/ปิดได้)
3.  **`TaskCheckbox`**: ปุ่มกดสลับสถานะงาน (Todo <-> Done) พร้อมไอคอน Check/Circle-dot

### 📋 Desktop View Components (`apps/desktop`)
1.  **`RoadmapView`**: Orchestrator หลักที่คำนวณ Global Progress และแสดงรายการ Phase
2.  **`TaskItem`**: รายการงานแต่ละชิ้น แสดง Code, Text, และ Dependency Badge
3.  **`TaskDetailPanel`**: Slide-over panel ด้านขวา แสดง metadata ของงาน (Complexity, Version, Changelog)

## 3. Implementation Plan (ขั้นตอน)

1.  **Update Core State**: เพิ่ม logic การคำนวณ % completion ใน Zustand selectors
2.  **Build UI Components**:
    *   สร้าง `AccordionPhase` และ `ProgressBar` ใน `@govibe/ui`
3.  **Implement RoadmapView**:
    *   Map ข้อมูลจาก `TASK_DEFINITIONS` และ `SPRINT_DEFINITIONS`
    *   จัดการระบบ Open/Closed state ของแต่ละ Phase
4.  **Task Detail Logic**:
    *   ใช้ State คุมการเปิด/ปิด `TaskDetailPanel` และการส่งข้อมูล Task ที่ถูกเลือก (selectedTask)

## 4. Verification (การตรวจสอบ)
- [ ] กด Checkbox แล้วสถานะงานใน Store เปลี่ยน และ % Progress อัปเดตทันที
- [ ] สลับ Phase (Accordion) เปิด/ปิดได้ลื่นไหล
- [ ] คลิกที่ชื่อ Task แล้วรายละเอียดปรากฏใน Side Panel ถูกต้อง
- [ ] Dependency Badge (Locked/Unlocked) อัปเดตตามสถานะงานที่ระบุ

---
**Please review and approve this Spec. Once approved, I will begin implementing the Roadmap Board.**
