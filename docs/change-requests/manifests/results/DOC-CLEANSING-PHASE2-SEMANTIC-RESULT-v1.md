---
title: "Document Cleansing Phase 2 Semantic Authority Result"
doc_id: "DOC-CLEANSING-PHASE2-SEMANTIC-RESULT-v1"
version: "0.1.2+draft"
status: "candidate"
updated: "2026-08-03"
owner: "ATHER"
source_of_truth: false
---

# Document Cleansing Phase 2 Semantic Authority Result

## Boundary and Authority

| Field | Value |
|---|---|
| Baseline | `7c6ffde85f1f08771226abdc1f23d994a9e175db` |
| Complexity / Access | `C-2` / `H2` |
| Risk | MEDIUM |
| Governing authority | `docs/STD-Execution-Governance.md` (canonical, stable) |
| Runtime or code change | resource metadata/path correction only; no behavior or URI change |
| Registry change | one `resourceCatalog` entry in `scripts/mcp/registry.mjs` |
| Publication status | candidate evidence pending independent review |

The product-authorized decision retained the landing artifact as a draft,
non-SOT copy template and retained the multi-agent artifact as draft,
non-SOT operational guidance. This result does not promote either artifact or
assert that either is canonical.

## Repair RCA

- **Symptom:** `govibe://docs/runbook/multi-agent` still resolved to the deleted
  pre-move path and described the runbook as canonical.
- **Evidence:** independent review traced the stable URI to
  `scripts/mcp/registry.mjs`, whose resource entry retained the deleted
  pre-move runbook path after the move.
- **Root Cause:** the initial backlink inventory covered Markdown, `.agents`,
  and `GEMINI.md`, but omitted the executable MCP resource catalog.
- **Why it escaped:** documentation/reference validators do not execute the
  resource lookup, and the first bounded scan excluded source-code files.
- **Prevention:** include resource catalogs in path-move impact checks and
  assert that every preserved URI resolves to an existing file with authority
  metadata consistent with the target document.

## Executed Decisions

| Seed | Decision | Evidence |
|---|---|---|
| `docs/design/LANDING-Copy-Template-GoVibe-Draft1.md` | Kept in `docs/design/`; `docs/references/templates/` did not exist, so relocation was neither justified nor performed. Added explicit draft/non-SOT metadata and replaced its legacy context-tier wording with separated C/H/R/D/W/Budget/Risk wording. | No exact inbound path reference was discovered. |
| Former multi-agent runbook location | Moved to the existing, collision-free `docs/operations/runbooks/` taxonomy. Reclassified as draft non-SOT operational guidance; `docs/STD-Execution-Governance.md` is the canonical authority. | 20 active artifacts / 23 direct path-reference edges were rewritten after validator- and resource-catalog-assisted discovery. |
| `govibe://docs/runbook/multi-agent` | Preserved the compatibility URI; repointed the resource catalog to the moved file and replaced the stale canonical label with explicit draft/non-SOT operational-guidance metadata. | Direct resource lookup resolves the existing moved file; canonical authority remains `docs/STD-Execution-Governance.md`. |

The runbook now treats H only as `H0`–`H4` Access Scope and names C, R, D, W,
Budget, and Risk separately. Its operational runtime boundary remains:

```text
Executor / Claude Code -> GoVibe MCP -> MSP -> GKS -> GenesisBlockDB
```

## Bounded Impact Evidence

| Seed | Relation chain | Distance | Coverage and cycle result | Required action |
|---|---|---:|---|---|
| Landing template | template -> execution-governance standard | 1 | Zero exact inbound paths found in tracked Markdown; no cycle in the bounded scan. | retain path and correct semantics only |
| Multi-agent runbook | operational guidance -> execution-governance standard | 1 | 20 artifacts / 23 direct inbound reference edges; no cycle in the direct-reference set. | move runbook and rewrite every discovered active path/resource entry |

Coverage is an exact-path scan over tracked Markdown, `.agents`, `GEMINI.md`,
and the MCP resource catalog, bounded to one inbound reference edge and one governing-standard edge. It is discovery
evidence only, not a claim of GKS graph completeness. No MSP-issued context or
canonical GKS relation ID was available. Unrelated legacy H/context wording,
central document-registry edits, and runtime-behavior repair remain out of scope.

The deleted path now appears only as baseline evidence in historical cleansing
inventory/batch manifests, prior rollback/result artifacts, and one
non-canonical `.brain` session snapshot. No active Markdown, `.agents`,
`GEMINI.md`, or MCP resource-catalog consumer retains it.

## Rollback and Review

`DOC-CLEANSING-PHASE2-SEMANTIC-ROLLBACK-MAP-v1.json` records all 22 forward
operations, their exact inverse, baseline and post-change SHA-256/byte counts,
the 23 path/resource-reference rewrites, deterministic rollback order, and unresolved
scope. Prefer a non-destructive `git revert` of the committed slice; the map
provides a byte-verified recovery procedure if a file-level rollback is needed.

### Hash-basis evidence revision

| Field | Value |
|---|---|
| Revision | 2 |
| Status | `verified_git_blob_content_bytes` |
| SHA-256 basis | `git_blob_content_bytes` |
| Associations proved | 22 operations; 88 before/after/inverse blob-identity associations |
| Corpus semantics | unchanged; this revision only replaces working-tree-basis evidence with Git blob identities |

Each before, after, and inverse precondition/restore digest in the rollback map
was recomputed from its recorded Git blob content bytes. The accepted Phase 2
operations, inverse order, authority provenance, and target corpus are retained.

## Validation Evidence

| Gate | Result | Evidence |
|---|---|---|
| `npm run docs:validate` | PASS | 352 Markdown files and 179 document IDs checked; no errors. Existing AC/SC/DoD warnings remain out of scope. |
| `npm run roadmap:validate` | PASS | 7 roadmap sources checked; 0 errors and 14 pre-existing plan-quality warnings. |
| `npm run lint` | PASS | `tsc --noEmit` completed successfully. |
| `npm run test:security` | PASS | 35 passed, 0 failed. |
| Stable resource URI assertion | PASS | `getResourceByUri("govibe://docs/runbook/multi-agent")` preserved the URI, resolved the moved existing file, and exposed draft/non-SOT metadata plus the canonical standard path. |
| `npm run diff:check` | PASS | Repair diff contains exactly 2 evidence files and `scripts/mcp/registry.mjs`; documentation validation reran successfully. |

The initial validation run found four hidden `.agents` consumers after the
runbook move. All four were added to the bounded map and repaired before the
passing validation run. `npm ci --ignore-scripts` was required to restore the
lockfile-pinned dependencies in this isolated worktree; it changed no tracked
files and reported two existing audit findings (one low, one high), which were
not remediated in this documentation-only slice.

## Version Diff

| Artifact | Before | After |
|---|---|---|
| Landing copy template | ungoverned draft with `context tier (H0-H5)` wording | explicit non-SOT draft template with separated axes |
| Multi-agent runbook | candidate plus `source_of_truth: true`, legacy `H0-H6` context semantics, old taxonomy | draft non-SOT operational guidance, H0-H4 Access Scope semantics, operations taxonomy |
| Bounded references | 22 document/agent edges plus one stale resource edge | 23 document/agent/resource edges to the moved operational path |
| MCP resource compatibility | stable URI pointed to deleted path and claimed canonical status | stable URI points to existing moved file and explicitly identifies draft/non-SOT guidance plus the canonical standard |

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.2+draft | 2026-08-03 | ATHER | Normalized rollback-map SHA-256 evidence to recorded Git blob content bytes; added per-operation before/after/inverse blob identities without changing corpus semantics. |
| 0.1.1+draft | 2026-08-03 | ATHER | Repaired the stable MCP resource URI mapping and authority label after independent P1 review; added exact rollback evidence. |
| 0.1.0+draft | 2026-08-03 | ATHER | Recorded the authorized Phase 2 semantic/authority slice, bounded impact evidence, and pending independent-review gates. |
