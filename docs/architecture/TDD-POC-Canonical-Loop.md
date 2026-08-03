---
title: "TDD: POC Canonical Loop (Graph-to-View)"
doc_id: "TDD-POC-CANONICAL-LOOP"
status: "approved"
version: "1.0.0"
updated: "2026-08-04"
owner: "Boss / ATHER"
source_of_truth: false
conforms_to:
  - "docs/srs/SRS-Canonical-Semantic-IR.md"
  - "docs/adr/ADR-025-Storage-Backend-Independence-and-GenesisBlockDB-Adapter-Boundary.md"
  - "docs/integration/CONTRACT-GenesisBlockDB-Adapter.md"
  - "docs/architecture/ARCH-Vault-and-Context-Model.md"
  - "docs/alignment/ALIGNMENT-04-12-Stage-Decomposition-Contract.md"
  - "docs/api/API-005-GoVibe-Capability-Contracts.md"
  - "docs/api/API-006-Vault-Context-and-Replay-Contracts.md"
---

# TDD: POC Canonical Loop (Graph-to-View)

| Field | Value |
| --- | --- |
| Tech Lead | Boss / ATHER |
| Team | GoVibe Core |
| Status | Draft |
| Created | 2026-08-03 |
| Last Updated | 2026-08-03 |
| Governance | C-2 / H2 (POC implementation work) |

## 1. Context (บริบท)

GoVibe ประกาศสถาปัตยกรรมเป้าหมายว่า **canonical semantic graph คือ source of truth และเอกสาร/บอร์ดทุกชนิดคือ projection** แต่ระบบที่รันอยู่ปัจจุบันยังเป็นทิศตรงข้าม: บอร์ด roadmap ถูก parse จากไฟล์ Markdown โดยตรง (`scripts/mcp/roadmap-parser.mjs`) และเอกสารใน docs ยังติด frontmatter `source_of_truth: true`

ผลการวิเคราะห์ prior art / red team (สิงหาคม 2026) สรุปตรงกันว่า:

- ทุกองค์ประกอบย่อยของสถาปัตยกรรมมี prior art (MBSE views, Graphiti extraction, Polarion LiveDoc, lens theory)
- ความใหม่ที่ยังยืนได้อยู่ที่**การประกอบครบวงจร** + governed promotion + replay lineage
- คำโจมตีที่ฆ่าได้จริงข้อเดียวคือ **implementation gap**: ยังไม่มีวงจร graph→view รันจริงแม้แต่หนึ่งวงจร (`packages/govibe-core/src/gks-client.mjs` ปิดตายโดยดีไซน์ — ทุกอย่างต้องผ่าน MSP ซึ่งยังไม่มี runtime ครบ)

POC นี้มีหน้าที่เดียว: **สร้างหลักฐาน runtime ของวงจรเต็มหนึ่งวงจร** ตาม authority chain ที่ประกาศไว้ โดยไม่แก้สถาปัตยกรรม ไม่ขยาย scope

**อัปเดต 2026-08-03 (v0.2.0):** issue #91 ได้ merge `docs/srs/SRS-Canonical-Semantic-IR.md` ซึ่ง formalize pipeline เดียวกันเป็น requirement (CSIR-FR/NFR) — TDD นี้จึงเป็น **vertical slice แรกของ SRS §7 (Required views for PoC)** ครอบคลุมเฉพาะ view "Roadmap or backlog representation"; view ที่เหลือของ §7 (PRD Markdown, Jira-compatible JSON, Agent context packet) เป็น slice ถัดไปนอกขอบเขตเอกสารนี้

## 2. Problem Statement & Motivation (ปัญหาและแรงจูงใจ)

### ปัญหาที่แก้

- **ปัญหา 1: Thesis ไม่มีหลักฐาน runtime** — คำอ้าง "graph เป็น SoT, เอกสารเป็น projection" พิสูจน์ไม่ได้จากโค้ดปัจจุบัน
  - ผลกระทบ: งานทั้งหมด (paper, patent, pitch) ถูกจัดเป็น vision-only; คำปฏิเสธ "แค่ KG + governance paperwork" ยืนได้ด้วยหลักฐานโค้ดของเราเอง
- **ปัญหา 2: เส้นทาง observed → canonical ยังไม่เคยถูกเดินจริง** — contract validator มีแล้ว (`packages/govibe-core/src/canonical-materialization.mjs`) แต่ไม่มี runner ที่เดินผ่านมันจนจบ
  - ผลกระทบ: ไม่รู้ว่า contract ที่ออกแบบไว้ใช้งานได้จริงหรือมีช่องโหว่ จนกว่าจะมี consumer จริง

### ทำไมต้องตอนนี้

- ผล reconstruction analysis ประเมินว่า ecosystem สาธารณะสร้างระบบเทียบเท่าได้ใน ~1–1.5 ปี — ความได้เปรียบเป็นเรื่องเวลา ไม่ใช่กำแพงเทคนิค
- Graphiti / Beads / spec-driven IDEs กำลังบรรจบเข้าหาจุดเดียวกันจากคนละทิศ

### ถ้าไม่ทำ

- ทุก external claim ของโปรเจกต์ยังตกอยู่ใต้คำปฏิเสธที่ตรวจสอบแล้วว่า "ยืนได้" หนึ่งข้อ (implementation gap)
- ไม่มีข้อมูล empirical สำหรับปัญหาวิจัยที่เปิดอยู่ (identity stability, projection determinism)

## 3. Scope (ขอบเขต)

### In Scope (POC V0)

- Artifact ชนิดเดียว: เอกสาร roadmap/backlog Markdown ที่มีอยู่จริงใน docs/roadmap
- Deep Scan stages 1–3 (scan / structure / markdown parse) ผลิต document/atom/link candidates พร้อม provenance + SHA-256 hash — ใช้ของที่มีอยู่
- **Promotion Runner** (ใหม่): เดิน candidates ผ่าน MSP boundary ตาม contract เดิม — MSP เป็น local stub ที่ implement response schema ซึ่ง validator ตรวจอยู่แล้ว
- **Canonical Store** (ใหม่, file-backed): เก็บ canonical records (`gks:` refs + hashes) — GenesisBlockDB จริงอยู่นอก scope, store นี้ implement contract เดียวกันเพื่อให้สลับได้ภายหลัง
- **View Compiler** (ใหม่): compile backlog/roadmap view ของ MissionSnapshot **จาก canonical graph เท่านั้น** — ห้ามเรียก roadmap parser เดิมใน path นี้
- Provenance ต่อ item บน view: canonical ref → candidate ref → source file + hash
- Reverse edit หนึ่ง field: เปลี่ยน status ของ item บน view → MissionCommand → อัปเดต canonical record → recompile view → export Markdown ที่สะท้อนการเปลี่ยน

### Out of Scope (POC V0)

- PRD/ADR semantics เต็มรูป, lossless prose round-trip
- Jira / Linear / GitHub adapters
- GKS service จริง, GenesisBlockDB integration จริง, MSP authentication จริง
- Vector search, impact scoring เพิ่มเติม, UI ใหม่นอกเหนือ provenance badge
- การ migrate เอกสารเดิมหรือแตะ path ของ `scripts/mcp/roadmap-parser.mjs` ที่ระบบปัจจุบันใช้ (สองระบบวิ่งคู่กันใน POC)

### Future (หลัง POC ผ่าน)

- แทน canonical store ด้วย GenesisBlockDB ผ่าน MSP จริง
- Projection ชนิดที่สอง (agent context packet จาก canonical graph เดียวกัน)
- ขยาย reverse edit เป็นหลาย field / หลาย artifact

## 4. Technical Solution (แนวทางเชิงเทคนิค)

### Architecture Overview

วงจรที่ต้องพิสูจน์ ตรงตาม authority chain ใน `docs/PRD-GoVibe-Platform-Overview.md`:

```text
Markdown artifact (docs/roadmap)
  -> Deep Scan stages 1-3
  -> observed candidates (document / atom / link + hash + provenance)
  -> Promotion Runner -> MSP boundary (stub, contract-conformant)
  -> canonical records (gks: refs)  [Canonical Store, file-backed]
  -> View Compiler
  -> MissionSnapshot roadmap slice  [ไม่ผ่าน roadmap parser เดิม]
  -> Mission Control board + provenance badge

Reverse path (หนึ่ง field):
  board edit -> MissionCommand -> canonical record update
  -> recompile view -> Markdown export สะท้อนการเปลี่ยน
```

**Key Components**

- **Promotion Runner**: consumer ตัวแรกของ materialization contract — ห้ามข้าม validator, ห้ามเขียน store ตรงถ้า MSP ปฏิเสธ
- **MSP Stub**: implement schema ที่ `packages/govibe-core/src/canonical-materialization.mjs` ตรวจ (mapping ครบทุก candidate, ไม่ reuse candidate ref, hash ถูกรูป) — เป็น stub ที่ซื่อสัตย์ต่อ contract ไม่ใช่ bypass
- **Canonical Store**: append-only JSON store ใต้ .govibe ของ workspace; ทุก record มี canonical ref, source hash, promoted-at, candidate lineage
- **View Compiler**: pure function `canonical graph -> view model` — determinism คือคุณสมบัติที่ต้องทดสอบ ไม่ใช่คำอ้าง

### Data Contracts

- Canonical ref: ต้องขึ้นต้น `gks:` และห้ามเป็น candidate ref (บังคับโดย validator เดิม)
- ทุก record ผูก SHA-256 ของ source ณ เวลา scan — rescan แล้ว hash เปลี่ยน = candidate ใหม่ ไม่ overwrite canonical เดิมเงียบ ๆ (สอดคล้อง replay rule ใน `docs/architecture/ARCH-Vault-and-Context-Model.md`)
- View model: slice ของ `MissionSnapshot` ที่มีอยู่ใน `src/mission.ts` — ไม่สร้าง type ใหม่ถ้าไม่จำเป็น
- View output ต้องประกาศ **graph revision, view definition, template version, generated timestamp** ตาม CSIR-FR-041 และเก็บ canonical refs สำหรับ reverse mapping ตาม CSIR-FR-042
- Reverse edit เป็น **semantic delta** ตามศัพท์ SRS: ตรวจ base revision ก่อน apply (CSIR-FR-051), field นอก edit set ต้องไม่เปลี่ยน (CSIR-FR-053), และเดินผ่าน canonicalization/authority path เดียวกับ candidate ปกติ (CSIR-FR-054)

### จุดตัดสินใจสำคัญ

| ประเด็น | ตัดสินใจ | เหตุผล |
| --- | --- | --- |
| ใช้ GenesisBlockDB จริงไหม | ไม่ — file-backed **reference backend** ที่ implement port เดียวกัน | ตรงตาม ADR-025 backend-neutral port และ SRS §8 ที่กำหนด "in-memory reference backend" เป็นแนวทาง conformance; CSIR-FR-060..066 |
| MSP จริงหรือ stub | stub ที่ conform contract | สิ่งที่ต้องพิสูจน์คือ "boundary ถูกเดินจริง" ไม่ใช่ "auth ทำงาน" |
| แตะ roadmap parser เดิมไหม | ไม่แตะ — วิ่งคู่กัน | ระบบปัจจุบันต้องไม่พัง; การเทียบผลสองทางคือ test อย่างหนึ่ง |
| Reverse edit กี่ field | หนึ่ง field (status) | เล็กที่สุดที่ยังพิสูจน์ round-trip ได้จริง |

## 5. Risks (ความเสี่ยง)

| Risk | Impact | Probability | Mitigation |
| --- | --- | --- | --- |
| Atom identity churn: rescan แล้ว candidate ได้ ref ใหม่ ทำ canonical lineage ขาด | High | High | ตรึง source hash ต่อ record; ถ้า hash เดิม → reuse candidate ref เดิม; บันทึกกรณี churn เป็นข้อมูลวิจัย ไม่ซ่อน |
| MSP stub เพี้ยนจาก contract จริงในอนาคต | High | Medium | stub ต้องผ่าน validator เดิมทุก call; ห้ามแก้ validator เพื่อให้ stub ผ่าน |
| View Compiler กลายเป็น roadmap parser ตัวที่สอง (อ่าน Markdown ทางลัด) | High | Medium | test บังคับ: POC path ห้าม import โมดูล parser เดิม; input ของ compiler คือ canonical store เท่านั้น |
| Reverse edit ทำ source doc เสียหาย | Medium | Low | V0 export เป็นไฟล์ใหม่ (ไม่เขียนทับ source); diff ต้อง bounded เฉพาะ field ที่แก้ |
| Scope creep ไปทำ PRD semantics | Medium | High | ขอบเขต = roadmap items เท่านั้น; ทุกอย่างนอกนั้นเข้า backlog ของ V1 |

## 6. Implementation Plan (แผนดำเนินการ)

| Phase | งาน | นิยามเสร็จ | ประมาณการ |
| --- | --- | --- | --- |
| 0. Contract freeze | ทบทวน materialization/replay contracts, ตรึง schema ที่ POC ใช้ | ไม่มีการแก้ contract ระหว่าง POC | 1d |
| 1. Promotion Runner | candidates → MSP stub → validated mappings | validator ผ่านกับเอกสาร roadmap จริงอย่างน้อย 1 ไฟล์ | 2–3d |
| 2. Canonical Store | append-only store + gks: refs + hashes | records อ่านกลับได้, ห้าม overwrite เงียบ | 1–2d |
| 3. View Compiler | canonical graph → MissionSnapshot slice | บอร์ดแสดงผลโดยไม่แตะ parser เดิม | 2–3d |
| 4. Provenance surface | badge/inspector ต่อ item → lineage เต็มสาย | คลิก item เห็น canonical→candidate→source+hash | 1–2d |
| 5. Reverse edit | status edit → canonical update → recompile → export | Markdown export สะท้อนการแก้, diff bounded | 2–3d |
| 6. Evidence report | determinism test, เทียบผลกับ parser เดิม, สรุปผล | CI เขียว + รายงานผล POC | 1–2d |

**รวม: 10–16 วันพัฒนา (~2–3 สัปดาห์ปฏิทิน)**

## 7. Testing Strategy (กลยุทธ์ทดสอบ)

รันด้วย vitest ตาม config ปัจจุบัน (collect จาก packages และ scripts)

| ชนิด | ครอบคลุม | เกณฑ์ผ่าน |
| --- | --- | --- |
| Unit | Promotion Runner mapping, store invariants (no silent overwrite, no candidate-ref reuse) | เคส reject ของ validator เดิมยังทำงานครบ |
| Integration | วงจรเต็ม: ไฟล์จริง → scan → promote → store → compile → view model | view model มี item ครบเทียบกับ source |
| Determinism | รัน compile ซ้ำจาก store เดิม | ผลลัพธ์ byte-identical |
| Parity | เทียบ view จาก canonical path กับผลของ parser เดิมบนไฟล์เดียวกัน | field ที่ทับซ้อนตรงกัน; ความต่างถูกอธิบายได้ทุกจุด |
| Round-trip | edit status → export | diff จำกัดเฉพาะ field ที่แก้; field อื่นไม่เปลี่ยน |
| Negative | candidate ref ซ้ำ, hash ผิดรูป, mapping ไม่ครบ | throw ตาม validator เดิมทุกกรณี |

Gate สุดท้าย: `npm run baseline:check` ต้องเขียว (docs:validate + lint + build)

## 8. Success Metrics (เกณฑ์ตัดสิน POC — falsifiable)

| # | เกณฑ์ | วัดอย่างไร | Trace ไปยัง SRS |
| --- | --- | --- | --- |
| 1 | บอร์ด render จาก canonical graph โดย **ศูนย์การเรียก** parser เดิมใน path นี้ | test ยืนยัน dependency graph ของโมดูล POC | CSIR-FR-040 |
| 2 | ทุก item มี provenance ครบสาย canonical → candidate → source + hash | integration test + ตรวจด้วยตาบน UI | CSIR-FR-002, FR-031, NFR-008 |
| 3 | Compile ซ้ำจาก store เดิมได้ผล byte-identical | determinism test | CSIR-FR-044, NFR-007 |
| 4 | Round-trip หนึ่ง field สำเร็จ โดย diff bounded และ field อื่นคงเดิม 100% | round-trip test | CSIR-FR-050..055, NFR-006 |
| 5 | ไม่มีการ bypass MSP boundary (ทุก write ผ่าน validated mapping) | unit + code review | CSIR-FR-025, FR-054 |

**POC ล้มเหลวถ้า:** ข้อใดข้อหนึ่งใน 1–5 ทำไม่ได้ภายใน timebox — ผลล้มเหลวก็เป็น deliverable (บันทึกสาเหตุเชิงสถาปัตยกรรม เพราะมันคือคำตอบของ open research question)

## 9. Open Questions (คำถามค้าง)

| # | คำถาม | สถานะ |
| --- | --- | --- |
| 1 | Atom identity ควร key ด้วยอะไรเมื่อ heading ถูก rename (hash เปลี่ยนแต่ semantics เดิม) | เปิด — POC จะให้ข้อมูล churn จริง; ทุก decision ต้องบันทึกเป็น `reuse` / `create` / `conflict` / `human_review` ตาม CSIR-FR-013 |
| 2 | Export Markdown ควรเป็นไฟล์ projection แยก หรือเขียนกลับ source ใน V1 | เปิด — V0 เลือกไฟล์แยกเพื่อความปลอดภัย |
| 3 | เมื่อไรจึงสลับ file-backed store เป็น GenesisBlockDB | หลัง POC ผ่านเกณฑ์ครบ 5 ข้อ |

## 10. Implementation Evidence (2026-08-04)

POC ถูก implement แล้วเป็นโค้ดคู่ขนานใต้ `packages/govibe-core/src/poc/` — ไม่แตะ runtime path เดิม

| Module | หน้าที่ | Requirement ที่รองรับ |
| --- | --- | --- |
| `candidate-extractor.mjs` | semantic front-end: Markdown → Candidate Semantic IR พร้อม source locator + hash | CSIR-FR-001..006 |
| `msp-stub.mjs` | authority boundary: mint canonical identity, identity decision, conflict record | CSIR-FR-010..015, FR-022/023, FR-030/031 |
| `promotion-runner.mjs` | ทางเขียนเดียวสู่ canonical ผ่าน `materializeCanonicalKnowledge` | CSIR-FR-020/025 |
| `canonical-store.mjs` | reference backend หลัง backend-neutral port (append-only revisions) | CSIR-FR-024, FR-060..066 |
| `view-compiler.mjs` | projection จาก declared graph revision พร้อม manifest | CSIR-FR-040..045 |
| `semantic-delta.mjs` | reverse path: base-revision check + bounded edit set | CSIR-FR-050..055 |
| `markdown-projection.mjs` | generated view; ประกาศ revision และ `source_of_truth: false` | CSIR-FR-041/043/045 |

### ผลการทดสอบ

`packages/govibe-core/src/poc/canonical-loop.test.mjs` — **21/21 ผ่าน**; full suite `npm test` 235 ผ่าน (1 skipped); `npm run baseline:check` exit 0

| เกณฑ์ | ผล | หลักฐาน |
| --- | --- | --- |
| 1. View จาก canonical graph, ศูนย์การเรียก parser เดิม | ผ่าน | test สแกน import ของทุกโมดูล POC — ไม่มี reference ถึง `roadmap-parser` |
| 2. Provenance ครบสาย | ผ่าน | ทุก node มี `candidateRef` + `sourcePath` + `sourceSection` + `sourceHash` |
| 3. Determinism | ผ่าน | recompile byte-identical; `contentHash` คงที่เมื่อเปลี่ยนเฉพาะ clock |
| 4. Round-trip หนึ่ง field | ผ่าน | `state: planned → done`; field อื่นคงเดิมทั้งหมด; Markdown diff จำกัดเฉพาะแถวที่แก้ + manifest hash |
| 5. ไม่มี bypass MSP | ผ่าน | rogue/partial MSP ถูก validator ปฏิเสธและ store ยังว่าง; direct GKS ยังปิด |

### ผลเพิ่มเติมที่ได้จาก POC

- **Identity churn (คำถามค้างข้อ 1) มีคำตอบเบื้องต้น:** candidate ref ผูกกับ logical key (`sourcePath#id`) ไม่ใช่ wording — การ rewrite ชื่อเรื่องแบบรักษาความหมายให้ `decision: reuse` และ canonical ref เดิม ขณะที่ `source_hash` เปลี่ยน (ทดสอบแล้ว) ข้อจำกัดที่ยังเปิด: ถ้า **ID** ในเอกสารเปลี่ยน identity จะขาด — ต้องใช้ resolution ที่ลึกกว่า logical key ใน V1
- **Idempotence:** promote ซ้ำด้วยเนื้อหาเดิมไม่สร้าง revision ใหม่
- **Multi-view:** `roadmap-board` และ `backlog` compile จาก revision เดียวกันได้ พร้อมรายงาน `omitted`
- **Parity:** เทียบกับ parser เดิมบน `docs/roadmap/BACKLOG-p1-mvp-core.md` — canonical view ครอบคลุม node ทุกตัวที่ parser เดิมพบ และ `title`/`state` ตรงกัน

### ส่วนที่เกินขอบเขต V0 ที่ตัดสินใจทำเพิ่ม

เพิ่มการสกัด checklist ใน `## Task Breakdown` (นอกเหนือจาก table) เพราะจำเป็นต่อการพิสูจน์ parity กับ parser เดิมบนเอกสารจริง — ถ้าไม่ทำ ต้องลดเกณฑ์ parity ลงแทน ซึ่งจะทำให้หลักฐานอ่อนกว่าที่ TDD กำหนด

### ข้อจำกัดที่ต้องระบุอย่างซื่อสัตย์

- MSP เป็น stub ใน process เดียวกัน ไม่มี auth/network — พิสูจน์ได้แค่ว่า **boundary ถูกเดินจริง** ไม่ได้พิสูจน์ authorization
- Canonical store เป็น reference backend แบบไฟล์ ยังไม่ได้ทดสอบกับ GenesisBlockDB adapter (CSIR-NFR-009 ยังไม่ครอบคลุม)
- ครอบคลุม view เดียวจาก 4 view ที่ SRS §7 กำหนด; PRD Markdown / Jira JSON / Agent context ยังไม่ทำ
- ยังไม่ได้วัด NFR เชิงตัวเลข (identity preservation ≥95%, false merge ≤2%) — ต้องมี labeled fixture set ก่อน
- `src/mission-auth-bootstrap.test.ts` มี flake ที่มีอยู่เดิม (reassign `window.fetch`) ล้มเป็นครั้งคราวเมื่อรันทั้ง suite ไม่เกี่ยวกับ POC

## 11. Rollback / Exit

POC เป็นโค้ดคู่ขนาน ไม่แตะ runtime path เดิม — exit คือ (a) ผ่านเกณฑ์ → เขียน Blueprint สำหรับ V1 ตาม Docs-First workflow หรือ (b) ไม่ผ่าน → เก็บ evidence report แล้วถอดโค้ด POC ออกได้โดยไม่กระทบระบบเดิม

**สถานะ exit:** ผ่านเกณฑ์ทั้ง 5 (2026-08-04) → เส้นทางต่อไปคือ Blueprint V1 ซึ่งต้องครอบคลุมอย่างน้อย: view ที่เหลือของ SRS §7, GenesisBlockDB adapter conformance (CSIR-NFR-009), labeled fixture สำหรับวัด NFR-002/003, และการสลับ Mission Control roadmap path มาใช้ canonical projection

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 1.0.0 | 2026-08-04 | Boss / ATHER | Ratified; POC implemented under `packages/govibe-core/src/poc/` with 21 passing tests and evidence recorded for all five acceptance criteria. |
| 0.2.0 | 2026-08-03 | Boss / ATHER | Aligned with merged SRS-Canonical-Semantic-IR (#91): declared as vertical slice 1 of SRS section 7, traced success metrics to CSIR requirement IDs, adopted semantic-delta terminology and view-manifest fields. |
| 0.1.0 | 2026-08-03 | Boss / ATHER | Initial POC design for the canonical graph-to-view loop. |
