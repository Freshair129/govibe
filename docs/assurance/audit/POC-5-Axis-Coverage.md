---
doc_id: "POC-5-AXIS-COVERAGE"
title: "PoC-1: The 5-axis model covers project documents at every density (sparse → dense)"
status: "draft"
version: "0.1.1+draft"
updated: "2026-08-19"
owner: "Boss (CEO)"
type: audit
---

# PoC-1: 5-Axis Document Coverage

## 1. Claim
The 5-axis model accommodates the documents of **any** project — from a project with almost no docs (vibe-coded, code only) to a full enterprise doc set — with **no artifact falling outside the model**.

## 2. Method (why this is a proof, not a wish)
The 5 axes form a **coordinate system**. Therefore:
> document *density* = how many coordinate points are **populated**; the coordinate **space itself is constant**.
A coordinate space covers a sparse population and a dense population identically. So the claim **reduces to one checkable condition:**

> **Does every artifact have coordinates?** ⇢ prove via an exhaustive **3-bucket closure** (every artifact is structural-design **or** cross-cutting **or** code — there is no 4th bucket).

## 3. The 5 axes
| Axis | Meaning | Labels |
|---|---|---|
| **L** | structural containment (where in the part-whole tree) | L0–L7 (METH…PLAT) |
| **D** | compaction depth (levels packed per physical file) | D1–D5 |
| **SWE** | document abstraction / human-facing type (the "language") | BRD/PRD/SRS/SDD/HLD/LLD + cross-cutting |
| **R** | context hop radius (Retrieval Radius) | R0–R6 |
| **P/S** | process phase / decomposition stage | P0–P6 / S1–S12 |

## 4. Coverage Matrix — GoVibe's real doc types mapped (empirical)
Bucket: **A** = structural-design (→ L/D) · **B** = cross-cutting (→ SWE-type + wikilink) · **C** = code (→ L0 atoms).

| GoVibe doc type | Bucket | SWE type | L / D | R | P/S |
|---|---|---|---|---|---|
| BRD-* | B | BRD (business) | — | R6 | P0 |
| PRD-* | B | PRD | — | R5 | P0–P1 |
| SRS-* / SRD-* | B | SRS | — | R2–R3 | P2 |
| SDD-* / SDD-System-Design | A | SDD/HLD | Sys–Mod / D4–D5 | R3–R4 | P2–P3 |
| LLD-* | A | LLD | Comp–Meth / D1–D2 | R1–R2 | P3 |
| C4-* / CTX-* | A | HLD/Architecture | Plat–Mod / D5 | R4–R6 | P2 |
| ERD-* | A | Data model | ENTITY atoms / D3 | R2 | P2 |
| SEQ-* | A | FLOW/sequence | cross-level / D3 | R2–R3 | P2–P3 |
| FEAT-* (×38) | A | Feature spec | Feature (L2–L3) | R2 | P2 |
| BLUEPRINT-* | A/B | Implementation plan | Mod–Feat | R2–R3 | P3 |
| SPEC-* | A | Technical spec | varies | R2–R3 | P2 |
| DESIGN-* (SITE_MAP, DESIGN_SYSTEM, WIREFRAME) | A | UI/UX design | Comp | R2 | P2 |
| ADR-* (×19) | B | ADR (decision) | — | varies | P2 |
| API-* | B | API contract | API atoms | R2 | P2 |
| STD-* | B | Governance policy (`GOV--`) | — | R4–R6 | P0 |
| CONCEPT--* | B | Concept/vision | — | R5 | P1 |
| RUNBOOK-* | B | Runbook (ops) | — | R1–R3 | P2(ops) |
| RCA-* | B | RCA (analysis) | — | varies | P6 |
| AUDIT-* / this doc | B | Audit/verification | — | varies | P6 |
| TEST-PLAN / TDD-* / UAT-* | B | Test Plan | — | R1–R2 | P6 |
| MIG-* | B | Migration plan | — | R3–R4 | P3 |
| GVDOC-* (Handover) | B | Handover/ops | — | varies | P3 |
| ROADMAP/MASTERPLAN/BACKLOG/SPRINT/IMP | B | Planning | — | R5–R6 | P0/P4 |
| DOC-VERSION-REGISTRY | B | Index/provenance (Master Log) | — | R5 | — |
| CR-* (change request) | B | Decision/process | — | varies | P2 |
| AGENTS.md / AGENT.md | B | Agent contract/policy (`GOV--`) | — | R4 | P0 |
| `src/**`, `scripts/**` | **C** | code | L0 atoms (decompose) | R0–R1 | P5 |

**Result:** 26 representative doc types (covering GoVibe's ~108 registered doc_ids + 38 FEAT + 12 systems) → **all 26 map to A / B / C with coordinates. 0 fall outside.** Closure over *types* ⇒ closure over *instances*. ∎

## 5. Density spectrum (one coordinate system, different populations)
| Tier | Project profile | Docs present | Covered? |
|---|---|---|---|
| 0 | vibe-coded, no docs | code only | ✅ — 12-step decomposes code → L-atoms (the missing structure is *derived*, not required) |
| 1 | README + code | + 1 CONCEPT/PRD-ish | ✅ |
| 2 | startup MVP | PRD + a few FEAT | ✅ |
| 3 | **GoVibe today** | BRD+PRD+SRS+SDD+ADR+API+STD+FEAT(38)+SYS(12) | ✅ (mapped above) |
| 4 | mature product | + LLD+ERD+Test+Runbook+C4 | ✅ |
| 5 | full enterprise | + HLD+MIGRATION+HANDOVER+full governance | ✅ — more points, **same axes** |

## 6. Falsification criterion (honest)
This PoC is **disproved** the moment a project artifact appears that **cannot be assigned coordinates** (i.e., is not structural-design, not cross-cutting, and not code). None found across GoVibe's real set. A genuinely new artifact *type* would **extend the SWE enum**, not break the axes.

## 7. Honest limits
- "Covers" = *can be coordinated*, **not** *auto-classified correctly* — correct classification is the decomposition-fidelity problem (separate; treated as enabling-infra per ADR-019).
- The mapping above is per **doc type**; per-instance coordinates should be machine-asserted (see §8).

## 8. Automatable check (turns this PoC into a permanent gate)
Extend `validate-docs`: for every doc, assert it resolves to a `(bucket, SWE-type, L?, D?, H?, P?)` coordinate; **fail** if any doc cannot be coordinated. This makes "5-axis coverage" a continuously-verified invariant, not a one-time argument.

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1+draft | 2026-08-19 | ATHER | Corrected abolished H-axis semantics per ADR-021/AUD-14 (TASK-PRD-022 sweep): the axis previously labeled `H` (values `H0-H6`) is renamed `R` (Retrieval Radius, `R0-R6`) throughout the axis table and coverage matrix — this PoC's "H" always meant context hop radius, never the executor Access Scope axis. |
| 0.1.0+draft | 2026-06-22 | Boss (CEO) | PoC-1: 5-axis coverage via coordinate-system + 3-bucket closure; empirical map of GoVibe's real doc types (0 outside). |
