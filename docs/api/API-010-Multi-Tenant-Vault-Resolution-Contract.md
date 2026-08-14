---
title: "API Contract: Multi-Tenant Vault Resolution"
doc_id: "API-010-MULTI-TENANT-VAULT-RESOLUTION-CONTRACT"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-15"
owner: "Boss (CEO)"
source_of_truth: true
related_docs:
  - "docs/adr/ADR-028-Multi-Tenant-Principal-Scoped-Vault-Binding.md"
  - "docs/change-control/change-requests/CR-2026-08-15-Multi-Tenant-Principal-Scoped-Vault-Binding.md"
  - "docs/api/API-009-Persistent-Memory-Contract.md"
  - "schemas/Vault_Registry_Schema.json"
  - "schemas/Workspace_Vault_Bindings_Schema.json"
---

# API Contract: Multi-Tenant Vault Resolution

## 1. Purpose

Define the additive MSP runtime contract used to resolve the current
principal's authorized vault set in a multi-tenant application. This contract
extends the persistent-memory boundary documented in API-009 without changing
the canonical Shared / Workspace Private / Global Private taxonomy.

The application identity/policy layer authenticates the principal and supplies
current authorization facts. MSP remains Vault Registry authority and performs
the binding/resolution decision.

## 2. Tool

```text
msp_vault_resolve(input)
```

The tool is exposed by `packages/msp-runtime` over the existing newline-
delimited JSON-RPC 2.0 stdio transport. `method` is `msp_vault_resolve` and
`params` is the request body below.

## 3. Request

Canonical wire shape:

```ts
type MemoryAccessContext = {
  tenant_id: string;
  business_id?: string | null;
  principal_id: string;
  agent_id: string;
  instance_id?: string | null;
  project_id: string;
  workspace_id: string;
  thread_id?: string | null;
  session_id?: string | null;
  policy_version?: string | number;
};

type VaultAuthorizationFacts = {
  membership_active: boolean;
  allowed?: boolean;
  allow_global_private?: boolean;
  allow_tenant_global_private?: boolean;
  allow_shared?: boolean;
  read?: boolean;
  write_private?: boolean;
  write_shared?: boolean;
};

type VaultResolveRequest = {
  actor: string;
  access_context: MemoryAccessContext;
  authorization: VaultAuthorizationFacts;
};
```

The implementation also accepts camelCase field aliases at this boundary for
integration convenience, but snake_case is the canonical wire representation.

### Required identity fields

`tenant_id`, `principal_id`, `agent_id`, `project_id`, and `workspace_id` are
required for multi-tenant resolution. `business_id` is optional.

`principal_id` and `agent_id` are different identity classes. Supplying the
same identifier for both is rejected as `invalid_request`.

### Provenance-only fields

`thread_id`, `session_id`, and `instance_id` are retained for audit/provenance.
They do not participate in deterministic vault ownership IDs and cannot grant
access by themselves.

## 4. Response

```ts
type ResolvedVaultSet = {
  workspacePrivateVaultId: string;
  globalPrivateVaultIds: string[];
  sharedVaultIds: string[];
  permissions: {
    read: boolean;
    writePrivate: boolean;
    writeShared: boolean;
    policyVersion: string;
  };
};
```

### Workspace Private

In multi-tenant mode the binding identity is conceptually:

```text
Tenant × Principal × Agent × Workspace
```

Changing `principal_id` while keeping the thread, agent, project, and workspace
constant must change `workspacePrivateVaultId`.

### Global Private

The result may contain both of these existing Global Private binding forms when
current policy permits:

```text
Tenant × Principal × Agent
Tenant × Agent
```

They remain Global Private vaults; this contract does not create another vault
tier.

### Shared

Shared vaults may be project-, tenant-, or business-scoped. A Shared vault is
never principal-owned. `writeShared=true` only reports the permission fact
supplied by the application policy layer; it does not bypass the separate
canonical knowledge/GKS governance path.

## 5. Authorization Semantics

Resolution is fail-closed.

- `membership_active` MUST be explicitly `true`.
- Omitted `membership_active` is denied.
- `allowed=false` is denied.
- A tenant mismatch is denied even if `agent_id` matches.
- A principal mismatch is denied for principal-scoped private vaults.
- Existing mount records cannot widen tenant/principal binding scope.
- Revocation is evaluated on every call; a previously allowed turn does not
  authorize the next turn.

The runtime does not cache authorization facts or an allow decision across
turns.

## 6. Errors

The existing MSP typed error envelope applies.

| `data.code` | Condition |
|---|---|
| `invalid_request` | Required scope field is missing, or principal/agent identity is collapsed |
| `vault_scope_denied` | Membership/policy is not currently authorized, or requested vault scope is outside the caller's current identity |
| `not_found` | A separately addressed vault ID does not exist on a vault operation that accepts a caller-supplied ID |
| `db_unavailable` | Runtime storage/migration startup guard fails |

A denial must not fall back to a broader vault set.

## 7. Backward Compatibility

This tool is additive. Existing single-user/single-tenant callers may continue
using the legacy vault status/register/mount contracts and their existing
deterministic vault IDs.

When the new tenant/principal dimensions are absent from legacy binding
creation, `packages/govibe-core/src/vaults.mjs` preserves the previous ID
formula. Multi-tenant scoped IDs are only minted when the new dimensions are
provided.

Storage migration `0007_principal_scoped_vaults.sql` adds nullable scope
columns and indexes; it does not rewrite existing vault records or edit prior
migration files.

## 8. Security / Conformance Cases

The implementation is expected to prove at least:

1. Same group thread + same agent/workspace + different principals resolve
   different Workspace Private vault IDs.
2. Global Private IDs from tenant A are inaccessible from tenant B.
3. A membership allowed on turn N and revoked before turn N+1 is denied on
   turn N+1.
4. Changing thread/session without changing the authorized actor scope does
   not change vault ownership IDs.
5. Missing membership facts fail closed.
6. Legacy deterministic IDs remain stable when tenant/principal dimensions are
   absent.

## Changelog

- **0.1.0+draft — 2026-08-15:** Added multi-tenant principal-scoped vault
  resolution contract and fail-closed per-turn authorization semantics for
  Issue #136.
