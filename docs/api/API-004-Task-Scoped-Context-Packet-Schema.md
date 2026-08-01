---
title: "API: Task-Scoped Context Packet Schema"
doc_id: "API-004-TASK-SCOPED-CONTEXT-PACKET-SCHEMA"
status: "approved"
version: "0.3.0"
updated: "2026-08-01"
owner: "ARCHON / ATHER"
source_of_truth: true
related_docs:
  - "docs/api/API-005-GoVibe-Capability-Contracts.md"
  - "docs/api/API-006-Vault-Context-and-Replay-Contracts.md"
  - "docs/architecture/ARCH-Vault-and-Context-Model.md"
  - "docs/adr/ADR-022-Vault-Ownership-and-Context-Lineage.md"
---

# Goal

Define the canonical packet injected into a bounded executor and the structured result returned after execution. The packet records the exact context seen by the Agent so it can be audited and replayed.

# Context Profiles

```ts
type ContextProfile = "T-ctx" | "V-ctx" | "W-ctx" | "M-ctx";
```

- `T-ctx`: system plus one task/event context.
- `V-ctx`: Agent Global Private plus current Workspace Private context.
- `W-ctx`: V-ctx plus exactly one active multi-agent workflow.
- `M-ctx`: per-turn synchronized Global/Workspace context with diff lineage and real-time shared context.

Profile selection does not grant execution permission and is independent from H, R, D, W, Budget, and Risk.

# Core Packet

```ts
type TaskScopedContextPacket = {
  schema: "govibe-context-packet/v2";
  status: "ready";
  taskId: string;
  projectId: string | null;
  workspaceId: string;
  moduleId?: string;
  moduleScope?: string;
  objective: string;
  constraints: string[];
  sourceRefs: SourceRef[];
  fileRefs: FileRef[];
  verificationExpectations: VerificationExpectation[];
  criticalKnownIssues: CriticalKnownIssue[];
  skillRef: { id: string; version: string; contentHash: string };

  contextProfile: ContextProfile;
  contextId: string;
  cacheId: string;
  kvId: string | null;
  parentContextId: string | null;
  sourceManifestHash: string;
  contextHash: string;

  globalStateRefs: VersionedRef[];
  workspaceStateRefs: VersionedRef[];
  knowledgeRefs: VersionedRef[];
  workflowRef: string | null;
  policyDecisions: PolicyDecision[];
};
```

`globalStateRefs` represents Global Private Vault references. `workspaceStateRefs` represents current Workspace Private Vault references. `knowledgeRefs` represents Shared Vault knowledge references returned through MSP mediation.

# Identity Rules

- `contextId` identifies a logical assembly from exact sources, policy, profile, and parent lineage.
- `cacheId` identifies the exact serialized/materialized packet retained for replay.
- `kvId` is null before runtime ingestion and may only be bound by the model runtime.
- `parentContextId` is required for every M-ctx turn after the first.
- `sourceManifestHash` hashes exact source references and versions.
- `contextHash` hashes the assembled logical context.

Every dispatched turn must reference one persisted `govibe-context-injection/v1` record and one `govibe-context-cache/v1` payload.

# Source and Version Rules

```ts
type VersionedRef = {
  ref: string;
  sourceHash: string;
  version?: string | number | null;
};
```

Replay must resolve the exact recorded versions. Newer versions must not be substituted silently. A stale or unavailable version yields a typed non-reproducible replay result.

# M-ctx Rules

M-ctx resolution runs every turn. Each turn records:

- `parentContextId`;
- Global Private Vault diff;
- Workspace Private Vault diff;
- relevant Shared Vault/workflow diff when policy includes them;
- new source-manifest and context hashes;
- injection timestamp and turn identity.

The chain is append-only.

# Executor Result

```ts
type TaskScopedExecutionResult = {
  status: "completed" | "completed_with_findings" | "escalated" | "blocked";
  resultSummary: string;
  filesTouched: string[];
  verificationStatus: Array<{
    expectationId: string;
    state: "passed" | "failed" | "skipped" | "not_run";
    note?: string;
  }>;
  criticalIssues: string[];
  criticalKnowledge: string[];
  durableLearnings: string[];
  nonPromotedNotes: string[];
  escalationReason?: "needs_more_context" | "scope_conflict" | "missing_source_truth" | "verification_blocked";
  contextId: string;
  cacheId: string;
  kvId: string | null;
};
```

Durable Agent experience is written to Workspace Private Vault first. Compression to Global Private Vault and promotion to project Shared Vault are separate MSP-governed operations.

# Validation

- At least one required authoritative source is mandatory.
- One of `moduleId` or `moduleScope` is mandatory.
- `W-ctx` requires exactly one workflow reference.
- `T-ctx` must not implicitly load private vault history.
- `M-ctx` after its first turn requires `parentContextId`.
- A packet cannot claim a `kvId` that lacks a matching runtime KV record.
- Cached packet hash must match the persisted packet.
- Executors must escalate rather than widen scope.

# Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.3.0 | 2026-08-01 | Boss / ATHER | Added T/V/W/M context profiles, vault-source semantics, context/cache/KV lineage, exact injection persistence, M-ctx diff chains, and replay rules. |
| 0.2.0 | 2026-07-29 | ATHER | Added Skill, brain state, knowledge, policy, and source-hash references. |
