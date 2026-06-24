---
title: "ROADMAP: GoVibe Translator Core"
doc_id: "ROADMAP-TRANSLATOR-CORE"
uid: "01KVXGFW5PR4PXTSQ5425BC7JA"
status: "approved"
version: "0.1.0"
content_hash: "atom:0e4cb14b633ecb08"
updated: "2026-06-22"
owner: "LYRA"
auditor: "ATHER"
source_of_truth: true
prd_system: "SYSTEM-08::Genesis-Knowledge-System"
related_docs:
  - "docs/audit/AUDIT-User-Flow-Runtime-Gaps-2026-06-22.md"
  - "docs/srs/SRS-GoVibe-Translator-Core-Slice.md"
  - "docs/architecture/BLUEPRINT-Translator-Core-Slice.md"
  - "docs/lld/LLD-Translator-Core-Slice.md"
  - "docs/CONCEPT--HYBRID-JIT-CONTEXT.md"
  - "docs/features/genesis-knowledge-system/FEAT-Doc-Format-Template-Extraction.md"
---

# ROADMAP: GoVibe Translator Core

**Source PRD:** `docs/PRD-GoVibe-Platform-Overview.md`
**Owner:** `LYRA`
**Roadmap Source Path:** `docs/roadmap/ROADMAP-translator-core.md`
**Mission Control Render:** `A2 Roadmap Board reads this as the system-level plan for the translator-core epic (code-in -> GKS -> render -> fidelity).`

## Product Goal

Make GoVibe's translator positioning runnable end-to-end: ingest any repo's code/docs into GKS atoms and render documents back in each team's own format, gated by a real fidelity check — closing the runtime gaps found in `AUDIT-User-Flow-Runtime-Gaps-2026-06-22`. Phases map to a Now / Next / Later cadence (foundation shipped; quality + governance next; multi-team + full-eco later).

## Phases

| Phase | Goal | PRD Systems | Required Docs | Exit Criteria | Status | Progress |
|---|---|---|---|---|---|---|
| PHASE-TRX-01 | Foundation slice: doc + code atomization, format-adaptive render, fidelity gate, provenance | SYSTEM-08, SYSTEM-09 | AUDIT, SRS, BLUEPRINT, LLD, FEAT | ingest->render->fidelity runs end-to-end on doc and JS/TS code with passing tests | done | 100 |
| PHASE-TRX-02 | NOW: fidelity quality + persistence hardening | SYSTEM-08 | LLD, test plan | embedding semantic scorer in place; atom/template store persists across processes | planned | 0 |
| PHASE-TRX-03 | NEXT: governance on output, MSP wiring, true end-to-end translation | SYSTEM-08, SYSTEM-10, SYSTEM-06 | SDD, runbook | rendered output is gated; provenance lives in MSP; code->doc renders into a real target template | planned | 0 |
| PHASE-TRX-04 | LATER: multi-team + full-eco surface | SYSTEM-05, SYSTEM-08, SYSTEM-07 | FEAT, SDD | cross-team conflict resolution + visual GKS UI + curation UX exist | planned | 0 |

## Sprints

| Sprint | Parent Phase | Goal | Task Count | Exit Criteria | Status | Progress |
|---|---|---|---:|---|---|---:|
| SPR-TRX-01 | PHASE-TRX-01 | Ship the foundation slice and its tests | 1 | Foundation slice merged with 83 passing tests | done | 100 |
| SPR-TRX-02 | PHASE-TRX-02 | Replace lexical baseline + persist stores | 2 | Embedding scorer + persistent store landed | planned | 0 |
| SPR-TRX-03 | PHASE-TRX-03 | Output governance, MSP, end-to-end translate, more languages | 4 | Gate + MSP + code->doc render + 1 new language | planned | 0 |
| SPR-TRX-04 | PHASE-TRX-04 | Multi-team coordination and full-eco surface | 3 | Conflict resolution + visual UI + curation UX | planned | 0 |

## Backlog Items

| ID | Parent ID | Type | Title | PRD System | Priority | Owner | Source Section | Dependencies | Acceptance | Status | Progress |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TASK-TRX-RM-001 | SPR-TRX-01 | feature | Foundation slice: atomizer (doc + JS/TS code), format-template (hybrid), renderer (scope x format), fidelity (both metrics), provenance (jsonl), `govibe.ingest.code` + `govibe.render` | SYSTEM-08 | P0 | ARCHON | Foundation | SRS, BLUEPRINT, LLD | Slice runs end-to-end; 83 tests pass; smoke + lint green | done | 100 |
| TASK-TRX-RM-002 | SPR-TRX-02 | feature | Embedding semantic scorer (replace lexical baseline) via the fidelity scorer hook | SYSTEM-08 | P0 | ARCHON | Fidelity quality | TASK-TRX-RM-001 | Embedding scorer plugged in; PASS/FLAG/CONF thresholds recorded in a test plan | planned | 0 |
| TASK-TRX-RM-003 | SPR-TRX-02 | feature | Persist atom/template store (in-process Map -> GKS .md / GenesisBlockDB) | SYSTEM-08 | P0 | ARCHON | Persistence | TASK-TRX-RM-001 | Atom/template refs survive across processes | planned | 0 |
| TASK-TRX-RM-004 | SPR-TRX-03 | feature | Governance gate on rendered output + `diff:check` into CI + git hooks (audit #4) | SYSTEM-10 | P0 | ATHER | Output governance | TASK-TRX-RM-001 | Rendered output passes a governance check before deliverable; docs-first enforced automatically | planned | 0 |
| TASK-TRX-RM-005 | SPR-TRX-03 | feature | MSP wiring + migrate provenance jsonl -> MSP (audit #5) | SYSTEM-06 | P0 | KIN | MSP integration | TASK-TRX-RM-003 | `msp_*` reachable; provenance written to MSP via a migration adapter | planned | 0 |
| TASK-TRX-RM-006 | SPR-TRX-03 | feature | End-to-end code->doc render into a real target template (ingest target repo doc-format) | SYSTEM-08 | P1 | ARCHON | End-to-end translate | TASK-TRX-RM-002 | One repo's code renders as docs in another repo's format with a passing fidelity verdict | planned | 0 |
| TASK-TRX-RM-007 | SPR-TRX-03 | feature | Add a second language to the code-atomizer (e.g. Python) | SYSTEM-08 | P2 | ARCHON | Language breadth | TASK-TRX-RM-001 | A non-JS/TS file ingests to atoms with symbol provenance | planned | 0 |
| TASK-TRX-RM-008 | SPR-TRX-04 | epic | CoDev cross-team semantic-conflict resolution (audit #6) | SYSTEM-05 | P1 | LYRA | Multi-team | TASK-TRX-RM-005 | Conflicting atoms across teams surface a resolution flow, not a silent overwrite | planned | 0 |
| TASK-TRX-RM-009 | SPR-TRX-04 | epic | Full-eco visual GKS UI (ERD / DAG / node graph) (audit #8) | SYSTEM-08 | P2 | THESEUS | Full-eco surface | TASK-TRX-RM-003 | GKS is browsable visually over GKS + GenesisBlockDB | planned | 0 |
| TASK-TRX-RM-010 | SPR-TRX-04 | epic | Language-pack curation UX + multi-tenant RBAC/ABAC (audit #7) | SYSTEM-07 | P2 | ATHER | Curation + access | TASK-TRX-RM-008 | Low-confidence mappings are confirmed through a UX; tenant boundaries enforced | planned | 0 |

## Task Breakdown

### TASK-TRX-RM-001: Foundation slice (done)

- [x] SUBTASK-TRX-RM-001.1 doc + code atomizer with content-identity keys
- [x] SUBTASK-TRX-RM-001.2 format-template (hybrid confidence) + renderer (scope x format)
- [x] SUBTASK-TRX-RM-001.3 fidelity gate (round-trip + injectable semantic) + jsonl provenance
- [x] SUBTASK-TRX-RM-001.4 wire `govibe.ingest.code` + `govibe.render`; 83 tests + smoke + lint

### TASK-TRX-RM-002: Embedding semantic scorer

- [ ] SUBTASK-TRX-RM-002.1 choose embedding model + threshold spike (PASS/FLAG/CONF)
- [ ] SUBTASK-TRX-RM-002.2 implement scorer behind the existing fidelity hook; keep lexical as offline fallback

### TASK-TRX-RM-003: Persist store

- [ ] SUBTASK-TRX-RM-003.1 define the persistence driver (GKS .md first, GenesisBlockDB later)
- [ ] SUBTASK-TRX-RM-003.2 migrate in-process Map to the driver; keep refs stable

### TASK-TRX-RM-004: Output governance

- [ ] SUBTASK-TRX-RM-004.1 add `diff:check` to the governance CI workflow + a git pre-commit hook
- [ ] SUBTASK-TRX-RM-004.2 gate rendered output (fidelity + governance) before it is deliverable

### TASK-TRX-RM-005: MSP wiring

- [ ] SUBTASK-TRX-RM-005.1 expose `msp_*` from GoVibe
- [ ] SUBTASK-TRX-RM-005.2 migration adapter: jsonl provenance -> MSP

## UI Traceability

| Roadmap Item ID | Source Section | Mission Control Surface | Progress Source | Evidence Link |
|---|---|---|---|---|
| TASK-TRX-RM-001 | Foundation | A2 Project Overview | `scripts/mcp/translator/` + `scripts/mcp/translator.test.mjs` | `npm test` (83 passed), `mcp:smoke` |
| TASK-TRX-RM-002 | Fidelity quality | A2 Project Overview | `scripts/mcp/translator/fidelity.mjs` scorer hook | pending implementation evidence |
| TASK-TRX-RM-005 | MSP integration | A2 Project Overview | `scripts/mcp/translator/provenance.mjs` (MSP-shaped) | pending MSP wiring |

## Acceptance Criteria

- [x] A canonical roadmap entry exists for the translator-core epic and links the audit -> SRS -> Blueprint -> LLD chain.
- [x] PHASE-TRX-01 reflects shipped foundation work (atomizer, render, fidelity, provenance, code-AST).
- [ ] NOW / NEXT / LATER phases carry their backlog items with owners and dependencies.
- [ ] Mission Control can trace roadmap item -> source module / audit finding.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0 | 2026-06-22 | LYRA | Promoted draft → approved for Mission Control roadmap consumption. |
| 0.1.0+draft | 2026-06-22 | LYRA | Created the translator-core roadmap (Now/Next/Later as phases): foundation slice done; fidelity-embedding + persistence now; output-governance + MSP + end-to-end translate next; multi-team + full-eco later. Mapped to audit findings #1-#8. |
