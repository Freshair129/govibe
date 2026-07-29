---
title: "API: Task-Scoped Context Packet Schema"
doc_id: "API-004-TASK-SCOPED-CONTEXT-PACKET-SCHEMA"
status: "approved"
version: "0.2.0"
updated: "2026-07-29"
owner: "ARCHON / ATHER"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
supporting_prd_systems:
  - "SYSTEM-03::Docs-to-Code-System"
  - "SYSTEM-06::Integration-Bridge-System"
  - "SYSTEM-08::Genesis-Knowledge-HCS-System"
  - "SYSTEM-09::Traceability-Audit-Verification-System"
  - "SYSTEM-10::Execution-Governance-System"
related_docs:
  - "docs/features/agent-team/FEAT-Task-Scoped-Context-Injection.md"
  - "docs/srs/SRS-GoVibe-Task-Scoped-Context-Injection.md"
  - "docs/architecture/BLUEPRINT-Task-Scoped-Context-Injection.md"
  - "docs/runbooks/RUNBOOK-Bounded-External-Executor-Workflow.md"
  - "docs/lld/LLD-GoVibe-MCP-Tools.md"
---

# API: Task-Scoped Context Packet Schema

## 1. Goal

Define the canonical packet and result payload contracts for GoVibe task-scoped context injection.

This schema is the normalized contract between:

- context assembly logic
- sub-agents or bounded executors
- lead-agent review and promotion flow
- future MCP, CLI, or Mission Control consumers

It does not define storage format for docs, vaults, or runtime internals. It defines the packet shape after source selection and before execution, plus the structured result shape after execution.

## 2. Schema Scope

This contract covers:

- bounded execution packet input
- source refs and file refs
- verification expectation shape
- escalation status and reason shape
- structured executor result payload
- learning promotion buckets

This contract does not cover:

- roadmap event schema already defined elsewhere
- tenant or vault persistence schema
- final storage implementation for promoted learnings

## 3. Core Types

### 3.1 Shared enums

```ts
type ContextPacketStatus = "ready";

type ExecutionResultStatus =
  | "completed"
  | "completed_with_findings"
  | "escalated"
  | "blocked";

type EscalationReason =
  | "needs_more_context"
  | "scope_conflict"
  | "missing_source_truth"
  | "verification_blocked";
```

### 3.2 Source reference

```ts
type SourceRef = {
  path: string;
  docId?: string;
  section?: string;
  kind: "prd" | "feat" | "srs" | "adr" | "blueprint" | "runbook" | "roadmap" | "api" | "other";
  required: boolean;
};
```

Rules:

- `path` is required and must point to a governed source
- `kind` reflects source category for traceability
- `required: true` means the packet is invalid when the ref is missing

### 3.3 File reference

```ts
type FileRef = {
  path: string;
  required: boolean;
  purpose?: string;
};
```

Rules:

- `path` is required
- `required: true` means the executor must treat absence as escalation
- `purpose` is optional reader guidance, not authority

### 3.4 Verification expectation

```ts
type VerificationExpectation = {
  id: string;
  type: "doc_review" | "lint" | "build" | "test" | "manual_check" | "audit_review" | "qa_review" | "other";
  description: string;
  required: boolean;
};
```

Rules:

- every expectation must declare whether it is required
- the result payload must report actual execution status against these expectations

### 3.5 Critical known issue

```ts
type CriticalKnownIssue = {
  id: string;
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  sourceRef?: string;
};
```

Rules:

- `summary` is required
- `severity` is required
- `sourceRef` should point back to the origin when known

## 4. Context Packet Contract

Canonical input packet:

```ts
type TaskScopedContextPacket = {
  status: ContextPacketStatus;
  taskId: string;
  workspaceId: string;
  moduleId?: string;
  moduleScope?: string;
  objective: string;
  constraints: string[];
  sourceRefs: SourceRef[];
  fileRefs: FileRef[];
  verificationExpectations: VerificationExpectation[];
  criticalKnownIssues: CriticalKnownIssue[];
  promotedPriorLearnings?: string[];
  debugHistoryRefs?: string[];
  skillRef?: {
    id: string;
    version: string;
    contentHash: string;
  };
  globalStateRefs?: Array<{ ref: string; sourceHash: string }>;
  workspaceStateRefs?: Array<{ ref: string; sourceHash: string }>;
  knowledgeRefs?: Array<{ ref: string; sourceHash: string }>;
  policyDecisions?: Array<{
    decision: "allow" | "deny" | "shadow";
    ref: string;
    reason: string;
  }>;
};
```

Field rules:

- `status` is fixed to `ready` when the packet is dispatchable
- `taskId` is required
- `workspaceId` is required
- one of `moduleId` or `moduleScope` must be present
- `objective` is required and must describe one bounded task intent
- `constraints` is required and must include scope limits and no-go rules
- `sourceRefs` is required and must contain at least one authoritative source
- `fileRefs` may be empty only when the task is doc-only
- `verificationExpectations` is required, even if the list is short
- `criticalKnownIssues` may be empty
- `promotedPriorLearnings` is optional and must contain only already approved durable knowledge
- `debugHistoryRefs` is optional and must not be included by default
- `skillRef` is required for GoVibe workflow resume and identifies the immutable resolved Skill Definition
- Brain and knowledge fields contain references and source hashes, never unredacted private payloads
- `policyDecisions` records effective MSP decisions, including denied or shadowed state

## 5. Result Payload Contract

Canonical executor result payload:

```ts
type TaskScopedExecutionResult = {
  status: ExecutionResultStatus;
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
  escalationReason?: EscalationReason;
};
```

Field rules:

- `status` is required
- `resultSummary` is required for every terminal state
- `filesTouched` is required and may be empty for analysis-only work
- `verificationStatus` is required and must describe actual performed checks
- `criticalIssues` may be empty
- `criticalKnowledge` may be empty
- `durableLearnings` may be empty
- `nonPromotedNotes` may be empty
- `escalationReason` is required when `status` is `escalated` or `blocked`

## 6. Escalation Contract

Escalation is not an error fallback; it is a first-class safe outcome.

Required behavior:

- bounded executors must escalate instead of widening scope
- escalation must return a valid result payload with `status: escalated`
- `escalationReason` must be one of the allowed values

Recommended handling:

- `needs_more_context`: packet is too narrow to proceed safely
- `scope_conflict`: discovered dependency exceeds declared boundary
- `missing_source_truth`: required source ref or file ref is missing
- `verification_blocked`: required verification cannot be completed from allowed scope

## 7. Promotion Buckets

Promotion buckets are normalized as:

```ts
type PromotionBuckets = {
  criticalKnowledge: string[];
  durableLearnings: string[];
  nonPromotedNotes: string[];
};
```

Rules:

- only `criticalKnowledge` and approved `durableLearnings` are eligible for promotion
- `nonPromotedNotes` are private or ephemeral by policy
- no bucket is source of truth until lead review approves promotion

## 8. Example Packet

```json
{
  "status": "ready",
  "taskId": "TASK-CI-001",
  "workspaceId": "govibe-main",
  "moduleId": "task-scoped-context-injection",
  "objective": "Draft the bounded packet schema contract for sub-agent execution.",
  "constraints": [
    "Do not change runtime code.",
    "Use FEAT, SRS, ADR, and Blueprint as the only authoritative docs."
  ],
  "sourceRefs": [
    {
      "path": "docs/features/agent-team/FEAT-Task-Scoped-Context-Injection.md",
      "docId": "FEAT-TASK-SCOPED-CONTEXT-INJECTION",
      "kind": "feat",
      "required": true
    }
  ],
  "fileRefs": [
    {
      "path": "docs/architecture/BLUEPRINT-Task-Scoped-Context-Injection.md",
      "required": true,
      "purpose": "Implementation-ready design source"
    }
  ],
  "verificationExpectations": [
    {
      "id": "doc-validate",
      "type": "doc_review",
      "description": "Cross-links and registry stay valid.",
      "required": true
    }
  ],
  "criticalKnownIssues": [
    {
      "id": "scope-001",
      "summary": "Do not create a second PRD-level source for this module.",
      "severity": "high"
    }
  ]
}
```

## 9. Example Result

```json
{
  "status": "completed",
  "resultSummary": "Added the packet schema contract and aligned it with the blueprint.",
  "filesTouched": [
    "docs/api/API-004-Task-Scoped-Context-Packet-Schema.md",
    "docs/DOC-VERSION-REGISTRY.md"
  ],
  "verificationStatus": [
    {
      "expectationId": "doc-validate",
      "state": "passed"
    }
  ],
  "criticalIssues": [],
  "criticalKnowledge": [
    "Packet inputs require at least one authoritative sourceRef."
  ],
  "durableLearnings": [
    "Escalation is a first-class safe outcome, not an error-only fallback."
  ],
  "nonPromotedNotes": [
    "No runtime schema edits were needed in this round."
  ]
}
```

## 10. Validation Rules

- `taskId` and `workspaceId` are mandatory
- one of `moduleId` or `moduleScope` must be present
- `sourceRefs` must contain at least one `required: true` item
- `resultSummary` must always be present
- `escalationReason` must be present for `escalated` and `blocked`
- packet fields use `camelCase`
- schema must remain compatible with future MCP or CLI transport without requiring field renaming

## 11. Acceptance Criteria

- The contract defines the normalized packet input shape.
- The contract defines the normalized result payload shape.
- The contract defines escalation reasons and promotion buckets.
- The contract stays aligned with the feature, SRS, and blueprint docs.
- The contract does not introduce new runtime schema or product scope beyond the approved docs.

## 12. Related Docs

- `docs/features/agent-team/FEAT-Task-Scoped-Context-Injection.md`
- `docs/srs/SRS-GoVibe-Task-Scoped-Context-Injection.md`
- `docs/architecture/BLUEPRINT-Task-Scoped-Context-Injection.md`
- `docs/lld/LLD-GoVibe-MCP-Tools.md`
- `docs/runbooks/RUNBOOK-Bounded-External-Executor-Workflow.md`

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0 | 2026-07-29 | ATHER | Added Skill Registry, Two-Brain state, GKS knowledge, policy-decision, and source-hash references for GoVibe continue packets. |
| 0.1.0 | 2026-06-20 | ARCHON / ATHER | Signed off; promoted draft -> approved. |
| 0.1.0+draft | 2026-06-19 | ARCHON / ATHER | Added canonical packet and result payload schema for task-scoped context injection. |
