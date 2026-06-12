# FEAT-HNSW-SPACE: HNSW Vector Space Map Spec

**Task ID:** GV-S210, GV-S211
**Status:** DRAFT
**Complexity:** C-3
**Context Tier:** H3
**Author:** ARCHON (Architect)

---

## 1. Vision
สร้างระบบ **HNSW Vector Space Map (View C5)** เพื่อแสดงผล "ความเข้าใจ" ของ AI ต่อโค้ดเบสในรูปแบบเชิงพื้นที่ (Geometric Understanding) โดยการนำ Code Symbols มาแปลงเป็นจุดพิกัดในอวกาศความรู้ ช่วยให้เห็นการเกาะกลุ่ม (Clustering) ของฟังก์ชันที่เกี่ยวข้องกัน

## 2. Technical Design (The Core)

### 🦀 Backend (Rust Database Engine)
- **Module**: `src-tauri/src/database/mod.rs`
- **Logic**: 
    - จำลองโครงสร้าง **HNSW (Hierarchical Navigable Small World)**
    - ฟังก์ชัน `get_vector_space`: ส่งออกรายการพิกัด (X, Y) ของทุก Symbol ที่ถูก Index แล้ว
    - ฟังก์ชัน `calculate_distance`: คำนวณความห่างระหว่างสองโหนดเพื่อใช้จัดกลุ่ม (Mocked Embedding logic)

### ⚛️ Frontend (Vector Space UI)
- **Component**: `VectorSpaceMap.tsx`
- **Visualization**: 
    - ใช้ **Canvas API** หรือ **SVG** เพื่อ Render จุด (Nodes) จำนวนมาก
    - **Proximity Clustering**: โหนดที่ใกล้กันจะถูกเชื่อมด้วยเส้นบางๆ (Edges)
    - **Interactive Pointer**: เมื่อเอาเมาส์จ่อ (Hover) ที่จุด จะแสดงชื่อ Symbol และ Snippet สั้นๆ

## 3. Acceptance Criteria
- [ ] Rust Backend สามารถส่งข้อมูลพิกัด (X, Y) และ Metadata ของ Symbol ได้อย่างถูกต้อง
- [ ] View C5 แสดงผลแผนผังจุดความรู้ที่กระจายตัวอย่างสวยงามตามธีม Glassmorphism
- [ ] รองรับการ **Zoom & Pan** เพื่อสำรวจอวกาศความรู้ขนาดใหญ่
- [ ] คลิกที่จุดแล้วสามารถ "Jump" ไปยังไฟล์จริงได้ (Integration กับ Domain B)
- [ ] ประสิทธิภาพการ Render ต้องเสถียรแม้จะมีโหนดมากกว่า 500 จุด

## 4. Domain Mapping
- Domain: **C (Block DB)**
- SubModule: **C5 (HNSW Vector Space Map)**

## 5. Implementation Plan (ขั้นตอน)
1.  **Rust Scaffolding**: สร้างโฟลเดอร์ `database/` และ Implement `HNSWStore` จำลอง
2.  **API Contract Update**: เพิ่มคำสั่ง `get_vector_space` ใน Gateway
3.  **UI Component**: สร้าง `VectorSpaceMap` โดยใช้การคำนวณตำแหน่งแบบ Random-Clustered (เพื่อจำลองการจัดกลุ่มจริง)
4.  **View Integration**: สร้าง `apps/desktop/src/views/VectorSpaceView.tsx`

## 6. Out of Scope
- การใช้ Model Embedding จริง (เช่น OpenAI/Cohere) ในเครื่องผู้ใช้ (จะทำในเฟสถัดไป)
- การทำ 3D WebGL Rendering (เน้น 2D Projection ก่อน)

---
**Please review and approve this Architecture Spec. Once approved, I will build the HNSW Core and the Knowledge Map.**
