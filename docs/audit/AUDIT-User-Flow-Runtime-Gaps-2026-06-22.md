---
title: "AUDIT: GoVibe User-Flow Runtime Gaps (2026-06-22)"
doc_id: "AUDIT-USER-FLOW-RUNTIME-GAPS-2026-06-22"
status: "draft"
version: "0.1.0+draft"
updated: "2026-06-22"
owner: "Boss (CEO)"
auditor: "ATHER"
type: audit
source_of_truth: true
related_adrs: ["ADR-016", "ADR-017", "ADR-019"]
related_docs:
  - "docs/adr/ADR-017-GoVibe-Governance-Translator-GKS-Interlingua.md"
  - "docs/adr/ADR-019-Universal-Code-In-MCP-Out.md"
  - "docs/CONCEPT--HYBRID-JIT-CONTEXT.md"
  - "docs/features/genesis-knowledge-system/FEAT-Doc-Format-Template-Extraction.md"
  - "docs/api/API-002-Symbol-Linking.md"
  - "docs/PRD-GoVibe-MCP-Orchestration.md"
  - "docs/srs/SRS-GoVibe-Translator-Core-Slice.md"
---

# AUDIT: GoVibe User-Flow Runtime Gaps (2026-06-22)

## 1. Purpose & Method

Audit the **real end-to-end user flow** implied by the current positioning (governance + translator: `code-in → GKS → render`, tiered adoption) against **what actually exists at runtime**. Method: walked the flow stage-by-stage and checked each against the live MCP catalog (`scripts/mcp/registry.mjs` — 10 `govibe.*` tools), the sidecar endpoints, and `scripts/**`. Findings are grounded in code, not aspiration.

## 2. Headline Finding

Everything built today (roadmap board, `agent.run` / `orchestrate.step`, the `docs:validate` gate) is the **"Mission Control + roadmap/agent-execution"** product plus governance over GoVibe's **own** docs. The part that makes GoVibe a **translator** per the new positioning — ingest → atomize → symbol-link → render → fidelity-verify — is **documented (ADR-019, API-002, `CONCEPT--HYBRID-JIT-CONTEXT` §4, `FEAT-DOC-FORMAT-TEMPLATE-EXTRACTION`) but has 0% runtime**. There is no entry point that takes a user's repo and returns a translated/rendered document.

## 3. Findings (by impact)

| # | Gap | Real-usage scenario that breaks | Status |
|---|---|---|---|
| 1 | **Translator core has no runtime entry** | User points GoVibe at a repo and asks for a doc in their own format → impossible; no ingest/atomize/render tool exists. | design-only |
| 2 | **No onboarding / ingest of an existing repo** | `govibe.workspace.initialize` only scaffolds GoVibe's own dirs; nothing reads a user's existing code/docs → no first-value path for a partial adopter. | missing |
| 3 | **Translation fidelity verification undesigned** | A translator that cannot prove `A1 ⇄ GKS ⇄ A25` preserved meaning earns no trust. `ADR-017` §3 names lossy mapping as a risk but no verification is designed. | undesigned (trust-critical) |
| 4 | **Governance gate does not cover the product's output** | `docs:validate` gates GoVibe's own docs only; there is no gate on documents rendered/translated **into a user's repo**, and the gate is still manual (`diff:check` not in CI, no git hooks). | partial |
| 5 | **MSP not wired** | `ADR-016` makes GoVibe+MSP the mandatory core, but there are **0 `msp_*` tools** → provenance/memory (the moat's home) has no runtime. | missing |
| 6 | **CoDev semantic-conflict resolution undesigned** | When two teams' atoms disagree through GKS, there is no merge / tension-resolution flow — yet multi-team coordination is CoDev's whole purpose. | undesigned |
| 7 | **Language-pack curation: auto vs human — unresolved** | Whether per-convention mappings are auto-derived or human-curated drives the feasibility claim ("works for every system"); never decided. | open question |
| 8 | **Full-eco visual GKS UI is a stub** | The ERD / DAG / node-graph surface promised in full-eco (Domain B/C) is not built. | stub |

## 4. Severity Summary

- **Critical (blocks the positioning):** #1, #3.
- **Core-incomplete:** #2, #5 (the mandatory GoVibe+MSP core is half-absent at runtime).
- **Trust / correctness:** #4, #6.
- **Decision/feasibility:** #7. **Full-eco completeness:** #8.

## 5. Recommendation

Build a **thin vertical slice of the translator core first** rather than widening the roadmap product: one `ingest` path, one `render` path, and one `fidelity` gate — proving `ingest → atomize → symbol-link → render → verify` end-to-end on a sample repo. This is specified in `SRS-GoVibe-Translator-Core-Slice`. Resolve open question #7 before build. Treat MSP wiring (#5) as the parallel core-completion track.

## 6. Notes / Scope

This audit covers runtime-vs-design gaps in the user flow only. It does not re-audit the doc-governance enforcement chain (covered separately) beyond noting #4. No code was changed by this audit.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-22 | Boss (CEO) | Initial audit of user-flow runtime gaps: translator core is documented but 0% runtime; 8 findings; recommends a thin translator-core slice (see SRS) + MSP wiring. |
