---
title: "Rollback Plan: Document IA Cleansing Phase 1"
doc_id: "ROLLBACK-DOCUMENT-IA-CLEANSING-PHASE1"
status: "draft"
version: "0.1.0+draft"
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
Phase 1 changes only the governed setup packet. It performs no corpus rename,
move, archive, merge, or deletion. Rollback therefore targets the isolated
integration branch and never the dirty root worktree.

## 2. Evidence Required Before Future Path Operations

Each future operation must record source path/hash, target path, operation,
collision check, inbound-reference impact, worker commit and inverse operation.
The consolidated dry-run map must be approved and committed before execution.

## 3. Recovery Procedure

1. Stop worker and integration dispatch.
2. Preserve review logs and current commit hashes.
3. Verify the target is the isolated worktree and branch.
4. Revert accepted commits using non-destructive Git revert commits.
5. Re-run inventory hashes and registry/reference validation.
6. Escalate any hash mismatch or path not represented in the rollback map.

No recursive deletion, hard reset, root-worktree checkout, or map clearing is
authorized by this plan.

## 4. Acceptance Criteria

- Recovery actions operate only in the isolated worktree.
- Every future path change has one inverse operation and verified hash.
- Root dirty/untracked content is unchanged.
- Post-rollback validation matches the pinned baseline or records an escalation.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-03 | ATHER | Defined non-destructive rollback evidence and recovery boundaries for the cleansing workflow. |
