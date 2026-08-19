---
title: "FEAT: Doc-Format Template Extraction & Format-Adaptive Rendering"
doc_id: "FEAT-DOC-FORMAT-TEMPLATE-EXTRACTION"
status: "draft"
version: "0.1.1+draft"
updated: "2026-08-19"
owner: "Boss (CEO)"
auditor: "ATHER"
type: feat
source_of_truth: true
prd_system: "SYSTEM-08::Genesis-Knowledge-System"
supporting_prd_systems:
  - "SYSTEM-06::Integration-Bridge-System"
  - "SYSTEM-09::Traceability-Audit-Verification-System"
related_docs:
  - "docs/CONCEPT--HYBRID-JIT-CONTEXT.md"
  - "docs/adr/ADR-017-GoVibe-Governance-Translator-GKS-Interlingua.md"
  - "docs/adr/ADR-019-Universal-Code-In-MCP-Out.md"
  - "docs/api/API-002-Symbol-Linking.md"
  - "docs/architecture/SDD-Symbol-Graph-Traceability-Boundary.md"
---

# FEAT: Doc-Format Template Extraction & Format-Adaptive Rendering

**Status:** Draft

## 1. Goal

Let GoVibe render one set of GKS atoms into documents that match **each repo's own documentation paradigm** (e.g. Feature-Base vs System-Base), on demand, so two projects that structure and write docs differently can share the same underlying knowledge without either side migrating its docs.

This is the **format** dimension of JIT rendering described in [[CONCEPT--HYBRID-JIT-CONTEXT]] (`render = scope × format`) and the operational arm of the translator positioning in `ADR-017`.

## 2. Why This Exists

Two repos rarely write docs the same way. A Feature-Base project organizes around features; a System-Base project organizes around systems. The same concept (e.g. a collaboration module) lands under a different name or position in each — a structural **mismatch**.

Without a format-adaptive renderer, GoVibe would have to pick one canonical doc shape and force every team into it (zero adoption), or build per-pair translators (N² explosion, `ADR-017`). Instead, GKS holds the canonical atoms and this feature renders them into whichever paradigm the asking repo uses.

## 3. Module Boundary

What belongs here:

- scanning a repo's existing docs to derive a reusable **format template** (the doc-format half of an `ADR-017` "language pack")
- symbol-linking and semantic matching of codebase ↔ GKS atoms (consumes `API-002-Symbol-Linking`, `SDD-Symbol-Graph-Traceability-Boundary`)
- format-adaptive JIT rendering: assemble atoms by scope, then emit in the target repo's format template

What does not belong here:

- the scope/hop side of JIT rendering (owned by [[CONCEPT--HYBRID-JIT-CONTEXT]] / `FEAT-Hybrid-JIT-Context-System`)
- building per-framework adapters or bridges (explicitly out of scope — `ADR-017`, `ADR-019`)
- changing how atoms are stored (decomposition is `ADR-019` universal code-in)

## 4. Components

- doc-format scanner → format-template extractor (per repo)
- format-template store (keyed per repo/convention; part of the language pack)
- symbol-link + semantic matcher (codebase ↔ atom)
- format-adaptive renderer (atoms + scope + format template → output document)

## 5. Inputs And Outputs

### Inputs

- target repo's existing docs (to derive the format template)
- target repo's codebase (for symbol-linking)
- a user request + scope (hop bound)

### Outputs

- a per-repo format template
- a rendered document in the asking repo's own format
- symbol-link evidence and provenance back to the source atoms

## 6. Workflow Contract

```text
onboard repo
  -> scan docs  -> extract format template (store per repo)
  -> scan code  -> symbol-link + semantic match into GKS atoms
on request
  -> gather atoms by scope (retrieval radius R0-R6)
  -> render into the asking repo's format template
  -> return document + provenance (atoms cited)
```

## 7. Acceptance Criteria

- A repo's documentation format can be scanned and stored as a reusable format template.
- The same GKS atoms can be rendered into two different repos' formats from one request path.
- Rendered output cites the source atoms (provenance preserved).
- No per-framework adapter or bridge is introduced; mappings target GKS only (N, not N²).

## 8. Success Criteria

- Two projects with different doc paradigms (Feature-Base vs System-Base) consume the same knowledge without migrating their docs.
- Adding a new repo requires extracting one format template, not building a pairwise translator.

## 9. Definition Of Done

- This FEAT is registered in `docs/DOC-VERSION-REGISTRY.md`.
- [[CONCEPT--HYBRID-JIT-CONTEXT]] §4 and `ADR-017` §3 reference the format-template concept.
- `docs:validate` passes after the doc is added.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1+draft | 2026-08-19 | ATHER | Corrected abolished H-axis semantics per ADR-021/AUD-14 (TASK-PRD-022 sweep): §6 workflow "hop H0-H6" relabeled retrieval radius R0-R6. |
| 0.1.0+draft | 2026-06-22 | Boss (CEO) | Defined the doc-format template extraction + format-adaptive JIT rendering feature that resolves cross-repo doc-paradigm mismatch (Feature-Base vs System-Base). |
