---
doc_id: "BRD-GOVIBE-PLATFORM"
uid: "01KVXGFTDVRFN6T3PPZE2EFCGT"
title: "GoVibe — Business Requirements Document & Business Overview"
status: "draft"
version: "0.1.1+draft"
content_hash: "atom:0bc388242adad9f4"
updated: "2026-06-22"
owner: "Boss (CEO)"
source_of_truth: true
type: brd
tags:
  - business
  - governance
  - vision
  - strategy
  - agentic-ai
---

# GoVibe — BRD & Business Overview

> **One-liner:** GoVibe is the **governance + interoperability layer for multi-agent software development** — the "rule-keeper" that lets a company's AI agent teams (swarms) build software to one **shared, enforced, traceable standard**, riding on open protocols (MCP/A2A) instead of replacing the tools developers already use. Each team keeps its own conventions; **GKS is the internal interlingua** GoVibe translates through (`A1 ⇄ GKS ⇄ A25`) — not *spoken to* users, but inspectable in full-eco use.

---

## 1. Business Overview (ภาพรวมเชิงธุรกิจ)

ทุกวันนี้ทีมพัฒนา "vibe-code" — ใช้ AI agent ของตัวเอง (Cursor, Copilot, Claude Code, custom swarm) สร้างโปรแกรมออกมาเร็วมาก **แต่ไม่มีมาตรฐานเดียวกันในระดับบริษัท**: เอกสารไม่ตรงกับโค้ด, ไม่มี traceability, สถาปัตยกรรม drift, แต่ละทีม/แต่ละ agent ทำคนละทาง

GoVibe **ไม่แข่งกับเครื่องมือเขียนโค้ด เครื่องมือ memory หรือ orchestrator** — มันวางตัวเป็น **ชั้นกำกับดูแล (governance) + ตัวเชื่อม (interop)** ที่อยู่เหนือ/ขวางเครื่องมือเหล่านั้น โดย:
- **อ่าน "โค้ด" (artifact สากล) ไม่ใช่ "framework" (producer)** → ไม่ต้องทำ adapter ต่อเฟรมเวิร์ก
- **ออกคำสั่ง/ควบคุมผ่าน MCP** (โปรโตคอลที่ Cursor/Claude/Gemini พูดได้อยู่แล้ว) → adopt โดยไม่ทิ้งของเดิม
- **บังคับมาตรฐานด้วย Execution-Governance gate** (Complexity × H-scale × W-scale) → งานทุกชิ้นวิ่งผ่าน intent→doc→(diagram/spec)→code ตามระดับความซับซ้อน พร้อม traceability

**Category:** Governance-over-codegen / Agent-swarm coordination & standardization.

---

## 2. Problem Statement (ปัญหา)

| # | ปัญหา | ผลกระทบเชิงธุรกิจ |
|---|---|---|
| P1 | AI สร้างโค้ดเร็วเกินกว่าที่ governance จะตามทัน | tech-debt, security drift, ไม่มีใครรู้ว่า agent ทำอะไรไปบ้าง |
| P2 | แต่ละ dev/agent ใช้มาตรฐานคนละชุด | โค้ดบริษัทไม่เป็นเอกภาพ, onboarding ยาก, integration พัง |
| P3 | doc ↔ code drift | เอกสารโกหก, decision ไม่ traceable, audit ไม่ได้ |
| P4 | ทีมมี agent swarm ของตัวเองแล้ว แต่ swarm ข้ามทีมคุยกันไม่ได้ภายใต้กฎเดียวกัน | ทำงานร่วมข้ามทีม/ข้ามองค์กรไม่ได้อย่างปลอดภัย |

> *หลักฐานเชิงประจักษ์:* การ audit ตัว GoVibe เองพบ doc↔code drift, FEAT ที่ติดป้าย approved แต่ไม่มีโค้ด, และ governance ที่ "เขียนไว้แต่ไม่ถูกบังคับ" — ปัญหาเดียวกับที่ลูกค้าจะเจอ คือเหตุผลที่ผลิตภัณฑ์นี้มีที่ยืน

---

## 3. Vision

**"ใครจะ vibe-code ด้วย agent อะไรก็ได้ — แต่ผลลัพธ์ต้องผ่านกฎเดียวกัน และตรวจสอบย้อนได้เสมอ"**

GoVibe เป็น **central governance ที่ขี่บนมาตรฐานเปิด** (MCP/A2A) ไม่ใช่มาตรฐานใหม่ที่แข่งกับเขา — เป้าหมายระยะยาวคือเป็น **แพลตฟอร์มกลางให้ agent-swarm ข้ามทีมทำงานร่วมกัน** (swarm-to-swarm ไม่ใช่แค่ A2A) ภายใต้ธรรมาภิบาลและภาษากลางเดียวกัน

---

## 4. Solution Overview (สถาปัตยกรรมเชิงคุณค่า)

```
   Dev's existing agents/orchestrators (Cursor · Copilot · LangGraph · custom swarm)
                         │  MCP  (govibe:add_feature, ...)        ◄── ไม่ต้องทิ้งของเดิม
                         ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ ★ EXECUTION-GOVERNANCE GATE  (จุดแข็งหลัก / MOAT)             │
   │   Complexity (C0–C3) × H-scale (H0–H6) × W-scale (fan-out)    │
   │   routes: intent→doc→diagram→spec→code  ตามความซับซ้อน        │
   │   enforces: traceability · standard · drift/Tension detection │
   └──────────────────────────────────────────────────────────────┘
                         │  uses (provenance + memory)
                         ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ MSP (Memory OS / passport)  +  GKS (atomic-markdown knowledge)│  ← enabling layer
   │   12-step top-down: ANY codebase → atoms → GKS (zero-migration)│
   │   7-phase bottom-up: intent → doc → spec → code               │
   │   Master Log / Genesis Block: provenance · lineage · hot-swap  │
   └──────────────────────────────────────────────────────────────┘
                         │  storage driver (swappable)
                         ▼
   GenesisBlockDB (embedded graph+vector+governance+bitemporal)  ← perf infra
```

**หัวใจ 3 ข้อ:**
1. **Universal code-in + MCP-out** — รับ "โค้ด" เข้ามา decompose ไม่ว่าจะมีเอกสารหรือไม่ และ **ไม่แตะเอกสารเดิม** (zero-migration) → ไม่ต้องมี per-framework adapter
2. **Governance gate** — งานทุกชิ้นถูกจัดเส้นทาง + บังคับมาตรฐาน + ตรวจ drift ตามระดับ Complexity/H/W
3. **CoDev** — โมดูล swarm-to-swarm interop ข้ามทีม/เจ้าของ ผ่าน GKS pivot + MCP/A2A (ไม่ใช่ bridge เฉพาะ framework, ไม่ใช่แทนที่ orchestrator ของใคร)

### 4.1 The Translator Model — GKS เป็น Interlingua (หัวใจของ interop)

GoVibe ทำตัวเป็น **ล่าม (interpreter)** ไม่ใช่บังคับให้ทุกคนพูดภาษาเดียวกัน:
- **GKS = interlingua (ภาษากลาง/pivot ภายใน) — GoVibe ไม่ *สื่อสารด้วย* GKS (ตอบเป็นภาษา user) แต่ full-eco ดู GKS ได้ผ่าน visual UI (ERD/DAG/node graph)**
- แต่ละทีมใช้ convention ของตัวเอง (userA = รูปแบบ `A1`, userB = `A25`) GoVibe map: **`A1 ⇄ GKS ⇄ A25`**
- เมื่อ agent ของ userA (ที่มี GKS) ถูกติดต่อ → เข้าใจผ่าน GKS แล้ว **ตอบกลับเป็นภาษาระบบ `A1` ของ userA เอง**
- **เศรษฐศาสตร์ของ pivot:** N convention ต้องการแค่ **N mapping (→ GKS)** ไม่ใช่ **N² pairwise** → สเกลได้ และทีม**ไม่ต้องเรียน vocabulary ของ GoVibe** (zero-vocabulary migration)

→ นี่คือ swarm-to-swarm interop จริง: ทีมต่างภาษา/ต่าง agent คุยกันได้โดยไม่ต้อง adopt มาตรฐานร่วม โดยมี GKS เป็น pivot ภายใน (ไม่ใช่ซ่อน — full-eco ดูได้) (ref: `ADR-017`)

---

## 5. Differentiation / Moat (ทำไมถึงป้องกันได้)

| ชั้น | สถานะการแข่งขัน | บทบาทใน GoVibe |
|---|---|---|
| **Governance-over-codegen** (Execution-Governance) | **uncontested** — เครื่องมือ coding ทำให้ agent "เขียนโค้ด" ได้ แต่ไม่มีใครบังคับ "มาตรฐานบริษัทเดียวกันที่ traceable ข้ามทีม" | **MOAT — หัวหอก** |
| **Provenance / Master-Log / Tension-drift** | ทำกันน้อย, ลอกยาก | enabling moat |
| Decomposition (code→atom) | contested (Sourcegraph/SCIP, Augment, Cursor, GitHub) | infra "ดีพอ" / ยืมได้ |
| Generation (intent→code) | contested (Cursor, Cognition/Devin, Copilot, Qodo) | infra "ดีพอ" / **ยืมได้ (govern output ของ Cursor/Copilot ก็ได้)** |
| Embedded graph+vector DB | contested (LanceDB, Kuzu, FalkorDB, Chroma, pgvector) | perf infra (สลับได้) |

**คำเตือนเชิงกลยุทธ์ (honest):** อย่าวางตัวเป็น "มาตรฐาน/central standard เอง" — มาตรฐานชนะด้วย network-effect + coalition และพื้นที่นี้ MCP (Anthropic)/A2A (Google)/Internet-of-Agents (Cisco/LangChain) ครองอยู่ → **วางตัวเป็น "product ที่ขี่บน MCP/A2A"** ชนะกว่า

**Niche beachhead:** Thai/SEA-language (neural bridge) — ตลาดที่เครื่องมือฝั่งสหรัฐไม่ optimize = หัวหาดที่ป้องกันได้

---

## 6. Target Users / Market

- **Primary:** ทีม/บริษัทที่ adopt AI coding แล้วเริ่มเจอ "AI codegen chaos" และต้องการ governance/standardization (eng leaders, architects, platform teams)
- **Secondary:** dev solo/ทีมเล็กที่อยากมีระเบียบ doc-to-code โดยไม่เปลี่ยน workflow
- **Beachhead:** องค์กร SEA/ไทยที่ใช้ AI coding + ต้องการ governance ภาษาท้องถิ่น

---

## 7. Competitive Positioning

**GoVibe ไม่อยู่ในวงเดียวกับ** Cursor/Copilot (codegen), Mem0/Zep (memory), LangGraph/CrewAI (orchestration), Sourcegraph (code intelligence) — มัน **อยู่เหนือ/ขวาง** พวกนี้ในฐานะ governance+interop layer **และขี่บน MCP/A2A** → "เราไม่ใช่คู่แข่งของเครื่องมือคุณ เราคือชั้นที่ทำให้เครื่องมือทุกตัวของคุณทำงานตามกฎเดียวกัน"

---

## 8. Business Requirements (BR)

| ID | Business Requirement | Priority |
|---|---|---|
| BR-1 | บังคับมาตรฐานวิศวกรรมที่ configurable ได้ ข้าม agent/ทีมที่ต่างกัน **โดยไม่บังคับให้เปลี่ยน orchestrator** | MUST |
| BR-2 | ควบคุม/สั่งงานผ่าน **MCP** เป็นหลัก (`govibe:add_feature` ฯลฯ) | MUST |
| BR-3 | รับโค้ดเดิม (มี/ไม่มีเอกสาร) มาสร้าง knowledge base **โดยไม่แก้เอกสารเดิม** (zero-migration) | MUST |
| BR-4 | route งานตามความซับซ้อน (intent→doc→diagram→spec→code) ด้วย Complexity×H×W gate | MUST |
| BR-5 | ทุก artifact ต้อง **traceable** (intent→doc→spec→code→test→evidence) + ตรวจ drift ได้ | MUST |
| BR-6 | backend storage **สลับได้** (GenesisBlockDB / อื่น) | SHOULD |
| BR-7 | รองรับ swarm-to-swarm collaboration ผ่าน CoDev | SHOULD (phase 2+) |
| BR-8 | รองรับภาษาไทย/SEA เป็น first-class | SHOULD |

---

## 9. Scope (In / Out)

**In (deep-but-narrow ก่อน):**
- govern + trace output ของ agent ที่พูด **MCP** (รวมถึง govern output ของ Cursor/Copilot)
- Execution-Governance gate + provenance/Master-Log + GKS ingestion
- MVP: "govern AI-codegen ผ่าน MCP" บนภาษา/เฟรมเวิร์กชุดแคบ

**Out (ยังไม่ทำตอนนี้):**
- broad-translation ทุก orchestrator framework (adapter ระเบิด — ขัดกับ solo capacity)
- การแข่ง decomposition/generation ให้ดีกว่า Sourcegraph/Cursor
- การประกาศตัวเป็น interop standard เอง

---

## 10. Business Model (ต้องพิสูจน์ — options)

- **Open-core:** engine/SDK เปิด (adoption) + governance/enterprise features (audit, RBAC, multi-team, SSO) แบบจ่ายเงิน
- **Governance SaaS:** per-seat / per-repo สำหรับทีมที่ต้องการ traceability + standardization
- **Design-partner ก่อน:** หา 1–3 ทีม SEA เป็น design partner เพื่อ validate willingness-to-pay ก่อนตั้งราคา

> *ยังไม่ commit โมเดล* — ต้อง validate กับ design partner จริงก่อน

---

## 11. Success Metrics (KPIs)

- **Adoption:** # teams/agents ที่ route งานผ่าน GoVibe MCP; # repos ที่ ingest เข้า GKS
- **Governance value:** % artifacts ที่ traceable end-to-end; # drift/Tension events ที่จับได้ก่อน merge
- **Stickiness:** retention ของ design partner; เวลาที่ลด onboarding/standardization
- **Wedge proof:** มีทีมที่ใช้ Cursor/Copilot อยู่แล้ว adopt GoVibe **โดยไม่เปลี่ยนเครื่องมือเดิม**

---

## 12. Risks, Constraints & Assumptions (honest)

| ประเภท | รายการ | การลดความเสี่ยง |
|---|---|---|
| **Constraint** | Solo dev → bus-factor=1; ต้อง sustain หลาย surface | โฟกัส moat (governance) + ยืม infra (codegen) + deep-but-narrow |
| **Risk** | thesis แขวนบน "ถ้า GKS/decomposition สมบูรณ์" ซึ่งยากและ contested | อย่ารอสมบูรณ์ — ส่ง MVP governance-over-codegen ที่ใช้ codegen ของคนอื่นไปก่อน |
| **Risk** | "central standard" framing แพ้ network-effect | reposition เป็น product ที่ขี่ MCP/A2A |
| **Risk** | enterprise ไม่ฝาก governance ไว้กับ solo/early product | open-source core + design partner + การ audit ที่โปร่งใส |
| **Risk** | decomposition reliability (เคยเจอ "Knowledge Packaging Error") | scope ภาษา/เฟรมเวิร์กแคบก่อน, human-in-loop ที่ promote |
| **Assumption** | MCP/A2A ยังเป็นมาตรฐานเปิดที่ adoption โต | ติดตาม; ออกแบบให้ขี่มาตรฐาน ไม่ผูกขาด |
| **Assumption** | "AI codegen governance" เป็น pain ที่ลูกค้าจ่ายเงินแก้ | validate กับ design partner ก่อนลงทุนหนัก |

---

## 13. Phased Direction (high-level)

1. **MVP — Govern-the-codegen:** ผ่าน MCP, govern output ของ agent (รวม Cursor/Copilot), บังคับ Execution-Governance gate + traceability บน scope แคบ → พิสูจน์ว่า governance เป็น pain ที่จ่ายเงิน
2. **Beachhead — SEA/Thai:** design partners, ภาษาไทย first-class
3. **Deepen — GKS/Provenance:** Master-Log + Tension/drift เป็น differentiator
4. **Expand — Swarm-to-swarm (CoDev):** เชื่อมข้ามทีม/orchestrator เมื่อ moat ตั้งหลักได้แล้ว

---

## 14. Glossary

| ศัพท์ | ความหมาย |
|---|---|
| **Execution-Governance gate** | กลไกบังคับมาตรฐาน: Complexity (C0–C3) × H-scale (H0–H6 context) × W-scale (fan-out) — จุดแข็งหลัก |
| **MSP** | Memory & Soul Passport — Memory OS ที่เดินทางไปกับ agent (sessions/episodic/retrieval/validator) |
| **GKS** | Genesis Knowledge System — atomic-markdown SSOT + index (Storage Layer) |
| **GenesisBlockDB** | engine graph+vector+governance+bitemporal แบบ embedded (backend, สลับได้) |
| **Genesis Block / Master Log** | หน่วยความรู้ที่รวมหลายมิติ + ดัชนี provenance/lineage ที่ hot-swap ได้ |
| **CoDev** | โมดูล interop สำหรับ swarm-to-swarm |
| **12-step / 7-phase** | top-down decomposition (code→atoms) / bottom-up generation (intent→code) |

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1+draft | 2026-06-22 | Boss (CEO) | Corrected "hidden GKS" → internal pivot (not *spoken to* users, but inspectable in full-eco UI) at L20/§4.1; reworded CoDev from "bridge เข้า LangGraph" → swarm-to-swarm interop via GKS pivot + MCP/A2A (no per-framework bridge). |
| 0.1.0+draft | 2026-06-22 | Boss (CEO) | Initial BRD + business overview synthesizing vision (governance-over-codegen moat, MSP+GKS enabling, MCP-first, swarm-to-swarm, honest risks). |
