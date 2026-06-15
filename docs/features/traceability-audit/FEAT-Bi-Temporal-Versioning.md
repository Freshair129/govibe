---
title: "FEAT: Bi-Temporal Versioning for Genesis-Style Roadmap State"
doc_id: "FEAT-TRACE-BITEMPORAL-001"
status: "approved"
version: "0.1.0"
updated: "2026-06-14"
owner: "ATHER"
source_of_truth: true
---

# FEAT: Bi-Temporal Versioning for Genesis-Style Roadmap State

## Goal

Add bi-temporal versioning to roadmap, task, assignment, handoff, verification, execution run, and artifact traceability without forcing low-level task nodes to duplicate full Genesis Block metadata.

## Temporal Metadata Contract

Runtime, API, and MCP payloads use `camelCase`:

| Field | Purpose |
|---|---|
| `version` | Version label for this record within its identity chain |
| `validFrom` | Business time when this record starts being true |
| `validTo` | Business time when this record stops being true |
| `recordedAt` | Transaction time when GoVibe recorded this version |
| `supersededAt` | Transaction time when GoVibe replaced this version |

Document frontmatter keeps governance `snake_case` such as `doc_id`, `source_of_truth`, `created_at`, and `updated_at`.

Markdown roadmap tables use human-readable Title Case columns: `Version`, `Valid From`, `Valid To`, `Recorded At`, and `Superseded At`.

## Genesis Metadata Inheritance

Roadmap, phase, epic, and sprint records may carry full source, owner, C/H/W, risk, and policy metadata.

Task, sub-task, micro-task, and atomic-task records should keep minimal metadata:

```text
id
parentId
type
title
state
progress
version / validFrom / validTo / recordedAt / supersededAt only when the leaf has its own temporal event
```

If a leaf record lacks source or governance fields, consumers resolve effective metadata by walking the parent chain.

## Runtime Rules

- A mutation creates a new version record instead of destroying history.
- The previous active version for the same identity is closed by setting `supersededAt`.
- Current state is the version whose valid window includes `asOfValidAt` and whose transaction window includes `asOfRecordedAt`.
- Default query time is current valid time and current transaction time.
- Legacy roadmap sources without temporal columns remain valid; import time becomes the default `recordedAt`.

## Validation Rules

- `validFrom` must be before or equal to `validTo` when both exist.
- `recordedAt` must be before or equal to `supersededAt` when both exist.
- A non-root roadmap node must resolve its `parentId`.
- Assignment, handoff, and verification `taskId` values must resolve to actionable roadmap nodes.
- One identity must not have multiple active versions for the same valid window at the same transaction time.

## Acceptance Criteria

- Runtime can query current state and historical as-of state.
- Roadmap export preserves temporal columns.
- Roadmap parser accepts temporal columns but remains backward-compatible with legacy roadmap tables.
- Low-level task nodes can remain metadata-light and inherit source context from parents.
- Validator flags invalid temporal ranges and broken task joins.

## Success Criteria

- ATHER can audit when a fact became true and when GoVibe learned it.
- Agents do not need to carry duplicated hub metadata in every leaf task.
- Mission Control can render current state while preserving historical evidence for review.

## Definition of Done

- Runtime types and MCP schema expose bi-temporal fields.
- Parser and exporter round trip temporal columns.
- Smoke tests cover current, historical, future-valid, and legacy-source behavior.
- `npm run docs:validate`, `npm run mcp:smoke`, and `npm run baseline:check` pass.

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.1.0 | 2026-06-15 | Added changelog footer to align the bi-temporal feature with the document versioning governance standard. |
