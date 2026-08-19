---
title: "SPEC: Genesis Block Technical Specification"
doc_id: "SPEC-GKS-001"
status: "candidate"
version: "1.2.1"
updated: "2026-08-19"
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
access_scope: H3-H4  # legacy range was H3-H5; H5 down-mapped to the H4 ceiling per ADR-021 (see §3)
```

### 2.2 Minimal Metadata (Low-level Atom / Spoke)
ใช้สำหรับไฟล์โค้ด, LLD, หรืออะตอมย่อย เพื่อลด Token Noise:
```yaml
id: [[ID]]
block_id: [[GENESIS_BLOCK_ID]]
access_scope: H0-H2
role: String
status: active | candidate | stable
```

## 3. Access Scope Implementation (H0-H4)
Agent Runtime ต้องบังคับใช้ข้อจำกัดการเข้าถึง (Access Control) ดังนี้ — `access_scope` เป็นเพดานสิทธิ์เครื่องมือ (tool-permission ceiling) ของ executor, แยกอิสระจาก Retrieval Radius (§3a):

| Tier | Level | Runtime Behavior |
|---|---|---|
| **H0** | 0 | `glob` forbidden. `grep` restricted to the assigned file path. |
| **H1** | 1 | Access to assigned file + direct dependencies in `import/export`. |
| **H2** | 2 | Access to the current directory + neighbor files in same feature. |
| **H3** | 3 | Full access to files within the `module_id` scope. |
| **H4** | 4 | Access to all files within the `system_id` scope; ceiling — requires explicit owner approval to grant. |

**2026-08-19 correction (ADR-021/AUD-14, TASK-PRD-022):** the legacy `H5`/`H6` rows ("Access to all GKS-indexed documentation" and "Full network traversal") are removed — those describe retrieval reach, not a tool-permission ceiling, and are abolished as access values. That reach is now expressed as Retrieval Radius (§3a). The former "Hop Count" column is relabeled "Level" since it never measured graph hops for this table — it measured access-tier ordinal.

### 3a. Retrieval Radius (R0-R6)
Graph-traversal breadth is a separate, independently-declared concern from Access Scope:

| Radius | Hop Count | Reach |
|---|---|---|
| **R0** | 0 | Single file only. |
| **R1** | 1 | File + direct import/export dependencies. |
| **R2** | 2 | Current directory + neighbor files in the same feature. |
| **R3** | 3 | Full `module_id` scope. |
| **R4** | 4 | Full `system_id` scope. |
| **R5** | 5 | All GKS-indexed documentation and metadata. |
| **R6** | 6 | Full network traversal — an explicit retrieval-policy decision, not a reserved tier. |

## 4. Compaction Depth Mapping (Layer Resolution)

**2026-08-19 correction (ADR-021/AUD-14, TASK-PRD-022):** this table previously used `H0-H6` to label physical-layer compaction depth. Compaction/resolution depth is the `D` axis per `CLAUDE.md`'s canonical governance-axes table; relabeled `H0-H6` -> `D0-D6` here. This `D` numbering has not yet been reconciled against the `CH1-CH5` Compaction Height scale in `.agents/FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS.md` — flagged for a follow-up doc-alignment pass, not resolved in this sweep.

| Depth | Layer Range | Mapping Example | Purpose |
|---|---|---|---|
| **D6** | **N/A** | **Full Network / Vault** | **Enterprise Ceiling** |
| **D5** | L2 - L0 | System -> Module -> Function | Masterplan / Roadmap |
| **D4** | L3 - L0 | System -> Module -> Feat -> Function | System Architecture |
| **D3** | L4 - L0 | System -> Module -> Feat -> Comp -> Method | Module Integration |
| **D2** | L5 - L0 | System -> Mod -> Sub-Mod -> Feat -> Comp -> Method | Story / Spec |
| **D1** | L7 - L0 | System -> Sub-Sys -> Mod -> Sub-Mod -> Feat -> Comp -> Class -> Method | Implementation |
| **D0** | **1 Layer** | **Atomic (Single Node)** | **Subtask / PR** |

## 4. Parser Protocol: Block Overwrite
เมื่อ Agent มีความรับผิดชอบระดับ `L0` และต้องการแก้ไขโค้ด:
1. Parser คำนวณ Byte-offset ของ `# [L0-Method] ID` ถึงจุดสิ้นสุดของ Atom นั้น
2. ระบบทำการ Read-Update-Write เฉพาะช่วง Byte-range ดังกล่าว
3. รักษาความครบถ้วนของ Metadata ระดับ Parent (L1-L4) ไว้เสมอ

## 5. Verification Rules
- **Rule GKS-001:** ห้ามมี Atom ID ซ้ำกันในระดับ Global Index (`atomic_index.jsonl`)
- **Rule GKS-002:** ทุกความสัมพันธ์ `wikilink` ต้องเป็น Acyclic (ไม่มีวงกลม)
- **Rule GKS-003:** หาก Graph Hops > 6 ระบบต้อง Return `COUPLING_RISK_WARN`
