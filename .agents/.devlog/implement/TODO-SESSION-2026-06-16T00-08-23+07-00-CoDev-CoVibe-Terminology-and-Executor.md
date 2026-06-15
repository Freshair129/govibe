# TODO: Next Session for CoDev CoVibe Terminology and Executor

```yaml
session_anchor: SESSION-2026-06-16T00-08-23+07-00-CoDev-CoVibe-Terminology-and-Executor
status: pending
priority: high
owner_chain:
  planning: LYRA
  architecture: ARCHON
  documentation: THESEUS
  audit: ATHER
updated: 2026-06-16T00:12:00+07:00
```

## Next Session Goals

1. Rename the CoVibe executor docs to SWE-friendly names.
2. Propagate narrow `CoDev` / `CoVibe` terminology into the PRD.
3. Prepare one bounded pilot packet for Gemini CLI as external executor.

## Ordered TODO

- [ ] Rename `docs/runbooks/RUNBOOK-CoVibe-Freelance-Executor.md`
- [ ] Rename `.agents/context/CONTEXT-CoVibe-Freelance-Executor.md`
- [ ] Rename `docs/change-requests/feedback/RUNBOOK-CoVibe-Freelance-Executor-feedback.md`
- [ ] Update all cross-links after rename
- [ ] Add a small `Terminology` section to `docs/PRD-GoVibe-Platform-Overview.md`
- [ ] Sync terminology wording in `docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md`
- [ ] Decide the first bounded pilot task
- [ ] Write `PILOT-01` packet
- [ ] Attach context container and run Gemini CLI trial
- [ ] Record trial result, token cost, and scope-control notes

## Guardrails

- Do not expand PRD system map without a new approval step.
- Do not touch C4 until PRD terminology propagation is drafted.
- Keep pilot scope narrow enough for one external executor packet.
