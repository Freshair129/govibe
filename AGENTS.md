---
title: "GoVibe Universal Agent Operating Contract"
summary: "สัญญาการทำงานสากลและการควบคุมจริยธรรมของ AI Agents ในโครงการ GoVibe"
doc_id: "AGENTS-CORE-001"
version: "1.7.0"
updated: "2026-08-01"
owner: "THESEUS"
type: "agents"
block_manifest:
  core:
    id: "[[AGENTS::UNIVERSAL_HUB]]"
    block_id: "[[UGB::AGENT_TEAM_SYSTEM]]"
    domain: "Agent-Governance"
    access_scope: "H4"
    status: "ACTIVE"
---

# UNIVERSAL AGENT CONTRACT [L4-Standard] AGENTS_UNIVERSAL_HUB

> `AGENTS.md` คือสัญญาหลักสำหรับ Agent ทุกตัวใน GoVibe ส่วน `AGENT.md`, `GEMINI.md` และ `CLAUDE.md` เป็น compatibility/consumer guide ที่ต้องไม่ขัดกับไฟล์นี้

## 1. Metadata inheritance

- ใช้ `AGENTS.md` และ `BLUEPRINT-*.md` เป็น Hub
- งาน implementation ระบุอย่างน้อย `id`, `block_id`, `access_scope`, `status`
- Spoke artifact ต้องเชื่อมกลับ Task/Work Packet/Atom ที่เป็น authority

## 2. Unified handover

1. รับ Assignment พร้อม C/H และแกน R/D/W/Budget/Risk ที่เกี่ยวข้อง
2. ผลิต artifact และผูกกับ Task ID
3. ส่ง Verification Request ให้ QA/Auditor
4. แนบ evidence ก่อนส่ง Human Owner

## 3. Governance axes

| Axis | Meaning | Canonical values |
|---|---|---|
| C | Process complexity | `C-0..C-3` |
| H | Executor Access Scope | `H0..H4` |
| R | Retrieval radius | `R0..R6` หรือ explicit policy |
| D | Compaction/resolution depth | repository-defined |
| W | Fan-out/branching width | explicit scale |
| Budget | Token/content/resource allowance | explicit object/value |
| Risk | Operational/security impact | explicit class |

ห้ามใช้ H แทน graph hops, retrieval radius, token budget, risk หรือ context profile. H5/H6 ถูกยกเลิก. `context_tier` เป็น legacy ambiguous alias และห้ามสร้างเพิ่ม.

Access Scope:

- H0: bounded single-file read
- H1: search
- H2: write/multi-file edit
- H3: shell
- H4: network/full configured capabilities พร้อม approval

Default: C-0→H0, C-1→H1, C-2→H2, C-3→H3. C-3/H4 ต้องมี owner approval.

## 4. Vault and memory contract

### 4.1 Shared Vault

Shared Vault คือ Project Source of Truth สำหรับ Agent Team ที่ได้รับสิทธิ์ เนื้อหาที่เป็น architecture, requirement, decision, contract, validated observation และ promoted team knowledge ต้องผ่าน governance ก่อนเป็น Shared SOT.

### 4.2 Workspace Private Vault

Workspace Private Vault เป็น episodic/experiential memory หลักของ Agent หนึ่งตัวใน workspace ปัจจุบัน เก็บ task continuity, state snapshot, hypothesis, mistake และ recovery pattern. มันไม่ใช่ Project SOT.

### 4.3 Global Private Vault

Global Private Vault เป็น compressed durable memory ของ Agent ข้าม workspace. ห้าม copy raw episode ทั้งก้อนจาก Workspace Private ขึ้น Global. ต้อง reflect, deduplicate, redact, compress และผ่าน promotion policy.

### 4.4 Promotion

```text
Workspace Private -> compression/privacy gate -> Global Private
Workspace Private -> validation/approval gate -> Shared Vault
```

Agent ห้ามเขียนหรือ promote เข้า Shared Vault โดยตรง. ทุก operation ต้องผ่าน GoVibe และ MSP parent boundary.

## 5. Context profiles

- `T-ctx`: system + task/event; ใช้กับ worker/headless; ห้ามโหลด private history โดยปริยาย
- `V-ctx`: Global Private + current Workspace Private; profile ปกติของ stateful agent
- `W-ctx`: V-ctx + exactly one active multi-agent workflow; orchestrator/lead/final gate
- `M-ctx`: sync Global/Workspace ทุก turn พร้อม diff lineage และ realtime shared context; review/audit gates

`V-space` หมายถึง workspace ไม่ใช่ memory tier. Context profile ไม่กำหนด H/R/D/W/Budget/Risk.

Agent ต้องใช้ `contextProfile` ที่ packet ระบุ ห้ามอนุมานจาก role แล้วเปลี่ยนเอง. W-ctx ต้องมี workflow เดียว. M-ctx หลัง turn แรกต้องมี `parentContextId`.

## 6. Context injection, cache, KV and replay

ทุก Agent turn ที่ dispatch ต้องผูกกับ:

- `contextId`: logical assembly
- `cacheId`: exact persisted packet
- `kvId`: optional runtime-issued model KV identity
- exact source versions/hashes
- run/session/turn/agent/workspace identity

Agent ห้ามสร้าง `kvId` เอง. KV reuse ใช้ได้ต่อเมื่อ model, tokenizer, system context, tool schema, ordering และ source content ตรงทั้งหมด.

Replay ห้ามแทน source รุ่นเก่าด้วยรุ่นล่าสุดแบบเงียบ ๆ และต้องรายงานแยก:

1. context reproducible
2. execution reproducible
3. output identical

ห้ามอ่าน Private Vault ของ Agent อื่นโดยไม่มี explicit grant. ห้ามถือ local `.brain` materialization เป็น canonical โดยไม่ตรวจ vault ID, registry ref, version และ hash.

## 7. Runtime boundary

```text
Executor / Claude Code -> GoVibe MCP -> MSP -> GKS -> GenesisBlockDB
```

- GoVibe ห้ามเรียก GKS หรือ GenesisBlockDB โดยตรง
- Agent ห้ามเรียก MSP/GKS/GenesisBlockDB ผ่าน runtime credentials โดยตรง
- Producing scan stages สร้าง candidate knowledge แล้วส่งให้ MSP promotion gate
- `gks:` reference ที่ถูกส่งกลับเป็น opaque reference ไม่ใช่ connection capability

## 8. Knowledge, link, backlink and impact contract

### 8.1 Knowledge construction

Deep Scan เป็น decomposition/discovery engine และสร้างได้เฉพาะ candidate:

- document/section/atom candidate
- symbol/entity candidate
- wikilink/crosslink/symbol-link candidate
- observed graph relation พร้อม provenance/confidence

GKS เป็นผู้ assign canonical `document_id`, `document_version_id`, `atom_id`, `symbol_id`, `entity_id`, `relation_id` หลัง MSP authorize. Agent และ GoVibe ห้ามเรียก candidate ว่า canonical knowledge.

### 8.2 Link classes

- Wikilink: explicit document/concept reference เช่น `[[ADR-022]]`
- Crosslink: relation ข้าม artifact/memory domain
- Symbol link: import/call/inheritance/route/tool/ORM relation
- Backlink: reverse projection ของ forward relation เดิม

Backlink ห้ามสร้าง semantic edge ซ้ำ. ต้อง preserve original `link_id/relation_id`, relation type, source, target และ provenance.

### 8.3 Impact analysis

เมื่อเปลี่ยน architecture, API, schema, authority boundary หรือ runtime behavior Agent ต้องรัน impact analysis ก่อนประกาศงานเสร็จ:

```text
changed seed
  <- direct backlinks
  <- transitive backlinks
  <- implementation/tests/UI/operations
```

ผลต้องระบุ affected artifact, relation chain, graph distance, impact score, required action และ unresolved links. ต้องจัดการ cycle, จำกัดระยะ และห้ามอ้าง completeness เมื่อ graph coverage ไม่พอ.

`text.includes(path)` หรือ grep อย่างเดียวเป็น discovery fallback ไม่ใช่ canonical impact algorithm.

Agent ต้องแก้ทุก `must_update`; ต้องตรวจและตัดสินทุก `review_and_update`; และต้องบันทึกเหตุผลเมื่อไม่แก้รายการ `review`.

## 9. Agent role directory

| Agent | Role | Specialized SSOT |
|---|---|---|
| LYRA | PM / Planner | `docs/roadmap/` |
| THESEUS | Doc Writer | `.agents/doc_writer/template/` |
| ATHER | Auditor | `docs/STD-Execution-Governance.md` |
| GHOST | QA / E2E | `.agents/qa/asset/` |

## 10. Execution rules

- Docs First: implementation ต้องอ้าง approved Blueprint/API/ADR
- Surgical Edit: แก้เฉพาะขอบเขต Task
- Traceability: commit ผูก Task/Atom/Work Packet
- Project Reality Check: ตรวจ source docs, code, tests, CI และ current state ก่อนอ้าง capability
- No Imagined Capability: ห้ามอ้าง command/integration ว่ามีหรือทำงานแล้วโดยไม่มี evidence
- Parent-only Boundary: ห้ามเพิ่ม `GOVIBE_GKS_*`, direct GKS client หรือ GenesisBlockDB port ใน runtime path ใหม่
- Exact Context Retention: ก่อน dispatch ต้อง persist cache และ injection lineage
- Private Memory Discipline: raw private episode ไม่ใช่ durable global memory และไม่ใช่ shared truth
- Impact Before Completion: semantic/schema/authority/runtime change ต้องผ่าน backlink impact analysis
- Escalate, Do Not Widen: context หรือ permission ไม่พอให้ escalate ไม่ใช่ขยายเอง
- Best Code Rule: ใช้การแก้ที่เล็กที่สุดซึ่งรักษา contract และ evidence ได้

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 1.7.0 | 2026-08-01 | THESEUS / GPT-5.6 Thinking | Added Deep Scan candidate ownership, wikilink/crosslink/symbol-link/backlink semantics, and mandatory explainable impact analysis before completion. |
| 1.6.0 | 2026-08-01 | THESEUS / GPT-5.6 Thinking | Added Shared/Workspace Private/Global Private vault rules, T/V/W/M context profiles, context/cache/KV/replay lineage, private-memory promotion discipline, and MSP-only runtime boundary. |
| 1.5.0 | 2026-08-01 | THESEUS / GPT-5.6 Thinking | Aligned C/H/R/D/W/Budget/Risk semantics and prohibited H5/H6 and ambiguous context_tier. |
| 1.4.0 | 2026-07-19 | ClaudeFable | Synced Access Scope H0-H4. |
