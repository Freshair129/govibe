# Self-note — forked-g-orchestra-engine-into-govibe-hybrid-meter
**Agent:** claude-code   **Session:** 8098390c-4330-4d44-aee6-9cf17d3b5ed5   **Ended:** 2026-06-25T21-12-19+07-00

Gotchas this session that cost real time and are documented in memory now:

1. **npm publish E403 — token format trap.** `.npmrc` MUST be `//registry.npmjs.org/:_authToken=npm_XXX`. A bare `npm_XXX=...` line silently treats the token as a config key (npm only warns `Unknown project config "npm_XXX"`). `npm whoami` may still succeed via global `~/.npmrc` and mask the bug. Lost ~10 min before spotting the warning.

2. **bump-doc.mjs needs a `## Changelog` section before it runs.** Trimming a governed doc body without preserving the section throws `no Changelog section found.` Lesson: when rewriting a governed doc, keep the Changelog scaffold even if you intend to replace everything else.

3. **run.mjs `reload()` was wiping --repo overrides.** Found because L0 telemetry was missing on a re-run. `applyRepoTarget()` must be called AFTER every `reload()` because the latter re-reads config.json from disk. Same bug pattern likely lurks anywhere config is "live-reloadable."

4. **Skeptic sub-agent caught me inflating a number** ("92 vitest tests" — actually ~28 src + 42 engine; I'd conflated `ref/` reference tests). Lesson: when a number sounds suspiciously round (or too good), spot-check it before publishing in a report. The skeptic also flagged that I almost flagged `index.html` for deletion (it's the Vite entrypoint).

5. **AI-firstify Phase A path mistake almost-caught.** Before the skeptic review I had `fix.cjs` in the "delete" bucket — turned out to be a Thai-encoding (Latin1 → UTF-8) repair script from a previous incident. Lesson: read every "ad-hoc" file before moving/deleting; the absence of a comment block is not evidence of triviality.

6. **GEMINI.md was 142 lines of *real content*, not a thin stub** as `AGENTS.md` claimed. The "compat bridge" framing was aspirational. Lesson: when a doc *describes* another doc's role, verify by reading the described doc, not by trusting the description.

Pattern across all six: **the report-style claim was wrong, the on-disk evidence was right.** Anchor to disk first.
