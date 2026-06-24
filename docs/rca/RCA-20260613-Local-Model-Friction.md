---
title: "RCA: Local Model Execution Friction & Drift"
doc_id: "RCA-20260613-001"
uid: "01KVXGFW2MN13NFSGQD94AR65D"
status: "stable"
version: "1.0.0"
content_hash: "atom:de1f974e65424c85"
updated: "2026-06-13"
owner: "THESEUS"
type: "rca"
---

# RCA: Local Model Execution Friction & Drift

## 1. [SYMPTOM]
- Agent ATHER ที่รันผ่าน Ollama ไม่สามารถวิเคราะห์ไฟล์ที่เพิ่งสร้างใหม่ได้ในตอนแรก
- Model ขนาดใหญ่ (Gemma4 12b) เกิดอาการค้าง (Hang) หรือส่งผลลัพธ์ว่างเปล่าเมื่อได้รับบริบท (Context) จำนวนมาก
- ระบบปฏิเสธการรันโหมด `audit` ในโฟลเดอร์ `docs/` แม้จะเป็นงานตรวจสอบเอกสาร

## 2. [EVIDENCE]
- **Log:** `run-ather-local.ps1 : Cannot validate argument on parameter 'Mode'.`
- **Model Output (Gemma4):** `<|channel>` (Empty response)
- **Error:** `Scope 'docs' only allows local sidecar execution for atomic mode.`
- **Performance:** Qwen 3.5 4b ทำงานสำเร็จเมื่อลดขนาดงานลงเป็น "Surgical Audit" เท่านั้น

## 3. [ROOT CAUSE]
1.  **Restrictive Governance:** ใน `agent-registry.yaml` มีการตั้งค่า `local_mode_policy: atomic_only` สำหรับ Scope สำคัญ เพื่อป้องกัน Model เล็กแก้ไขงานใหญ่ แต่กลายเป็นอุปสรรคเมื่อใช้ Model ขนาดใหญ่ที่มีประสิทธิภาพสูง
2.  **Context Injection Strategy:** โหมด `atomic` (Default) ถูกออกแบบมาให้ดึงเฉพาะไฟล์งานและสัญญาของ Agent แต่ไม่ดึง "ไฟล์แวดล้อมที่เกี่ยวข้อง" ทำให้ Model ไม่เห็นเนื้อหาที่ต้องการตรวจสอบ
3.  **Pipe/IO Bottleneck:** การส่ง Data Stream ขนาดใหญ่ระหว่าง PowerShell และ Ollama CLI อาจเกิดอาการ Timeout หรือ Buffer Overflow ในบางสภาวะ (โดยเฉพาะเมื่อ Prompt + Context เกิน 8k tokens)
4.  **Prompt Format Sensitivity:** Gemma4 12b (Unsloth GGUF) มีความอ่อนไหวต่อ System Prompt และ Formatting สูง เมื่อได้รับ Context ที่ซับซ้อนเกินไปจะเกิดอาการ Confusion ในการตัดแบ่งผลลัพธ์

## 4. [WHY THE ISSUE ESCAPED DETECTION]
ระบบเน้นความปลอดภัยสูงสุด (Strict Governance) โดยตั้งสมมติฐานว่า Local Model มักจะมี Context Window ขนาดเล็ก (เช่น 1b/3b models) จึงไม่ได้ทดสอบกรณีการใช้ 12b+ models ที่ต้องการบริบทกว้างในโหมด Audit

## 5. [PROPOSED PREVENTION & CORRECTIVE ACTION]
1.  **[DONE] Registry Unlocking:** ปรับเปลี่ยน `agent-registry.yaml` ให้รองรับ `local_mode_policy: any` และอนุญาตโหมด `audit` สำหรับ Ollama
2.  **[DONE] Global Hub Injection:** เพิ่ม `AGENTS.md` เข้าใน `global_context` เพื่อให้ Agent ทุกตัวเห็นมาตรฐานสากลเสมอ
3.  **[PLANNED] Smart Context Slicing:** ปรับปรุง `build-agent-prompt.mjs` ให้มีความฉลาดในการเลือกเฉพาะ "ส่วนสำคัญ" ของไฟล์แวดล้อมแทนการส่งไฟล์เต็ม (Chunk-based Injection)
4.  **[PLANNED] Stream Health Check:** เพิ่มระบบ Retry และตรวจสอบสถานะการค้างของ Ollama Process ในสคริปต์ `invoke-agent.ps1`

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 2026-06-24 | 2026-06-24 | THESEUS | Added governance Changelog section (docs:backfill). |
