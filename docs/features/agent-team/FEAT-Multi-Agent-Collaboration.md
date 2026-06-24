---
doc_id: "FEAT-MULTI-AGENT-COLLABORATION"
uid: "01KVXGFTVP1ZVXA3M8ZF7J0ETQ"
title: "FEAT-MULTI-AGENT-COLLAB: Multi-Agent Collaboration Engine Spec"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:8803e7fb192755a8"
updated: "2026-06-24"
owner: "ARCHON (Architect)"
type: feature
---
# FEAT-MULTI-AGENT-COLLAB: Multi-Agent Collaboration Engine Spec

> Legacy subview-oriented spec. Use `docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md` as the system-level SSOT for workflow semantics.

**Task ID:** GV-S411
**Status:** APPROVED
**Date:** 2026-06-07
**Approved By:** User (Boss)
**Complexity:** C-2
**Context Tier:** H2
**Author:** ARCHON (Architect)

---

## 1. Vision
สร้างระบบ **Collaboration Engine** เพื่อจำลองและแสดงผลการทำงานร่วมกันของ AI Agents ในเชิงภาพ (Visual Collaboration) โดยเน้นไปที่การเชื่อมโยงความสัมพันธ์ระหว่างบทบาทที่ต่างกัน (เช่น ARCHON สั่งงาน VIBE หรือ VIBE ส่งงานให้ CHECK ตรวจสอบ) ภายในหน้าจอ **Visual Dev Office (View A6)**

## 2. User Experience (Visual Vibe)
- **Collaboration Links**: เส้นสายฟ้า (Zap/Lightning) หรือเส้นข้อมูลเรืองแสงที่เชื่อมระหว่างการ์ด Agent ที่กำลังทำงานร่วมกัน
- **Dynamic Workflows**: แสดงสถาปัตยกรรมของงานในรูปแบบ "Chain of Logic":
    - **Step 1**: ARCHON (Planning) -> บับเบิ้ล "Designing Architecture..."
    - **Step 2**: VIBE (Coding) -> บับเบิ้ล "Implementing UI Component..."
    - **Step 3**: CHECK (Reviewing) -> บับเบิ้ล "Verifying DoD..."
- **Collaborative Dashboard**: ส่วนสรุปว่าปัจจุบันมี Agent กี่ตัวกำลังทำงานร่วมกัน (Co-working count)

## 3. Acceptance Criteria
- [ ] ระบบสามารถแสดงผลเส้นเชื่อมโยง (Visual Links) ระหว่าง Agent ในหน้าจอ Office ได้
- [ ] บับเบิ้ลสถานะ (Current Action) อัปเดตตามลำดับ Workflow ที่กำหนด (Chain Logic)
- [ ] เพิ่มสถานะ `Collaborating` ใน Global State เพื่อคุมการสตรีม Log ร่วมกัน
- [ ] เมื่อ Agent ตัวหนึ่งทำงานเสร็จ จะมีเอฟเฟกต์ "Hand-off" ส่งไปยัง Agent ตัวถัดไป
- [ ] ประสิทธิภาพการแสดงผลเส้นเชื่อมโยงต้องไม่ทำให้ UI หน่วง (ใช้ SVG หรือ CSS transitions)

## 4. Technical Architecture
- **State Extension**:
    - `collaborationLinks`: `Array<{ from: string, to: string, type: string }>`
    - `isCollabActive`: boolean
- **Logic**: 
    - สร้าง `useCollaborationLoop` Hook สำหรับจัดการลำดับการทำงานจำลองที่ซับซ้อนขึ้น (มากกว่าแค่การสุ่มแยกกัน)
- **UI**: 
    - อัปเดต `OfficeView.tsx` ให้รองรับการวาดเส้นเชื่อมโยงด้วย SVG overlay

## 5. Domain Mapping
- Domain: **A (Overview)**
- SubModule: **A6 (Visual Dev Office)**

## 6. Testing Strategy
- [ ] **Workflow Test**: ตรวจสอบว่าลำดับงาน (Architect -> Dev -> QA) เกิดขึ้นตาม Chain ที่ตั้งไว้
- [ ] **Visual Test**: ตรวจสอบว่าเส้นเชื่อมโยงเชื่อมต่อจุดกึ่งกลางของการ์ด Agent ได้ถูกต้องแม้จะมีการ Resize
- [ ] **Cleanup Test**: เมื่อจบแคมเปญ เส้นเชื่อมโยงและสถานะพิเศษต้องถูกลบออกทั้งหมด

## 7. Out of Scope
- การคุยกันจริงระหว่าง LLM API หลายตัว (ในเฟสนี้เน้นการจำลองพฤติกรรมผ่านตรรกะใน Frontend/Backend)
- การสร้างห้องประชุม (Meeting Room) 3D

---
**Please review and approve this Collaboration Spec. Once approved, I will build the engine and sync logic.**

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-24 | ARCHON (Architect) | Brought under document governance (docs:backfill): frontmatter + changelog. |
