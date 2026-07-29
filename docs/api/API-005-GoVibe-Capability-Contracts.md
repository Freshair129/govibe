---
title: "API: GoVibe Capability Contracts"
doc_id: "API-005-GOVIBE-CAPABILITY-CONTRACTS"
status: "approved"
version: "1.0.0"
updated: "2026-07-29"
owner: "Boss / ATHER"
source_of_truth: true
related_docs:
  - "docs/change-requests/CR-2026-07-26-GoVibe-RWANG-Capability-Absorption.md"
  - "docs/architecture/BLUEPRINT-GoVibe-Capability-Vertical-Slice.md"
  - "docs/api/API-004-Task-Scoped-Context-Packet-Schema.md"
---

# API: GoVibe Capability Contracts

## Skill Definition

`govibe-skill-definition/v1` is immutable for an `(id, version)` pair.

```ts
type GoVibeSkillDefinition = {
  schema: "govibe-skill-definition/v1";
  id: string;
  version: string;
  aliases: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  permissions: string[];
  stageHooks: Array<{ stage: number; handler: string }>;
  verificationRequirements: string[];
  contentHash: string;
};
```

Definitions live at `.govibe/skills/<id>/<version>/SKILL.md`. A workspace lock at `.govibe/skill-lock.json` selects exact versions and hashes. Global policy may allow workspace-local additions, but an existing `(id, version)` cannot resolve to different content.

## Stage Run

```ts
type GoVibeStageRun = {
  schema: "govibe-stage-run/v1";
  runId: string;
  stage: number;
  name: string;
  status: "complete" | "not_applicable" | "incomplete" | "failed";
  inputRefs: string[];
  outputRefs: string[];
  method: string;
  confidence: number;
  exclusions: string[];
  error?: string;
};
```

Canonical deep-scan order is:

1. Scan
2. Structure
3. Markdown Parse
4. COBOL Parse
5. Symbolic Parse
6. Routes
7. Tools
8. ORM
9. Cross-File Resolution
10. MRO
11. Communities
12. Processes

L2 completion requires all stages to be `complete` or evidenced `not_applicable` and requires graph validation to pass. `incomplete` and `failed` are terminal non-complete outcomes.

## MCP Commands

- `govibe.workspace.initialize`: prepares `.govibe`, pins the built-in scan skill, registers the workspace through MSP, and does not run a deep scan.
- `govibe.workflow.continue`: resolves the pinned skill, project state, MSP Two-Brain context, and GKS knowledge into `govibe-context-packet/v2`.
- `govibe.workspace.scan`: defaults to L1; `deep: true` runs all twelve canonical stages in order.

## Ownership Negatives

- The Skill Registry never executes a stage.
- GoVibe never writes GKS storage directly; it calls the MSP facade.
- GKS rejects proof/evidence payloads.
- MSP proof rejects symbol/graph payloads.
- P0-P6 Block Assembly is not part of this contract.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 1.0.0 | 2026-07-29 | Boss / ATHER | Approved contracts for the first GoVibe capability-absorption vertical slice. |

