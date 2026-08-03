---
batch_id: B05
baseline_commit: 5520eb09df382a539f40fba527efab64e74ca282
operation_mode: post_execution_rollback_evidence
source_result: DOC-CLEANSING-B05-RESULT-v1.json
source_result_sha256: b9d4b920b18bd6daf2d1790c11a8d30b0efd719a2d65970338293e50c28a2d2c
canonical_rollback_map: DOC-CLEANSING-B05-ROLLBACK-MAP-v1.json
---

# B05 execution rollback evidence

The approved reversible operations were executed in commit `3c8ca1c9c3e18ca28492fe665371e79b012d90a4`. The canonical committed inverse map is `DOC-CLEANSING-B05-ROLLBACK-MAP-v1.json`; the local `.file-organizer-map.json` is not rollback authority.

| Included disposition | Count | Rollback authority |
|---|---:|---|
| `propose_relocate` | 13 | Canonical map forward/inverse pairs with source and final Git-blob SHA-256 |
| `propose_relocate_and_recover_name` | 1 | Canonical map inverse restores the original path and filename |

Excluded: `keep_in_place` (5), `propose_relocate_with_phase2_flag` (1), `propose_archive_after_authority_review` (1), and `escalate_phase2_before_relocation` (1). No archive or Phase 2 operation is authorized by this record.

Final target preservation is explicit: 13 targets are byte-identical to their accepted source Git blobs; `docs/archive/legacy/LANDING-GoVibe-Release-Notes-v0.1.2.md` was intentionally rewritten only to update its internal mockup path. Source preflight (`14/14`) and final-target blob identity are separate checks.
