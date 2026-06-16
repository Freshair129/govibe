# Planning Decomposition Standard

LYRA decomposes product intent into work that agents can execute safely.

Quota-aware local execution is governed by `docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md`.

## Hierarchy
```text
Master Plan
+-- Roadmap
    +-- Phase
        +-- Epic
            +-- Sprint
                +-- Task
                    +-- Sub-task
                        +-- Micro-task
                            +-- Atomic-task
```

## Level Definitions
| Level | Meaning | Owner | Typical H Tier | Output |
|---|---|---|---|---|
| Master Plan | Product-wide operating plan | Product owner + PM | H5 | Master plan |
| Roadmap | Multi-phase delivery direction | PM | H5 | Roadmap |
| Phase | Major delivery slice | PM + Architect | H4 | Phase plan |
| Epic | Cross-feature capability | PM + Architect | H3 | Epic brief |
| Sprint | Short-horizon execution plan | PM + Lead | H2 | Sprint plan |
| Backlog Item | Prioritized work item | PM | H1-H2 | Backlog row |
| Task | Implementable unit | Lead/agent | H1 | Task spec |
| Sub-task | PR-sized action | Agent | H0-H1 | Checklist |
| Micro-task | Small local LLM work packet | Agent/local LLM | H0 | Context-limited checklist item |
| Atomic-task | Single local LLM action | Agent/local LLM | H0 | One-action instruction |

## Decomposition Rules
- Do not create micro-tasks before the sprint/task goal is clear.
- Do not create implementation tasks without acceptance criteria.
- Do not split tasks by arbitrary file names; split by verifiable outcome.
- Prefer small tasks that can be completed and verified by one agent.
- Keep dependencies explicit.
- Escalate planning level when cross-system impact appears.
- Use micro-tasks and atomic-tasks for local LLMs with 8k-16k context limits.
- Atomic-tasks must contain one action, one target, and one verification check.
- Use quota-aware decomposition when a narrow local LLM packet can save primary Claude/Codex/Gemini quota without increasing risk.
- Treat RTX 3060 12GB VRAM as the current local hardware class for packet sizing, not as a hard product dependency.
- Do not assign architecture, scope approval, cross-repo truth, or broad context synthesis to local LLM packets.
- Escalate back to the lead agent when a micro-task exceeds 16k context or an atomic-task requires more than one action.

## Ready Criteria
A backlog item is ready when it has:

- PRD system
- title
- user/system outcome
- priority
- C/H classification
- dependencies
- acceptance criteria
- verification expectation
- owner or suggested agent team

## Local LLM Packet Requirements
Micro-task packet:

```text
source excerpt:
target path:
instruction:
constraints:
acceptance check:
model name:
max context: 8k or 16k
predicted token usage:
rollback note:
escalation rule:
```

Atomic-task packet:

```text
target:
single action:
acceptance check:
model name:
rollback note:
max context: 8k
predicted token usage:
escalation rule:
```

## Done Criteria
A backlog item is done when:

- acceptance criteria pass
- verification evidence exists
- traceability is updated
- auditor gate passes when required
