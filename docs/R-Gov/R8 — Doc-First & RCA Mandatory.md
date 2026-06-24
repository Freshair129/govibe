## R8 — Doc-First & RCA Mandatory (v1.0)

**Source:** `GEMINI.md` § Development Conventions #1, #2

---

### 1. Doc-First

ห้ามเขียนโค้ด C-2/C-3 หากไม่มีเอกสารสเปกที่ได้รับอนุมัติ.

### 2. RCA Mandatory

ห้ามแก้ Bug หากยังไม่เข้าใจ Root Cause พร้อมหลักฐาน และ **ต้องบันทึกเอกสาร RCA ทุกครั้ง** ที่พบปัญหาลงใน `.brain/rca/` เพื่อใช้ในการตรวจสอบและป้องกันปัญหาซ้ำ.
