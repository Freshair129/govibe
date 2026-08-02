---
doc_id: "FEAT-MULTI-PROVIDER-ENTITLEMENT-ROUTING"
title: "Feature: Multi-Provider Entitlement Routing"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-02"
owner: "LYRA / ARCHON / ATHER"
type: feature
source_of_truth: true
related_issue: 55
related_adrs: ["ADR-023", "ADR-024"]
related_apis: ["API-007", "API-008"]
---

# Feature: Multi-Provider Entitlement Routing

## 1. Summary

Provide one governed GoVibe execution surface across multiple AI providers and resource types while preserving user/workspace authorization, MSP context authority, GKS canonical authority, provider replaceability, quota visibility, cache/session affinity, and auditable failover.

## 2. User value

An organization can connect authorized OpenAI, Gemini, Claude, local-model, API, and future execution resources to GoVibe, assign them to users or workspaces, and let the platform choose an eligible target without locking workflows, memory, tools, or governance to one vendor.

The feature reduces duplicated provider integration work and can improve effective capacity by:

- using subscription or seat capacity where policy permits;
- preferring local compute for suitable work;
- preserving provider session/cache affinity;
- avoiding provider calls through verified-result caching;
- using API resources as explicit fallback rather than defaulting every task to pay-per-token execution;
- preventing one user or workflow from consuming unauthorized shared capacity.

## 3. Actors

- Organization owner
- Workspace owner
- Employee / collaborator
- Agent / workflow
- GoVibe administrator
- Security / compliance reviewer
- Provider adapter maintainer
- CoVibe primary authority
- CoDev authority-lane owner

## 4. Functional capabilities

### 4.1 Provider capability registry

- Register provider and adapter versions.
- Declare models, executor classes, tools, modalities and context constraints.
- Declare usage visibility and telemetry support.
- Declare session, prompt-cache, cancellation and concurrency support.
- Track observed provider availability without granting authorization.

### 4.2 Entitlement registry

- Register personal subscription, business seat, organization service, API and local-compute entitlements.
- Assign explicit owner and share policy.
- Bind allowed users, roles, workspaces, projects and data classifications.
- Reference credentials through opaque vault IDs.
- Suspend, expire and revoke entitlements.
- Deny cross-user session reuse by default.

### 4.3 Capability planning

- Filter targets by authorization, required capabilities, tools, modalities, privacy, residency and coarse context budget.
- Return bounded constraints to MSP before final context construction.
- Avoid knowledge retrieval, relation traversal or context mutation.

### 4.4 Governed execution binding

- Consume a persisted MSP context packet.
- Select provider, adapter, model, entitlement, credential reference and tool contract.
- Preserve context ID/hash and source-manifest hash.
- Record policy decisions and binding expiry.
- Reject a target that cannot accept the immutable packet.

### 4.5 Quota-aware scheduling

- Observe provider-reported quota where available.
- Record rate-limit-only or unknown visibility honestly.
- Maintain internal estimated capacity with method and confidence.
- Consider authorization, capability fit, quota risk, concurrency, queue delay, reliability and semantic compatibility.
- Never represent internal capacity scores as provider quota facts.

### 4.6 Sticky routing and affinity

- Prefer the same authorized provider/model/entitlement/session for a workflow when beneficial.
- Track provider session and prompt-cache references separately from MSP context cache.
- Invalidate affinity when entitlement, context, source, policy, tool contract or provider compatibility changes.
- Never use affinity to bypass authorization or revocation.

### 4.7 Verified-result cache

- Cache only verified results whose task, context hash, source versions, policy, tool contract, model compatibility and execution assumptions are immutable.
- Return provenance and verification evidence on cache hit.
- Invalidate deterministically on semantic input or authority change.
- Distinguish result-cache hit from provider prompt-cache hit.

### 4.8 Retry and failover

- Create a new binding for every retry or fallback target.
- Preserve context ID/hash when the context is unchanged.
- Re-authorize the fallback entitlement.
- Expose capability downgrade, model change or telemetry loss.
- Escalate when fallback would require context mutation or violate policy.

### 4.9 Usage ledger and reporting

- Record actor, workspace, task, run, binding, provider, entitlement and model.
- Separate reported, estimated and unknown usage.
- Record request, credit, token, duration, local occupancy and rate-limit signals where available.
- Record cache/session affinity and fallback lineage.
- Support organizational chargeback and forecasting without asserting false provider precision.

### 4.10 Candidate-output boundary

- Normalize every provider result into `govibe-provider-candidate/v1`.
- Reject trusted self-assigned canonical identifiers.
- Pass candidates through GoVibe validation and MSP/GKS promotion mediation.
- Preserve provider/version/request provenance.

## 5. Routing policy

A target is first filtered by hard constraints:

```text
authorized principal and workspace
+ entitlement active
+ data and residency policy compatible
+ required executor capability available
+ context and tool contract compatible
+ credential available
```

Only then may the scheduler rank targets using soft factors:

```text
capability fit
+ session affinity
+ prompt-cache affinity
+ quota/capacity state
+ reliability
+ expected cost
+ queue delay
+ context-transfer cost
+ fallback risk
```

Least-load or round-robin routing alone is insufficient.

## 6. Memory and cache boundaries

| State | Owner | Purpose |
|---|---|---|
| Canonical knowledge and relations | GKS | durable truth and provenance |
| Governed context packet and replay lineage | MSP | what this task may/must know now |
| Verified result cache | GoVibe | avoid equivalent execution |
| Provider prompt cache | Provider | execution optimization |
| Provider session | Provider Adapter | continuity and warm state |
| Executor workspace state | Runtime / adapter | files, repository and process state |
| Usage ledger | GoVibe operations | capacity, audit and reporting |

No provider session/cache layer may be promoted to organizational memory merely because it improves cache hit rate.

## 7. CoVibe behavior

CoVibe applies one primary human authority lane:

- one authority approves entitlement registration and workspace allocation;
- routing policy may be centrally defined;
- collaborators may execute only within delegated boundaries;
- unresolved provider-policy or sharing questions escalate to the primary authority.

## 8. CoDev behavior

CoDev supports multiple authority lanes:

- entitlements remain owned by specific users, teams, vendors or organizations;
- delegation and handoff are explicit;
- routing across authority lanes requires policy and approval evidence;
- conflicts over provider choice, budget, data policy or promotion fail closed;
- revocation and offboarding affect only governed scopes while preserving audit lineage.

## 9. Non-functional requirements

### Security

- Credentials encrypted at rest and protected in transit.
- No raw credentials in prompts, logs, context packets or candidate artifacts.
- Authorization rechecked before dispatch.
- Revocation deterministic for queued and future runs.

### Reliability

- Idempotent binding and usage-event ingestion.
- Typed provider and policy failures.
- Retry/fallback lineage retained.
- Adapter crashes cannot corrupt context or canonical knowledge.

### Observability

- Every execution traceable from task/context through binding/provider/result.
- Missing telemetry represented explicitly.
- Router decisions explain hard rejection and ranking factors.

### Portability

- Provider-specific behavior isolated behind adapters.
- Workflow, memory and tool governance remain provider-neutral.
- Fallback does not require rewriting canonical product artifacts.

## 10. Acceptance criteria

1. A user can register at least two provider types and one local executor through normalized descriptors.
2. Every entitlement requires owner, share policy and credential reference or local-resource identity.
3. Unauthorized workspaces cannot bind an entitlement.
4. A binding cannot be created without a valid context ID/hash.
5. Router code cannot modify context contents.
6. Reported and estimated usage are stored separately.
7. Cross-user provider-session reuse is denied by default.
8. Rate-limited primary execution can create an authorized fallback binding with preserved context lineage.
9. Candidate output cannot self-promote to canonical GKS state.
10. Revocation blocks new dispatch.
11. Cache/session affinity decisions are explainable and invalidated on relevant changes.
12. Runtime claims require automated enforcement tests.

## 11. Suggested implementation slices

### Slice 1 — Capability descriptor

Provider registry and normalized capability inspection.

### Slice 2 — Entitlement ownership

Entitlement schema, authorization policy, lifecycle and vault reference.

### Slice 3 — Governed binding

Context-bound execution target selection and immutable binding record.

### Slice 4 — Usage ledger

Reported/estimated/unknown telemetry and audit lineage.

### Slice 5 — Scheduler

Authorization-first ranking, quota awareness and concurrency control.

### Slice 6 — Affinity and cache

Session affinity, provider prompt-cache refs and verified-result cache.

### Slice 7 — Retry and failover

Rebinding, semantic compatibility checks and escalation.

### Slice 8 — Initial adapters

Codex/OpenAI, Gemini, local runtime, then additional providers under provider-policy evidence.

## 12. Dependencies

- ADR-023 Knowledge Authority vs Context Authority
- ADR-024 Provider Entitlement and Execution Authority Boundary
- API-006 Vault Context and Replay Contracts
- API-007 Knowledge and Context Authority Contract
- API-008 Provider Entitlement, Routing and Usage Contract
- Provider credential-vault threat model
- Runtime policy and enforcement test harness

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-02 | LYRA / ARCHON / ATHER | Defined the vendor-neutral entitlement registry, governed binding, quota-aware scheduling, affinity, cache, failover and usage capabilities. |
