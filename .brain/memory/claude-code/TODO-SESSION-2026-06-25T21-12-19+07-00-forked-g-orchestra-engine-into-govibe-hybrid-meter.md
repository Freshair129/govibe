# TODO — forked-g-orchestra-engine-into-govibe-hybrid-meter
**Agent:** claude-code   **Session:** 8098390c-4330-4d44-aee6-9cf17d3b5ed5   **Ended:** 2026-06-25T21-12-19+07-00

- [ ] HYB-05 RM-010 — Thai/SEA GTM motion (non-code; needs the owner): a landing page, an announcement, and the first beachhead conversation.
- [ ] Verify the 6 new Claude Code skills work in a *fresh* session (no carried context) — fastest way to catch broken assumptions.
- [ ] PHASE-HYB-04 out-of-engine items (deferred, not blockers): named-agent T2 lifecycle binding to .agents/agent-registry.yaml, MSP/GKS shared-truth promotion wiring, auto-cron for `distill` cadence.
- [ ] Consider whether `.brain/memory/<agent>/` should be gitignored or tracked — current state: tracked. If self-notes contain anything sensitive, flip to gitignore before more agents start writing there.
- [ ] revoke the throwaway npm token `publish-hybrid-meter` at https://www.npmjs.com/settings/suanranger/tokens if it hasn't auto-expired yet (7-day TTL set 2026-06-25).
- [ ] Audit follow-up Rec #6 partial: `.claude/settings.json` has permissions but **no hooks** — if you want the baseline-check skill to fire automatically before commit, add a `PreToolUse(Bash:git commit)` hook.
- [ ] Re-read `audit/ai-firstify-report-2026-06-25.md` v3 once before next AI-firstify run — Dimension 4 (Scope) is the only remaining YELLOW.
