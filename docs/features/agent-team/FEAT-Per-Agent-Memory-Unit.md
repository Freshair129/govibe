---
title: "FEAT: Per-Agent Memory Unit"
doc_id: "FEAT-PER-AGENT-MEMORY-UNIT"
status: "draft"
version: "0.2.1+draft"
updated: "2026-08-19"
owner: "ARCHON / ATHER"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - "docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md"
  - "docs/architecture/SDD-GoVibe-MSP-GKS-Integration.md"
  - "docs/features/genesis-knowledge-system/FEAT-Hierarchy-Compaction-System.md"
  - "docs/features/genesis-knowledge-system/FEAT-GenesisBlockDB-Core.md"
  - "docs/features/traceability-audit/FEAT-Bi-Temporal-Versioning.md"
  - ".agents/FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS.md"
  - "docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md"
  - "docs/srs/SRS-Persistent-Memory-MSP-Runtime.md"
  - "docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md"
  - "docs/api/API-009-Persistent-Memory-Contract.md"
---

# FEAT: Per-Agent Memory Unit

## 1. Goal

Give each governed agent a **bounded, tiered memory unit** so agents accumulate experience
(continuity of identity/behaviour) and stop repeating mistakes — **without** letting a private
agent memory become unverified "truth" (anti-hallucination).

The design **composes existing GoVibe primitives** (MSP, GKS, GenesisBlockDB, Verify Gate,
bitemporal versioning) rather than rebuilding storage, retrieval, or compaction.

## 2. Why This Exists

- GoVibe orchestrates many agents, but they are amnesiac per run. Hard-won lessons (e.g.
  "`pnpm exec clippy` does not exist") are lost and repeated across runs.
- Adding per-agent memory naively turns into a **hallucination amplifier**: N agents each
  accumulate private, unverified beliefs that never reconcile, so the fleet drifts apart.
- The fix is to separate per-agent **EXPERIENCE** from shared verified **TRUTH**, with a
  **promotion gate** between them.
- This feature ports the *runnable* subset of the predecessor EVA Memory OS (the linked
  Episodic/Semantic/Sensory unit + 8-8-8 distillation + epistemic states + Latched Contextual
  Anchors), **re-grounded for software engineering**. The biological / emotional / qualia layers
  of that system are explicitly out of scope (R&D only).

## 3. Scope

Retrieval radius (`R0`–`R6`) follows the canonical Retrieval Radius scale in
`.agents/FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS.md` §3; executor Access Scope (`H0`–`H4`) is a
separate, independently-declared concern per `ADR-021`.

Included:

- tiered memory unit (`T0` / `T1` / `T2`) by agent lifetime, not per task instance
- the 3-file episodic unit (`Episodic` / `Observation` / `Semantic`) re-grounded for SWE
- per-entry epistemic + bitemporal metadata
- promotion pipeline: private episodic → shared GKS via the Verify Gate
- Latched Contextual Anchor (LCA) conflict resolution at the shared layer
- temporal Memory Distillation (8-8-8 cadence), distinct from spatial Hierarchy-Compaction

Excluded:

- biological / physiological simulation, emotion / qualia layers (predecessor "soul" layer)
- affective interpretation of observations (no "feelings" — observations are raw signals)
- rebuilding storage, retrieval, or compaction (reuse GenesisBlockDB / GKS / MSP / H-scale)
- giving ephemeral pool workers a full memory lifecycle

## 4. Functional Requirements

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-001 | Agents are classified into memory tiers `T0` (ephemeral), `T1` (role), `T2` (named/persistent). | Tier is resolved from `agent-registry.yaml`; ephemeral pool workers resolve to `T0`. |
| FR-002 | The unit uses 3 linked files re-grounded for SWE: `Episodic`, `Observation`, `Semantic`. | `Observation` records raw tool/compiler/test/diff signals, never affective state. |
| FR-003 | Every memory entry carries an epistemic state and confidence. | Entry has `epistemic_state ∈ {Hypothesis, Confirmed, Contested, Deprecated}` + `confidence`. |
| FR-004 | Every entry carries bitemporal fields, reusing the existing versioning primitive. | Entry has `valid_from/valid_to` + `recorded_at/superseded_at` per `FEAT-Bi-Temporal-Versioning`. |
| FR-005 | A private episodic memory is never treated as truth until promoted through the Verify Gate. | Promotion to shared GKS requires gate pass (reviewer or ≥N independent confirmations); pre-promotion state is `Hypothesis`. |
| FR-006 | Conflicting shared claims are resolved deterministically (LCA), not silently overwritten. | Resolution applies temporal → evidence-strength → granularity → recency; the loser is marked `Deprecated` and retained. |
| FR-007 | Temporal distillation (8-8-8) applies only at `T1`/`T2` and is named distinctly from spatial compaction. | Distillation runs for role/named/project memory only; output atoms flow into GKS; the term "compaction" is reserved for the spatial `D`/`H` scale. |
| FR-008 | The unit composes existing systems; no new storage/retrieval/compaction engine is built. | Storage = GenesisBlockDB; knowledge = GKS; passport/retrieval = MSP; scope = H-scale; gate = Verify Gate. |

## 5. Tier Model

| Tier | Applies to | Memory unit | Distillation |
|---|---|---|---|
| **T0 — Ephemeral** | pool workers (created per task, discarded) | **failure-log slice only** (write-only to shared): "tried X → Verify Gate said Y" | none (feeds the role unit) |
| **T1 — Role** | role aggregate (coder, reviewer, architect) | `Episodic` + `Semantic` (accumulated lessons/patterns per role) | 8 runs → role-core |
| **T2 — Named/Persistent** | named agents (e.g. LYRA, ATHER) + project memory | full Diamond (`Episodic` + `Observation` + `Genesis` + `Semantic`) + identity/persona | full 8-8-8 → sphere (role/project wisdom) |

> Default rollout starts at `T0` only. `T1`/`T2` are enabled per agent once continuity is shown
> to pay off, to avoid re-introducing predecessor-grade over-engineering.

## 6. Memory Unit Structure (3-file, re-grounded)

| Predecessor file | GoVibe file | Content |
|---|---|---|
| Episodic | **Episodic** | run/turn log: what the agent did, decisions, sequence |
| Sensory | **Observation** | raw signals: compiler/test output, errors, diffs, tool results |
| Semantic | **Semantic** | distilled lessons/concepts (e.g. "this repo uses pnpm workspaces") |

Linked as a **Diamond**: `Episodic ↔ Observation → Genesis (GKS rule/algo triggered) → Semantic
(concept extracted)`. This enables the deep query *"why did this agent decide X?"* — i.e.
traceable, explainable agent behaviour.

## 7. Entry Schema (per memory unit entry)

```yaml
entry_id:
agent_id:                 # or role_id for T1
tier:                     # T0 | T1 | T2
file:                     # episodic | observation | semantic
epistemic_state:          # Hypothesis | Confirmed | Contested | Deprecated
confidence:               # 0.0 - 1.0
valid_from:               # bitemporal (LCA)
valid_to:
recorded_at:              # audit (temporal-versioning.mjs)
superseded_at:
scope:                    # agent-private | role-shared | project-shared
source_refs: []           # episode / observation IDs (Diamond traceability)
```

## 8. Promotion Pipeline (the anti-hallucination core)

```text
agent episodic (private, Hypothesis)
  -> [Memory Distillation: 8 runs -> role-core]
  -> Semantic concept (Contested until verified)
  -> [Verify Gate / belief-revision: confirmed by reviewer OR >= N independent runs]
  -> promote -> shared GKS (Confirmed = project truth)
```

Hard rule: **a private episodic memory never becomes shared truth until it passes the gate.**
This is the same gate as the Verify Gate used for task output, applied to memory promotion.

## 9. Conflict Resolution (LCA)

When two shared claims conflict (e.g. "repo uses X" vs "repo uses Y"), resolve in order:

1. **Temporal** — `valid_from/valid_to` (X true before a refactor, Y after).
2. **Evidence strength** — more independent confirmations win.
3. **Granularity** — specific overrides general.
4. **Recency** — newer identity/state supersedes older.

The result is a single reconciled GKS truth; the losing claim is marked `Deprecated` and retained
(bitemporal history, not deleted).

## 10. Composition With Existing Systems

| Capability needed | Reused GoVibe system |
|---|---|
| storage (vector + graph + bitemporal) | GenesisBlockDB (`FEAT-GenesisBlockDB-Core`) |
| knowledge atoms | GKS |
| passport / retrieval | MSP (V3) |
| spatial pack + retrieval scope | Hierarchy-Compaction `D`/`H` scale |
| promotion / verification gate | Verify Gate |
| audit time fields | `temporal-versioning.mjs` (`FEAT-Bi-Temporal-Versioning`) |
| **net-new** | episodic-unit schema + 8-8-8 distillation cadence + promotion pipeline + LCA reconcile |

## 11. Concrete Persistence and Retrieval Realization (ADR-027)

Sections 4 and 10 above specify this feature's persistence/retrieval
requirement compositionally ("storage = GenesisBlockDB; knowledge = GKS;
passport/retrieval = MSP") without naming where that MSP-side persistence
actually runs. `docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md`
resolves that: the MSP runtime backing this feature's memory unit is
`packages/msp-runtime`, an in-repo package spawned as a separate OS process
per `docs/adr/ADR-026-MSP-External-Runtime-Deployment.md`, never imported as
a library into GoVibe's own server process.

`docs/srs/SRS-Persistent-Memory-MSP-Runtime.md` and
`docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md` are the concrete
requirements and design records for that runtime; this FEAT document remains
the product-level contract for *why* per-agent memory exists and what shape
it takes (tiers, epistemic states, promotion pipeline, LCA), while the SRS/SDD
own *how* it is stored and retrieved. `docs/api/API-009-Persistent-Memory-Contract.md`
is the wire contract for the `msp_memory_*` tool surface this feature's
future implementation calls.

Two items from this FEAT's own contract map directly onto the runtime:

- The bitemporal entry schema in §7 (`valid_from`/`valid_to`,
  `recorded_at`/`superseded_at`) is implemented by
  `packages/msp-runtime`'s `domain/temporal-engine`, a vendored port of
  `scripts/mcp/temporal-versioning.mjs` semantics — the same primitive named
  in §10's composition table, now with a concrete implementation location.
- The promotion pipeline in §8 still routes through the existing Verify Gate
  before any claim becomes shared GKS truth; the runtime's own
  `msp_knowledge_promote`/`msp_memory_promote` (`target_scope=shared`) stay
  fail-closed (`gks_provider_unconfigured`) until a real GKS provider exists,
  consistent with this FEAT never having claimed shared promotion is solved.

This subsection does not change this feature's tier model, entry schema,
promotion pipeline, or LCA conflict resolution (Sections 5, 7, 8, 9 are
unchanged). `T0`/`T1`/`T2` tiering, 8-8-8 distillation, and LCA reconciliation
remain explicitly out of scope for the runtime's first implementation slice
(see the exclusions in
`docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md`);
this feature's acceptance criteria below are not satisfied merely because the
runtime package exists — they require the tiering and promotion behavior
this FEAT specifies, which is separate, later work.

## 12. Acceptance Criteria

- A canonical, governed contract exists for a tiered per-agent memory unit.
- Ephemeral workers carry only a failure-log slice; full units are reserved for `T1`/`T2`.
- `Observation` is defined as raw SWE signals, not affective state.
- No private memory can become shared truth without passing the Verify Gate.
- Conflicting shared claims resolve deterministically via LCA, retaining history.
- 8-8-8 distillation is named distinctly from spatial compaction and reuses GKS for output.
- No new storage/retrieval/compaction engine is introduced.

## 13. Success Criteria

- Repeated failures (e.g. hallucinated tooling) drop after a lesson enters role/shared memory.
- Frontier-token spend on re-deriving known context drops (distilled memory reused).
- Fleet beliefs stay reconciled (no two agents acting on contradictory shared "facts").
- Every promoted memory is traceable to its source episode/observation (explainability).

## 14. Definition Of Done

- Feature doc registered in `docs/DOC-VERSION-REGISTRY.md`.
- `docs:validate` passes.
- `docs/architecture/SDD-GoVibe-MSP-GKS-Integration.md` references this contract for the
  episodic-unit + distillation + promotion wiring.
- `docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md` references this contract as the
  product-level source for the runtime's persistence/retrieval requirement.
- Future implementation plans can cite this doc when adding per-agent memory.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.1+draft | 2026-08-19 | ATHER | Corrected abolished H-axis semantics per ADR-021/AUD-14 (TASK-PRD-022 sweep): §3 "Context tiers (H0-H6)... Context Scaling Tier scale" renamed "Retrieval radius (R0-R6)... Retrieval Radius scale" per the FRAMEWORK doc it cites. |
| 0.2.0+draft | 2026-08-04 | Claude (final-gate session) | Added Section 11, pointing this feature's persistence/retrieval requirement at `docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md` and `packages/msp-runtime` as the concrete realization; renumbered Acceptance Criteria/Success Criteria/Definition of Done to 12/13/14 without changing their content; added SRS/SDD/API-009 to related_docs and to Definition of Done. Tier model, entry schema, promotion pipeline, and LCA resolution (Sections 5, 7, 8, 9) are unchanged. |
| 0.1.0+draft | 2026-06-23 | ARCHON / ATHER | Initial tiered per-agent memory unit contract: T0/T1/T2 tiers, 3-file re-grounded unit, epistemic + bitemporal entry schema, Verify-Gate promotion pipeline, LCA conflict resolution, 8-8-8 distillation distinct from spatial compaction, composition over rebuild. |
