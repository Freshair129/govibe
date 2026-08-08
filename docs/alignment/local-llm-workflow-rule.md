---
title: "GoVibe Local LLM Operational Rule"
doc_id: "RULE-LLM-001"
status: "active"
version: "1.0.0"
updated: "2026-08-08"
owner: "ARCHON"
block_manifest:
  core:
    id: "[[RULE::LOCAL_LLM_WORKFLOW]]"
    block_id: "[[GKS::GENESIS_BLOCK_V3]]"
---

# GoVibe Local LLM Operational Rule [L4-Standard] RULE_LOCAL_LLM_WORKFLOW

> กฎบังคับใช้นี้จัดทำขึ้นเพื่อล็อกแนวปฏิบัติของ Agent ทุกตัวใน GoVibe ให้ทำงานกับ Local LLM อย่างเสถียรและปลอดภัยบนเครื่องเป้าหมาย (RTX 3060 12GB) ห้ามละเมิดเด็ดขาด

---

## 1. ลำดับขั้นตอนปฏิบัติงานบังคับ (Mandatory Pipeline)
ทุกครั้งที่ Agent ได้รับมอบหมายให้ทำงานเกี่ยวกับ LLM Dispatch, ทดสอบ Benchmark หรืออัปเดตโมเดล ต้องปฏิบัติตาม 4 ขั้นตอนนี้เรียงตามลำดับ:

```text
1. Scan & Update (Ollama List)
   ▼
2. Enhance Config (scraped recommended parameters)
   ▼
3. Write YAML Configs (generate-individual-configs)
   ▼
4. Run Pre-warm / Execute with VRAM Mutex Locked
```

---

## 2. กฎการตรวจสอบ VRAM & Context (VRAM Safety Invariants)
- **Ceiling Check:** ห้ามกำหนดค่า Context (`num_ctx`) เกินเพดานปลอดภัยของเครื่อง (`8,192` สำหรับโมเดล Coder ทั่วไป และไม่เกิน `16,384` สำหรับโมเดลที่มี Thinking tags)
- **VRAM Mutex Guard:** ก่อนทำการรันโมเดลใดๆ ต้องตรวจสอบและเขียน Mutex Lock ลงไฟล์ `orchestration/.vram.lock` เสมอ เพื่อป้องกันโมเดลใหญ่ปะทะกันจน VRAM ล้นหลุดไปที่ System RAM (CPU)

---

## 3. การกักกันความมั่นคงปลอดภัยด้านการตอบกลับ (Output & Security Gates)
- **Token Filtering:** หากตรวจพบฟิลด์ `"hasThinking": true` ในโปรไฟล์โมเดล Agent ต้องใช้ Post-filter ทำการค้นหาและดักตัดแท็ก `<think>...</think>` หรือแท็กพิเศษอื่นๆ ออกจาก Output เสมอก่อนนำส่ง
- **Zero-Shot Isolation:** Holdout Test Suite ที่ใช้ในกระบวนการ Verify Gate ห้ามส่งเข้าไปใน Prompt Scaffold ของตัว Worker เด็ดขาด
