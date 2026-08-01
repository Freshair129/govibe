---
title: "GoVibe Universal Agent Operating Contract"
summary: "สัญญาการทำงานสากลและการควบคุมจริยธรรมของ AI Agents ในโครงการ GoVibe"
doc_id: "AGENTS-CORE-001"
version: "1.5.0"
updated: "2026-08-01"
owner: "THESEUS"
type: "agents"
# --- MASTER HUB METADATA ---
block_manifest:
  core:
    id: "[[AGENTS::UNIVERSAL_HUB]]"
    block_id: "[[UGB::AGENT_TEAM_SYSTEM]]"
    domain: "Agent-Governance"
    access_scope: "H4"
    status: "ACTIVE"
---

# UNIVERSAL AGENT CONTRACT [L4-Standard] AGENTS_UNIVERSAL_HUB

> 📜 **Operating Rules for All GoVibe Agents**
> ทุก Agent ที่ทำงานใน Workspace นี้ต้องปฏิบัติตามสัญญานี้อย่างเคร่งครัด
>
> ⭐ **`AGENTS.md` (ไฟล์นี้) = สัญญามาตรฐานตัวจริง** — เป็นไฟล์ที่ codex, เครื่องมือฝั่ง GPT และ convention `AGENTS.md` auto-load. `AGENT.md` (เอกพจน์) และ `GEMINI.md` เป็นเพียง **compatibility bridge** ที่ชี้กลับมาที่ไฟล์นี้ เสมอให้ยึด `AGENTS.md` เป็นหลัก

---

## 🛰️ 1. METADATA INHERITANCE (Hub-and-Spoke) [L3-Policy] AGENTS::INHERITANCE
> 👁️ **Visual Node: META_HUB**
> metadata: { "color": "#FFD600", "icon": "hub", "label": "Metadata Hub" }

เพื่อให้เกิดประสิทธิภาพสูงสุดในการใช้ Context/Token:
- **Full-Scale Hub:** ใช้ `AGENTS.md` (ไฟล์นี้ — มาตรฐานที่ codex/gpt auto-load) และ `BLUEPRINT-*.md` เป็น Hub เก็บ Metadata ชุดเต็ม
- **Spoke Linkage:** Agent ต้องใช้ `block_id` ในการเชื่อมโยงงานกลับมาที่ Hub เสมอ
- **Minimal Metadata Rule:** ในระดับการเขียนโค้ด ให้ระบุเพียง `id`, `block_id`, `access_scope`, และ `status` เพื่อลด Token Noise

---

## 🤝 2. UNIFIED HANDOVER PROTOCOL [L3-Process] AGENTS::HANDOVER
> 👁️ **Visual Node: HANDOVER_NODE**
> metadata: { "color": "#4CAF50", "icon": "handshake", "link_to": "[[AGENTS::UNIVERSAL_HUB]]", "label": "Handoff Protocol" }

กระบวนการส่งต่องานระหว่าง Agent ต้องทำผ่านเหตุการณ์ (Mission Events) ดังนี้:
1. **Assignment:** รับงานจาก LYRA (PM) พร้อมค่า C/H/W Levels และแกน retrieval/context ที่เกี่ยวข้อง
2. **Implementation:** ผลิต Artifact (Code/Docs) และ Link กลับไปที่ Task ID
3. **Verification Request:** ส่งต่อให้ GHOST (QA) หรือ ATHER (Auditor) ตรวจสอบ
4. **Evidence Attachment:** แนบหลักฐานการตรวจสอบ (QA Report/Audit Log) ก่อนส่งคืน Human Owner

---

## 🛡️ 3. GOVERNANCE AXES [L3-Governance] AGENTS::SCALING
> 👁️ **Visual Node: SCALING_GOVERNANCE**
> metadata: { "color": "#F44336", "icon": "shield-lock", "link_to": "[[AGENTS::UNIVERSAL_HUB]]", "label": "Governance Axes" }

### 3.1 Canonical axis meanings

| Axis | Meaning | Canonical values |
|---|---|---|
| **C** | Process complexity | `C-0..C-3` |
| **H** | Executor Access Scope / tool-permission ceiling | `H0..H4` |
| **R** | Retrieval radius / graph distance | `R0..R6` or explicit retrieval policy |
| **D** | Compaction / resolution depth | repository-defined `D` scale |
| **W** | Fan-out / branching width | `W2..W4` |
| **Budget** | Token/content allowance | explicit numeric or policy object |
| **Risk** | Operational/security impact | repository-defined risk class |

**ห้ามใช้ตัวอักษรหนึ่งแกนแทนอีกแกนหนึ่ง** โดยเฉพาะ:

```text
H != graph hops
H != retrieval radius
H != context/token budget
H != risk
H != CoVibe/CoDev mode
```

### 3.2 Access Scope H0-H4

H = **เพดาน capability ของ executor** ตาม `docs/STD-Execution-Governance.md` และ `docs/adr/ADR-021-H-Axis-Access-Scope-Semantic-Separation.md` โดย canonical home อยู่ที่ RWANG PROMAX `skills/rwang/references/EXECUTION-GOVERNANCE.md`:

- **H0:** read ไฟล์เดี่ยว (glob/grep forbidden)
- **H1:** + search (glob/grep)
- **H2:** + write / multi-file edit
- **H3:** + shell execution
- **H4:** + network/full configured capability set **และต้องได้ approval ก่อนลงมือ**

Default map จาก Complexity:

```text
C-0 -> H0
C-1 -> H1
C-2 -> H2
C-3 -> H3
```

`C-3/H4` เป็น upward override สำหรับ architecture, cross-system หรือ platform work และต้องได้รับ owner approval ก่อน implementation. **H5/H6 ถูกยกเลิก** และห้ามใช้ใน active contract, metadata, task packet หรือ implementation symbol.

### 3.3 Retrieval and context rules

- ใช้ `R` หรือ field ชัดเจน เช่น `retrieval_radius`, `max_hops`, `retrievalPolicy` สำหรับ graph distance
- ใช้ `D` สำหรับ compaction/resolution depth
- ใช้ `context_budget` หรือ `max_tokens` สำหรับปริมาณ context
- `context_tier` เป็น legacy/ambiguous alias และห้ามสร้างเพิ่ม; ต้องจำแนก semantic ก่อน migrate
- ห้ามอนุมาน retrieval radius หรือ token budget จาก H

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
- **Axis Declaration:** งาน non-trivial ต้องประกาศ C และใช้ H ตาม default หรือ upward override; R, D, W, Budget และ Risk ให้ประกาศเมื่อเกี่ยวข้อง ห้ามรวมความหมายเข้า H
- **Legacy Rejection:** ห้ามสร้าง active field/symbol ใหม่ที่ใช้ `H5`, `H6`, `HLevelClassifier`, `classifyHLevel`, หรือใช้ `context_tier` โดยไม่ระบุ semantic migration
- **Handoff Awareness:** Agent ทุกตัวต้องตรวจสอบโฟลเดอร์ `handoff/` และไฟล์ `log.jsonl` ในโดเมนที่รับผิดชอบทุกครั้งเมื่อได้รับมอบหมายงาน (Revoke/Invoke) เพื่อรับช่วงต่องานที่ค้างอยู่หรือข้อมูลบริบทเพิ่มเติม
- **Project Reality Check:** When asked to help GoVibe or a connected repo, inspect real project state before making claims. At minimum check `git status`, root context files (`AGENTS.md`, `AGENT.md`, `GEMINI.md`, `CLAUDE.md` when present), referenced source docs, referenced commands, and relevant code/test evidence.
- **No Imagined Capability:** Do not claim a feature, command, doc, or integration exists or works unless it was verified from current project evidence. If dirty state or context drift may affect the answer, report it explicitly.
- **Help, Don't Create Work:** When evidence and docs disagree, return the smallest safe fix, blocker, or verification step. Do not create new architecture, new docs, or new implementation scope just to answer a narrow request.
- **Best Code Rule:** The best code is the code you never wrote. Before proposing code, check in order: can the work be skipped, solved with docs/config/process, solved by stdlib/native platform behavior, solved by an existing dependency, solved with a one-line change, and only then solved with the minimum new code.
- **Optional Ponytail Hygiene:** `ponytail` may be used as an optional over-engineering review aid, but it is not a GoVibe dependency and must not override Docs First, RCA First, evidence-first review, or human approval gates.

---

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 1.5.0 | 2026-08-01 | THESEUS / GPT-5.6 Thinking | Aligned the universal contract with ADR-021: renamed metadata to `access_scope`, separated C/H/R/D/W/Budget/Risk, replaced legacy CH compaction wording with D, prohibited H5/H6 and ambiguous new `context_tier` usage. |
| 1.4.0 | 2026-07-19 | ClaudeFable | §3 synced to STD-Execution-Governance 2.3.x: Context Scaling Tiers H0-H6 → Access Scope H0-H4 (capability ceiling; radius→R, compaction→CH; H5/H6 abolished per RWANG RFC--H-AXIS-0.6.0). |
| 1.3.1 | 2026-06-22 | THESEUS | Affirmed `AGENTS.md` as the standard contract auto-loaded by codex/gpt (with `AGENT.md`/`GEMINI.md` as compatibility bridges); fixed the stale Full-Scale Hub reference (`agent.md` → `AGENTS.md`). |
| 1.3.0 | 2026-06-16 | THESEUS | Universal agent operating contract: hub-and-spoke metadata, unified handover, context scaling tiers, role directory, execution rules. |
