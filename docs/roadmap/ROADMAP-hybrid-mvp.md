---
title: "ROADMAP: GoVibe Hybrid MVP"
doc_id: "ROADMAP-HYBRID-MVP"
uid: "01KVXGFW5MNW1D402AH0ZQBSFS"
status: "draft"
version: "0.6.0+draft"
content_hash: "atom:c9c4374322b6fdc7"
updated: "2026-06-25"
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
**Engine Location:** `engine/` — the G-orchestra engine, forked from the G-Maiden repo into GoVibe on 2026-06-25 (see `engine/PROVENANCE.md`). GoVibe and G-Maiden now develop their copies independently.
**Mission Control Render:** `A2 Roadmap Board reads this as the system-level plan for the hybrid-MVP epic (cost wedge: frontier plans, local SLM executes).`

## Product Goal

Ship the "wow people can run" MVP: a developer runs `hybrid-meter run "task"` on their own repo, a
frontier model plans + reviews while local SLMs execute on-device, and a live cost meter shows what
ran free and what was saved. The proven hybrid loop already exists as the G-orchestra engine
(routing, prompt+scope, Verify Gate, anti-error L0/L1/L2, usage ledger, pool/DAG); the MVP work is
to **package** it behind a single command, not to rebuild it. The engine is now forked into
GoVibe's own `engine/` (planner, run pipeline, Verify Gate, usage ledger), de-coupled from
G-Maiden. Phases follow a Now / Next / Later cadence. Hero metric is honest by design (measured
~30-44% saved, 27% on-device, code 100% local).

## Phases

| Phase | Goal | PRD Systems | Required Docs | Exit Criteria | Status | Progress |
|---|---|---|---|---|---|---|
| PHASE-HYB-01 | Checkpoint: governed architecture (memory + tiered review) + V0 wow surface | SYSTEM-05 | ADR-020, FEAT x2, SDD, PRD | ADR/FEAT registered + docs:validate PASS; `npx hybrid-meter` demo runs | done | 100 |
| PHASE-HYB-02 | NOW: V1 — real hybrid loop on a user repo (frontier plan -> local execute -> verify -> live meter) | SYSTEM-05 | this roadmap, engine audit | `hybrid-meter run "task"` produces a real diff + usage.jsonl + meter on one repo | done | 100 |
| PHASE-HYB-03 | NEXT: sharpen savings (L0 deterministic review; steady-state measurement) | SYSTEM-05 | FEAT-Tiered-Review | L0 gate cuts the review tax; measured steady-state savings recorded | done | 100 |
| PHASE-HYB-04 | NEXT/LATER: memory moat (T0 failure-log -> T1/T2 Diamond/8-8-8) | SYSTEM-05 | FEAT-Per-Agent-Memory-Unit, ADR-020 | agent stops repeating failures (T0); promotion gate live (T1/T2) | in_progress | 80 |
| PHASE-HYB-05 | LATER: distribution + GTM (npm, web meter, Thai/SEA) | SYSTEM-05 | landing, CR | published; web cost-meter view; first Thai/SEA motion | in_progress | 40 |

## Sprints

| Sprint | Parent Phase | Goal | Task Count | Exit Criteria | Status | Progress |
|---|---|---|---:|---|---|---:|
| SPR-HYB-01 | PHASE-HYB-01 | Land architecture + V0 meter | 1 | ADR/FEAT + npx meter shipped, validate PASS | done | 100 |
| SPR-HYB-02 | PHASE-HYB-02 | V1 happy-path: planner + run CLI + repo-agnostic scope + proof | 4 | `run "task"` runs end-to-end on one repo | done | 100 |
| SPR-HYB-03 | PHASE-HYB-02 | V1 hardening: onboarding + cross-platform + per-language routing | 2 | a stranger can run it on their own repo | planned | 0 |
| SPR-HYB-04 | PHASE-HYB-03 | Savings + memory levers | 2 | L0 gate + T0 failure memory landed | done | 100 |

## Backlog Items

| ID | Parent ID | Type | Title | PRD System | Priority | Owner | Source Section | Dependencies | Acceptance | Status | Progress |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TASK-HYB-RM-001 | SPR-HYB-01 | epic | Governed architecture (ADR-020 + FEAT memory + FEAT tiered-review) + V0 cost meter (`hybrid-meter`) | SYSTEM-05 | P0 | ARCHON | Checkpoint | none | docs:validate PASS; `npx hybrid-meter` demo runs | done | 100 |
| TASK-HYB-RM-002 | SPR-HYB-02 | feature | Planner: a frontier model atomizes a freeform task + repo summary into engine tasks (id/title/type/accept/deps) | SYSTEM-05 | P0 | ARCHON | V1 plan | TASK-HYB-RM-001 | a freeform request yields >=1 engine task with acceptance, written to the engine backlog | done | 100 |
| TASK-HYB-RM-003 | SPR-HYB-02 | feature | `hybrid-meter run "task"` CLI: planner -> engine.runPool -> Verify Gate -> usage.jsonl -> live meter | SYSTEM-05 | P0 | ARCHON | V1 run | TASK-HYB-RM-002 | one command runs the loop and shows the meter over a real diff | done | 100 |
| TASK-HYB-RM-004 | SPR-HYB-02 | feature | Repo-agnostic scope: generalize the engine's hardcoded G-Maiden/Rust prompt hints to a detected/config stack | SYSTEM-05 | P1 | ARCHON | V1 portability | TASK-HYB-RM-001 | engine prompts adapt to the target repo's language/stack | done | 100 |
| TASK-HYB-RM-005 | SPR-HYB-02 | feature | Happy-path proof: run on one sample repo, produce a real diff + meter, record an honest savings figure | SYSTEM-05 | P0 | ATHER | V1 proof | TASK-HYB-RM-003, TASK-HYB-RM-004 | end-to-end run produces a working change and an honest meter | done | 100 |
| TASK-HYB-RM-006 | SPR-HYB-03 | feature | Onboarding: detect/install Ollama, pull a default general coding model, accept a frontier key/subscription | SYSTEM-05 | P0 | KIN | V1 onboarding | TASK-HYB-RM-005 | first run sets up deps or degrades gracefully with a clear message | planned | 0 |
| TASK-HYB-RM-007 | SPR-HYB-03 | feature | Cross-platform + per-language local model routing (current benchmark is Rust-only) | SYSTEM-05 | P1 | ARCHON | V1 breadth | TASK-HYB-RM-006 | runs on win/mac/linux; routes a local model per detected language | planned | 0 |
| TASK-HYB-RM-008 | SPR-HYB-04 | feature | L0 deterministic gate (compile/lint/test before any LLM review) per FEAT-Tiered-Review | SYSTEM-05 | P1 | ATHER | Savings lever | TASK-HYB-RM-003 | non-compiling output is caught at $0 before any LLM review | done | 100 |
| TASK-HYB-RM-009 | SPR-HYB-04 | feature | T0 per-agent failure memory (anti-error loop) per FEAT-Per-Agent-Memory-Unit | SYSTEM-05 | P1 | ARCHON | Memory lever | TASK-HYB-RM-003 | repeated failures drop after a lesson enters the failure-log | done | 100 |
| TASK-HYB-RM-010 | PHASE-HYB-05 | epic | Distribution: npm publish + web cost-meter view (V0.5) + Thai/SEA beachhead | SYSTEM-05 | P2 | LYRA | GTM | TASK-HYB-RM-005 | published; shareable web meter; first Thai/SEA motion | in_progress | 40 |

## Task Breakdown

### TASK-HYB-RM-002: Planner (frontier atomization)

- [x] SUBTASK-HYB-RM-002.1 reuse the engine task schema (`id/title/type/accept/phase/deps/scope`) as the planner output — `engine/orchestration/planner.mjs` `planTasks()`
- [x] SUBTASK-HYB-RM-002.2 frontier prompt: given the freeform task + a repo summary, emit 1-N tasks with acceptance (JSON)
- [x] SUBTASK-HYB-RM-002.3 write the result to the engine backlog the pool consumes

### TASK-HYB-RM-003: `run` command (the thin glue)

- [x] SUBTASK-HYB-RM-003.1 `run "task" [--repo PATH]` arg surface in `hybrid-meter` (`engine/hybrid-meter/cli.mjs`); `--repo` retargets an external repo by overriding `PATHS.ROOT` + `CONFIG.project` (board/usage stay in `engine/`)
- [x] SUBTASK-HYB-RM-003.2 wire planner -> `engine.runPool` / `run.mjs` execute loop -> await pool drain
- [x] SUBTASK-HYB-RM-003.3 stream the cost meter (the engine already appends `usage.jsonl`) while the loop runs
- [x] SUBTASK-HYB-RM-003.4 print the resulting diff / changed files + the final meter

### TASK-HYB-RM-004: Repo-agnostic scope

- [x] SUBTASK-HYB-RM-004.1 read the target stack from a `project` config block (`engine/orchestration/config.json`); `summarizeRepo()` already sniffs the filesystem
- [x] SUBTASK-HYB-RM-004.2 replace the hardcoded G-Maiden/Rust hints in `buildPrompt` with the config-driven stack (fallbacks default to GoVibe)

## UI Traceability

| Roadmap Item ID | Source Section | Mission Control Surface | Progress Source | Evidence Link |
|---|---|---|---|---|
| TASK-HYB-RM-001 | Checkpoint | A2 Project Overview | ADR-020 + FEAT x2 + `engine/hybrid-meter/` (forked G-orchestra) | docs:validate PASS; `node engine/hybrid-meter/cli.mjs` demo |
| TASK-HYB-RM-002 | V1 plan | A2 Project Overview | `engine/orchestration/planner.mjs` (`planTasks`, `summarizeRepo`) | planner emits engine tasks from a freeform request |
| TASK-HYB-RM-003 | V1 run | A2 Project Overview | `engine/orchestration/{run,engine}.mjs` + `engine/hybrid-meter/cli.mjs` (`run` subcommand) | `hybrid-meter run "<task>"` wired end-to-end |
| TASK-HYB-RM-004 | V1 portability | A2 Project Overview | `engine/orchestration/config.json` `project` block + `engine.mjs buildPrompt` | prompt renders GoVibe stack, no G-Maiden leak |
| TASK-HYB-RM-005 | V1 proof | A2 Project Overview | `engine/orchestration/run.mjs --repo` on a sample repo | live run 2026-06-25: plan claude:opus $0.074 -> execute ollama:qwen3 ($0, on-device) -> Verify Gate -> real `add()` diff in external repo; meter 50% on-device, 100% code local |
| TASK-HYB-RM-008 | Savings lever | A2 Project Overview | `engine/orchestration/engine.mjs` `runL0` + `executeWithReview` L0 stage; `config.review.l0`; `run.mjs` auto-detect | `l0-gate.test.mjs` 5/5; live: failing-L0 sample -> `#l0` ran, `#review`=0, review cost **$0** (vs $0.74 ungated) |
| TASK-HYB-RM-009 | Memory lever | A5 Agent Management | `engine.mjs` `l0Lesson`/`recordOutcome`/`queryPastMistakes` + `store/knowledge.mjs` failure-log; L0 failures now persist the real lesson | `anti-error-loop.test.mjs` 4/4: log round-trip + prompt injects "ห้ามทำซ้ำ" + L0 lesson keeps real tool output |

## Acceptance Criteria

- [x] A canonical roadmap entry exists for the hybrid-MVP epic and links PRD -> FEAT/ADR chain.
- [x] PHASE-HYB-01 reflects the shipped checkpoint (governed architecture + V0 meter).
- [x] PHASE-HYB-02 carries its backlog items (planner, run CLI, repo-agnostic scope, proof) with owners and dependencies.
- [x] Mission Control can trace a roadmap item to its source module / engine function (now under `engine/`).
- [x] PHASE-HYB-02 complete: planner (RM-002), `run` CLI (RM-003), repo-agnostic scope (RM-004), and the live `--repo` end-to-end proof (RM-005) all landed in the GoVibe fork.
- [x] Honest-metric note: on the trivial single-task proof, savings were ~0% because the frontier Verify-Gate review ($0.64) dominated a $0 on-device execute — the review tax is the next lever (PHASE-HYB-03 / RM-008 L0 deterministic gate). Real savings appear at scale where more local executes amortize the frontier plan/review.
- [x] PHASE-HYB-03 lever 1 — RM-008 L0 deterministic gate landed (FEAT-Tiered-Review FR-001): `runL0` runs configured/auto-detected compile/lint/test in the target repo before any LLM review; a deterministic failure routes to rework at $0. Proven: `l0-gate.test.mjs` 5/5 + live failing-L0 run with `#review`=0 and review cost $0 (vs $0.74 ungated).
- [x] PHASE-HYB-03 lever 2 — RM-009 T0 per-agent failure memory landed (FEAT-Per-Agent-Memory-Unit, T0 slice): a failure (including an L0 deterministic failure, now persisted with its real tool output) enters the failure-log, is retrieved for a similar future task, and is injected into the worker prompt as a "❌ ห้ามทำซ้ำ" anti-error block so the same error is not produced again. Proven deterministically: `anti-error-loop.test.mjs` 4/4 (log round-trip + prompt injection + L0-lesson capture). T1/T2 promotion + 8-8-8 distillation remain (PHASE-HYB-04).
- [x] Steady-state savings measured (FR-005 telemetry): `engine/orchestration/review-tax.mjs` (`analyzeReviewTax`) + a new `— L0 GATE —` section in `savings-report.mjs` compute the review tax % and the savings the L0 gate produced. Measured on a real multi-task run: L0 caught **3** deterministic failures → averted **~$2.22** of frontier review (@ $0.74/review reference), dropping the review tax from a counterfactual **~100%** to a measured **0%** on that run. Deterministic tests: `review-tax.test.mjs` 5/5. The live cost meter now surfaces an `L0 gate averted ~$X` line.
- [x] FEAT-Tiered-Review complete (all 3 tiers): L0 deterministic (RM-008) + L1 local-SLM escalate-only (FR-002, `l1Route`/`runL1`, opt-in `config.review.l1`, `l1-route.test.mjs` 5/5 — L1 can only pass-or-escalate, high-stakes always reaches L2 per FR-003) + L2 frontier (existing) + FR-005 per-tier telemetry on the meter.
- [~] PHASE-HYB-04 memory moat (FEAT-Per-Agent-Memory-Unit, **80% — all FR contracts implemented + tested; core live**):
  - FR-005 promotion gate: `promotion.mjs` `classifyLessons` promotes Hypothesis -> Confirmed after **≥2 independent** confirmations; `queryContext` ranks Confirmed above one-off Hypotheses; prompt marks them "(ยืนยันแล้ว)". **Live.**
  - FR-001 tiers: `memory.mjs` `resolveTier` (worker -> T0, role -> T1, named -> T2); recordOutcome now tags each failure-log lesson with its tier. **Live (T0).**
  - FR-002/003/004 Diamond entry: `memory.mjs` 3-file unit (Episodic/Observation/Semantic) + epistemic_state (Hypothesis|Confirmed|Contested|Deprecated) + bitemporal fields (mirrors FEAT-Bi-Temporal-Versioning, kept local so the engine stays standalone).
  - FR-006 LCA: `lca.mjs` `resolveConflict` — temporal -> evidence -> granularity -> recency; loser Deprecated + retained.
  - FR-007 8-8-8 distillation: `distill.mjs` folds a ≥8 corroborated-episode window into one semantic role-core atom (T1/T2 only); composes the promotion gate.
  - FR-008 composition: no new storage engine; reuses the file store + promotion gate.
  - Tests: `promotion.test.mjs` 5/5 + `memory.test.mjs` 9/9. Remaining (live integration, not contracts): auto-scheduling 8-8-8 distillation on a cadence, named-agent **T2** lifecycle (binds to the agent-registry, which lives outside the standalone engine), and MSP/GKS shared-truth promotion wiring.
- [~] PHASE-HYB-05 distribution (RM-010, **in progress**): shareable **web cost-meter** at `engine/hybrid-meter/web/index.html` (loads your own `usage.jsonl`; shows saved %, on-device %, review tax, and L0-averted; rendering verified via DOM — saved ~$2/≈43%, 50% on-device, review tax 75%, L0 averted $1.48). The engine is **publish-ready** as `@govibe/hybrid-meter` (`bin: hybrid-meter`; `npm pack --dry-run` = 79 kB). **Not published** — remaining needs the owner's action: pick a license, `npm login`, `npm publish`; plus the Thai/SEA GTM motion.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.6.0+draft | 2026-06-25 | LYRA | PHASE-HYB-04 memory moat to 80%: all FEAT-Per-Agent-Memory-Unit contracts implemented + tested — tiers (FR-001), Diamond entry + epistemic + bitemporal (FR-002/003/004), LCA (FR-006), 8-8-8 distillation (FR-007), composition (FR-008); tier-tagging wired live. memory.test.mjs 9/9 (33 engine tests total). |
| 0.5.0+draft | 2026-06-25 | LYRA | PHASE-HYB-05 distribution (in progress): shareable web cost-meter (engine/hybrid-meter/web, rendering verified) + engine publish-ready as @govibe/hybrid-meter (bin, npm pack 79kB). Not published — npm publish + Thai/SEA GTM need the owner. |
| 0.4.3+draft | 2026-06-25 | LYRA | PHASE-HYB-04 promotion gate (FR-005 core, in progress): classifyLessons promotes failure-log lessons Hypothesis->Confirmed after >=2 independent confirmations; queryContext ranks Confirmed above Hypotheses. promotion.test.mjs 5/5. |
| 0.4.2+draft | 2026-06-25 | LYRA | FEAT-Tiered-Review complete: L1 local-SLM escalate-only tier (FR-002, l1Route/runL1, opt-in) + L0-averted line on the live cost meter (FR-005). l1-route.test.mjs 5/5; 19 engine tests green. |
| 0.4.1+draft | 2026-06-25 | LYRA | Closed PHASE-HYB-03 exit clause empirically: review-tax telemetry (FR-005) via review-tax.mjs analyzeReviewTax + savings-report L0 section; measured on a real run L0 averted ~$2.22 review (tax 0% measured vs ~100% counterfactual). review-tax.test.mjs 5/5. |
| 0.4.0+draft | 2026-06-25 | LYRA | RM-009 done: T0 per-agent failure memory (anti-error loop). L0 deterministic failures now persist their real tool output as a retrievable lesson; the failure-log -> queryPastMistakes -> prompt injection loop primes a similar future task not to repeat it. anti-error-loop.test.mjs 4/4. PHASE-HYB-03 complete (steady-state benchmark noted as follow-up). |
| 0.3.0+draft | 2026-06-25 | LYRA | RM-008 done: L0 deterministic gate (FEAT-Tiered-Review FR-001) — runL0 runs compile/lint/test before any paid LLM review; deterministic failures route to rework at $0. Unit tests 5/5 + live proof (#review=0, review $0 vs $0.74). PHASE-HYB-03 in_progress. |
| 0.2.1+draft | 2026-06-25 | LYRA | RM-005 done: --repo retargeting in run.mjs/cli.mjs + live end-to-end proof on an external sample repo (frontier plan + on-device execute + Verify Gate + real diff + meter). PHASE-HYB-02 complete. |
| 0.2.0+draft | 2026-06-25 | LYRA | PHASE-HYB-02 reality-sync: planner (RM-002), run CLI (RM-003), repo-agnostic scope (RM-004) marked done; G-orchestra engine forked into engine/ and de-coupled from G-Maiden; UI traceability repointed to engine/; RM-005 proof now in_progress. |
| 0.1.0+draft | 2026-06-23 | LYRA | Created the hybrid-MVP roadmap (Now/Next/Later as phases): checkpoint done; V1 real loop now (package the G-orchestra engine behind `hybrid-meter run`); savings + memory levers next; distribution later. |
