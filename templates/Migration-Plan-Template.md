# Migration Plan: [ชื่อโปรเจกต์/การเปลี่ยนแปลง]

**Metadata**
- **Task ID:** [เช่น GV-S403]
- **Date:** [YYYY-MM-DD]
- **Author:** [ชื่อผู้รับผิดชอบ]
- **Risk Level:** [LOW / MEDIUM / HIGH]

---

## 1. Overview (ภาพรวม)
[อธิบายว่าทำไมต้องมีการทำ Migration เช่น การเปลี่ยน Schema ฐานข้อมูล, การย้ายไฟล์โครงสร้างโปรเจกต์ หรือการเปลี่ยน Library หลัก]

## 2. Source & Target (ต้นทางและปลายทาง)
- **Source:** [เช่น SQLite table `users`]
- **Target:** [เช่น GenesisBlockDB `blocks`]
- **Data Volume:** [จำนวนข้อมูลโดยประมาณ]

## 3. Step-by-Step Execution (ขั้นตอนการดำเนินการ)

| Step | Action | Responsibility | Status |
| :--- | :--- | :--- | :--- |
| 1 | Backup ข้อมูลเดิม | [Name] | [ ] |
| 2 | รัน Migration Script | [Name] | [ ] |
| 3 | Verify ข้อมูลปลายทาง | [Name] | [ ] |

## 4. Rollback Plan (แผนการกู้คืน)
[อธิบายขั้นตอนการถอยกลับ หากการ Migration เกิดข้อผิดพลาด]
1. [ขั้นตอนที่ 1]
2. [ขั้นตอนที่ 2]

## 5. Verification (การตรวจสอบ)
- [ ] ข้อมูลครบถ้วน (Count check)
- [ ] โครงสร้างถูกต้อง (Schema check)
- [ ] ความสัมพันธ์ยังอยู่ (Reference integrity check)
