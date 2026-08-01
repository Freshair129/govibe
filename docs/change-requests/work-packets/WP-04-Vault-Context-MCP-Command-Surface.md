---
title: "WP-04: Vault and Context MCP Command Surface"
doc_id: "WP-04-VAULT-CONTEXT-MCP-SURFACE"
status: "in_progress"
version: "0.1.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
complexity: "C-3"
access_scope: "H4"
---

# Objective

Close the contract/runtime gap where API-005 declares GoVibe-facing vault, context, replay, audit, and memory-promotion commands but the MCP registry and handlers do not expose them.

# Current evidence

- API-005 declares `govibe.vault.status`, `govibe.vault.mount`, `govibe.context.resolve`, `govibe.context.diff`, `govibe.context.audit`, `govibe.context.replay`, and `govibe.memory.promote`.
- `scripts/mcp/registry.mjs` does not register those commands on `main`.
- `scripts/mcp/handlers.mjs` has no dispatch cases for them.
- `MspClient` already provides parent-facing primitives for context resolution, injection recording, replay, evidence, and knowledge promotion.

# Scope

1. Register the seven declared MCP commands with explicit JSON input schemas.
2. Add runtime methods and handlers that use local governed state plus the MSP parent adapter.
3. Implement fail-closed behavior when MSP capability or required local lineage is unavailable.
4. Preserve exact context/cache/injection lineage for audit and replay.
5. Add tests for registry presence, handler routing, input validation, fail-closed behavior, and successful adapter calls.
6. Update API-005, API-006, Blueprint, CLAUDE.md, AGENTS.md, and the document registry only where implementation evidence requires propagation.

# Command semantics

- `govibe.vault.status`: read local vault bindings/materialization and optionally reconcile with MSP registry status.
- `govibe.vault.mount`: request an MSP-authorized shared-vault mount; local materialization occurs only after an approved parent response.
- `govibe.context.resolve`: resolve a T/V/W/M context through MSP without dispatching an executor.
- `govibe.context.diff`: compare two retained context/cache records or request an MSP-authorized M-ctx diff.
- `govibe.context.audit`: enumerate and verify retained injection/cache lineage under the workspace boundary.
- `govibe.context.replay`: verify retained exact context and request replay authorization/result through MSP.
- `govibe.memory.promote`: submit a governed memory/knowledge candidate to MSP; never write GKS directly.

# Invariants

1. GoVibe calls MSP only; no direct GKS or GenesisBlockDB port is introduced.
2. Commands must not claim success when parent transport or required evidence is missing.
3. `kvId` remains provider-issued and optional.
4. Replay never substitutes newer source versions silently.
5. Vault mount and memory promotion are authorization operations, not blind local writes.
6. Private memory is not promoted to Shared Vault without explicit candidate provenance and MSP approval.

# Acceptance criteria

- All seven commands appear in the MCP tool catalog.
- Every command has a handler and runtime path.
- Commands return structured evidence and explicit blocked reasons.
- Local path access remains workspace-bounded.
- Tests, docs validation, lint, MCP smoke, and build pass.
- PR remains unmerged until explicit owner approval.
