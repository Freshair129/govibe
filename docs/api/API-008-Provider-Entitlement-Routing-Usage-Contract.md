---
doc_id: "API-008-PROVIDER-ENTITLEMENT-ROUTING-USAGE-CONTRACT"
title: "API-008: Provider Entitlement, Routing and Usage Contract"
status: "draft"
version: "0.6.0+draft"
updated: "2026-08-14"
owner: "ARCHON / ATHER"
source_of_truth: true
related_issue: 55
related_adrs: ["ADR-023", "ADR-024"]
---

# API-008: Provider Entitlement, Routing and Usage Contract

## 1. Purpose

Define minimum contracts for provider capability discovery, entitlement ownership, execution planning, governed binding, normalized run results, usage telemetry, affinity, retry and failover.

This API consumes MSP-governed context. It does not define knowledge retrieval, context construction, canonical promotion, or graph authority.

## 2. Contract rules

- Every executable resource is addressed by entitlement ID, not raw credential.
- Every entitlement has an owner and explicit share policy.
- Credential references are opaque and must never enter model context or provider-visible artifact payloads unless the provider protocol itself requires a derived token delivered by the adapter.
- Execution binding occurs only after a valid persisted MSP context packet exists.
- Routers and adapters must not mutate context content, scope, exclusions, source identity, reason chains, or authority state.
- Provider output is candidate state.
- Reported, estimated, unknown, and not-applicable usage values remain distinguishable.
- Adapter dispatch uses the authorized binding `adapter_id`; `provider_id` alone never selects an adapter.
- Failover creates a new binding and preserves context lineage.

### 2.1 Execution-binding identity correlation

`actor_id` is the authoritative requester identity on a governed binding
request. `principal_id` is the exact correlation identity used by adapters,
credential grants, and provider sessions; it is not independently selectable.

Every `govibe-execution-binding/v1` response must contain non-empty
`actor_id`, `principal_id`, `workspace_id`, `task_id`, `agent_id`, `run_id`,
`session_id`, `turn_id`, `context_id`, and `cache_id`. The binding service must
emit equal `actor_id` and `principal_id`. Before dispatch, the adapter must
require that equality and correlate the fields as follows:

- `actor_id` and `principal_id` equal the dispatch request `actor_id`;
- `workspace_id`, `task_id`, `agent_id`, `run_id`, `session_id`, and `turn_id`
  equal the corresponding validated `contextAuthority.identity` values;
- `run_id` also equals the dispatch request `run_id`;
- `session_id` and `turn_id` equal the validated dispatch context lineage; and
- `context_id` and `cache_id` equal `contextAuthority.lineage`.

Any missing, null, empty, unknown, or unsupported `schema` value, or any
missing v1 field or mismatch, must fail closed before provider dispatch.
Schema-less bindings are unsupported and must never fall back to a legacy
interpretation.

## 3. Provider capability descriptor

Schema identifier: `govibe-provider-capability-descriptor/v1`

```yaml
schema: govibe-provider-capability-descriptor/v1
provider_id: string
adapter_id: string
adapter_version: string
executor_classes: [string]
models:
  - model_id: string
    capabilities: [string]
    context_limit_tokens: integer|null
    supports_tools: boolean
    supports_streaming: boolean
    supports_reasoning_control: boolean|null
entitlement_types:
  - personal_subscription
  - business_seat
  - organization_service
  - api
  - local_compute
usage_visibility: detailed|partial|rate-limit-only|unknown
token_usage_reported: boolean
cached_token_usage_reported: boolean
remaining_quota_reported: boolean
rate_limit_detectable: boolean
supports_session_affinity: boolean
supports_prompt_cache_reference: boolean
supports_cancellation: boolean
supports_parallel_runs: boolean
credential_modes: [string]
data_policy_tags: [string]
observed_at: string
```

Capabilities are adapter observations or provider-declared facts. They do not grant authorization.

## 4. Entitlement record

Schema identifier: `govibe-provider-entitlement/v1`

```yaml
schema: govibe-provider-entitlement/v1
entitlement_id: string
version: string
provider_id: string
entitlement_type: personal_subscription|business_seat|organization_service|api|local_compute
owner:
  owner_type: user|team|organization|service
  owner_id: string
share_policy: owner_only|named_principals|workspace_pool|organization_pool
allowed_principals: [string]
allowed_roles: [string]
allowed_workspaces: [string]
allowed_projects: [string]
data_classifications: [string]
residency_policy: [string]
credential_ref: string|null
executor_classes: [string]
model_allowlist: [string]
model_denylist: [string]
concurrency:
  max_active: integer|null
  max_queued: integer|null
session_policy:
  cross_run_reuse: boolean
  cross_user_reuse: boolean
  ttl_seconds: integer|null
quota_policy_ref: string|null
state: active|suspended|revoked|expired
valid_from: string
valid_until: string|null
```

`cross_user_reuse` must default to false and requires explicit provider and organizational authorization when enabled.

## 5. Capability planning request

Schema identifier: `govibe-execution-capability-request/v1`

```yaml
schema: govibe-execution-capability-request/v1
request_id: string
actor_id: string
organization_id: string
workspace_id: string
project_id: string|null
task_id: string
agent_id: string
executor_class: string
required_capabilities: [string]
required_tools: [string]
modalities: [string]
data_classification: string
residency_requirements: [string]
maximum_context_budget_tokens: integer|null
latency_class: interactive|standard|batch|background
risk: string
```

The response lists eligible execution classes and constraints only. It must not include knowledge selections or relation traversal decisions.

## 6. Capability planning response

Schema identifier: `govibe-execution-capability-plan/v1`

```yaml
schema: govibe-execution-capability-plan/v1
request_id: string
eligible_targets:
  - provider_id: string
    adapter_id: string
    credential_mode: none|raw_secret|derived_token|null
    entitlement_id: string
    executor_class: string
    model_candidates: [string]
    maximum_context_tokens: integer|null
    usage_visibility: detailed|partial|rate-limit-only|unknown
    session_affinity_available: boolean
    prompt_cache_reference_available: boolean
    policy_refs: [string]
rejected_targets:
  - provider_id: string
    entitlement_id: string|null
    reason_code: string
constraints_for_msp:
  maximum_context_budget_tokens: integer|null
  required_rendering_contracts: [string]
  prohibited_provider_features: [string]
created_at: string
```

`constraints_for_msp` is advisory input to context resolution. It does not authorize the router to alter context.

## 7. Governed execution binding request

Schema identifier: `govibe-execution-binding-request/v1`

```yaml
schema: govibe-execution-binding-request/v1
binding_request_id: string
actor_id: string
organization_id: string
workspace_id: string
project_id: string|null
task_id: string
agent_id: string
run_id: string
session_id: string
turn_id: string
context:
  context_id: string
  cache_id: string
  context_hash: string
  source_manifest_hash: string
  context_profile: string
  token_count: integer|null
  tool_contract_hash: string
required_capabilities: [string]
preferred_targets:
  - provider_id: string
    entitlement_id: string|null
    model_id: string|null
affinity:
  affinity_key: string|null
  previous_binding_id: string|null
  provider_session_id: string|null
fallback_policy_id: string|null
risk: string
```

The context packet must already be persisted and valid under API-007/API-006 before this request is accepted.

## 8. Governed execution binding response

Schema identifier: `govibe-execution-binding/v1`

```yaml
schema: govibe-execution-binding/v1
binding_id: string
binding_request_id: string
actor_id: string
principal_id: string
workspace_id: string
task_id: string
agent_id: string
run_id: string
session_id: string
turn_id: string
context_id: string
cache_id: string
context_hash: string
provider_id: string
adapter_id: string
adapter_version: string
entitlement_id: string
credential_ref: string|null
credential_mode: none|raw_secret|derived_token|null
executor_class: string
model_id: string
resolved_tools: [string]
provider_session_id: string|null
provider_prompt_cache_ref: string|null
affinity_key: string|null
quota_snapshot_ref: string|null
fallback_policy_id: string|null
policy_decision_refs: [string]
authorized_at: string
expires_at: string|null
```

`credential_ref` remains an opaque vault reference and is not sent to the
adapter. The binding's `credential_mode` is authoritative:

- `none` means the run has no credential grant;
- `raw_secret` is the legacy protected vault-to-adapter byte channel and is not
  evidence of a derived-token handoff;
- `derived_token` requires an adapter-owned derivation callback. Raw bytes may
  exist only inside that protected callback; `execute` receives the frozen
  `govibe-credential-handoff/v1` object instead;
- `null` preserves the pre-mode compatibility path and must not be treated as
  proof of any credential mode.

Mode substitution, a missing grant, a missing deriver, unsupported adapter
mode, invalid handoff, or exact raw-secret reuse fails closed before provider
invocation. GoVibe does not define a provider-neutral token derivation
algorithm. A capability descriptor advertising an unsupported or ambiguous
credential mode is rejected during planning rather than downgraded to the
legacy path.

### 8.1 Derived credential handoff

Schema identifier: `govibe-credential-handoff/v1`

```yaml
schema: govibe-credential-handoff/v1
mode: derived_token
provider_id: string
adapter_id: string
binding_id: string
token_type: string
token: string
```

The handoff is a protected in-process adapter channel. It must not enter the
safe request, MSP context, candidate output, usage ledger, logs, or errors.

### 8.2 Credential storage and lifecycle

Credential backends are host-owned implementation details behind the opaque
`credential_ref`. A backend used for provider credentials must encrypt secret
bytes before storing them and must return a fresh, caller-wipeable byte buffer
only inside the protected vault callback. The repository's provider-neutral
encrypted fixture uses AES-256-GCM with a host-supplied 32-byte key, a fresh
nonce per write, and an authentication tag. Its inspection surface exposes
metadata only.

`createInMemorySecretBackend` remains a compatibility/test fixture and is not
production-at-rest evidence. The encrypted fixture is process-local; durable
key management, restart persistence, backup deletion, and provider-side
revocation remain outside this contract slice.

Every credential starts at generation `1`. A run-scoped grant captures the
credential generation at issuance. Rotation replaces the protected record and
increments the generation; a grant from an older generation fails closed before
adapter invocation. Revocation invalidates active grants, increments the
generation, and purges the protected record. A new grant is required after
rotation or revocation.

## 9. Provider run result

Schema identifier: `govibe-provider-run-result/v1`

```yaml
schema: govibe-provider-run-result/v1
run_result_id: string
binding_id: string
provider_request_id: string|null
provider_session_id: string|null
status: completed|failed|rate_limited|cancelled|timed_out
started_at: string
completed_at: string|null
candidate:
  schema: govibe-provider-candidate/v1
  provider_id: string
  provider_version: string|null
  request_id: string
  source_manifest: []
  requested_scope: {}
  assumptions: []
  artifacts: []
  relation_candidates: []
  verification_hints: []
provider_usage: {}
normalized_errors: []
retryable: boolean
```

The candidate must not contain trusted self-assigned canonical `gks:` identities.

## 10. Usage event

Schema identifier: `govibe-entitlement-usage-event/v1`

```yaml
schema: govibe-entitlement-usage-event/v1
event_id: string
organization_id: string
user_id: string
workspace_id: string
project_id: string|null
task_id: string
run_id: string
binding_id: string
provider_id: string
entitlement_id: string
entitlement_type: string
model_id: string
reported_usage:
  unit: request|credit|token|second|unknown
  input_tokens: integer|null
  cached_input_tokens: integer|null
  output_tokens: integer|null
  reasoning_tokens: integer|null
  provider_credits: number|null
  request_count: integer|null
estimated_usage:
  method: string|null
  input_tokens: integer|null
  output_tokens: integer|null
  compute_weight: number|null
  confidence: number|null
unknown_fields: [string]
not_applicable_fields: [string]
affinity:
  session_affinity_used: boolean
  prompt_cache_ref_used: boolean
  verified_result_cache_hit: boolean
routing:
  attempt: integer
  fallback_used: boolean
  previous_binding_id: string|null
outcome:
  status: completed|failed|rate_limited|cancelled|timed_out
  duration_ms: integer|null
recorded_at: string
```

A field must remain null or appear in `unknown_fields` when the provider does not expose it. A field may appear in `not_applicable_fields` only when the entitlement semantics make it inapplicable, and its `reported_usage` value must be null. The two classification lists must be disjoint and may name only fields in `reported_usage`. GoVibe estimates must not populate `reported_usage`.

## 11. Quota snapshot

Schema identifier: `govibe-entitlement-quota-snapshot/v1`

```yaml
schema: govibe-entitlement-quota-snapshot/v1
quota_snapshot_id: string
entitlement_id: string
provider_id: string
visibility: detailed|partial|rate-limit-only|unknown
reported:
  remaining: number|null
  unit: request|credit|token|second|unknown
  resets_at: string|null
observed_rate_limit:
  limited: boolean
  retry_after_seconds: integer|null
estimated:
  capacity_score: number|null
  confidence: number|null
source: provider|adapter|scheduler|unknown
observed_at: string
```

A scheduler capacity score is an internal operational estimate and is not a provider quota claim.

## 12. Retry and failover request

Schema identifier: `govibe-execution-rebind-request/v1`

```yaml
schema: govibe-execution-rebind-request/v1
rebind_request_id: string
previous_binding_id: string
context_id: string
context_hash: string
failure_code: string
fallback_policy_id: string
required_capabilities: [string]
exclude_targets: [string]
```

A successful rebind must create a new binding ID, preserve context ID/hash, and re-evaluate authorization. A context change requires a new MSP context lineage, not a rebind.

## 13. Failure codes

Minimum normalized failure codes:

- `NO_AUTHORIZED_ENTITLEMENT`
- `ENTITLEMENT_REVOKED`
- `CREDENTIAL_UNAVAILABLE`
- `REQUIRED_CAPABILITY_UNAVAILABLE`
- `CONTEXT_BUDGET_UNSATISFIED`
- `TOOL_CONTRACT_INCOMPATIBLE`
- `DATA_POLICY_INCOMPATIBLE`
- `PROVIDER_RATE_LIMITED`
- `PROVIDER_UNAVAILABLE`
- `SESSION_AFFINITY_UNAVAILABLE`
- `USAGE_SEMANTICS_UNKNOWN`
- `USAGE_CLASSIFICATION_CONFLICT`
- `CONTEXT_INTEGRITY_FAILED`
- `BINDING_EXPIRED`
- `CREDENTIAL_MODE_INVALID`
- `CREDENTIAL_MODE_UNSUPPORTED`
- `CREDENTIAL_GRANT_REQUIRED`
- `CREDENTIAL_MODE_GRANT_MISMATCH`
- `CREDENTIAL_DERIVER_REQUIRED`
- `CREDENTIAL_HANDOFF_INVALID`
- `CREDENTIAL_DERIVATION_RAW_SECRET_REUSED`
- `CREDENTIAL_GENERATION_MISMATCH`
- `CREDENTIAL_BACKEND_ROTATION_UNSUPPORTED`
- `CREDENTIAL_BACKEND_KEY_INVALID`

## 14. Prohibited behavior

- raw credential routing;
- generic or router-owned credential-token derivation;
- anonymous cross-user session reuse;
- router-side context trimming;
- treating a request count as an exact token quantity;
- assuming provider cache behavior reduces subscription quota;
- silently downgrading tools, model capability, privacy, residency, or context semantics;
- provider adapter direct access to GKS or GenesisBlockDB;
- canonical promotion from a run-result handler.

## 15. Compatibility

This contract extends:

- API-004 Task-Scoped Context Packet Schema;
- API-005 GoVibe Capability Contracts;
- API-006 Vault Context and Replay Contracts;
- API-007 Knowledge and Context Authority Contract.

Where execution-resource behavior conflicts with context authority, API-007 and ADR-023 govern context, and ADR-024/API-008 govern resource binding.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.6.0+draft | 2026-08-14 | ATHER | Added the provider-neutral encrypted credential-backend and generation/rotation boundary; durable key management and live provider revocation remain unevidenced. |
| 0.5.0+draft | 2026-08-14 | ATHER | Added explicit credential handoff modes and the provider-neutral `govibe-credential-handoff/v1` boundary; repository fixtures prove derived-token fail-closed behavior without claiming a real provider. |
| 0.4.0+draft | 2026-08-14 | ATHER | Added binding adapter selection to the capability-plan contract and added explicit `not_applicable_fields` classification to usage events; both remain additive v1 contract fields. |
| 0.3.0+draft | 2026-08-03 | ATHER | Removed the schema-absent principal-only compatibility path under authorized WP-11; all execution bindings now require complete `govibe-execution-binding/v1` before adapter dispatch. API lifecycle remains draft. |
| 0.2.1+draft | 2026-08-03 | ARCHON / ATHER | Made the v1 actor/principal and workspace/task/agent/run/session/turn/context/cache correlation tuple mandatory and fail closed; bounded legacy compatibility to an absent-schema principal-only runtime binding. |
| 0.2.0+draft | 2026-08-03 | ARCHON / ATHER | Defined D-01 actor/principal correlation: binding-service output carries equal `actor_id` and `principal_id`; adapters fail closed on a supplied mismatch while retaining the bounded legacy single-principal compatibility path. |
| 0.1.0+draft | 2026-08-02 | ARCHON / ATHER | Initial draft provider-entitlement, routing, usage, affinity, and failover contract. |
