---
title: "Mode 2 Deliverable 10: POC Test Matrix and Measurement"
doc_id: "MODE2-POC-TEST-MATRIX"
status: "draft"
version: "0.2.0"
updated: "2026-08-12"
owner: "Boss (CEO)"
source_of_truth: false
access_scope: "H2"
complexity: "C-2"
related_docs:
  - "docs/mode2/DEEP-SCAN-12-STAGE-SPEC.md"
  - "docs/mode2/IMPLEMENTATION-ROADMAP.md"
  - "docs/architecture/RWANG-CONSUMER-BOUNDARY.md"
---

# Mode 2 Deliverable 10: POC Test Matrix and Measurement

## 1. Purpose

Implementation prompt §28 requires Mode 2 to be tested against five repository classes, and §31
STEP 16 requires measuring semantic coverage, false relations, unresolved meaning, scan time,
and incremental rebuild performance. This document records the matrix, the method, and what the
method **cannot** measure.

## 2. The Measurement Boundary

Correctness is only measurable against declared ground truth.

For an authored fixture the tree is declared in `packages/govibe-core/src/mode2/poc-fixtures.mjs`,
so the expected routes, modules, import edges, requirements, entities, and state shapes are known
exactly and precision and recall are computed against them. **False relation rate** is
`1 − precision` on import edges.

For a real repository nobody has enumerated what a correct extraction would contain. The harness
therefore reports `accuracy: null` and states why, rather than producing an estimate that would
look like a measurement. Coverage, volume, unresolved counts, and timing remain measurable.

This is the difference between the two halves of the matrix, and it is the reason both halves
exist: fixtures prove accuracy, real repositories prove the scanner survives scale and mess.

## 3. The Matrix

| Class | Description | Kind | Where |
|---|---|---|---|
| A | Simple single-service application | fixture | `poc-fixtures.mjs` |
| B | Medium modular application with data and state | fixture | `poc-fixtures.mjs` |
| C | Monorepo | real repository | this repository |
| D | Agentic-agent repository | real repository | RWANG |
| E | Repository with poor or no documentation | fixture | `poc-fixtures.mjs` |

Classes A, B, and E run in the unit suite (`poc-matrix.test.mjs`). Classes C and D are operator
runs, because a unit suite must not depend on a checkout existing at a particular path.

## 4. Fixture Results — Accuracy Measured

Recorded 2026-08-12. Every figure is computed against the ground truth declared alongside the
fixture.

| Class | Routes | Modules | Import edges | Requirements | Entities | State shapes | Agentic | False relation rate |
|---|---|---|---|---|---|---|---|---|
| A | P 1.00 / R 1.00 | R 1.00 | R 1.00 | R 1.00 | — | — | correct | **0** |
| B | — | R 1.00 | R 1.00 | R 1.00 | R 1.00 | R 1.00 | correct | **0** |
| E | — | R 1.00 | 0 found | 0 declared | — | — | correct | n/a |

Class E carries a **declared limitation**: CommonJS `require()` is not an ESM import declaration,
so the dependency graph is empty by construction. The fixture states this so the scanner is not
credited for an empty graph, and so the gap is visible as a real recall limit rather than a
passing score.

## 5. Real Repository Results — Coverage, Volume, Timing

Recorded 2026-08-12. `accuracy` is `null` for both by design (§2).

| | C: monorepo | D: agentic (RWANG) |
|---|---|---|
| Files | 1224 | 370 |
| Atoms / relations | 2099 / 1306 | 607 / 371 |
| Block profile | `agentic-system` | `agentic-system` |
| Coverage ratio | 1.0 | 1.0 |
| Unresolved | 747 | 459 |
| Gap findings | 254 (253 warning, 1 info) | 73 (72 warning, 1 info) |
| F2 graph validation | passed | passed |
| F4 promotion | `blocked` — no MSP boundary | `blocked` — no MSP boundary |
| Roadmap tasks | 254 | 73 |

`F4: blocked` is the correct outcome, not a failure: no MSP boundary is configured and the GKS
client is hard-disabled, so nothing may be promoted. Reporting success here would make an
unpromoted graph indistinguishable from a promoted one.

### 5.1 Class D is the boundary test

RWANG has its own execution and governance system. GoVibe must understand it **without replacing
it**, and the manifest is the evidence:

```text
detected: true | clients: claude-code
observed: governor, hooks, instructions, mcp_servers, memory, skills, subagents
classification: NATIVE 0 | PLATFORM 10 | HYBRID 8 | MISSING 0
boundary: "external governor is analysed, never replaced"
```

Zero `MISSING` axes: GoVibe found no capability gap it needed to fill. Eight `HYBRID` axes: both
systems contribute, and neither is displaced. This is AC-A1, AC-A2, and AC-A3 demonstrated on the
reference case rather than on a fixture built to pass.

### 5.2 Class D was scanned on a copy

RWANG lives outside the GoVibe workspace at `G:/RWANG-canonical-staging`. Mode 2's write policy
permits `.govibe/mode2/`, but writing into another repository that the operator did not ask to
have modified is an ownership question, not a policy question. The measurement therefore ran
against a scratchpad copy, and the original was verified untouched.

## 6. Timing — Observations, Not a Benchmark

| Class | Cold | Warm | Speed-up |
|---|---|---|---|
| C | 86.1 s | 0.3 s | ~266× |
| D | 5.5 s | 0.2 s | ~34× |

**These are single observations on a loaded developer machine and must not be published as
benchmark figures.** The same cold scan of class C was measured between 5.6 s and 221 s across
this session depending on concurrent load — a spread of nearly 40×. The harness attaches a
`caveat` field to every timing block for exactly this reason.

What the warm figure *does* establish is that the incremental path performs no per-file work when
nothing changed: `rehashedFiles: 0` and `executedStages: 0`. That is a structural property, not a
timing claim, and it holds regardless of machine load.

## 7. Incremental Rebuild

Measured by touching one source file and counting stages that actually re-execute. The harness
asserts `0 < stages_reexecuted < 12`: a single-file edit must re-run something and must not
re-run everything. Which stages re-run is derived from each stage's declared `inputs()`, so the
result stays correct as stages are added.

## 8. What This Matrix Does Not Establish

- **Accuracy on real repositories.** No ground truth exists; §2.
- **Semantic correctness of what was extracted.** The fixtures verify that declared entities are
  found, not that the extraction is semantically meaningful to a human reader.
- **Stability across machines.** Timing varies by up to 40× under load, and output hashes are only
  proven stable across two workspaces on one machine (DS-10).
- **Behaviour on non-JavaScript repositories.** Every class in this matrix is JavaScript or
  TypeScript. A Python, Go, or Java repository would exercise the `unsupported-language` path,
  which is tested in isolation but not as a matrix class. This limitation is now bound to
  `AC-H1` and `TASK-M2-026` rather than only being disclaimed here — the CA-05 audit found that
  implementation-prompt §1 responsibility 1, *understand heterogeneous projects*, had no
  criterion testing heterogeneity at all.

## 9. Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0 | 2026-08-12 | Boss (CEO) | Bind the non-JavaScript limitation to AC-H1 and TASK-M2-026 following the CA-05 responsibility audit. | Claude Code |
| 0.1.0 | 2026-08-12 | Boss (CEO) | Record the five-class POC matrix, fixture accuracy with measured precision and recall, real-repository coverage and volume, the RWANG boundary result, and the four things the matrix does not establish. |
