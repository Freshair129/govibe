# hybrid-meter

A hybrid AI coding engine: a **frontier model plans + reviews** while **local SLMs execute
on-device**, with a **live cost meter** showing what ran free and what was saved. Forked from the
G-orchestra engine into GoVibe (see `PROVENANCE.md`).

## Run

```bash
# one-shot: plan a task, execute it via the engine, print the diff + cost meter
node hybrid-meter/cli.mjs run "add a /health endpoint" --repo /path/to/your/repo

# live cost meter over your own ledger
node hybrid-meter/cli.mjs watch path/to/usage.jsonl

# replay a sample build as a meter
node hybrid-meter/cli.mjs
```

Requirements: Node >= 18; [Ollama](https://ollama.com) running locally for on-device execution; a
frontier provider (e.g. the `claude` CLI) for planning + the L2 review tier.

## How the cost wedge works

- **Planner** (frontier) atomizes a freeform task + repo summary into engine tasks.
- **Execute** runs each task on a local SLM ($0, on-device) under the engine's routing.
- **Verify Gate** is tiered (`FEAT-Tiered-Review`): **L0** deterministic (compile/lint/test, $0,
  catches non-compiling output before any paid review) → **L1** local-SLM escalate-only → **L2**
  frontier sign-off. The L0 gate's averted review spend is surfaced in the meter.
- **Memory**: an anti-error loop persists failure lessons; a lesson confirmed across independent
  runs is promoted to trusted (`FEAT-Per-Agent-Memory-Unit`).

## Cost meter

- CLI meter: `hybrid-meter watch|report <usage.jsonl>` and the live meter during `run`.
- Web meter: open `hybrid-meter/web/index.html` in a browser; load your own `usage.jsonl` via the
  file picker. Shows saved %, on-device %, review tax, and L0-averted review.

## License

**AGPL-3.0-or-later** (see `LICENSE`). You may use, modify, and redistribute this freely; if you
run a modified version as a network service, the AGPL requires you to offer your source to its
users. A separate **commercial license** (for closed-source / SaaS use without the AGPL
obligations) is available from the copyright holder — i.e. this is dual-licensed. See
`LICENSE-COMMERCIAL.md` for the commercial-license template (fill in the bracketed fields).

> Copyright (C) 2026 GoVibe. Set the real copyright holder's legal name here and in `LICENSE`
> before publishing.

## Publishing

This package is **publish-ready but not published**. Before `npm publish`: confirm the `@govibe`
scope is registered to your npm account, set the real copyright holder name, then `npm login` and
`npm publish`. See `_publishNote` in `package.json`.
