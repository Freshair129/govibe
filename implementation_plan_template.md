# GoVibe Migration Roadmap — DDD Execution Plan

> **Source**: [Untitled-1.html](file:///G:/covibe/Untitled-1.html) (6,740 lines, 429KB)
> **Target**: `g:/govibe/` — Tauri v2 + Vite + React-TS
> **Methodology**: Documentation-Driven Development (DDD)
> **Version**: 1.0.0
> **Created**: 2026-06-06T07:20:00+07:00, Rwang

---
CoVibe คือ โปรเจคที่ html นี้กำลังtacking  เราจะใช้ระบบ html นี้เป็น  
GoVibe :: AI-Native Visual Vibe Code Platform
Visual Vibe Code Platform ของไทย 🇹🇭 “No coding No problem” 
อยากใช้ Tauri + Vite/React เพื่อต่อกับ GenesisBlockDB ที่เป็น Rust เพื่อทำembed code and symbollink
1. จงเขียนImplementation Plan การ Migrate GoVibe-Mission-Control.himl → React Components โดยแยก File แบบ Modular  (เผื่อ native)
   verify: npm run dev ยังทำงานได้ 
2. แยก business logic เข้า src/core/          (platform-agnostic)
   verify: logic ไม่มี DOM dependency
3. ติดตั้ง Capacitor                           (เมื่อพร้อม go native)
   verify: npx cap run android/ios ทำงานได้

โดยสร้างเป็น  Ultraplan แบ่ง  phase และ sprint + backlog +DoD ภายใต้ DDD มา ผมจะส่งต่อให้ Agent

## ⚙️ Conventions

| Symbol | Meaning |
|--------|---------|
| `🔓 LOCK` | Dependency blocked — ต้องรอ task ที่ระบุเสร็จก่อน |
| `🔀 PARALLEL` | สามารถทำพร้อมกันได้กับ task อื่นในกลุ่มเดียวกัน |
| `⛓️ SERIAL` | ต้องทำลำดับ ไม่สามารถ parallel ได้ |
| `📐 DDD` | ต้องเขียน Doc spec ก่อน → รอ approve → แล้วค่อย code |
| `⚡ HOTFIX` | Bypass doc-first (typo, syntax, linting fix) |

### Definition of Done (DoD) Template

ทุก task ต้องผ่าน 3 gates:

```
■ Acceptance Criteria
  [_] Spec/Doc approved (DDD gate)
  [_] Docs updated (README, GEMINI.md, or inline JSDoc)
  [_] Test plan Spec/Doc approved
■ Success Criteria
  [_] Code complete — ไม่มี TODO/FIXME
  [_] Lints clean (TypeScript strict, no any)
  [_] Renders correctly ใน `cargo tauri dev`
■ Exit Criteria
  [_] Tests passed (vitest component test หรือ manual verify)
  [_] Regression free — views อื่นยังทำงานปกติ
  [_] PR diff review — changed lines trace to task scope only
```

---

## Phase 0 — Foundation Scaffold

> **Goal**: สร้าง project structure + extract design system ให้พร้อมรับ components
> **Sprint**: S0 (1 sprint)

---

### Sprint S0 — Project Bootstrap

|   Task ID   |           Task                     |Pt|    Mode    |    Dependency    | symbollink |   Source Lines   |  Assign To  |
|  ---------  |    -----------------               |--|   ------   |   ------------   |    ----    |   -----------    | ----------- |
| **GV-S001** | Scaffold Tauri v2 + Vite React-TS  | 3|   SERIAL   |    `GV-S001`     | `d:/GoVibe`|   L01–L111       |  EVA Agent  |
| **GV-S002** | Configure and"GoVibe", identifier  | 1|   SERIAL   |    -             |`tauri.conf.json`|  |  |
| **GV-S003** | Extract CSS design tokens → `src/styles/globals.css` | 5 |  PARALLEL-A | `GV-S001` | L71–L111 |
| **GV-S004** | Extract glassmorphism + card styles → `src/styles/glassmorphism.css` | 3 |  PARALLEL-A | `GV-S001` | L142–L730 |
| **GV-S005** | Extract animations + keyframes → `src/styles/animations.css` | 3 |  PARALLEL-A | `GV-S001` | L121–L187, L401–L591 |
| **GV-S006** | Extract component-specific CSS (sidebar, terminal, carousel, config) → `src/styles/components.css` | 5 |  PARALLEL-A | `GV-S001` | L189–L870, L884–L1812 |
| **GV-S007** | Setup Tailwind CSS properly (install package, config, remove CDN script) | 2 | 🔀 PARALLEL-A | `GV-S001` | L22, L32–L68 |

**Parallel Group A**: GV-S003, GV-S004, GV-S005, GV-S006, GV-S007 — ทำพร้อมกันได้ทั้ง 5 task (ไม่ depend กัน) หลัง GV-S001 เสร็จ

#### DoD — Sprint S0
```
■ Acceptance
  [_] `npm run dev` starts Vite dev server
  [_] `cargo tauri dev` opens empty window with correct title
■ Success
  [_] All CSS files imported without error
  [_] Design tokens (:root variables) match original
■ Exit
  [_] Dark theme renders bg-body: #0f1115
  [_] Light theme class toggles correctly
```

---

## Phase 1 — Application Shell

> **Goal**: สร้าง layout skeleton (Header, Sidebar, routing) ที่ navigate ระหว่าง 4 domains ได้
> **Sprints**: S1a (Layout), S1b (State + Routing)

---

### Sprint S1a — Layout Components

| Task ID | Task | Points | Mode | Dependency | Source Lines |
|---------|------|--------|------|------------|--------------|
| **GV-S101** | `core/state.ts` — Extract `appState` + `siteMap` config | 3 | ⛓️ SERIAL | `GV-S003` | L4461–L4519 |
| **GV-S102** | `components/layout/Header.tsx` — Domain tab switcher, WS status, theme toggle | 5 | 🔀 PARALLEL-B | `GV-S101` | L1822–L1881 |
| **GV-S103** | `components/layout/Sidebar.tsx` — Collapsible sidebar, sub-nav rendering, expanded-lock | 5 | 🔀 PARALLEL-B | `GV-S101` | L1886–L1917 |
| **GV-S104** | `components/layout/MainLayout.tsx` — Flex layout container (header + sidebar + main) | 3 | 🔓 LOCK | `GV-S102`, `GV-S103` |
| **GV-S105** | `components/shared/ThemeToggle.tsx` — Dark/light toggle with CSS var switching | 2 | 🔀 PARALLEL-B | `GV-S101` | L4729–L4758 |
| **GV-S106** | `components/shared/ShimmerTitle.tsx` — Gradient animated text component | 1 | 🔀 PARALLEL-B | `GV-S005` | L169–L187 |
| **GV-S107** | `components/layout/Footer.tsx` — Status bar footer | 1 | 🔀 PARALLEL-B | `GV-S101` | L4382–L4388 |

**Parallel Group B**: GV-S102, GV-S103, GV-S105, GV-S106, GV-S107 — ทำพร้อมกันได้ (ต้องการแค่ GV-S101)

**🔓 LOCK**: GV-S104 ต้องรอ GV-S102 (Header) + GV-S103 (Sidebar) ทั้งคู่เสร็จก่อน

---

### Sprint S1b — Domain Routing & View Switching

| Task ID | Task | Points | Mode | Dependency | Source Lines |
|---------|------|--------|------|------------|--------------|
| **GV-S108** | `switchDomain()` logic → React state + domain context provider | 3 | ⛓️ SERIAL | `GV-S104` | L4596–L4656 |
| **GV-S109** | `switchMainView()` logic → view component lazy loading | 3 | ⛓️ SERIAL | `GV-S108` | L4658–L4711 |
| **GV-S110** | Empty placeholder components สำหรับ 17 views (render title + "Coming Soon") | 2 | ⛓️ SERIAL | `GV-S108` |

#### DoD — Phase 1
```
■ Acceptance
  [_] คลิก Domain A/B/C/D tabs → sidebar sub-nav อัปเดตถูก
  [_] คลิก sub-nav → main content area แสดง view ที่ถูกต้อง
  [_] Orb gradient เปลี่ยนสีตาม domain
■ Success
  [_] Sidebar collapse/expand ทำงาน
  [_] Theme toggle dark↔light ไม่ error
  [_] Footer context text อัปเดตตาม active view
■ Exit
  [_] ทุก 17 views มี placeholder render ไม่ blank
  [_] Console ไม่มี React warning/error
```

---

## Phase 2 — Domain View Migration

> **Goal**: ย้าย HTML + JS logic ของ 17 views เข้า React components
> **Sprints**: S2a (Domain A), S2b (Domain B), S2c (Domain C), S2d (Domain D)

---

### Sprint S2a — Domain A: Project Overview (5 views)

| Task ID | Task | Points | Mode | Dependency | Source Lines |
|---------|------|--------|------|------------|--------------|
| **GV-S201** | `domains/overview/Dashboard.tsx` (view-A1) — Stats grid, Chart.js integration, Reactor Telemetry panel | 8 | 🔀 PARALLEL-C | `GV-S110` | L1926–L2013 |
| **GV-S202** | `domains/overview/Roadmap.tsx` (view-A2) — Accordion phases, task cards, 3-state checkboxes, export (JSON/YAML/MD), agent drag-assign | 13 | 🔀 PARALLEL-C | `GV-S110` | L2016–L3457 + L4760–L5130 |
| **GV-S203** | `domains/overview/Plugins.tsx` (view-A3) — Capability plugins listing | 3 | 🔀 PARALLEL-C | `GV-S110` | L3458–L3493 |
| **GV-S204** | `domains/overview/BrainConfig.tsx` (view-A4) — Brain & Config panel | 3 | 🔀 PARALLEL-C | `GV-S110` | L3494–L3556 |
| **GV-S205** | `domains/overview/AgentManagement.tsx` (view-A5) — Character select carousel, 3D tilt, flip card config, video switcher | 13 | 🔀 PARALLEL-C | `GV-S110` | L3557–L3872 + L7100–L7394 (initAgentManagement) |

**Parallel Group C**: GV-S201–GV-S205 ทำพร้อมกันได้ทั้ง 5 task (แต่ละ view เป็น independent component)

> [!IMPORTANT]
> **GV-S202 (Roadmap)** เป็น task ใหญ่ที่สุด (13 pts) เพราะรวม:
> - Task definitions data (~70 lines of structured objects per phase)
> - Drag-and-drop agent assignment
> - LocalStorage state persistence
> - Export engine (JSON, YAML, Markdown generators)
> - Phase accordion with progress calculation

> [!IMPORTANT]
> **GV-S205 (Agent Management)** เป็น task ใหญ่เท่ากัน (13 pts) เพราะรวม:
> - Character portrait carousel with vertical arc layout
> - 3D perspective tilt on mouse move
> - Flip card animation (front: stats → back: config form)
> - Video/image switcher
> - Config form with model source pill, sliders, toggles
> - Genesis Knowledge panel sub-component

---

### Sprint S2b — Domain B: Genesis Knowledge (4 views)

| Task ID | Task | Points | Mode | Dependency | Source Lines |
|---------|------|--------|------|------------|--------------|
| **GV-S206** | `domains/genesis/AstTree.tsx` (view-B1) — Code line selector, draggable AST nodes, SVG bezier edges | 5 | 🔀 PARALLEL-D | `GV-S110` | L3877–L3955 |
| **GV-S207** | `domains/genesis/BusinessSpec.tsx` (view-B2) — Static protocol specification | 2 | 🔀 PARALLEL-D | `GV-S110` | L3958–L3974 |
| **GV-S208** | `domains/genesis/InteractiveGraph.tsx` (view-B3) — Draggable 2D graph canvas (Cytoscape or custom) | 5 | 🔀 PARALLEL-D | `GV-S110` | L3977–L3994 |
| **GV-S209** | `domains/genesis/CallGraph.tsx` (view-B4) — Cytoscape.js call graph, depth controls, node inspector panel | 8 | 🔀 PARALLEL-D | `GV-S110` | L3997–L4051 |

**Parallel Group D**: GV-S206–GV-S209 ทำพร้อมกันได้ทั้ง 4 task

> [!WARNING]
> **GV-S209 (Call Graph)** depends on `cytoscape` npm package — ต้อง `npm install cytoscape @types/cytoscape` ก่อน

---

### Sprint S2c — Domain C: Block DB (5 views) — 🔑 GenesisBlockDB Frontend

| Task ID | Task | Points | Mode | Dependency | Source Lines |
|---------|------|--------|------|------------|--------------|
| **GV-S210** | `domains/blockdb/SymbolExplorer.tsx` (view-C1) — Symbol table with filter search | 3 | 🔀 PARALLEL-E | `GV-S110` | L4056–L4106 |
| **GV-S211** | `domains/blockdb/IntelligenceZoo.tsx` (view-C2) — Agent roster cards | 3 | 🔀 PARALLEL-E | `GV-S110` | L4109–L4140 |
| **GV-S212** | `domains/blockdb/SrsDebugger.tsx` (view-C3) — Query input, dual RAG output comparison | 3 | 🔀 PARALLEL-E | `GV-S110` | L4143–L4171 |
| **GV-S213** | `domains/blockdb/ErdSchema.tsx` (view-C4) — Draggable ERD table cards with SVG edges | 5 | 🔀 PARALLEL-E | `GV-S110` | L4174–L4218 |
| **GV-S214** | `domains/blockdb/HnswVectorMap.tsx` (view-C5) — HNSW layer switcher with zone visualization | 3 | 🔀 PARALLEL-E | `GV-S110` | L4221–L4260 |

**Parallel Group E**: GV-S210–GV-S214 ทำพร้อมกันได้ทั้ง 5 task

> [!NOTE]
> Sprint S2c เป็น "static UI migration" ก่อน — **จะเชื่อมกับ Tauri IPC ใน Phase 3 (GV-S301–S304)**

---

### Sprint S2d — Domain D: AI Benchmark (3 views)

| Task ID | Task | Points | Mode | Dependency | Source Lines |
|---------|------|--------|------|------------|--------------|
| **GV-S215** | `domains/benchmark/ReactorRun.tsx` (view-D1) — Power regulator slider, safety run progress, oscilloscope Web Audio canvas | 8 | 🔀 PARALLEL-F | `GV-S110` | L4265–L4331 |
| **GV-S216** | `domains/benchmark/CyberHeatmap.tsx` (view-D2) — 8×8 thermal grid, real-time randomizer, overview stats | 5 | 🔀 PARALLEL-F | `GV-S110` | L4334–L4358 |
| **GV-S217** | `domains/benchmark/EabsLogs.tsx` (view-D3) — Static campaign log viewer | 2 | 🔀 PARALLEL-F | `GV-S110` | L4361–L4376 |

**Parallel Group F**: GV-S215–GV-S217 ทำพร้อมกันได้ทั้ง 3 task

#### DoD — Phase 2 (ทุก view)
```
■ Acceptance
  [_] Doc spec per component approved ก่อน code
  [_] UI match กับ original Untitled-1.html visually (screenshot compare)
■ Success
  [_] Component renders ใน `cargo tauri dev` ไม่มี error
  [_] Interactive elements ทำงาน (click, drag, hover effects)
  [_] CSS animations/transitions match original
■ Exit
  [_] Theme toggle ทำงานใน view นี้
  [_] ไม่ break views อื่น (regression check)
  [_] TypeScript strict — no `any` type
```

---

## Phase 3 — Tauri Rust Backend (GenesisBlockDB)

> **Goal**: สร้าง Rust IPC commands เพื่อเชื่อม frontend กับ GenesisBlockDB
> **Sprint**: S3

---

### Sprint S3 — Rust IPC & Frontend Hooks

| Task ID | Task | Points | Mode | Dependency | Source Lines |
|---------|------|--------|------|------------|--------------|
| **GV-S301** | `src-tauri/src/commands/mod.rs` — Command module structure | 1 | ⛓️ SERIAL | `GV-S001` | — |
| **GV-S302** | `src-tauri/src/commands/genesis_db.rs` — Stub commands: `query_symbol()`, `insert_block()`, `list_symbols()` | 5 | ⛓️ SERIAL | `GV-S301` | — |
| **GV-S303** | `src-tauri/src/commands/symbol_link.rs` — Stub commands: `resolve_symlink()`, `embed_code_block()` | 5 | 🔀 PARALLEL-G | `GV-S301` | — |
| **GV-S304** | `src/hooks/useGenesisDb.ts` — React hook wrapping `@tauri-apps/api invoke()` calls | 3 | 🔓 LOCK | `GV-S302`, `GV-S303` | — |
| **GV-S305** | Wire `useGenesisDb` into `SymbolExplorer.tsx` (view-C1) — replace static table with IPC query | 3 | 🔓 LOCK | `GV-S304`, `GV-S210` | — |
| **GV-S306** | Wire `useGenesisDb` into `SrsDebugger.tsx` (view-C3) — send query via IPC | 3 | 🔓 LOCK | `GV-S304`, `GV-S212` | — |
| **GV-S307** | Register all commands in `lib.rs` → `generate_handler![]` | 2 | 🔓 LOCK | `GV-S302`, `GV-S303` | — |

**Parallel Group G**: GV-S302, GV-S303 ทำพร้อมกันได้

**🔓 LOCK Chain**:
```
GV-S301 → GV-S302 + GV-S303 (parallel) → GV-S307
                                         → GV-S304 → GV-S305 (ต้องรอ GV-S210 ด้วย)
                                                   → GV-S306 (ต้องรอ GV-S212 ด้วย)
```

#### DoD — Phase 3
```
■ Acceptance
  [_] Rust commands compile ไม่มี error
  [_] IPC spec documented (command name, args, return type)
■ Success
  [_] `invoke('query_symbol', { name: 'test' })` returns stub data
  [_] `invoke('resolve_symlink', { linkId: 'test' })` returns mock path
  [_] Frontend receives data and renders in table
■ Exit
  [_] cargo clippy — no warnings
  [_] `cargo tauri dev` — IPC roundtrip works
```

---

## Phase 4 — Cross-Cutting & Polish

> **Goal**: Floating terminal, WebSocket (optional), HITL modal, integration test
> **Sprints**: S4a (Overlays), S4b (Integration)

---

### Sprint S4a — Floating Overlays & WebSocket

| Task ID | Task | Points | Mode | Dependency | Source Lines |
|---------|------|--------|------|------------|--------------|
| **GV-S401** | `components/terminal/FloatingTerminal.tsx` — Draggable terminal window, shell selector, log output, input line | 5 | 🔀 PARALLEL-H | `GV-S104` | L4422–L4457 |
| **GV-S402** | `components/overlays/HitlModal.tsx` — Human-in-the-loop verification modal | 3 | 🔀 PARALLEL-H | `GV-S104` | L4392–L4420 |
| **GV-S403** | `core/websocket.ts` — Optional WS client (connect, reconnect, message handler) | 5 | 🔀 PARALLEL-H | `GV-S101` | L4521–L4593 |
| **GV-S404** | `hooks/useWebSocket.ts` — React hook for WS state + terminal log integration | 3 | 🔓 LOCK | `GV-S403`, `GV-S401` | — |

**Parallel Group H**: GV-S401, GV-S402, GV-S403 ทำพร้อมกันได้

**🔓 LOCK**: GV-S404 ต้องรอ GV-S403 (WS client) + GV-S401 (Terminal component)

---

### Sprint S4b — Integration Testing & Final Polish

| Task ID | Task | Points | Mode | Dependency | Source Lines |
|---------|------|--------|------|------------|--------------|
| **GV-S405** | Interactive card 3D effects — mouse glare, hover border, tilt transform | 2 | 🔀 PARALLEL-I | Phase 2 complete |
| **GV-S406** | `GlassPanel.tsx` — Reusable glass card component (replace repeated patterns) | 2 | 🔀 PARALLEL-I | Phase 2 complete |
| **GV-S407** | Full navigation integration test — click through all 17 views, verify no crash | 3 | ⛓️ SERIAL | ALL tasks | — |
| **GV-S408** | Update GEMINI.md to reflect GoVibe project structure | 2 | ⛓️ SERIAL | `GV-S407` | — |

#### DoD — Phase 4 (Final)
```
■ Acceptance
  [_] All 17 views render correctly in cargo tauri dev
  [_] Terminal floating window opens/closes/drags
  [_] HITL modal opens/closes with verify/halt buttons
■ Success
  [_] Theme toggle works across ALL views
  [_] No console errors or React warnings
  [_] Sidebar navigation correct across all domains
■ Exit
  [_] cargo tauri build succeeds (production bundle)
  [_] GEMINI.md updated with GoVibe structure
  [_] All TypeScript strict — no any types
```

---

## Dependency Graph (Full)

```mermaid
graph TD
    subgraph "Phase 0 — Foundation"
        S001["GV-S001<br/>Scaffold Project"]
        S002["GV-S002<br/>Tauri Config"]
        S003["GV-S003<br/>globals.css"]
        S004["GV-S004<br/>glassmorphism.css"]
        S005["GV-S005<br/>animations.css"]
        S006["GV-S006<br/>components.css"]
        S007["GV-S007<br/>Tailwind Setup"]
        
        S001 --> S002
        S001 --> S003
        S001 --> S004
        S001 --> S005
        S001 --> S006
        S001 --> S007
    end
    
    subgraph "Phase 1 — Shell"
        S101["GV-S101<br/>core/state.ts"]
        S102["GV-S102<br/>Header.tsx"]
        S103["GV-S103<br/>Sidebar.tsx"]
        S104["GV-S104<br/>MainLayout.tsx"]
        S105["GV-S105<br/>ThemeToggle"]
        S106["GV-S106<br/>ShimmerTitle"]
        S107["GV-S107<br/>Footer"]
        S108["GV-S108<br/>switchDomain"]
        S109["GV-S109<br/>switchMainView"]
        S110["GV-S110<br/>17 Placeholders"]
        
        S003 --> S101
        S101 --> S102
        S101 --> S103
        S101 --> S105
        S101 --> S107
        S005 --> S106
        S102 --> S104
        S103 --> S104
        S104 --> S108
        S108 --> S109
        S109 --> S110
    end
    
    subgraph "Phase 2 — Views"
        S201["GV-S201<br/>Dashboard A1"]
        S202["GV-S202<br/>Roadmap A2"]
        S203["GV-S203<br/>Plugins A3"]
        S204["GV-S204<br/>BrainConfig A4"]
        S205["GV-S205<br/>AgentMgmt A5"]
        S206["GV-S206<br/>AST Tree B1"]
        S207["GV-S207<br/>BizSpec B2"]
        S208["GV-S208<br/>Graph B3"]
        S209["GV-S209<br/>CallGraph B4"]
        S210["GV-S210<br/>SymbolExplorer C1"]
        S211["GV-S211<br/>IntelZoo C2"]
        S212["GV-S212<br/>SRS Debugger C3"]
        S213["GV-S213<br/>ERD Schema C4"]
        S214["GV-S214<br/>HNSW Map C5"]
        S215["GV-S215<br/>ReactorRun D1"]
        S216["GV-S216<br/>Heatmap D2"]
        S217["GV-S217<br/>EABS Logs D3"]
        
        S110 --> S201
        S110 --> S202
        S110 --> S203
        S110 --> S204
        S110 --> S205
        S110 --> S206
        S110 --> S207
        S110 --> S208
        S110 --> S209
        S110 --> S210
        S110 --> S211
        S110 --> S212
        S110 --> S213
        S110 --> S214
        S110 --> S215
        S110 --> S216
        S110 --> S217
    end
    
    subgraph "Phase 3 — Rust Backend"
        S301["GV-S301<br/>commands/mod.rs"]
        S302["GV-S302<br/>genesis_db.rs"]
        S303["GV-S303<br/>symbol_link.rs"]
        S304["GV-S304<br/>useGenesisDb Hook"]
        S305["GV-S305<br/>Wire C1"]
        S306["GV-S306<br/>Wire C3"]
        S307["GV-S307<br/>Register Commands"]
        
        S001 --> S301
        S301 --> S302
        S301 --> S303
        S302 --> S307
        S303 --> S307
        S302 --> S304
        S303 --> S304
        S304 --> S305
        S304 --> S306
        S210 --> S305
        S212 --> S306
    end
    
    subgraph "Phase 4 — Polish"
        S401["GV-S401<br/>FloatingTerminal"]
        S402["GV-S402<br/>HITL Modal"]
        S403["GV-S403<br/>WS Client"]
        S404["GV-S404<br/>useWebSocket"]
        S407["GV-S407<br/>Integration Test"]
        S408["GV-S408<br/>Update Docs"]
        
        S104 --> S401
        S104 --> S402
        S101 --> S403
        S403 --> S404
        S401 --> S404
        S407 --> S408
    end
```

---

## Sprint Planning Summary

| Sprint | Phase | Tasks | Total Points | Duration Est. | Parallel Slots |
|--------|-------|-------|-------------|--------------|----------------|
| **S0** | Foundation | GV-S001–S007 | 22 | 1–2 days | 5 parallel after S001 |
| **S1a** | Shell: Layout | GV-S101–S107 | 20 | 1–2 days | 5 parallel after S101 |
| **S1b** | Shell: Routing | GV-S108–S110 | 8 | 0.5 day | serial |
| **S2a** | Domain A | GV-S201–S205 | 40 | 3–4 days | 5 parallel |
| **S2b** | Domain B | GV-S206–S209 | 20 | 1–2 days | 4 parallel |
| **S2c** | Domain C | GV-S210–S214 | 17 | 1–2 days | 5 parallel |
| **S2d** | Domain D | GV-S215–S217 | 15 | 1–2 days | 3 parallel |
| **S3** | Rust Backend | GV-S301–S307 | 22 | 2–3 days | partial parallel |
| **S4a** | Overlays | GV-S401–S404 | 16 | 1–2 days | 3 parallel |
| **S4b** | Polish | GV-S405–S408 | 9 | 1 day | partial parallel |
| | | **44 tasks** | **~189 pts** | **~12–18 days** | |

---

## Backlog (Out of Scope — Future)

| ID | Item | Note |
|----|------|------|
| BL-001 | React Router integration (URL-based routing) | ปัจจุบันใช้ state-based switching เพียงพอ |
| BL-002 | GenesisBlockDB real crate integration | ต้องมี crate จริงจาก Boss ก่อน |
| BL-003 | MSP Telemetry Dashboard integration | ต้องมี telemetry backend endpoint |
| BL-004 | Activity Heatmap Calendar (63-day) | ต้องมี git commit data source |
| BL-005 | Capacitor mobile shell (iOS/Android) | ถ้าต้องการ mobile deployment |
| BL-006 | Auto-updater (Tauri built-in) | Production release feature |
| BL-007 | Code Embed Viewer with syntax highlighting | ต้องมี Prism.js/Shiki integration |

---

## Agent Assignment Guide

เมื่อ assign task ให้ agent อื่น ให้ระบุ:

```yaml
task_id: GV-S201
source_file: "g:/covibe/Untitled-1.html"
source_lines: "L1926–L2013"
target_file: "g:/govibe/src/domains/overview/Dashboard.tsx"
dependencies:
  - GV-S110 (must be DONE)
dod_gates: [acceptance, success, exit]
complexity: C-2  # DDD: Text → Doc → Code
```

> [!CAUTION]
> **ห้ามเริ่มโค้ดก่อนเขียน Doc spec** — ทุก task ที่ไม่ใช่ HOTFIX ต้อง output doc ก่อน → รอ approve → แล้วค่อย code (R5 — Doc First)
