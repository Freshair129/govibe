---
doc_id: "FEAT-CALL-GRAPH-VISUALIZATION"
uid: "01KVXGFTXZTRM2X9E0EC3E4CDC"
title: "FEAT-CALL-GRAPH: Live Call Graph Visualization Spec"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:3c94de2490666ab6"
updated: "2026-06-24"
owner: "VIBE (Agent)"
type: feature
---
# FEAT-CALL-GRAPH: Live Call Graph Visualization Spec

**Task ID:** GV-S120
**Status:** APPROVED
**Date:** 2026-06-07
**Approved By:** User (Boss)
**Complexity:** C-2
**Context Tier:** H2
**Author:** VIBE (Agent)

---

## 1. Vision
สร้างระบบแสดงผล **Live Call Graph (View B4)** เพื่อจำลองความสัมพันธ์และการไหลของข้อมูล (Data Flow) ระหว่างโมดูลต่างๆ ใน GoVibe ช่วยให้ผู้พัฒนาเห็นภาพรวมสถาปัตยกรรมในรูปแบบเชิงภาพ (Visual Architecture)

## 2. User Experience (Visual Vibe)
- **Interactive Graph**: กราฟที่รองรับการลาก (Drag), ย่อ-ขยาย (Zoom), และการแพน (Pan)
- **Aesthetic**:
    - Nodes: ใช้รูปทรง Geometric พร้อมสี Neon ตาม Domain (A: Emerald, B: Indigo, etc.)
    - Edges: เส้นเชื่อมต่อแบบโปร่งแสงที่จะเรืองแสง (Glow) เมื่อเมาส์ Hover
- **Control Overlay**: ปุ่มควบคุมสำหรับ Reset View, Auto-layout, และ Filter ประเภท Node

## 3. Acceptance Criteria
- [ ] ติดตั้งและเรียกใช้งาน **Cytoscape.js** ภายใน React View ได้สำเร็จ
- [ ] สามารถแสดงผลโครงสร้างกราฟเริ่มต้น (Mock Data) ที่สะท้อน Modules จริงของ GoVibe
- [ ] กราฟตอบสนองต่อการ Resize หน้าต่างแอป
- [ ] คลิกที่ Node แล้วแสดงข้อมูลเบื้องต้นของโมดูลนั้นๆ
- [ ] ประสิทธิภาพการ Render ลื่นไหล (ไม่มีการกระตุกขณะลาก Node)

## 4. Technical Architecture
- **Library**: `cytoscape`
- **React Component**: `CallGraph` ใน `apps/desktop/src/components`
- **Data Model**:
    - `elements`: รายการของ Nodes และ Edges ในรูปแบบ JSON ของ Cytoscape
- **Style**: กำหนด Cytoscape stylesheet ให้ตรงกับ `DESIGN_SYSTEM.md`

## 5. Domain Mapping
- Domain: **B (Genesis Knowledge)**
- SubModule: **B4 (Live Call Graph)**

## 6. Testing Strategy
- [ ] **Component Test**: ตรวจสอบว่า Container ของกราฟถูกสร้างขึ้นจริง
- [ ] **Interaction Test**: ตรวจสอบว่าฟังก์ชัน Zoom และ Pan ทำงานได้
- [ ] **Visual Verification**: ตรวจสอบว่าสีของ Nodes ตรงตามค่าสี Neon ใน Design System

## 7. Out of Scope
- การวิเคราะห์โค้ดจริงเพื่อสร้างกราฟแบบ Real-time (จะทำใน GV-S121)
- การบันทึกตำแหน่ง Node ลงฐานข้อมูล

## 8. Out-of-Task Dependencies
- **GV-S201** (Layout) - สำเร็จแล้ว
- **GV-S110** (AST Tree) - สำเร็จแล้ว

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-24 | VIBE (Agent) | Brought under document governance (docs:backfill): frontmatter + changelog. |
