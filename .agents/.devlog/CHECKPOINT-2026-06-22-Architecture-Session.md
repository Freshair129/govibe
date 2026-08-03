---
doc_id: "CHECKPOINT-2026-06-22-ARCH-SESSION"
title: "Checkpoint — GoVibe architecture session (2026-06-22)"
status: "active"
version: "0.1.0"
updated: "2026-06-22"
owner: "Boss (CEO)"
type: checkpoint
---

# Checkpoint — GoVibe Architecture Session (2026-06-22)

> **Anchor doc.** When an agent drifts / hallucinates, re-read THIS first to re-ground.
> High-signal only — facts, decisions, corrections. Not a transcript.

## 1. Canonical ground-truth (anchor against these)
- **Stack (4 layers):** Cognitive (GoVibe + other agents) → **MSP** (Memory OS / *passport*, 19 MCP tools) → **GKS** (atomic-`.md` corpus + index) → **Obsidian / GenesisBlockDB** (runtime / backend).
- **Positioning:** GoVibe = **governance-over-codegen + interop translator** — NOT an orchestrator/DB/memory competitor. Rides MCP/A2A (does **not** try to be the standard). **Interop = the GKS semantic pivot, NOT bridges/adapters:** universal code-in (7-up/12-down → atoms) for ANY repo → `A1 ⇄ GKS ⇄ A25` via per-convention language packs (**N mappings, not N²**). Other frameworks (CrewAI / LangGraph / …) are **user *dialects* it translates, not integration targets** — no per-framework adapter is built (can't cover every system).
- **GKS = canonical core, NOT a hidden pivot:** GoVibe just doesn't *speak GKS to the user* (replies in their own terms, doesn't narrate atom-level derivation). It is **directly inspectable in full-eco use** via the visual UI (ERD / DAG / Obsidian-style node graph over GKS + GenesisBlockDB).
- **Tiered adoption (NOT all-or-nothing):** *Partial* = **bring your own orchestration + governance** (CrewAI / Claude / etc.); GoVibe rides at the boundary as interop/translator (more cross-system translation → more tokens). *Full eco* (GoVibe + GKS + GenesisBlockDB + `.agents`) = **GoVibe provides** the visual GKS UI, **`.agents` acting as the orchestrator**, native-GKS token efficiency, and end-to-end traceability. Using partial is fine — you just lose those features. (Correct earlier note that called orchestration "out of scope": it's a **full-eco capability**, just not the market *positioning/moat*.)
- **Translator / interlingua:** GKS = internal pivot; **users never see GKS**; `A1 ⇄ GKS ⇄ A25`; **N mappings, not N²**.
- **Moat:** governance + provenance (Execution-Governance gate · Master-Log · Tension/drift). NOT DB perf, NOT codegen.
- **5 axes (orthogonal — never collapse into one number):** `L` containment (L0–L7) · `D` compaction depth (D1–D5; renamed from "H-compaction") · `SWE` doc type (BRD/PRD/SRS/SDD/LLD + cross-cutting) · `H` context hop (H0–H6) · `P/S` phase (P0–6) / decomposition stage (S1–12).
- **Structure:** single containment tree `PLAT→SYS→SUBSYS→MOD→SUBMOD→FEAT→COMP→CLASS→METH` + wikilink `[[TYPE::Name]]` cross-links (Acyclic Backlink Invariant). Criticality support/core/central **auto-derived** (K-Impact `R=0.5·DD+0.3·AS+0.2·SC`).
- **Pipelines:** 12-step top-down (code→atoms, zero-migration, doesn't touch existing docs) + 7-phase bottom-up (intent→doc→spec→code), gated by H + W-scale + Complexity. Universal **code-in + MCP-out** ⇒ no per-framework adapters.
- **Retrieval (MSP §13, 4-layer):** Atomic `gks_lookup` (O(1)) → FTS → Vector `gks_recall` (HNSW) → Graph `gks_backlinks` (5-hop acyclic). Budget control = resolution-gradient + compressor + K-Impact rank (2D: H=reach × budget=volume).

## 2. Decisions (ADR-015..019, status: **accepted** ✓ ratified 2026-06-22)
- **ADR-015** Master = essence/index; root policy → `GOV--`
- **ADR-016** force-full-stack (GoVibe+MSP mandatory; only backend swappable)
- **ADR-017** governance translator; GKS interlingua; ride MCP/A2A
- **ADR-018** containment tree + wikilink graph; criticality auto-derived
- **ADR-019** universal code-in (12) + MCP-out (7); decomposition/gen = enabling-infra, NOT moat

## 3. Artifacts produced this session
- ADR-015 … ADR-019 (5 files under docs/adr/)
- `docs/BRD-GoVibe-Platform.md` (+ §4.1 Translator Model)
- `docs/assurance/audit/POC-5-Axis-Coverage.md` (PoC-1: 5-axis coverage, 0 docs outside)
- Historical note: the former deterministic registration utility was later retired; current documentation tooling is limited to the scripts that remain under `scripts/docs/`.
- All 7 registered under `DOC-VERSION-REGISTRY.md` §8 Auto-Registered · `docs:validate` PASS

## 4. Corrections / anti-hallucination anchors (things easy to get WRONG)
- **MSP = passport** (memory+soul+retrieval) — NOT "gatekeeper" (gatekeeping is *one* module).
- **GenesisBlockDB = real + benchmarked** (`G:\GenesisBlock_Dev`; 7–185× vs Neo4j embedded) — NOT aspirational.
- **"Two orthogonal catalogs" was too dogmatic** → actual = single containment tree + wikilink graph.
- **7-phase/12-step ≠ Hierarchy-Compaction:** process axis vs structure axis (NOT redundant).
- Real overlap = **the "H" label collision** (compaction-height H1–5 vs context-hop H0–6, inverted) → rename compaction → `D`.
- **ADR-007 (deterministic doc-create/register) was NOT implemented** before this session; now `register-doc.mjs` exists (register only; full `doc create` scaffold still TODO).
- **GoVibe today exposes 10 `govibe.*` MCP tools, ZERO `msp_*`** → NOT yet wired to MSP (the wrap is intended/in-progress).
- **Audit finding #1** (no enforced governance gate): the gate lives in MSP/GenesisBlockDB — GoVibe just isn't wired to it; no git hooks, CI only runs Playwright (continue-on-error).
- **BACKLOG-p1-mvp-core.md is a legacy import fixture** — do not promote/rewrite.

## 5. Open threads / next
1. ~~Ratify ADR-015..019~~ ✓ DONE (accepted 2026-06-22 via `npm run docs:ratify`).
2. Registry version ✓ bumped (0.1.44). **TODO:** re-file §8 Auto-Registered rows into curated sections (curatorial).
3. ~~PoC-2~~ ✓ DONE (`docs/assurance/audit/POC-H6-Budget-Sufficiency.md`).
4. ~~Doc impact~~ ✓ DONE: new `SRS-GKS-Retrieval-Layer` + `SDD-GoVibe-MSP-GKS-Integration` + H→D note in `FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS`; C4/CTX Decision-Alignment sections; PRD×2/STD `related_adrs` citations. (Deeper PRD *body* rewrites to the new positioning = optional later, with version bumps.)
5. ~~Doc-create~~ ✓ DONE historically; the original command utilities were later retired and are not available in the current repository.
6. ~~Close audit #1~~ ✓ DONE (`.github/workflows/governance.yml` — enforced docs+roadmap gate, no continue-on-error).
7. ~~Re-file §8 Auto-Registered~~ ✓ DONE (drained into §2/§5/§6; dropped `+draft` from the 5 accepted ADRs per STD §6).
8. ~~Doc-format mismatch / positioning sync~~ ✓ DONE: **AGENTS.md = standard** (codex/gpt) refactor — `AGENT.md`/`GEMINI.md` = compat bridges, fixed stale `agent.md` hub ref, registry global_context + init.mjs reordered; PRD-MCP `nine→ten` + added `orchestrate.step` (§7.7); ADR-017 0.1.1 (**GKS not hidden** — not *communicated* to user but inspectable in full-eco UI; **language pack = vocab map + doc-format template**); CONCEPT--HYBRID-JIT §4 **Format-Adaptive Rendering** (render = scope × format); new `FEAT-DOC-FORMAT-TEMPLATE-EXTRACTION`. **CoDev (inter-team) vs CoVibe (solo) = 2 distinct approved modules under SYSTEM-05, not a contradiction.**
9. ~~ADR-016 mandatory-vs-tiered + PRD/BRD positioning sync~~ ✓ DONE: **ADR-016 → Option B (0.2.0)** — GoVibe+MSP = mandatory **core**; GenesisBlockDB/visual-UI/`.agents`-orchestrator/native-GKS = **optional full-eco**; partial adopters run the core over their own orchestration. **PRD-Platform-Overview 0.4.2+draft** repositioned §1/§2 to governance+translator identity (code-in→GKS pivot, no per-framework adapters, tiered adoption, orchestration/visual = capability not moat). **BRD 0.1.1+draft** fixed hidden→internal GKS (L20/§4.1) + CoDev no-bridge wording (L86). docs:validate PASS.
