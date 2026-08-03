---
title: "FEAT: Roadmap Promotion Contract"
doc_id: "FEAT-ROADMAP-PROMOTION-CONTRACT"
status: "approved"
version: "0.1.0"
updated: "2026-06-16"
owner: "LYRA"
auditor: "ATHER"
source_of_truth: true
prd_system: "SYSTEM-02::Project-Roadmap-Management-System"
related_docs:
  - "docs/features/project-roadmap/FEAT-Document-Driven-Roadmap-Source.md"
  - "docs/operations/runbooks/RUNBOOK-GoVibe-Multi-Agent.md"
  - "docs/STD-Document-Versioning-Governance.md"
  - "docs/DOC-VERSION-REGISTRY.md"
  - ".agents/pm/AGENT.md"
---

# FEAT: Roadmap Promotion Contract

## 1. Goal

Define the enforcement contract that governs how planning documents become board-visible roadmap state in GoVibe.

This contract separates:

- planning ownership
- document approval state
- registry visibility
- board rendering eligibility

## 2. Why This Exists

GoVibe must not let any Markdown file under `docs/roadmap/` behave like live project state by accident.

The board must only consume planning artifacts that are:

- created through the LYRA planning flow
- structurally valid
- traceable in the registry
- promoted through an explicit approval gate

## 3. Ownership Model

### 3.1 Content owner

`LYRA` owns the planning content that enters the roadmap system:

- `MASTERPLAN`
- `ROADMAP`
- `BACKLOG`
- `SPRINT`

### 3.2 Documentation support

`THESEUS` may normalize or refine the document structure, but THESEUS does not become the planning owner by doing so.

### 3.3 Audit gate

`ATHER` owns the enforcement gate for promotion readiness:

- metadata completeness
- registry alignment
- source-path validity
- scope and traceability checks

### 3.4 Runtime role

`A2` is a read-only consumer of promoted roadmap state. It does not decide ownership, approval, or canonicality.

## 4. Canonical Source Paths

Only these planning documents are eligible for roadmap-board promotion in v1:

```text
docs/roadmap/MASTERPLAN-<slug>.md
docs/roadmap/ROADMAP-<slug>.md
docs/roadmap/BACKLOG-<slug>.md
docs/roadmap/SPRINT-<slug>.md
docs/roadmap/ROADMAP-<slug>.html
docs/roadmap/imports/<source-name>.html
```

## 5. Required Metadata Gate

Every Markdown planning source in `docs/roadmap/` must include:

```yaml
doc_id:
status:
version:
updated:
owner:
source_of_truth:
```

Rules:

- `owner` must be `LYRA` for canonical planning docs in v1
- `doc_id` must be unique
- `version` must follow canonical version format
- `source_of_truth` must be explicit
- `## Changelog` is mandatory

## 6. Promotion States

Board visibility is determined by `status`, not by file existence alone.

| Status | Promotion Meaning | A2 Behavior |
|---|---|---|
| `draft` | planning is still in authoring or internal review | hidden from active board; may appear in internal review tooling only |
| `candidate` | ready for approval review but not active | hidden from active board |
| `approved` | valid promoted source for active board consumption | eligible for active board rendering |
| `superseded` | replaced by a newer canonical source | not rendered |
| `deprecated` | historical reference only | not rendered |

## 7. Registry Gate

Before a planning source is considered active board input:

- it must be listed in `docs/DOC-VERSION-REGISTRY.md`
- registry `doc_id`, `version`, `status`, and `owner` must match frontmatter

If registry and frontmatter disagree, promotion must fail.

## 8. Runtime Gate

The roadmap loader or parser must enforce:

- ignore planning files outside canonical roadmap paths
- reject roadmap sources with missing required metadata
- reject planning docs with owner other than `LYRA` in v1
- reject active-board promotion for any source whose `status` is not `approved`
- expose `unavailable` or `no approved roadmap source` instead of showing fake live rows

## 9. Validation Gate

`npm run docs:validate` must fail when a Markdown planning source under `docs/roadmap/`:

- has no frontmatter
- is missing `doc_id`, `status`, `version`, `updated`, `owner`, or `source_of_truth`
- has `owner` other than `LYRA`
- has no changelog
- is marked `approved` but is missing from the registry
- is listed in the registry with mismatched version, status, or owner

## 10. Acceptance Criteria

- A planning file cannot become active board input merely by existing in `docs/roadmap/`.
- `LYRA` is the only accepted planning owner for canonical roadmap docs in v1.
- `ATHER` can audit metadata and registry alignment before runtime consumption.
- `A2` can distinguish approved promoted state from review-only or missing state.
- Validator enforcement catches broken promotion inputs before merge.

## 11. Success Criteria

- Development Roadmap Board uses an explicit promotion contract.
- Ownership, approval, and rendering responsibilities are separated cleanly.
- Draft planning docs cannot silently appear as canonical live board state.

## 12. Definition Of Done

- Contract is documented.
- Contract is linked to roadmap source governance docs.
- Validator enforcement covers roadmap promotion inputs.
- At least one active backlog source and one master plan source comply with the contract.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0 | 2026-06-21 | LYRA | Signed off; promoted draft -> approved (MSP/GKS gate decision recorded in ADR-014). |
| 0.1.0+draft | 2026-06-16 | LYRA | Introduced the roadmap promotion contract covering owner gate, metadata gate, registry gate, status gate, and A2 runtime consumption rules. |
