---
title: "SRD: Genesis Block Requirements Definition"
doc_id: "SRD-GKS-001"
status: "candidate"
version: "1.3.0"
updated: "2026-06-13"
owner: "THESEUS"
source_of_truth: true
prd_system: "SYSTEM-08::Genesis Knowledge System"
---

# SRD: Genesis Block Requirements Definition

## 1. Vision
Genesis Block คือ "จุดกำเนิดทางปัญญา" ของ GoVibe Agents ทำหน้าที่เป็น Manifest ที่รวบรวมบริบท (Context), กฎเกณฑ์ (Governance), และเป้าหมาย (Goals) ไว้ในรูปแบบที่เครื่องจักรประมวลผลได้และมนุษย์อ่านเข้าใจ ใน GoVibe-native runtime ข้อมูลนี้จะถูกเก็บและจัดการผ่าน **GenesisBlockDB** โดยใช้หลักการ **Chain-Driven Atom Compaction** เพื่อประสิทธิภาพสูงสุดในระดับ Enterprise

## 2. Core Principles
- **Axiomatic SSOT:** เป็นความจริงเพียงหนึ่งเดียวที่เชื่อมโยง WBS (Work Breakdown Structure) เข้ากับ Physical Code
- **Small World Network Compliance:** โครงสร้างความสัมพันธ์ของข้อมูลต้องไม่ลึกเกิน 6 Hops (H6 Ceiling) เพื่อป้องกัน "Spaghetti Context"
- **Separation of Concerns (WBS vs Time):** แยกแกนเนื้องาน (Masterplan -> Subtask) ออกจากแกนเวลา (Release -> Sprint) อย่างเด็ดขาด
- **Metadata Optimization (Hub-and-Spoke):** ลดภาระ Metadata ในระดับปฏิบัติการ (Low-level) โดยใช้ Genesis BlockDB เป็น "ศูนย์กลางข้อมูล" (Full-scale Metadata Hub) และใช้อะตอมย่อยอ้างอิงผ่าน `block_id`

## 3. High-Level Requirements
- **R-01: Context Scaling (H0-H6):** ต้องสามารถจำกัดวงการเข้าถึงกราฟข้อมูลของ Agent ได้ตามระดับชั้นของงาน
- **R-02: Atom Compaction (H1-H5 Heights):** รองรับการบีบอัดข้อมูลหลายระดับชั้น (Layers) ลงใน GenesisBlockDB เพื่อประสิทธิภาพสูงสุด
- **R-03: Deterministic Relinking:** ระบบต้องสามารถฉีดพ่น (Inject) ความสัมพันธ์ Backlinks ย้อนกลับสายโซ่ (Chain) ได้อัตโนมัติโดยไม่มี Loop (Acyclic Invariant)
- **R-04: Multi-Agent Synchronization:** รองรับการทำงานร่วมกันของหลาย Agent ผ่านระบบ File Lock และ State Partitioning ในระดับ Atom ภายใน GenesisBlockDB

## 4. Constraint Requirements
- **Format:** ต้องใช้ Markdown และ YAML เท่านั้น เพื่อให้ Git-friendly
- **Small World Limit:** หากงานใดต้องใช้ > 6 Hops ในการทำความเข้าใจ ระบบต้องระบุว่าเป็นสถาปัตยกรรมที่มี High Coupling (Spaghetti Code) และต้องแจ้งเตือนให้ทำ Refactoring

## 5. Success Criteria
- Agent สามารถ Load บริบทที่จำเป็นจาก GenesisBlockDB เสร็จสิ้นภายใน < 500ms
- ทุกการแก้ไขโค้ด (PR) สามารถสืบย้อนกลับไปถึง Atom ในระดับ Task/Story ได้ 100%
- ลดภาระการจัดการไฟล์ขนาดเล็กผ่านระบบ Atom Compaction ของ GenesisBlockDB
