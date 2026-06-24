---
doc_id: "FEAT-GENESISBLOCKDB-CORE"
uid: "01KVXGFTY1MK9V4E5V9JK5E8TB"
title: "FEAT-GENESIS-DB: GenesisBlockDB Core & Symbol Search"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:78f687b62409ec31"
updated: "2026-06-24"
owner: "ARCHON (Architect)"
type: feature
---
# FEAT-GENESIS-DB: GenesisBlockDB Core & Symbol Search

**Task ID:** GV-S210, GV-S220
**Status:** APPROVED
**Date:** 2026-06-07
**Approved By:** User (Boss)
**Complexity:** C-3 (Architecture-Driven)
**Context Tier:** H3
**Author:** ARCHON (Architect)

---

## 1. Vision
ติดตั้งสถาปัตยกรรมหลักของ **GenesisBlockDB** ซึ่งเป็นขุมพลังขับเคลื่อนความรู้ (Knowledge Engine) ของ GoVibe โดยในเฟสนี้จะเน้นการจำลองโครงสร้าง Vector Database (HNSW) สำหรับการทำ **Symbol Indexing** และเปิดใช้งาน **View C1 (Symbol Explorer Hub)** เพื่อให้ทีมพัฒนาและ AI Agent สามารถค้นหาและดึงความสัมพันธ์ของโค้ดได้อย่างรวดเร็ว

## 2. Technical Architecture & Data Flow

เพื่อความปลอดภัยและประสิทธิภาพระดับท็อป เราจะวางโครงสร้างให้ Rust เป็นผู้จัดการข้อมูลที่มีน้ำหนักมาก (Vectors, Graph Edges) และส่งมอบข้อมูลที่ย่อยแล้วผ่าน Tauri IPC ไปยัง React Frontend

```mermaid
graph TD
    subgraph Frontend [React - apps/desktop]
        UI[View C1: Symbol Explorer]
        Core[Zustand & useGateway]
    end
    
    subgraph IPC [Tauri Bridge]
        Command[invoke('search_symbols')]
    end
    
    subgraph Backend [Rust - src-tauri]
        TauriCmd[Commands: db_search]
        GKS[GenesisBlockDB Interface]
        Storage[(Mock HNSW / In-Memory Store)]
    end

    UI -->|1. User types query| Core
    Core -->|2. Request search| Command
    Command --> TauriCmd
    TauriCmd -->|3. Query Engine| GKS
    GKS -->|4. Retrieve Nearest Neighbors| Storage
    Storage -->|5. Return Symbols| GKS
    GKS -->|6. JSON Response| TauriCmd
    TauriCmd -->|7. Data| Core
    Core -->|8. Update State| UI
```

## 3. Data Schema (Rust Structs)

**`CodeSymbol`** (ตัวแทนของฟังก์ชัน, คลาส, หรือเอกสาร)
- `id`: String (Unique identifier, e.g., "src/App.tsx:App")
- `name`: String
- `kind`: String ("function", "component", "interface", "doc")
- `path`: String (File path)
- `snippet`: String (Source code snippet)
- `similarity`: f32 (ความแม่นยำในการค้นหา - HNSW distance score)

## 4. User Experience (Visual Vibe - View C1)
- **Search Interface**: แถบพิมพ์ค้นหาแบบ Global กลางหน้าจอขนาดใหญ่ (Raycast style) 
- **Live Results**: ผลลัพธ์อัปเดตแบบ Real-time ขระพิมพ์
- **Symbol Card**: การ์ดแสดงผลลัพธ์แบบ Glassmorphism พร้อมโชว์ Code Snippet สั้นๆ และเปอร์เซ็นต์ความแม่นยำ (Similarity Score)
- **Syntax Highlighting**: โค้ดใน Snippet ต้องอ่านง่ายตามธีม Dark

## 5. Acceptance Criteria
- [ ] สถาปัตยกรรม Rust รองรับโครงสร้าง `CodeSymbol` และสามารถจำลองการค้นหาได้
- [ ] View C1 มีช่อง Search ที่สามารถพิมพ์และเรียกใช้คำสั่ง IPC ไปยัง Backend ได้จริง
- [ ] ผลลัพธ์การค้นหาถูก Render ออกมาเป็นการ์ดข้อมูลที่สวยงามและรองรับ Markdown/Code Snippet
- [ ] ประสิทธิภาพการ Render รวดเร็ว ไม่มีอาการค้างระหว่างพิมพ์ (ใช้ Debounce)

## 6. Testing Strategy
- [ ] **Unit Test (Core)**: ยืนยันว่า Gateway คืนค่า Mock Symbol Data ได้ถูกต้อง
- [ ] **Component Test**: ตรวจสอบการใช้งาน Debounce ในช่องค้นหาของ C1
- [ ] **Architecture Check (ATHER)**: โค้ดไม่ล้นทะลักข้ามขอบเขต และรักษากฎ C-3 ไว้ได้

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-24 | ARCHON (Architect) | Brought under document governance (docs:backfill): frontmatter + changelog. |
