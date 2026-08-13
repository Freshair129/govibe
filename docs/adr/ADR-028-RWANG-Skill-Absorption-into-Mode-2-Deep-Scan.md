---
title: "ADR-028: RWANG Skill Absorption into the Mode 2 Deep Scan"
doc_id: "ADR-028-RWANG-SKILL-ABSORPTION-MODE-2-DEEP-SCAN"
status: "proposed"
version: "0.1.0"
updated: "2026-08-12"
owner: "Boss (CEO)"
source_of_truth: true
access_scope: "H3"
complexity: "C-3"
related_docs:
  - "docs/mode2/DEEP-SCAN-12-STAGE-SPEC.md"
  - "docs/mode2/MODE2-ARCHITECTURE.md"
  - "docs/mode2/IMPLEMENTATION-ROADMAP.md"
  - "docs/change-control/change-requests/CR-2026-07-26-GoVibe-RWANG-Capability-Absorption.md"
  - "docs/architecture/RWANG-CONSUMER-BOUNDARY.md"
  - "docs/STD-Execution-Governance.md"
  - "docs/adr/ADR-021-H-Axis-Access-Scope-Semantic-Separation.md"
external_authority:
  repository: "Freshair129/RWANG-PROMAX"
  path: "skills/rwang/skills/"
  inspected_at: "2026-08-12"
---

# ADR-028: RWANG Skill Absorption into the Mode 2 Deep Scan

## Status

**Proposed.** Awaiting owner acceptance.

Owner direction on 2026-08-12 ("just adopt it") endorsed *absorbing* RWANG mechanisms. It did
not review Decision 2, which declares RWANG's trust hierarchy wrong as written and inverts it
for governed semantics, nor the §Rejected table. Those go beyond "adopt" and are the owner's
to accept. An earlier revision of this document self-applied `accepted`/`1.0.0`; that was an
overreach and is corrected here — `.claude/skills/doc-architect/SKILL.md` §4.2, authored the
same day, lists ratification as non-delegable.

Lineage: `CR-2026-07-26-govibe-rwang-capability-absorption` (approved) established that
GoVibe absorbs RWANG capabilities in principle. This ADR decides *which* mechanisms from the
six RWANG document-intelligence skills enter the Mode 2 deep scan, and on what terms.
`docs/architecture/RWANG-CONSUMER-BOUNDARY.md` remains the product boundary; this decision
does not change it.

## Context

GoVibe Mode 2 defines a twelve-stage semantic deep scan
(`docs/mode2/DEEP-SCAN-12-STAGE-SPEC.md`). Tranche 1 has shipped Stages 1–4; Stages 5–12 and
the coverage engine, view router, and roadmap compiler are unbuilt.

RWANG ships six document-intelligence skills — `doc-architect`, `doc-graph`,
`doc-preflight`, `implementation-plan`, `rwang-self-audit`, `subagent-driven` — inspected at
`C:\Users\freshair\.claude\skills\rwang\skills\` on 2026-08-12. Several address problems the
remaining Mode 2 tranches will otherwise solve from scratch.

The two systems are **not competitors**. They solve different problems and overlap on a
narrow seam:

| | RWANG skills | GoVibe Mode 2 deep scan |
|---|---|---|
| Problem | Documentation intelligence for a project whose docs already follow a known layout | Semantic reconstruction of an arbitrary, possibly undocumented workspace |
| Input assumption | `docs/` exists and is structured | Nothing is assumed; the tree is discovered |
| Output | Doc graph, health report, implementation plan | Candidate Semantic IR, coverage, views, roadmap |
| Truth model | Graph is written directly by the skill | Candidates only; MSP mediates, GKS is canonical |
| Overlap | traceability, drift, roadmap generation | |

The absorption question is therefore not "which system wins" but "which mechanisms fill a
real Mode 2 gap without violating GoVibe's authority model".

## Dimensional Comparison

### A. Dimensions where both are present and comparable

| Dimension | RWANG | GoVibe Mode 2 | Verdict |
|---|---|---|---|
| Doc→doc reference graph | `doc-graph` `references` edge | L2 Stage 3 wikilink/reference edges, already implemented in `packages/govibe-core/src/scan/stage-adapters.mjs` | **Parity on the edge.** GoVibe additionally resolves by `doc_id`, which `doc-graph` has no concept of. No import needed. |
| Code symbol extraction | definition scan (classes, functions, routes, models, imports) plus annotations | Mode 2 Stage 3 TypeScript AST (`symbols`, `modules`, `exports`) | **GoVibe deeper, narrowly.** `doc-graph` does extract unannotated definitions — the earlier claim that it cannot was wrong. GoVibe's advantage is AST fidelity and `source_span`, not annotation-dependence. |
| Dependency graph | `depends_on` edges | Mode 2 Stage 4 edges classified `compile-time`/`runtime`/`data`/`event`/`network`/`tooling`/`test` | **GoVibe deeper.** RWANG's edge is unkinded. |
| Drift / staleness | Change DAG, 3-hop propagation | `impact-engine.mjs` explainable reverse traversal + content-hash invalidation | **GoVibe deeper**, except for the hop guard — see §B7. |
| Roadmap generation | `implementation-plan` | Roadmap compiler (T5) | **Comparable in intent.** RWANG has estimation math GoVibe lacks — see §B5. |
| Requirement coverage | Check 4: requirement-ID coverage | Coverage engine (T3): semantic-dimension coverage | **Different axes, complementary.** RWANG asks "is FR-001 implemented and tested"; GoVibe asks "does this block cover the `verification` dimension at all". Both are wanted. |
| Contradiction detection | Check 5 + `contradicts` edge | §9 WHAT-IS vs WHAT-SHOULD-BE | **Parity on detection.** RWANG additionally declares a resolution order — see §B2. |

### B. Dimensions RWANG has that GoVibe lacks

| # | Dimension | What RWANG provides | Why GoVibe lacks it | Value |
|---|---|---|---|---|
| B1 | **Human-authored doc↔code annotations** | `@req` / `@spec` / `@designs` / `@tested` in source comments | Stage 10 must *infer* `Test —VALIDATES→ Requirement` from naming and imports; unproven links stay candidates forever | **Highest.** Converts a tier-6 LLM inference into a tier-1 deterministic parse. |
| B2 | **Contradiction resolution order** | `Code > SDD > PRD` trust hierarchy | §9 detects drift but declares no ranking, so every contradiction is equally weighted noise | High, with a correction — see §Decision 2 |
| B3 | **Finding severity taxonomy** | `CRITICAL` / `WARNING` / `INFO` / `PASS` | Stage records carry `status` + `confidence`; individual findings carry no severity | Medium |
| B4 | **Per-doc-type section checklists** | Expected sections per PRD / SDD / AI-system doc | GoVibe coverage is dimension-based, never section-based | Medium, complementary |
| B5 | **Effort and critical-path model** | Points = Scope + Risk + Dependencies + AI/ML; topological sort; critical path; parallelizable subtrees | Roadmap compiler defines a hierarchy but no estimation or scheduling math | High |
| B6 | **Doc structure decision engine** | `doc-architect` signal scan + 0–100 template scoring | No equivalent anywhere in GoVibe | Medium — already absorbed at the skill layer, not the scan layer |
| B7 | **Propagation depth guard** | Hard stop at 3 hops, explicitly to avoid flag storms | GoVibe has an `R` axis (`R0..R6`) but no documented default bound on impact traversal | Medium |

### C. Dimensions GoVibe has that RWANG lacks

| # | Dimension | GoVibe | RWANG gap |
|---|---|---|---|
| C1 | **Provenance and confidence per node** | `source_span`, `provenance`, `confidence`, `inferred`, `explicit` | Graph nodes carry only `hash` and `last_verified`, and no `source_span`. Edges *do* carry `source` (`annotation` / `dag-propagation` / `manual`), so derivation is recorded; what is missing is confidence and an inferred/explicit flag. |
| C2 | **Canonical authority separation** | No scanner mints GKS identity; MSP mediates every promotion | The skill writes `docs/.doc-graph.json` directly. Scanner output *is* the record. |
| C3 | **Semantic conservation** | `EXACT`/`EQUIVALENT`/`APPROXIMATE`/`PARTIAL`/`UNRESOLVED`/`UNPROJECTABLE` | No notion of lossy projection. A transformation either happened or did not. |
| C4 | **Extraction precedence ladder** | parser > metadata > static analysis > structured extraction > graph traversal > LLM | Not ranked. Annotation scanning and inference are undifferentiated. |
| C5 | **`UNRESOLVED` as first-class output** | Absent meaning is recorded, never invented | Flags `stale` and `contradicts`, but has no way to say "this meaning is simply missing". |
| C6 | **Incremental rescan** | size+mtime fingerprint → cached content hash → per-stage input hash, with `verifyContent` to force full re-hash | **Near parity.** `doc-graph` does update incrementally and compares per-node hashes; GoVibe's advantage is per-stage input hashing and an explicit correctness escape hatch, not the presence of incrementality. |
| C7 | **Governance axes** | `C`, `H`, `R`, `D`, `W`, `context_budget`, risk | None. |
| C8 | **Workspace discovery on an unknown tree** | Language, framework, package manager, build system, monorepo, git; 16-class artifact taxonomy | Assumes a `docs/` layout already exists. |
| C9 | **Provider-neutral workspace adapters** | `WorkspaceAdapter` + 4 client adapters | Filesystem-implicit, single-host. |
| C10 | **Agentic system scan** | Stage 11 (mandatory): reads another agent's governor, skills, MCP servers, gates | No concept of scanning a foreign agent system. |
| C11 | **Runtime semantics** | Stages 7–9: behaviour, state machines, decisions, cross-cutting concerns | No runtime-semantics recovery at all. |
| C12 | **Multi-projection view router** | One semantic model → C4 / ERD / Sequence / State / Traceability | Generates traceability matrices only. |

### Summary

RWANG is stronger where **humans have already annotated intent**. GoVibe is stronger where
**nothing has been annotated and meaning must be reconstructed with provenance**. RWANG's
advantage is concentrated in five importable mechanisms; GoVibe's advantage is structural
and not portable back.

## Decision

Absorb five mechanisms into the Mode 2 pipeline. Reject the rest. Each import is constrained
so it cannot bypass GoVibe's authority model.

### 1. Adopt `@req` / `@spec` / `@designs` / `@tested` annotations — Stage 10, tranche T2

Annotation parsing becomes a **deterministic extractor at precedence tier 1**, not tier 6.
A parsed annotation yields `inferred: false`, `explicit: true`, `confidence: 1`, with the
comment's `source_span` as evidence.

Constraints:

- An annotation is **evidence, not authority**. It still produces a *candidate* relation and
  still promotes through MSP. A comment claiming `@req FR-001` does not create FR-001.
- A `@req` pointing at a requirement id no extractor has seen becomes `UNRESOLVED`, recorded
  with the annotation's location. It must not silently mint the target node — that would be
  a scanner minting identity, which C2 forbids.
- Inferred `VALIDATES` links from naming or imports remain supported and remain candidates.
  Annotation presence raises confidence; annotation absence is not evidence of no link.

### 2. Adopt the trust hierarchy — as a **candidate ranking**, split on two axes — T4

RWANG's flat `Code > SDD > PRD` is **wrong for GoVibe as written**, and adopting it verbatim
would invert this repository's own governance. Code is authoritative about *behaviour*; it
is not authoritative about *governed semantics* — `docs/STD-Execution-Governance.md` and
`docs/adr/ADR-021-...md` outrank any code that contradicts them, which is precisely why the
H-axis remediation phase exists.

Adopted form:

| Contradiction concerns | Precedence |
|---|---|
| Runtime behaviour, actual API shape, actual schema | Code > SDD > PRD |
| Governed semantics, axis meaning, authority boundary, naming law | STD / ADR > SDD > Code |

Constraints:

- This ranks candidates for human review. It **never auto-resolves**. §9 of the Mode 2
  architecture forbids automatically fixing contradictions and that stands.
- Ranking presumes each artefact's doc role is known. In an undocumented workspace (POC class
  E) no such roles are discoverable, so axis 2 does not apply and contradictions stay
  unranked rather than being ranked on a guess.
- Every ranked contradiction carries both artefacts and the axis used to rank them.

### 3. Adopt the severity taxonomy — T4

Findings gain `severity ∈ {critical, warning, info}`. Severity is an attribute **of a
finding**, orthogonal to the stage `status` and to `confidence`. It does not replace either:
a high-confidence finding can be `info`, and a `complete` stage can emit `critical` findings.

### 4. Adopt per-doc-type section checklists — coverage engine second axis — T3

The coverage engine gains a second, optional axis alongside semantic dimensions:

```
dimension coverage   — does this block cover `verification` at all?      (GoVibe)
section coverage     — does this SDD have an Error Handling section?     (RWANG)
```

Section checklists are **profile data, not code**, and are project-configurable. GoVibe's
own checklists derive from `.agents/doc_writer/template/`, not from RWANG's 3-Layer layout.

### 5. Adopt the effort and critical-path model — roadmap compiler, T5

Import points estimation (Scope + Risk + Dependencies + AI/ML), topological sort, critical
path, and parallelizable-subtree detection.

Constraint — **the points score is not a governance axis.** It is an `effort_estimate`
attribute. It must never be written into `complexity` (`C-0..C-3`) or `access_scope`
(`H0..H4`), and a high point score does not raise `H`. Conflating an estimate with an
authority ceiling is the same class of error ADR-021 exists to prevent.

### 6. Adopt the propagation depth guard — express on the existing `R` axis — T3

RWANG's 3-hop stop is imported as the **default retrieval radius `R3`** for impact
traversal, configurable per query. It is not a new concept and gets no new field: graph
distance already has an axis. Do not introduce `max_propagation_depth` as an alias for
`retrieval_radius`.

### Rejected

| Rejected | Reason |
|---|---|
| `docs/.doc-graph.json` as a store | The registry is the audit sitemap and GKS holds canonical relations. A third competing index would drift. The graph may exist as a derived artefact only. |
| `doc-architect` scoring into the scan | Belongs at the authoring layer. Already absorbed as `.claude/skills/doc-architect/SKILL.md`. |
| `subagent-driven` orchestration | Orchestration, not scanning. GoVibe has `workflow-engine.mjs` and the execution router. |
| RWANG's Document Control block, `Version History`, `SDD-xxx` ids, `docs/SRS/` layout | Conflicts with `STD-Document-Versioning-Governance.md`; already corrected in the skill override. |
| `rwang-self-audit`'s PowerShell scanner | Platform-bound. Its *discipline* — read-only, "candidate not canonical", report parse failures rather than infer success — is already GoVibe policy. |

## Consequences

### Positive

- Stage 10 gains a deterministic path to `Test —VALIDATES→ Requirement`, the weakest link in
  the twelve-stage design. This is the single largest accuracy gain available to T2.
- The roadmap compiler inherits scheduling math instead of inventing it in T5.
- Contradiction output becomes triageable rather than a flat candidate list.
- Coverage gains a granularity the dimension axis cannot express.

### Negative

- Annotations are a **new obligation on the scanned repository**. A workspace with no
  annotations gains nothing from import 1, and Mode 2 must not degrade for it — annotation
  absence must never lower a coverage or confidence score, only presence may raise it.
  Otherwise GoVibe would penalise a repository for not adopting RWANG's convention, which
  violates provider neutrality.
- Two coverage axes are harder to explain than one. The coverage report must state which
  axis produced each gap.
- The two-axis trust hierarchy (Decision 2) is more complex than RWANG's flat one and needs
  a classifier for "is this contradiction about behaviour or about governed semantics".
  Where that classification is uncertain the contradiction stays unranked, not guessed.

### Neutral

- No change to the MSP or GKS boundary. Every import produces candidates.
- No change to the existing `scan/` L2 pipeline or its `CANONICAL_STAGES`.
- No change to `docs/architecture/RWANG-CONSUMER-BOUNDARY.md`.

## Implementation Binding

| Decision | Mechanism | Tranche | Task |
|---|---|---|---|
| 1 | Annotation extractor, Stage 10 | T2 | TASK-M2-010 |
| 2 | Two-axis contradiction ranking | T4 | TASK-M2-016 |
| 3 | Finding severity | T4 | TASK-M2-016 |
| 4 | Section-coverage axis | T3 | TASK-M2-013 |
| 5 | Effort and critical path | T5 | TASK-M2-017 |
| 6 | `R3` default traversal radius | T3 | TASK-M2-013 |

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0 | 2026-08-12 | Boss (CEO) | Propose absorption of five RWANG mechanisms into the Mode 2 deep scan, with the trust hierarchy corrected to two axes and the effort score barred from the C and H axes. Status corrected from a self-applied `accepted`/`1.0.0` to `proposed`; three comparison rows (A1, A2, C1, C6) corrected after adversarial review found they understated RWANG; unrecorded benchmark figures removed; `§10` anchors corrected to `§9`; stage references qualified `L2` vs `Mode 2`. |
