---
title: "Audit: H-Axis and Execution-Governance STD Inventory"
doc_id: "AUDIT-2026-08-01-H-AXIS-STD-INVENTORY"
status: "under-review"
version: "0.1.1"
updated: "2026-08-03"
owner: "ATHER"
source_of_truth: false
canonical_authority:
  repository: "Freshair129/RWANG-PROMAX"
  path: "skills/rwang/references/EXECUTION-GOVERNANCE.md"
  version: "2.3.0+ga"
---

# Audit: H-Axis and Execution-Governance STD Inventory

## 1. Canonical result

The canonical RWANG standard and the GoVibe mirror agree on the binding definition:

```text
H = Access Scope / executor tool-permission ceiling
valid values = H0-H4
H5/H6 = retired enforcement tiers
```

Retrieval distance, representation depth, context budget, W-scale, risk, and operating mode are independent axes.

## 2. Authority chain

| Priority | Source | Status | Result |
|---|---|---|---|
| 1 | `Freshair129/RWANG-PROMAX/skills/rwang/references/EXECUTION-GOVERNANCE.md` | stable canonical | H0-H4 Access Scope |
| 2 | `docs/STD-Execution-Governance.md` | stable mirror | semantically aligned with RWANG |
| 3 | `docs/adr/ADR-021-H-Axis-Access-Scope-Semantic-Separation.md` | accepted local decision | binds GoVibe migration and compatibility |
| 4 | feature/SRS/C4/PoC documents | mixed | must conform to sources above |

## 3. Reviewed files

| File | Classification | Finding | Action in PR #17 |
|---|---|---|---|
| `docs/STD-Execution-Governance.md` | stable mirror | Correctly defines H0-H4 as Access Scope and retires H5/H6 | no semantic rewrite required |
| RWANG `EXECUTION-GOVERNANCE.md` | canonical external STD | Confirms H0-H4 and separates graph radius | used as authority |
| `docs/architecture/C4-GoVibe-Platform.md` | active draft architecture | Uses H0-H6 for retrieval and full-network traversal | correction overlay added; direct rewrite deferred |
| `docs/srs/SRS-GKS-Retrieval-Layer.md` | active draft SRS | Used H0-H6 as graph hops and cited STD incorrectly | corrected to R0-R6 |
| `docs/assurance/audit/POC-H6-Budget-Sufficiency.md` | approved audit, legacy identifier | Note distinguished R from H but active body still used H0-H6 | body normalized to R0-R6; filename/doc_id retained for compatibility |
| `docs/features/genesis-knowledge-system/FEAT-Hierarchy-Compaction-System.md` | active draft feature | Defined H0-H6 as context/compaction scale | corrected to H/R/D/W/budget separation |
| `docs/adr/ADR-020-Per-Agent-Memory-Unit.md` | proposed ADR | Contains legacy `D/H` spatial wording and H-vs-D references | residual correction required before acceptance |
| `docs/api/API-004-Task-Scoped-Context-Packet-Schema.md` | approved API | Does not currently encode H, R, or budget fields; no semantic collision | no change required in this PR |
| `docs/change-control/change-requests/CR-2026-08-01-GoVibe-Architecture-Alignment-and-Operating-Mode-Implementation.md` | parent CR | Previously used H5 and H0-H6 context expansion | corrected to C-3/H4 and separated axes |
| historical `ADR-020-H-Axis-Access-Scope-Semantic-Separation.md` collision reference | newly created but colliding | ADR number collided with existing ADR-020 | replaced by existing [`ADR-021`](../../adr/ADR-021-H-Axis-Access-Scope-Semantic-Separation.md) |

## 4. Active corrections completed

- Parent CR uses `access_scope: H4`, not `context_tier: H5`.
- Retrieval SRS uses `R0-R6` and prohibits inference between H, R, and budget.
- Hierarchy Compaction feature uses separate `R`, `D`, `W`, budget, and H0-H4 Access Scope.
- Legacy H6 PoC preserves stable identity while using R0-R6 in active semantics.
- ADR number collision was removed by assigning H-axis separation to ADR-021.
- C4 conflicts are explicitly superseded by a correction overlay pending full-file revision.

## 5. Residual debt

The following work remains bounded and must not be mistaken for completed implementation:

1. Rewrite the base C4 file directly and remove the temporary overlay after review.
2. Correct `ADR-020-Per-Agent-Memory-Unit.md` references from spatial `D/H` to `D/R` and ADR-021 terminology.
3. Inspect runtime schemas and code symbols for `context_tier`, `HLevel`, `classifyHLevel`, and retrieval-side H usage.
4. Add document validation that rejects active H5/H6 enforcement values.
5. Add API compatibility rules if future packet schemas expose `accessScope`, `retrievalRadius`, or `contextBudget`.
6. Register ADR-021 and revised document versions in `DOC-VERSION-REGISTRY.md` after merge-conflict review with concurrent PR #14.

## 6. Important limitation

GitHub code search returned no indexed results for broad repository queries during this audit. The inventory is grounded in the document registry, known canonical references, and directly fetched files. A clean-checkout grep and docs validation remain required before final merge.

Recommended local validation:

```bash
rg -n "H5|H6|H0[-.]H6|H0.?H6|context_tier|context tier|HLevel|H-level|GraphHopResolver|classifyHLevel|resolveGraphScope|full-network traversal" .
npm run docs:validate
```

## 7. Gate decision

**Document semantics:** ready for review.  
**Repository-wide code conformance:** not yet proven.  
**Runtime/schema migration:** not authorized in this PR.

## Changelog

| Version | Date | Status | Summary |
|---|---|---|---|
| 0.1.1 | 2026-08-03 | under-review | Preserved the historical ADR-020 collision record and normalized its active reference to existing ADR-021. |
| 0.1.0 | 2026-08-01 | under-review | Recorded H/STD authority, reviewed known active files, completed bounded document corrections, and listed residual validation debt. |
