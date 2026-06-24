---
doc_id: "FEAT-ROADMAP-BOARD-MIGRATION"
uid: "01KVXGFVBSPGY3CDC8T47VV2Z2"
title: "FEAT-ROADMAP-MIGRATION: Roadmap Board View Spec"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:4079f8865582a0bd"
updated: "2026-06-24"
owner: "User (Boss)"
type: feature
---
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

## 5. Document-Driven Roadmap Addendum

The long-term Roadmap Board must not use hardcoded React arrays as canonical project state.

Target workflow:

```text
LYRA / PM writes approved .md or .html roadmap/backlog/sprint docs
  -> GoVibe parses the documents into RoadmapSnapshot
  -> Mission Control A2 renders roadmap, assignment, progress, artifacts, review, and verification state
  -> agents update progress through API/MCP/events
```

Implementation requirements:

- Add typed roadmap shapes in `src/mission.ts`.
- Include `sourcePath`, `sourceType`, `sourceVersion`, `sourceSection`, and `approvalStatus`.
- Support Markdown and HTML source documents produced by LYRA/PM.
- Replace hardcoded rows/progress with `snapshot.roadmap` or an equivalent document-derived model.
- Keep template blueprint rows only as an honest empty-state fallback when no document or roadmap event exists.
- Calculate progress from task status, not a hardcoded percentage.

Verification additions:

- [ ] A2 can render from a sample PM-authored Markdown roadmap document.
- [ ] A2 can render from a sample PM-authored HTML roadmap document or converted HTML payload.
- [ ] Global progress is calculated from parsed task state.
- [ ] Each rendered task links to `sourcePath` and `sourceSection`.
- [ ] No hardcoded `roadmapRows`, `TASK_DEFINITIONS`, or blueprint rows are treated as canonical live project progress.
- [ ] Empty state clearly says no approved roadmap document or roadmap event is connected.

## 6. A2 Roadmap Source Tab Parity Addendum

The A2 roadmap source switcher should use a document-tab metaphor instead of a form dropdown when more than one approved roadmap source is available.

Required behavior:

- Replace the A2 roadmap source `select` with a top-aligned horizontal tab strip.
- Each tab represents one approved roadmap source from `snapshot.roadmapSources`.
- Tabs must only render approved sources as live-selectable roadmap inputs.
- The active tab must reflect the currently selected approved roadmap source.
- Tab labels should prioritize human-readable roadmap titles and may include compact source-type hints.
- Selecting a tab must dispatch the existing `roadmap.select` command with the selected `sourcePath`.
- The header wording, metrics semantics, approved-source gate, export actions, and reset behavior remain unchanged.

Layout contract:

- Keep the roadmap header card as the primary summary surface.
- Add the document-tab strip beneath the header controls as a dedicated source-switch row.
- Preserve the main A2 hierarchy:
  - Roadmap source
  - Phase container
  - Sprint container
  - Task row
  - Template-style task detail dropdown
- Task detail panels must stay template-aligned and use explicit `unavailable` placeholders when runtime task-container fields do not exist.

Out of scope:

- No roadmap parser schema change
- No fake task metadata
- No changes outside A2
- No C4 changes

Verification additions:

- [ ] When multiple approved roadmap sources exist, A2 renders them as document-like tabs.
- [ ] Clicking a tab changes the active roadmap source and visible roadmap detail.
- [ ] Unapproved roadmap sources do not render as live-selectable tabs.
- [ ] Sparse roadmap sources still show honest placeholders instead of invented sprint or task detail.

---
**Please review and approve this Spec. Once approved, I will begin implementing the Roadmap Board.**

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-24 | User (Boss) | Brought under document governance (docs:backfill): frontmatter + changelog. |
