---
title: "Alignment 04: Twelve-Stage Decomposition Contract"
doc_id: "ALIGNMENT-04-12-STAGE-DECOMPOSITION-CONTRACT"
status: "approved"
version: "1.0.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
type: "alignment"
source_of_truth: false
conforms_to:
  - "docs/api/API-005-GoVibe-Capability-Contracts.md"
  - "docs/api/API-006-Vault-Context-and-Replay-Contracts.md"
  - "docs/architecture/ARCH-Vault-and-Context-Model.md"
  - "docs/architecture/BLUEPRINT-GoVibe-Capability-Vertical-Slice.md"
---

# Purpose

This document maps the scan/decomposition vocabulary to the canonical GoVibe contracts. It is not a competing source of truth.

# Entry and execution model

```text
govibe.workspace.scan
  -> deep: true
  -> Stage 1-12 decomposition
  -> observed graph and knowledge/link candidates
  -> MSP promotion and evidence boundary
  -> GKS canonicalization
```

The current implementation may execute stages sequentially. DAG/wave execution is a target scheduling model and must not be reported as implemented without runtime evidence.

# Public stages

1. Scan
2. Structure
3. Markdown Parse
4. COBOL Parse
5. Symbolic Parse
6. Routes
7. Tools
8. ORM
9. Cross-File Resolution
10. MRO
11. Communities
12. Processes

F1-F4 are internal finalization operations. They are not Stage 13-16.

# Knowledge and link outputs

Deep Scan owns discovery and candidate construction:

- document and document-version candidates;
- atom/section candidates;
- symbol candidates;
- wikilink, crosslink, symbol-link and unresolved-link candidates;
- observed graph relations, provenance, hashes and confidence.

GKS owns canonical `document_id`, `atom_id`, `symbol_id`, `entity_id` and `relation_id`. MSP authorizes and mediates every promotion. GenesisBlockDB persists accepted canonical records.

# Backlink and impact alignment

Backlinks are reverse projections of observed or canonical forward relations. GoVibe may build an observed backlink index for immediate impact analysis. Impact traversal must report relation chain, distance, score, action and unresolved coverage.

# Finalization alignment

F1-F4 may package candidate graphs, evidence, validation results and references. They must submit through MSP and must not write GenesisBlockDB directly.

# Governance axes

Stage execution metadata keeps these dimensions separate:

- C: process complexity
- H: executor access scope
- R: retrieval radius
- D: resolution/compaction depth
- W: fan-out/coupling
- Budget and Risk: explicit independent fields

Context profile T/V/W/M is also independent from these axes.
