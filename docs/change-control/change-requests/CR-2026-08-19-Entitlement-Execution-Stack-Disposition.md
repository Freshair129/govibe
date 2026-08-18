---
title: "CR: Entitlement Execution and Credential Stack Disposition"
doc_id: "CR-2026-08-19-ENTITLEMENT-EXECUTION-STACK-DISPOSITION"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-19"
owner: "Boss (CEO)"
proposal_author: "ARCHON"
decision_owner: "Boss (CEO)"
source_of_truth: true
complexity: "C-2"
access_scope: "H1"
risk: "MEDIUM"
parent_change_request: "CR-2026-08-02-MULTI-PROVIDER-ENTITLEMENT-ROUTING"
related_adrs: ["ADR-023", "ADR-024", "ADR-028"]
related_apis: ["API-007", "API-008"]
related_docs:
  - "docs/roadmap/MASTERPLAN-govibe-production-readiness.md"
  - "docs/change-requests/CR-2026-08-03-Execution-Binding-v1-Lifecycle-and-Legacy-Sunset-Decision.md"
  - "docs/change-control/TODO-Execution-Binding-Lifecycle.md"
  - "docs/assurance/audit/EVIDENCE-Provider-Entitlement-Runtime-Conformance.md"
  - "docs/assurance/audit/EVIDENCE-WP-10-Execution-Binding-v1-Consumer-Discovery.md"
---

# CR: Entitlement Execution and Credential Stack Disposition

## 1. Decision requested

TASK-PRD-025 (readiness masterplan §3.3, AUD-03) requires an owner decision on
the ~17 contract-complete govibe-core modules that today have **no runtime
consumer**: the live agent paths (`govibe.agent.run` PowerShell launcher, StEP,
A9 PTY sessions) dispatch with no binding, capability plan, budget, or tier
decision, while the governed executor stack runs only in tests. Leaving the
stack ambient is not an option: it reads as implemented capability in audits
while enforcing nothing (the audit's false-completeness pattern).

This CR proposes a **phased disposition** (Section 5) and asks Boss to select
in Section 6. It does not itself promote ADR-024, ADR-028, API-007, or API-008
— it states, per option, exactly which ratifications each choice forces. The
2026-08-03 owner decision (do not promote API-008; keep ADR-024 out of
accepted use until its lifecycle is resolved) remains binding until Boss
selects here.

## 2. Module inventory and per-module recommendation

Dependency cost: LOW = wiring only, no new machinery; MED = wiring plus a
durable-store or adapter implementation; HIGH = new subsystem or external
dependency. "Ratification" = what must be promoted before the module may
govern live execution.

| Module | Recommendation | Dependency cost | Ratification implication |
|---|---|---|---|
| `execution-capability-planner.mjs` | **INTEGRATE** (phase 1) | LOW — pure planning, consumed by router | ADR-024 accepted (scoped to §2.1 two-phase routing) |
| `execution-router.mjs` | **INTEGRATE** (phase 1) | LOW — pure scoring over planner output | same |
| `execution-binding-service.mjs` | **INTEGRATE** (phase 1) | MED — in-memory Map today; needs a durability decision (accept per-process bindings or journal) | same |
| `executor-adapter.mjs` (registry + dispatch gate) | **INTEGRATE** (phase 1) | MED — needs one concrete `run` (Section 4) | same; consumes API-007 context authority (live since TASK-PRD-024) |
| `provider-adapters.mjs` (local-compute / subscription-CLI factories) | **INTEGRATE** (phase 1, one adapter) | MED — wrap `scripts/agents/invoke-agent.ps1` as the first real `run` | same |
| `provider-adapter-host.mjs` | **INTEGRATE** (phase 1) | LOW — result-shape guard, already strict | same |
| `credential-vault.mjs` / `credential-durable-backend.mjs` / `credential-handoff.mjs` | **INTEGRATE via TASK-PRD-028** (already tasked) | MED — wire connector-token storage + child-env allowlist; crypto and tests already exist | ADR-028 can stay draft for local single-tenant use; multi-tenant binding still requires ADR-028 acceptance |
| `provider-entitlement-registry.mjs` | **DEFER** | MED | API-008 promotion — owner deferred 2026-08-03; nothing today has two providers to arbitrate |
| `provider-compatibility-registry.mjs` | **DEFER** | MED | same |
| `provider-session-registry.mjs` | **DEFER** (revisit with A9 multi-session governance) | MED | same |
| `entitlement-usage-ledger.mjs` | **DEFER** | HIGH — in-memory despite the gate naming a durable backend; needs a persistence design first | same |
| `provider-entitlement-conformance-gate.mjs` | **KEEP AS GATE** (test-lane only) | LOW | none — it already refuses `live_provider_execution` PASS without provider evidence; it is the honest scorekeeper for this CR |
| `replay-provider.mjs` | **DEFER with a pinned test** (AUD-21: today it has zero consumers AND zero tests) | LOW for the test; MED to consume | none for the test; API-006 already approved for the contract it implements |
| `canonical-materialization.mjs` | **DEFER** | LOW — contract wrapper; the deep-scan per-stage path (live since TASK-PRD-023) covers current promotion needs | none |
| `mode2/` (12 files) | **DEFER pending Mode 2 charter** — the driving document is an untracked, ungoverned draft (§3.3 AUD-31) | HIGH | Mode 2 scope must enter governance before this pipeline gets a consumer |
| `poc/` (7 files) | **KEEP as isolated reference** until AUD-09 productionization | none | none — never importable from production (verified) |

## 3. What breaks today without the stack (the cost of "defer everything")

- No scope check: the launcher runs any task with the server's full
  capability, regardless of the task's declared C/H (H is admission-checked at
  two points only; execution is unbounded — AUD-23).
- No binding authenticity or actor=principal check (`executor-adapter.mjs`
  §8-field scope match never runs).
- No failure classification, rebind, or usage accounting on agent runs; StEP
  retries are blind re-spawns with tier escalation only.
- The credential boundary stays bypassed (plaintext PM tokens, full env
  inheritance) until TASK-PRD-028 lands.

## 4. Integrate option — exact attach points (SC evidence)

1. **`GovibeRuntime.runAgent` (`scripts/mcp/runtime-core.mjs:192-233`)** — wrap
   the PowerShell launcher as `createSubscriptionCliAdapter({ run })` where
   `run` spawns `scripts/agents/invoke-agent.ps1` exactly as today; register it
   in the executor registry at construction (`runtime-core.mjs:80`); replace
   the direct spawn with `executorRegistry.execute({ binding, request })`,
   issuing the binding from `execution-binding-service` with the capability
   plan for the task and the context lineage from the (now live) continue
   packet. Without this, dispatch bypasses every gate in `executor-adapter.mjs:283-354`.
2. **StEP (`scripts/mcp/runtime/orchestration-service.mjs` → `step.mjs`)** —
   same dispatch call replaces the inline agent invocation; retry/tier
   escalation moves onto the router's rebind path (`execution-router.mjs:303-343`),
   which already refuses rebinding when context lineage changed.
3. **A9 PTY sessions (`scripts/mcp/runtime/agent-session-service.mjs`)** — phase 2:
   session start registers in `provider-session-registry` and draws its child
   environment from the credential boundary (TASK-PRD-028) instead of
   `process.env` (line 176). Interactive PTY streams stay outside the
   binding gate in phase 1 (declared limitation, recorded in §3.3 AUD-23).

## 5. Recommended selection (phased)

- **D-01 INTEGRATE phase 1**: planner + router + binding + adapter host +
  one subscription-CLI adapter, attached at `runAgent` and StEP (Section 4.1-4.2).
  Forces: ADR-024 acceptance scoped to the two-phase routing boundary; API-008
  stays draft (no entitlement arbitration in phase 1).
- **D-02 CREDENTIALS**: execute as already-tasked TASK-PRD-028 (no new decision).
- **D-03 DEFER with recorded dispositions**: entitlement/compatibility/session
  registries, usage ledger, mode2, canonical-materialization — each carries a
  `deferred` disposition row in `docs/change-control/TODO-Execution-Binding-Lifecycle.md`
  and stays excluded from any completeness claim.
- **D-04 replay-provider**: author its missing test now; consumption deferred.
- **D-05 poc/**: remains the isolated reference implementation for AUD-09.

## 6. Owner decision record

| ID | Selection | Decision (Boss) | Recorded at |
|---|---|---|---|
| D-01 | Integrate phase-1 dispatch gate at runAgent + StEP | pending | - |
| D-02 | Credential boundary via TASK-PRD-028 | pending | - |
| D-03 | Defer entitlement registries, ledger, mode2, canonical-materialization with recorded dispositions | pending | - |
| D-04 | Pin replay-provider with a test; defer consumption | pending | - |
| D-05 | Keep poc/ as isolated reference | pending | - |

On selection, follow-up implementation tasks are opened in the readiness
masterplan under SPR-PRD-07 (or a new sprint if Boss prefers), and the §3.3
AUD-03/AUD-21/AUD-23 dispositions are updated to cite this CR.

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.1.0+draft | 2026-08-19 | Initial disposition brief authored for TASK-PRD-025 from the 2026-08-19 audit's AUD-03 finding, honoring the 2026-08-03 owner deferral of API-008/ADR-024 promotion. |
