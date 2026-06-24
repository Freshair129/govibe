## R19 — RCA Mandatory (v1.0)

**Title:** RCA Mandatory  
**Summary:** ห้ามแก้ Bug หากยังไม่เข้าใจ Root Cause — ต้องบันทึก RCA ทุกครั้งลงใน `.brain/rca/`  
**Version:** 1.0  
**Updated:** 2026-06-22  
**Role:** Governance / Mandate  
**wikilink:** [[R19-RCA-Mandatory]]  
**crosslink:** [[R10-Complexity-Based]] · [[R12-DDD-Agent-Conventions]]  
**source:** สกัดจาก `GEMINI.md` § Development Conventions #2

---

### กฎบังคับ

> **ห้ามแก้ Bug หากยังไม่เข้าใจ Root Cause พร้อมหลักฐาน**
> **ต้องบันทึกเอกสาร RCA ทุกครั้ง** ที่พบปัญหาลงใน `.brain/rca/`

---

### รายละเอียด

1. **วิเคราะห์ก่อนแก้** — ระบุ Root Cause พร้อมหลักฐาน (log, stack trace, repro steps)
2. **บันทึก RCA** — สร้างเอกสาร RCA ใน `.brain/rca/` ทุกครั้งที่พบและแก้ปัญหา
3. **ป้องกันซ้ำ** — RCA ใช้เป็นฐานข้อมูลอ้างอิงเพื่อป้องกันปัญหาซ้ำในอนาคต

### ห้ามทำ

- ห้าม "แก้ลอง" (trial-and-error fix) โดยไม่เข้าใจสาเหตุ
- ห้ามข้ามการบันทึก RCA แม้จะเป็น bug เล็กน้อย

---

### CHANGELOG

| Version | Date | Summary |
|---|---|---|
| **1.0** | 2026-06-22 | สกัดจาก `GEMINI.md` Convention #2 |
