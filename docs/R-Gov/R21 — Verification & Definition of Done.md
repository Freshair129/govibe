## R21 — Verification & Definition of Done (v1.0)

**Title:** Verification & Definition of Done  
**Summary:** งาน "Done" เมื่อผ่านเกณฑ์ DoD + Verification ตามระดับ Complexity  
**Version:** 1.0  
**Updated:** 2026-06-22  
**Role:** Governance / Mandate  
**wikilink:** [[R21-Verification-DoD]]  
**crosslink:** [[R10-Complexity-Based]] · [[R12-DDD-Agent-Conventions]]  
**source:** สกัดจาก `GEMINI.md` § Development Conventions #4

---

### กฎบังคับ

> งาน "Done" ก็ต่อเมื่อผ่านเกณฑ์ใน `Definition-of-Done.md` **และ** R10 Verification Requirements

---

### Verification Requirements ตามระดับ Complexity

| ระดับ | รูปแบบ Verification |
|---|---|
| **C-0** (Trivial) | Basic validation |
| **C-1** (Direct) | Unit test + manual check |
| **C-2** (Doc-Driven) | Tests + Spec Review + Lead Approval |
| **C-3** (Arch-Driven) | Full Review (Lead + User) + Diagram + Impact Analysis |

---

### หลักการ

- ห้ามประกาศ "Done" หากยังไม่ผ่าน verification ตามระดับ
- C-2/C-3 ต้องได้ Lead Approval ก่อนถือว่า Done
- อ้างอิง `Definition-of-Done.md` สำหรับเกณฑ์ละเอียดเพิ่มเติม

---

### CHANGELOG

| Version | Date | Summary |
|---|---|---|
| **1.0** | 2026-06-22 | สกัดจาก `GEMINI.md` Convention #4 |
