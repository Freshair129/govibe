---
title: "LLD: GoVibe Translator-Core Slice (tool contracts + algorithms)"
doc_id: "LLD-TRANSLATOR-CORE-SLICE"
status: "draft"
version: "0.1.1+draft"
updated: "2026-08-19"
owner: "ARCHON / ATHER"
type: lld
source_of_truth: true
prd_system: "SYSTEM-08::Genesis-Knowledge-System"
related_adrs: ["ADR-016", "ADR-017", "ADR-019"]
related_docs:
  - "docs/architecture/BLUEPRINT-Translator-Core-Slice.md"
  - "docs/srs/SRS-GoVibe-Translator-Core-Slice.md"
  - "docs/lld/LLD-GoVibe-MCP-Tools.md"
  - "docs/api/API-002-Symbol-Linking.md"
---

# LLD: GoVibe Translator-Core Slice

Low-level design for `BLUEPRINT-Translator-Core-Slice`. Defines the two new MCP tools, data shapes, the fidelity algorithm, and the provenance record. Tool style follows the existing `govibe.*` catalog (`scripts/mcp/registry.mjs`, `LLD-GoVibe-MCP-Tools`).

## 1. New MCP tools

### 1.1 `govibe.ingest.code`
Decompose a repo into GKS atoms, symbol-link them, and extract its doc-format template.

```jsonc
// input
{
  "actor": "string",            // required
  "repoPath": "string",         // required, absolute or workspace-relative
  "scope": "string?",           // optional path/glob subset
  "include": ["string"], "exclude": ["string"]  // optional filters
}
// output
{
  "atomCount": 0,
  "atomsRef": "string",         // handle into the atom store
  "symbolLinks": { "linked": 0, "orphans": ["string"] },
  "templateRef": "string",      // handle into the template store
  "templateConfidence": 0.0,    // 0..1; sections < threshold => needsConfirm
  "needsConfirm": ["string"],   // template sections flagged for human confirm (hybrid)
  "warnings": ["string"],
  "auditRef": "string"
}
```

### 1.2 `govibe.render`
Render a document from atoms into a target format template, gated by fidelity.

```jsonc
// input
{
  "actor": "string",            // required
  "selector": "string",         // required; what to render (atom id / query)
  "templateRef": "string",      // required; target format template
  "scope": { "hop": 2 },        // R0..R6 retrieval-radius bound (default per policy)
  "format": "string?"           // optional explicit format override
}
// output
{
  "verdict": "pass | flag | block",
  "document": "string|null",    // null when verdict=block
  "citedAtoms": ["string"],     // provenance
  "fidelity": {
    "roundTrip": { "ok": true, "lostAtoms": ["string"], "addedAtoms": ["string"] },
    "semantic":  { "score": 0.0, "confidence": 0.0 },
    "verdict": "pass | flag | block"
  },
  "needsConfirm": ["string"],   // present when verdict=flag
  "auditRef": "string"
}
```

Rule: `verdict=block` ⇒ no `document` (with `fidelity` reason). `verdict=flag` ⇒ `document` returned **plus** `needsConfirm` (human confirms before it is deliverable). `verdict=pass` ⇒ deliverable.

## 2. Data shapes

```jsonc
// GKS atom (slice subset)
{ "id": "string", "type": "string", "content": "string",
  "sourceRefs": [{ "file": "string", "symbol": "string?", "lines": "string?" }],
  "links": ["string"] }

// Format template (per repo/convention)
{ "id": "string", "repo": "string",
  "sections": [{ "key": "string", "heading": "string", "order": 0, "confidence": 0.0 }],
  "naming": { "case": "string", "patterns": ["string"] },
  "paradigm": "feature-base | system-base | other" }
```

## 3. Fidelity algorithm (FR-5 — BOTH metrics)

```text
render(atoms, template) -> doc
# (a) round-trip structural
reAtoms = atomize(doc)
lost  = sourceAtoms - reAtoms        # by stable atom key
added = reAtoms - sourceAtoms
roundTripOk = (lost is empty) and (added is empty)
# (b) semantic
score      = similarity(meaning(sourceAtoms), meaning(doc))   # 0..1
confidence = calibration(score, coverage)                     # 0..1
# verdict
if not roundTripOk and lost not empty:        verdict = block      # structural meaning dropped
elif score >= PASS and confidence >= CONF:    verdict = pass
elif score >= FLAG:                           verdict = flag       # human-confirm
else:                                         verdict = block
```

Thresholds (`PASS`, `FLAG`, `CONF`) are config, not hard-coded; defaults set during the slice spike and recorded in the test plan. `added`-only round-trip deltas (extra structure from a verbose target format) downgrade to `flag`, never `block`.

## 4. Provenance record (FR-6 — local jsonl, MSP-shaped)

```jsonc
// one line per ingest/render, appended to provenance/<date>.jsonl
{ "kind": "ingest | render", "auditRef": "string", "actor": "string",
  "sourceCommit": "string", "atomsRef": "string", "citedAtoms": ["string"],
  "templateRef": "string", "fidelity": { "verdict": "string", "score": 0.0 },
  "startedAt": "iso", "endedAt": "iso" }
```
Fields mirror the intended MSP provenance shape so migration is a mechanical adapter (audit #5).

## 5. Module layout (proposed)

```text
scripts/mcp/translator/
  ingestor.mjs        # FR-1
  symbol-linker.mjs   # FR-3 (wraps API-002)
  format-extractor.mjs# FR-2 (hybrid confidence)
  selector.mjs        # FR-4 scope (reuse JIT scope)
  renderer.mjs        # FR-4 format
  fidelity.mjs        # FR-5 (injectable scorers, unit-testable like verify-gate.mjs)
  provenance.mjs      # FR-6 jsonl writer
```
Tools registered in `scripts/mcp/registry.mjs`; dispatched in `handlers.mjs`; runtime methods on `GovibeRuntime`. `fidelity.mjs` takes injectable scorers (mirrors `verify-gate.mjs`) so it is testable without embeddings.

## 6. Acceptance Criteria

- `govibe.ingest.code` on a sample repo returns atoms + symbol links + a template with per-section confidence.
- `govibe.render` produces a document only when fidelity `verdict != block`; a deliberately lossy mapping returns `block` with a reason.
- One atom set renders into two templates (feature-base, system-base) → two format-correct docs.
- Every ingest/render appends a provenance jsonl line; tools appear in the catalog and pass `mcp:smoke`.

## 7. Definition of Done

- Tool contracts here match `registry.mjs` once implemented; `LLD-GoVibe-MCP-Tools` cross-references these two tools.
- `fidelity.mjs` has unit tests with injected scorers (no live embeddings in CI).
- A test plan records the chosen `PASS`/`FLAG`/`CONF` thresholds.
- `docs:validate` passes.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1+draft | 2026-08-19 | ATHER | Corrected abolished H-axis semantics per ADR-021/AUD-14 (TASK-PRD-022 sweep): `govibe.render` `scope.hop` bound relabeled from `H0..H6` to `R0..R6` retrieval radius. |
| 0.1.0+draft | 2026-06-22 | ARCHON / ATHER | Initial LLD: `govibe.ingest.code` + `govibe.render` contracts, atom/template shapes, both-metric fidelity algorithm, MSP-shaped local jsonl provenance, module layout. |
