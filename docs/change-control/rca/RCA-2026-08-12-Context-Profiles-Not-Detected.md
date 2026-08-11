---
title: "RCA: Mode 2 Did Not Detect Its Own Missing Context-Packet Capability"
doc_id: "RCA-2026-08-12-CONTEXT-PROFILES-NOT-DETECTED"
status: "draft"
version: "0.5.0"
updated: "2026-08-12"
owner: "Boss (CEO)"
source_of_truth: false
access_scope: "H2"
complexity: "C-2"
related_docs:
  - "docs/mode2/DEEP-SCAN-12-STAGE-SPEC.md"
  - "docs/mode2/IMPLEMENTATION-ROADMAP.md"
  - "docs/change-control/change-requests/amendments/AMENDMENT-2026-08-12-F1-F4-Finalization-Definition.md"
  - "docs/architecture/ARCH-Vault-and-Context-Model.md"
---

# RCA: Mode 2 Did Not Detect Its Own Missing Context-Packet Capability

## 1. Executive Summary

Mode 2 completed five tranches and scanned this repository repeatedly. The repository contains
`CONTEXT_PROFILES = ["T-ctx", "V-ctx", "W-ctx", "M-ctx"]` and a working `buildContextPacket`.
Mode 2 consumed neither, produced no context packet, and **reported no gap** — coverage read
`1.0` on the `agentic-system` profile while a named responsibility from the implementation prompt
was entirely unbuilt.

The omission was found by the owner asking, not by any check.

This is the second time in one session that a real gap was surfaced by human recall rather than
by a validator. The first was `F1-F4` (`AMENDMENT-2026-08-12`). The recurrence is the reason this
RCA exists: two instances of the same failure mode is a pattern, not a coincidence.

## 2. Impact

| | |
|---|---|
| Severity | Medium — a missing capability, not a wrong answer |
| Product | Implementation-prompt §1 responsibility 7, *prepare bounded context for humans and agents*, was unbuilt through five tranches |
| Trust | **This is the real impact.** Coverage reported `1.0` and `missing: (none)` for a workspace with a genuine capability gap. A completeness score that reads clean over a real gap is worse than no score |
| Data | None. No incorrect artefact was produced; the artefact simply did not exist |

## 3. Timeline

| When | What |
|---|---|
| T1–T5 | Mode 2 built and scanned this repository many times; no stage, coverage evaluation, or gap class mentioned context |
| T5 close | Coverage on this repository reported `ratio: 1.0`, `missing: (none)` |
| Mid-T5 | Owner asked "แล้วพวก ctx type อะ" — what about the ctx types |
| Immediately after | `grep` over `packages/govibe-core/src/mode2/` returned zero references to `T-ctx`, `V-ctx`, `W-ctx`, `M-ctx`, `contextId`, or `buildContextPacket` |

## 4. Root Cause

Four independent causes had to hold simultaneously. Each alone would have been caught.

### RC-1 — Stage 3 is blind to exported constants

The symbol extractor handles exactly six declaration kinds:

```text
FunctionDeclaration  ClassDeclaration  InterfaceDeclaration
TypeAliasDeclaration MethodDeclaration EnumDeclaration
```

`VariableDeclaration` is absent. So `export const CONTEXT_PROFILES = [...]` produces **no symbol
atom at all** — and neither does any other exported constant. Const-as-enum, schema-name tables,
policy maps, and configuration objects are a first-class API surface in this codebase, and the
scanner cannot see any of them.

This is the widest of the four causes and is not specific to context.

### RC-2 — There is no `context` semantic dimension

`semantic-dimensions.mjs` defines twenty-two dimensions and none of them is context. The coverage
engine can only report a gap in a dimension it knows about, so a missing context capability had
no slot to be reported in. Coverage was not wrong; it was answering a question that did not
include this one.

### RC-3 — No gap class covers an unconsumed capability

The fourteen gap classes cover *referenced-but-undefined* and *declared-but-unimplemented*. None
covers **implemented, exported, and consumed by nobody in the subsystem that should consume it**.
Before this work `buildContextPacket` had exactly one consumer (`continue.mjs`); Mode 2 added
none, and nothing noticed that a new subsystem had skipped an existing capability.

### RC-4 (root) — The acceptance criteria never covered responsibility 7

`IMPLEMENTATION-ROADMAP` §5 traces its acceptance criteria from implementation prompt §29. But
§29 is **not a complete decomposition of §1's nine responsibilities**:

| §1 responsibility | Acceptance criteria |
|---|---|
| 1 understand heterogeneous projects | AC-S* |
| 2 reconstruct software meaning | AC-M* |
| 3 normalize into Candidate Semantic IR | AC-M* |
| 4 detect missing semantics and contradictions | AC-G* |
| 5 generate multiple governed views | AC-V* |
| 6 preserve traceability | AC-R2 |
| **7 prepare bounded context for humans and agents** | **none** |
| 8 build implementation and change roadmaps | AC-R* |
| 9 coordinate external execution systems | AC-X* |

Eight of nine responsibilities have criteria. Responsibility 7 has none, so no tranche was ever
obliged to deliver it and no gate could ever fail for its absence. RC-1 through RC-3 explain why
the *scanner* missed it; RC-4 explains why the *plan* did.

> **Corrected by the CA-05 audit.** "Eight of nine have criteria" was too generous. Checking each
> criterion against what it actually *tests* rather than what it sounds adjacent to, three of
> those eight were only partial: R1 (`AC-S*` tests scan mechanics, not heterogeneity), R2
> (`AC-M*` tests the shape of the reconstruction, not its correctness), and R9 (`AC-X*` tests
> neutrality, not coordination). So the real starting position was five covered, three partial,
> one absent. See `IMPLEMENTATION-ROADMAP` §5.0.

## 5. Why It Escaped

The same reason `F1-F4` escaped, generalised: **every validator in this repository checks that
declared things are consistent, and none checks that required things exist.**

- `docs:validate` checks frontmatter, changelog, path references, registry drift.
- `roadmap:validate` checks Task Container completeness for tasks that were written down.
- Mode 2 coverage checks dimensions that are in the dimension list.
- Mode 2 gap analysis checks classes that are in the class table.

A responsibility that was never decomposed into a task, a dimension, or a class is invisible to
all four. Adding detectors (RC-1..RC-3) narrows the hole; only RC-4 closes it, because a
capability nobody required cannot be reported missing by a tool that only measures what was
required.

### Related finding, discovered while investigating

`scripts/mcp/vault-context-surface.mjs:5` re-declares the canonical profile list as a local
literal rather than importing `CONTEXT_PROFILES`:

```js
const CONTEXT_PROFILES = ["T-ctx", "V-ctx", "W-ctx", "M-ctx"];
```

Two copies of a governed enum can drift. This is the same duplication class recorded in
`CR-2026-08-12-DOCUMENT-SOT-CONSOLIDATION-DIRECTION`, in code rather than in documents.

## 6. Corrective Actions

| ID | Action | Addresses | Status |
|---|---|---|---|
| CA-01 | Build the Mode 2 context bridge and bind it to `TASK-M2-022` | the missing capability | done |
| CA-02 | Extend Stage 3 to extract exported `VariableDeclaration` symbols | RC-1 | **done** |
| CA-03 | Add a `context` semantic dimension with its producer mapping | RC-2 | **done** |
| CA-04 | Add an `unconsumed_capability` gap class | RC-3 | **done** |
| CA-05 | Add acceptance criteria for prompt §1 responsibility 7 and audit the other eight for coverage | RC-4 | **done** |
| CA-07 | Deduplicate `REPORTED_TOKEN_FIELDS`, or annotate it as a deliberate copy | CA-06 follow-on | proposed |
| CA-06 | Make `vault-context-surface.mjs` import `CONTEXT_PROFILES` instead of re-declaring it | related finding | **done** |

Every corrective action except CA-07 is now applied.

### 6.2 CA-06 result, and what CA-02 found while doing it

`scripts/mcp/vault-context-surface.mjs` now imports `CONTEXT_PROFILES` from its canonical owner.
The change is behaviour-identical — both lists were `["T-ctx", "V-ctx", "W-ctx", "M-ctx"]`, and a
frozen array serialises into a JSON-schema `enum` exactly as the literal did.

Applying CA-02 first turned out to matter. Running the now-const-aware Stage 3 over this
repository and grouping `const-list` / `const-record` symbols by name across files surfaced
**two same-shaped duplications nobody was looking for**:

| Constant | Locations | Verdict |
|---|---|---|
| `REPORTED_TOKEN_FIELDS` | `entitlement-usage-ledger.mjs:11`, `provider-adapter-host.mjs:10` | **New finding.** Same package, byte-identical, no comment explaining the copy. Recorded as CA-07 |
| `KNOWLEDGE_FIELDS` | `msp-client.mjs:20`, `msp-runtime/.../lifecycle-handlers.mjs:11` | **Not a defect.** Byte-identical, but the copy carries an explicit comment declaring it a deliberate cross-package mirror. An annotated boundary duplication is a decoupling choice, not drift |

The remaining name collisions were per-file test locals (`roots`, `cleanups`, `tempDirs`,
`openCallers`), which are not duplication at all.

This is the first finding in this session produced **by the scanner rather than by a human**,
which is the outcome the RCA's prevention section was aiming at.

### 6.1 CA-02 result

`extractorVersion` moved `1.0.0` → `1.1.0`, which correctly invalidates every cached stage-3
record rather than silently retaining it. Exported variable declarations are now classified by
what they actually are — `const-list`, `const-record`, `function` for an arrow assigned to a
const — because recording them all as "variable" would lose the distinction that makes an
exported constant a recognisable capability surface. Module-private constants are recorded with
`exported: false`; locals inside a function body stay out.

Measured on this repository: symbols rose from 1557 to 2218 (+42%), of which 199 are
`const-list` or `const-record`.

**The fix reproduces the RCA's own related finding without human help.** Stage 3 now reports:

```text
CONTEXT_PROFILES  packages/govibe-core/src/context-lineage.mjs:3   const-list  exported=true
CONTEXT_PROFILES  scripts/mcp/vault-context-surface.mjs:5          const-list  exported=false
```

Two declarations of one governed enum, which §5 recorded after finding it by reading. The
scanner can now prove it. CA-06 remains open — this makes the duplication *detectable*, not
*fixed*.

### 6.3 CA-03 and CA-04 result, and a defect they exposed

`context` is now the twenty-third semantic dimension, produced by Stage 9 as a cross-cutting
concern in the same sense logging and caching are, and required by the `agentic-system` block
profile. `unconsumed_capability` is a fifteenth gap class, marked `architecture_class: false`
because the architecture names fourteen and this one is a GoVibe addition.

**Neither would have caught the case that created them, and that is worth stating plainly.**
`context-packet.mjs` was imported by `continue.mjs`, which is reachable, so the capability was
consumed — just not by the new subsystem that should have consumed it. Detecting "A consumes
it, B does not, and B should have" needs a *declared expectation* about B, which is a planning
artefact rather than an observation. The class carries that limit in code as
`UNCONSUMED_CAPABILITY_SCOPE` so a reader cannot mistake its reach.

This confirms RC-4 as the true root cause: only CA-05's acceptance criteria close that case.
CA-03 and CA-04 are worth having on their own merits, not because they close this RCA.

### 6.4 Defect found while implementing CA-03

Wiring the context dimension exposed a real invalidation bug in the incremental pipeline. Stage
12 declared `inputs: () => []` because it reads no files — its whole input is the artifacts of
stages 1-11. Its input hash was therefore **constant**, so it was reused even when every upstream
artifact had changed. Stage 7 had a narrower form of the same bug: it declares only
`package.json` as an input but reads the Stage 3 and 4 artifacts, so it kept stale reachability
whenever a source edit moved the dependency graph.

Both are fixed by a `dependsOnStages` declaration folded into the stage input hash. The
invalidation stays content-addressed on the *artifact*, not on the file, which keeps it precise:
a body-only edit that leaves the Stage 3 artifact identical correctly does **not** cascade, while
adding an export does. Both directions are pinned by a regression test.

The bug was only visible because a new test asserted an outcome that depended on Stage 12 seeing
fresh upstream data. It had been latent since T3.

## 7. Prevention

The durable fix is not another detector. It is closing the loop between a stated responsibility
and a checkable criterion:

1. **Every responsibility gets a criterion.** When a source document states a responsibility, the
   plan of record must carry an acceptance criterion for it or explicitly record why not. RC-4 is
   the only cause that, fixed alone, would have prevented this.
2. **A completeness score must state its own scope.** Coverage already carries
   `claim: "dimension coverage against a block profile; not a document count"`. That claim should
   extend to naming what the dimension list does *not* cover, so `1.0` cannot be read as "nothing
   is missing".
3. **Detectors for absence, not only for inconsistency.** RC-1..RC-3 are three instances of the
   same shape: the repository can prove things about what exists and almost nothing about what
   should exist but does not.

## 8. Related Documents

- `docs/change-control/change-requests/amendments/AMENDMENT-2026-08-12-F1-F4-Finalization-Definition.md`
  — the first instance of this failure mode in this session
- `docs/change-control/change-requests/CR-2026-08-12-Document-SoT-Consolidation-Direction.md`
  — the duplication class the related finding belongs to
- `docs/architecture/ARCH-Vault-and-Context-Model.md` — canonical owner of context semantics
- `docs/mode2/IMPLEMENTATION-ROADMAP.md` §3.1.5 — where the gap is recorded

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.5.0 | 2026-08-12 | Boss (CEO) | CA-03 and CA-04 applied, closing every corrective action except CA-07. Recorded that neither would have caught the case that created them, which confirms RC-4 as the true root cause. Implementing CA-03 exposed a latent incremental-invalidation defect in stages 7 and 12, now fixed and regression-tested. | Claude Code |
| 0.4.0 | 2026-08-12 | Boss (CEO) | CA-06 applied: `vault-context-surface.mjs` imports the canonical `CONTEXT_PROFILES`. Applying CA-02 first surfaced two further same-shaped duplications, of which one is a genuine new finding (CA-07) and one is an annotated cross-package mirror and not a defect. First finding this session produced by the scanner rather than by a human. | Claude Code |
| 0.3.0 | 2026-08-12 | Boss (CEO) | CA-05 applied: responsibility traceability matrix added at IMPLEMENTATION-ROADMAP §5.0, with AC-C1..C4 for responsibility 7 and AC-H1/AC-Q1/AC-X5 for the partials. The audit corrects RC-4's own "eight of nine" estimate to five covered, three partial, one absent. | Claude Code |
| 0.2.0 | 2026-08-12 | Boss (CEO) | CA-02 applied: Stage 3 extracts exported variable declarations, extractor 1.1.0. The fix independently surfaces the duplicate CONTEXT_PROFILES declaration that §5 had found by hand. CA-03..CA-06 remain proposed. | Claude Code |
| 0.1.0 | 2026-08-12 | Boss (CEO) | Record why five tranches of Mode 2 never detected that its own context-packet capability was missing: Stage 3 is blind to exported constants, no context dimension exists, no gap class covers an unconsumed capability, and — the root cause — the acceptance criteria inherited from prompt §29 never covered §1 responsibility 7. |
