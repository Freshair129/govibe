---
doc_id: "ADR-028-MULTI-TENANT-PRINCIPAL-SCOPED-VAULT-BINDING"
title: "ADR-028: Multi-Tenant Principal-Scoped Vault Binding"
status: "proposed"
version: "0.1.0+draft"
updated: "2026-08-15"
owner: "Boss (CEO)"
source_of_truth: true
type: adr
amends: ["ADR-022"]
related_adrs: ["ADR-020", "ADR-022", "ADR-023", "ADR-027"]
related_docs:
  - "docs/change-control/change-requests/CR-2026-08-15-Multi-Tenant-Principal-Scoped-Vault-Binding.md"
  - "docs/api/API-010-Multi-Tenant-Vault-Resolution-Contract.md"
  - "schemas/Vault_Registry_Schema.json"
  - "schemas/Workspace_Vault_Bindings_Schema.json"
---

# ADR-028: Multi-Tenant Principal-Scoped Vault Binding

## Status

**Proposed.** Issue #136 requires the existing vault architecture to operate
safely when multiple human principals share the same application, agent, group
thread, workspace, or tenant. This ADR records the implementation decision; it
does not claim owner approval beyond the authorization already attached to the
issue/work branch.

## Context

The existing model correctly separates Shared, Workspace Private, and Global
Private memory, but its legacy deterministic binding keys were designed for a
single-user/single-tenant operating mode:

- Workspace Private could be derived from agent/workspace identity without a
  human principal dimension.
- Global Private could be derived from agent identity without a tenant
  dimension.

Those keys are insufficient in a SaaS or group-chat environment. Two people
may legitimately invoke the same software agent inside the same workspace and
thread. Treating thread, session, or agent identity as a human identity would
make one person's private memory reachable from another person's turn.

The correct fix is not a fourth memory tier. It is a stronger binding and
authorization contract around the existing three tiers.

## Decision

### 1. Preserve the canonical three-vault taxonomy

GoVibe/MSP continues to expose exactly these semantic tiers:

1. **Shared Vault** — project/business knowledge.
2. **Workspace Private Vault** — private episodic/workspace memory.
3. **Global Private Vault** — durable private memory across workspaces.

The SQLite runtime keeps its historical internal storage labels
`shared`, `workspace_private`, and `global_private` for compatibility. Public
schemas continue to express the same model as `vault_type=shared|private` plus
`vault_level=project|workspace|global`. No `MemorySpace` or fourth vault type
is introduced.

### 2. Add authorization dimensions to vault bindings

The canonical optional scope dimensions are:

```text
tenant_id
business_id
principal_id
agent_id
project_id
workspace_id
visibility
policy_version
```

`principal_id` is the authenticated human/application principal. `agent_id` is
the software-agent identity. They are independent namespaces and MUST NOT be
substituted for one another.

### 3. Workspace Private is principal-scoped in multi-tenant mode

The conceptual identity is:

```text
Tenant × Principal × Agent × Workspace
```

Two principals in the same thread, using the same agent and workspace, must
resolve to different Workspace Private vault IDs.

### 4. Global Private supports tenant-agent and principal-agent scope

Global Private remains the same semantic tier. Its binding may be:

```text
Tenant × Agent
Tenant × Principal × Agent
```

The resolver may return both when policy permits. A Global Private vault in one
tenant is never authorized merely because the same `agent_id` exists in
another tenant.

### 5. Shared knowledge is never principal-owned

Shared bindings may be project-, tenant-, or business-scoped. A Shared vault
cannot carry a principal owner. Read/write authority for canonical shared
knowledge remains distinct from private-memory authority and does not transfer
GKS authority into MSP.

### 6. Identity/Policy supplies facts; MSP resolves and enforces

The application identity/policy layer supplies the current authenticated
context and current authorization facts. MSP owns the Vault Registry and maps
those facts into the authorized vault set.

The runtime contract is:

```text
MemoryAccessContext
+ current authorization facts
          │
          ▼
    msp_vault_resolve
          │
          ▼
ResolvedVaultSet {
  workspacePrivateVaultId
  globalPrivateVaultIds[]
  sharedVaultIds[]
  permissions
}
```

Membership must be explicitly active. Omitted membership is denied rather than
interpreted as permission.

### 7. Authorization is evaluated per turn

MSP does not cache a user's authorization decision across turns. If membership
or policy is revoked, the next `msp_vault_resolve` call must deny access.
Existing mount records never widen tenant/principal scope.

### 8. Conversation identifiers are provenance, not owners

`thread_id`, `session_id`, `instance_id`, and event identifiers may be written
to audit/provenance records, but they do not participate in deterministic
private-vault ownership IDs. A group thread identifies a conversation, not a
person.

## Consequences

Positive consequences:

- group-chat users cannot collide on the same Workspace Private binding;
- Global Private no longer crosses tenant boundaries by agent ID alone;
- existing three-vault semantics stay intact;
- existing single-user/single-tenant deterministic IDs remain stable when the
  new dimensions are absent;
- permission revocation is reflected on the next resolution call.

Costs/tradeoffs:

- callers opting into multi-tenant resolution must carry a verified
  `tenant_id`, `principal_id`, `agent_id`, `project_id`, and `workspace_id`;
- policy/membership state must be available on every resolver invocation;
- the vault registry gains additive scope columns and indexes;
- integrations such as Zuri must consume this contract rather than inventing
  their own vault semantics.

## Migration and Compatibility

Migration `0007_principal_scoped_vaults.sql` adds nullable scope columns and
indexes. Existing records require no rewrite. The legacy deterministic ID
formula remains unchanged whenever tenant/principal dimensions are absent.

New multi-tenant callers mint scoped IDs only after providing the additional
identity dimensions. Old migrations are not edited, preserving the runtime's
migration checksum guard.

## Rejected Alternatives

### Add a fourth user-private vault tier

Rejected. The problem is ownership and authorization, not missing memory
semantics. A fourth tier would duplicate Workspace/Global Private behavior and
make migration and policy reasoning harder.

### Use thread/session as the private owner

Rejected. Threads and sessions are many-to-many conversation/lifecycle
containers and are not stable human identities.

### Treat `principal_id` as `agent_id`

Rejected. A human principal and software agent have different lifecycles and
permissions. Collapsing them recreates the isolation bug under a different
field name.

### Cache an authorized vault set for the conversation

Rejected. Membership and permissions can change during a conversation. Cached
allow decisions would make revocation stale.

## Changelog

- **0.1.0+draft — 2026-08-15:** Proposed principal-scoped multi-tenant binding,
  per-turn authorization resolution, additive migration, and compatibility
  rules for Issue #136.
