---
title: "SRS: Genesis Block Cognitive Engine"
doc_id: "SRS-GKS-001"
status: "candidate"
version: "1.2.1"
updated: "2026-08-19"
owner: "THESEUS"
source_of_truth: true
prd_system: "SYSTEM-08::Genesis Knowledge System"
related_docs:
  - "docs/specs/SPEC-Genesis-Block.md"
  - ".agents/FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS.md"
---

# SRS: Genesis Block Cognitive Engine

## 1. Introduction
เอกสารฉบับนี้ระบุข้อกำหนดฟังก์ชันการทำงานของ Genesis Block ในฐานะระบบจัดการบริบท (Context Management) สำหรับ AI Agents โดยอ้างอิงมาตรฐานการบีบอัดและ Scaling ตาม `FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS` ทำงานภายใน GoVibe-native runtime ผ่าน IPC interface และจัดการข้อมูลผ่าน **GenesisBlockDB**

## 2. Functional Requirements

### 2.1 FR-1: Work Breakdown Structure (WBS) Axis
ระบบต้องรองรับลำดับชั้นของเนื้องาน (WBS) ดังนี้:
1. **Masterplan / Vision** (R5 Context)
2. **Roadmap / Initiative** (R5 Context)
3. **Phase / Theme** (R4 Context)
4. **Epic** (R3 Context)
5. **Story / Feature** (R2 Context)
6. **Task** (R1 Context)
7. **Subtask** (R0 Context)

### 2.2 FR-2: Retrieval Radius (R0 - R6)

**2026-08-19 correction (ADR-021/AUD-14, TASK-PRD-022):** renamed from "Context Scaling Tiers (H0-H6)". This requirement governs graph-traversal reach (Retrieval Radius), independent from executor Access Scope (`H0-H4`) and the Complexity-based approval gates in `STD-Execution-Governance`; the "Plan Approval"/"Architectural Approval" notes below describe those separate governance gates, not the radius itself.

Agent Runtime ต้องจำกัดวงการค้นหาข้อมูล (Local Graph Mode) ตามระดับที่กำหนด:
- **R0 (Subtask/PR):** 0 Hop (Single File Focus). No Plan required.
- **R1 (Task):** 1 Hop (Self + Imports/Exports). Operation level.
- **R2 (Story/Spec):** 2 Hops (Folder + Sibling Types/API). Plan Approval by User.
- **R3 (Epic):** 3 Hops (Module-wide + Neighbor Module Interface).
- **R4 (Phase/Theme):** 4 Hops (System-wide Architecture Check).
- **R5 (Masterplan/Vision):** 5 Hops (Full GKS traversal for Cross-system impact).
- **R6 (Enterprise Ceiling):** 6 Hops (Full-network traversal) — an explicit retrieval-policy decision. Architecture-level work additionally requires Access Scope `H4` owner approval per `ADR-021`.

### 2.3 FR-3: Compaction Depth Configuration

**2026-08-19 correction (ADR-021/AUD-14, TASK-PRD-022):** renamed from "Compaction Height Configuration"; compaction/resolution depth is the `D` axis per `CLAUDE.md`'s canonical governance-axes table, numbered consistently with `SPEC-Genesis-Block.md` §4. Not yet reconciled against the `CH1-CH5` scale in `.agents/FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS.md` — flagged for a follow-up doc-alignment pass.

ระบบต้องรองรับการกำหนดระดับการบีบอัด (Depth) เพื่อจัดการความลึกของเลเยอร์ในไฟล์เดียว:
- **D5 Height:** 3 Layers (`L2-System` ➔ `L1-Module` ➔ `L0-Function`)
- **D4 Height:** 4 Layers (`L3-System` ➔ `L2-Module` ➔ `L1-Feat` ➔ `L0-Function`)
- **D3 Height:** 5 Layers (Standard: `System` ➔ `Module` ➔ `Feat` ➔ `Comp` ➔ `Method`)
- **D2 Height:** 6 Layers
- **D1 Height:** 8 Layers (Deep Enterprise)

### 2.4 FR-4: Time Management Integration
- ระบบต้องสามารถดึงงานจาก WBS Axis เข้าสู่ **Sprint / Cycle** ถังเวลาได้โดยไม่ทำให้โครงสร้าง WBS เสียหาย

### 2.5 FR-5: Metadata Inheritance (Inheritance Rule)
- **Requirement:** อะตอมระดับปฏิบัติการ (Low-level Atoms) ต้องสามารถสืบทอด Metadata จาก Genesis Block ได้ผ่าน `block_id`
- **Minimal Metadata:** อะตอมใน LLD/Code จะต้องมี Metadata เพียง: `id`, `block_id`, `access_scope`, `role`, และ `status`
- **Metadata HUB:** Genesis Block จะเป็นที่เดียวที่เก็บ Metadata ครบถ้วน (Masterplan, Roadmap, Epic, etc.) เพื่อลดความซ้ำซ้อนของข้อมูล (DRY Principle)

## 3. Non-Functional Requirements
- **FR-N1 (Acyclic Invariant):** ระบบตรวจสอบต้องป้องกันการเกิด Circular Dependency ระหว่าง Atoms
- **FR-N2 (Human-Readability):** ข้อมูลต้องอยู่ในรูปแบบ Markdown ที่มนุษย์สามารถตรวจสอบได้ด้วยสายตา

## 4. Interface Requirements
- **GKS Parser:** ต้องสามารถสกัด Atoms โดยใช้ Pattern: `^#\s.+\s\[L\d-.+\]\s([A-Z0-9_--]+)`
- **Metadata:** ต้องใช้ YAML Frontmatter หรือ YAML Block ภายในสัญลักษณ์ `---` หรือ Markdown Code Block
