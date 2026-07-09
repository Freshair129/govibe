---
title: FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS
summary: มาตรฐานการบีบอัดไฟล์กายภาพ (Chain-Driven Atom Compaction, CH1-CH5) และรัศมีบริบทบนกราฟของ AI Agent (Retrieval Radius R0-R6, เพดานแบบ derive)
doc_id: GVDOC-1003
created: "2026-06-02T19:40:00+07:00,Boss(CEO)"
updated: "2026-07-10T00:00:00+07:00,Boss(CEO),pending"
version: "1.4.0"
state: active
type: framework
vault_id: default
source_type: axiomatic
tags:
  - architecture
  - compaction
  - scaling
  - graph
  - framework
aliases:
  - "FRAMEWORK--"
  - "FRAMEWORK::"
  - "FRAMEWORK::HIERARCHY-COMPACTION-STANDARDS"
role: Governance / architectural framework
block_manifest:
    genesisblock: [[GENESIS::GoVibe-CoDev-Standard-FRAMEWORK]]
    masterblock: [[MASTER::Multi-Platform-ARCHITECTURE-FRAMEWORK]]
wikilink:  
crosslink:

---

# FRAMEWORK::HIERARCHY-COMPACTION-STANDARDS

**Hierarchy: Chain-Driven Atom Compaction Model & Local Graph Scaling**
เอกสารมาตรฐานการจัดลำดับขอบเขตไฟล์ระดับกายภาพ (On-Disk) และระดับตรรกะ (In-Memory Graph)
ออกแบบมาเพื่อจำกัดขอบเขต Context และแก้ไขปัญหา Disk I/O Bottleneck ในโปรเจกต์ Enterprise Scale

---

## 1. บทนำ (Introduction)
ในการทำระบบ **Doc-Driven Development (DDD)** และ **Diagram-to-Code** ระดับ Enterprise ที่มีขนาดความต้องการสูง ปัญหาคลาสสิกที่พบคือ **Inode Exhaustion, File I/O Bottleneck, และ Git Graph Fragmentation** ที่เกิดจากการมีไฟล์ขนาดเล็ก (1-2 KB) กระจัดกระจายเป็นหมื่นๆ ไฟล์บนฮาร์ดดิสก์

**Chain-Driven Atom Compaction Model** แก้ปัญหานี้โดยใช้หลักการ **"Compound Document"** หรือการยุบรวม Node ที่อยู่ในสายสัมพันธ์การทำงานเดียวกัน (Execution Chain) ให้บันทึกอยู่บน **1 ไฟล์กายภาพเดี่ยว (1 Physical File)** แต่เมื่อเข้าสู่ขั้นตอนการประมวลผลระบบกราฟ (GKS Parser Engine) จะแยกสับออกมาเป็น Node ย่อยๆ ในเมมโมรีตามระดับความลึกที่เลือกใช้งาน

---

## **2. มาตรฐานระดับความลึกการบีบอัดไฟล์ (Compaction Heights: CH5 - CH1)**
การเลือกใช้งานความสูง (Compaction Height: CH) จะเป็นตัวกำหนดว่าใน 1 ไฟล์จะมีการซ้อนทับกันกี่ระดับชั้น โดยแบ่งออกตามความซับซ้อนของแต่ละ System ดังนี้:

> **หมายเหตุ 1.4.0:** เปลี่ยนสัญลักษณ์จาก `H` เป็น `CH` เพื่อเลิก overload ตัวอักษรเดียวให้มีสองความหมายในไฟล์เดียว — `H` สงวนให้ **Access Scope** (สิทธิ์เครื่องมือของ agent, ดู [[STD-Execution-Governance]] v2.3) ส่วนรัศมีบริบทบนกราฟใช้ `R` (§3)

### **📊 สรุปความสัมพันธ์ (Hierarchy Resolution Map)**
* **CH5 (3 Layers)**  ➔ `[L2-System] ➔ [L1-Module] ➔ [L0-Function]`
* **CH4 (4 Layers)**  ➔ `[L3-System] ➔ [L2-Module] ➔ [L1-Feat] ➔ [L0-Function]`
* **CH3 (5 Layers)**  ➔ `[L4-System] ➔ [L3-Module] ➔ [L2-Feat] ➔ [L1-Component] ➔ [L0-Method]`
* **CH2 (6 Layers)**  ➔ `[L5-System] ➔ [L4-Module] ➔ [L3-Sub-Module] ➔ [L2-Feat] ➔ [L1-Component] ➔ [L0-Method]`
* **CH1 (8 Layers)**  ➔ `[L7-System] ➔ [L6-Sub-System] ➔ [L5-Module] ➔ [L4-Sub-Module] ➔ [L3-Feat] ➔ [L2-Component] ➔ [L1-Class] ➔ [L0-Method]`

---

## **3. 🪐 Context Scaling Tiers — Retrieval Radius (R0 - R6)**

Small World Phenomenon เป็น*แรงบันดาลใจ*ของโมเดลนี้ แต่เพดานที่แท้จริงเป็นค่า **derive จากโครงสร้างกราฟของเราเอง**: ลำดับชั้น 4 ระดับ (System → Module → Feat → Function) เดินขึ้น-ลงผ่านยอดใช้ไม่เกิน `2 × (จำนวนชั้น − 1) = 6 hops` (เส้นทางยาวสุด = **7 nodes รวมตัวเอง** — แก้เลขจาก 1.3.0b ที่เขียนว่า 6 nodes); ถ้าความลึกของลำดับชั้นเปลี่ยน เพดานต้อง re-derive ตาม

ศัพท์มาตรฐาน: `Rk` = **k-hop ego graph** ของ anchor node · `R` คือ**รัศมีการดึงบริบท** (retrieval — ระยะไกลขึ้นความเกี่ยวข้องลดลงแบบ distance-decay) **ไม่ใช่สิทธิ์เครื่องมือของ agent** ซึ่งเป็นหน้าที่ของ Access Scope `H0-H4` ใน [[STD-Execution-Governance]] v2.3:

*   **R0 - Subtasks / Pull Requests (0 Hop: Quick Task)** 
    *   **ลักษณะงาน:** งานย่อยเล็กๆ, Hotfix, แก้ไขคำผิด, เขียน Unit Test หรือขั้นตอนสุดท้ายของการยิง Code ลง Branch และส่งสร้าง Pull Request (PR)
    *   **บริบทที่ใช้:** `0 Hop` (มองเห็นแค่ Node ตนเอง) โฟกัสเฉพาะไฟล์เดี่ยวที่ระบุโดยตรงเท่านั้น ทำงานแบบมุ่งเป้าแบบไม่มี Context รอบตัว
    *   **Workflow:** จบได้ทันทีโดยไม่ต้องร่างแผนการ (No Plan Required)
*   **R1 - Tasks (1 Hop: Component Assembly)** 
    *   **ลักษณะงาน:** การเขียนโค้ดและสร้าง Component จริงในระดับปฏิบัติการ (Code Implementation)
    *   **บริบทที่ใช้:** `1 Hop` ดึงข้อมูล Node ตัวเองบวกกับไฟล์นำเข้า/ส่งออก (Imports/Exports) ที่อยู่ติดกัน 1 ระดับชั้นรอบตัว
    *   **Workflow:** Teammate (T2/T1) ใช้ระบบ Self-Claiming ดึงงานและประกาศ File Lock เพื่อลงมือทำ
*   **R2 - Stories / Specs (2 Hops: Feature Assembly)** 
    *   **ลักษณะงาน:** สเปกหรือฟีเจอร์ย่อยที่เน้นมุมมองผู้ใช้ (User Stories / Technical Specs)
    *   **บริบทที่ใช้:** `2 Hops` สแกนครอบคลุมโฟลเดอร์ฟีเจอร์รวมถึงประเภทข้อมูล (Types) และ API บริเวณใกล้เคียงทั้งหมด
    *   **Workflow:** Agent T3 (Lead) เป็นคนวางแผนและจัดการ Plan Approval ร่วมกับ USER
*   **R3 - Epics (3 Hops: Module Integration)** 
    *   **ลักษณะงาน:** ฟีเจอร์ย่อยระดับโมดูลหลัก (เช่น ระบบชำระเงิน, ระบบตะกร้าสินค้า)
    *   **บริบทที่ใช้:** `3 Hops` วิเคราะห์ผลกระทบระดับโมดูลข้างเคียงเพื่อให้สถาปนิกคำนวณการหั่นแบ่งแยกชิ้นส่วนงาน
    *   **Workflow:** มอบหมายให้ Agent T3 (Lead) ในการวิเคราะห์และแจกจ่ายงานย่อย
*   **R4 - Phase / Theme (4 Hops: System Architecture)** 
    *   **ลักษณะงาน:** ทิศทางสถาปัตยกรรมหลัก หรือการสลับโครงสร้างรากฐานขนาดใหญ่ (เช่น การเปลี่ยนระบบ ORM / Database)
    *   **บริบทที่ใช้:** `4 Hops` สแกนตรวจสอบความเกี่ยวโยงของสถาปัตยกรรมระบบ ตั้งแต่ระดับล่างสุดไปจนถึงการเช็คขอบเขต System
*   **R5 - Masterplan / Roadmap (5 Hops: Enterprise Vision)** 
    *   **ลักษณะงาน:** ทิศทางและแผนงานระยะยาวระดับองค์กร (Vision & Roadmap) ที่ส่งผลต่อทุกระบบในบริษัท
    *   **บริบทที่ใช้:** `5 Hops` ครอบคลุมฐานความรู้ทั้งหมด (GKS) เพื่อหาจุดกระทบข้ามระบบ (Cross-System Refactoring)
    *   **Workflow:** ดูแลจัดการโดยมนุษย์ (USER) เป็นผู้ควบคุมหลักในการบริหารความเสี่ยง
*   **R6 - Full Network / Enterprise Ceiling (6 Hops: Full-Network Traversal)** 
    *   **ลักษณะงาน:** การวิเคราะห์ coupling ทั้งระบบ, การกู้คืนเหตุขัดข้องข้ามหลายระบบ, หรือการตรวจผลกระทบระดับ enterprise แบบเต็มเครือข่าย
    *   **บริบทที่ใช้:** `6 Hops` ใช้เป็นเพดานสูงสุดสำหรับการวิเคราะห์แบบ full-network และไม่ควรเป็นค่าใช้งานปกติ
    *   **Workflow:** ต้องมีการอนุมัติระดับสถาปัตยกรรมหรือเจ้าของระบบก่อนใช้งาน

> [!TIP]
> **แก้ทิศจาก 1.3.0b:** coupling ที่หนาแน่น (spaghetti) ทำให้ path บนกราฟ*สั้นลง* ไม่ใช่ยาวขึ้น (ยิ่งมี edge มาก shortest path ยิ่งสั้น) — ตัวจับ spaghetti ที่ถูกต้องคือ **fan-out (W-Scale ใน [[STD-Execution-Governance]] §4)** ส่วนงานที่ต้องใช้รัศมีเกินเพดาน (>6 hops) หมายความว่า**กราฟขาด hub/summary node หรือ task ถูก scope ใหญ่เกินไป** — ทางแก้คือเพิ่ม intermediate node หรือ decompose task ไม่ใช่ข้อสรุปว่าโค้ดพันกัน

### **3.1 โครงสร้างลำดับชั้นการทำงานแบบสากล (Work Hierarchy & Agile Alignment)**
เพื่อให้ระบบ GoVibe เป็นสากลและไม่สับสนกับทฤษฎีการจัดการยุคใหม่ เราจึงแยกโครงสร้างการทำงานและกรอบเวลาออกจากกันอย่างเด็ดขาดตามมาตรฐานอุตสาหกรรม (WBS vs Timebox):

* **แกนที่ 1: แกนเนื้องาน (Work Breakdown Structure - WBS)**
  นี่คือโครงสร้างความลึกของสเกลงานจากใหญ่ไปเล็ก:
  1. **Masterplan / Vision** (ภาพรวมและเป้าหมายสูงสุด)
  2. **Roadmap / Initiative** (แผนนำทางการพัฒนาและทิศทางรวม)
  3. **Phase / Theme** (ช่วงเวลาการปล่อย หรือกลุ่มฟังก์ชันเป้าหมายหลัก)
  4. **Epic** (ฟีเจอร์ใหญ่ที่ต้องใช้เวลาทำนาน เช่น "ระบบลงทะเบียนสมาชิก")
  5. **Story / Feature** (ความต้องการใช้งานในมุมมองผู้ใช้และรายละเอียด Spec)
  6. **Task** (เนื้องานจริงเชิงเทคนิคที่ต้องทำ เช่น "สร้าง API endpoint สำหรับ register")
  7. **Subtask** (หน่วยงานย่อยที่สุดเพื่อเก็บความสะอาด เช่น "เขียน unit test ครอบคลุม error cases")

* **แกนที่ 2: แกนการจัดการเวลา (Time Management)**
  ถังเวลาที่ใช้ในการจำกัดและส่งมอบงานในแกนเนื้องาน:
  1. **Release Plan:** แผนส่งมอบเวอร์ชันใหญ่ของซอฟต์แวร์ (เช่น `v1.0.0`)
  2. **Sprint / Cycle:** รอบช่วงเวลาการทำงานจำกัด (1-2 สัปดาห์) ซึ่งจะใช้วิธี **ดึง (Pull)** งานประเภท **Task** หรือ **Story** จากแกนที่ 1 เข้ามาวางเป็น Backlog ประจำรอบเวลาทำงานนั้นๆ

---

## **4. กฎสถาปัตยกรรมและการแปลงข้อมูล (Parser Engine Protocol)**
เพื่อให้ระบบกราฟ (Genesis Block Graph Backend) และดัชนี L0 (`atomic_index.jsonl`) ทำงานได้อย่างราบรื่น ตัวแปลงสัญญาณ (GKS Parser) จะทำงานดังนี้:

1.  **State Partitioning:** ระบบจะสแกนหาตัวแบ่งพาร์ติชันคือกิ่งหัวข้อ Markdown `^#\s.+\s\[L\d-.+\]\s([A-Z0-9_--]+)` เพื่อขึ้นรูปอะตอมย่อยแบบ Virtual อัตโนมัติ
2.  **Deterministic Backlink Injection:** ตัวแปรสิทธิ์การทำงาน (YAML/JSON Block) ในแต่ละระดับชั้น จะได้รับการฉีดพ่นค่าความสัมพันธ์ `crosslinks` วิ่งขนานย้อนคืนสายโซ่ขึ้นไปทีละลำดับชั้นโดยผู้ดูแลระบบคอมไพล์ เพื่อป้องกันการเกิดปัญหาหักวงจรแบบลูป (Acyclic Invariant Enforcement)
3.  **Block Overwrite Mechanism:** เมื่อ AI สั่งอัปเดตระบบในระดับ `L0` หรือ `L1` ระบบจำเพาะเจาะจงล็อกเป้าหมายเฉพาะช่วงของส่วนหัวข้อที่แก้ไขและทำการเขียนเนื้อหาเปลี่ยนถ่ายสอดไส้ข้อมูลกลับเข้าไปในตำแหน่งไฟล์กายภาพเดิมอย่างแม่นยำ โดยรักษาข้อมูลของระดับอื่นไว้ครบถ้วน 100%

---

## **5. CHANGELOG**

| Version | Date | Time | Status | Summary | Commit Hash | Agent |
|---|---|---|---|---|---|---|
| 1.4.0 | 2026-07-10 | 00:00 | active | แยกสัญลักษณ์สามแกนให้เลิกชนกัน: Compaction Heights → CH1-CH5, Context Scaling → Retrieval Radius R0-R6 (คืนตัวอักษร H ให้ Access Scope ใน STD-Execution-Governance v2.3); เพดาน hop เป็นค่า derive จากความลึก hierarchy (2×(ชั้น−1); แก้เลขเส้นทางสูงสุด 6 nodes → 7 nodes รวมตัวเอง); แก้ทิศ TIP — spaghetti วัดด้วย fan-out (W) ไม่ใช่ path ยาว; เพิ่มศัพท์มาตรฐาน Rk = k-hop ego graph; เปลี่ยนรูปเวอร์ชันจากฟอร์ม `b` (ต้องห้ามตาม STD-Document-Versioning-Governance) เป็นรูปมาตรฐาน — sign-off โดย Boss (CEO) 2026-07-10 | pending | ClaudeFable / Boss (approver) |
| 1.3.0b | 2026-06-07 | 00:00 | active | ทำการวิเคราะห์และแยกแกนเนื้องาน (WBS) ออกจากแกนเวลา (Sprint/Cycle) และปรับการแมป H0-H6 ให้ตรงตามมาตรฐาน Agile |
| 1.2.0b | 2026-06-07 | 00:00 | active | เพิ่มการเชื่อมโยงระบบแกนเวลา (Sprint/Cycle) เข้ากับ Hop H0-H6 และปรับโครงสร้างหัวข้อย่อย |
| 1.0.0b | 2026-06-02 | 00:00 | active | ร่างโครงสร้างมาตรฐานการบีบอัดข้อมูลระบบและ Hierarchy Compaction รุ่นแรก |

