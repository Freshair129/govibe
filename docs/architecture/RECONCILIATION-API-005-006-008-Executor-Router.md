---
title: "Reconciliation: API-005, API-006, API-008 and Executor Router"
doc_id: "RECONCILIATION-API-005-006-008-EXECUTOR-ROUTER"
status: "draft"
version: "0.2.0+draft"
updated: "2026-08-14"
owner: "ARCHON / ATHER"
source_of_truth: true
related_issue: 70
related_docs:
  - "docs/api/API-005-GoVibe-Capability-Contracts.md"
  - "docs/api/API-006-Vault-Context-and-Replay-Contracts.md"
  - "docs/api/API-008-Provider-Entitlement-Routing-Usage-Contract.md"
  - "docs/adr/ADR-023-Knowledge-Authority-Context-Authority-Boundary.md"
  - "docs/adr/ADR-024-Provider-Entitlement-Execution-Authority-Boundary.md"
---

# Reconciliation: API-005, API-006, API-008 and Executor Router

## 1. Decision summary

The three APIs govern different authority domains and must remain separate:

| Contract | Canonical authority | Owns | Does not own |
|---|---|---|---|
| API-005 | GoVibe capability surface | Public MCP commands, capability names, workspace/runtime entry points | Context construction, credentials, quota allocation |
| API-006 | MSP context and replay authority | Persisted context packet, cache identity, source/context hashes, injection and replay lineage | Provider selection, entitlement authorization, credential grants |
| API-008 | GoVibe entitlement runtime | Execution-resource eligibility, binding, credential reference, adapter/model selection, usage and rebind lineage | Knowledge retrieval, context mutation, canonical promotion |

No API supersedes another. API-008 consumes API-006 output through an immutable execution-binding request.

## 2. Canonical runtime sequence

```text
Executor / Agent
  -> API-005 GoVibe command/capability request
  -> MSP context resolution under API-006/API-007
  -> persisted context cache + injection lineage
  -> API-008 capability planning
  -> API-008 execution binding
  -> protected credential grant
  -> provider adapter execute
  -> provider candidate result
  -> usage event / quota observation
  -> MSP-authorized promotion when applicable
```

The executor router must not call a provider adapter before a valid API-008 binding exists.

## 3. Identity and lineage ownership

### 3.1 Context lineage — API-006

The following fields remain owned by MSP/context contracts:

- `contextId`
- `cacheId`
- `kvId`
- `parentContextId`
- `sourceManifestHash`
- `contextHash`
- `contextProfile`
- injection/replay records

These values describe what context was assembled, persisted and injected. The entitlement runtime may validate and reference them but may not issue, rewrite or substitute them.

### 3.2 Execution lineage — API-008

The following fields are separate execution-resource lineage:

- `binding_request_id`
- `binding_id`
- `provider_id`
- `adapter_id` and version
- `entitlement_id`
- `model_id`
- `provider_session_id`
- `provider_prompt_cache_ref`
- `quota_snapshot_ref`
- `previous_binding_id`
- policy-decision references

A rebind creates a new `binding_id`. It must preserve the API-006 context identity and hashes. Any context change requires a new MSP context lineage rather than an execution rebind.

## 4. Capability terminology

API-005 capability names represent GoVibe product/runtime operations. API-008 provider capabilities represent execution-target properties.

They must not share one ambiguous `capabilities` namespace.

Use:

- `govibe_capability_id` for API-005 commands and platform operations;
- `provider_capability_id` for model/adapter execution properties;
- `required_provider_capabilities` in execution planning/binding requests;
- `resolved_provider_capabilities` in execution bindings.

Provider capability descriptors never grant entitlement authorization.

## 5. Credential and session serialization boundary

`credential_ref`, credential grants and provider-session handles are API-008 runtime-private fields.

They must not appear in:

- API-006 context caches or injection records;
- MSP request/response content packets;
- model-visible context;
- provider candidate artifacts;
- user-visible traces;
- usage payloads except opaque entitlement/binding identifiers.

The binding object may contain an opaque `credential_ref` in protected process memory. Public inspection surfaces must return a redacted binding projection without that field.

## 6. Current executor-router gap

`packages/govibe-core/src/executor-adapter.mjs` now performs:

```text
provider string lookup
-> context authority check
-> API-008 binding validation (schema, actor/principal, provider, scope fields)
-> provider session assertion
-> run-scoped credential grant
-> adapter.execute(safeRequest)
```

`packages/govibe-core/src/provider-adapter-host.mjs` wraps that path with the
adapter enablement gate and result normalization added under issue #63.

Measured against the section 7 target contract:

| Target step | State | Owner |
|---|---|---|
| verify binding schema/version | present | #60 |
| verify binding run/session/turn identity | present | #60 |
| verify API-006 context IDs and hashes | present | #60 |
| recheck binding lifecycle (authenticity, expiry, revocation) | present: dispatch verifies the binding against its issuing service, fail-closed | #59 |
| recheck entitlement lifecycle and compatibility policy | **absent at dispatch**: eligibility is evaluated during planning; an entitlement revoked after its binding was issued is not caught while the binding remains live | #59, #64 |
| acquire run-scoped credential grant | present | #59 |
| invoke adapter selected by `binding.adapter_id` | present: the executor resolves the exact bound adapter, verifies its provider and compatibility proof, and fails closed when it is missing or mismatched | #111 |
| normalize provider result | present | #63 |
| revoke/expire grant | present | #59 |
| emit usage event | **not wired**: the ledger exists but no dispatch path writes to it | #61, #64 |

The remaining path is still a compatibility seam, not the target architecture, and
no row above is a runtime conformance claim before issue #64.

## 7. Target executor-router contract

The target dispatch path is:

```text
execute(binding, request)
  -> verify binding schema/version
  -> verify binding run/session/turn identity
  -> verify API-006 context IDs and hashes match request authority
  -> recheck entitlement lifecycle and compatibility policy
  -> acquire run-scoped credential grant
  -> invoke adapter selected by binding.adapter_id
  -> normalize provider result
  -> revoke/expire grant
  -> emit usage event
```

The adapter must not select another entitlement, model or context. It may reject unsupported provider behavior but may not widen the binding.

## 8. Compatibility migration

### Phase A — additive binding gate

Add `createBoundExecutorRegistry` or equivalent internal service while retaining the existing public registry facade.

The legacy call:

```js
registry.execute(provider, request)
```

must become a compatibility wrapper that either:

1. receives a prevalidated `executionBinding`; or
2. fails closed with `EXECUTION_BINDING_REQUIRED`.

It must not synthesize an entitlement from the provider string.

### Phase B — caller migration

Migrate every caller to:

1. resolve/persist API-006 context;
2. request an API-008 binding;
3. dispatch using the binding.

### Phase C — remove provider-string authorization

After all callers migrate, provider string lookup remains only inside the adapter registry using `binding.adapter_id`. Direct provider-selected dispatch is deprecated and removed.

## 9. Failure-code ownership

| Failure class | Owner | Examples |
|---|---|---|
| Invalid/missing context authority | API-006/API-007 | `CONTEXT_AUTHORITY_REQUIRED`, `CONTEXT_INTEGRITY_FAILED`, lineage mismatch |
| No eligible execution resource | API-008 planning | `NO_AUTHORIZED_ENTITLEMENT`, `CAPABILITY_UNSATISFIED` |
| Binding failure | API-008 binding | `EXECUTION_BINDING_REQUIRED`, `BINDING_EXPIRED`, `TOOL_CONTRACT_INCOMPATIBLE` |
| Credential/session denial | Credential Vault / API-008 | `CREDENTIAL_REVOKED`, `CREDENTIAL_GRANT_DENIED`, `SESSION_SCOPE_VIOLATION` |
| Provider operational failure | Adapter | `PROVIDER_UNAVAILABLE`, `RATE_LIMITED`, `TIMED_OUT`, `CANCELLED` |
| Promotion/evidence denial | MSP | candidate rejection and promotion-policy failures |

Adapters must not return authorization failures as generic provider unavailability.

## 10. Cache semantics

The following identities are distinct:

- API-006 `cacheId`: exact persisted context packet;
- API-006 `kvId`: runtime-verified model KV derived from that packet;
- API-008 `provider_prompt_cache_ref`: provider-specific prompt-cache handle;
- API-008 `provider_session_id`: provider conversation/session affinity;
- verified result-cache identity: deterministic GoVibe output cache, if implemented.

Provider session/cache handles are execution optimizations. They cannot prove memory validity or replace context/source hashes.

## 11. Deprecations

The following behavior is deprecated immediately:

- treating provider ID as authorization;
- invoking `adapter.execute` without a governed execution binding;
- placing credential/session fields in context packets;
- allowing adapters to choose context, entitlement or fallback target;
- using provider session identity as replay or memory identity;
- merging reported and estimated usage.

## 12. Implementation mapping

| Issue | Required outcome |
|---|---|
| #59 | Credential Vault, run-scoped grants, revocation and session isolation |
| #60 | Capability planning and governed execution binding service |
| #61 | Usage events and quota snapshots |
| #111 | Binding-only adapter dispatch and normalized results |
| #62 | Rebind/failover after authorization-first filtering |
| #64 | End-to-end proof across API-005 → API-006 → API-008 → adapter |

## 13. Acceptance verification

- No duplicate authority owner remains among API-005, API-006 and API-008.
- Context lineage and execution lineage are separate and linked by immutable IDs/hashes.
- Existing executor calls have a fail-closed migration path.
- Credential and provider-session fields have an explicit serialization boundary.
- Failure codes have one owning layer.
- Provider-string dispatch is marked deprecated and cannot silently create authorization; exact adapter selection comes from `binding.adapter_id`.
- Runtime implementation remains gated by #59, #60, #61, #63, #62 and final #64.
