---
title: "Provider Entitlement Sharing Compatibility Policy"
doc_id: "POLICY-PROVIDER-ENTITLEMENT-SHARING-COMPATIBILITY"
version: "0.1.1+draft"
status: draft
updated: "2026-08-03"
owner: "Boss / ATHER"
source_of_truth: true
related_issues:
  - 55
  - 59
  - 63
  - 64
  - 69
related_docs:
  - "docs/adr/ADR-024-Provider-Entitlement-Execution-Authority-Boundary.md"
  - "docs/api/API-008-Provider-Entitlement-Routing-Usage-Contract.md"
  - "docs/assurance/security/THREAT-MODEL-Provider-Entitlement-Credential-and-Session-Boundary.md"
---

# Provider Entitlement Sharing Compatibility Policy

## 1. Purpose

This policy defines the evidence and approval required before a provider entitlement may be used beyond its explicit owner. It applies to subscriptions, organization seats, API budgets, hosted tools, CLI-backed providers, delegated credentials, and local compute.

The default is **deny**. Absence, expiry, ambiguity, or staleness of a compatibility record means the entitlement is not shareable and must not be selected for workspace, team, organization, or cross-user execution.

## 2. Canonical rule

```text
No approved compatibility record
  -> no shared entitlement eligibility
  -> no protected credential grant
  -> no provider session reuse
  -> no provider execution
```

A compatibility record is an authorization prerequisite. It is not a credential, provider account, quota snapshot, or routing preference.

## 3. Scope classifications

Every entitlement must declare exactly one authorization scope:

| Scope | Meaning | Default |
|---|---|---|
| `owner_only` | Only the credential owner may execute | Required default for personal subscriptions and unknown policies |
| `named_users` | Only explicitly listed provider-authorized users may execute | Deny until evidence is approved |
| `workspace` | Approved members of one GoVibe workspace may execute | Deny until provider and organization evidence is approved |
| `organization` | Approved organization principals may execute | Deny until provider and organization evidence is approved |
| `service_identity` | A non-human service principal may execute within explicit automation terms | Deny until automation evidence is approved |
| `local_host` | Execution is restricted to a named host or controlled local runtime | Owner/host policy required |

No record may use a generic `shared`, `pooled`, or `public` scope.

## 4. Required compatibility record

Each record must contain:

- stable `record_id` and `schema_version`;
- provider, product, plan, and execution surface;
- entitlement type;
- owner type and permitted user model;
- approved authorization scope;
- whether automation is allowed;
- whether credential delegation is allowed;
- whether session reuse is allowed and its isolation domain;
- whether concurrent use is allowed;
- quota visibility and telemetry semantics;
- prompt/cache visibility semantics;
- source evidence references and evidence hashes;
- reviewer, approval state, approved date, expiry date, and next review date;
- explicit restrictions and fail-closed reasons.

Raw terms text, credentials, tokens, cookies, or session material must not be stored in the compatibility registry.

## 5. Approval states

| State | Runtime effect |
|---|---|
| `draft` | Not eligible |
| `under_review` | Not eligible |
| `approved_owner_only` | Owner-only eligibility permitted |
| `approved_shared` | Shared eligibility permitted only within the exact approved scope |
| `suspended` | Not eligible |
| `expired` | Not eligible |
| `revoked` | Not eligible |
| `unknown` | Not eligible |

`approved_shared` must never be inferred from an organization name, paid plan, multiple seats, observed concurrent sessions, or the ability to technically reuse credentials.

## 6. Evidence requirements

An approval must be supported by current evidence appropriate to the execution surface, such as:

- provider terms or product documentation;
- organization agreement or enterprise contract;
- provider-issued administrator controls;
- explicit seat/user assignment rules;
- automation and API usage terms;
- security and identity documentation;
- internal legal/security review where terms are ambiguous.

Evidence must identify the exact product and plan. Evidence for an API product does not automatically authorize subscription or CLI sharing, and vice versa.

## 7. Provider execution surfaces

Compatibility is evaluated per surface:

- API key or OAuth API;
- browser/web subscription;
- desktop application;
- CLI or IDE extension;
- organization-managed seat;
- local model/runtime;
- delegated service integration.

Approval on one surface does not authorize another surface.

## 8. Session and credential rules

- Personal subscriptions default to `owner_only`.
- Cross-user session reuse defaults to false.
- Session reuse requires an approved isolation domain containing owner, entitlement, workspace, provider, product, model family, and execution surface.
- Credential material must remain in Credential Vault and may only be exposed through a run-scoped protected grant.
- Cookies, browser profiles, CLI credential directories, refresh tokens, or desktop application state must not be copied between users to simulate pooling.
- Provider account limits must not be bypassed by rotating identities, sessions, devices, or network paths.

## 9. Quota and telemetry semantics

Every record must classify each telemetry field as:

- `provider_reported`;
- `govibe_estimated`;
- `unknown`;
- `not_applicable`.

Subscription request limits, API tokens, credits, cached tokens, local GPU time, wall-clock time, and seat concurrency are distinct units. The registry must not declare equivalence without provider-defined evidence.

## 10. Runtime enforcement

Before shared eligibility, the entitlement runtime must verify:

1. a matching compatibility record exists;
2. provider, product, plan, entitlement type, and surface match exactly;
3. state is currently approved;
4. approval is not expired or suspended;
5. requested principal and scope are allowed;
6. automation, session, concurrency, and credential-delegation rules are satisfied;
7. required evidence references remain valid;
8. the requested adapter declares compatible capabilities.

Any mismatch returns `PROVIDER_COMPATIBILITY_DENIED` with a bounded reason code. The router may not downgrade this denial into a routing preference.

## 11. Required reason codes

- `COMPATIBILITY_RECORD_MISSING`
- `COMPATIBILITY_RECORD_EXPIRED`
- `COMPATIBILITY_RECORD_SUSPENDED`
- `PRODUCT_OR_PLAN_MISMATCH`
- `EXECUTION_SURFACE_MISMATCH`
- `SHARE_SCOPE_NOT_APPROVED`
- `PRINCIPAL_NOT_APPROVED`
- `AUTOMATION_NOT_APPROVED`
- `SESSION_REUSE_NOT_APPROVED`
- `CONCURRENCY_NOT_APPROVED`
- `CREDENTIAL_DELEGATION_NOT_APPROVED`
- `EVIDENCE_STALE_OR_INVALID`
- `PROVIDER_POLICY_UNKNOWN`

## 12. Change and revocation behavior

A provider-policy change, contract change, account conversion, plan migration, security incident, ownership change, or evidence expiry must trigger re-evaluation.

Suspension or revocation must:

- remove the entitlement from new routing eligibility immediately;
- revoke pending protected grants;
- prevent session reuse;
- mark active runs for policy-aware cancellation or bounded completion;
- emit an audit event without credential material.

## 13. Initial registry posture

Until provider-specific reviews are completed:

- external personal subscriptions: `owner_only` only;
- external workspace/organization pooling: denied;
- cross-user provider sessions: denied;
- external CLI credential-directory sharing: denied;
- local compute: allowed only under host ownership and workspace policy;
- API execution: allowed only under the API credential owner and budget policy, not inferred subscription rights.

## 14. Required tests

Issue #59, #63, and #64 must include tests proving:

- missing and expired compatibility records fail closed;
- product/plan/surface mismatch fails closed;
- an owner-only record cannot authorize another user;
- an approved workspace scope cannot cross workspaces;
- cross-user session reuse remains denied without explicit approval;
- provider-reported and estimated quota fields remain separate;
- revocation removes eligibility before adapter invocation;
- adapters cannot override the compatibility decision.

## 15. Completion gate

Issue #69 is complete when:

- this policy is approved;
- a machine-readable compatibility registry exists;
- default-deny behavior is represented in runtime contracts;
- provider-specific records can be added without changing authority semantics;
- #59, #63, and #64 reference the policy and reason codes.

This policy does not by itself approve any external provider plan for shared use.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1+draft | 2026-08-03 | Boss / ATHER | Corrected the threat-model reference as an owner-approved documentation-only conformance change; no compatibility or runtime claim changed. |
| 0.1.0+draft | 2026-08-03 | Boss / ATHER | Defined default-deny provider entitlement sharing compatibility evidence and enforcement gates. |
