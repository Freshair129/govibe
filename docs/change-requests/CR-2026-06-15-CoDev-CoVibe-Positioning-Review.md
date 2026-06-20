---
doc_id: "CR-2026-06-15-CODEV-COVIBE-POSITIONING-REVIEW"
status: "candidate"
version: "0.1.1b"
updated: "2026-06-20"
owner: "CODEx"
source_of_truth: false
related_docs:
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/architecture/C4-GoVibe-Platform.md"
  - "docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md"
  - "docs/features/integration-bridge/FEAT-MCP-Integration-Bridge.md"
  - "docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md"
---

# Change Request: CoDev and CoVibe Positioning Review

## 1. Purpose

Summarize the current product definition in the PRD and architecture docs, then frame the current discussion about `CoDev`, `CoVibe`, `MCP`, and cross-team interoperability in a way that can be reviewed by the GoVibe agent team before any system rename, feature expansion, or architectural rewrite is approved.

## 2. Current PRD Reading

Current approved-direction signals from the product and architecture documents:

- GoVibe is already defined as an `AI-native visual CoDev and project management platform`.
- GoVibe already positions itself as a `coordination layer`, not a replacement for external coding agents.
- The PRD already includes `multiple developer-owned agent teams` as a first-class audience and runtime participant.
- `SYSTEM-05::Agent-Team-Management-System` already covers agent roster, assignment, workflow, handoff, and external agent integration.
- `SYSTEM-06::Integration-Bridge-System` already covers MCP, API, webhook, local bridge, and other external integration surfaces.
- The PRD and C4 both state that GoVibe should not own provider billing, subscription, quota, or third-party runtime ownership.
- `MCP` is already defined as the primary orchestration interface, not the product identity itself.

## 3. Current Discussion Context

The current discussion is not about whether GoVibe should integrate with external agents. That is already in scope.

The real discussion is about how to describe two different collaboration patterns without causing product drift:

### 3.1 CoDev mental model

> Canonical diagrams: see `FEAT-CoDev-CoVibe-Terminology-Definition` §3. This CR's earlier sketches were superseded; the diagrams below have been corrected to the canonical forms.

```text
[Human / Team A + Agent Team A]
        <=GoVibe / CoDev=>
[Human / Team B + Agent Team B]
```

Interpretation:

- more than one human owner or developer party participates
- each party may have its own agent team, local workflow, local governance, and local visual office
- GoVibe acts as the coordination and governance layer between these parties

### 3.2 CoVibe mental model

```text
[Human]
   <=GoVibe / CoVibe=>
[Main Agent / Main Agent Team]
   <=support=>
[Support Agent / Support Executor]
```

Interpretation:

- one primary owner, solo founder, or solo developer operates the flow
- one main agent or main agent team leads execution
- support agents or secondary executors assist the main agent
- the focus is personal orchestration, vibe coding flow, and bounded support execution

## 4. Problem Statement

GoVibe currently contains concepts that support both patterns, but the naming and boundary between them are not yet explicit enough.

This creates four risks:

1. Product identity drift:
   GoVibe may start to describe itself as too many things at once without clarifying which layer owns which responsibility.

2. Scope creep:
   a useful clarification about collaboration modes may accidentally expand into a new platform rewrite, new protocol standard, or new runtime ownership model.

3. System overlap:
   `SYSTEM-05::Agent-Team-Management-System` and `SYSTEM-06::Integration-Bridge-System` may blur together if `team coordination` and `tool integration` are not separated clearly.

4. Terminology drift:
   terms like `CoDev`, `CoVibe`, `A2A`, `MCP`, `federation`, `freelance executor`, and `dynamic executor` may be used inconsistently across planning, architecture, and feature docs.

## 5. Proposed Direction

Proposed direction for discussion only:

- Keep `GoVibe` as the platform identity.
- Keep `MCP` as the primary orchestration and integration interface.
- Treat `CoDev` and `CoVibe` as two collaboration modes or product modules, not as reasons to redefine the entire platform.
- Treat cross-team interoperability as a coordination concern first, not as a reason to replace local governance inside each participant's agent stack.
- Clarify that GoVibe preserves local autonomy and standardizes exchange, traceability, policy checks, and handoff visibility at the platform boundary.

## 6. Proposed Boundary Model

### 6.1 Platform level

`GoVibe` remains the platform and coordination surface.

### 6.2 System level

No immediate PRD system expansion is proposed in this packet.

The current reading suggests:

- `SYSTEM-05::Agent-Team-Management-System` owns team workflow, assignment, handoff, and multi-agent coordination semantics
- `SYSTEM-06::Integration-Bridge-System` owns MCP/API/webhook/local bridge connectivity to external tools and runtimes

### 6.3 Module or concept level

Discussion proposal:

- `CoVibe` = personal or intra-owner orchestration mode
- `CoDev` = multi-owner or inter-team coordination mode

This means the new idea can likely be represented as a terminology and boundary refinement before creating any new top-level product system.

## 7. Trade-Off Analysis

### Option A: Keep current PRD wording and do nothing

Benefits:

- no documentation churn
- no system remap required
- no naming migration work

Costs:

- the mental model stays blurry
- future features like external executor routing may be placed inconsistently
- discussions about A2A, MCP, and local governance will keep resurfacing

### Option B: Clarify CoDev and CoVibe as platform concepts or modules

Benefits:

- preserves current PRD structure
- reduces scope creep risk
- gives future features a cleaner placement
- aligns with current PRD language that already supports multi-team coordination

Costs:

- requires terminology updates across PRD, C4, feature specs, and possibly roadmap docs
- requires explicit owner approval to avoid semantic drift

### Option C: Re-architect the PRD around new top-level systems immediately

Benefits:

- strong conceptual reset
- cleaner long-term taxonomy if done correctly

Costs:

- high scope creep risk
- high document churn
- likely premature before the collaboration boundary and protocol boundary are fully agreed
- risks rewriting system ownership without enough evidence

## 8. Recommendation

Recommend `Option B`.

Specifically:

- do not redefine GoVibe around a new protocol term at this stage
- do not replace MCP in the current PRD
- do not create a new top-level PRD system yet
- first document `CoDev` and `CoVibe` as bounded collaboration concepts or modules that sit on top of the current PRD system map
- evaluate whether `dynamic executor`, `external executor`, or `freelance executor` belongs primarily under `SYSTEM-05`, `SYSTEM-06`, or a cross-system feature after that terminology is approved

## 9. Questions For Agent Team Review

### LYRA

- Should roadmap and feature planning treat `CoDev` and `CoVibe` as separate workstreams or as modes within one roadmap stream?
- Does this clarification reduce planning ambiguity without expanding committed scope?

### ARCHON

- Is the proposed boundary between `SYSTEM-05` and `SYSTEM-06` architecturally coherent?
- Is a new ADR required before any PRD wording change about platform positioning is approved?

### THESEUS

- What is the lowest-doc-churn way to reflect this clarification across PRD, C4, and feature-level docs?
- Which canonical doc should define the terminology first?

### ATHER

- Does this proposal preserve current SSOT ordering and avoid unauthorized scope expansion?
- What evidence would be required before promoting this from discussion packet to approved doc change?

## 10. Decision Request

This packet requests review only.

No product rename, no PRD restructure, and no implementation change should proceed until the agent team confirms:

- whether `CoDev` and `CoVibe` are concepts, modules, or separate systems
- whether a terminology update alone is sufficient
- whether an ADR is required before any PRD system map change

## CHANGELOG

| Version | Date | Status | Summary | Commit Hash | Agent |
|---------|------|--------|---------|-------------|-------|
| 0.1.1b | 2026-06-20 | candidate | Corrected §3 CoDev and CoVibe mental-model diagrams to canonical forms from FEAT-CoDev-CoVibe-Terminology-Definition §3 and noted the earlier sketches as superseded. | pending | Codex |
| 0.1.0b | 2026-06-15 | candidate | Initial discussion packet summarizing current PRD position, problem framing, proposed direction, and trade-offs for CoDev and CoVibe positioning review. | pending | Codex |
