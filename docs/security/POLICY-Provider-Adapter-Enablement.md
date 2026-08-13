---
title: "Provider Adapter Enablement Policy"
doc_id: "POLICY-PROVIDER-ADAPTER-ENABLEMENT"
version: "0.2.0+draft"
status: draft
updated: "2026-08-14"
owner: "Boss / ATHER"
source_of_truth: true
related_issues:
  - 55
  - 59
  - 61
  - 63
  - 64
related_docs:
  - "docs/adr/ADR-024-Provider-Entitlement-Execution-Authority-Boundary.md"
  - "docs/api/API-008-Provider-Entitlement-Routing-Usage-Contract.md"
  - "docs/assurance/security/THREAT-MODEL-Provider-Entitlement-Credential-and-Session-Boundary.md"
  - "docs/security/POLICY-Provider-Entitlement-Sharing-Compatibility.md"
  - "docs/security/POLICY-Provider-Entitlement-Usage-Ledger-Redaction-and-Retention.md"
  - "docs/roadmap/BACKLOG-provider-entitlement-runtime.md"
---

# Provider Adapter Enablement Policy

## 1. Purpose and non-claims

`TSK-PER-63` requires that "a provider-specific policy record exists before
enabling an adapter". This document holds those records and states the rule the
adapter host enforces.

This is not a runtime conformance claim and not a deployment authorization. The
adapter host is repository-observable code with unit tests. Issue #64 remains the
only gate that may report the entitlement runtime as implemented. **No record in
section 4 is approved for production dispatch**; the approved fixtures used in
tests exercise the gate, they do not authorize a live provider.

## 2. Canonical rule

An adapter is dispatchable only when **all** of the following hold:

1. an adapter policy record exists for the `provider_id`
   (`ADAPTER_POLICY_MISSING` otherwise);
2. its `approval_state` is `approved`
   (`ADAPTER_POLICY_NOT_APPROVED` otherwise);
3. a provider capability descriptor is registered for the same `provider_id`
   (`PROVIDER_DESCRIPTOR_MISSING` otherwise);
4. a dispatchable adapter implementation is registered
   (`ADAPTER_UNAVAILABLE` otherwise).

The gate is evaluated before invocation. An adapter cannot override it, and an
adapter's own output cannot change it.

## 3. Record schema

Schema identifier: `govibe-provider-adapter-policy/v1`

```yaml
schema: govibe-provider-adapter-policy/v1
provider_id: string
adapter_id: string
adapter_version: string
entitlement_types: [string]
allowed_executor_classes: [string]
approval_state: approved|pending|denied
cross_user_session_reuse: false
policy_ref: string
approved_by: string|null
approved_at: string|null
```

Constraints enforced in code:

- `approval_state: approved` requires both `approved_by` and `approved_at`
  (`ADAPTER_POLICY_INVALID`);
- `cross_user_session_reuse: true` is rejected outright
  (`ADAPTER_POLICY_CROSS_USER_DENIED`). Section 13 of the sharing policy denies
  cross-user provider sessions until a provider-specific review approves them, so
  an adapter record cannot grant that on its own.

## 4. Provider records

| Provider | Adapter | Entitlement types | Approval state | Notes |
|---|---|---|---|---|
| `local` | `adapter-local` | `local_compute` | `pending` | Host-owned compute. Allowed only under host ownership and workspace policy per sharing policy section 13. Awaiting owner approval. |
| `codex` | `adapter-codex` | `personal_subscription` | `pending` | Subscription/CLI-backed. `owner_only` sharing; no pooling; no cross-user session. Awaiting the provider-specific review required by sharing policy section 13. |
| `claude-code` | — | — | absent | No record. Dispatch is blocked by `ADAPTER_POLICY_MISSING`. |
| `crewai` | — | — | absent | No record. Dispatch is blocked by `ADAPTER_POLICY_MISSING`. |

A provider absent from this table is denied by construction: the gate fails
closed on a missing record rather than defaulting to permitted.

## 5. Bounded adapter behavior

Two bounded adapters exist. Neither infers telemetry a provider does not expose.

| Adapter | Unit reported | Deliberately absent |
|---|---|---|
| local compute | `second`, plus `request_count: 1` and measured duration | token counts, cached tokens, provider credits, remaining quota |
| subscription CLI | `request`, `request_count: 1` | token counts, cached tokens, provider credits, remaining quota |

A subscription surface bills requests. Token counts are not exposed there, so
they stay absent rather than being derived from a request count — this is the
API-008 section 14 prohibition on treating a request count as an exact token
quantity.

Usage extraction is additionally gated by the capability descriptor: a field is
read from adapter output only when the descriptor declares that the provider
reports it. An adapter therefore cannot widen a provider's declared telemetry by
returning more fields.

### 5.1 Credential handoff modes

Credential handling is explicit and remains adapter-owned:

- `none` is used for host-owned execution with no credential grant;
- `raw_secret` is the compatibility path where the vault gives protected bytes
  to the adapter runtime;
- `derived_token` requires an adapter `deriveCredential` callback. The callback
  is the only fixture boundary that may see raw bytes, and `execute` receives
  only `govibe-credential-handoff/v1` with the bound provider, adapter and
  binding IDs.

The router and GoVibe core do not select an OAuth/JWT/provider derivation
algorithm. Unsupported modes, missing grants, missing derivers, invalid
handoffs and exact raw-secret reuse fail closed before adapter invocation. The
current implementation and tests are provider-neutral fixtures; they do not
prove a live provider handoff.

## 6. Candidate boundary

Adapter output is a **candidate**, never canonical knowledge:

- output is normalized to `govibe-provider-candidate/v1`;
- an identifier beginning with `gks:` anywhere in candidate output is rejected
  (`PROVIDER_CANDIDATE_CANONICAL_IDENTITY`), because it would be a self-assigned
  canonical claim;
- a candidate declaring a different `provider_id` than the dispatched provider is
  rejected (`PROVIDER_CANDIDATE_PROVIDER_MISMATCH`);
- credential-shaped keys in adapter output are rejected
  (`PROVIDER_RESULT_CREDENTIAL_MATERIAL`);
- every candidate collection defaults to empty rather than absent.

The adapter modules import no GKS client, no MSP client, and no canonical
materialization path, and the host exposes no promotion surface. A test asserts
both.

## 7. Terminal state normalization

Any adapter failure resolves to exactly one contract terminal state:

| Failure code | Status | Retryable |
|---|---|---|
| `PROVIDER_RATE_LIMITED` | `rate_limited` | yes |
| `PROVIDER_TIMED_OUT` | `timed_out` | yes |
| `PROVIDER_UNAVAILABLE` | `failed` | yes |
| `SESSION_AFFINITY_UNAVAILABLE` | `failed` | yes |
| `CREDENTIAL_UNAVAILABLE` | `failed` | no |
| `PROVIDER_CANCELLED` | `cancelled` | no |
| unrecognized | `failed` as `PROVIDER_REJECTED` | **no** |

An unrecognized failure is never guessed as retryable. A governance rejection —
denied policy decision, binding scope mismatch, revoked credential — is **not** a
provider terminal state and surfaces to the caller instead of being normalized
into a run result.

## 8. Required tests

Mapped from section 14 of the sharing policy, for the part owned by issue #63:

- a missing or unapproved adapter record fails closed;
- a missing capability descriptor fails closed;
- an adapter cannot override the enablement decision;
- provider-reported and estimated quota fields remain separate;
- unsupported usage and cache fields remain unknown;
- rate-limit, timeout, unavailable and cancellation states normalize;
- derived-token mode never passes raw secret bytes to `execute`, rejects raw
  secret reuse, and rejects a caller mode substitution;
- no GKS or GenesisBlockDB path exists from an adapter.

Items owned by issue #59 and #64 — expired compatibility records, product/plan
surface mismatch, owner-only cross-user authorization, workspace crossing,
revocation before invocation — are **not** covered here and remain open.

## 9. Completion gate

This policy is satisfied for repository scope when the tests in section 8 pass on
`main`. Moving any record in section 4 to `approved` requires the
provider-specific review named in sharing policy section 13, an owner decision,
and the #64 evidence package.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0+draft | 2026-08-14 | ATHER | Added explicit `none`/`raw_secret`/`derived_token` handoff rules and mapped the repository fixture evidence; provider records remain pending and no live-provider claim is made. |
| 0.1.0+draft | 2026-08-04 | ATHER | Initial adapter enablement policy and provider records for issue #63; all provider records remain pending and no runtime conformance is claimed. |
