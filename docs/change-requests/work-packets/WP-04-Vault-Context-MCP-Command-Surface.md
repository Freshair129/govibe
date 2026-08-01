---
title: "WP-04: Vault and Context MCP Command Surface"
doc_id: "WP-04-VAULT-CONTEXT-MCP-SURFACE"
status: "verification_pending"
version: "0.2.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
complexity: "C-3"
access_scope: "H4"
---

# Objective

Close the contract/runtime gap where API-005 declares GoVibe-facing vault, context, replay, audit, and memory-promotion commands but the MCP server did not expose them.

# Confirmed gap

- API-005 declares `govibe.vault.status`, `govibe.vault.mount`, `govibe.context.resolve`, `govibe.context.diff`, `govibe.context.audit`, `govibe.context.replay`, and `govibe.memory.promote`.
- The pre-WP-04 MCP tool catalog and dispatch path did not expose those commands.
- `MspClient` already supplied typed context resolution and replay primitives plus the generic fail-closed parent call boundary.

# Implemented scope

1. Added all seven command definitions with explicit JSON input schemas in `scripts/mcp/vault-context-surface.mjs`.
2. Added a side-effect-safe catalog augmentation that prevents duplicate tool registration.
3. Routed the MCP server to the dedicated vault/context handler before the legacy handler switch.
4. Bound context resolution and replay to typed `MspClient` methods.
5. Bound vault status/mount, context diff/audit, and memory promotion to explicit MSP parent tool names.
6. Added required-field and evidence validation before parent calls.
7. Added fail-closed behavior when the MSP adapter is unavailable.
8. Added tests for command catalog completeness, context resolution routing, vault mount wire mapping, evidence enforcement, and unavailable-parent behavior.

# Command semantics

- `govibe.vault.status`: request MSP-authoritative vault registration, binding, mount, and availability status.
- `govibe.vault.mount`: request an MSP-authorized Shared Vault mount into a declared workspace.
- `govibe.context.resolve`: resolve a T/V/W/M context through MSP without dispatching an executor.
- `govibe.context.diff`: compare two retained context assemblies through MSP.
- `govibe.context.audit`: audit context lineage, hashes, policy decisions, and replayability through MSP.
- `govibe.context.replay`: request exact-source replay verification through the typed MSP adapter.
- `govibe.memory.promote`: submit a provenance-bearing private-memory candidate to Global Private or Shared scope through MSP.

# Invariants

1. GoVibe calls MSP only; no direct GKS or GenesisBlockDB port is introduced.
2. Commands do not claim success when parent transport or required evidence is missing.
3. `kvId` remains provider-issued and optional.
4. Replay never substitutes newer source versions silently.
5. Vault mount and memory promotion are authorization operations, not blind local writes.
6. Private memory is not promoted without explicit evidence and MSP approval.
7. Tool registration is idempotent when the surface module is imported more than once by tests or alternate entrypoints.

# Acceptance criteria

- All seven commands appear in the MCP tool catalog.
- Every command has a routed MCP execution path.
- Inputs are validated before parent calls.
- Required promotion evidence is enforced.
- Missing MSP capability fails closed.
- Tests, docs validation, lint, MCP smoke, and build pass.
- PR remains unmerged until explicit owner approval.

# Verification evidence

- Implementation head: pending CI.
- Unit tests: pending CI.
- MCP smoke: pending CI.
- Docs validation/build: pending CI.

# Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0 | 2026-08-01 | Boss / ATHER | Implemented seven-command MCP surface, MSP routing, validation, fail-closed behavior, and tests; moved to verification pending. |
| 0.1.0 | 2026-08-01 | Boss / ATHER | Opened WP-04 from the confirmed API/runtime command gap. |
