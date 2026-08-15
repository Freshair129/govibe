---
title: "RUNBOOK: Persistent-Memory MSP Runtime"
doc_id: "RUNBOOK-PERSISTENT-MEMORY-RUNTIME"
status: "draft"
version: "0.2.0+draft"
updated: "2026-08-15"
owner: "Boss (CEO)"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - "docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md"
  - "docs/adr/ADR-028-Bounded-GKS-Provider-Vertical-Slice.md"
  - "docs/adr/ADR-026-MSP-External-Runtime-Deployment.md"
  - "docs/adr/ADR-025-Storage-Backend-Independence-and-GenesisBlockDB-Adapter-Boundary.md"
  - "docs/srs/SRS-Persistent-Memory-MSP-Runtime.md"
  - "docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md"
  - "docs/api/API-009-Persistent-Memory-Contract.md"
  - "packages/govibe-core/test/persistent-knowledge-restart.e2e.test.mjs"
---

# RUNBOOK: Persistent-Memory MSP Runtime

## 1. Purpose and verified boundary

Use this runbook to configure, start, health-check, verify, recover, and collect
evidence from `packages/msp-runtime`, including the bounded persistent-knowledge
vertical slice tracked by Issues #74, #77, and #78.

The authority boundary is:

```text
Executor
  -> GoVibe MCP
  -> GoVibe MspClient
  -> stdio MSP process (`packages/msp-runtime`)
  -> MSP policy/context-authority gate
  -> GKS provider
  -> persistent backend
```

GoVibe and executors MUST NOT open the provider database, call a GKS backend,
or call GenesisBlockDB directly. Canonical knowledge references returned to
GoVibe are opaque `gks:` references.

The current repository contains two GKS provider modes:

- `MSP_GKS_PROVIDER=unconfigured` — the default. Shared/canonical knowledge
  promotion remains fail-closed with `gks_provider_unconfigured`.
- `MSP_GKS_PROVIDER=sqlite` — an explicit first-slice provider used to prove
  durable canonical promotion, restart survival, source-scoped retrieval,
  provenance, and evidence linkage.

The SQLite GKS provider is NOT a claim that the GenesisBlockDB adapter is
implemented. ADR-025 still defines the backend-independence direction, and
ADR-028 remains proposed until separately approved by the accountable owner.

## 2. Verified evidence baseline

The procedures below are grounded in repository implementation and executed CI
evidence, not aspirational configuration.

### 2.1 #74 provider foundation

Draft PR #144 (`feat(kb): add opt-in persistent GKS vertical slice (#74)`)
proved the provider foundation with GitHub Actions passing P0 Security CI,
Baseline Check, and E2E Pipeline on head
`070b199f7509da735a33490a990850a886d2af5a`.

That slice added:

- migration `0008_gks_knowledge.sql`;
- durable `gks_knowledge` and `gks_retrieval_evidence` tables;
- an opt-in GKS provider behind the MSP composition root;
- source-scoped provider retrieval;
- explicit default fail-closed behavior when no GKS provider is configured.

### 2.2 #77 fresh-process E2E

Draft PR #145 (`test(kb): verify persistent MSP knowledge across fresh process
restart (#77)`) passed P0 Security CI and Baseline Check on head
`01702226dc7087bdf09ecc34653c8e48069fa24c`.

`packages/govibe-core/test/persistent-knowledge-restart.e2e.test.mjs` is executed
by the normal test suite and proves the production-shaped path:

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

The deterministic fixture represents more than 100 Markdown/TypeScript atoms.
The test also exercises workspace rejection, radius rejection, provider
unavailability, and a 20-sample retrieval benchmark with p95 required to be at
or below 1 second.

These PRs are draft/stacked implementation evidence. Do not treat this runbook
as evidence that they have been merged into `main` until the repository history
shows that merge.

## 3. Preconditions and configuration

### 3.1 Required runtime pieces

- Node.js and repository dependencies are installed.
- `packages/msp-runtime/bin/msp-runtime.mjs` is reachable from the GoVibe host.
- `MSP_DB_PATH` points to a writable SQLite database file location.
- The workspace has a valid `.govibe/config.json` with a stable `workspaceId`
  before a deep scan is used for persistent knowledge promotion.
- GoVibe reaches MSP only through the configured stdio parent transport.

### 3.2 GoVibe-to-MSP transport variables

Configure these in the environment of the GoVibe parent process:

| Variable | Required | Meaning |
|---|---:|---|
| `GOVIBE_MSP_COMMAND` | yes | executable used to spawn MSP, normally `node` |
| `GOVIBE_MSP_ARGS` | yes for the normal Node entrypoint | JSON array of arguments, including `packages/msp-runtime/bin/msp-runtime.mjs` |
| `GOVIBE_MSP_CWD` | no | explicit working directory for the child process |

Example shape:

```bash
export GOVIBE_MSP_COMMAND=node
export GOVIBE_MSP_ARGS='["/absolute/repo/packages/msp-runtime/bin/msp-runtime.mjs"]'
export GOVIBE_MSP_CWD='/absolute/repo'
```

A syntactically valid transport configuration is NOT health evidence. GoVibe
must successfully call `msp_health` before governed operations are treated as
ready.

### 3.3 MSP runtime variables

| Variable | Required | Meaning |
|---|---:|---|
| `MSP_DB_PATH` | yes | persistent SQLite file owned by the MSP runtime |
| `MSP_GKS_PROVIDER` | no | defaults to `unconfigured`; set explicitly to `sqlite` for the verified first-slice GKS provider |
| `MSP_OLLAMA_URL` | no | optional embedding endpoint used by memory hybrid/vector retrieval; not required for the GKS vertical slice |

Verified knowledge-provider example:

```bash
export MSP_DB_PATH='/absolute/state/msp.sqlite3'
export MSP_GKS_PROVIDER=sqlite
```

Do not place provider credentials or backend-specific connection secrets in
GoVibe configuration. The first-slice SQLite provider needs no credentials.
Future provider credentials, if any, belong behind the MSP/GKS provider
boundary, never in a `GOVIBE_GKS_*` shortcut.

## 4. Startup procedure

1. Set `MSP_DB_PATH` to the intended persistent file.
2. Select the GKS behavior deliberately:
   - omit `MSP_GKS_PROVIDER` or set `unconfigured` to keep canonical knowledge
     promotion blocked;
   - set `MSP_GKS_PROVIDER=sqlite` only when the verified first-slice provider
     is intended.
3. Set `GOVIBE_MSP_COMMAND`, `GOVIBE_MSP_ARGS`, and optional
   `GOVIBE_MSP_CWD` in the GoVibe parent environment.
4. Start GoVibe normally. The MSP runtime is spawned as a separate OS process
   over newline-delimited JSON-RPC stdio.
5. On first start against a new `MSP_DB_PATH`, migrations are applied in order.
   The knowledge slice requires migration 0008 to be present.
6. Call `msp_health` through the MSP client before promotion or governed
   retrieval.

The runtime intentionally refuses to start if `MSP_DB_PATH` is missing. An
unknown `MSP_GKS_PROVIDER` value is also a startup error; there is no implicit
in-memory or production-looking fallback.

## 5. Health states and permitted operations

`msp_health` is the authoritative readiness query. Record its top-level
`health_state`, `reason`, component states, and opaque evidence references.

| State | Operational meaning | Promotion / retrieval behavior |
|---|---|---|
| `ready` | required transport, storage, and selected capability are healthy | permitted subject to request policy |
| `degraded` | runtime is reachable but an optional capability is reduced or blocked | only operations whose required dependencies are ready may proceed; never infer canonical-promotion success |
| `unavailable` | required runtime/storage dependency cannot be reached or validated | deny governed operation; investigate before retry |
| `blocked` | policy, contract, scope, permission, radius, or unconfigured capability denies the operation | deny before the prohibited traversal/write |

### 5.1 Expected default: GKS unconfigured

With no explicit provider selection, the GKS component is blocked with reason
`gks_provider_unconfigured`. `msp_knowledge_promote` and shared/canonical
promotion MUST fail. This is intentional fail-closed behavior, not a degraded
success mode.

### 5.2 Expected verified provider state

With:

```text
MSP_DB_PATH=<writable persistent file>
MSP_GKS_PROVIDER=sqlite
```

and a reachable migrated database, the GKS component is expected to report
`ready`. A successful health result still does not bypass per-request context
authority checks.

### 5.3 Timeout / malformed health handling

If the parent cannot reach MSP, or a health probe times out or returns a
malformed response, treat the capability as non-ready. Do not replace a failed
health result with `msp_ping`, configuration presence, cached success, or a
local fallback.

## 6. Promotion and retrieval evidence chain

For each successful deep-scan knowledge flow, preserve this correlation chain:

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

### 6.1 Promotion evidence

A completed Deep Scan stage records provenance first and then calls
`msp_knowledge_promote` using `govibe-knowledge-candidate/v1`. The accepted
result contains:

- opaque canonical `gks:` knowledge reference;
- source snapshot SHA-256;
- `msp:promotion/` evidence reference;
- durable source/version/provenance data behind the provider boundary.

Do not report a stage as durably promoted merely because parsing succeeded. If
promotion fails, the stage must not be represented as durable knowledge
success.

### 6.2 Retrieval evidence

A governed context request must carry context authority plus a bounded graph
query. Before provider traversal, MSP validates at least:

- workspace identity;
- agent identity;
- finite retrieval radius;
- non-wildcard relation allowlist;
- finite budget;
- source constraints matching the authorized context sources.

Successful retrieval returns a context packet containing:

- `contextId` / `cacheId`;
- policy decision(s);
- approved budget and retrieval radius;
- source hash/version;
- opaque canonical references;
- `gks:retrieval/` evidence reference;
- run/session/turn lineage;
- provenance linking canonical knowledge to source files and atom/symbol IDs.

The SQLite provider re-applies authorized source hashes in its storage query.
Workspace membership alone is not sufficient to widen the result set.

## 7. Verification procedure

### 7.1 Repository test

Run the normal repository test suite used by CI. The #77 E2E is:

```text
packages/govibe-core/test/persistent-knowledge-restart.e2e.test.mjs
```

The test is intentionally fresh-process rather than an in-process mock. Its
worker:

```text
packages/govibe-core/test/fixtures/persistent-knowledge-worker.mjs
```

spawns the real MSP runtime through `createMspStdioCaller`.

The test must fail, not skip-to-pass, if the selected local provider cannot be
started or the durable path fails. For a future externally provisioned provider,
a CI job may report an explicit blocked dependency only when provisioning is
impossible; blocked/skipped is never equivalent to executed pass.

### 7.2 What the E2E must prove

- Markdown stage completes and promotes canonical knowledge.
- TypeScript/JavaScript symbol stage completes and promotes canonical knowledge.
- first GoVibe/MSP processes exit completely;
- a fresh process retrieves records from the same persistent database;
- retrieved refs are `gks:` opaque refs with the original source hash;
- Markdown provenance links back to `README.md` atom IDs;
- TypeScript provenance links back to `src/operations.ts` symbol IDs;
- more than 100 represented atoms are covered by the fixture;
- workspace mismatch is denied before context/provider success evidence is
  written;
- invalid retrieval radius is denied before context/provider success evidence
  is written;
- `gks_provider_unconfigured` returns non-success;
- 20 retrieval samples satisfy p95 <= 1 second.

## 8. Recovery procedures

### 8.1 MSP unreachable

Symptoms:

- `msp_health` cannot be called;
- GoVibe normalizes the parent as unavailable;
- governed promotion/retrieval fails.

Actions:

1. Verify `GOVIBE_MSP_COMMAND`, JSON syntax of `GOVIBE_MSP_ARGS`, and optional
   `GOVIBE_MSP_CWD`.
2. Verify the configured runtime entrypoint exists.
3. Verify `MSP_DB_PATH` is present in the inherited child environment.
4. Restart the GoVibe parent so a fresh MSP child is created.
5. Require a successful `msp_health` call before retrying the governed action.

Never switch to an in-process map or direct storage call as a recovery path.

### 8.2 GKS blocked / provider unconfigured

Symptoms:

- GKS health component is `blocked`;
- reason contains `gks_provider_unconfigured`;
- `msp_knowledge_promote` returns non-success.

Actions:

1. Decide whether canonical knowledge should be enabled for this environment.
2. If yes, set `MSP_GKS_PROVIDER=sqlite` explicitly and restart the parent/MSP
   process pair.
3. Re-run `msp_health` and require GKS `ready` before retrying promotion.
4. If canonical knowledge should remain disabled, leave the block in place;
   do not relabel it as successful ingestion.

### 8.3 Storage unavailable / migration failure

Symptoms include startup failure, database-open failure, migration checksum
drift, or downgrade guard rejection.

Actions:

1. Stop the runtime.
2. Verify the directory containing `MSP_DB_PATH` exists and is writable.
3. Verify no stale process incorrectly owns the file.
4. If checksum drift or downgrade protection fired, do NOT edit
   `schema_migrations` manually. Restore the matching code/database pair or a
   known-good backup.
5. Restart and verify health before promotion/retrieval.

### 8.4 Provider timeout or malformed response

Treat timeout/malformed provider evidence as non-ready. Capture the health
reason/evidence reference, restart or repair the dependency, and retry only
after a fresh healthy probe. Never synthesize a canonical ref or reuse a stale
success to hide the outage.

### 8.5 Provenance validation failure

Symptoms include invalid source hash, invalid `msp:proof/` reference, missing
atom/source lineage, or a context packet that cannot validate canonical
provenance.

Actions:

1. Treat the result as failed/blocked evidence, not partial success.
2. Capture the scan run ID, stage number, source snapshot hash, promotion ref
   if one exists, and retrieval evidence ref if one exists.
3. Re-run the deterministic scan from a known workspace snapshot.
4. Compare the new source snapshot hash with the failed run.
5. Do not manually patch provider rows to manufacture matching provenance.

### 8.6 Retrieval policy rejection

A workspace, agent, source, radius, relation, or budget rejection is a policy
result, not a provider outage. Correct the caller's authority request if it is
wrong. Do not broaden the storage query or bypass MSP authorization. The #77
negative tests verify denied workspace/radius requests produce no successful
context/retrieval storage side effects.

## 9. Stop, backup, and restore

### 9.1 Stop

Stop the GoVibe parent normally. The MSP child is tied to its stdio parent and
should exit when the transport closes. If a child remains, terminate it before
restarting against the same `MSP_DB_PATH`.

### 9.2 Backup

The first-slice provider and MSP private state are in the SQLite database at
`MSP_DB_PATH`.

- Prefer a cold backup after stopping the runtime.
- For a hot backup, use SQLite's backup mechanism rather than copying a live
  WAL database file blindly.
- Record backup timestamp and checksum.

### 9.3 Restore

1. Stop GoVibe/MSP.
2. Restore the known-good SQLite backup to the configured `MSP_DB_PATH`.
3. Start the matching runtime code.
4. Allow migrations/guards to validate the database.
5. Run `msp_health`.
6. Run a governed retrieval and verify canonical source/provenance evidence
   before declaring recovery complete.

## 10. Existing memory-search degraded mode

The persistent-memory runtime also supports `msp_memory_search`. Vector
retrieval may degrade to FTS-only when the optional Ollama embedding endpoint is
unavailable. Confirm this through the response fields (`vector_available` and
`searchMode`) rather than guessing from result quality.

This FTS degradation is separate from canonical GKS knowledge promotion. An
optional vector-search outage MUST NOT be interpreted as permission to report a
failed canonical promotion as successful.

## 11. Manual decay operation

For memory lifecycle operations:

1. call `msp_memory_decay_tick` with `dry_run: true`;
2. review proposed transitions;
3. call again with `dry_run: false` only after review;
4. use an external scheduler if periodic ticks are required.

Do not call internal runtime functions directly; that bypasses the tool/audit
boundary.

## 12. Evidence to capture for every incident or verification run

Capture non-secret evidence only:

- commit SHA / PR or release identity;
- `MSP_GKS_PROVIDER` mode (not credentials);
- migration version/status;
- `msp_health` top-level and component states/reasons/evidence refs;
- scan `runId` and source snapshot SHA-256;
- stage number and parser method;
- `msp:proof/` provenance ref;
- `msp:promotion/` ref;
- opaque `gks:knowledge/` ref;
- fresh-process restart boundary;
- `gks:retrieval/` evidence ref;
- `msp:context/` context ID;
- policy decision, approved budget/radius, lineage;
- source-file and atom/symbol provenance;
- benchmark sample count and p95 when validating #77 performance;
- failure reason for blocked/unavailable runs.

Do not log database payloads, credentials, or secret environment values as
health evidence.

## 13. CI interpretation

Use these result meanings consistently:

- **executed pass** — the required test ran and all assertions passed;
- **executed failure** — the required test ran and failed; release gate is
  failed;
- **blocked dependency** — required external provisioning could not be made;
  release gate remains unresolved;
- **skipped** — not evidence of success.

The current SQLite first-slice provider is locally provisioned by the test and
therefore should execute rather than skip. If it cannot start, CI should fail.

For the evidence currently associated with this runbook:

- #144: P0 Security CI, Baseline Check, and E2E Pipeline executed successfully
  on the recorded head SHA;
- #145: P0 Security CI and Baseline Check executed successfully on the recorded
  head SHA, with the #77 fresh-process test included in the normal test suite.

After merging/rebasing these stacked PRs, re-run required branch protection
checks on the final `main`-based commits; do not reuse green checks from an old
head SHA as evidence for a different commit.

## 14. Completion criteria for Issue #78

This runbook is operationally complete for the #74/#77 first slice when:

- prerequisites and non-secret configuration are documented;
- startup and health semantics are documented;
- `ready`, `unavailable`, `degraded`, and `blocked` behaviors are explicit;
- promotion/retrieval evidence can be correlated from scan run through fresh
  process restart to context packet;
- MSP/GKS/storage/timeout/provenance/policy recovery paths are documented;
- CI distinguishes pass, fail, blocked, and skipped;
- ADR-027, proposed ADR-028, and the #77 E2E test are linked;
- no procedure bypasses the MSP authority boundary;
- no statement claims a GenesisBlockDB adapter or ADR-028 approval that has not
  occurred.

## 15. What NOT to do

- Never hand-edit `gks_knowledge`, `gks_retrieval_evidence`, MSP entity tables,
  or `schema_migrations` to force an operation to look successful.
- Never import `packages/msp-runtime` as a library into the GoVibe production
  process; keep the separate-process stdio boundary.
- Never add a direct GoVibe -> GKS or GoVibe -> GenesisBlockDB runtime path.
- Never treat `GOVIBE_MSP_COMMAND` presence as health evidence.
- Never treat `gks_provider_unconfigured` as successful ingestion.
- Never widen source constraints, relation allowlists, radius, or budget inside
  the provider to make a denied request return data.
- Never treat blocked/skipped CI as pass.
- Never call the SQLite first-slice provider a completed GenesisBlockDB adapter.
- Never mark ADR-028 accepted merely because the implementation PR is green.

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.2.0+draft | 2026-08-15 | Grounded the runbook in #74/#77 executed evidence; documented explicit `MSP_GKS_PROVIDER` modes, fresh-process knowledge persistence/retrieval, policy/source isolation, provenance/evidence correlation, recovery procedures, CI pass/fail/blocked semantics, and the non-claim that GenesisBlockDB/ADR-028 are complete or approved. |
| 0.2.0+draft | 2026-08-14 | Added the implemented `msp_health` procedure, bounded timeout/malformed handling, opaque evidence-reference recording, and explicit no-direct-GKS operational rules. |
| 0.1.0+draft | 2026-08-04 | Initial operations runbook for the persistent-memory MSP runtime: start/stop procedure, configuration variables, degraded-search confirmation procedure, manual decay-tick procedure, single-SQLite-file backup guidance, and explicit operator prohibitions. |
