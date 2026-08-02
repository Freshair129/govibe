---
title: "Rollback Plan: Document IA Cleansing Phase 1"
doc_id: "ROLLBACK-DOCUMENT-IA-CLEANSING-PHASE1"
status: "draft"
version: "0.2.0+draft"
updated: "2026-08-03"
owner: "ATHER"
source_of_truth: true
related_docs:
  - "docs/change-requests/CR-2026-08-03-Document-IA-and-Knowledge-Graph-Readiness.md"
  - "docs/migration/MIGRATION-Document-IA-and-Graph-Readiness.md"
---

# Rollback Plan: Document IA Cleansing Phase 1

## 1. Recovery Boundary

Baseline commit: `a5f2c938ab285b23b803d37c9786537a77dfdc9d`.
Phase 1-A performed 45 owner-approved reversible path operations (B04: 31;
B05: 14), with no deletion, merge, or semantic authority change. Rollback
targets the isolated integration branch and never the dirty root worktree.

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

## 5. Committed Phase 1-A Maps

- `docs/change-requests/manifests/results/DOC-CLEANSING-B04-ROLLBACK-MAP-v1.json`
  records 31 inverse pairs and content states `20 byte_preserved + 11 intentionally_rewritten`.
- `docs/change-requests/manifests/results/DOC-CLEANSING-B05-ROLLBACK-MAP-v1.json`
  records 14 inverse pairs and content states `13 byte_preserved + 1 intentionally_rewritten`.

The eight metadata candidates and all excluded archive, duplicate, authority,
H-axis, schema/runtime, and Phase 2 work remain `execution_authorized=false`.

## 4. Acceptance Criteria

- Recovery actions operate only in the isolated worktree.
- Every future path change has one inverse operation and verified hash.
- Root dirty/untracked content is unchanged.
- Post-rollback validation matches the pinned baseline or records an escalation.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0+draft | 2026-08-03 | ATHER | Recorded the committed Phase 1-A rollback authorities, 45 reversible operations, content states, and no-further-mutation gate. |
| 0.1.1+draft | 2026-08-03 | ATHER | Bound rollback evidence to the deterministic manifest verifier and explicit external-root handling. |
| 0.1.0+draft | 2026-08-03 | ATHER | Defined non-destructive rollback evidence and recovery boundaries for the cleansing workflow. |
