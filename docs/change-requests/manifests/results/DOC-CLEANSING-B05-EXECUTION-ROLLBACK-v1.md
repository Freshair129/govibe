---
batch_id: B05
baseline_commit: 5520eb09df382a539f40fba527efab64e74ca282
operation_mode: pre_execution_rollback_evidence_only
source_result: DOC-CLEANSING-B05-RESULT-v1.json
source_result_sha256: b9d4b920b18bd6daf2d1790c11a8d30b0efd719a2d65970338293e50c28a2d2c
---

# B05 execution rollback evidence

This is a pre-execution, reversible-operation rollback record. No corpus file has been changed.

| Included disposition | Count | Rollback authority |
|---|---:|---|
| `propose_relocate` | 13 | `.file-organizer-map.json` entries (`from` is pre-operation; `to` is proposed target) |
| `propose_relocate_and_recover_name` | 1 | `.file-organizer-map.json` entry; rollback restores the original path and filename |

Excluded: `keep_in_place` (5), `propose_relocate_with_phase2_flag` (1), `propose_archive_after_authority_review` (1), and `escalate_phase2_before_relocation` (1). No archive or Phase 2 operation is authorized by this record.
