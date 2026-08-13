---
doc_id: "AMENDMENT-2026-08-12-F1-F4-FINALIZATION-DEFINITION"
title: "Amendment: F1–F4 Finalization Operation Definitions"
status: "candidate"
version: "0.2.0"
updated: "2026-08-12"
owner: "Boss (CEO)"
source_of_truth: false
type: "change-request-amendment"
complexity: "C-2"
access_scope: "H2"
amends:
  - "docs/alignment/ALIGNMENT-04-12-Stage-Decomposition-Contract.md"
normative_target:
  - "docs/api/API-005-GoVibe-Capability-Contracts.md"
related_docs:
  - "docs/alignment/ALIGNMENT-04-12-Stage-Decomposition-Contract.md"
  - "docs/api/API-005-GoVibe-Capability-Contracts.md"
  - "docs/architecture/BLUEPRINT-GoVibe-Capability-Vertical-Slice.md"
  - "docs/assurance/audit/AUDIT-2026-08-01-GoVibe-Canonical-Architecture-Alignment-WP01.md"
  - "docs/mode2/DEEP-SCAN-12-STAGE-SPEC.md"
---

# Amendment: F1–F4 Finalization Operation Definitions

## 1. Purpose

`F1-F4` appears in four active documents as a named concept, always with the same defensive
sentence and never with a definition of what any individual operation is. This amendment
supplies the four definitions and the ordering invariant between them, and prices that
ordering honestly as a proposed change to an approved contract rather than as a defect report.

## 2. Problem

### 2.1 The term is used as though defined, and is not

Verified by direct inspection at commit `53e9269`:

| Document | Line | Text |
|---|---|---|
| `docs/alignment/ALIGNMENT-04-12-Stage-Decomposition-Contract.md` | 49 | "F1-F4 are internal finalization operations. They are not Stage 13-16." |
| `docs/api/API-005-GoVibe-Capability-Contracts.md` | 83 | "F1-F4 are internal finalization operations and are not public Stage 13-16 identifiers." |
| `docs/architecture/BLUEPRINT-GoVibe-Capability-Vertical-Slice.md` | 120 | "F1-F4 are internal finalization operations, not Stage 13-16." |
| `docs/assurance/audit/AUDIT-2026-08-01-...-WP01.md` | 370 | "**Not verified:** ... F1-F4 finalization" |

The only substantive statement anywhere is `ALIGNMENT-04` §Finalization alignment:

> "F1-F4 may package candidate graphs, evidence, validation results and references. They must
> submit through MSP and must not write GenesisBlockDB directly."

That sentence enumerates *outputs*. It does not say which operation produces which, in what
order, or under what precondition. No document defines `F1`, `F2`, `F3`, or `F4` individually.
A repository-wide search for a per-operation definition returns nothing.

### 2.2 It is not implemented

`grep` over `packages/govibe-core/src` and `scripts/mcp` finds no `F1`–`F4` symbol. The
closest existing artefact is `validateDeepScan()` in
`packages/govibe-core/src/scan/graph-validation.mjs` (22 lines), which runs after Stage 12 and
performs four structural checks. No document states which F it is.

### 2.3 Why the repetition matters

Three separate documents carry a negative assertion ("they are **not** Stage 13-16"). A
guard rail repeated three times is evidence that the numbering was previously misread. The
absence of positive definitions is what keeps making that misreading available.

## 3. Authority Placement

`ALIGNMENT-04` states in its own Purpose: *"It is not a competing source of truth."* Putting
new normative definitions only there would violate the document's own declared role.

Therefore:

- This amendment **drafts** the definitions and is raised against `ALIGNMENT-04` as requested.
- On ratification the **normative** text belongs in `docs/api/API-005-GoVibe-Capability-Contracts.md`,
  which already owns the stage/finalization contract, with `ALIGNMENT-04` mapping vocabulary to
  it as it does for the twelve public stages.

## 4. Definitions

`F1`–`F4` are internal finalization operations of a Deep Scan run. They are not stages, carry
no public stage identifier, and are never exposed as `Stage 13`–`Stage 16`.

### F1 — Candidate Graph Consolidation

| | |
|---|---|
| **Input** | Terminal stage records 1–12 and their per-stage artifacts |
| **Does** | Assembles one candidate graph from per-stage outputs; deduplicates nodes and edges by candidate identity; resolves references internal to the run; carries every unresolved item forward into a single unresolved register |
| **Output** | Consolidated candidate graph + unresolved register |
| **Must not** | Mint canonical GKS identities; drop or silently resolve an item a stage left unresolved; infer an edge no stage observed |

Deduplication is identity-based, not similarity-based. Two candidates that merely look alike
stay two candidates — merging them is a semantic judgement, and semantic judgement belongs to
GKS after MSP authorization, not to a consolidation step.

### F2 — Graph Validation

| | |
|---|---|
| **Input** | F1 output and the stage records |
| **Does** | Structural validation of the assembled run: canonical stage order; every stage terminal; every producing stage carries an output reference; every `not_applicable` proven by both an exclusion reason and a proof reference; acyclicity for relation types that require it; backlink symmetry |
| **Output** | Validation verdict and typed error list |
| **Must not** | Report `passed` for a run containing a `failed` or `incomplete` stage without an explicitly recorded policy exception |

`validateDeepScan()` in `packages/govibe-core/src/scan/graph-validation.mjs` is the as-built
F2 and implements the first four checks (`canonicalOrder`, `terminalEvidence`,
`outputReferences`, `exclusionsProven`). Acyclicity and backlink symmetry are **not yet
implemented** and must not be claimed.

### F3 — Evidence Packaging

| | |
|---|---|
| **Input** | F1 and F2 outputs |
| **Does** | Builds the proof batch: provenance references, source snapshot hashes, extractor versions, the unresolved register, a confidence rollup, and the F2 verdict |
| **Output** | `govibe-proof-batch/v1` |
| **Must not** | Assert a verdict F2 did not produce; omit the unresolved register, which must be present even when empty so that "zero unresolved" is a recorded claim rather than an absent field |

A confidence rollup is a summary, not a new measurement. It must be derivable from the stage
confidences it summarizes.

### F4 — Promotion Submission

| | |
|---|---|
| **Input** | The F3 package |
| **Does** | Submits `govibe-knowledge-candidate/v1` through MSP and receives opaque knowledge and promotion references |
| **Output** | Opaque `gks:` references |
| **Must not** | Write GenesisBlockDB directly; treat a returned reference as direct GKS access; submit when F2 failed, absent an owner-approved override recorded in the run |

F4 is a *request*, not a write. MSP validates authority and promotion policy and mediates the
GKS lifecycle. A returned reference is an opaque handle.

## 5. Ordering Invariant

```text
F1  →  F2  →  F3  →  F4
```

Strict, for reasons that are structural rather than stylistic:

- F2 cannot validate a graph F1 has not assembled.
- F3 cannot package a verdict F2 has not produced.
- F4 must not offer for promotion a graph F2 has not validated.

The `ALIGNMENT-04` sentence lists outputs in the order "candidate graphs, evidence,
validation results, references". That is an enumeration of artefacts, **not** an execution
order, and must not be read as one. Mapping: candidate graphs → F1, validation results → F2,
evidence → F3, references → F4.

## 6. The Ordering Invariant Is a Proposed Change, Not a Bug Report

An earlier revision of this section claimed the runtime deviated from the contract. That was
backwards, and the correction matters because it changes what the owner is being asked to
approve.

**The runtime conforms to the approved contract today.** `API-005` §Stage contract (line 83,
`approved`, `source_of_truth: true`) states: *"**Producing stages submit** a
`govibe-knowledge-candidate/v1` to MSP."* `BLUEPRINT-GoVibe-Capability-Vertical-Slice.md`
line 117 says the same. `packages/govibe-core/src/scan/stage-runner.mjs:77` implements exactly
that — one submission per producing stage, inside the loop — and `:112` runs
`validateDeepScan(stageRuns)` after the loop.

So no ratified contract disagrees with the runtime. What disagrees with the runtime is **§5 of
this amendment**, which is new. Ratifying §5 is therefore a **breaking change to API-005**, not
a bug fix, and this amendment must say so plainly rather than presenting the code as deviant.

Mitigating the severity: `submitKnowledgeCandidate` is a *request* that MSP authorizes and
gates. It is not a canonical write. Per-stage submission before graph validation therefore
offers structurally-unvalidated candidates for promotion, but cannot itself promote them.

Two resolutions, owner's choice:

| Option | Change | Cost |
|---|---|---|
| **A** (recommended) | Adopt §5 and rewrite `API-005` line 83 + `BLUEPRINT` line 117 to move submission into F4, after F2 | A breaking edit to an approved SoT sentence, plus `stage-runner.mjs` control flow |
| **B** | Keep the current contract and runtime; drop §5's strict ordering, requiring only that F2's verdict be recorded in the F3 package | No contract change; the ordering invariant becomes advisory and GoVibe cannot prove locally that promotion followed validation |
| **C** | Keep per-stage submission but require MSP to withhold promotion pending an F2 verdict | Moves the invariant into MSP; GoVibe can no longer prove the ordering locally |

Option A is recommended because it makes the invariant provable inside GoVibe, but it is a
contract change and is priced as one. This amendment authorizes nothing on its own.

## 7. What F1–F4 Are Not

| Not | Because |
|---|---|
| Stages 13–16 | They are not semantic dimensions. The twelve stages are dimensions of meaning; F1–F4 are operations on a completed run. Numbering them as stages puts an operation on an axis of dimensions — the same category error `ADR-021` prevents on the `H` axis. |
| Public identifiers | `API-005` states they are not public stage identifiers. They must not appear in a tool contract, snapshot field, or MCP response as `stage: 13`. |
| A place to add extraction | Anything that extracts new meaning is a stage concern. F1–F4 assemble, check, package, and submit what stages already produced. |
| Canonical writers | F4 requests; MSP authorizes; GKS canonicalizes; GenesisBlockDB persists. |

## 8. Mode 2 Applicability

`docs/mode2/DEEP-SCAN-12-STAGE-SPEC.md` defines a parallel twelve-stage semantic pipeline with
its own additively-versioned contract. It inherits the F1–F4 vocabulary rather than inventing
a second finalization vocabulary — introducing `M2-Finalize-1..4` alongside `F1..F4` would
duplicate a governed term for no gain.

Mode 2 schema variants: `govibe-mode2-proof-batch/v1`, `govibe-mode2-knowledge-candidate/v1`.
Mode 2 F1–F4 are **not implemented**; they are bound to `TASK-M2-012` (T3), where Stage 12
Candidate Semantic IR first produces a graph worth consolidating.

## 9. Acceptance Criteria

- AC-01: `API-005` carries a per-operation definition of F1, F2, F3, and F4 with input,
  behaviour, output, and prohibitions.
- AC-02: `API-005` states the `F1 → F2 → F3 → F4` ordering invariant and its rationale.
- AC-03: `ALIGNMENT-04` §Finalization alignment points at `API-005` for the normative
  definition instead of carrying the only substantive sentence.
- AC-04: `validateDeepScan()` is documented as the as-built F2, with acyclicity and backlink
  symmetry recorded as unimplemented.
- AC-05: If §6 Option A is chosen, `API-005` line 83 ("Producing stages submit…") and
  `BLUEPRINT-GoVibe-Capability-Vertical-Slice.md` line 117 are rewritten in the same change so
  that API-005 does not simultaneously say stages submit and that F4 submits. Ratifying the
  F1–F4 definitions without this edit would leave the approved contract self-contradictory.
- AC-06: If §6 Option A is chosen, `Given` a run where a late stage fails, `When`
  `validateDeepScan` returns `passed: false`, `Then` no knowledge candidate was submitted for
  any stage in that run. If Option B or C is chosen, the retained behaviour is recorded as an
  accepted deviation with the owner decision that authorized it.
- AC-07: `AUDIT-2026-08-01` §7.4's "Not verified: F1-F4 finalization" can be closed against
  the new definitions plus runtime evidence, not against the definitions alone.
- AC-08: `npm run docs:validate` PASS with no new findings.

## 10. Rollback

Revert this amendment file and any `API-005` / `ALIGNMENT-04` edits made under it. No runtime
behaviour changes under this amendment alone, so there is nothing else to undo.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0 | 2026-08-12 | Boss (CEO) | Define F1–F4 individually, fix the ordering invariant, and place the normative text in API-005 rather than in a self-declared non-SoT alignment doc. |
| 0.2.0 | 2026-08-12 | Boss (CEO) | Correct §6 after adversarial review: the runtime conforms to API-005 line 83 as approved, so the strict F1→F2→F3→F4 ordering is a proposed breaking change to that contract, not a bug report against the code. Added Option B, and an acceptance criterion requiring API-005 and BLUEPRINT to be rewritten in the same change if Option A is chosen. |
