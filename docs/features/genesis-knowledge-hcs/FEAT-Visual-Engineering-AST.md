# FEAT-VISUAL-ENGINEERING: AST Hierarchy Tree Spec

**Status:** `APPROVED`
**Date:** 2026-06-06
**Approved By:** User (Boss)
**Task ID:** `GV-S110`, `GV-S111`
**Impact to:** `apps/desktop`, `src-tauri`, `@govibe/core`

---

## 1. Goal (เป้าหมาย)
สร้างระบบแสดงผลโครงสร้างโปรเจกต์แบบ **AST Hierarchy Tree (View B1)** โดยให้ Backend (Rust) ทำการสแกนไฟล์ใน Monorepo และส่งโครงสร้าง Tree มาให้ Frontend (React) แสดงผลแบบ Recursive

## 2. Technical Design (การออกแบบทางเทคนิค)

### 🦀 Backend (Rust Scanner)
- **New Command**: `scan_project_structure`
- **Logic**: 
    - อ่าน Root directory (`D:/GoVibe`)
    - กรองเอาเฉพาะไฟล์ที่เกี่ยวข้อง (`.ts`, `.tsx`, `.rs`, `.md`)
    - สร้าง Recursive JSON structure: `{ name: string, type: 'file' | 'dir', children?: Node[] }`

### ⚛️ Frontend (React Tree)
- **Component**: `ASTTree`
- **Interaction**:
    - **Expand/Collapse**: คลิกที่โฟลเดอร์เพื่อเปิด-ปิด
    - **Symbol Linking**: คลิกที่ไฟล์เพื่อส่ง `path` ไปยัง Global State เพื่อเตรียมดึงข้อมูล Symbol ในลำดับถัดไป
    - **Visual Style**: Glassmorphism, Neon highlights สำหรับไฟล์ที่กำลังเปิด

## 3. Implementation Plan (ขั้นตอน)

1.  **Rust Command**: เพิ่ม `scan_project_structure` ใน `lib.rs`
2.  **Core Gateway**: เพิ่ม function ใน `useGateway` เพื่อเรียกคำสั่งสแกน
3.  **UI Component**: สร้าง `apps/desktop/src/components/ASTTree.tsx`
4.  **View Integration**: สร้าง `apps/desktop/src/views/KnowledgeTreeView.tsx` (B1)

## 4. Verification (การตรวจสอบ)
- [ ] Tree แสดงโครงสร้างโฟลเดอร์ของ GoVibe ได้ถูกต้อง 1:1
- [ ] กดเปิด-ปิดโฟลเดอร์ได้โดยไม่มี UI Glitch
- [ ] ไฟล์ขนาดใหญ่ (Deep hierarchy) ไม่ทำให้ UI ค้าง (ใช้ `useMemo`)

---
**Please review and approve this Visual Engineering Spec. Once approved, I will implement the AST Scanner and Tree View.**
