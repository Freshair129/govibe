---
batch_id: B04
baseline_commit: 5520eb09df382a539f40fba527efab64e74ca282
operation_mode: post_execution_rollback_evidence
source_result: DOC-CLEANSING-B04-RESULT-v1.json
source_result_sha256: 29d292e2ceb34a148368ed4433a723757d1077ac0e3e48e3370c33ea94d3ab2d
---

# B04 execution rollback evidence

This is a post-execution, reversible-operation rollback record. The approved corpus moves have occurred; no metadata or semantic change is authorized by this record.

| Included disposition | Count | Rollback authority |
|---|---:|---|
| `move_candidate` | 31 | `DOC-CLEANSING-B04-ROLLBACK-MAP-v1.json` committed inverse pairs, Git-blob hashes, and rollback order |
| `metadata_candidate` | 0 materialized / 8 deferred | The source result supplies a `before` snapshot (blob, bytes, sha256) but no approved metadata patch/after-state, so an executable inverse cannot be derived safely. |

The committed map at `docs/change-requests/manifests/results/DOC-CLEANSING-B04-ROLLBACK-MAP-v1.json` is the canonical rollback authority. It contains every forward/inverse pair, baseline and final Git-blob SHA-256 values, content state, and deterministic rollback order. The ignored local map is not required for recovery. The eight metadata candidates remain deferred pending an approved exact metadata change and inverse patch; their pre-change snapshots remain in the immutable source result.

Excluded/deferred: `metadata_candidate` (8; no exact forward metadata state), `duplicate_candidate` (1), and `escalate` (1). No archive, Phase 2, or other disposition is authorized by this record.
