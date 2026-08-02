---
title: "CR: Document IA and Knowledge Graph Readiness"
doc_id: "CR-2026-08-03-DOCUMENT-IA-KNOWLEDGE-GRAPH-READINESS"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-03"
owner: "Boss (Product Authority)"
decision_owner: "Boss (Product Authority)"
auditor: "ATHER"
source_of_truth: true
prd_system: "GOVIBE-PLATFORM"
related_docs:
  - "docs/STD-Execution-Governance.md"
  - "docs/STD-Document-Versioning-Governance.md"
  - "docs/design/GoVibe-Document-Hierarchy.md"
  - "docs/blueprints/BLUEPRINT-Document-Information-Architecture-and-Graph-Contract.md"
  - "docs/migration/MIGRATION-Document-IA-and-Graph-Readiness.md"
---

# CR: Document IA and Knowledge Graph Readiness

## 1. Decision And Goal

The owner approved preparation of a governed document-cleansing workflow on
2026-08-03. Phase 1 creates the control packet, immutable baseline inventory,
isolated work batches, review gates, and rollback evidence. It does not move,
rename, archive, deduplicate, or semantically rewrite the document corpus.

The goal is a document information architecture that remains useful to humans
while producing typed, provenance-bearing knowledge candidates for the existing
GoVibe -> MSP -> GKS -> GenesisBlockDB boundary.

## 2. Classification And Scope

- Complexity: `C-3`
- Access scope: `H3`
- Context profile: one `W-ctx` workflow for coordination; workers use `T-ctx`
- Risk: `HIGH`
- Naming mode: recovery; descriptive names remain unchanged
- Baseline: commit `a5f2c938ab285b23b803d37c9786537a77dfdc9d`

In scope for Phase 1:

- metadata, lifecycle, registry, taxonomy, duplicate and relation candidates
- exact file accounting, five non-overlapping batches, review and rollback gates
- a navigation hub and graph-ready document contract

Out of scope for Phase 1:

- corpus moves, renames, deletion, archival, deduplication, or authority changes
- direct MSP, GKS, GenesisBlockDB, Shared Vault, or runtime writes
- a new graph database, graph client, canonical graph ID, or unbounded traversal
- correction of legacy H0-H6 semantics; that requires a separate Phase 2 packet

## 3. Execution Authority And Gates

```text
isolated worker commit
  -> Noise Review Gate
  -> Integration Agent
  -> integrated Noise Review Gate
  -> Parent Final Gate
  -> Human Owner
```

Workers may write only paths named by their work packet. The Noise Reviewer is
read-only and returns `accept`, `return_for_revision`, or `escalate`. The Parent
is the Final Gate and does not repair worker diffs. No candidate becomes shared
or canonical knowledge without MSP authorization and GKS materialization.

## 4. Acceptance Criteria

- AC-01: every file in the pinned `docs/` baseline is exactly once either in a
  batch or in the exclusion manifest
- AC-02: each batch contains at most 50 files and writable paths do not overlap
- AC-03: each file record includes path, bytes, SHA-256, disposition and batch
- AC-04: every proposed move has an approved before/after map and rollback entry
  before execution; Phase 1 contains no executed moves
- AC-05: workers receive only their packet, file list, canonical references and
  source hashes; no sibling scratchpads or private history are shared
- AC-06: every relation output remains a candidate with type, source, target,
  provenance and confidence; no agent-minted canonical GKS identity is allowed
- AC-07: canonical anchors remain at their current paths unless a later owner
  decision is supported by bounded backlink impact evidence
- AC-08: every accepted commit passes Noise Review before integration
- AC-09: registry entries and touched document versions match frontmatter
- AC-10: `docs:validate`, `roadmap:validate`, and `diff:check` pass
- AC-11: the root worktree and its dirty/untracked content remain untouched
- AC-12: unresolved count, authority, lifecycle, duplicate, or relation questions
  are explicit and cannot be silently defaulted

## 5. Success And Exit Criteria

- SC-01: baseline accounting is 100 percent and independently reproducible
- SC-02: all five work packets are bounded, non-overlapping and hash-pinned
- SC-03: review evidence contains no raw private scratchpad or unrelated output
- SC-04: every proposed path operation can be reversed to the pinned baseline
- SC-05: graph candidates support bounded impact review without asserting graph
  completeness or canonical status

Exit requires the validation commands to pass, an integration commit to exist,
and the Parent Final Gate to receive the manifest hashes, review status,
validation logs, rollback plan, version diff and unresolved queue. Phase 1 does
not authorize Phase 2 or corpus migration.

## 6. Unresolved Baseline Discrepancy

The approved planning estimate was 206 files. The pinned tracked baseline has
201 files: 195 processable files and 6 hidden `.gitkeep` exclusions. The other
5 files are ignored/untracked user files under root `docs/ref/`; they are
hash-accounted as `external_untracked_exclusions` and preserved unmodified.
Worker batches contain only the 195 tracked processable files.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-03 | Boss / ATHER | Recorded the approved Phase 1 cleansing boundary, isolated execution gates, AC/SC, and baseline-count discrepancy. |
