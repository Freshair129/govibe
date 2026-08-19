---
doc_id: "CONCEPT--HYBRID-JIT-CONTEXT"
id: CONCEPT--HYBRID-JIT-CONTEXT
version: "0.1.2+draft"
updated: "2026-08-19"
phase: 1
type: concept
status: stable
owner: "THESEUS"
source_of_truth: true
vault_id: default
tier: process
source_type: axiomatic
title: "The Hybrid Masterpiece: Just-In-Time Context Rendering"
summary: สถาปัตยกรรมระดับ End-Game ของระบบ Agentic AI ที่ผสานเลเยอร์ Storage แบบ Markdown เข้ากับเลเยอร์ Compute แบบ Graph Database เพื่อดึง Context (Retrieval Radius R0-R6) แบบ Just-In-Time
tags:
  - architecture
  - context
  - graph-database
  - agentic-ai
created_at: 2026-06-02T20:13:00.000+07:00
cluster: implementation_flow
role: Strategic intent / PRD
---

# 🌐 CONCEPT--HYBRID-JIT-CONTEXT

**The Hybrid Masterpiece: Just-In-Time Context Rendering**
เอกสารแนวคิดอธิบายการแก้ปัญหา Inode Exhaustion และ Context Hallucination โดยใช้สถาปัตยกรรมแบบสองเลเยอร์ (Dual-Layer Architecture) เพื่อรีดประสิทธิภาพการทำงานของ Agentic AI ออกมาสูงสุด

---

## **1. Problem Statement (ปัญหาดั้งเดิม)**
ในการสร้างระบบฐานความรู้ (Knowledge System) สำหรับ Agent เรามักจะเจอทางแยกที่ต้องเลือก:
*   **แบบที่ 1: แตกไฟล์เป็น 1 ไฟล์ต่อ 1 Atom (Pure File System)**
    *   *ปัญหา:* เกิด Inode Exhaustion (ไฟล์เล็กจิ๋วเต็มฮาร์ดดิสก์) ทำให้ Disk I/O ช้าลง และกิ่งก้าน Git แตกแขนงยิบย่อยเกินไป
*   **แบบที่ 2: ใช้ Graph Database เต็มรูปแบบ (Pure Graph DB)**
    *   *ปัญหา:* มนุษย์ทั่วไปไม่สามารถเปิดอ่าน แก้ไข หรือใช้งานร่วมกับเครื่องมือจัดการเอกสาร (เช่น Obsidian, VSCode) ได้โดยตรง ทำให้ระบบผูกขาดอยู่กับ DB Engine เพียงอย่างเดียว

## **2. Hypothesis / Solution (The Hybrid Masterpiece)**
ระบบ GKS เลือกใช้สถาปัตยกรรมแบบผสมผสาน (Hybrid) โดยแยกชั้นข้อมูลออกเป็น **Storage Layer** และ **Compute Layer** ซึ่งดึงเอาข้อดีของทั้งสองระบบมารวมกัน:

### **Layer 1: Storage Layer (Human SSOT)**
*   **หลักการ:** บีบอัด Atom ย่อยหลายๆ ตัว (Compaction) นำมารวมกันไว้ในไฟล์ Physical Markdown (`.md`) ไฟล์เดียว (เช่น `FRAMEWORK--WORKFLOW-DYNAMICS.md` บรรจุ 15 Atom ไว้ข้างในผ่านกิ่งหัวข้อย่อย)
*   **ข้อดี:** แก้ปัญหา Inode Exhaustion ได้ 100% มนุษย์สามารถใช้ Obsidian หรือ VSCode เปิดอ่าน, แก้ไข และทำ Version Control (Git) ได้ง่ายดาย เป็นมิตรต่อนักพัฒนา (Human-Friendly)

### **Layer 2: Compute Layer (Agent SSOT)**
*   **หลักการ:** เมื่อ Agent ต้องการเริ่มทำงาน (เช่น วางแผนที่ระดับ H2) Agent จะไม่ได้ไปเปิดไฟล์ `.md` มาอ่านเองตรงๆ แต่จะเรียกใช้ระบบเบื้องหลัง (GKS Parser Engine / GenesisGraph)
*   **วิธีการ (Just-In-Time Rendering):** 
    1. ระบบ Parser จะอ่านไฟล์ `.md` แล้วสร้าง **In-Memory Graph** ขึ้นมาชั่วคราว
    2. ค้นหาเนื้อหาแบบจำกัดวงรัศมีตาม Retrieval Radius (R0 - R6)
    3. **Render (สร้าง) เนื้อหาเฉพาะส่วนนั้น** ออกมาเป็น Temp File หรือ Text String ส่งกลับให้ Agent
*   **ข้อดี:** Agent ได้รับ Context ที่ "สั่งตัดมาเฉพาะกิจ (Bespoke)" ไม่มีขยะปน เปลือง Token น้อยสุดๆ และป้องกันอาการหลอน (Context Hallucination) ได้เด็ดขาด

---

### **Operational Workflow Addendum**
*   **Obsidian / GenesisDB Production Flow:** เมื่อ Obsidian Plugin ส่งข้อมูลอะตอมจำนวนมาก ระบบ production ควรใช้ batch operations เช่น `bulk_add_nodes()` และ `bulk_add_edges()` แทนการเขียนทีละโหนด
*   **Virtual Rendering Contract:** ผลลัพธ์จาก JIT renderer ควรถูกส่งกลับเป็น Virtual Document หรือ text snapshot ที่ agent ใช้ทำงานต่อได้ทันที โดยไม่ต้องเปิด raw file tree ทั้งก้อน
*   **Workflow Value:** ส่วนนี้เก็บรายละเอียดเชิงปฏิบัติการจาก prototype workflow ไว้ในระดับ concept เดียวกับ JIT context โดยไม่แตก source ซ้ำเป็นอีก SSOT

## **3. Workflow Execution (ตัวอย่างการทำงาน)**
1. **User:** *"ช่วยเพิ่มเงื่อนไข Tax Deduction ลงในฟีเจอร์คำนวณเงินเดือนหน่อย (Scaling Tier: H2)"*
2. **Agent:** สั่งการ Tool `query_genesis_graph(target="FEAT--TAX-DEDUCT", hops=2)`
3. **GenesisGraph Engine:** วิ่งไปสแกนหัวข้อต่างๆ ในไฟล์ Markdown ที่ถูกบีบอัดไว้ ดึงเฉพาะ Node รอบๆ 2 Hops ออกมา
4. **JIT Renderer:** สร้าง Virtual Document ส่งคืนให้ Agent (Agent จะไม่เห็นไฟล์เต็มๆ แต่เห็นเฉพาะข้อมูลที่จำเป็น)
5. **Agent:** เขียนโค้ดได้อย่างแม่นยำ และส่งคำสั่ง Overwrite ทับเฉพาะส่วนหัวข้อนั้นกลับเข้าไฟล์ `.md` อย่างเนียนตา

## 4. Format-Adaptive Rendering (มิติที่ 2 — ตาม Format ไม่ใช่แค่ Scope)

JIT rendering ข้างต้นตัด context ตาม **scope (retrieval radius R0–R6)** แต่ปัญหา mismatch ข้ามโปรเจกต์ — เช่น repo หนึ่งเขียนแบบ **Feature-Base** อีก repo เขียนแบบ **System-Base** — ต้องการมิติที่สอง: **render ตาม format/paradigm ของ repo ปลายทาง**

หลักการ: GKS atom เป็น canonical กลาง — ก้อนเดียวกัน render ออกได้ทุก format ตามมาตรฐานของ repo ที่ถาม (ผู้ใช้ไม่ต้อง migrate เอกสารเดิม)

กลไก:
1. **Scan doc-format** ของแต่ละ repo → เก็บเป็น **format template** (เป็นส่วนหนึ่งของ "language pack" ตาม `ADR-017`)
2. **Scan codebase** → symbol-link + semantic matching (`API-002-Symbol-Linking`) → ผูกเข้ากับ GKS atom
3. **User ถาม** → รวบ atom ตาม scope → **render เข้า format template ของ repo ผู้ถาม**
4. อีก repo ถาม concept เดียวกัน → render เข้า format ของ repo นั้น (atom ชุดเดิม, output คนละ format)

→ **render = scope (hops) × format (template)**. มิตินี้คือ operational arm ของ `ADR-017` (governance translator) และเป็นตัวแก้ Feature-Base / System-Base mismatch จริง ๆ รายละเอียดกลไก scan→template→render อยู่ใน `FEAT-Doc-Format-Template-Extraction`.

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.1.2+draft | 2026-08-19 | Corrected abolished H-axis hop semantics per ADR-021/AUD-14 (TASK-PRD-022 sweep): summary and §2/§4 "Hop Level (H0-H6)" / "scope (hop H0–H6)" wording replaced with Retrieval Radius R0-R6; Access Scope references (H2) left unchanged. |
| 0.1.1+draft | 2026-06-22 | Added §4 Format-Adaptive Rendering (render = scope × format-template) to capture doc-format-agnostic JIT output; links to ADR-017 language packs and FEAT-Doc-Format-Template-Extraction. |
| 0.1.0 | 2026-06-15 | Added canonical doc_id metadata to align the concept doc with the document versioning governance standard. |



