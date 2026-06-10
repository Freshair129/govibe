# FEAT-MARKDOWN-RENDERER: Business Spec View Spec

**Task ID:** GV-S112
**Status:** APPROVED
**Date:** 2026-06-07
**Approved By:** User (Boss)
**Complexity:** C-2
**Context Tier:** H2
**Author:** VIBE (Agent)

---

## 1. Vision
สร้างระบบอ่านเอกสาร **Business Specifications (View B2)** ภายในแอปพลิเคชัน เพื่อให้ทีมพัฒนาสามารถเข้าถึง Single Source of Truth (SSOT) ได้ทันทีโดยไม่ต้องออกจากโปรแกรม GoVibe

## 2. User Experience (Visual Vibe)
- **Document List**: Sidebar ย่อยแสดงรายการไฟล์ `.md` ในโฟลเดอร์ `docs/`
- **Aesthetic**: ใช้พื้นหลัง **Semi-translucent Black** พร้อม `blur(24px)` ตามมาตรฐาน `DESIGN_SYSTEM.md`
- **Markdown Styling**:
    - Header: ฟอนต์ **Orbitron** สี Neon Green/Indigo
    - Code Blocks: ธีม Dark พร้อม Syntax highlighting
    - Tables: สไตล์ Glassmorphism (โปร่งแสง)

## 3. Acceptance Criteria
- [ ] สามารถดึงรายชื่อไฟล์ `.md` จากโฟลเดอร์ `docs/` ผ่าน Rust Backend ได้
- [ ] เลือกไฟล์แล้วเนื้อหา Markdown ปรากฏในพื้นที่แสดงผลหลัก
- [ ] รองรับการ Render Mermaid diagrams (ถ้าเป็นไปได้ในระยะถัดไป)
- [ ] UI ตอบสนอง (Responsive) และมีเอฟเฟกต์ Fade-in ขณะเปลี่ยนหน้า
- [ ] มีปุ่ม "Open in Editor" เพื่อเปิดไฟล์จริงใน External Editor (เช่น VS Code)

## 4. Technical Architecture
- **Backend (Rust)**: ใช้คำสั่ง `read_document_content(path: String)` เพื่อดึง Text
- **Frontend (React)**: ใช้ไลบรารี `react-markdown` และ `remark-gfm`
- **State**: เก็บ `selectedDocPath` ใน Zustand `@govibe/core`
- **UI**: คอมโพเนนต์ `MarkdownViewer` ใน `apps/desktop`

## 5. Domain Mapping
- Domain: **B (Genesis Knowledge)**
- SubModule: **B2 (Business Specifications)**

## 6. Testing Strategy
- [ ] **Unit Test**: ตรวจสอบการอ่านไฟล์ Markdown ผ่าน Rust command
- [ ] **Component Test**: ตรวจสอบการ Render Content ว่าไม่พังเมื่อเจอไฟล์ขนาดใหญ่
- [ ] **Visual Test**: ตรวจสอบความถูกต้องของสไตล์หัวข้อและตาราง

## 7. Out of Scope
- การแก้ไขไฟล์ Markdown ผ่านแอป (ในเฟสนี้เป็น Read-only)
- การ Export เป็น PDF

## 8. Out-of-Task Dependencies
- **GV-S301** (Backend Gateway) - สำเร็จแล้ว
- **GV-S111** (Project Scanner) - สำเร็จแล้ว
