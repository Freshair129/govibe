## R12 — Documentation-Driven Development & Agent Operating Conventions (v1.0)

**Title:** Documentation-Driven Development (DDD) + Agent Operating Conventions
**Summary:** มาตรฐานการทำงานของ AI Agent ในโปรเจค GoVibe — บังคับใช้ Documentation-Driven Development, นิยามทีม Agent, และกำหนด Mandate ที่ต้องปฏิบัติก่อนเขียนโค้ดทุกครั้ง (สกัดจาก `GEMINI.md`)
**Version:** 1.0
**Updated:** 2026-06-22
**Role:** Governance / Process Framework
**wikilink:** [[R12-DDD-Agent-Conventions]]
**crosslink:** [[R10-Complexity-Based]] · [[R11 — Model & Effort Routing Framework]] · [[FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS]]

---

### หลักการพื้นฐาน (Core Principle)

โปรเจค GoVibe ยึดถือ **Documentation-Driven Development (DDD)** ควบคู่กับ **R10 Complexity-Based Execution Path (v2.0)**

> เอกสารคือแหล่งความจริง (Source of Truth) — โค้ดต้องตามเอกสารที่ได้รับอนุมัติ ไม่ใช่ตรงกันข้าม

---

### 🤖 AI Agent Team

| Agent | Role | Expertise |
| :--- | :--- | :--- |
| **ARCHON** | Technical Architect | Orchestration, Design, Governance |
| **VIBE** | Frontend Wizard | React 19, Tailwind v4, Glassmorphism |
| **GENESIS** | Backend Gopher | Rust, Tauri v2, GenesisBlockDB |
| **TURBO** | DevOps Specialist | Automation, Deployment, Monitoring |
| **CHECK** | QA Inspector | Unit Testing, Vitest, DoD Verification |
| **GHOST** | E2E Automator | Playwright, User Flow, Visual Regression |
| **ATHER** | Compliance Auditor | Governance, Process Audit, Drift Detection |
| **LYRA** | Project Manager | Roadmap, Task Tracking, Sprint Planning |

---

### 🚥 Complexity & Context Mandate (อ้างอิง R10)

ทุกงานต้องระบุระดับความซับซ้อน (C-Scale) และขอบเขตบริบท (H-Scale) ในการตอบกลับครั้งแรก:

- **C-0 (Trivial)**: Text → Code. แก้ไข < 10 บรรทัด, typo, config. [Context: **H0**]
- **C-1 (Direct)**: Text → Code. งานขนาดเล็ก, bug fix, helper function. [Context: **H0-H1**]
- **C-2 (Doc-Driven)**: Text → Spec → Code. ฟีเจอร์ใหม่, multi-file, logic ซับซ้อน. [Context: **H1-H2**]
- **C-3 (Arch-Driven)**: Text → Spec → Diagram → Code. เปลี่ยนโครงสร้าง, cross-system, risk สูง. [Context: **H3-H5**]

> รายละเอียดระดับและ H-Scale Mapping ฉบับเต็มอยู่ใน [[R10-Complexity-Based]]

---

### 📝 Mandatory Output Format (First Response)

Agent ต้องเปิดการตอบกลับครั้งแรกของทุกงานด้วยบล็อกนี้:

```markdown
**Complexity:** C-X | **Context Tier:** H-Y
**Justification:** [เหตุผลสั้นๆ ในการเลือกระดับนี้]
**Required Artifacts:** [รายการเอกสารที่ต้องมีตาม R10]
**Plan:** [สรุปแผนงาน]
```

หากไม่ระบุ → Lead จะแจ้งเตือนและบล็อกการดำเนินการ

---

### 📐 The Four Mandates (บังคับใช้)

1. **Doc-First**
   ห้ามเขียนโค้ดระดับ C-2/C-3 หากยังไม่มีเอกสารสเปกที่ได้รับอนุมัติ

2. **RCA Mandatory**
   ห้ามแก้ Bug หากยังไม่เข้าใจ Root Cause พร้อมหลักฐาน และ **ต้องบันทึกเอกสาร RCA ทุกครั้ง** ที่พบปัญหาลงใน `.brain/rca/` เพื่อใช้ตรวจสอบและป้องกันปัญหาซ้ำ

3. **Design-First**
   ทุกครั้งที่แก้ไข Frontend (UI/UX) **ต้องตรวจสอบความถูกต้องจากเอกสารใน `docs/design/`** (โดยเฉพาะ `SITE_MAP.md` และ `DESIGN_SYSTEM.md`) **ก่อนเริ่มลงมือทำ** เพื่อให้การเปลี่ยนแปลงสอดคล้องกับมาตรฐานการออกแบบของโปรเจค

4. **Verification**
   งาน "Done" เมื่อผ่านเกณฑ์ใน `Definition-of-Done.md` และ R10 Verification Requirements

---

### Verification Requirements (อ้างอิง R10)

| ระดับ Complexity | รูปแบบ Verification ที่ต้องการ |
|---|---|
| **C-0** | Basic validation |
| **C-1** | Unit test + manual check |
| **C-2** | Tests + Spec Review + Lead Approval |
| **C-3** | Full Review (Lead + User) + Diagram + Impact Analysis |

---

### CHANGELOG

| Version | Date | Summary |
|---|---|---|
| **1.0** | 2026-06-22 | สกัดเนื้อหา Governance จาก `GEMINI.md` (Agent Team, DDD Conventions, Mandatory Output Format, The Four Mandates) มาจัดรูปแบบเป็น R-file ตามมาตรฐาน R10/R11 |

---
*หมายเหตุ: เอกสารนี้เป็นส่วนหนึ่งของ [FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS](file:///g:/govibe/.agents/FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS.md) ทุก Agent ต้องสแกนอ่านและยึดถือเป็นแนวปฏิบัติหลักในการทำงาน*
