## R18 — Doc-First Mandate (v1.0)

**Title:** Doc-First Mandate  
**Summary:** ห้ามเขียนโค้ดระดับ C-2/C-3 หากยังไม่มีเอกสารสเปกที่ได้รับอนุมัติ  
**Version:** 1.0  
**Updated:** 2026-06-22  
**Role:** Governance / Mandate  
**wikilink:** [[R18-Doc-First-Mandate]]  
**crosslink:** [[R10-Complexity-Based]] · [[R12-DDD-Agent-Conventions]]  
**source:** สกัดจาก `GEMINI.md` § Development Conventions #1

---

### กฎบังคับ

> **ห้ามเขียนโค้ดระดับ C-2 หรือ C-3 หากยังไม่มีเอกสารสเปกที่ได้รับอนุมัติ**

---

### รายละเอียด

- งาน C-2 (Doc-Driven) ต้องมี Spec document ก่อนเริ่มเขียนโค้ด
- งาน C-3 (Architecture-Driven) ต้องมีทั้ง Spec + Diagram ก่อนเริ่ม
- เอกสารต้อง "ได้รับอนุมัติ" (approved) — draft ไม่นับ
- งาน C-0/C-1 ไม่ต้องมีเอกสาร แต่แนะนำให้บันทึกสั้นๆ

### เหตุผล

เอกสารคือแหล่งความจริง (Source of Truth) — โค้ดต้องตามเอกสารที่ได้รับอนุมัติ ไม่ใช่ตรงกันข้าม

---

### CHANGELOG

| Version | Date | Summary |
|---|---|---|
| **1.0** | 2026-06-22 | สกัดจาก `GEMINI.md` Convention #1 |
