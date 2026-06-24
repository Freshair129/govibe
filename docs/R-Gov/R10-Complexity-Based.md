## R10 — Complexity-Based Execution Path (v2.0)

**Title:** Complexity-Based Execution Path + H-Scale Mapping  
**Summary:** มาตรฐานการเลือกกระบวนการทำงานขั้นต่ำที่ปลอดภัยและเหมาะสม โดยผูกกับ Context Scaling Tier (H0-H5)  
**Version:** 2.0  
**Updated:** 2026-06-07  
**Role:** Governance / Process Framework  
**wikilink:** [[R10-Complexity-Based]]  
**crosslink:** [[FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS]]

---

### หลักการพื้นฐาน (Core Principle)

**เลือกกระบวนการขั้นต่ำ (Minimum Viable Process) ที่ปลอดภัยและเพียงพอ**  
- Avoid under-engineering  
- **Avoid over-engineering** (ปัญหาหลักของเวอร์ชันเก่า)  
- ทุกงานต้องระบุ **Complexity Level** + **Context Tier (H)** ก่อนเริ่ม

---

### ระดับ Complexity (ปรับปรุงใหม่ — 4 ระดับ)

| ระดับ | ชื่อ | Workflow | ใช้เมื่อ | % โดยประมาณ | Context Hop ที่แนะนำ |
|-------|------|----------|---------|-------------|---------------------|
| **C-0** | **Trivial** | Text → Code | เปลี่ยน < 10 บรรทัด, typo, config, comment, small fix | 30-40% | **H0** |
| **C-1** | **Direct** | Text → Code | Small task, bug fix ชัดเจน, single file, low-risk | 30-35% | **H0 ~ H1** |
| **C-2** | **Doc-Driven** | Text → Doc → Code | New feature ปานกลาง, multi-file, business logic, medium-risk | 20-25% | **H1 ~ H2** |
| **C-3** | **Architecture-Driven** | Text → Doc → Diagram → Code | Architecture change, cross-system, high-risk, platform-level | 5-10% | **H3 ~ H5** |

---

### Mapping กับ H-Scale (Context Tier)

```yaml
complexity_hop_mapping:
  C-0: H0          # Trivial - No extra context
  C-1: H0-H1       # Component level
  C-2: H1-H2       # Feature / Story level
  C-3: H3-H5       # Module → Enterprise (H5 สำหรับ Masterplan เท่านั้น)
```

**กฎ Mapping:**
* **Default:** ใช้ $H = C + 1$ (เช่น C-2 → H2)
* ถ้างาน C-3 แต่กระทบเฉพาะโมดูล → **H3**
* ถ้ากระทบหลาย Cluster หรือ Masterplan → **H4-H5**
* ห้ามใช้ H5 เว้นแต่จำเป็นจริง (ควบคุม Context bloat)

---

### Workflow ตามระดับ

#### **C-0 — Trivial**
* **กระบวนการ:** Text → Code
* **เอกสาร:** ไม่ต้องทำเอกสารสเปก
* **การระบุคำอธิบาย:** Inline comment บนโค้ดเพียงพอ
* **ตัวอย่าง:** แก้ไข typo, เพิ่ม field เล็กน้อยใน UI

#### **C-1 — Direct**
* **กระบวนการ:** Text → Code
* **การตรวจสอบ:** Scope verification + Basic test
* **ตัวอย่าง:** เพิ่มการตรวจค่าตัวแปร (validation), สร้าง helper function ขนาดเล็ก

#### **C-2 — Doc-Driven**
* **กระบวนการ:** Text → Feature Spec / Runbook → Code
* **เงื่อนไข:** ต้องทำการวิเคราะห์ผลกระทบ (Impact Analysis) และได้รับอนุมัติแผนงานจาก Lead (T3)
* **ตัวอย่าง:** สร้าง API endpoint ใหม่, ระบบจ่ายเงิน (Payment flow), ระบบหักสต็อกอัตโนมัติ

#### **C-3 — Architecture-Driven**
* **กระบวนการ:** Text → Spec → Diagram (Sequence, Architecture) → Code
* **เงื่อนไข:** ต้องผ่านการตรวจสอบสถาปัตยกรรม (Architecture Review) + ขออนุมัติจากผู้ใช้งาน (User approval)
* **ตัวอย่าง:** ปรับเปลี่ยนโครงสร้างระบบ GenesisDB, เพิ่มเลเยอร์บีบอัดข้อมูล Compaction ใหม่, สร้างระบบการประสานงาน AI หลายตัว (Multi-Agent coordination)

---

### Enforcement Mechanisms (Mandatory)

#### **1. GEMINI.md Gate (ต้องใส่ต้นไฟล์)**
* Agent ต้องระบุ `Complexity: C-X | Context: H-Y` ในการตอบกลับครั้งแรกของทุกงาน
* หากไม่ระบุ → Lead จะทำการแจ้งเตือนและบล็อกการดำเนินการ

#### **2. Output Format บังคับ (ทุก Task)**
```markdown
**Complexity:** C-X (ระบุเหตุผลสั้นๆ)
**Context Tier:** H-Y
**Justification:** ...
**Required Artifacts:** ...
**Plan:** ...
```

#### **3. Hook Enforcement**
* **TaskCompleted Hook:** จะสแกนตรวจสอบว่าสร้าง Artifacts ครบถ้วนตามระดับความยากงานหรือไม่ (เช่น หากเป็นงาน C-2/C-3 แต่ไม่มีไฟล์ Spec ระบบจะทำการ Block การส่งงาน)

#### **4. Escalation Rule**
* หากความซับซ้อนหรืองานเพิ่มขึ้นระหว่างขั้นตอนการทำ สามารถยกระดับขึ้นได้จาก: `C-0 → C-1 → C-2 → C-3`
* ห้ามลดระดับความซับซ้อนลงหลังจากได้รับการอนุมัติ (Approved) แล้ว เว้นแต่มีเหตุผลอันสมควร

#### **5. Selection Rule**
* เลือกระดับความซับซ้อนที่ต่ำที่สุดที่ยังสามารถรักษาความถูกต้อง ความปลอดภัย และการดูแลรักษาโค้ดระยะยาว (Correctness + Safety + Maintainability) ไว้ได้
* เมื่อไม่แน่ใจให้เลือกปัดไประดับความซับซ้อนที่สูงกว่าไว้ก่อน

---

### Verification Requirements

| ระดับ Complexity | รูปแบบ Verification ที่ต้องการ |
|---|---|
| **C-0** | Basic validation (ตรวจสอบเบื้องต้น) |
| **C-1** | Unit test + manual check (เขียนแบบทดสอบยูนิตและตรวจสอบด้วยตนเอง) |
| **C-2** | Tests + Spec Review + Lead Approval (เขียนแบบทดสอบ + ทบทวนสเปก + Lead อนุมัติ) |
| **C-3** | Full Review (Lead + User) + Diagram + Impact Analysis (ประเมินสถาปัตยกรรมอย่างละเอียด) |

---

### ตัวอย่างการใช้งานจริงใน GKS
* แก้ไขคำผิด (Typo) ในไฟล์ ➔ **C-0 + H0**
* เพิ่มตัวแปร/ฟิลด์ใน `PARAMS::Automatic-Stock-Deduction` ➔ **C-1 + H1**
* เขียน FEFO Logic ชุดใหม่ ➔ **C-2 + H2**
* ปรับโครงสร้างระบบบีบอัดข้อมูล (Hierarchy Compaction) หรือระบบฐานข้อมูล GenesisDB ➔ **C-3 + H4**

---

### CHANGELOG

| Version | Date | Summary |
|---|---|---|
| **2.0** | 2026-06-07 | เพิ่มระดับ C-0, ปรับปรุงระบบ Mapping กับ H-Scale และกำหนดมาตรการบังคับใช้ให้ชัดเจนเพื่อลด Over-engineering |
| **1.0** | ก่อนหน้า | เวอร์ชันเริ่มต้น (แบ่งเป็น 3 ระดับโครงสร้างเก่า) |

---
*หมายเหตุ: เอกสารนี้เป็นส่วนหนึ่งของ [FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS](file:///d:/GoVibe/.agents/FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS.md) ทุก Agent ต้องสแกนอ่านและยึดถือเป็นแนวปฏิบัติหลักในการทำงาน*