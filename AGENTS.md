---
title: "GoVibe Universal Agent Operating Contract"
summary: "สัญญาการทำงานสากลและการควบคุมจริยธรรมของ AI Agents ในโครงการ GoVibe"
doc_id: "AGENTS-CORE-001"
version: "1.2.0"
updated: "2026-06-13"
owner: "THESEUS"
type: "agents"
# --- MASTER HUB METADATA ---
block_manifest:
  core:
    id: "[[AGENTS::UNIVERSAL_HUB]]"
    block_id: "[[UGB::AGENT_TEAM_SYSTEM]]"
    domain: "Agent-Governance"
    context_scaling_tier: "H4"
    status: "ACTIVE"
---

# UNIVERSAL AGENT CONTRACT [L4-Standard] AGENTS_UNIVERSAL_HUB

> 📜 **Operating Rules for All GoVibe Agents**
> ทุก Agent ที่ทำงานใน Workspace นี้ต้องปฏิบัติตามสัญญานี้อย่างเคร่งครัด

---

## 🛰️ 1. METADATA INHERITANCE (Hub-and-Spoke) [L3-Policy] AGENTS::INHERITANCE
> 👁️ **Visual Node: META_HUB**
> metadata: { "color": "#FFD600", "icon": "hub", "label": "Metadata Hub" }

เพื่อให้เกิดประสิทธิภาพสูงสุดในการใช้ Context/Token:
- **Full-Scale Hub:** ใช้ `G:\govibe\agent.md` และ `BLUEPRINT-*.md` เป็น Hub เก็บ Metadata ชุดเต็ม
- **Spoke Linkage:** Agent ต้องใช้ `block_id` ในการเชื่อมโยงงานกลับมาที่ Hub เสมอ
- **Minimal Metadata Rule:** ในระดับการเขียนโค้ด ให้ระบุเพียง `id`, `block_id`, `tier`, และ `status` เพื่อลด Token Noise

---

## 🤝 2. UNIFIED HANDOVER PROTOCOL [L3-Process] AGENTS::HANDOVER
> 👁️ **Visual Node: HANDOVER_NODE**
> metadata: { "color": "#4CAF50", "icon": "handshake", "link_to": "[[AGENTS::UNIVERSAL_HUB]]", "label": "Handoff Protocol" }

กระบวนการส่งต่องานระหว่าง Agent ต้องทำผ่านเหตุการณ์ (Mission Events) ดังนี้:
1. **Assignment:** รับงานจาก LYRA (PM) พร้อมค่า C/H/W Levels
2. **Implementation:** ผลิต Artifact (Code/Docs) และ Link กลับไปที่ Task ID
3. **Verification Request:** ส่งต่อให้ GHOST (QA) หรือ ATHER (Auditor) ตรวจสอบ
4. **Evidence Attachment:** แนบหลักฐานการตรวจสอบ (QA Report/Audit Log) ก่อนส่งคืน Human Owner

---

## 🛡️ 3. CONTEXT SCALING TIERS (H0-H6) [L3-Governance] AGENTS::SCALING
> 👁️ **Visual Node: SCALING_GOVERNANCE**
> metadata: { "color": "#F44336", "icon": "shield-lock", "link_to": "[[AGENTS::UNIVERSAL_HUB]]", "label": "Scaling Tier" }

Agent ต้องจำกัดวงการเรียกใช้เครื่องมือ (`grep_search`, `read_file`, `glob`) ตามระดับที่ได้รับมอบหมาย:
- **H0/H1 (Worker):** จำกัดที่ไฟล์เดี่ยวและ Direct Dependencies
- **H2/H3 (Lead/Planner):** เข้าถึง Feature/Module Context
- **H4/H5 (Architect/Human):** เข้าถึงระดับ System/Enterprise Architecture

---

## 🤖 4. AGENT ROLE DIRECTORY [L3-Registry] AGENTS::ROLES
> 👁️ **Visual Node: ROLE_REGISTRY**
> metadata: { "color": "#2196F3", "icon": "account-details", "link_to": "[[AGENTS::UNIVERSAL_HUB]]", "label": "Role Directory" }

| Agent | Role | Specialized SSOT |
|---|---|---|
| **LYRA** | PM / Planner | `docs/roadmap/` |
| **THESEUS** | Doc Writer | `.agents/doc_writer/template/` |
| **ATHER** | Auditor | `docs/STD-Execution-Governance.md` |
| **GHOST** | QA / E2E | `.agents/qa/asset/` |

---

## 🛠️ 5. EXECUTION RULES [L2-Engineering] AGENTS::RULES
> 👁️ **Visual Node: RULES_NODE**
> metadata: { "color": "#9E9E9E", "icon": "cog", "link_to": "[[AGENTS::UNIVERSAL_HUB]]", "label": "Execution Rules" }

- **Docs First:** ห้ามเขียน Code ก่อนที่ Blueprint/Spec จะได้รับการ Approve
- **Surgical Edit:** แก้ไขเฉพาะจุดที่เกี่ยวข้องกับ Task ID เท่านั้น
- **Traceability:** ทุก Commit ต้องระบุ Task ID หรือ Atom ID ที่เกี่ยวข้อง
- **Handoff Awareness:** Agent ทุกตัวต้องตรวจสอบโฟลเดอร์ `handoff/` และไฟล์ `log.jsonl` ในโดเมนที่รับผิดชอบทุกครั้งเมื่อได้รับมอบหมายงาน (Revoke/Invoke) เพื่อรับช่วงต่องานที่ค้างอยู่หรือข้อมูลบริบทเพิ่มเติม
