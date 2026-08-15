---
title: "CR: Multi-Tenant Principal-Scoped Vault Binding"
doc_id: "CR-2026-08-15-MULTI-TENANT-PRINCIPAL-SCOPED-VAULT-BINDING"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-15"
owner: "Boss (CEO)"
source_of_truth: true
proposal_author: "OpenAI"
decision_owner: "Boss (CEO)"
approval_owner: "Boss (CEO)"
approval_recorded_at: ""
decision_authorized: false
execution_authorized: true
execution_complete: false
promotion_authorized: false
complexity: "C-3"
access_scope: "H3"
risk: "HIGH"
baseline_commit: ""
parent_change_request: "CR-2026-08-04-PERSISTENT-MEMORY-MSP-RUNTIME"
related_adrs: ["ADR-022", "ADR-028"]
related_apis: ["API-009", "API-010"]
---

# CR: Multi-Tenant Principal-Scoped Vault Binding

## Context

Issue #136 identifies a multi-tenant isolation gap in the existing three-vault
model when a human principal is not part of the private-vault binding key.
`agent_id + workspace_id` is insufficient for Workspace Private when multiple
people use the same software agent, and `agent_id` alone is insufficient for
Global Private in a SaaS runtime.

This change preserves the canonical taxonomy:

1. Shared Vault
2. Workspace Private Vault
3. Global Private Vault

It changes binding identity and authorization scope only. It does **not** add a
fourth vault tier or a parallel `MemorySpace` abstraction.

## Decision

MSP remains Vault Registry authority. Application Identity/Policy supplies
current `tenant_id`, optional `business_id`, `principal_id`, membership and
permission facts. MSP resolves those facts into an authorized vault set on
every turn.

Workspace Private identity in multi-tenant mode is:

```text
Tenant × Principal × Agent × Workspace
```

Global Private supports both:

```text
Tenant × Agent
Tenant × Principal × Agent
```

Shared knowledge remains non-user-private and may be governed by
project/tenant/business scope.

`thread_id`, `session_id`, `instance_id`, and event identity are provenance and
lifecycle dimensions, not vault owners.

## Runtime Contract

Input is the current `MemoryAccessContext` plus current authorization facts.
The runtime surface is `msp_vault_resolve` and returns:

```text
ResolvedVaultSet {
  workspacePrivateVaultId
  globalPrivateVaultIds[]
  sharedVaultIds[]
  permissions
}
```

The resolver never treats `principal_id` as `agent_id`, and authorization
facts are not cached across turns.

## Security Invariants

- `principal_id` never substitutes for `agent_id`.
- A scoped private vault requires matching tenant and, when present, principal.
- Global Private is cross-tenant denied by default.
- A stored mount never widens tenant/principal binding scope.
- Revoked membership supplied on the next call denies that call immediately.
- Thread/session/instance identifiers do not participate in deterministic
  private-vault ownership ids.
- Shared vault bindings cannot carry a principal owner.
- Shared writes remain separately governed; resolver read authorization does
  not imply canonical GKS promotion authority.

## Migration / Backward Compatibility Plan

Migration `0007_principal_scoped_vaults.sql` is additive. It adds nullable
`tenant_id`, `business_id`, `principal_id`, `visibility`, and `policy_version`
columns plus scope indexes. Existing rows remain valid with all new identity
dimensions null.

Legacy deterministic IDs remain unchanged when tenant/principal dimensions are
absent. New deterministic IDs are minted only when the caller opts into the
multi-tenant binding contract. This lets existing single-user/single-tenant
GoVibe workspaces continue operating without data rewriting.

No existing migration is edited, preserving the migration checksum guard.

## Security / Conformance Test Matrix

| Case | Expected result | Coverage |
|---|---|---|
| Same thread, same agent/workspace, different principals | Different Workspace Private ids | `principal-vault-scoping.security.mjs` |
| Same principal/agent, different tenants | No overlapping Global Private ids | `principal-vault-scoping.security.mjs` |
| Membership allowed then revoked | Next resolution denied | security + runtime contract tests |
| Thread/session changes for same actor scope | Same vault ids | `principal-vault-scoping.security.mjs` |
| Principal id equals agent id | Invalid request | core + MSP security tests |
| New dimensions absent | Legacy deterministic ids preserved | `vault-bindings-principal-scope.test.mjs` |
| Runtime integration | `msp_vault_resolve` returns authorized set | `principal-vault-resolver.contract.test.mjs` |
| Migration rerun | idempotent, schema version 7 | migration/vault-scoping tests |

## Affected Artifacts

- `schemas/Vault_Registry_Schema.json`
- `schemas/Workspace_Vault_Bindings_Schema.json`
- `packages/govibe-core/src/vaults.mjs`
- `packages/msp-runtime/src/domain/vault-registry.mjs`
- `packages/msp-runtime/src/transport/handlers/vault-handlers.mjs`
- `packages/msp-runtime/src/db/migrations/0007_principal_scoped_vaults.sql`
- `docs/adr/ADR-028-Multi-Tenant-Principal-Scoped-Vault-Binding.md`
- `docs/api/API-010-Multi-Tenant-Vault-Resolution-Contract.md`

## Non-goals

- fourth vault tier;
- `MemorySpace` abstraction;
- transport-specific LINE identity logic;
- moving Identity authority into MSP;
- moving canonical knowledge authority out of GKS;
- treating group thread membership as actor membership elevation.

## Changelog

- **0.1.0+draft — 2026-08-15:** Initial CR for Issue #136 implementation,
  migration, runtime resolver, backward-compatibility rules, and security test
  matrix.
