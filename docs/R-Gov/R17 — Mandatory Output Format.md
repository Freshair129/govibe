## R17 — Mandatory Output Format (v1.0)

**Title:** Mandatory Output Format (First Response)  
**Summary:** Agent ต้องเปิดการตอบกลับครั้งแรกด้วยบล็อก Complexity/Context/Plan — ห้ามข้าม  
**Version:** 1.0  
**Updated:** 2026-06-22  
**Role:** Governance / Process  
**wikilink:** [[R17-Mandatory-Output-Format]]  
**crosslink:** [[R10-Complexity-Based]] · [[R12-DDD-Agent-Conventions]]  
**source:** สกัดจาก `GEMINI.md` § Mandatory Output Format

---

### รูปแบบบังคับ

ทุกงาน — Agent ต้องเปิดการตอบกลับครั้งแรกด้วยบล็อกนี้:

```markdown
**Complexity:** C-X | **Context Tier:** H-Y
**Justification:** [เหตุผลสั้นๆ ในการเลือกระดับนี้]
**Required Artifacts:** [รายการเอกสารที่ต้องมีตาม R10]
**Plan:** [สรุปแผนงาน]
```

---

### กฎบังคับ

- **ห้ามข้าม** — หากไม่ระบุ Lead จะแจ้งเตือนและบล็อกการดำเนินการ
- ระดับ C-Scale และ H-Scale ต้องอ้างอิงจาก [[R10-Complexity-Based]]
- Required Artifacts ต้องสอดคล้องกับระดับ Complexity ที่เลือก

---

### CHANGELOG

| Version | Date | Summary |
|---|---|---|
| **1.0** | 2026-06-22 | สกัดจาก `GEMINI.md` § Mandatory Output Format |
