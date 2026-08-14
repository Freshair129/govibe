---
title: "RUNBOOK: Persistent-Memory MSP Runtime"
doc_id: "RUNBOOK-PERSISTENT-MEMORY-RUNTIME"
status: "draft"
version: "0.2.0+draft"
updated: "2026-08-14"
owner: "Boss (CEO)"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - "docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md"
  - "docs/adr/ADR-026-MSP-External-Runtime-Deployment.md"
  - "docs/srs/SRS-Persistent-Memory-MSP-Runtime.md"
  - "docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md"
  - "docs/api/API-009-Persistent-Memory-Contract.md"
---

# RUNBOOK: Persistent-Memory MSP Runtime

## 1. Purpose

Use this runbook when starting, stopping, configuring, or troubleshooting the
`packages/msp-runtime` process (the persistent-memory MSP runtime decided in
`docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md`), or when a
`msp_memory_search` response reports degraded search. This runbook does not
cover the underlying architecture (see the SDD) or the wire contract (see
API-009); it covers operating the process that implements them.

The runtime and its bounded `msp_health` query are implemented in the repository.
The health result is evidence for the current process and SQLite connection only;
it is not proof of a persistent external MSP provider, a GKS provider, or a
restart-surviving production deployment. Check the relevant work packet and
issue evidence before making an operational readiness claim.

## 2. Preconditions

- `packages/msp-runtime` is built and its entrypoint is reachable by the
  command configured in `GOVIBE_MSP_COMMAND`.
- `MSP_DB_PATH` points at a writable file location; the runtime creates the
  SQLite file and applies migrations on first start if it does not exist.
- `MSP_OLLAMA_URL` (default `http://localhost:11434`) is reachable if vector
  search is desired; it is optional — the runtime degrades gracefully to
  FTS-only search if unreachable.
- GoVibe's own MCP server process (`npm run mcp:dev` / `mission:dev`) is the
  only intended parent of this process, per ADR-026; do not spawn it any
  other way in production.

## 3. Roles

| Role | Responsibility |
|---|---|
| Operator | Starts/stops the process, sets `MSP_DB_PATH`/`GOVIBE_MSP_COMMAND`/`GOVIBE_MSP_ARGS`/`MSP_OLLAMA_URL`, runs manual decay ticks, performs backups |
| On-call reviewer | Confirms degraded-search state, decides whether a manual decay tick or a backup restore is required |
| Owner (Boss / CEO) | Approves any change to what this runbook authorizes; this document does not grant execution authority beyond what the governing CR/work packets have authorized |

## 4. Procedure

### 4.1 Starting the runtime

1. Set the required environment variables before starting GoVibe's MCP
   server process:
   - `GOVIBE_MSP_COMMAND` — the executable to spawn (e.g. `node`).
   - `GOVIBE_MSP_ARGS` — arguments, e.g. the path to
     `packages/msp-runtime/server.mjs`.
   - `GOVIBE_MSP_CWD` — optional working directory.
   - `MSP_DB_PATH` — absolute path to the SQLite file (created if absent).
   - `MSP_OLLAMA_URL` — optional; defaults to `http://localhost:11434`.
2. Start GoVibe's MCP server normally (`npm run mcp:dev`). GoVibe spawns the
   MSP runtime as a child process on first use of a governed operation that
   requires it; a valid configuration is not itself a health result (per
   ADR-026) — confirm the process actually started with `msp_health`, not merely
   the absence of a startup error.
3. On first start against a new `MSP_DB_PATH`, the runtime's migration
   runner applies every migration in order and records each in
   `schema_migrations`. Confirm the migration log shows no drift or
   downgrade rejection before treating the runtime as ready.

### 4.1.1 Checking bounded health

1. Call `msp_health` through the existing MSP stdio client.
2. Treat `health_state: "ready"` as repository-local readiness only when
   `components.msp`, `components.storage`, and the required operation's
   dependency are all `ready`.
3. In the default v1 configuration, `components.gks.state` is `blocked` with
   reason `gks_provider_unconfigured`, so the overall result is `degraded` and
   shared-scope promotion remains fail-closed.
4. Record the top-level and component `evidence_ref` values. They are opaque
   references; they do not grant a direct GKS or GenesisBlockDB connection.
5. For `unavailable`, `health_probe_timeout`, or
   `malformed_health_probe_response`, stop governed operations and investigate
   the bounded reason before retrying. Do not infer readiness from configuration
   presence or from `msp_ping` alone.

### 4.2 Stopping the runtime

1. Stop GoVibe's MCP server process; the child MSP runtime process should
   exit when its parent's stdio pipe closes (process-boundary contract from
   ADR-026 — the runtime is not meant to outlive its parent).
2. If the child process does not exit on its own, terminate it directly by
   PID. This is expected only as a fallback, not the normal shutdown path.
3. Confirm no other process still holds a write lock on `MSP_DB_PATH` before
   starting a new instance against the same file (WAL mode reduces but does
   not eliminate lock contention from a lingering process).

### 4.3 Confirming the "Ollama unreachable" degraded state

1. Call `msp_memory_search` with `mode: "hybrid"` (or `"vector"`).
2. Inspect the response: if `vector_available: false` and
   `searchMode: "fts_only"` are present, the runtime has detected Ollama is
   unreachable (or the embedding call timed out / the circuit breaker is
   open) and degraded to FTS-only search automatically. This is the
   authoritative signal — do not infer degraded state from result quality or
   from application logs alone; the response field is the contract.
3. If vector search is expected to be available, check `MSP_OLLAMA_URL`
   reachability directly (e.g. a manual HTTP call to the configured Ollama
   endpoint) and confirm the `bge-m3` model is loaded on that Ollama
   instance.
4. Vector-search unavailability never blocks `msp_memory_search` itself —
   `fts` results are still returned. Treat a fully empty response
   differently from a degraded one; they report different fields.

### 4.4 Running a decay tick manually

1. Call `msp_memory_decay_tick` with the target `vault_id` and
   `dry_run: true` first to preview transitions without persisting them.
2. Review the `transitioned` list in the response for entities moving
   between `active`, `decayed`, `archived`, and `forgotten`.
3. If the preview is acceptable, call `msp_memory_decay_tick` again with
   `dry_run: false` to persist the transitions.
4. There is no background scheduler; if periodic decay ticks are desired,
   configure an external cron/scheduled task to call this tool on the
   desired interval. Adding an in-process scheduler is explicitly out of
   scope for this runtime (see the governing CR's exclusions) and must not
   be worked around by an ad hoc operator script that bypasses the audit
   trail this tool writes.

### 4.5 Backup guidance

`MSP_DB_PATH` is a single SQLite file. Back it up like any other single-file
database:

1. Prefer a cold backup (stop the runtime, copy the file) when possible.
2. If a hot backup is required, use SQLite's own backup mechanism (e.g. the
   `.backup` CLI command or an equivalent API-level backup call) rather than
   copying the raw file while WAL-mode writes may be in flight, which can
   produce an inconsistent copy.
3. There is no separate backup service, no export tool, and no admin console
   for this runtime in v1 — bulk import/export is an explicit exclusion.
   Treat the SQLite file itself as the entire backup unit.

## 5. Rollback / Recovery

- To restore from a backup: stop the runtime, replace the file at
  `MSP_DB_PATH` with the backup copy, and restart. Confirm the migration
  runner reports the restored file's recorded schema version matches what
  the running `packages/msp-runtime` code expects; a mismatch surfaces as a
  clean, fail-closed migration error, not silent corruption.
- If a migration checksum-drift or downgrade-guard error blocks startup,
  do not hand-edit `schema_migrations` to bypass it — treat it as a real
  signal that the file and the running code disagree, and resolve the
  disagreement (restore the correct binary version, or restore the correct
  backup) rather than forcing past the guard.
- There is no runtime-level rollback for an individual `msp_memory_forget`
  call beyond what the bi-temporal history already preserves: the entity's
  prior state remains readable via `msp_memory_history` even after it is
  marked `forgotten`, because `msp_memory_forget` is a soft delete.

## 6. Evidence To Capture

- Migration log output at startup (applied versions, any drift/downgrade
  rejection).
- `msp_memory_search` responses used to confirm degraded state
  (`vector_available`, `searchMode`).
- `msp_health` response, including `health_state`, bounded `reason`, and opaque
  component evidence references.
- `msp_memory_decay_tick` dry-run and applied responses when performing a
  manual decay tick.
- Backup file checksum and timestamp for every backup taken.

## 7. Completion Criteria

- The runtime starts cleanly against a fresh or existing `MSP_DB_PATH` with
  migrations applying without drift or downgrade errors.
- A degraded-search state is confirmable from the `msp_memory_search`
  response alone, without needing to inspect process logs.
- The process health state is confirmable from `msp_health`; no claim relies on
  configuration presence alone.
- A manual decay tick can be previewed (`dry_run: true`) before being
  applied.
- A backup and restore cycle preserves all `active` and `decayed` entities
  and their full `entity_history`.

## What NOT to do

- Never hand-edit the SQLite file at `MSP_DB_PATH` directly (no manual
  `UPDATE`/`DELETE` via a SQLite client). Every mutation must go through the
  `msp_memory_*`/`msp_*` tool surface so the audit journal and bi-temporal
  history stay consistent.
- Never delete rows from `entity_history` for any reason, including manual
  cleanup or disk-space pressure. It is append-only by design (enforced by
  database triggers); the intended lifecycle control is
  `msp_memory_decay_tick`, not row deletion.
- Never import `packages/msp-runtime` as a library into GoVibe's own server
  process, and never point `GOVIBE_MSP_COMMAND` at anything other than this
  runtime's own composition root — doing so collapses the process boundary
  ADR-026 and ADR-027 both depend on.
- Never treat a valid `GOVIBE_MSP_COMMAND`/`GOVIBE_MSP_ARGS` configuration as
  proof the runtime is healthy; only a successful call result is evidence.
- Never add a direct GKS/GenesisBlockDB client or provider credential to GoVibe
  for health probing; `msp_health` is the MSP-owned boundary and GKS is opaque.
- Never work around the absence of an in-process scheduler by writing a
  script that calls internal runtime functions directly instead of the
  `msp_memory_decay_tick` tool; that bypasses the audit trail.

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.2.0+draft | 2026-08-14 | Added the implemented `msp_health` procedure, bounded timeout/malformed handling, opaque evidence-reference recording, and explicit no-direct-GKS operational rules. |
| 0.1.0+draft | 2026-08-04 | Initial operations runbook for the persistent-memory MSP runtime: start/stop procedure, configuration variables, degraded-search (`searchMode`/`vector_available`) confirmation procedure, manual decay-tick procedure, single-SQLite-file backup guidance, and explicit "never do this" operator rules. |
