---
title: "Mode 2 Deliverable 4: Twelve-Stage Semantic Deep Scan Specification"
doc_id: "MODE2-DEEP-SCAN-12-STAGE-SPEC"
status: "draft"
version: "0.3.0"
updated: "2026-08-12"
owner: "Boss (CEO)"
source_of_truth: false
access_scope: "H3"
complexity: "C-3"
related_docs:
  - "docs/mode2/CURRENT-AS-BUILT.md"
  - "docs/mode2/MODE2-ARCHITECTURE.md"
  - "docs/mode2/WORKSPACE-ADAPTER-CONTRACT.md"
---

# Mode 2 Deliverable 4: Twelve-Stage Semantic Deep Scan Specification

## 1. Relationship to the Existing Deep Scan

GoVibe already has a twelve-stage deep scan at `packages/govibe-core/src/scan/`. Its stages
are *mechanical extraction* passes (`Scan, Structure, Markdown Parse, COBOL Parse, Symbolic
Parse, Routes, Tools, ORM, Cross-File Resolution, MRO, Communities, Processes`). Mode 2
requires a *semantic reconstruction* axis. These are different decompositions of different
problems that happen to share the number twelve.

### 1.1 Decision

The existing `CANONICAL_STAGES` list is **not redefined**. It is contract-validated by
`scan/stage-contract.mjs`, every stage record asserts against it, and MSP evidence batches
already reference those stage numbers. Redefining it would invalidate recorded evidence.

Mode 2 introduces a parallel, additively-versioned pipeline:

| | Existing | Mode 2 |
|---|---|---|
| Contract | `scan/stage-contract.mjs` — `govibe-stage-run/v1` | `mode2/stage-contract.mjs` — `govibe-mode2-stage-run/v1` |
| Stage list | `CANONICAL_STAGES` | `MODE2_STAGES` |
| Run store | `<root>/state/runs/<runId>/` | `<root>/.govibe/mode2/scan/runs/<runId>/` |
| Level | `L2` | `M2` |

The Mode 2 pipeline **reuses** the existing extractors as evidence producers (as-built §4.2)
and **reuses** the MSP promotion path unchanged.

## 2. Stage List

`MODE2_STAGES`, fixed order, validated per record:

| # | Stage | Primary output | Mode |
|---|---|---|---|
| 1 | Workspace Discovery | `WorkspaceManifest` | deterministic |
| 2 | File & Artifact Inventory | `ArtifactInventory` | deterministic |
| 3 | Language & Framework Structural Scan | `StructureModel` | parser-first |
| 4 | Dependency Graph | `DependencyGraph` | parser-first |
| 5 | Interface & Integration Scan | `InterfaceModel` | parser-first |
| 6 | Data Semantic Scan | `DataModel` | parser-first |
| 7 | Behavioural & Execution Scan | `BehaviourModel` | parser + inference |
| 8 | State & Decision Scan | `StateModel` | parser + inference |
| 9 | Cross-Cutting Concern Scan | `ConcernModel` | parser + inference |
| 10 | Test / Verification / Evidence Scan | `VerificationModel` | parser-first |
| 11 | Agentic System Scan | `AgentCapabilityManifest` | deterministic — **mandatory** |
| 12 | Semantic Reconstruction | `CandidateSemanticIR` | composition |

Stage 11 is mandatory and may never report `not_applicable` by omission. A repository with
no agentic configuration produces an empty manifest with explicit evidence of absence.

## 3. Stage Record Contract

Every stage writes exactly one record. Terminal statuses are `complete`, `not_applicable`,
`incomplete`, `failed` — the same four the existing pipeline uses.

```json
{
  "schema": "govibe-mode2-stage-run/v1",
  "runId": "…",
  "stage": 4,
  "name": "Dependency Graph",
  "status": "complete",
  "method": "typescript-import-resolution",
  "extractorVersion": "1.0.0",
  "confidence": 0.9,
  "inputRefs": ["mode2-stage:03"],
  "outputRefs": ["mode2-artifact:dependencies.json"],
  "exclusions": [],
  "unresolved": [],
  "inputHash": "sha256:…",
  "outputHash": "sha256:…",
  "startedAt": "…",
  "completedAt": "…"
}
```

A `not_applicable` record MUST carry at least one exclusion reason. Absence of evidence is
recorded as evidence of absence, never as silence.

## 4. Stage Definitions

### Stage 1 — Workspace Discovery

Identify: repo root, monorepo/workspace structure, languages, frameworks, package managers,
build systems, Git metadata, configuration families, agent instruction files, documentation
roots, generated/vendor paths.

Output `WorkspaceManifest`. Detection is signal-based and every detection cites the file
that produced it — no framework is asserted without a manifest, lockfile, or config file as
evidence.

### Stage 2 — File & Artifact Inventory

Classify every file into: `source`, `test`, `config`, `schema`, `migration`,
`documentation`, `architecture`, `api`, `ci-cd`, `infrastructure`, `security`,
`agent-configuration`, `generated`, `vendor`, `asset`, `unknown`.

**Do not feed all files into an LLM.** A deterministic inventory is built first and is the
gate for every later stage. Files classified `generated` or `vendor` are excluded from
semantic reconstruction but remain in the inventory as evidence.

### Stage 3 — Language & Framework Structural Scan

Extract packages, modules, namespaces, classes, functions, components, exports, imports,
interfaces, types, commands, handlers, services. Parsers before inference. Reuses the
TypeScript AST extraction in `scan/stage-adapters.mjs`.

Languages with no available parser produce an `incomplete` record naming the unparsed
extensions, with `confidence` set to the achieved parser coverage ratio. The artifact is
still emitted so downstream stages receive the structure that *was* recovered — the stage
reports partial coverage honestly rather than either blocking the pipeline or silently
degrading to regex guessing.

### Stage 4 — Dependency Graph

Build `module→module`, `package→package`, `file→file`, `component→component`,
`service→service`. Classify each edge where determinable: `compile-time`, `runtime`, `data`,
`event`, `network`, `tooling`, `test`. Unclassifiable edges carry `kind: "unknown"` and
appear in `unresolved` — they are not dropped.

### Stage 5 — Interface & Integration Scan

Discover REST, GraphQL, RPC, MCP, A2A, events, queues, webhooks, CLI, SDK boundaries, and
external services. Extract request/response/event contracts where statically available.

### Stage 6 — Data Semantic Scan

Discover databases, tables, collections, entities, fields, PK/FK, indexes, migrations, ORM
models, data ownership, read/write paths. Produces candidate relations suitable for ERD
projection. The ERD is a *projection*, not a second truth.

### Stage 7 — Behavioural & Execution Scan

Recover entrypoints, request flows, event flows, command flows, background jobs, pipelines,
workers, orchestration chains. Produces candidate execution paths for Sequence, Activity,
and Flow projections.

### Stage 8 — State & Decision Scan

Discover state machines, status fields, transitions, guards, routing logic, decision tables,
branches, policy logic, workflow transitions.

**Not every conditional is a business decision.** Each branch is classified
`implementation-branch`, `business-decision`, `validation`, `error-handling`, or `routing`.
A branch that cannot be classified with evidence is `unknown` and unresolved, never promoted
to a business rule.

### Stage 9 — Cross-Cutting Concern Scan

Recover authentication, authorization, security, transactions, concurrency, logging, audit,
observability, caching, retry, idempotency, rate limiting, error handling, resilience.

### Stage 10 — Test / Verification / Evidence Scan

Discover unit, integration, and E2E tests, contracts, fixtures, CI checks, lint, build
validation, security checks, acceptance evidence.

Attempt to relate `Test —VALIDATES→ Requirement | Behavior | Interface`. A relation that
cannot be established from naming, imports, or assertions stays a **candidate** — an
unproven test-to-requirement link is worse than an admitted gap.

### Stage 11 — Agentic System Scan (mandatory)

Detect `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, agent configs, skills, commands, MCP servers,
A2A, subagents, agent roles, governor/policy, task DAGs, routing, model selection, context
loading, memory, verification gates, handoffs.

The goal is **not** to replace the external system. Extract its semantics:

```text
External governor  →  candidate authority/policy atoms
```

Output an `AgentCapabilityManifest` classifying each capability `NATIVE` / `PLATFORM` /
`HYBRID` / `MISSING`.

### Stage 12 — Semantic Reconstruction

Compose Stages 1–11 into `CandidateSemanticIR`. Each node retains type, identity, source,
source span, provenance, confidence, scope, inferred/explicit, relations, and unresolved
semantics (architecture §6).

**No scanner may mint canonical GKS identities.** Identities here are pipeline-local.

## 5. Resumability and Incremental Rescan

### 5.1 Resume

Each stage record is written to
`.govibe/mode2/scan/runs/<runId>/stages/NN.json` immediately on completion. Re-invoking a
run id replays completed stages from disk and continues at the first non-terminal stage.
A run directory carries `run.json` with schema, run id, and creation time; a mismatch is a
hard error, never a silent overwrite.

### 5.2 Incremental

The pipeline maintains, per file: content hash, artifact hash, dependency impact set, stage
version, extractor version, timestamp.

**The reuse fingerprint is a heuristic, not a proof.** Content hashes are recomputed only when
a file's cheap fingerprint (size + mtime) changed. A same-length edit that preserves mtime —
coarse-granularity filesystems, `cp -p`, `touch -r`, archive extraction, or two edits inside
one mtime tick — is invisible to it, and the affected stages would be reused when they should
re-run. Callers that need the guarantee rather than the fast path pass `verifyContent: true`,
which bypasses the fingerprint and re-hashes every file. DS-05 and DS-06 below are therefore
claims about the fast path, not correctness guarantees.

```text
changed file  →  impact graph  →  affected stages  →  incremental semantic rebuild
```

A stage is re-run when any of the following changed: a file in its input set, its stage
version, or its extractor version. Otherwise its prior record is reused verbatim and marked
`reusedFrom`.

Impact traversal uses `packages/govibe-core/src/impact/impact-engine.mjs` rather than
substring matching. Per `CLAUDE.md`, plain substring search is not accepted as impact
analysis.

## 6. Extraction Precedence

```text
1 deterministic parser  →  2 repository metadata  →  3 static analysis
→  4 structured extraction  →  5 graph traversal  →  6 LLM inference
```

Every LLM-produced node carries `inferred: true`, a `confidence`, and `source_evidence`. The
LLM must not invent missing WHY; absent meaning becomes `UNRESOLVED`.

## 7. Acceptance Criteria

| ID | Criterion | Verified by |
|---|---|---|
| DS-01 | Twelve stages run in fixed canonical order | `mode2/pipeline.test.mjs` |
| DS-02 | Every stage record validates against `govibe-mode2-stage-run/v1` | `mode2/pipeline.test.mjs` |
| DS-03 | A `not_applicable` record carries at least one exclusion | `mode2/pipeline.test.mjs` |
| DS-04 | A genuinely interrupted run resumes from its partial records | `mode2/pipeline.test.mjs` |
| DS-05 | An unchanged tree re-scans with zero stage re-executions (fast path) | `mode2/pipeline.test.mjs` |
| DS-06 | A single changed file re-runs only impacted stages (fast path) | `mode2/pipeline.test.mjs` |
| DS-07 | Deterministic extraction precedes any inference | `mode2/pipeline.test.mjs` |
| DS-08 | Stage 11 never reports absence by omission | `mode2/stages-t2.test.mjs` |
| DS-13 | Stages 7-9 never assert a model they cannot derive deterministically | `mode2/stages-t2.test.mjs` |
| DS-14 | An annotation never mints the requirement or section it names | `mode2/stages-t2.test.mjs` |
| DS-09 | No stage writes outside `.govibe/mode2/` | `mode2/workspace-adapter.test.mjs` |
| DS-10 | Two independent workspaces holding identical content produce identical output hashes | `mode2/pipeline.test.mjs` |
| DS-11 | A record whose artifact is missing is re-executed, never reused | `mode2/pipeline.test.mjs` |
| DS-12 | `verifyContent` bypasses the fingerprint and re-hashes every file | `mode2/pipeline.test.mjs` |

DS-10 excludes environment-derived fields from the hashed view of an artifact: the absolute
`workspace_root` and filesystem `mtimeMs` are recorded in the artifact but not hashed, because
they differ between two byte-identical checkouts. Without that exclusion the claim would hold
within one machine and fail across two.

## 7.1 Tranche 2 Coverage and Its Honest Limits

Stages 5–11 ship in tranche 2. Three of them are specified "parser + inference" and this
tranche ships **only the parser half** — no inference tier is wired. Each therefore reports
what is observable and names what it cannot establish:

| Stage | Delivered | Named as not delivered |
|---|---|---|
| 5 Interface | REST routes (verb + path-shaped literal), events, external hosts, CLI from manifest | GraphQL and protobuf contracts recorded present-but-unparsed |
| 6 Data | Prisma models/keys/relations, SQL DDL tables and foreign keys | Code-defined ORM models named as an unparsed family, never regex-guessed into entities |
| 7 Behaviour | Entrypoints from manifest, module-level reachability over Stage 4 `IMPORTS` | Symbol-level request/command/event flow — needs a call graph Stage 3 does not emit |
| 8 State | Enum and string-union state shapes, discriminant switches, branch inventory | **Business decisions: always empty.** Deterministic extraction cannot establish business intent; the spec forbids promoting a branch without evidence |
| 9 Concerns | Concern presence with citable evidence | Concern *architecture*. An absent signal means no known signal matched, never that the concern is unimplemented |
| 10 Verification | Test inventory, CI invocations, declared gates, `@tested` links, inferred coverage links | CI job graph/conditions; `@req`/`@spec`/`@designs` targets stay `UNRESOLVED` until the top-down intent scan |
| 11 Agentic | Instruction files, config roots, skills, subagents, commands, MCP, policy, memory, capability classification | Six §16 axes are runtime behaviour, not file layout, and are recorded unresolved so `PLATFORM` is not read as an external gap |

Stage 8's empty `business_decisions` array is the correct deterministic result, not a coverage
failure. Stage 9's `absent` list is the absence of *this scanner's* signals.

### Stage 10 and the annotation extractor

The `@req` / `@spec` / `@designs` / `@tested` extractor implements ADR-028 Decision 1, and
**ADR-028 is `proposed`, not accepted.** The extractor is isolated in `extractAnnotations` and
contributes one additive `annotations` block, so rejecting D1 is a deletion rather than an
unpick. An annotation is precedence tier 1 (deterministic parse of an explicit human
assertion) and is evidence, not authority: `@req FR-001` does not create `FR-001`.

## 8. Changelog

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1.0 | 2026-08-11 | Initial twelve-stage semantic scan specification. | Claude Code |
| 0.3.0 | 2026-08-12 | Tranche 2: stages 5-11 implemented. Added §7.1 recording exactly what each delivers and what it deliberately does not, DS-08 bound to a real test, and DS-13/DS-14 added. | Claude Code |
| 0.2.0 | 2026-08-12 | Adversarial review corrections: reuse fingerprint documented as a heuristic with a `verifyContent` escape hatch; DS-05/DS-06 scoped to the fast path; DS-10 restated as cross-workspace and made true by excluding environment-derived fields from the hash; DS-04 restated as a genuine interruption; two `Verified by` cells corrected to files that exist; DS-11 and DS-12 added. | Claude Code |
