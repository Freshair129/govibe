---
title: "Alignment 12: Mission Control Context and Impact Surface"
doc_id: "ALIGNMENT-12-MISSION-CONTROL-CONTEXT-IMPACT-SURFACE"
status: "approved"
version: "1.0.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
type: "alignment"
source_of_truth: false
conforms_to:
  - "docs/api/API-004-Task-Scoped-Context-Packet-Schema.md"
  - "docs/api/API-005-GoVibe-Capability-Contracts.md"
  - "docs/api/API-006-Vault-Context-and-Replay-Contracts.md"
  - "docs/architecture/ARCH-Vault-and-Context-Model.md"
---

# Purpose

This document defines the Mission Control conformance surface for context, vault, replay, links and impact. Canonical semantics remain in the linked API and architecture documents.

# Context surface

Mission Control must represent these fields independently:

- Context Profile: T-ctx, V-ctx, W-ctx or M-ctx
- Access Scope: H0-H4
- Retrieval Radius: R or explicit retrieval policy
- Resolution Depth: D
- Workflow Fan-out/Coupling: W axis
- Context Budget and Risk
- `contextId`, `cacheId`, optional `kvId`
- `parentContextId`, diff reference and last synchronization time
- source versions, hashes, staleness and replay status

A generic `context tier` label is non-conforming because it collapses unrelated dimensions.

# Vault surface

The UI must distinguish:

- project Shared Vault;
- current Agent Workspace Private Vault;
- Agent Global Private Vault;
- mounted Shared Vaults;
- lifecycle and access status.

Folder names are presentation labels, not canonical identity. The UI must retain immutable vault IDs and registry/version references.

# Link and impact surface

Impact views must show:

- changed seed;
- affected artifact;
- relation chain;
- backlink distance;
- impact score and confidence;
- required action;
- unresolved links and graph coverage.

Backlinks must preserve the original forward relation type. The UI must not present a backlink as an independently asserted semantic fact.

# Audit surface

For every dispatched Agent turn, operators must be able to trace:

```text
Agent / run / turn
  -> contextId
  -> cacheId
  -> optional kvId
  -> exact source versions and hashes
  -> injection record
  -> output and verification evidence
```

M-ctx must expose parent/diff lineage per turn. Replay status must separately report context reproducibility, execution reproducibility and output identity.

# Honest-state rule

When parent services, exact historical sources, link targets or graph coverage are unavailable, Mission Control must show an explicit unavailable, partial or unresolved state. It must not invent telemetry or silently substitute current data.
