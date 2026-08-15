---
title: "MissionSnapshot orchestration contract"
doc_id: "CR-2026-08-10-MISSIONSNAPSHOT-ORCHESTRATION-CONTRACT"
status: "approved"
version: "1.0.0"
updated: "2026-08-10"
owner: "Boss (CEO)"
source_of_truth: true
related_tasks:
  - "TASK-PRD-005"
related_docs:
  - "docs/roadmap/MASTERPLAN-govibe-production-readiness.md"
  - "docs/PRD-GoVibe-Platform-Overview.md"
---

# MissionSnapshot orchestration contract

## Decision

`MissionSnapshot.orchestration` is required in every runtime snapshot and has the exact shape below. The transport event `orchestration.update` carries the same object. This is a protocol-major change because snapshots that omit the field must fail validation rather than silently becoming an untyped UI state.

```text
MissionOrchestrationSnapshot
  waves: MissionOrchestrationWave[]
  updatedAt: ISO-8601 string

MissionOrchestrationWave
  id, index, level, status, taskIds, tasks, concurrency
  startedAt?, completedAt?

MissionOrchestrationTask
  taskId, assigneeId?, status, attempts
```

## Root cause

The runtime snapshot store and roadmap reload service already produced the slice and emitted `orchestration.update`; the TypeScript domain, public protocol declaration, protocol validator, and reducer did not declare or reduce it. The gateway therefore had no validated end-to-end contract for runtime output that already existed.

## Scope and acceptance criteria

- Add the explicit required domain and public protocol types; no consumer may use a cast or optional-chain to access this slice.
- Validate both snapshots and update events fail-closed, including malformed wave/task records.
- Reduce an update into the frontend snapshot and preserve it across unrelated patches.
- Prove the roadmap runtime publishes an orchestration slice and matching update event.

## Compatibility

The protocol moves from `1.0.0` / compatibility `1` to `2.0.0` / compatibility `2`. A v1 snapshot missing `orchestration` is invalid by design; callers must consume a v2 runtime snapshot.

## Verification

Run the targeted contract and runtime tests, typecheck/lint, document validation, roadmap validation, and `git diff --check`. TASK-PRD-005 remains in `review` pending the designated audit gate.

## Changelog

| Version | Date | Status | Summary |
|---|---|---|---|
| 1.0.0 | 2026-08-10 | approved | Owner-approved contract decision for TASK-PRD-005. |
