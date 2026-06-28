---
title: "SRS: Genesis Block Cognitive Engine"
doc_id: "SRS-GKS-001"
uid: "01KVXGFW9731K4Z629RYADQX48"
status: "candidate"
version: "1.2.0"
content_hash: "atom:2939afaf5a86894e"
updated: "2026-06-13"
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
1. **Masterplan / Vision** (H5 Context)
2. **Roadmap / Initiative** (H5 Context)
3. **Phase / Theme** (H4 Context)
4. **Epic** (H3 Context)
5. **Story / Feature** (H2 Context)
6. **Task** (H1 Context)
7. **Subtask** (H0 Context)

### 2.2 FR-2: Context Scaling Tiers (H0 - H6)
Agent Runtime ต้องจำกัดวงการค้นหาข้อมูล (Local Graph Mode) ตามระดับที่กำหนด:
- **H0 (Subtask/PR):** 0 Hop (Single File Focus). No Plan required.
- **H1 (Task):** 1 Hop (Self + Imports/Exports). Operation level.
- **H2 (Story/Spec):** 2 Hops (Folder + Sibling Types/API). Plan Approval by User.
- **H3 (Epic):** 3 Hops (Module-wide + Neighbor Module Interface).
- **H4 (Phase/Theme):** 4 Hops (System-wide Architecture Check).
- **H5 (Masterplan/Vision):** 5 Hops (Full GKS traversal for Cross-system impact).
- **H6 (Enterprise Ceiling):** 6 Hops (Full-network traversal). Requires Architectural Approval.

### 2.3 FR-3: Compaction Height (D) Configuration
ระบบต้องรองรับการกำหนดระดับการบีบอัด (D-Height) เพื่อจัดการความลึกของเลเยอร์ในไฟล์เดียว *(เดิมใช้ H1-H5 — เปลี่ยนเป็น D1-D5 ตาม ADR-022 กัน collision กับ Context-Hop H0-H6)*:
- **D5 Height:** 3 Layers (`L2-System` ➔ `L1-Module` ➔ `L0-Function`)
- **D4 Height:** 4 Layers (`L3-System` ➔ `L2-Module` ➔ `L1-Feat` ➔ `L0-Function`)
- **D3 Height:** 5 Layers (Standard: `System` ➔ `Module` ➔ `Feat` ➔ `Comp` ➔ `Method`)
- **D2 Height:** 6 Layers
- **D1 Height:** 8 Layers (Deep Enterprise)

### 2.4 FR-4: Time Management Integration
- ระบบต้องสามารถดึงงานจาก WBS Axis เข้าสู่ **Sprint / Cycle** ถังเวลาได้โดยไม่ทำให้โครงสร้าง WBS เสียหาย

### 2.5 FR-5: Metadata Inheritance (Inheritance Rule)
- **Requirement:** อะตอมระดับปฏิบัติการ (Low-level Atoms) ต้องสามารถสืบทอด Metadata จาก Genesis Block ได้ผ่าน `block_id`
- **Minimal Metadata:** อะตอมใน LLD/Code จะต้องมี Metadata เพียง: `id`, `block_id`, `context_scaling_tier`, `role`, และ `status`
- **Metadata HUB:** Genesis Block จะเป็นที่เดียวที่เก็บ Metadata ครบถ้วน (Masterplan, Roadmap, Epic, etc.) เพื่อลดความซ้ำซ้อนของข้อมูล (DRY Principle)

## 3. Non-Functional Requirements
- **FR-N1 (Acyclic Invariant):** ระบบตรวจสอบต้องป้องกันการเกิด Circular Dependency ระหว่าง Atoms
- **FR-N2 (Human-Readability):** ข้อมูลต้องอยู่ในรูปแบบ Markdown ที่มนุษย์สามารถตรวจสอบได้ด้วยสายตา

## 4. Interface Requirements
- **GKS Parser:** ต้องสามารถสกัด Atoms โดยใช้ Pattern: `^#\s.+\s\[L\d-.+\]\s([A-Z0-9_--]+)`
- **Metadata:** ต้องใช้ YAML Frontmatter หรือ YAML Block ภายในสัญลักษณ์ `---` หรือ Markdown Code Block

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 2026-06-24 | 2026-06-24 | THESEUS | Added governance Changelog section (docs:backfill). |
