# API-003: Mission Workflow Event Schema

**Status:** `DRAFT`
**Updated:** 2026-06-13
**Primary PRD System:** `SYSTEM-06::Integration-Bridge-System`
**Supporting PRD Systems:** `SYSTEM-02::Project-Roadmap-Management-System`, `SYSTEM-05::Agent-Team-Management-System`, `SYSTEM-09::Traceability-Audit-Verification-System`
**Owner:** KIN
**Auditor:** ATHER
**Complexity:** `C-2`
**Context Tier:** `H3`
**W-Scale:** `W2`
**Risk:** `MEDIUM`

## 1. Goal

Define the typed event and snapshot contract for workflow-aware Mission Control state.

This schema extends the current `MissionSnapshot` / `MissionEvent` model so roadmap, assignment, handoff, review, and verification state can be driven by document-derived or bridge-derived payloads instead of hardcoded UI arrays.

## 2. Current Problem

The current app has a strong generic gateway in `src/mission.ts`, but workflow state is still under-specified:

- roadmap data is not yet modeled as a first-class typed snapshot shape
- assignment and handoff semantics are not standardized
- review and verification state is not part of the workflow payload contract
- several views still rely on blueprint rows because the contract is incomplete

## 3. Schema Scope

This contract covers:

- roadmap snapshot payload
- workflow task payload
- assignment payload
- handoff payload
- verification status payload
- workflow-related mission events

This contract does not prescribe storage format for PM-authored docs. It defines the normalized runtime payload after parsing or bridge ingestion.

## 4. Core Types

### 4.1 Workflow task

```ts
type TemporalVersion = {
  version?: string;
  validFrom?: string;
  validTo?: string;
  recordedAt?: string;
  supersededAt?: string;
};

type WorkflowTaskNode = TemporalVersion & {
  id: string;
  parentId?: string;
  type: "roadmap" | "phase" | "epic" | "sprint" | "task" | "sub-task" | "micro-task" | "atomic-task";
  title: string;
  summary?: string;
  state:
    | "proposed"
    | "classified"
    | "awaiting_doc"
    | "ready_for_plan"
    | "planned"
    | "ready_for_assignment"
    | "assigned"
    | "in_progress"
    | "handoff_pending"
    | "qa_review"
    | "audit_review"
    | "blocked"
    | "done";
  assigneeId?: string;
  assigneeType?: "human" | "agent" | "team" | "service";
  progress?: number;
  tags?: string[];
  artifactLinks?: string[];
  reviewLinks?: string[];
  verificationLinks?: string[];
};
```

### 4.2 Workflow assignment

```ts
type WorkflowAssignment = TemporalVersion & {
  taskId: string;
  subjectId: string;
  subjectType: "human" | "agent" | "team" | "service";
  policyModel: "RBAC" | "ABAC";
  assignedAt: string;
  assignedBy?: string;
};
```

### 4.3 Workflow handoff

```ts
type WorkflowHandoff = TemporalVersion & {
  taskId: string;
  fromId: string;
  toId: string;
  requiredArtifact?: string;
  note?: string;
  createdAt: string;
  state: "pending" | "accepted" | "rejected" | "completed";
};
```

### 4.4 Workflow verification

```ts
type WorkflowVerification = TemporalVersion & {
  taskId: string;
  qaStatus?: "pending" | "passed" | "failed";
  auditStatus?: "pending" | "passed" | "failed";
  deploymentStatus?: "pending" | "passed" | "failed" | "n/a";
  lastUpdatedAt?: string;
};
```

### 4.5 Roadmap snapshot

```ts
type RoadmapSnapshot = TemporalVersion & {
  sourcePath: string;
  sourceType: "markdown" | "html" | "api" | "mcp" | "event";
  updatedAt: string;
  nodes: WorkflowTaskNode[];
  assignments: WorkflowAssignment[];
  handoffs: WorkflowHandoff[];
  verifications: WorkflowVerification[];
};
```

### 4.6 Bi-temporal query options

```ts
type RoadmapQueryOptions = {
  asOfValidAt?: string;
  asOfRecordedAt?: string;
};
```

`asOfValidAt` selects records by business/effective time. `asOfRecordedAt` selects records by transaction/audit time. When omitted, consumers receive the current valid and current recorded state.

## 5. Mission Snapshot Extension

Recommended addition to `MissionSnapshot`:

```ts
type MissionSnapshot = {
  // existing fields
  roadmap?: RoadmapSnapshot;
};
```

This is backward-compatible because the field is optional.

## 6. Mission Event Extension

Recommended additions to `MissionEvent`:

```ts
type MissionEvent =
  | { type: "roadmap.snapshot"; roadmap: RoadmapSnapshot }
  | { type: "roadmap.node.update"; node: WorkflowTaskNode }
  | { type: "roadmap.assignment"; assignment: WorkflowAssignment }
  | { type: "roadmap.handoff"; handoff: WorkflowHandoff }
  | { type: "roadmap.verification"; verification: WorkflowVerification };
```

## 7. Producer Sources

Valid producers include:

- Docs-to-Code parser reading approved `docs/roadmap/*.md`
- HTML import pipeline reading approved roadmap `.html`
- backend API adapter
- MCP integration bridge
- manual MissionEvent ingestion for debugging

Regardless of source, canonical live state must be normalized into the same schema.

## 8. Consumer Expectations

### A2 Roadmap Board

Must consume:

- `roadmap.nodes`
- `roadmap.assignments`
- `roadmap.verifications`

Should render:

- hierarchy
- assignee
- progress
- review and verification state

### A5 Agent Management

May consume:

- assigned tasks by `assigneeId`
- handoff targets
- workload summaries derived from roadmap nodes

### A6 Visual Office

May consume:

- `roadmap.handoffs`
- workflow states by assignee
- cross-agent activity chain

## 9. Validation Rules

- `id` values must be stable across refreshes for the same source document item.
- `policyModel` must match the subject type unless explicitly justified otherwise.
- `progress` must be between `0` and `100`.
- `sourcePath` must be preserved for traceability when the source is document-derived.
- Event consumers must merge updates without silently dropping verification or artifact state.
- `validFrom` must be before or equal to `validTo` when both are present.
- `recordedAt` must be before or equal to `supersededAt` when both are present.
- Runtime fields use `camelCase`; document frontmatter can keep governance `snake_case`.

## 10. Example Event

```json
{
  "type": "roadmap.assignment",
  "assignment": {
    "taskId": "TASK-A2-017",
    "subjectId": "eva",
    "subjectType": "agent",
    "policyModel": "ABAC",
    "assignedAt": "2026-06-13T09:30:00Z",
    "assignedBy": "lyra"
  }
}
```

## 11. Acceptance Criteria

- The schema can represent roadmap hierarchy from roadmap to atomic-task.
- The schema can represent both human and agent assignment.
- The schema can represent explicit handoff between participants.
- The schema can represent QA and auditor state without local UI-only flags.
- The schema is compatible with existing `MissionSnapshot` / `MissionEvent` patterns in `src/mission.ts`.

## 12. Related Docs

- `docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md`
- `docs/features/project-roadmap/FEAT-Document-Driven-Roadmap-Source.md`
- `docs/operations/runbooks/RUNBOOK-GoVibe-Multi-Agent.md`
- `docs/design/DOMAIN_DETAILS.md`
