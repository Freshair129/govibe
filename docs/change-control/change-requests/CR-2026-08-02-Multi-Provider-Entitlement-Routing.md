---
doc_id: "CR-2026-08-02-MULTI-PROVIDER-ENTITLEMENT-ROUTING"
title: "CR: Multi-Provider Entitlement and Execution Resource Control Plane"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-02"
owner: "Boss (CEO)"
type: change-request
source_of_truth: true
related_issue: 55
related_adrs: ["ADR-023", "ADR-024"]
related_apis: ["API-007", "API-008"]
---

# CR: Multi-Provider Entitlement and Execution Resource Control Plane

## 1. Change summary

Introduce a vendor-neutral control plane for discovering, authorizing, binding, scheduling, observing, and failing over AI execution resources across provider subscriptions, organization-managed seats, API budgets, and local compute.

This change does not move knowledge or context authority into the router. The authority chain remains:

```text
GKS -> canonical knowledge and relation authority
MSP -> task/session context, permission, scope, compaction and continuity authority
GoVibe Entitlement Runtime -> authorized execution-resource eligibility and scheduling
Provider Adapter -> provider-specific protocol, session and execution
External Provider -> bounded candidate output only
```

## 2. Business problem

Organizations increasingly hold fragmented AI capacity across OpenAI, Google, Anthropic, local models, and future providers. Each provider exposes different subscription limits, API billing, cache behavior, session semantics, tooling, and telemetry. Vendor workspaces manage only their own products and do not provide a unified organizational execution layer.

Without a GoVibe-owned resource control plane:

- teams cannot allocate authorized provider capacity consistently across workspaces;
- subscription, API, and local resources cannot be compared or scheduled under one policy;
- failover can lose context lineage or silently change execution semantics;
- provider sessions and caches may be mistaken for organizational memory;
- anonymous credential pooling can bypass ownership and audit boundaries;
- quota reporting can be conflated with API token accounting;
- external provider output can be trusted beyond its candidate authority.

## 3. Target outcome

GoVibe provides one governed execution surface across multiple providers while preserving replaceability and authority boundaries.

The target system must:

1. register provider capability descriptors;
2. register entitlements with explicit ownership and share policy;
3. authorize entitlements against user, workspace, role, data classification, and task policy;
4. perform capability planning before context resolution without selecting or widening knowledge scope;
5. bind a finalized MSP context packet to one provider, model, entitlement, credential reference, session affinity key, and fallback policy;
6. record provider-reported, GoVibe-estimated, and unknown usage separately;
7. preserve context identity and lineage across retries and failover;
8. treat provider output as candidate state until governed promotion;
9. support subscription, organization service, API, and local-compute execution paths without assuming equivalent quota units;
10. fail closed when ownership, permission, context integrity, credential scope, or telemetry meaning is unresolved.

## 4. Terminology decision

Use **Entitlement Pool**, not anonymous **Account Pool**.

An entitlement is an authorized right to consume a bounded provider or local execution resource. Every entitlement must declare:

- entitlement ID and type;
- provider and supported executor classes;
- owner type and owner ID;
- share policy;
- allowed users, roles, workspaces, projects, and data classifications;
- credential reference;
- quota visibility and rate-limit observability;
- concurrency and session policy;
- lifecycle and revocation state.

An account or credential may back an entitlement, but credentials are never the routing identity and must not be exposed to agents or prompts.

## 5. Authority and responsibility

| Domain | Authority |
|---|---|
| Canonical knowledge identity, provenance and relations | GKS |
| Task context, permission, scope, source versions, exclusions, compaction and replay lineage | MSP |
| Entitlement eligibility, scheduling, execution binding and fallback selection | GoVibe Entitlement Runtime |
| Credential storage and release | Provider Credential Vault |
| Provider protocol, process, session and provider-specific cache handling | Provider Adapter |
| Raw run and usage telemetry | Operational Usage Ledger |
| Candidate artifact generation | External Provider / Executor |

The Entitlement Runtime must not:

- query GKS or GenesisBlockDB directly;
- add, remove, reorder, widen, or silently compact MSP-governed context;
- interpret provider history as canonical memory;
- assign canonical GKS identity;
- promote provider output;
- reuse an entitlement outside its ownership and share policy;
- represent estimated usage as provider-reported usage.

## 6. Two-phase routing

### 6.1 Capability planning

Before final context construction, GoVibe may determine bounded execution constraints such as:

- eligible executor classes;
- required tools and modalities;
- data classification compatibility;
- maximum supported context budgets;
- available entitlement classes;
- policy-permitted providers;
- coarse queue and availability state.

Capability planning must not select knowledge, infer missing WHY, or mutate relation policy.

### 6.2 Governed execution binding

After MSP returns a persisted context packet, GoVibe selects an authorized execution binding containing:

- context ID and context hash;
- run, task, agent, workspace, session and turn identities;
- provider, adapter version, model and executor class;
- entitlement and credential references;
- tool contract version;
- provider session and cache-affinity references where available;
- fallback policy and retry lineage.

If no eligible target can execute the packet, GoVibe returns a typed failure to MSP or the governing workflow. It must not trim the packet independently.

## 7. Quota and accounting decision

Subscription quota, API token accounting, provider credits, and local-compute capacity are different resource dimensions.

GoVibe must preserve three telemetry classes:

- `reported`: directly returned by the provider or provider-managed client;
- `estimated`: calculated by GoVibe with method and confidence;
- `unknown`: unavailable or semantically unresolved.

Provider prompt-cache hits may reduce provider compute or API cost, but must not be assumed to reduce subscription quota unless the provider reports that behavior. Application-level verified-result caching is the only cache layer that guarantees no new provider request.

## 8. Cache and continuity decision

The system must distinguish:

- MSP context cache and replay lineage;
- GoVibe verified-result cache;
- provider prompt-cache reference;
- provider session ID and warm execution state;
- executor workspace state.

Provider cache or session continuity is an optimization and never a substitute for MSP context authority or persisted source lineage.

## 9. CoVibe and CoDev application

The runtime architecture is shared.

- CoVibe uses one primary human authority lane to approve entitlement policies, allocation, fallback, and promotion.
- CoDev coordinates multiple authority lanes and must preserve ownership, handoff, conflict, approval, and revocation evidence across entitlements and workspaces.

The number of accounts, employees, models, or providers does not determine CoVibe versus CoDev.

## 10. Security requirements

- Credentials remain in a dedicated encrypted vault and are referenced by opaque IDs.
- Agents, external providers, logs, context packets, and candidate artifacts must not receive raw credentials.
- Entitlement authorization is evaluated before execution binding and again before dispatch.
- Cross-user provider-session reuse is prohibited unless the entitlement and provider contract explicitly authorize it.
- Revocation invalidates new bindings and terminates or quarantines affected queued work.
- Audit records preserve actor, policy version, binding, provider, entitlement, context hash, result state, and fallback lineage.

## 11. Required document propagation

- ADR-024: Provider Entitlement and Execution Authority Boundary
- API-008: Provider Entitlement, Routing and Usage Contract
- C4 Overlay: Provider Entitlement and Execution Routing
- FEAT: Multi-Provider Entitlement Routing
- Document Version Registry
- Future roadmap, backlog, implementation design, threat model, and runtime tests after approval

## 12. Out of scope for this change request

- implementing production provider adapters;
- declaring any subscription safe for shared use without provider-specific policy evidence;
- normalizing all provider quota into exact tokens;
- replacing MSP context construction;
- replacing GKS canonicalization;
- guaranteeing identical output after provider failover;
- claiming runtime enforcement from documentation alone.

## 13. Acceptance criteria

- The new authority boundary is consistent with ADR-023 and API-007.
- Every entitlement has explicit ownership, authorization, credential reference and telemetry semantics.
- Execution binding consumes a persisted MSP context packet without mutating it.
- Provider output remains candidate state.
- Cache/session concepts are separated from memory/context authority.
- Usage contracts distinguish reported, estimated and unknown values.
- Failover preserves context ID/hash and produces new binding lineage.
- Registry entries and cross-document references are valid.
- Runtime enforcement is tracked as separate implementation work.

## 14. Approval gate

This CR changes product capability, architecture authority, security boundaries, and execution governance. Runtime implementation must not claim conformance until ADR/API contracts are approved and enforcement tests exist.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-02 | Boss (CEO) | Proposed the multi-provider entitlement and execution resource control plane under the existing GKS/MSP authority chain. |
