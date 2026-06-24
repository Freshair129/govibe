## R6 — Complexity & Context Mandate (v1.0)

**Source:** `GEMINI.md` § Complexity & Context Mandate (R10)

---

ทุกงานต้องระบุระดับความซับซ้อน (C-Scale) และขอบเขตบริบท (H-Scale) ในการตอบกลับครั้งแรก:

- **C-0 (Trivial)**: Text → Code. แก้ไข < 10 บรรทัด, typo, config. [Context: **H0**]
- **C-1 (Direct)**: Text → Code. งานขนาดเล็ก, bug fix, helper function. [Context: **H0-H1**]
- **C-2 (Doc-Driven)**: Text → Spec → Code. ฟีเจอร์ใหม่, multi-file, logic ซับซ้อน. [Context: **H1-H2**]
- **C-3 (Arch-Driven)**: Text → Spec → Diagram → Code. เปลี่ยนโครงสร้าง, cross-system, risk สูง. [Context: **H3-H5**]

> รายละเอียดฉบับเต็มอยู่ใน [[R10-Complexity-Based]]
