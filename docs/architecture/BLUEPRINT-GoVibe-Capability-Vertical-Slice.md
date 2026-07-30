---
title: "Blueprint: GoVibe Capability Migration"
doc_id: "BLUEPRINT-GOVIBE-CAPABILITY-VERTICAL-SLICE"
status: "approved"
version: "2.0.0"
updated: "2026-07-30"
owner: "Boss / ATHER"
source_of_truth: true
related_docs:
  - "docs/change-requests/CR-2026-07-26-GoVibe-RWANG-Capability-Absorption.md"
  - "docs/api/API-004-Task-Scoped-Context-Packet-Schema.md"
  - "docs/api/API-005-GoVibe-Capability-Contracts.md"
  - "docs/adr/ADR-014-MSP-GKS-Traceability-Gate.md"
---

# Blueprint: GoVibe Capability Migration

## Boundary

This blueprint implements the full approved capability migration. GoVibe owns
skill resolution, command routing, twelve-stage execution, workflow state, and
provider routing. GKS and MSP remain external authorities reached through
versioned MCP adapters. GenesisBlockDB remains behind those authorities.

```text
MCP command catalog
  -> packages/govibe-core runtime
     -> .govibe Skill Registry (definition and lock)
     -> MSP context/proof MCP adapter
     -> GKS knowledge MCP adapter
        -> GenesisBlockDB storage backend
```

## Package Layout

```text
packages/govibe-core/
  package.json
  src/
    workspace.mjs
    skill-registry.mjs
    context-packet.mjs
    msp-client.mjs
    gks-client.mjs
    workflow/
    providers/
    policy/
    scan/
      stage-contract.mjs
      stage-runner.mjs
      stage-adapters.mjs
      graph-validation.mjs
```

`scripts/mcp/registry.mjs` remains the MCP command catalog. It is not the Skill Registry.

## Runtime Flow

### Initialize

1. Resolve the requested workspace inside the caller-declared root.
2. Create `.govibe/config.json` and `.govibe/skill-lock.json` without overwriting incompatible state.
3. Install or verify the built-in scan definition under `.govibe/skills`.
4. Create Workspace Brain state directories and register through the MSP adapter when available.
5. Return prepared paths and warnings. Do not scan.

### Continue

1. Resolve and hash-check the pinned skill.
2. Load repository project state; missing required state returns `blocked`.
3. Call `msp_context_resolve` in fail-closed CoDev mode.
4. Validate returned GKS references and assemble API-004 v0.2.0.
5. Return an executor-neutral packet for Claude Code, Codex, or CrewAI.

### Scan

- L1 inventories files, languages, SOT, and exclusions.
- Deep scan runs Stage 1-12 sequentially with persisted state and append-only events.
- Every producing stage writes knowledge through `gks_code_upsert` and proof through `msp_evidence_record`.
- Parser absence or failure is `incomplete`/`failed`; it is never silently promoted to complete.
- COBOL is `not_applicable` only when the inventory proves no COBOL files.

## Workflow, Provider, and Policy Contracts

The MSP and GKS adapters are independent, transport-neutral, and injectable in
tests. Neither adapter may hardcode a local checkout. Missing providers return
typed degraded states. CoVibe and CoDev resolve the same skills; CoVibe permits
only the owner while CoDev requires scoped membership and explicit approvals.

Review runs under a read-only guard. Optimize requires a recorded baseline and
post-change measurement. Mission Control renders run state only from GoVibe
state plus MSP/GKS references; it does not synthesize proof or knowledge.

## Cutover Boundary

Legacy aliases may route to GoVibe with a deprecation warning during the
observation window. RWANG remains a frozen parity source until command and
stage parity, clean installation, rollback rehearsal, and explicit archival
approval all pass.

## Baseline Repair

The current runtime imports four absent modules: `dag.mjs`, `wave.mjs`, `step.mjs`, and `verify-gate.mjs`. This branch may restore only the minimum behavior already required by `runtime-core.mjs` and existing tests; it must not expand orchestration scope.

## Verification

```powershell
npm run docs:validate
npm run roadmap:validate
npm run lint
npm run test
npm run mcp:smoke
npm run build
```

No new docs-validation error is accepted beyond the three already-known missing-script references.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 2.0.0 | 2026-07-30 | Boss / ATHER | Expanded the approved vertical slice into the full T01-T13 migration with separate GKS/MSP MCP adapters and retirement gates. |
| 1.0.0 | 2026-07-29 | Boss / ATHER | Approved executable blueprint for init, continue, and 12-stage scan. |

