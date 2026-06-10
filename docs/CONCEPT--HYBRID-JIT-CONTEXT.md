---
id: CONCEPT--HYBRID-JIT-CONTEXT
phase: 1
type: concept
status: stable
vault_id: default
tier: process
source_type: axiomatic
title: "The Hybrid Masterpiece: Just-In-Time Context Rendering"
summary: สถาปัตยกรรมระดับ End-Game ของระบบ Agentic AI ที่ผสานเลเยอร์ Storage แบบ Markdown เข้ากับเลเยอร์ Compute แบบ Graph Database เพื่อดึง Context (H0-H5) แบบ Just-In-Time
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
    2. ค้นหาเนื้อหาแบบจำกัดวงรัศมีตาม Hop Level (H0 - H5)
    3. **Render (สร้าง) เนื้อหาเฉพาะส่วนนั้น** ออกมาเป็น Temp File หรือ Text String ส่งกลับให้ Agent
*   **ข้อดี:** Agent ได้รับ Context ที่ "สั่งตัดมาเฉพาะกิจ (Bespoke)" ไม่มีขยะปน เปลือง Token น้อยสุดๆ และป้องกันอาการหลอน (Context Hallucination) ได้เด็ดขาด

---

## **3. Workflow Execution (ตัวอย่างการทำงาน)**
1. **User:** *"ช่วยเพิ่มเงื่อนไข Tax Deduction ลงในฟีเจอร์คำนวณเงินเดือนหน่อย (Scaling Tier: H2)"*
2. **Agent:** สั่งการ Tool `query_genesis_graph(target="FEAT--TAX-DEDUCT", hops=2)`
3. **GenesisGraph Engine:** วิ่งไปสแกนหัวข้อต่างๆ ในไฟล์ Markdown ที่ถูกบีบอัดไว้ ดึงเฉพาะ Node รอบๆ 2 Hops ออกมา
4. **JIT Renderer:** สร้าง Virtual Document ส่งคืนให้ Agent (Agent จะไม่เห็นไฟล์เต็มๆ แต่เห็นเฉพาะข้อมูลที่จำเป็น)
5. **Agent:** เขียนโค้ดได้อย่างแม่นยำ และส่งคำสั่ง Overwrite ทับเฉพาะส่วนหัวข้อนั้นกลับเข้าไฟล์ `.md` อย่างเนียนตา
