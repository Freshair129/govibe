---
title: "SPEC: Genesis Block Technical Specification"
doc_id: "SPEC-GKS-001"
status: "candidate"
version: "1.2.0"
updated: "2026-06-13"
owner: "THESEUS"
source_of_truth: true
prd_system: "SYSTEM-08::Genesis Knowledge System"
---

# SPEC: Genesis Block Technical Specification

## 1. Physical Structure Standard
Genesis-compatible Markdown file ต้องมีโครงสร้างดังนี้:

### 1.1 Frontmatter (Required)
```yaml
---
title: String
doc_id: String
version: SemVer
state: active | candidate | stable
type: genesis | framework | roadmap
vault_id: default
source_type: axiomatic
block_manifest:
  core:
    # Root Atom Metadata
---
```

### 1.2 Atom Header Regex Pattern
ทุกหน่วยย่อย (Atom) ต้องขึ้นต้นด้วย Header ที่ตรงตามรูปแบบ:
`^#\s(?P<type>[A-Z]+):\s(?P<name>.+)\s\[(?P<layer>L\d-.+)\]\s(?P<id>[A-Z0-9_--]+)`

**กลุ่มข้อมูล (Capturing Groups):**
- `type`: ประเภทของ Atom (MOD, FEAT, ALGO, ENTITY, etc.)
- `name`: ชื่อที่มนุษย์อ่านเข้าใจ
- `layer`: ระดับเลเยอร์ (L0 ถึง L7)
- `id`: Unique ID สำหรับการ Relinking

## 2. Metadata Schema Standards (Hub-and-Spoke)

### 2.1 Full-Scale Metadata (Genesis Block Hub)
ใช้สำหรับไฟล์ประเภท `type: genesis` เพื่อประกาศ SSOT ของระบบ:
```yaml
id: [[ID]]
version: SemVer
masterplan: String
roadmap: String
phase: String
epic: String
sprint: String
task: String
domain: String
cluster: String
layer: String
role: String
status: active | candidate | stable
context_scaling_tier: H3-H5
```

### 2.2 Minimal Metadata (Low-level Atom / Spoke)
ใช้สำหรับไฟล์โค้ด, LLD, หรืออะตอมย่อย เพื่อลด Token Noise:
```yaml
id: [[ID]]
block_id: [[GENESIS_BLOCK_ID]]
context_scaling_tier: H0-H2
role: String
status: active | candidate | stable
```

## 3. Context Scaling Tier Implementation (H0-H6)
Agent Runtime ต้องบังคับใช้ข้อจำกัดการเข้าถึง (Access Control) ดังนี้:

| Tier | Hop Count | Runtime Behavior |
|---|---|---|
| **H0** | 0 | `glob` forbidden. `grep` restricted to the assigned file path. |
| **H1** | 1 | Access to assigned file + direct dependencies in `import/export`. |
| **H2** | 2 | Access to the current directory + neighbor files in same feature. |
| **H3** | 3 | Full access to files within the `module_id` scope. |
| **H4** | 4 | Access to all files within the `system_id` scope. |
| **H5** | 5 | Access to all GKS-indexed documentation and metadata. |
| **H6** | 6 | Full network traversal (Requires architectural override). |

## 3. Compaction Height (D) Mapping (Layer Resolution)
> **D = Compaction Height (D1–D5)**, distinct from the Context-Hop scale **H0–H6** (§2). Renamed per **ADR-022** to end the "H" collision. The `Purpose` column shows the typical WBS/hop band each compaction depth serves.

| D-Height | Layer Range | Mapping Example | Typical Purpose (WBS/hop band) |
|---|---|---|---|
| **(hop ceiling H6)** | **N/A** | **Full Network / Vault** | **Enterprise Ceiling — not a compaction level** |
| **D5** | L2 - L0 | System -> Module -> Function | Masterplan / Roadmap |
| **D4** | L3 - L0 | System -> Module -> Feat -> Function | System Architecture |
| **D3** | L4 - L0 | System -> Module -> Feat -> Comp -> Method | Module Integration |
| **D2** | L5 - L0 | System -> Mod -> Sub-Mod -> Feat -> Comp -> Method | Story / Spec |
| **D1** | L7 - L0 | System -> Sub-Sys -> Mod -> Sub-Mod -> Feat -> Comp -> Class -> Method | Implementation |
| **(uncompacted)** | **1 Layer** | **Atomic (Single Node)** | **Subtask / PR (Hop H0) — no compaction** |

## 4. Parser Protocol: Block Overwrite
เมื่อ Agent มีความรับผิดชอบระดับ `L0` และต้องการแก้ไขโค้ด:
1. Parser คำนวณ Byte-offset ของ `# [L0-Method] ID` ถึงจุดสิ้นสุดของ Atom นั้น
2. ระบบทำการ Read-Update-Write เฉพาะช่วง Byte-range ดังกล่าว
3. รักษาความครบถ้วนของ Metadata ระดับ Parent (L1-L4) ไว้เสมอ

## 5. Verification Rules
- **Rule GKS-001:** ห้ามมี Atom ID ซ้ำกันในระดับ Global Index (`atomic_index.jsonl`)
- **Rule GKS-002:** ทุกความสัมพันธ์ `wikilink` ต้องเป็น Acyclic (ไม่มีวงกลม)
- **Rule GKS-003:** หาก Graph Hops > 6 ระบบต้อง Return `COUPLING_RISK_WARN`
