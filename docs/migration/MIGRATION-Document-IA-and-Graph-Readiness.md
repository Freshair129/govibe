---
title: "Migration Plan: Document IA and Graph Readiness"
doc_id: "MIGRATION-DOCUMENT-IA-GRAPH-READINESS"
status: "draft"
version: "0.2.0+draft"
updated: "2026-08-03"
owner: "LYRA / ATHER"
source_of_truth: true
related_docs:
  - "docs/change-requests/CR-2026-08-03-Document-IA-and-Knowledge-Graph-Readiness.md"
  - "docs/change-requests/manifests/DOC-CLEANSING-INVENTORY-v1.json"
  - "docs/change-requests/manifests/DOC-CLEANSING-B01-v1.json"
  - "docs/change-requests/ROLLBACK-Document-IA-Cleansing-Phase1.md"
---

# Migration Plan: Document IA and Graph Readiness

## 1. Baseline And Non-Mutation Gate

Phase 1 is pinned to `a5f2c938ab285b23b803d37c9786537a77dfdc9d`.
It creates planning artifacts only. The corpus must not be moved or renamed
until a complete dry-run map passes Noise Review and receives separate approval.

Tracked evidence hashes are SHA-256 over the exact Git blob bytes resolved by
`git rev-parse <baseline>:<path>` and read by `git cat-file blob <object-id>`.
Byte counts use that same blob buffer. No checkout conversion, encoding change,
line-ending conversion, Unicode normalization, or trailing newline is applied.
`sourceManifestHash` is SHA-256 over the UTF-8 canonical JSON projection defined
in the inventory manifest. The five ignored/untracked exclusions are explicitly
marked `filesystem_bytes` and are not mixed into the tracked source hash.

The verifier constructs the projection with keys in this exact insertion order:
`baseline_commit`, then `tracked_records`. Records are sorted by UTF-8 bytewise
path order and use keys `path`, `git_object_id`, `bytes`, `sha256`,
`disposition`, `batch` in that order; missing batch is serialized as `null`.
Serialization is compact `JSON.stringify`, encoded once as UTF-8, with no
whitespace or trailing newline.

Canonical verification command from the repository root:

```powershell
node scripts/docs/verify-doc-cleansing-manifest.mjs --external-root G:/govibe
```

Without `--external-root`, the command still verifies all 201 tracked blobs and
emits `skipped_no_external_root` for the five filesystem exclusions.

## 2. Exact Work Batches

The batch manifest is authoritative for exact paths and hashes.

| Batch | Responsibility | Count |
|---|---|---:|
| B01 | Root governance/product, roadmap, SRS, alignment, protocol, specs, API | 43 |
| B02 | Architecture, ADR, blueprints, LLD | 46 |
| B03 | Features | 43 |
| B04 | Change requests, audit, RCA, migration, security, handover | 41 |
| B05 | Design, runbooks, archive, typo-path candidates | 22 |

Total processable files: 195. Excluded hidden placeholders: 6. Baseline total:
201. Five ignored/untracked root files are separately hash-accounted and kept
outside worker scope, making the approved total 206. Each tracked processable
file appears in exactly one batch.

## 3. Work Packet And Review Contract

Every worker receives only its exact file list, baseline commit, source hash,
canonical references, writable paths, exclusions and acceptance criteria. It
returns a commit plus candidate actions, relation candidates, validations and
unresolved items. It must not modify registry or cross-batch paths.

Noise Review rejects scope drift, prose churn, weak relation typing, authority
guesses, path collisions, incomplete accounting, missing rollback entries, or
candidate promotion. Only accepted commits may be integrated. The integrated
diff receives the same review before Parent Final Gate.

## 4. Execution Sequence

1. Reproduce all 201 tracked hashes from Git blobs and verify baseline accounting.
2. Dispatch isolated B01-B05 work packets with `T-ctx`.
3. Review each commit read-only and return noisy batches for revision.
4. Integrate accepted commits in one `W-ctx` workflow.
5. Resolve cross-batch references only from the accepted dry-run map.
6. Run bounded backlink impact analysis and all validation gates.
7. Send compact evidence to Parent Final Gate; do not mutate beyond approved operations.
8. Open separate Phase 2 packets for semantic and authority corrections.

## 5. Failure And Stop Conditions

Stop and escalate on baseline hash drift, a missing or duplicate manifest path,
writable ownership overlap, canonical/mirror conflict, unknown lifecycle,
insufficient relation coverage, validation failure, or a rollback collision.
Never widen context or guess a disposition to clear a gate.

## 6. Acceptance And Success Criteria

- Inventory and batch manifests reproduce 201 = 195 included + 6 excluded.
- All batch counts are at most 50 and included paths are unique.
- Every integrated commit has an accepted review record.
- Phase 1-A performs only the owner-approved 45 reversible path operations;
  no semantic authority edit or unapproved mutation is allowed.
- Validation and rollback evidence are complete before Final Gate.

## 7. Phase 1-A Integrated Execution

Accepted B04 and B05 execution heads are integrated with their committed rollback
maps. The integrated scope is 45 reversible operations (B04: 31; B05: 14), with
metadata normalization deferred for 8 candidates. Archive candidates, duplicate
review, lifecycle/authority decisions, H-axis correction, schemas/runtime, and
Phase 2 remain excluded. Remaining candidates have
`execution_authorized=false` pending a separate owner decision.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0+draft | 2026-08-03 | LYRA / ATHER | Recorded Phase 1-A integrated execution scope, exclusions, deferred metadata, and no-further-mutation gate. |
| 0.1.1+draft | 2026-08-03 | LYRA / ATHER | Added the executable deterministic projection, Git-blob, batch, and optional external-filesystem verification contract. |
| 0.1.0+draft | 2026-08-03 | LYRA / ATHER | Defined the five exact cleansing batches, isolation, noise review, integration, stop, and final-gate sequence. |
