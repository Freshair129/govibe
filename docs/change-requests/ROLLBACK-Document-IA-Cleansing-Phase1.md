---
title: "Rollback Plan: Document IA Cleansing Phase 1"
doc_id: "ROLLBACK-DOCUMENT-IA-CLEANSING-PHASE1"
status: "draft"
version: "0.3.0+draft"
updated: "2026-08-03"
owner: "ATHER"
source_of_truth: true
execution_authorized: false
execution_complete: true
related_docs:
  - "docs/change-requests/CR-2026-08-03-Document-IA-and-Knowledge-Graph-Readiness.md"
  - "docs/migration/MIGRATION-Document-IA-and-Graph-Readiness.md"
---

# Rollback Plan: Document IA Cleansing Phase 1

## 1. Recovery Boundary

Baseline commit: `a5f2c938ab285b23b803d37c9786537a77dfdc9d`.
Phase 1-A performed 45 owner-approved reversible path operations (B04: 31;
B05: 14). The completed Phase 1B / Phase 2 integration adds eight in-place
metadata normalizations, one GVDOC semantic correction, five structural source
dispositions, and 22 semantic operations. No operation assigns canonical GKS
identity or requires a runtime repair. Rollback targets the isolated integration
branch and never the dirty root worktree.

## 2. Evidence Required Before Future Path Operations

Each future operation must record source path/hash, target path, operation,
collision check, inbound-reference impact, worker commit and inverse operation.
The B04 and B05 committed rollback maps are the approved execution authorities.

For tracked sources, `source path/hash` means SHA-256 and byte length over exact
baseline Git blob bytes obtained through `git cat-file`, with no implicit newline
or text normalization. Filesystem-byte hashes are permitted only for exclusions
explicitly marked ignored/untracked and never establish a tracked rollback base.

Before rollback approval, reproduce the evidence with:

```powershell
node scripts/docs/verify-doc-cleansing-manifest.mjs --external-root G:/govibe
```

The verifier is the executable authority for projection key order, UTF-8
bytewise record ordering, compact JSON serialization, and external skip evidence.

## 3. Recovery Procedure

1. Stop worker and integration dispatch.
2. Preserve review logs and current commit hashes.
3. Verify the target is the isolated worktree and branch.
4. Revert accepted commits using non-destructive Git revert commits.
5. Re-run all tracked hashes against baseline Git blobs and then run
   registry/reference validation.
6. Escalate any hash mismatch or path not represented in the rollback map.

No recursive deletion, hard reset, root-worktree checkout, or map clearing is
authorized by this plan.

## 5. Committed Maps and Integration Recovery

- `docs/change-requests/manifests/results/DOC-CLEANSING-B04-ROLLBACK-MAP-v1.json`
  records 31 inverse pairs and content states `18 byte_preserved + 13 intentionally_rewritten`.
- `docs/change-requests/manifests/results/DOC-CLEANSING-B05-ROLLBACK-MAP-v1.json`
  records 14 inverse pairs and content states `13 byte_preserved + 1 intentionally_rewritten`.

The Phase 1B maps, Phase 2 structural/semantic result maps, and
`DOC-CLEANSING-PHASE1B-PHASE2-INTEGRATION-RESULT-v1.json` form one ordered
recovery chain. The integration result records every final target's Git blob
and SHA-256 basis, including the CoDev CR and GVDOC-1004 cross-slice targets
whose final identity differs from an intermediate checkpoint.

Rollback order is: integration-only registry/control documents; Phase 2 stable
resource repair; Phase 2 reference rewrites; runbook move; LANDING rewrite;
Phase 2 structural moves; Phase 1B semantic correction; then Phase 1B metadata
normalizations. Verify each listed post-state before applying its inverse and
rerun the validators. The 77 criteria warnings, 14 roadmap warnings, and six
runtime test failures are exclusions, not rollback prerequisites.

## 4. Acceptance Criteria

- Recovery actions operate only in the isolated worktree.
- Every future path change has one inverse operation and verified hash.
- Root dirty/untracked content is unchanged.
- Post-rollback validation matches the pinned baseline or records an escalation.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.3.0+draft | 2026-08-03 | Boss / ATHER | Added Phase 1B / Phase 2 integrated rollback chain, final-identity requirement, and explicit unresolved exclusions. |
| 0.2.1+draft | 2026-08-03 | ATHER | Corrected the final accepted B04 content-state evidence to 18 byte-preserved and 13 intentionally rewritten. |
| 0.2.0+draft | 2026-08-03 | ATHER | Recorded the committed Phase 1-A rollback authorities, 45 reversible operations, content states, and no-further-mutation gate. |
| 0.1.1+draft | 2026-08-03 | ATHER | Bound rollback evidence to the deterministic manifest verifier and explicit external-root handling. |
| 0.1.0+draft | 2026-08-03 | ATHER | Defined non-destructive rollback evidence and recovery boundaries for the cleansing workflow. |
