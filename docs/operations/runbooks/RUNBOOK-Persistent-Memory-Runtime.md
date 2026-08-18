---
title: "RUNBOOK: Persistent-Memory MSP Runtime"
doc_id: "RUNBOOK-PERSISTENT-MEMORY-RUNTIME"
status: "draft"
version: "0.2.1+draft"
updated: "2026-08-19"
owner: "Boss (CEO)"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - "docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md"
  - "docs/adr/ADR-026-MSP-External-Runtime-Deployment.md"
  - "docs/adr/ADR-025-Storage-Backend-Independence-and-GenesisBlockDB-Adapter-Boundary.md"
  - "docs/srs/SRS-Persistent-Memory-MSP-Runtime.md"
  - "docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md"
  - "docs/api/API-009-Persistent-Memory-Contract.md"
  - "packages/govibe-core/test/persistent-knowledge-restart.e2e.test.mjs"
---

# RUNBOOK: Persistent-Memory MSP Runtime

## 1. Purpose

Use this runbook to configure, start, health-check, verify, recover, and collect evidence from `packages/msp-runtime`, including the persistent knowledge vertical slice implemented for Issues #74 and #77 and operationalized by #78.

The authority boundary is:

```text
Executor
  -> GoVibe MCP
  -> GoVibe MspClient
  -> stdio MSP process (`packages/msp-runtime`)
  -> MSP policy/context-authority gate
  -> GKS provider boundary
  -> persistent backend
```

GoVibe and executors MUST NOT open the provider database, call a GKS backend, or call GenesisBlockDB directly. Canonical knowledge references exposed to GoVibe are opaque `gks:` references.

The repository currently exposes two GKS provider modes:

- `MSP_GKS_PROVIDER=unconfigured` — default, fail-closed behavior. Canonical/shared promotion is blocked with `gks_provider_unconfigured`.
- `MSP_GKS_PROVIDER=sqlite` — explicit first-slice provider used to prove durable canonical promotion, source-scoped retrieval, restart survival, provenance, and evidence linkage.

The SQLite provider is implementation evidence for the vertical slice; it is NOT a claim that the GenesisBlockDB adapter is complete. ADR-025 remains the proposed backend-independence direction. ADR-027 remains the accepted process-boundary authority.

## 2. Verified implementation baseline

### 2.1 Provider foundation — PR #144

PR #144, `feat(kb): add opt-in persistent GKS vertical slice (#74)`, merged into `main` as merge commit `975788b6228c1da2826f396e9aeaa8f7c0762676`.

Before merge, GitHub Actions executed successfully for:

- P0 Security CI;
- Baseline Check;
- E2E Tests — CI Pipeline.

The merged slice added:

- migration `0008_gks_knowledge.sql`;
- durable canonical knowledge and retrieval-evidence storage;
- an opt-in provider behind the MSP composition root;
- source-scoped retrieval;
- explicit default fail-closed behavior when no provider is configured.

### 2.2 Fresh-process restart E2E — PR #145

PR #145, `test(kb): verify persistent MSP knowledge across fresh process restart (#77)`, merged into `main` as merge commit `c98b137931a49917b4c4456e9651f6c2c02980ae`.

Its head passed P0 Security CI and Baseline Check before merge. The normal test suite includes:

```text
packages/govibe-core/test/persistent-knowledge-restart.e2e.test.mjs
```

That E2E proves a production-shaped path:

```text
Markdown + TypeScript fixture
  -> 12-stage Deep Scan
  -> MspClient over stdio
  -> msp_knowledge_promote
  -> persistent canonical gks: record
  -> first GoVibe/MSP processes exit
  -> fresh GoVibe process + fresh MSP child
  -> MSP-governed context retrieval
  -> provenance / policy / budget / lineage verification
```

The deterministic fixture represents more than 100 Markdown/TypeScript atoms and includes workspace/radius rejection, provider-unconfigured failure, fresh-process persistence, provenance checks, and a 20-sample retrieval benchmark with p95 required to be at or below 1 second.

## 3. Preconditions and configuration

Required pieces:

- Node.js and repository dependencies installed;
- `packages/msp-runtime/bin/msp-runtime.mjs` reachable from the GoVibe host;
- writable persistent path in `MSP_DB_PATH`;
- stable workspace identity in `.govibe/config.json` before Deep Scan promotion;
- GoVibe reaches MSP only through the configured stdio transport.

### 3.1 GoVibe-to-MSP variables

| Variable | Required | Meaning |
|---|---:|---|
| `GOVIBE_MSP_COMMAND` | yes | executable used to spawn MSP, normally `node` |
| `GOVIBE_MSP_ARGS` | yes for Node entrypoint | JSON array including `packages/msp-runtime/bin/msp-runtime.mjs` |
| `GOVIBE_MSP_CWD` | no | explicit child-process working directory |

Example:

```bash
export GOVIBE_MSP_COMMAND=node
export GOVIBE_MSP_ARGS='["/absolute/repo/packages/msp-runtime/bin/msp-runtime.mjs"]'
export GOVIBE_MSP_CWD='/absolute/repo'
```

Configuration presence is not health evidence. A successful `msp_health` call is required before governed operations are treated as ready.

### 3.2 MSP runtime variables

| Variable | Required | Meaning |
|---|---:|---|
| `MSP_DB_PATH` | yes | persistent SQLite file owned by MSP runtime |
| `MSP_GKS_PROVIDER` | no | defaults to `unconfigured`; use `sqlite` for the verified first-slice provider |
| `MSP_OLLAMA_URL` | no | optional embedding endpoint for memory hybrid/vector retrieval; not required for the GKS vertical slice |

Verified first-slice example:

```bash
export MSP_DB_PATH='/absolute/state/msp.sqlite3'
export MSP_GKS_PROVIDER=sqlite
```

Do not place provider credentials or backend-specific connection secrets in GoVibe configuration. Provider-specific secrets belong behind the MSP/GKS boundary.

## 4. Startup and health procedure

1. Set `MSP_DB_PATH` to the intended persistent file.
2. Select provider behavior deliberately:
   - omit `MSP_GKS_PROVIDER` or set `unconfigured` to keep canonical knowledge blocked;
   - set `MSP_GKS_PROVIDER=sqlite` only when the first-slice provider is intended.
3. Set `GOVIBE_MSP_COMMAND`, `GOVIBE_MSP_ARGS`, and optional `GOVIBE_MSP_CWD`.
4. Start GoVibe normally; MSP is spawned as a separate OS process over stdio.
5. On a new database, allow migrations to apply in order. The knowledge slice requires migration `0008_gks_knowledge.sql`.
6. Call `msp_health` before promotion or governed retrieval.

The runtime must fail closed if `MSP_DB_PATH` is missing or an unknown `MSP_GKS_PROVIDER` is supplied. There is no implicit in-memory success fallback.

## 5. Health-state semantics

`msp_health` is the authoritative readiness query. Record top-level state, reason, component states, and opaque evidence references.

| State | Meaning | Allowed behavior |
|---|---|---|
| `ready` | required transport/storage/selected capability are healthy | governed operation may proceed, still subject to request policy |
| `degraded` | runtime is reachable but an optional capability is reduced or blocked | only operations whose required dependencies are ready may proceed |
| `unavailable` | required runtime/storage dependency cannot be reached or validated | deny governed operation and investigate |
| `blocked` | policy, scope, permission, radius, or unconfigured capability denies the operation | deny before prohibited traversal/write |

### Default provider state

With no explicit provider selection, the GKS component is blocked with `gks_provider_unconfigured`; `msp_knowledge_promote` must return non-success. This is intentional fail-closed behavior.

### SQLite first-slice state

With a migrated writable database and `MSP_GKS_PROVIDER=sqlite`, the GKS component is expected to report ready. Health readiness never bypasses per-request context-authority checks.

### Timeout or malformed health

Treat timeout, parent unreachability, or malformed health responses as non-ready. Never replace a failed health result with `msp_ping`, configuration presence, cached success, or direct storage access.

## 6. Promotion and retrieval evidence

Preserve this correlation chain for every successful Deep Scan knowledge flow:

```text
Deep Scan run_id + source snapshot hash
  -> msp:proof/... provenance reference
  -> msp:promotion/... promotion reference
  -> gks:knowledge/... canonical reference
  -> process restart
  -> gks:retrieval/... retrieval evidence reference
  -> msp:context/... context id
  -> policy decision + approved budget + lineage + provenance
```

### Promotion evidence

A completed Deep Scan stage records provenance and then calls `msp_knowledge_promote` using `govibe-knowledge-candidate/v1`. An accepted promotion returns an opaque `gks:` canonical reference plus MSP promotion evidence. Parsing success alone is not durable-promotion success.

### Retrieval evidence

Before provider traversal, MSP validates bounded authority including workspace identity, agent identity, finite radius, finite budget, relation allowlist, and source constraints.

Successful retrieval must preserve:

- context ID;
- policy decision;
- approved budget/radius;
- source version/hash;
- opaque canonical references;
- retrieval evidence reference;
- run/session/turn lineage;
- source-file and atom/symbol provenance.

The provider must re-apply authorized source constraints during storage retrieval. Workspace membership alone must not widen the result set.

## 7. CI and E2E verification

### 7.1 Promotion smoke gate (TASK-PRD-023)

`npm run msp:smoke` (`scripts/mcp/msp-promotion-smoke.mjs`) proves the launch
contract of §3-§5 end to end on every pull request: it boots this runtime
through the same `GOVIBE_MSP_COMMAND` / `GOVIBE_MSP_ARGS` environment path the
MCP server uses, requires `health_state` other than `unavailable`, runs a full
12-stage deep scan on a disposable fixture workspace, and fails unless the scan
completes with at least one promoted `gks:` knowledge reference. The
baseline-check workflow runs it after `baseline:check`; a failed MSP boot fails
the required status check instead of degrading to the unavailable client.

For local development, `npm run mcp:dev` now loads `.env` via
`--env-file-if-exists` (shell-set values still win), so the MSP block documented
in `.env.example` is sufficient to give the local server a live MSP parent.
`MSP_DB_PATH` must point into an existing directory; the repository convention
is `.govibe/msp/` (gitignored).

### 7.2 Fresh-process persistence E2E

Run the normal repository test suite used by CI. The fresh-process test is:

```text
packages/govibe-core/test/persistent-knowledge-restart.e2e.test.mjs
```

Its worker is:

```text
packages/govibe-core/test/fixtures/persistent-knowledge-worker.mjs
```

The test must execute rather than skip for the SQLite first-slice provider. If the provider cannot start or persistence fails, the test must fail.

The E2E verifies:

- Markdown promotion;
- TS/JS symbol promotion;
- complete first-process shutdown;
- retrieval from the same persistent database by a fresh GoVibe/MSP pair;
- opaque `gks:` refs and original source hash;
- Markdown and TypeScript atom/symbol provenance;
- more than 100 represented atoms;
- workspace mismatch rejection before success evidence;
- invalid radius rejection before success evidence;
- `gks_provider_unconfigured` non-success;
- 20 retrieval samples with p95 <= 1 second.

Interpret CI states consistently:

- **executed pass** — required test ran and assertions passed;
- **executed failure** — test ran and failed;
- **blocked dependency** — required external provisioning unavailable; gate unresolved;
- **skipped** — not success evidence.

## 8. Recovery procedures

### MSP unreachable

1. Verify `GOVIBE_MSP_COMMAND`, JSON syntax of `GOVIBE_MSP_ARGS`, and `GOVIBE_MSP_CWD` if used.
2. Verify runtime entrypoint exists.
3. Verify `MSP_DB_PATH` is inherited by the child.
4. Restart the GoVibe parent so a fresh MSP child is created.
5. Require successful `msp_health` before retrying.

Never recover by switching to an in-process map or direct database call.

### GKS provider unconfigured

If health reports `gks_provider_unconfigured`, decide whether canonical knowledge is intended in that environment. If yes, set `MSP_GKS_PROVIDER=sqlite`, restart the process pair, and require GKS health ready before retrying. Otherwise leave the fail-closed state intact.

### Storage or migration failure

Stop the runtime, verify the database directory and permissions, verify no stale process holds the file, and honor checksum/downgrade guards. Do not hand-edit `schema_migrations`. Restore a matching code/database pair or known-good backup.

### Provider timeout or malformed response

Treat as non-ready. Capture evidence/reason, repair or restart the dependency, and retry only after a fresh healthy probe. Never synthesize a canonical ref or reuse stale success.

### Provenance failure

Treat invalid source hash, missing proof reference, or missing atom/source lineage as failed/blocked evidence. Capture run ID, stage, source hash, promotion ref, and retrieval evidence ref. Re-run from a known workspace snapshot. Do not patch provider rows manually.

### Retrieval policy rejection

Workspace, agent, source, radius, relation, or budget rejection is a policy result, not a provider outage. Correct the request authority if wrong. Do not broaden the provider query or bypass MSP authorization.

## 9. Backup and restore

The first-slice provider and MSP private state use the SQLite database at `MSP_DB_PATH`.

- Prefer a cold backup after stopping runtime.
- For a hot backup, use SQLite's backup mechanism instead of copying a live WAL database blindly.
- Record backup timestamp and checksum.

Restore procedure:

1. stop GoVibe/MSP;
2. restore a known-good SQLite backup to `MSP_DB_PATH`;
3. start matching runtime code;
4. allow migration guards to validate the file;
5. run `msp_health`;
6. run governed retrieval and verify canonical source/provenance evidence.

## 10. Evidence checklist

Capture non-secret evidence only:

- commit SHA / PR or release identity;
- `MSP_GKS_PROVIDER` mode;
- migration version/status;
- `msp_health` states/reasons/evidence refs;
- scan run ID and source snapshot SHA-256;
- stage number/parser method;
- `msp:proof/` ref;
- `msp:promotion/` ref;
- opaque `gks:knowledge/` ref;
- fresh-process restart boundary;
- `gks:retrieval/` ref;
- context ID;
- policy decision, approved budget/radius, lineage;
- source-file and atom/symbol provenance;
- benchmark sample count and p95;
- failure reason for blocked/unavailable runs.

Do not log database payloads, credentials, or secret environment values as health evidence.

## 11. What NOT to do

- Never hand-edit provider/MSP tables or `schema_migrations` to force success.
- Never import `packages/msp-runtime` into the GoVibe production process.
- Never add direct GoVibe -> GKS or GoVibe -> GenesisBlockDB runtime access.
- Never treat transport configuration as health evidence.
- Never treat `gks_provider_unconfigured`, blocked, or skipped as success.
- Never widen source constraints, relation allowlists, radius, or budget inside the provider to make a denied request return data.
- Never call the SQLite first-slice provider a completed GenesisBlockDB adapter.

## 12. Completion criteria for Issue #78

The runbook is complete for the #74/#77 first slice when:

- prerequisites/configuration are documented without secrets;
- startup and health semantics cover `ready`, `unavailable`, `degraded`, and `blocked`;
- promotion/retrieval evidence is correlated end to end;
- recovery covers MSP, provider, storage, timeout, provenance, and policy failures;
- CI semantics distinguish pass/fail/blocked/skipped;
- ADR-027 and the #77 E2E are linked;
- no operational procedure bypasses MSP authority;
- no statement claims GenesisBlockDB support that is not implemented.

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.2.1+draft | 2026-08-19 | TASK-PRD-023: added §7.1 promotion smoke gate (`npm run msp:smoke` wired into baseline-check CI) and documented the `.env` / `--env-file-if-exists` local launch path with the `.govibe/msp/` database convention. |
| 0.2.0+draft | 2026-08-16 | Finalized #78 against merged #144/#145 evidence; documented provider modes, fresh-process persistence/retrieval, evidence correlation, recovery, CI semantics, and removed the accidental duplicate proposed ADR-028 reference. |
| 0.1.0+draft | 2026-08-04 | Initial persistent-memory MSP runtime operating guidance. |
