---
title: "Threat Model: Provider Entitlement Credential and Session Boundary"
doc_id: "THREAT-MODEL-PROVIDER-ENTITLEMENT-CREDENTIAL-SESSION"
version: "0.2.0+draft"
updated: "2026-08-14"
status: "draft"
owner: "ATHER / ARCHON"
source_of_truth: true
related_docs:
  - "docs/adr/ADR-024-Provider-Entitlement-Execution-Authority-Boundary.md"
  - "docs/api/API-008-Provider-Entitlement-Routing-Usage-Contract.md"
  - "docs/architecture/C4-Provider-Entitlement-Execution-Routing-Overlay.md"
related_issues:
  - "#55"
  - "#59"
  - "#64"
  - "#67"
  - "#69"
  - "#70"
---

# Threat Model: Provider Entitlement Credential and Session Boundary

## 1. Purpose

This document defines the security boundary required before GoVibe may use provider subscriptions, organization seats, API credentials, CLI-backed identities, or local execution entitlements.

It converts the authority decisions in ADR-024 and the contracts in API-008 into explicit threats, mandatory controls, negative tests, incident actions, and release gates.

The repository now contains an in-memory Credential Vault boundary, run-scoped
grants, binding/session checks, and an explicit `derived_token` handoff fixture
whose raw bytes are restricted to an adapter-owned derivation callback. This is
bounded repository evidence only: encrypted/durable storage, a real provider
handoff, complete operational controls, and final conformance remain tracked by
Issues #59 and #64.

## 2. Security objective

A provider execution must only occur when all of the following are true:

1. the calling principal is authenticated;
2. the entitlement owner and share policy authorize the principal;
3. the workspace, project, role, model, tool, and data policy allow execution;
4. the bound MSP context packet is persisted and integrity-valid;
5. the credential reference resolves to a live, non-revoked credential;
6. the provider session belongs to the same authorized isolation domain;
7. the adapter receives only the minimum credential material required for that run;
8. secrets cannot enter logs, context, candidate output, usage records, or canonical knowledge;
9. failover and retry repeat authorization and revocation checks;
10. every decision is auditable without exposing secret material.

Fail-closed is mandatory whenever identity, ownership, policy, credential status, session lineage, provider compatibility, or context integrity is unknown.

## 3. Authority and trust boundaries

```text
Human / Agent Principal
        |
        v
GoVibe Identity + Policy Boundary
        |
        v
Entitlement Registry ---------- Provider Compatibility Registry
        |                                  |
        +----------- eligibility ----------+
        |
        v
Execution Binding Boundary <---- persisted MSP context identity/hash
        |
        v
Credential Vault
        |
        | protected, run-scoped credential grant
        v
Provider Adapter Boundary
        |
        | provider request / provider session
        v
External Provider or Local Executor
        |
        v
Candidate Result Boundary
```

### 3.1 Canonical owners

| Domain | Canonical owner | Security consequence |
|---|---|---|
| Knowledge identity and relations | GKS | Credentials and provider sessions must never become canonical knowledge. |
| Context, scope, permission, continuity | MSP | Provider adapters must not widen or reconstruct context. |
| Entitlement metadata and eligibility | GoVibe Entitlement Runtime | Every execution target must have owner, lifecycle, and share policy. |
| Secret material | Credential Vault | Registries and context packets store opaque references only. |
| Provider-specific protocol/session | Provider Adapter | Session state is isolated execution state, not memory authority. |
| Raw operational usage | Usage Ledger | Usage events must be secret-free and non-canonical by default. |

## 4. Protected assets

| Asset | Sensitivity | Required protection |
|---|---:|---|
| API keys, refresh tokens, access tokens | Critical | Encrypted at rest; never serialized outside vault/grant boundary. |
| Subscription/CLI session directories | Critical | Per-owner or per-entitlement filesystem/process isolation. |
| OAuth authorization codes and state | Critical | One-time use, short TTL, state/PKCE validation, redirect allowlist. |
| Entitlement ownership and share policy | High | Integrity protection, audit history, authorization on mutation. |
| Provider session IDs/cache references | High | Isolation-domain binding; no cross-user reuse by default. |
| Execution binding IDs and context hashes | High | Immutable lineage and tamper detection. |
| Usage/quota events | Medium/High | Secret redaction, tenant isolation, bounded retention. |
| Provider candidate output | Variable | Treat as untrusted input; secret and canonical-ID screening. |
| Logs, traces, diagnostics | High | Structured allowlist logging; bounded error messages. |

## 5. Isolation domains

A provider session must be bound to an explicit isolation domain:

```yaml
isolation_domain:
  organization_id: string
  principal_id: string
  entitlement_id: string
  auth_profile_id: string
  provider_id: string
  model_family: string|null
```

Default rule:

```text
session reuse is allowed only when every non-null isolation-domain field matches
```

Cross-user reuse is denied unless a provider compatibility record explicitly permits an organization-managed service identity and the entitlement share policy authorizes it.

A cache hit or matching provider session ID is never sufficient authorization.

## 6. Threat actors

- unauthorized employee or workspace member;
- compromised user account;
- malicious or buggy agent;
- malicious tool/MCP server;
- compromised provider adapter;
- external provider returning hostile content;
- operator with excessive vault access;
- attacker with local filesystem/process access;
- attacker replaying stale bindings or tokens;
- accidental developer logging or serializing secrets;
- confused deputy using a valid credential for an unauthorized principal or context.

## 7. Threat register

### TM-01: Raw credential leakage into registry or context

**Scenario:** An API key, refresh token, cookie, CLI session JSON, or secret-bearing environment variable is stored in entitlement metadata, MSP context, GKS, candidate output, usage events, or user-visible traces.

**Impact:** Account takeover, provider abuse, cross-tenant compromise.

**Mandatory controls:**

- entitlement records accept only opaque `credential_ref`;
- schema validator rejects common secret field names and high-risk secret shapes;
- vault material is non-serializable outside protected grant objects;
- structured logging uses an allowlist rather than blacklist-only redaction;
- candidate and error boundaries run secret detectors;
- raw provider request headers and environment dumps are prohibited.

**Required tests:**

- register entitlement containing `api_key`, `access_token`, `refresh_token`, `secret`, cookie, or authorization header and verify rejection;
- inject secret into provider error and verify redacted normalized error;
- inspect logs, MSP packets, usage events, and candidate artifacts for known canary secrets.

**Owner:** #59

### TM-02: Confused deputy / entitlement substitution

**Scenario:** A principal submits or influences another user's `entitlement_id` or `credential_ref`, and the runtime executes with credentials the principal does not own.

**Impact:** Unauthorized provider use, quota theft, data disclosure.

**Mandatory controls:**

- client-supplied `credential_ref` is ignored or rejected;
- entitlement selection occurs only after server-side eligibility filtering;
- binding records principal, entitlement, workspace, policy decision, and context hash;
- adapter receives a run-scoped grant linked to the binding;
- dispatch rechecks entitlement lifecycle and grant binding.

**Required tests:**

- replace entitlement ID after planning and verify binding rejection;
- replace credential reference before dispatch and verify denial;
- replay a valid binding under another principal/workspace and verify denial.

**Owner:** #59, #60, #64

### TM-03: Cross-user provider-session fixation or reuse

**Scenario:** A provider session created by User A is reused for User B because it is warm, cache-affine, or has remaining quota.

**Impact:** Prompt/history leakage, privilege confusion, provider-policy violation.

**Mandatory controls:**

- session store keys include the full isolation domain;
- `cross_user_reuse` defaults `false`;
- personal subscriptions and personal CLI identities are `owner_only`;
- session adoption requires compatibility-policy approval;
- provider session IDs are never accepted directly from untrusted clients.

**Required tests:**

- attempt cross-principal reuse with same provider/model and verify denial;
- attempt reuse after entitlement ownership change and verify invalidation;
- attempt reuse when compatibility record is missing or expired and verify denial.

**Owner:** #59, #69, #64

### TM-04: Stale token or revocation race

**Scenario:** A credential or entitlement is revoked after planning but before dispatch, retry, or failover.

**Impact:** Execution after access removal.

**Mandatory controls:**

- lifecycle and credential revocation are checked at planning, binding, and immediately before provider invocation;
- run-scoped grants have short TTL and single-use or bounded-use semantics;
- revocation increments a credential/entitlement generation number;
- binding records the generation and dispatch rejects mismatch;
- retries and failovers obtain a new grant.

**Required tests:**

- revoke after binding and verify dispatch denial;
- rotate credential and verify stale grant denial;
- failover after revocation and verify no inherited credential/session state.

**Owner:** #59, #60, #62, #64

### TM-05: OAuth callback and authorization-state attack

**Scenario:** OAuth state is predictable, reused, bound to the wrong principal, or redirected to an attacker-controlled URI.

**Impact:** Credential theft or account linking to the wrong GoVibe identity.

**Mandatory controls:**

- PKCE where supported;
- cryptographically random one-time state;
- state bound to principal, workspace, provider, redirect URI, and short expiry;
- exact redirect allowlist;
- authorization code consumed once;
- callback never accepts entitlement owner from request parameters alone;
- provider account identity is verified after token exchange.

**Required tests:**

- state replay, state substitution, expired state, wrong redirect, wrong principal, and code replay all fail closed.

**Owner:** #59

### TM-06: Local CLI credential-directory crossover

**Scenario:** Multiple users or entitlements share one HOME/config directory, causing one user's CLI identity or cached session to execute another user's task.

**Impact:** Cross-user data and quota leakage.

**Mandatory controls:**

- per-entitlement isolated HOME/config/cache directory;
- restricted filesystem permissions;
- dedicated child-process environment allowlist;
- no inherited global credential environment variables;
- process cleanup and directory lifecycle controls;
- local executor reports resolved auth profile without exposing secret paths to users.

**Required tests:**

- run two principals concurrently and verify distinct directories and identities;
- inject global provider env var and verify it is removed from child environment;
- terminate process and verify no session handle is reused across isolation domains.

**Owner:** #59, #63, #64

### TM-07: Log, trace, crash-dump, or error exfiltration

**Scenario:** Secret-bearing headers, CLI output, provider errors, environment variables, or request bodies are captured by logs or telemetry.

**Impact:** Persistent credential exposure.

**Mandatory controls:**

- structured event schema with explicit safe fields;
- secret values never passed as logger arguments;
- provider error normalization with bounded messages;
- no environment dumps or full request serialization;
- redaction before persistence and before user-visible surfaces;
- crash reporting disabled or scrubbed for protected processes.

**Required tests:**

- canary secret across success, timeout, cancellation, provider error, and crash paths;
- verify secret absence in logs, traces, usage events, and returned errors.

**Owner:** #59, #61, #63, #64

### TM-08: Adapter overreach

**Scenario:** A provider adapter reads GKS, MSP internals, unrelated credentials, or arbitrary host files because it runs with excessive capability.

**Impact:** Authority bypass and broad compromise.

**Mandatory controls:**

- adapter interface receives immutable context payload, binding metadata, and run-scoped credential grant only;
- no direct GKS/GenesisBlockDB client dependency;
- filesystem/network/process capability restricted per adapter;
- adapter registry declares required capabilities;
- least-privilege sandbox for local/CLI adapters.

**Required tests:**

- dependency-boundary test forbids GKS/GenesisBlockDB imports;
- adapter attempts to request another credential and is denied;
- adapter attempts out-of-scope filesystem access and is denied where sandboxed.

**Owner:** #59, #63, #64

### TM-09: Provider candidate prompt injection into control plane

**Scenario:** Provider output includes instructions to reveal credentials, modify routing policy, assign canonical GKS IDs, or reuse a privileged session.

**Impact:** Authority escalation and secret disclosure.

**Mandatory controls:**

- provider output is data, never control-plane instruction;
- candidate schema rejects canonical identity assignment;
- routing, entitlement, session, and credential changes require trusted control-plane actions;
- candidate promotion remains MSP/GKS governed;
- secret-bearing tool calls require independent authorization.

**Required tests:**

- candidate requests entitlement/session reassignment and no control-plane state changes;
- canonical-ID injection is rejected;
- candidate containing a fake credential reference cannot influence dispatch.

**Owner:** #60, #63, #64

### TM-10: Quota telemetry used as authorization

**Scenario:** A provider account with more remaining quota is selected despite ownership or sharing policy, or unknown provider limits are treated as exact capacity.

**Impact:** Unauthorized account use and policy violation.

**Mandatory controls:**

- authorization filtering precedes scoring;
- quota state cannot make an ineligible entitlement eligible;
- reported, estimated, and unknown values remain separate;
- compatibility record controls whether an entitlement may be pooled.

**Required tests:**

- unauthorized entitlement with highest quota is never selected;
- unknown quota does not become a fabricated exact number;
- stale quota snapshot cannot bypass lifecycle/revocation checks.

**Owner:** #61, #62, #69, #64

### TM-11: Failover inherits invalid identity or context

**Scenario:** Failover reuses the original provider session or credential while switching entitlement/provider, or silently changes context semantics.

**Impact:** Cross-account leakage, incorrect execution, audit loss.

**Mandatory controls:**

- failover creates a new binding and run-scoped credential grant;
- entitlement policy and compatibility are re-evaluated;
- `context_id` and `context_hash` remain unchanged for rebind;
- any context modification requires new MSP lineage;
- semantic/model/tool downgrade is explicit.

**Required tests:**

- failover produces new binding ID and grant;
- revoked fallback entitlement is rejected;
- incompatible tool/model fallback fails rather than silently degrading;
- context hash mismatch blocks rebind.

**Owner:** #60, #62, #64

### TM-12: Tenant and workspace data crossover

**Scenario:** Entitlement, session, usage, or binding records are queried without organization/workspace constraints.

**Impact:** Cross-tenant metadata or secret exposure.

**Mandatory controls:**

- tenant/workspace scope is mandatory in repository keys and queries;
- globally unique IDs do not replace authorization predicates;
- audit and usage APIs apply the same tenant boundary;
- administrative cross-tenant access is explicit and separately audited.

**Required tests:**

- same ID under wrong tenant/workspace fails;
- list/inspect endpoints cannot enumerate foreign entitlements or sessions;
- usage aggregation cannot cross tenant without authorized admin scope.

**Owner:** #58, #59, #61, #64

### TM-13: Credential-vault operator abuse

**Scenario:** An operator or service with vault access reads or exports provider credentials beyond a specific execution need.

**Impact:** Broad provider compromise.

**Mandatory controls:**

- vault decrypt permission separated from entitlement administration;
- run-scoped grants instead of general secret-read API;
- secret access audit events record actor, binding, purpose, and result without value;
- break-glass access is time-bounded and independently reviewed;
- rotation and revocation are supported without exposing plaintext.

**Required tests:**

- entitlement admin cannot decrypt secret;
- adapter cannot enumerate vault entries;
- secret grant requires valid binding and purpose;
- break-glass path emits mandatory audit evidence.

**Owner:** #59, #64

### TM-14: Unbounded secret retention

**Scenario:** Expired credentials, grants, sessions, logs, and provider response artifacts remain indefinitely.

**Impact:** Increased blast radius and compliance exposure.

**Mandatory controls:**

- explicit retention classes for credentials, grants, sessions, logs, and usage events;
- expired grants deleted or cryptographically invalidated;
- provider sessions removed on entitlement revocation;
- backups follow secret retention and deletion policy;
- candidate artifacts containing detected secrets are quarantined and removed.

**Required tests:**

- TTL expiry invalidates grant/session;
- revocation triggers session purge;
- retention job deletes or tombstones records as specified.

**Owner:** #59, #61, #64

## 8. Mandatory control set for Issue #59

Credential Vault implementation is not acceptable unless it provides:

1. opaque credential references;
2. encrypted secret storage;
3. owner and tenant binding;
4. credential lifecycle and generation number;
5. run-scoped credential grants;
6. single-use or short-TTL grant semantics;
7. pre-dispatch revocation recheck;
8. provider-session isolation domains;
9. protected child-process environment for CLI adapters;
10. structured allowlist logging and secret redaction;
11. audit events without secret values;
12. rotation, revocation, purge, and incident response operations.

The derived-token control is additionally required for any adapter that selects
that mode: raw bytes must not reach `execute`, the handoff must be bound to the
provider/adapter/binding tuple, and exact raw-secret reuse must be rejected.

## 9. Provider compatibility dependency

No subscription or organization seat may be marked `workspace_pool` or `organization_pool` solely because the implementation technically supports it.

Issue #69 must provide an approved, versioned compatibility record covering:

- provider, product, plan, and automation surface;
- permitted identity and user model;
- credential/session sharing restrictions;
- allowed execution mechanisms;
- quota and cache telemetry visibility;
- source evidence and review/expiry date.

Missing, stale, or ambiguous compatibility data results in `owner_only` or denial.

## 10. Security event taxonomy

| Event | Required fields |
|---|---|
| `credential.grant.created` | binding ID, entitlement ID, principal ID, credential generation, expiry |
| `credential.grant.denied` | binding ID, reason code, policy version |
| `credential.revoked` | credential ref hash, generation, actor, reason |
| `provider.session.created` | isolation-domain hash, provider, entitlement ID |
| `provider.session.reuse.denied` | source/target isolation-domain hashes, reason |
| `provider.dispatch.denied` | binding ID, entitlement ID, reason code |
| `provider.failover.rebound` | old/new binding IDs, unchanged context hash, fallback policy |
| `secret.redaction.triggered` | run ID, surface, detector class; never secret value |

IDs exposed to general logs should be hashed or otherwise minimized when they could reveal provider-account identity.

## 11. Incident response

On suspected credential or session compromise:

1. suspend affected entitlement;
2. revoke credential and increment generation;
3. invalidate all active grants;
4. purge associated provider sessions/cache references;
5. stop or cancel active runs where supported;
6. rotate provider credential;
7. search secret-redaction and access audit events;
8. quarantine candidate/log artifacts that may contain secrets;
9. notify affected owner/security authority;
10. restore only after compatibility and ownership are revalidated.

## 12. Release gates

### Gate A — Threat-model approval

- every P0 threat has a mapped implementation control;
- every control has at least one negative test owner;
- residual risks are explicitly accepted or blocked.

### Gate B — Credential Vault implementation (#59)

- mandatory control set implemented;
- repository derived-token boundary and negative fixture pass, where that mode
  is used;
- focused security tests pass;
- no secret material appears in test evidence.

### Gate C — Provider adapter integration (#63)

- adapter capability boundary verified;
- protected credential handoff verified;
- provider-specific compatibility record approved.

### Gate D — Runtime conformance (#64)

- end-to-end persisted MSP context → binding → grant → provider candidate path passes;
- negative authorization, revocation, session, redaction, failover, and telemetry tests pass;
- implementation status is updated only after evidence exists.

## 13. Residual risks

- A provider or local machine may be compromised after a valid request leaves GoVibe.
- Some subscription/CLI products expose limited session and quota telemetry.
- Provider policy and product behavior may change after compatibility approval.
- Memory scraping or privileged host compromise cannot be eliminated by application controls alone.

Mitigation requires least privilege, short-lived grants, isolation, compatibility review expiry, provider-side controls, host hardening, and rapid credential rotation.

## 14. Definition of done for Issue #67

Issue #67 is complete when:

- this document is approved;
- TM-01 through TM-14 map to controls and test owners;
- P0 controls are referenced by #59 and #64;
- provider compatibility is explicitly gated by #69;
- contract reconciliation remains gated by #70;
- no runtime implementation claim is made by this document alone.

## 15. Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0+draft | 2026-08-14 | ATHER | Recorded the repository derived-token handoff control and its remaining production limits; no real-provider or final #59/#64 closure claim. |
