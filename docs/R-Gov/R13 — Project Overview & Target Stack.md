## R13 — Project Overview & Target Stack (v1.0)

**Title:** Project Overview & Target Stack  
**Summary:** นิยามภาพรวมโปรเจค GoVibe, ปรัชญาการออกแบบ, และ Technology Stack เป้าหมาย  
**Version:** 1.0  
**Updated:** 2026-06-22  
**Role:** Governance / Context  
**wikilink:** [[R13-Project-Overview]]  
**crosslink:** [[R15-Directory-Structure]] · [[R16-Build-Run-Commands]]  
**source:** สกัดจาก `GEMINI.md` § Project Overview

---

### ภาพรวม (Overview)

**GoVibe** คือ "AI-Native Visual Vibe Code Platform" ออกแบบด้วยปรัชญา "No coding No problem" — Visual Vibe Code Platform ของไทย มุ่งเน้นสภาพแวดล้อม High-Fidelity Interactive สำหรับ AI-Assisted Development และ System Orchestration

---

### Key Technologies (Target Stack)

| Layer | Technology |
|---|---|
| **Architecture** | Monorepo (Turborepo + npm Workspaces) |
| **Frontend** | Vite + React 19 (TypeScript) + Tailwind CSS v4 + Lucide Icons |
| **Backend (Desktop)** | Tauri v2 (Rust-based) |
| **Database** | GenesisBlockDB (HNSW-simulated vector storage in Rust) |
| **Testing** | Vitest (Unit) + Playwright (E2E) |
| **Native** | Capacitor (for mobile deployment) |

---

### Current State

โปรเจคผ่าน **Phase 0 – Phase 4** เรียบร้อย: Mission Control พร้อม AST visualization, HNSW Vector Space mapping, AI Stress Testing (Reactor Run), และ Multi-Agent Collaboration loops

---

### CHANGELOG

| Version | Date | Summary |
|---|---|---|
| **1.0** | 2026-06-22 | สกัดจาก `GEMINI.md` § Project Overview |
