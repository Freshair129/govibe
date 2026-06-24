---
title: "ROADMAP: GoVibe Hybrid MVP"
doc_id: "ROADMAP-HYBRID-MVP"
uid: "01KVXGFW5MNW1D402AH0ZQBSFS"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:13a95b10eea3394a"
updated: "2026-06-23"
owner: "LYRA"
auditor: "ATHER"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md"
  - "docs/features/agent-team/FEAT-Tiered-Review.md"
  - "docs/features/agent-team/FEAT-Per-Agent-Memory-Unit.md"
  - "docs/adr/ADR-020-Per-Agent-Memory-Unit.md"
---

# ROADMAP: GoVibe Hybrid MVP

**Source PRD:** `docs/PRD-GoVibe-Platform-Overview.md`
**Owner:** `LYRA`
**Roadmap Source Path:** `docs/roadmap/ROADMAP-hybrid-mvp.md`
**Mission Control Render:** `A2 Roadmap Board reads this as the system-level plan for the hybrid-MVP epic (cost wedge: frontier plans, local SLM executes).`

## Product Goal

Ship the "wow people can run" MVP: a developer runs `hybrid-meter run "task"` on their own repo, a
frontier model plans + reviews while local SLMs execute on-device, and a live cost meter shows what
ran free and what was saved. The proven hybrid loop already exists as the G-orchestra engine
(routing, prompt+scope, Verify Gate, anti-error L0/L1/L2, usage ledger, pool/DAG); the MVP work is
to **package** it behind a single command, not to rebuild it. Phases follow a Now / Next / Later
cadence. Hero metric is honest by design (measured ~30-44% saved, 27% on-device, code 100% local).

## Phases

| Phase | Goal | PRD Systems | Required Docs | Exit Criteria | Status | Progress |
|---|---|---|---|---|---|---|
| PHASE-HYB-01 | Checkpoint: governed architecture (memory + tiered review) + V0 wow surface | SYSTEM-05 | ADR-020, FEAT x2, SDD, PRD | ADR/FEAT registered + docs:validate PASS; `npx hybrid-meter` demo runs | done | 100 |
| PHASE-HYB-02 | NOW: V1 — real hybrid loop on a user repo (frontier plan -> local execute -> verify -> live meter) | SYSTEM-05 | this roadmap, engine audit | `hybrid-meter run "task"` produces a real diff + usage.jsonl + meter on one repo | planned | 0 |
| PHASE-HYB-03 | NEXT: sharpen savings (L0 deterministic review; steady-state measurement) | SYSTEM-05 | FEAT-Tiered-Review | L0 gate cuts the review tax; measured steady-state savings recorded | planned | 0 |
| PHASE-HYB-04 | NEXT/LATER: memory moat (T0 failure-log -> T1/T2 Diamond/8-8-8) | SYSTEM-05 | FEAT-Per-Agent-Memory-Unit, ADR-020 | agent stops repeating failures (T0); promotion gate live (T1/T2) | planned | 0 |
| PHASE-HYB-05 | LATER: distribution + GTM (npm, web meter, Thai/SEA) | SYSTEM-05 | landing, CR | published; web cost-meter view; first Thai/SEA motion | planned | 0 |

## Sprints

| Sprint | Parent Phase | Goal | Task Count | Exit Criteria | Status | Progress |
|---|---|---|---:|---|---|---:|
| SPR-HYB-01 | PHASE-HYB-01 | Land architecture + V0 meter | 1 | ADR/FEAT + npx meter shipped, validate PASS | done | 100 |
| SPR-HYB-02 | PHASE-HYB-02 | V1 happy-path: planner + run CLI + repo-agnostic scope + proof | 4 | `run "task"` runs end-to-end on one repo | planned | 0 |
| SPR-HYB-03 | PHASE-HYB-02 | V1 hardening: onboarding + cross-platform + per-language routing | 2 | a stranger can run it on their own repo | planned | 0 |
| SPR-HYB-04 | PHASE-HYB-03 | Savings + memory levers | 2 | L0 gate + T0 failure memory landed | planned | 0 |

## Backlog Items

| ID | Parent ID | Type | Title | PRD System | Priority | Owner | Source Section | Dependencies | Acceptance | Status | Progress |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TASK-HYB-RM-001 | SPR-HYB-01 | epic | Governed architecture (ADR-020 + FEAT memory + FEAT tiered-review) + V0 cost meter (`hybrid-meter`) | SYSTEM-05 | P0 | ARCHON | Checkpoint | none | docs:validate PASS; `npx hybrid-meter` demo runs | done | 100 |
| TASK-HYB-RM-002 | SPR-HYB-02 | feature | Planner: a frontier model atomizes a freeform task + repo summary into engine tasks (id/title/type/accept/deps) | SYSTEM-05 | P0 | ARCHON | V1 plan | TASK-HYB-RM-001 | a freeform request yields >=1 engine task with acceptance, written to the engine backlog | planned | 0 |
| TASK-HYB-RM-003 | SPR-HYB-02 | feature | `hybrid-meter run "task"` CLI: planner -> engine.runPool -> Verify Gate -> usage.jsonl -> live meter | SYSTEM-05 | P0 | ARCHON | V1 run | TASK-HYB-RM-002 | one command runs the loop and shows the meter over a real diff | planned | 0 |
| TASK-HYB-RM-004 | SPR-HYB-02 | feature | Repo-agnostic scope: generalize the engine's hardcoded G-Maiden/Rust prompt hints to a detected/config stack | SYSTEM-05 | P1 | ARCHON | V1 portability | TASK-HYB-RM-001 | engine prompts adapt to the target repo's language/stack | planned | 0 |
| TASK-HYB-RM-005 | SPR-HYB-02 | feature | Happy-path proof: run on one sample repo, produce a real diff + meter, record an honest savings figure | SYSTEM-05 | P0 | ATHER | V1 proof | TASK-HYB-RM-003, TASK-HYB-RM-004 | end-to-end run produces a working change and an honest meter | planned | 0 |
| TASK-HYB-RM-006 | SPR-HYB-03 | feature | Onboarding: detect/install Ollama, pull a default general coding model, accept a frontier key/subscription | SYSTEM-05 | P0 | KIN | V1 onboarding | TASK-HYB-RM-005 | first run sets up deps or degrades gracefully with a clear message | planned | 0 |
| TASK-HYB-RM-007 | SPR-HYB-03 | feature | Cross-platform + per-language local model routing (current benchmark is Rust-only) | SYSTEM-05 | P1 | ARCHON | V1 breadth | TASK-HYB-RM-006 | runs on win/mac/linux; routes a local model per detected language | planned | 0 |
| TASK-HYB-RM-008 | SPR-HYB-04 | feature | L0 deterministic gate (compile/lint/test before any LLM review) per FEAT-Tiered-Review | SYSTEM-05 | P1 | ATHER | Savings lever | TASK-HYB-RM-003 | non-compiling output is caught at $0 before any LLM review | planned | 0 |
| TASK-HYB-RM-009 | SPR-HYB-04 | feature | T0 per-agent failure memory (anti-error loop) per FEAT-Per-Agent-Memory-Unit | SYSTEM-05 | P1 | ARCHON | Memory lever | TASK-HYB-RM-003 | repeated failures drop after a lesson enters the failure-log | planned | 0 |
| TASK-HYB-RM-010 | PHASE-HYB-05 | epic | Distribution: npm publish + web cost-meter view (V0.5) + Thai/SEA beachhead | SYSTEM-05 | P2 | LYRA | GTM | TASK-HYB-RM-005 | published; shareable web meter; first Thai/SEA motion | planned | 0 |

## Task Breakdown

### TASK-HYB-RM-002: Planner (frontier atomization)

- [ ] SUBTASK-HYB-RM-002.1 reuse the engine task schema (`id/title/type/accept/phase/deps/scope`) as the planner output
- [ ] SUBTASK-HYB-RM-002.2 frontier prompt: given the freeform task + a repo summary, emit 1-N tasks with acceptance (JSON)
- [ ] SUBTASK-HYB-RM-002.3 write the result to the engine backlog the pool consumes

### TASK-HYB-RM-003: `run` command (the thin glue)

- [ ] SUBTASK-HYB-RM-003.1 `run "task" [--repo PATH]` arg surface in `hybrid-meter`
- [ ] SUBTASK-HYB-RM-003.2 wire planner -> `engine.runPool({mode:'auto'})` -> await pool drain
- [ ] SUBTASK-HYB-RM-003.3 stream the cost meter (the engine already appends `usage.jsonl`) while the loop runs
- [ ] SUBTASK-HYB-RM-003.4 print the resulting diff / changed files + the final meter

### TASK-HYB-RM-004: Repo-agnostic scope

- [ ] SUBTASK-HYB-RM-004.1 detect the target stack (language, build/test commands) or read it from a small config
- [ ] SUBTASK-HYB-RM-004.2 replace the hardcoded G-Maiden/Rust hints in `buildPrompt` with the detected stack

## UI Traceability

| Roadmap Item ID | Source Section | Mission Control Surface | Progress Source | Evidence Link |
|---|---|---|---|---|
| TASK-HYB-RM-001 | Checkpoint | A2 Project Overview | ADR-020 + FEAT x2 + `hybrid-meter/` (G-orchestra) | docs:validate PASS; `node cli.mjs demo` |
| TASK-HYB-RM-003 | V1 run | A2 Project Overview | G-orchestra `engine.mjs` (runPool, executeWithReview, usage.jsonl) | pending packaging evidence |
| TASK-HYB-RM-005 | V1 proof | A2 Project Overview | sample-repo run output | pending end-to-end run |

## Acceptance Criteria

- [x] A canonical roadmap entry exists for the hybrid-MVP epic and links PRD -> FEAT/ADR chain.
- [x] PHASE-HYB-01 reflects the shipped checkpoint (governed architecture + V0 meter).
- [ ] PHASE-HYB-02 carries its backlog items (planner, run CLI, repo-agnostic scope, proof) with owners and dependencies.
- [ ] Mission Control can trace a roadmap item to its source module / engine function.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-23 | LYRA | Created the hybrid-MVP roadmap (Now/Next/Later as phases): checkpoint done; V1 real loop now (package the G-orchestra engine behind `hybrid-meter run`); savings + memory levers next; distribution later. |
