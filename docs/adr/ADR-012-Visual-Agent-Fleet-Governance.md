---
title: "ADR: Visual Agent Fleet Governance"
doc_id: "ADR-012-visual-agent-fleet-governance"
status: "accepted"
version: "0.1.0"
updated: "2026-06-14"
owner: "ARCHON / THESEUS"
source_of_truth: true
related_docs:
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/features/agent-team/FEAT-Visual-Agent-Fleet-System.md"
  - "docs/architecture/SDD-Visual-Agent-Fleet.md"
  - ".agents/context/CONTEXT-Visual-Agent-Fleet-Scope.md"
---

# ADR: Visual Agent Fleet Governance

## Status

Accepted

## Context

GoVibe needs to coordinate agent identities, fleet roles, job-title equivalents, authority boundaries, scope-control rules, and Mission Control visibility without mutating human-authored process documentation.

The folder `.agents/Visual-Agent-Fleet-Scope/` contains human-dev source material for BA, PO, PM, requirement, acceptance criteria, test case, UAT, prioritization, and scope-control guidance. That material must remain a protected upstream reference. Agents may read and derive compact role context from it, but they must not edit, delete, rewrite, or normalize it in place.

The Visual Agent Fleet also changes the agent registry contract by adding role metadata and changes A5 Agent Management by making it a consumer of role/provenance metadata. That makes this an architecture and governance decision, not only a feature spec.

## Decision

GoVibe will implement Visual Agent Fleet as a derived governance layer:

1. Use a hybrid one-to-one model where major roles with authority or gates map to named agents, while BA/PO guidance remains context-only in v1.
2. Use `fleet_role` for routing/governance and `job_title_equivalent` for human-readable role interpretation.
3. Treat `.agents/Visual-Agent-Fleet-Scope/` as protected human-dev source.
4. Store compact derived context in `.agents/context/` and role-specific context folders.
5. Extend `.agents/agent-registry.yaml` additively with domain, cluster, responsibility, authority, and source refs.
6. Use A5 Agent Management as the v1 visualization surface for role/provenance metadata.
7. Require LYRA to route scope expansion through change-control impact assessment before accepting it into a plan.
8. Require ATHER to block done state when protected source integrity, source refs, authority boundaries, or scope-change evidence are missing.

## Consequences

### Positive

- Human-dev source remains protected while agents get compact context.
- Agent registry becomes more useful for routing, display, and audit without replacing executor policy.
- A5 can show role metadata without implying fake live execution.
- LYRA receives an explicit control point for scope creep.
- ATHER can trace source doc to derived context to registry metadata to UI display.

### Negative

- Registry entries become larger and require discipline to keep metadata current.
- Context packets can drift if source docs change and no derivation refresh happens.
- A5 needs careful labeling so operators do not confuse role/provenance metadata with live runtime status.

### Neutral / Trade-offs

- BA is not a standalone agent in v1. This reduces fleet size and token use, but may need revisiting if requirement workshop volume grows.
- A6 Visual Dev Office remains future-facing. A5 is the first consumer because it already owns Agent Management.

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Strict one-to-one agent for every career role | Creates too many agents before authority and handoff boundaries are proven. |
| Put BA/PO logic directly into LYRA only | Increases risk that PM planning becomes unilateral requirement interpretation. |
| Edit `.agents/Visual-Agent-Fleet-Scope/` into agent-ready docs | Violates protected human-dev source policy and risks losing original workshop material. |
| Build A6 first | Larger UI scope and not required for v1 governance visibility. |
| Keep registry unchanged and use docs only | Makes routing/display/audit metadata harder to consume consistently. |

## Related Documents

- `docs/PRD-GoVibe-Platform-Overview.md`
- `docs/features/agent-team/FEAT-Visual-Agent-Fleet-System.md`
- `docs/architecture/SDD-Visual-Agent-Fleet.md`
- `.agents/context/CONTEXT-Visual-Agent-Fleet-Scope.md`
