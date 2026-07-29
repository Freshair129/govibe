---
title: "Blueprint: GoVibe Capability Vertical Slice"
doc_id: "BLUEPRINT-GOVIBE-CAPABILITY-VERTICAL-SLICE"
status: "approved"
version: "1.0.0"
updated: "2026-07-29"
owner: "Boss / ATHER"
source_of_truth: true
related_docs:
  - "docs/change-requests/CR-2026-07-26-GoVibe-RWANG-Capability-Absorption.md"
  - "docs/api/API-004-Task-Scoped-Context-Packet-Schema.md"
  - "docs/api/API-005-GoVibe-Capability-Contracts.md"
  - "docs/adr/ADR-014-MSP-GKS-Traceability-Gate.md"
---

# Blueprint: GoVibe Capability Vertical Slice

## Boundary

This slice implements `init`, `continue`, and `scan`. It excludes `plan`, P0-P6 Block Assembly, Mission Control cutover, RWANG retirement, and direct storage coupling.

```text
MCP command catalog
  -> packages/govibe-core runtime
     -> .govibe Skill Registry (definition and lock)
     -> MSP client facade (context, knowledge, proof)
        -> Global + Workspace .brain
        -> GKS GraphStore
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
- Deep scan runs Stage 1-12 sequentially with persisted stage records.
- Every stage writes code knowledge through `msp_knowledge_write` and proof through `msp_proof_append` when it produces output.
- Parser absence or failure is `incomplete`/`failed`; it is never silently promoted to complete.
- COBOL is `not_applicable` only when the inventory proves no COBOL files.

## Adapter Contract

The default MSP adapter is transport-neutral and injectable in tests. The slice must not hardcode a local `cognitive_system` checkout. An unavailable MSP or GKS returns an explicit blocked/incomplete result rather than falling back to GoVibe-owned storage.

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
| 1.0.0 | 2026-07-29 | Boss / ATHER | Approved executable blueprint for init, continue, and 12-stage scan. |

