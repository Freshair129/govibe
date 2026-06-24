## R20 — Design-First Mandate (v1.0)

**Title:** Design-First Mandate  
**Summary:** ทุกครั้งที่แก้ไข Frontend ต้องตรวจสอบ `docs/design/` (SITE_MAP.md, DESIGN_SYSTEM.md) ก่อนเริ่ม  
**Version:** 1.0  
**Updated:** 2026-06-22  
**Role:** Governance / Mandate  
**wikilink:** [[R20-Design-First-Mandate]]  
**crosslink:** [[R15-Directory-Structure]] · [[R12-DDD-Agent-Conventions]]  
**source:** สกัดจาก `GEMINI.md` § Development Conventions #3

---

### กฎบังคับ

> ทุกครั้งที่ทำการแก้ไข Frontend (UI/UX) **ต้องตรวจสอบความถูกต้องจากเอกสารใน `docs/design/`** ก่อนเริ่มลงมือทำ

---

### เอกสารอ้างอิงหลัก

| เอกสาร | หน้าที่ |
|---|---|
| `docs/design/SITE_MAP.md` | Application hierarchy and domain routing |
| `docs/design/DESIGN_SYSTEM.md` | Visual vibe, colors, and component tokens |

### ขั้นตอน

1. อ่าน `SITE_MAP.md` เพื่อเข้าใจตำแหน่งของ component/page ที่จะแก้
2. อ่าน `DESIGN_SYSTEM.md` เพื่อใช้ token/color/spacing ที่ถูกต้อง
3. แก้ไขโค้ดให้สอดคล้องกับมาตรฐานออกแบบ
4. หากต้องเบี่ยงเบนจาก design system ให้ขออนุมัติก่อน

---

### CHANGELOG

| Version | Date | Summary |
|---|---|---|
| **1.0** | 2026-06-22 | สกัดจาก `GEMINI.md` Convention #3 |
