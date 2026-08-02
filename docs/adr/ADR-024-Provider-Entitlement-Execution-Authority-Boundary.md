---
doc_id: "ADR-024-PROVIDER-ENTITLEMENT-EXECUTION-AUTHORITY-BOUNDARY"
title: "ADR-024: Provider Entitlement and Execution Authority Boundary"
status: "proposed"
version: "0.1.0+draft"
updated: "2026-08-02"
owner: "Boss (CEO)"
type: adr
related_issue: 55
related_adrs: ["ADR-023"]
---

# ADR-024: Provider Entitlement and Execution Authority Boundary

**Status:** Proposed  
**Date:** 2026-08-02  
**Owner:** Boss (CEO)

## 1. Context

GoVibe is designed to remain vendor-neutral while coordinating governed execution across external agents, models, tools, and local runtimes. Organizations may hold several kinds of AI capacity at once:

- user-owned subscriptions;
- business or organization-managed seats;
- provider service entitlements;
- organization API budgets;
- local CPU/GPU capacity;
- future marketplace or delegated execution resources.

These resources expose incompatible capabilities, quota units, ownership rules, session behavior, cache telemetry, and rate limits. A naive account pool or least-load router would erase ownership, break auditability, increase cache misses, and risk allowing a resource scheduler to mutate task context.

ADR-023 already establishes GKS as canonical knowledge/relation authority and MSP as task/session context authority. A separate decision is required for execution-resource authority.

## 2. Decision

Introduce a GoVibe-owned **Provider Entitlement and Execution Resource Control Plane**.

### 2.1 Authority chain

```text
Human / Agent request
  -> GoVibe validation and policy surface
  -> MSP context authority
  -> GKS canonical knowledge authority
  -> MSP persisted context packet
  -> GoVibe Entitlement Runtime
  -> Provider Adapter
  -> External Executor
  -> candidate output
  -> GoVibe -> MSP -> GKS governed promotion
```

### 2.2 Entitlement Runtime authority

The Entitlement Runtime owns:

- entitlement registration and lifecycle;
- ownership and share-policy evaluation;
- provider capability discovery;
- eligible execution-target calculation;
- execution binding;
- quota-aware scheduling;
- session and cache affinity selection;
- retry and fallback binding;
- operational usage-event production;
- revocation enforcement before dispatch.

It answers:

> Which authorized execution resource may run this already-governed task now, under which provider, model, credential, quota, session, and fallback constraints?

It does not answer what the agent should know or what knowledge is canonical.

### 2.3 Entitlement model

Every executable resource is represented by an entitlement with explicit:

- identity and version;
- provider and entitlement type;
- owner type and owner ID;
- share policy;
- allowed principals, workspaces, projects and roles;
- data-classification and residency policy;
- credential reference;
- supported executor classes, models, tools and modalities;
- concurrency and session policy;
- usage-visibility declaration;
- lifecycle and revocation state.

Anonymous credential pooling is prohibited. An account may back an entitlement, but routing and authorization operate on entitlement identity rather than raw account credentials.

### 2.4 Provider Adapter authority

A Provider Adapter owns only provider-specific execution mechanics:

- authentication handoff from an opaque credential reference;
- request translation;
- process, CLI, SDK or API invocation;
- stream normalization;
- provider session handling;
- provider prompt-cache references;
- cancellation and rate-limit detection;
- provider-reported usage extraction;
- normalized candidate result production.

A Provider Adapter must not:

- query GKS or GenesisBlockDB;
- resolve or widen MSP context;
- assign canonical knowledge identity;
- promote provider output;
- reuse credentials or sessions beyond entitlement policy;
- claim estimated usage as provider-reported usage.

### 2.5 Two-phase routing

Routing is split into:

1. **Capability planning** before final context resolution, producing bounded execution constraints only.
2. **Execution binding** after MSP persists the final context packet, selecting one authorized target without modifying packet semantics.

If a target cannot accept the packet, the router returns a typed failure such as `CONTEXT_BUDGET_UNSATISFIED`, `NO_AUTHORIZED_ENTITLEMENT`, `PROVIDER_RATE_LIMITED`, or `REQUIRED_CAPABILITY_UNAVAILABLE`. MSP or the governing workflow decides whether to re-resolve context or escalate.

### 2.6 Quota and usage semantics

The control plane keeps provider-reported, GoVibe-estimated, and unknown values separate.

Subscription request limits, provider credits, API tokens, cached API tokens, execution duration, and local-compute occupancy are not treated as equivalent units. Internal scheduling weights may compare them operationally, but the original unit and confidence must remain visible.

### 2.7 Cache and continuity

The architecture distinguishes:

- MSP context cache and replay lineage;
- GoVibe verified-result cache;
- provider prompt-cache reference;
- provider session ID;
- executor workspace state.

Provider session or cache affinity is an optimization. It is not memory authority, canonical truth, or evidence that the underlying context remains valid.

### 2.8 Failover

Failover must:

- preserve the original context ID and context hash;
- create a new execution-binding ID and retry/fallback lineage;
- re-run authorization for the fallback entitlement;
- verify model, tool, data and context compatibility;
- expose any semantic downgrade or capability difference;
- keep all provider output in candidate state.

Failover must not silently trim context, change scope, alter exclusions, or substitute current sources for historical replay sources.

## 3. Consequences

### Positive

- GoVibe remains vendor-neutral across subscription, API and local execution.
- Ownership and policy survive centralized scheduling.
- Provider-specific cache and session behavior can be optimized without becoming product authority.
- Quota allocation and fallback become auditable.
- MSP and GKS boundaries remain intact.
- External providers remain replaceable.

### Negative

- Provider adapters require richer capability and telemetry descriptors.
- Subscription capacity may remain only partially observable.
- Credential-vault, revocation and session-isolation requirements increase security scope.
- Routing quality must consider authorization, capability, affinity, quota and semantic compatibility rather than simple load.
- Runtime conformance requires provider-specific tests and policy evidence.

## 4. Rejected alternatives

### 4.1 Anonymous account pool

Rejected because it loses ownership, violates audit boundaries, and may conflict with provider-specific licensing or seat policy.

### 4.2 Router owns context compaction

Rejected because MSP is the context authority. Provider constraints may trigger a re-resolution request but not silent router-side trimming.

### 4.3 Normalize all quota to tokens

Rejected because subscriptions, credits, requests, API tokens, cache discounts and local utilization have different semantics and visibility.

### 4.4 Provider session as memory

Rejected because provider history is not canonical, may expire, may be inaccessible during failover, and cannot replace source-versioned MSP lineage.

## 5. Required follow-up

- API-008 Provider Entitlement, Routing and Usage Contract
- C4 Provider Entitlement and Execution Routing Overlay
- FEAT Multi-Provider Entitlement Routing
- credential-vault threat model
- entitlement registry and usage-ledger design
- runtime enforcement tests
- provider policy compatibility records

## 6. Related

- Issue #55
- ADR-023 Knowledge Authority vs Context Authority
- API-007 Knowledge and Context Authority Contract
- CR-2026-08-02 Multi-Provider Entitlement Routing

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-02 | Boss (CEO) | Proposed execution-resource authority, entitlement ownership, two-phase routing, usage semantics, affinity and failover boundaries. |
