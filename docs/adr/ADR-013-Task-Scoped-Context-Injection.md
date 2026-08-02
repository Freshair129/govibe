---
title: "ADR: Task-Scoped Context Injection"
doc_id: "ADR-013-task-scoped-context-injection"
status: "accepted"
version: "0.1.0"
updated: "2026-06-19"
owner: "ARCHON / ATHER"
source_of_truth: true
related_docs:
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md"
  - "docs/features/genesis-knowledge-system/FEAT-Hybrid-JIT-Context-System.md"
  - "docs/operations/runbooks/RUNBOOK-Bounded-External-Executor-Workflow.md"
---

# ADR: Task-Scoped Context Injection

## Status

Accepted

## Context

GoVibe is moving toward a SaaS execution model where tenant-owned work is separated by `tenantId`, execution is coordinated through workspace-scoped tasks, and bounded support agents execute narrow slices without inflating the lead agent context window.

That direction introduces a practical orchestration problem:

- the main agent must not carry every task's working context forever
- sub-agents must receive enough context to execute safely
- task packets must stay narrow enough for cost control and local or bounded executors
- critical learnings must be promoted without flooding the main agent with every note or chat turn

An existing external module at `D:\The Human Algorithm\T2\agent\orchestrator\Module\CIM\` demonstrates useful primitives:

- phased context construction
- token counting and truncation
- prompt-rule injection
- hot-cache and persistence patterns

However, that module is optimized around full-turn conversational state and identity-heavy prompt assembly. It includes turn persistence, conversation history, self-notes, and full-state cache patterns that do not map cleanly to GoVibe's task-scoped execution model.

GoVibe therefore needs a canonical decision for whether to:

1. build a new context-injection stack from scratch
2. copy the external system wholesale
3. selectively reuse useful primitives and redesign the orchestration layer around GoVibe task boundaries

## Decision

GoVibe will adopt a refine-from-existing approach for context injection.

1. Reuse selected primitives and concepts from the external `CIM` implementation:
   - phased context construction
   - token budgeting and truncation helpers
   - cache persistence patterns where they remain useful
   - rule and identity block injection concepts
2. Do not import or mirror the external module wholesale as GoVibe runtime truth.
3. Build a GoVibe-owned `Context Assembler` layer that constructs task-scoped packets from canonical GoVibe sources.
4. Treat raw conversation history as optional evidence, not default injected context.
5. Default sub-agent execution to bounded packet delivery:
   - baseline policy and role context
   - workspace and module scope
   - task objective and constraints
   - authoritative file and document refs
   - verification expectations
   - critical known issues
6. Require sub-agents to return structured outputs:
   - result summary
   - files touched
   - evidence and verification status
   - critical issues
   - durable learnings
   - promote-to-shared vs keep-private classification
7. Allow the main agent to absorb only critical or durable knowledge, not all sub-agent notes or reasoning traces.
8. Require an escalation path when a sub-agent detects missing context, conflicting truth, or widened dependency scope.

## Consequences

### Positive

- Keeps the main agent context stable while allowing deep task execution through disposable sub-agents.
- Reuses proven utility patterns instead of rediscovering token-budget and persistence behavior from scratch.
- Aligns with GoVibe governance rules that require bounded packets, explicit source-of-truth refs, and evidence-backed closeout.
- Reduces the chance that chat history or stale scratch notes become accidental runtime truth.
- Creates a clean place to integrate tenant, workspace, vault, and module scoping later without rewriting prompt assembly again.

### Negative

- Requires new assembly logic instead of a simple drop-in import.
- Introduces another architecture boundary that must be documented and tested carefully.
- Context completeness can still fail if mandatory packet rules are weak or stale.

### Neutral / Trade-offs

- GoVibe will move slower than a full copy-paste adoption, but avoids carrying assumptions from a different orchestration model.
- Some CIM concepts will survive only as patterns, not as code-level compatibility guarantees.
- Full chat history may still be attached for debugging or audit workflows, but it is not the default delivery shape for sub-agent execution.

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Build a brand-new context injection system from scratch | Unnecessarily expensive when useful primitives already exist and the core problem is assembly policy, not raw token math. |
| Copy the external `CIM` module wholesale into GoVibe | Brings full-turn conversation assumptions, identity-heavy prompt shape, and cache semantics that are not canonical for GoVibe task orchestration. |
| Keep all context in the main agent and avoid sub-agent packetization | Fails the bounded-context goal and increases token cost, drift risk, and review noise over time. |
| Inject raw chat history into every sub-agent by default | Increases noise, cost, stale-context risk, and makes packet safety depend too heavily on agent confidence. |

## Related Documents

- `docs/PRD-GoVibe-Platform-Overview.md`
- `docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md`
- `docs/features/genesis-knowledge-system/FEAT-Hybrid-JIT-Context-System.md`
- `docs/operations/runbooks/RUNBOOK-Bounded-External-Executor-Workflow.md`

## Changelog
| Version | Date | Summary |
|---|---|---|
| 0.1.0 | 2026-06-19 | Accepted task-scoped context injection strategy using reuse-plus-refinement instead of full rewrite or wholesale import. |
