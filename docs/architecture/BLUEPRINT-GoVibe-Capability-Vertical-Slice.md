---
title: "Blueprint: GoVibe Capability Migration"
doc_id: "BLUEPRINT-GOVIBE-CAPABILITY-VERTICAL-SLICE"
status: "approved"
version: "3.0.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
source_of_truth: true
related_docs:
  - "docs/api/API-004-Task-Scoped-Context-Packet-Schema.md"
  - "docs/api/API-005-GoVibe-Capability-Contracts.md"
  - "docs/api/API-006-Vault-Context-and-Replay-Contracts.md"
  - "docs/architecture/ARCH-Vault-and-Context-Model.md"
  - "docs/adr/ADR-022-Vault-Ownership-and-Context-Lineage.md"
---

# Boundary

GoVibe owns command routing, skill resolution, workflow state, twelve-stage execution, context packet materialization, and executor dispatch. MSP is the single parent-facing authority for identity, Vault Registry, private memory, context resolution, injection lineage, replay, evidence, and mediation to GKS. GKS and GenesisBlockDB are not directly reachable from GoVibe.

```text
Claude Code / Executor
  -> GoVibe MCP
     -> packages/govibe-core
        -> MSP parent adapter
           -> GKS shared-knowledge lifecycle
              -> GenesisBlockDB
```

# Package Layout

```text
packages/govibe-core/src/
  workspace.mjs
  vaults.mjs
  context-lineage.mjs
  context-packet.mjs
  msp-client.mjs
  skill-registry.mjs
  workflow-engine.mjs
  scan/
    scan.mjs
    stage-contract.mjs
    stage-runner.mjs
    stage-adapters.mjs
    graph-validation.mjs
```

`gks-client.mjs` is legacy migration code and must not be exported or used by new runtime paths. Removal is allowed after downstream imports are eliminated.

# Global and Workspace State

Global state resolves from the GoVibe user home and includes identity, trust policy, provider configuration, and Agent Global Private Vault references.

Workspace state materializes as:

```text
<workspace>/.govibe/
  config.json
  skill-lock.json
  project-state.json
  vaults.json
  skills/

<workspace>/.brain/
  <project-slug>/
    manifest.json
  private/<agent-id>/
    manifest.json
  <mounted-shared-vault-slug>/
```

# Initialize Flow

1. Resolve workspace inside the allowed-root boundary.
2. Resolve Global identity and Agent Global Private Vault reference.
3. Create stable `project_id` and `workspace_id`.
4. Create project Shared Vault and Agent Workspace Private Vault identities.
5. Create `.govibe/` and `.brain/` materializations.
6. Write `.govibe/vaults.json` and manifests.
7. Pin the built-in skill.
8. Register workspace and vault bindings through `msp_workspace_register`.
9. Fail closed for governed execution when parent registration fails.
10. Do not run a scan implicitly.

# Continue and Context Assembly

1. Resolve and hash-check the pinned skill.
2. Load project state and vault bindings.
3. Select `T-ctx`, `V-ctx`, `W-ctx`, or `M-ctx`.
4. Call `msp_context_resolve` with workspace, Agent, profile, workflow, and parent-context metadata.
5. Validate returned exact-version references.
6. Assemble API-004 context packet.
7. Issue `contextId` and `cacheId`; leave `kvId` null until runtime ingestion.
8. Record injection through `msp_context_injection_record`.
9. Return executor-neutral packet.

For M-ctx, repeat resolution every turn, preserve `parentContextId`, and record the returned diff reference.

# Scan Flow

- L1 inventories files, languages, source-of-truth candidates, and exclusions.
- Deep scan invokes the twelve public stages in canonical order.
- Stage 1-12 outputs are candidate observations, not canonical knowledge.
- Producing stages submit `govibe-knowledge-candidate/v1` to `msp_knowledge_promote`.
- MSP applies identity, provenance, disclosure, and promotion policy before mediating GKS.
- Returned `gks:` references are opaque references and do not grant direct GKS access.
- F1-F4 are internal finalization operations, not Stage 13-16.
- Completion requires terminal stage evidence and graph validation.

# Vault and Memory Lifecycle

```text
Workspace Private episode
  -> reflection / redaction / compression
  -> Global Private durable memory

Workspace Private insight
  -> knowledge candidate
  -> MSP validation / approval
  -> Shared Vault SOT
```

Raw private episodes never become project SOT automatically.

# Replay and Audit

Each injection record binds Agent, session, run, turn, profile, exact source versions, `contextId`, `cacheId`, optional `kvId`, source-manifest hash, context hash, and parent lineage. Replay reports context reproducibility, execution reproducibility, and output identity separately.

KV reuse is valid only when model, tokenizer, system prompt, tool schema, ordering, source versions, and materialized context hash match.

# Verification

```powershell
npm run docs:validate
npm run roadmap:validate
npm run lint
npm run test
npm run mcp:smoke
npm run build
```

# Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 3.0.0 | 2026-08-01 | Boss / ATHER | Added Global/Workspace vault hierarchy, context profiles, replay lineage, and mandatory MSP-mediated knowledge promotion. |
| 2.0.0 | 2026-07-30 | Boss / ATHER | Expanded the approved migration with independent adapters; superseded by parent-only mediation. |
