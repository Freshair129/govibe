---
title: "ADR: Per-Agent Memory via Composed Tiered Units (EVA Memory-OS Subset Port)"
doc_id: "ADR-020-PER-AGENT-MEMORY-UNIT"
uid: "01KVXGFSJKC7YPNS9B0PY63X77"
status: "proposed"
version: "0.1.0+draft"
content_hash: "atom:d0e5e97d713b69dc"
updated: "2026-06-23"
owner: "ARCHON / ATHER"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - ".agents/FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS.md"
  - "docs/adr/ADR-014-MSP-GKS-Traceability-Gate.md"
  - "docs/adr/ADR-016-Full-Stack-Mandatory-Swappable-Backend.md"
  - "docs/adr/ADR-018-Structural-Decomposition-Containment-Wikilink.md"
  - "docs/architecture/SDD-GoVibe-MSP-GKS-Integration.md"
  - "docs/features/agent-team/FEAT-Per-Agent-Memory-Unit.md"
  - "docs/features/genesis-knowledge-system/FEAT-Hierarchy-Compaction-System.md"
  - "docs/features/traceability-audit/FEAT-Bi-Temporal-Versioning.md"
---

# ADR: Per-Agent Memory via Composed Tiered Units (EVA Memory-OS Subset Port)

## Status

Proposed. Awaiting GoVibe human-owner sign-off (`docs:register` → `docs:ratify`). This decision
governs `FEAT-PER-AGENT-MEMORY-UNIT` (draft); the feature cannot be ratified until this ADR is
accepted.

## Context

- GoVibe orchestrates many agents, but they are amnesiac per run. Hard-won lessons (e.g.
  "`pnpm exec clippy` does not exist") are lost and repeated. Re-derivation burns frontier
  tokens, and repeated tool-hallucinations trigger expensive frontier rework cycles.
- GoVibe is building its memory subsystem (MSP V3 + GKS) by porting from a mature predecessor,
  the EVA Memory OS (v9.6.2). That predecessor provides a per-self **episodic 3-file unit**
  (Episodic/Sensory/Semantic), **8-8-8 distillation**, **epistemic states**, and **Latched
  Contextual Anchors** (bitemporal conflict resolution) — but also un-shippable layers
  (physiological simulation, emotion, qualia).
- Naively giving each agent its own memory risks a **hallucination amplifier**: N agents each
  accumulate private, unverified beliefs that never reconcile, so the fleet drifts apart.
- Constraints: (a) **compose, don't rebuild** — reuse MSP/GKS/GenesisBlockDB/Verify-Gate/
  bitemporal per ADR-016; (b) **do not re-introduce predecessor over-engineering** (the EVA
  Memory OS is 11 systems × 7 levels); (c) the cost wedge (local-SLM token savings,
  `FEAT-QUOTA-AWARE-LOCAL-LLM-DECOMPOSITION`) depends on agents not repeating failures.

## Decision

1. **Adopt Option A — composed, tiered per-agent memory** as specified in
   `FEAT-PER-AGENT-MEMORY-UNIT`.

2. **Port only the runnable subset** of the EVA Memory OS, **re-grounded for software
   engineering**: the 3-file unit with `Sensory → Observation` (raw tool/compiler/test/diff
   signals, never affect), `Memory Distillation` (8-8-8), epistemic states, and LCA. Biology,
   emotion, and qualia layers are explicitly **out of scope** (R&D narrative only).

3. **Tiered model `T0`/`T1`/`T2`.** Ephemeral pool workers carry only a failure-log slice
   (`T0`); role aggregates carry `Episodic`+`Semantic` (`T1`); named/persistent agents and
   project memory carry the full Diamond + identity (`T2`). **Default rollout is `T0` first**;
   `T1`/`T2` are enabled per agent only after continuity demonstrably pays off. Memory is keyed
   by **role / named-agent, not per ephemeral instance**.

4. **Anti-hallucination by construction.** Every memory entry carries an epistemic state
   (`Hypothesis | Confirmed | Contested | Deprecated`). A **private episodic memory never
   becomes shared truth until it passes the promotion gate** — which is the existing **Verify
   Gate**. Conflicting shared claims are resolved by **LCA** (temporal → evidence-strength →
   granularity → recency); the losing claim is marked `Deprecated` and retained (bitemporal),
   never silently overwritten.

5. **Compose, not rebuild.** Storage = GenesisBlockDB; knowledge = GKS; passport/retrieval =
   MSP (V3); spatial scope = Hierarchy-Compaction (`D`/`H`); promotion = Verify Gate; audit
   time = `temporal-versioning`. **Net-new is only**: the episodic-unit schema, the 8-8-8
   cadence, the promotion pipeline, and the LCA reconcile step.

6. **Naming discipline.** 8-8-8 is named **"Memory Distillation"** (a *temporal* axis) and kept
   distinct from the *spatial* **"Hierarchy-Compaction"** (`D`/`H` scale), per the ADR-018
   H-vs-D collision lesson. The term "compaction" is reserved for the spatial scale.

## Consequences

### Positive

- Agents accumulate experience → fewer repeated failures → fewer expensive frontier rework
  cycles. This directly serves the local-SLM token-saving wedge (a failed local run otherwise
  escalates to output-heavy frontier rework).
- Continuity of identity/persona across runs — the original Memory-OS goal.
- Agent decisions become traceable/explainable via the Diamond
  (`Episodic ↔ Observation → Genesis → Semantic`) → EU-AI-Act-style "why did it do X".
- Anti-hallucination is structural (epistemic state + promotion gate), not bolted on.
- Low new surface area; reuses the existing governed stack.

### Negative

- Tiering plus the promotion gate add orchestration complexity.
- Per-agent memory across N agents grows storage/distillation load (mitigated by `T0`-first,
  per-role aggregation, and 8-8-8 distillation).
- A lesson takes one promotion-gate round before it becomes shared truth (latency between an
  agent learning and the fleet benefiting).

### Neutral / Trade-offs

- The decision is recorded now; implementation is gated by `FEAT-PER-AGENT-MEMORY-UNIT`
  acceptance and is not "done" until that feature's acceptance criteria pass.
- `T1`/`T2` are deliberately staged behind `T0` to avoid re-importing predecessor-grade
  over-engineering; this trades some early capability for architectural restraint.

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| B. Full EVA Memory OS port (11 systems incl. physio/emotion/qualia) | Un-shippable "soul" layer; the predecessor itself ("EVA v2 Practical Edition") already cut it; re-introduces the v1 over-engineering trap. |
| C. No per-agent memory / shared-only memory | Loses continuity and the anti-error-loop token savings; agents keep repeating the same failures. |
| D. Naive per-agent memory (no epistemic state, no promotion gate) | Hallucination amplifier — N agents accumulate private, unreconciled false beliefs. |
| E. New per-agent memory store/engine for agents | Rebuilds GenesisBlockDB/GKS/MSP; violates the compose-not-rebuild stance (ADR-016). |
| F. Per-instance memory (every ephemeral worker keeps a lifecycle) | Throwaway workers do not recur; nothing to distill; cost/complexity with no continuity payoff. Aggregate per role/named-agent instead. |

## Related Documents

- `docs/features/agent-team/FEAT-Per-Agent-Memory-Unit.md`
- `docs/architecture/SDD-GoVibe-MSP-GKS-Integration.md`
- `docs/features/genesis-knowledge-system/FEAT-Hierarchy-Compaction-System.md`
- `docs/features/traceability-audit/FEAT-Bi-Temporal-Versioning.md`
- `docs/adr/ADR-014-MSP-GKS-Traceability-Gate.md`
- `docs/adr/ADR-016-Full-Stack-Mandatory-Swappable-Backend.md`
- `.agents/FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS.md`

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-23 | ARCHON / ATHER | Initial decision: composed, tiered per-agent memory (Option A); runnable EVA Memory-OS subset port re-grounded for SWE; epistemic-state + Verify-Gate promotion for anti-hallucination; LCA bitemporal conflict resolution; 8-8-8 "Memory Distillation" named distinct from spatial Hierarchy-Compaction; governs FEAT-PER-AGENT-MEMORY-UNIT. |
