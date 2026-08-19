---
title: "RUNBOOK: GoVibe Clean-Checkout Quickstart"
doc_id: "RUNBOOK-GOVIBE-QUICKSTART"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-19"
owner: "THESEUS"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - "docs/roadmap/MASTERPLAN-govibe-production-readiness.md"
  - "docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md"
  - "docs/operations/runbooks/RUNBOOK-GoVibe-First-Use.md"
  - "docs/operations/runbooks/RUNBOOK-Persistent-Memory-Runtime.md"
  - ".env.example"
---

# RUNBOOK: GoVibe Clean-Checkout Quickstart

## 1. Use this runbook when

You have a fresh `git clone` of GoVibe and nothing else, and you want the shortest verified path
to a running Mission Control that shows real (not fabricated) data. This is the GATE-BOOTSTRAP
quickstart tracked as TASK-PRD-010 (`docs/roadmap/MASTERPLAN-govibe-production-readiness.md`
§3.1 GAP-09). It does not cover the 12-stage workspace scan, the Master Plan review workflow, or
the MSP-governed pipeline in depth — once Mission Control is running, see
`docs/operations/runbooks/RUNBOOK-GoVibe-First-Use.md` and
`docs/operations/runbooks/RUNBOOK-Persistent-Memory-Runtime.md` for those.

GoVibe has **no mock data by design** (`PRODUCT.md`): every panel either renders live
`MissionSnapshot` state or an honest empty state naming the missing feed. This runbook's Step 8
tells you how to tell the two apart.

## 2. Prerequisites

- **Node.js 22.x.** This matches the `node-version: 22` pinned in
  `.github/workflows/baseline-check.yml`. `package.json` does not yet declare an `engines` field,
  so other majors are not enforced by tooling, only unverified.
- Git.
- A shell — the commands below work in both PowerShell and a POSIX shell (bash/zsh); only the
  environment-variable syntax in the troubleshooting section differs.
- Nothing else. You do not need Docker, a database, or any cloud credentials — the sidecar is a
  local Node process bound to `127.0.0.1` and the roadmap board reads Markdown/HTML files already
  in the checkout under `docs/roadmap/`.

## 3. Install dependencies

From the repository root:

```bash
npm ci
npm ci --prefix packages/msp-runtime
```

The second command installs the optional MSP runtime package used only if you enable Step 5's
optional block. Running it now keeps this a single linear pass instead of a detour later — it
does not start anything or require any configuration.

## 4. Create your local `.env` and sidecar token — this used to be the blocker (GAP-09)

`.env.example` ships in the repo but there is no `.env`: it is gitignored (`.env` and `.env.*` in
`.gitignore`) so nobody's local token ever gets committed. The sidecar
(`scripts/mcp/sidecar-server.mjs`) refuses to start without `GOVIBE_MCP_TOKEN`, and the frontend
(`src/mission-auth-bootstrap.ts`) attaches whatever `VITE_GOVIBE_MCP_TOKEN` is set to as the
`Authorization: Bearer` header and WebSocket subprotocol on every sidecar request. **The two
values must be byte-for-byte identical** or every request is rejected with `401`.

Pick one of the two options below.

### Option A — one command (recommended)

```bash
npm run env:bootstrap
```

This runs `scripts/mcp/bootstrap-env.mjs`, which copies `.env.example` to `.env` and fills both
`GOVIBE_MCP_TOKEN` and `VITE_GOVIBE_MCP_TOKEN` with the same freshly generated 64-character random
token. It is idempotent and safe to re-run: if a `.env` already exists, it prints a note and exits
without touching it, so it never clobbers a config you already edited.

### Option B — by hand

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the printed value into **both** `GOVIBE_MCP_TOKEN=` and `VITE_GOVIBE_MCP_TOKEN=` in `.env`.

Either way: never commit `.env`, never print the token in a shared terminal/log, and never paste
it into a MissionSnapshot or a chat window.

## 5. (Optional) Configure the MSP-governed pipeline

Leave the `GOVIBE_MSP_COMMAND` / `GOVIBE_MSP_ARGS` / `GOVIBE_MSP_CWD` / `MSP_DB_PATH` block in
`.env` commented out for this quickstart. Mission Control starts and shows live roadmap and agent
data with no MSP configured — every MSP-gated tool instead fails closed with
`MspUnavailableError`, which is the documented pre-MSP posture, not an error in your setup. To
enable the governed pipeline later, follow
`docs/operations/runbooks/RUNBOOK-Persistent-Memory-Runtime.md` §3-§5.

## 6. Start the sidecar (terminal 1)

```bash
npm run mcp:dev
```

This is `node --env-file-if-exists=.env scripts/mcp/govibe-mcp-server.mjs` — it loads `.env`
automatically, so nothing needs to be exported into the shell by hand. On success it binds
`127.0.0.1:4310` (override with `GOVIBE_MCP_HOST` / `GOVIBE_MCP_PORT`) and keeps running with no
further output required. If `.env` is missing the token, or the two token values differ, the
process throws `GOVIBE_MCP_TOKEN is required to start the Mission Control sidecar.` and exits
immediately — that is Step 4 not yet complete, not a bug.

## 7. Start the Vite dev server (terminal 2)

```bash
npm run dev
```

Vite serves on `http://localhost:1420` by default (`strictPort: false` in `vite.config.ts`, so it
will pick the next free port and print it if 1420 is taken — use whatever URL it prints).

## 8. Open Mission Control and confirm it is live, not empty

Open the URL Vite printed. With no `VITE_GOVIBE_API_URL` / `VITE_GOVIBE_WS_URL` set, the gateway
(`src/mission/gateway.ts`'s `resolveLocalApiFallback`) auto-targets the sidecar at
`http://localhost:4310` whenever the page itself is served from `localhost`/`127.0.0.1` — no
transport configuration is needed for local use.

Confirm both of the following before calling the quickstart done:

- The connection pill in the header reads **CONNECTED** with a recent "Updated" timestamp, not
  offline/disconnected.
- **A2: Roadmap Board** in the sidebar shows a populated board — an active source path like
  `docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md`, a score, and real task/agent cards —
  not the empty state ("no roadmap loaded"/"waiting for a feed"). The same view also lists the
  real registered agent roster (THESEUS, LYRA, ATHER, ARCHON, …) pulled from the live agent
  registry, not placeholder rows.

If you see CONNECTED but an empty roadmap board, the sidecar is up but hasn't found an approved
roadmap source — check that you're running from the repository root so
`docs/roadmap/` resolves relative to the sidecar's working directory.

## 9. Verify from the command line (what this runbook's own evidence used)

```bash
curl -H "Authorization: Bearer <your-token>" -H "Origin: http://localhost:1420" \
  http://127.0.0.1:4310/mission/snapshot
```

**The `Origin` header is required, including from `curl`.** The sidecar's origin allowlist
(`GOVIBE_MCP_ALLOWED_ORIGINS`, defaulting to `http://localhost:1420` and three other local dev
origins) applies to every request, not just browser ones — a request missing a matching `Origin`
header gets `403 origin-not-allowed` even with a correct token, and a request with a
wrong/missing token gets `401 unauthorized`. Both are the sidecar working as designed, not a fault
in the quickstart.

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Sidecar exits immediately with `GOVIBE_MCP_TOKEN is required...` | `.env` missing or empty | Re-run Step 4 |
| Frontend never reaches CONNECTED; sidecar terminal shows `401`/`unauthorized` in the mission command log | `GOVIBE_MCP_TOKEN` and `VITE_GOVIBE_MCP_TOKEN` differ | Re-run `npm run env:bootstrap` after deleting the stale `.env`, or fix the mismatched value by hand |
| A request (including `curl`) gets `403 origin-not-allowed` | Missing/foreign `Origin` header, or you changed the Vite port without updating `GOVIBE_MCP_ALLOWED_ORIGINS` | Add the exact origin (scheme + host + port) to the comma-separated `GOVIBE_MCP_ALLOWED_ORIGINS` list in `.env`; wildcards are not supported |
| Vite starts on a port other than 1420 | Port 1420 already in use (`strictPort: false`) | Use the URL Vite actually printed |
| Roadmap board is empty despite CONNECTED | `npm run mcp:dev` was started from somewhere other than the repository root | Restart it from the repo root so `docs/roadmap/` resolves |
| MSP-gated tool reports `MspUnavailableError` | Expected pre-MSP posture (Step 5 not configured) | Ignore for this quickstart, or follow `RUNBOOK-Persistent-Memory-Runtime.md` to configure it |

## 11. Out of scope

This quickstart only covers a loopback-bound local developer preview. Network-reachable
deployment, TLS termination, and a multi-user identity model are explicitly out of scope for
GATE-BOOTSTRAP and require their own Change Request per
`docs/roadmap/MASTERPLAN-govibe-production-readiness.md` §4.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-19 | THESEUS | First version. Authored for TASK-PRD-010 (GAP-09 / GATE-BOOTSTRAP): a single linear path from `git clone` to a connected Mission Control showing live roadmap/agent data, including the `npm run env:bootstrap` token-generation step that removes the prior manual copy-and-match-two-values blocker. Verified live in this checkout: sidecar bound `127.0.0.1:4310`, authenticated `GET /mission/snapshot` and `GET /roadmap/sources` returned `200` with real roadmap nodes/agents, unauthenticated and foreign-origin requests returned `401`/`403`, Vite served `1420`, and the rendered page showed `CONNECTED` with a populated A2 Roadmap Board (real active source, real agent roster). See TC-TASK-PRD-010's changelog in the production-readiness masterplan for the exact commands and command output. |
