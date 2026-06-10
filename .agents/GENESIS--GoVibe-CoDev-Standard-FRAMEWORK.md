---
title: GENESIS::GoVibe-CoDev-Standard-FRAMEWORK
doc_id: GENESIS::GoVibe-CoDev-Standard-FRAMEWORK
type: genesis
block_id: GB-3A-G001
status: stable
vault_id: default
source_type: axiomatic
summary: Block Manifest ร่มคันใหญ่ (Runtime Entry-point) ที่ห่อหุ้มกฎเชิงนโยบาย (Master), กรอบการทำงานเชิงทฤษฎี (Framework) และคู่มือปฏิบัติการ (Runbook) สำหรับ AI Agent
tags:
  - architecture
  - genesis
  - cognitive-engine
  - manifest
created_at: "2026-06-02T19:40:00+07:00"
manifest_version: "1.0"
daci:
  driver: GKS Parser Engine
  approver: System Architect
  contributor: AI Agents
  informed: Development Team
members:
  core:
    cognitive: 
    algo: 
    runbook: 
    concept:
    params: 
  optional:
    mod: [MOD--COGNITIVE]
framework: 
  title: [[FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS]]
  version: "1.3.0b"
---   
# 👑 GENESIS--COGNITIVE-ENGINE

**GKS Cognitive Engine Manifest (Runtime Entry-point)**
เอกสารบัญชีรายชื่อ (Manifest) ระดับสูงสุดที่รวบรวม "สมอง" และ "กฎเกณฑ์" ทั้งหมดที่ควบคุม AI Agent ภายใน GKS (Genesis Knowledge System) 
เอกสารนี้ทำหน้าที่เสมือนตัวบอกทิศทางให้ AI รับรู้ถึงสภาพแวดล้อม ขอบเขต และขั้นตอนการทำงานอย่างเป็นระบบ

# Knowledge Block Instruction

ตัวอย่างเช่น
Module Stock 
Boot sequence:
1. CONCEPT--Automatic-Stock-Deduction
2. ALGO--FEFO-Standard
3. RUNBOOK--Standard-Order-Processing


[ TRIGGER ]: เกิดเหตุการณ์ลูกค้าชำระเงินสำเร็จ (Event: ORDER_PAID)
    │
    ▼
 1. CONCEPT::Automatic-Stock-Deduction (เริ่มทำงานทันทีเบื้องหลัง)
    │
    ├───► [Runbook::Standard-Order-Processing Step 1 & 2]: ดึงงานจากคิวและตั้งค่าตัวแปรต้น
    └───► [Read Input PARAMS::Automatic-Stock-Deduction]: 
    │      • Order_ID: "ORD-2026-0001"
    │      • Product_ID: "PROD-101"
    │      • Required_Qty: 5
    │      • Location_ID: "WH-BANGKOK-01"
    │      • Trigger_Time: "2026-06-07T14:35:00Z"
    │
    ▼
 2. ALGO::FEFO-Standard (ประมวลผลเลือกล็อตสินค้า)
    │
    ├───► [Runbook::Standard-Order-Processing Step 3]:  ค้นหาฐานข้อมูล (Database Query)
    │      • ดึงข้อมูลสต็อกที่มี Current_Qty > 0 และ Expiry_Date > Current_Date (2026-06-07)
    │
    ├───► [Read Process PARAMS::Automatic-Stock-Deduction]: ระบบตรวจพบข้อมูลสต็อก 2 ล็อตในฐานข้อมูล:
    │      • แถวที่ 1 ── Lot_No: "LOT-A" | Current_Qty: 10 | Expiry_Date: "2026-07-01" (เดือนหน้า)
    │      • แถวที่ 2 ── Lot_No: "LOT-B" | Current_Qty: 20 | Expiry_Date: "2027-06-01" (ปีหน้า)
    │
    ├───► [Runbook::Standard-Order-Processing Step 4]: ทำการจัดเรียงและคำนวณจ่ายออก
    │      • จัดเรียง (Sorting): เรียง Expiry_Date จากน้อยไปมาก ──► [LOT-A] แล้วตามด้วย [LOT-B]
    │      • วนลูปตรวจสอบ (Loop Logic): ตั้งตัวแปร Remaining_Needed = 5
    │      • ตรวจสอบล็อตแรก [LOT-A]: พบ Current_Qty (10) ≥ Remaining_Needed (5)
    │      • สรุปผลลัพธ์ลูป: เลือกตัดสต็อกสินค้าจาก "LOT-A" จำนวน 5 ชิ้น (ครบตามจำนวน จบลูป)
    │
    ▼
 [ RESULTS ]: CONCEPT & DATABASE MUTATION (ลงมือทำจริง)
    │
    ├───► [Runbook::Standard-Order-Processing Step 5]: อัปเดตข้อมูลและบันทึกประวัติ (Database Commit)
    │      • สั่งคำสั่ง SQL หักลบยอดจริง: UPDATE Stock SET Current_Qty = 5 WHERE Lot_No = "LOT-A"
    │      • บันทึกประวัติ (Stock Transaction Log): ใส่ค่า Order_ID, Product_ID, Lot_No, Deducted_Qty
    │
    ├───► [Runbook::Standard-Order-Processing Step 6]: ส่งสัญญาณแจ้งผลสำเร็จ (Emit Event)
    └───► [Generate Output Parameters]: 
           • Status_Code: "SUCCESS"
           • Deducted_Lots: [{"Lot_No": "LOT-A", "Qty": 5}]
    │
    ▼
[ NEXT STEP ]: ระบบคลังสินค้าได้รับสถานะ SUCCESS พร้อมพิกัดล็อตสินค้า จึงทำการพิมพ์ใบหยิบสินค้า (Picking Slip) ระบุให้พนักงานเดินไปหยิบของจาก "LOT-A" จำนวน 5 ชิ้น เพื่อแพ็คส่งให้ลูกค้าได้ทันที



# Documents Builder Instruction
## Product Requirements Document (PRD): GoVibe Platform

### 1. Executive Summary

**Product Name:** GoVibe
**Tagline:** AI-Native Visual Vibe Code Platform (🇹🇭 "Visual Vibe Code Platform ของไทย")
**Philosophy:** "No coding No problem"
**Platform Target:** Desktop (Tauri v2 + Rust), Web (React), Mobile (Capacitor)

GoVibe is a next-generation integrated development environment and project management platform designed specifically for orchestrating multi-agent AI teams. It replaces traditional fragmented tools (like Linear for tasks, GitHub for code, and Obsidian for knowledge) by unifying them into a highly visual, cyber-themed "Mission Control" dashboard. GoVibe acts as the ultimate orchestrator where human developers (Boss/Lead) and AI agents (EVA, Qwen, UAT) collaborate in real-time.

### 2. Product Vision & Goals

#### 2.1 Vision
To create a seamless, zero-friction workspace where AI agents are treated as native team members with distinct roles, capabilities, and visual presence, all orchestrated through a high-fidelity, visually immersive interface.

#### 2.2 Core Goals
1.  **Unified Multi-Agent Orchestration:** Provide a single source of truth for task assignments, file locking, and status tracking (replacing Linear).
2.  **Immersive Visual Experience:** Deliver a "Glassmorphism 2.5" UI with 3D interactions, telemetry visualizations, and real-time feedback that feels like a sci-fi command center.
3.  **Knowledge Graph Integration (GenesisBlockDB):** Visually map ASTs, system architecture, and product specs using vector embeddings and graph databases to give agents deep context.
4.  **Hardware-Level Telemetry:** Monitor and visualize agent token usage, LLM costs, and local GPU thermal loads in real-time.

### 3. Target Audience & Personas

| Persona / Role | Tier | Key Needs | Target Models (Cloud & Local) |
| :--- | :--- | :--- | :--- |
| **USER (Human)** | N/A | Approves specs, reviews architecture (ADRs), final PR merge. | N/A (Human) |
| **Lead Agent** | **T3 (Architect/Lead)** | Plans features, writes IMPs, reviews PRs, manages file locks. | Opus 4.7, gemini-3.1-pro-preview, gpt-5.5-pro, qwen3.7-plus / gemma-4:12B, Qwen3.0:14B |
| **Teammate (Senior)** | **T2 (Senior Implementer)** | Claims complex tasks, writes code, runs tests. | Sonnet 4.5, gemini-3.5-flash, gpt-5.3-codex, qwen3.7-plus / gemma4:e2b, sushirl:9B |
| **Teammate (Junior)** | **T1 (Junior/Routine)** | Claims routine tasks, bug fixes, documentation. | Haiku 4.5, gemini-2.5-flash, gpt-5.2-codex, qwen3.7-plus / qwen3.5:4B, llama3.2:1B |
| **Auditor Agent** | **Auditor** | Reviews code against Design Systems and Security specs. | Any mid or high tier model |

### 4. Key Features & Functional Requirements

#### 4.1 Mission Control Center (The Dashboard)
- **Domain Overview (A):**
  - Real-time LLM telemetry (Cost, Token limits, Execution time).
  - Roadmap Tracker: Phase-based (Phase 0-4) accordion checklist with progress bars.
  - Interactive Agent Roster: 3D Raycast-style flip cards to configure agents (Prompts, Temp, API Keys).
- **Genesis Knowledge System (B):**
  - AST (Abstract Syntax Tree) Explorer for code relationships.
  - Interactive 2D/3D Graph Studio (Cytoscape.js) for system mapping.
- **Block DB (C):** ERD and schema visualizations for GenesisBlockDB.
- **AI Benchmark (D):** Hardware telemetry (Thermal headroom) and agent benchmarking metrics.

#### 4.2 GoVibe Task Coordination (The Multi-Agent Protocol)
- **Status Management:** Draft -> Todo (Locked) -> WIP -> Review -> Done.
- **Self-Claiming:** Agents pull tasks from the Todo queue based on capabilities.
- **File Locking System:** Agents declare exclusive file locks via GoVibe to prevent merge conflicts (e.g., locking `schema.prisma`).
- **Plan Approval Gate:** Lead agent must approve plans before implementation begins.

#### 4.3 WebSocket Reactor (WS Reactor)
- Real-time bi-directional sync between the Rust backend (Tauri) and React frontend.
- Live updates for agent status (Idle, Active, Offline), task progress, and telemetry.

###  5. Technical Architecture (High-Level)

- **Monorepo:** Turborepo managing shared configs, UI components, and apps.
- **Frontend (Visuals):** React 18, TypeScript, Tailwind CSS, Framer Motion (for 3D/animations), Chart.js, Cytoscape.js.
- **Backend (Desktop):** Tauri v2 (Rust) for native OS capabilities, file system access, and fast execution.
- **Database:** GenesisBlockDB (Rust-based embedded graph/vector DB).

### 6. Non-Functional Requirements
- **Performance:** UI must maintain 60 FPS during 3D card flips and graph rendering.
- **Themeing:** Seamless toggle between Cyber-Dark (Default) and Vibe-Light themes.
- **Security:** API keys and credentials configured in Agent cards must be stored securely (e.g., Tauri secure enclave/keyring).
- **Scalability:** The UI must support managing teams of 5+ agents simultaneously without visual clutter.

### 7. Success Metrics & KPIs
1.  **Agent Utilization:** % of time agents spend active vs. idle/blocked.
2.  **Cycle Time:** Average time from Task Creation (Todo) to PR Merge (Done).
3.  **Conflict Rate:** Number of Git merge conflicts (Should approach 0 due to File Locking).
4.  **UI Performance:** Render time < 16ms per frame on standard hardware.

### 8. Development 
 Masterplan > Roadmap > Phases > Epics > Sprints > Tasks > Subtasks
#### Roadmap (Phase Summary)
- **Phase 0 (Feasibility):** Prove core tech stack (Tauri + React + WS).
- **Phase 1 (MVP Core):** Basic Mission Control UI and Task Board.
- **Phase 2 (Sync Calibration):** Multi-Agent protocol integration (File Locking, Self-Claiming).
- **Phase 3 (Beta Test):** Full deployment with active AI agents orchestrating their own workflows.
- **Phase 4 (Future):** Mobile (Capacitor) rollout and advanced local LLM (Ollama) integrations.

---