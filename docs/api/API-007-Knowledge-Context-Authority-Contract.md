---
doc_id: "API-007-KNOWLEDGE-CONTEXT-AUTHORITY-CONTRACT"
title: "API-007: Knowledge and Context Authority Contract"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-02"
owner: "ARCHON / ATHER"
source_of_truth: true
related_issue: 52
related_adrs: ["ADR-023"]
---

# API-007: Knowledge and Context Authority Contract

## 1. Purpose

Define the minimum contracts between GoVibe, MSP, GKS, and bounded external providers so canonical knowledge, task context, promotion, replay, and impact analysis cannot be conflated.

## 2. Authority rules

- GoVibe validates requests and candidate outputs.
- MSP owns context resolution, authorization, scope, continuity, and promotion mediation.
- GKS owns canonical identity, canonical relations, deduplication, and graph versions.
- GenesisBlockDB remains behind GKS.
- External providers return candidates only.

## 3. Context resolve request

Schema identifier: `govibe-context-resolve-request/v1`

Required fields:

```yaml
schema: govibe-context-resolve-request/v1
task_id: string
agent_id: string
workspace_id: string
run_id: string
session_id: string
turn_id: string
context_profile: string
sources:
  - source_id: string
    version: string
    sha256: string
    authority_state: canonical|candidate|approved-source
required_reason_refs:
  - string
scope:
  include: [string]
  exclude: [string]
retrieval:
  seeds: [string]
  relation_allowlist: [string]
  radius: string
  depth: string
  width: string
budget:
  tokens: integer
  artifacts: integer
risk: string
unresolved_assumptions: [string]
```

MSP must reject or escalate when source hashes, authority state, required reason refs, or scope are missing for a governed task.

## 4. Context resolve response

Schema identifier: `msp-context-packet/v1`

```yaml
schema: msp-context-packet/v1
context_id: string
cache_id: string
parent_context_id: string|null
task_id: string
agent_id: string
source_manifest: []
canonical_refs: []
candidate_refs: []
reason_chains: []
scope:
  include: []
  exclude: []
retrieval_policy: {}
compaction_policy: {}
unresolved_assumptions: []
escalation_required: boolean
created_at: string
```

The packet must be persisted before dispatch. A context response is not valid merely because it contains relevant text; it must preserve source identity, authority, scope, exclusions, reason chains, and replay lineage.

## 5. Candidate provider response

Schema identifier: `govibe-provider-candidate/v1`

```yaml
schema: govibe-provider-candidate/v1
provider_id: string
provider_version: string
request_id: string
source_manifest: []
requested_scope: {}
assumptions: []
artifacts: []
relation_candidates: []
verification_hints: []
```

Provider responses must not contain self-assigned canonical GKS IDs. Any apparent `gks:` reference is treated as untrusted text until resolved by GKS after MSP authorization.

## 6. Promotion request

Schema identifier: `msp-knowledge-promotion-request/v1`

Required:

- candidate namespace and candidate IDs;
- source manifest with SHA-256 hashes;
- originating issue/insight/decision/ADR refs;
- approval evidence;
- relation candidates with provenance/confidence;
- scope and exclusions;
- unresolved-link evidence;
- expected canonical mapping count.

MSP mediates the request. GKS returns complete one-to-one candidate-to-canonical mappings and canonical graph version. Duplicate, missing, candidate-as-canonical, or non-`gks:` canonical refs must be rejected.

## 7. Replay contract

Replay must identify separately:

1. context reproducible;
2. execution reproducible;
3. output identical.

Replay cannot silently replace historical source versions with current versions. Any re-resolution against current knowledge is a new context lineage.

## 8. Impact contract

Impact requests must include:

- changed canonical seed refs;
- graph version;
- relation allowlist;
- maximum radius/depth;
- affected artifact classes;
- required explanation path.

Impact responses must return affected artifacts, relation chains, graph distance, impact score, required action, unresolved links, and graph-coverage caveats.

## 9. Failure behavior

Fail closed or escalate when:

- required WHY/source relations are missing;
- source identity/version/hash is unresolved;
- authority state is ambiguous;
- scope exclusions are absent for a high-risk task;
- provider output attempts canonical assignment;
- traversal exceeds the MSP policy;
- replay lineage cannot be reconstructed.

## 10. Compatibility

This contract refines and must be reconciled with:

- API-004 Task-Scoped Context Packet Schema
- API-005 GoVibe Capability Contracts
- API-006 Vault Context and Replay Contracts

Where an older contract is less strict, this document's authority and fail-closed requirements apply for work under issue #52 until the older contract is versioned.
