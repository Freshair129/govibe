---
title: "Mission Control Protocol v2"
doc_id: "MISSION-PROTOCOL-V2"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-19"
owner: "ATHER"
source_of_truth: true
related_docs:
  - "docs/change-control/change-requests/CR-2026-08-10-MissionSnapshot-Orchestration-Contract.md"
  - "docs/architecture/BLUEPRINT-Mission-Gateway-Runtime-Responsibility-Split.md"
  - "docs/roadmap/MASTERPLAN-govibe-production-readiness.md"
---

# Mission Control Protocol v2

## 1. Version

- Semantic version: `2.0.0`
- Compatibility version: `2`
- Runtime source (shared validators and envelope helpers): `packages/mission-protocol/index.js`
- Sidecar transport source (HTTP + WebSocket): `scripts/mcp/sidecar-server.mjs`
- Frontend auth bootstrap source: `src/mission-auth-bootstrap.ts`

This document supersedes `docs/api/MISSION-PROTOCOL-v1.md` (removed; superseded by this file
in the same change). Every shape and behavior below is read directly from the three source
files above as they exist on this commit — this document describes what the runtime does
today, not an aspirational design.

## 2. What changed since v1

`docs/api/MISSION-PROTOCOL-v1.md` declared `1.0.0` / compatibility `1` and formally defined
only two of the sidecar's live endpoints (`/mission/commands`, `/mission/files`). Since that
document was written:

- `CR-2026-08-10-MissionSnapshot-Orchestration-Contract` moved the protocol to `2.0.0` /
  compatibility `2`: `orchestration` became a required `MissionSnapshot` field, and a v1
  snapshot missing it is invalid by design under `isMissionSnapshot`.
- TASK-PRD-026..033 (2026-08-19 contract-to-runtime audit remediation) added the
  `workflow.node.action` / `workflow.node.audit` pair, the `agent.session.*` command and event
  family, `memory.*` commands and events, the `dag.update` event, and command-response
  idempotency/dedup (§6 below) — none of which v1 documented.
- The WebSocket handshake's credential transport moved from a `?token=` query parameter to the
  `Sec-WebSocket-Protocol` header (TASK-PRD-028 / AUD-10b, AUD-32) — see §5.

This document is the first version of this file to carry governed frontmatter and a
`DOC-VERSION-REGISTRY` row (AUD-34 / TASK-PRD-034); v1 had neither.

## 3. Shared runtime contract surfaces

`packages/mission-protocol/index.js` owns runtime validation for:

- Mission commands (`isMissionCommand`)
- Mission events, including the correlated `command.ack` discriminator (`isMissionEvent`)
- Mission snapshots (`isMissionSnapshot`)
- Command response envelopes (`createCommandResponse`, `isCommandResponse`)
- Mutating/idempotent-retry command classification (`isMutatingMissionCommandType`,
  `IDEMPOTENT_RETRY_COMMAND_TYPES`) and a bounded LRU dedup window
  (`createCommandDedupWindow`) — see §6.

Every HTTP, WebSocket, and browser-event ingress validates against this shared contract before
it invokes runtime behavior or mutates UI state. Top-level command and event envelopes use a
closed-field policy (`hasOnlyKeys`): unknown fields, unknown discriminators, missing required
fields, and wrong field types are rejected. Nested domain records and unknown optional snapshot
fields remain forward-compatible because their contents are owned by their own domain
contracts, not the envelope check.

### 3.1 Resource limits (`MISSION_PROTOCOL_LIMITS`)

| Resource | Limit |
|---|---:|
| Discriminator (`type`) | 64 characters |
| Identifier / hash | 256 characters |
| Path | 4,096 characters |
| Terminal / query / reason command text | 16,384 characters |
| Array | 10,000 items |
| Metadata | 64 keys / 16,384 serialized bytes |
| File payload | 262,144 bytes |
| Event (serialized) | 1,000,000 bytes |
| Default JSON request body | 1,000,000 bytes |
| Agent session terminal buffer | 24,000 characters |

`GOVIBE_MCP_MAX_BODY_BYTES` configures the sidecar's HTTP body and WebSocket frame ceiling
(default: the `jsonBodyBytes` limit above). An oversized HTTP body returns `413`; malformed
JSON and schema-invalid commands return `400`.

### 3.2 Mission command types

Every `MissionCommand` the runtime validates (`isMissionCommand`'s switch), with its closed
field set:

| `type` | Fields | Notes |
|---|---|---|
| `terminal.command` | `command` | |
| `agent.select` | `agentId` | idempotent-retry-safe (§6) |
| `roadmap.select` | `sourcePath` | idempotent-retry-safe (§6) |
| `masterplan.preview` | `sourcePath` | idempotent-retry-safe (§6) |
| `workspace.scan` | `workspacePath`, `deep`, `runId?`, `actor?` | `actor` lets a caller attribute a governed scan (TASK-PRD-026) |
| `reactor.run` | `profile` | |
| `file.save` | `hash`, `data`, `meta` | rejected on `/mission/commands` and the WS command channel — only `POST /mission/files` may submit this type (§4.7) |
| `memory.search` | `vaultId`, `query`, `mode?`, `limit?` | `mode` one of `hybrid`/`fts`/`vector` |
| `memory.select` | `entityId` (nullable) | |
| `memory.forget` | `entityId`, `reason` | |
| `memory.decay.run` | `vaultId`, `dryRun?` | |
| `agent.session.start` | `agent`, `cwd`, `accessScope`, `approvalRef?`, `actor?`, `cols?`, `rows?` | `accessScope` one of `H0`-`H4` |
| `agent.session.input` | `sessionId`, `data` | |
| `agent.session.stop` | `sessionId` | |
| `agent.session.resize` | `sessionId`, `cols`, `rows` | 1-500 |
| `workflow.node.action` | `taskId`, `action`, `actor`, `assigneeId?`, `approvalRef?` | `action` one of `approve`/`rerun`/`assign` |

Any other `type` value is rejected.

### 3.3 Mission event types

Every `MissionEvent` the runtime validates (`isMissionEvent`'s switch): `snapshot`,
`terminal.line`, `metrics.update`, `chart.update`, `agents.update`, `graph.update`,
`heatmap.update`, `roadmap.snapshot`, `dag.update`, `roadmap.node.update`,
`roadmap.assignment`, `roadmap.handoff`, `roadmap.verification`, `orchestration.update`,
`workflow.run`, `memory.search.result`, `memory.selection`, `memory.forgotten`,
`memory.decay.result`, `usage.update`, `sessions.update`, `agent.session.output`,
`workflow.node.audit`, and the correlated `command.ack`. Each carries a closed field set scoped
to its own payload (for example `workflow.node.audit`'s `entry` requires `id`, `actor`,
`taskId`, `action`, `at`, with optional `approvalRef`, `approvalApprover`,
`approvalRecordedAt` — the last two link an audited action back to a verified approval record,
TASK-PRD-029 / AUD-08).

### 3.4 Command response envelope

`createCommandResponse` produces, and `isCommandResponse` validates:

```json
{
  "protocolVersion": "2.0.0",
  "compatibilityVersion": 2,
  "commandId": "uuid",
  "ok": true,
  "message": "optional bounded message (<= 240 chars, truncated with an ellipsis)",
  "snapshot": {},
  "result": {}
}
```

`isCommandResponse` requires an EXACT match on `protocolVersion` and `compatibilityVersion` —
there is no version range accepted (see §7 on the absence of negotiation).

## 4. Sidecar endpoints

`scripts/mcp/sidecar-server.mjs` exposes eight live surfaces: seven HTTP routes and one
WebSocket path. `docs/roadmap/MASTERPLAN-govibe-production-readiness.md`'s AUD-34 finding
named six of these as the floor to formally define (`/mission/snapshot`, `/roadmap/sources`,
`/mission/commands`, `/mission/ws`, `/usage/ingest`, `/mission/files`); this document also
defines the two it omitted (`GET /usage/snapshot`, `GET /usage/history`) rather than leaving
live surfaces undocumented.

Every route below shares one authentication and origin policy — see §5 — applied before the
route is matched. `OPTIONS` requests get a CORS preflight response (`204` if the origin is
allowed, `403` otherwise) and are not listed per-route below.

### 4.1 `GET /mission/snapshot`

- Auth: bearer token + origin allowlist (§5).
- Query: `source` (optional) — a roadmap source path; if present, the server calls
  `runtime.reloadRoadmap(source)` before responding, so this request can have a side effect.
- Response `200`: the full current `MissionSnapshot` object (raw, not wrapped in a command
  response envelope).
- Errors: `401` (`{"error":"unauthorized"}`) on a bad/missing token, `403`
  (`{"error":"origin-not-allowed"}`) on a disallowed `Origin` header.

### 4.2 `GET /roadmap/sources`

- Auth: bearer token + origin allowlist.
- Response `200`: `{ "activeSource": string | null, "sources": RoadmapSourceRecord[] }`, where
  `activeSource` is the current snapshot's `roadmap.sourcePath` (or `null`) and `sources` is
  `runtime.listRoadmapSources()`'s result (each record: `title`, `sourcePath`, `sourceType`,
  `transportType`, `approvalStatus?`, `updatedAt`, `score?`, `scoreBreakdown?`, `active`).
- Errors: `401`/`403` as above.

### 4.3 `POST /usage/ingest`

- Auth: bearer token + origin allowlist.
- Request body: an arbitrary usage payload from the token-monitor bridge — either
  `{ quota: {...}, code_usage?, account_id?, source? }` or the quota fields at the top level;
  the server reads `payload.quota ?? payload` and independently reads `code_usage`,
  `account_id`, `source` off the top-level body. There is no `isMissionCommand`-style schema
  gate on this endpoint's body — the server normalizes whatever a caller sends with `??`
  fallbacks to empty objects/`"unknown"`, so a malformed body degrades to an unlabeled usage
  record rather than a `400`.
- Response `200`: `{ "ok": true, "stored": true, "history_length": number }` on success, or
  `400` `{ "error": "<bounded message>" }` if `runtime.ingestUsageData` throws.
- Side effects: replaces the in-memory current usage snapshot, appends to an in-memory history
  ring buffer (capped at 2,016 entries — 7 days at 5-minute resolution), patches `usage` onto
  the live `MissionSnapshot`, and emits a `usage.update` event to every connected WS client.
- Errors: `401`/`403` as above; `400` on a thrown ingest error.

### 4.4 `GET /usage/snapshot`

- Auth: bearer token + origin allowlist.
- Response `200`: the current usage snapshot (`{overview, overview_7d, models, models_7d,
  code_usage, account_id, last_sync, source}`), or an all-empty placeholder shape
  (`account_id: "none"`, `last_sync: null`, `source: "none"`) if nothing has been ingested yet.
- Errors: `401`/`403` as above.

### 4.5 `GET /usage/history`

- Auth: bearer token + origin allowlist.
- Query: `days` (optional, default `7`) — filters the in-memory history ring buffer to entries
  ingested at or after `now - days*86400000`.
- Response `200`: an array of usage-snapshot-shaped records, each additionally carrying
  `ingested_at`.
- Errors: `401`/`403` as above.

### 4.6 `POST /mission/commands`

- Auth: bearer token + origin allowlist.
- Request body: a `MissionCommand` (§3.2), optionally with a top-level `commandId` string the
  caller supplies for idempotent retry (§6). `type: "file.save"` is explicitly rejected here —
  it must go through `POST /mission/files` (§4.7).
- Response `200`: a command response envelope (§3.4) with `ok: true`, `result` (the command
  router's return value), and a **fresh** `snapshot` (never a cached one, even on a dedup
  replay — see §6).
- Response `400`: envelope with `ok: false` and `message: "Mission command failed protocol
  validation."` if the body fails `isMissionCommand` or is a rejected `file.save`.
- Response `500`: envelope with `ok: false` and a bounded `message` if
  `runtime.handleMissionCommand` throws.
- Idempotency: see §6 — a duplicate delivery of a mutating command's `commandId` (client
  retry, or a replay arriving on the other transport) returns the cached original outcome
  instead of re-executing.

### 4.7 `POST /mission/files`

- Auth: bearer token + origin allowlist.
- Request: raw file bytes as the HTTP body (bounded by `min(GOVIBE_MCP_MAX_BODY_BYTES,
  262144)`), with two required headers: `X-GoVibe-File-Hash` (the bounded hash string) and
  `X-GoVibe-File-Meta` (base64url-encoded JSON metadata, validated by `isFileSaveMetadata`).
  This is the only route that accepts `file.save`.
- Response `200`: a command response envelope with `ok: true`, `result`, and a fresh
  `snapshot`. This route mints its own `commandId` (`crypto.randomUUID()`) — a client cannot
  supply one, so file saves are never idempotency-deduplicated (§6).
- Response `400`: `{"error": "Invalid file transfer metadata."}` if the headers are missing or
  malformed, or `{"error": "File transfer failed protocol validation."}` if the reconstructed
  `file.save` command fails `isMissionCommand` (e.g. oversized payload).

### 4.8 `WS /mission/ws`

- Auth: bearer token + origin allowlist, checked at the HTTP Upgrade request, **before** the
  WebSocket handshake completes — see §5 for exactly how the token travels.
- On successful connection: the server immediately sends one `{"type":"snapshot","snapshot":
  <MissionSnapshot>}` frame with the full current state.
- Client → server frames: JSON-encoded `MissionCommand` (optionally with `commandId`), text
  frames only — a binary frame gets an immediate `command.ack` with `ok: false` and a fixed
  message (`"Binary mission command frames are not supported."`), with a server-minted
  `commandId` since none could be parsed from a binary frame. Malformed JSON gets the same
  treatment with `"Mission command frame was not valid JSON."`. A command failing
  `isMissionCommand` (or a `file.save`, which is rejected on this channel too) gets
  `"Mission command failed protocol validation."`.
- Server → client frames on a valid command: `{"type":"command.ack", "commandId", "ok": true,
  "snapshot": <fresh MissionSnapshot>}` on success, or `{"type":"command.ack", "commandId",
  "ok": false, "message"}` on a thrown handler error (also appended to the runtime's terminal
  log as a `warn` line).
- Broadcast events: every `runtime.subscribe` event that passes `isMissionEvent` is
  JSON-serialized and sent to every currently-open WS client. An event that fails validation is
  never published to any client; instead the runtime appends a `warn` terminal line noting the
  drop.
- Idempotency: shares the same dedup window as `POST /mission/commands` (§6) — a mutating
  `commandId` already applied via one transport is not re-applied via the other.
- Connection rejection: a bad token or disallowed origin closes the upgrade with a raw
  `403 Forbidden` (not a JSON error body — the WebSocket handshake never completes far enough
  to negotiate one); a path other than `/mission/ws` gets a raw `404 Not Found`.

## 5. Authentication and origin policy

Every HTTP route and the WS upgrade share one policy, checked in this order: `OPTIONS`
short-circuits to a CORS preflight response; every other request is rejected `403`
(`origin-not-allowed`) if `Origin` is not in the allowlist (`GOVIBE_MCP_ALLOWED_ORIGINS`,
comma-separated; defaults to the four loopback dev origins in
`DEFAULT_ALLOWED_ORIGINS` — `127.0.0.1`/`localhost` on ports `1420` and `5173`), then rejected
`401` (`unauthorized`) if the bearer token does not match `GOVIBE_MCP_TOKEN` under a
constant-time comparison (`timingSafeEqual`).

- **HTTP**: the token travels as a standard `Authorization: Bearer <token>` header. The
  frontend's `installMissionAuthBootstrap()` (`src/mission-auth-bootstrap.ts`) patches
  `window.fetch` to attach this header automatically for any request whose target resolves to
  the configured sidecar origin.
- **WebSocket**: the token does **not** travel as a `?token=` query parameter (that was the
  pre-TASK-PRD-028 behavior and is a documented past exposure — see AUD-10b/AUD-32: a
  query-string token lands in access logs, browser/proxy history, and `Referer` headers on any
  later same-origin navigation). Instead it travels base64url-encoded as the **last** offered
  `Sec-WebSocket-Protocol` subprotocol (RFC 6455) — the only mechanism the browser
  `WebSocket` constructor exposes for attaching a credential the server can read before
  completing the handshake. The client offers a second, fixed, non-secret sentinel protocol
  (`govibe-mission-control`, `WS_ECHO_SUBPROTOCOL`) alongside the token so the server has a
  real client-offered protocol it can select and echo in the `101` response's
  `Sec-WebSocket-Protocol` header — echoing the token-carrying protocol instead would leak the
  credential into that response header too, which some reverse proxies log.
- `GOVIBE_MCP_TOKEN` is required at server startup — `startSidecarServer` throws immediately if
  it is unset, so the sidecar cannot boot unauthenticated by omission.

## 6. Idempotency and command deduplication (TASK-PRD-033 / AUD-18)

Command types split into two classes, both defined once in `packages/mission-protocol/index.js`
and consumed identically by the frontend gateway (`src/mission/gateway.ts`) and the sidecar
(`scripts/mcp/sidecar-server.mjs`):

- **Idempotent-retry-safe** (`IDEMPOTENT_RETRY_COMMAND_TYPES`): `agent.select`,
  `roadmap.select`, `masterplan.preview`. These are read-shaped — redoing them is harmless — so
  the gateway deliberately retries an ack timeout with the **same** `commandId`, expecting a
  fresh execution each time. The server never caches or dedups these.
- **Mutating** (everything else, including an unrecognized/empty `type` — fails closed to
  "unsafe to blindly re-run"): the server applies each `(type, commandId)` pair **at most once**
  across the process's lifetime, however many times that exact pair is delivered, on either
  transport. A duplicate delivery replays the cached `{ok, message?, result?}` outcome instead
  of re-invoking `runtime.handleMissionCommand` — but the `snapshot` attached to that replayed
  response is always a **fresh** `runtime.getSnapshot()` call, never the cached one, so a client
  is never shown state that predates its own latest known state.
- The cache is a single in-memory LRU (`createCommandDedupWindow`, default 500 entries) shared
  by both transports, keyed on `${command.type}:${commandId}` (not `commandId` alone — two
  different command types that happen to share a `commandId` do not collide). Only a
  **client-supplied** `commandId` is ever cached; a server-minted one (the client sent none) can
  by construction never be replayed with the same id, so caching it would only waste an LRU
  slot.

**Honest limitations**: the dedup window is bounded and in-memory only — it does not survive a
sidecar restart, and once 500 distinct mutating `(type, commandId)` pairs have been seen since
the last eviction, the least-recently-used entry is evicted and a very late duplicate of that
specific pair would re-execute. This is a best-effort, single-process dedup guarantee, not a
durable exactly-once contract across restarts.

## 7. Ordering and version-negotiation limitations (honest, not aspirational)

- **No sequence numbers.** No command, event, or command-response envelope carries a monotonic
  sequence number. WS events are broadcast to every open client at emit time in emission order,
  but nothing in the wire contract lets a client detect a dropped frame, detect reordering, or
  reconcile a gap after a reconnect beyond the fresh `snapshot` frame the server sends on
  connection open (§4.8). A client that needs a stronger consistency guarantee than "the next
  successful `GET /mission/snapshot` or WS reconnect reflects the latest state" must poll or
  reconnect — there is no protocol primitive for it today.
- **No version negotiation.** `isCommandResponse` requires an exact match on both
  `protocolVersion` and `compatibilityVersion` (§3.4) — there is no handshake where client and
  server agree on a compatible range, and no fallback behavior for a mismatch beyond outright
  rejection. In practice this works because the frontend and the sidecar both import the same
  `packages/mission-protocol/index.js` at the same commit; a genuinely out-of-process external
  integration (§8) has no negotiation path and must pin to this exact compatibility version and
  update in lockstep with the runtime.

## 8. External ingest migration

An external integration talking to the sidecar (rather than the bundled frontend) must:

1. Send the standard command payload plus a stable, caller-chosen `commandId` if it wants
   dedup protection on mutating commands (§6) — an integration that omits `commandId` gets no
   idempotency guarantee at all.
2. Read `protocolVersion` and `compatibilityVersion` from every command response and treat a
   mismatch as a hard incompatibility (§7) — there is no negotiation to fall back to.
3. Correlate WebSocket acknowledgements using `commandId`, not delivery order (§7).
4. Treat unknown optional snapshot fields as opaque data rather than a failure (§3).
5. Reject unsupported `compatibilityVersion` values before mutating local operational state.
6. Use `result` and `snapshot` inside the response envelope, not any raw runtime return value.
7. Send `file.save` bytes only to authenticated `POST /mission/files` as
   `application/octet-stream`, with the bounded hash and base64url-encoded JSON metadata in
   `X-GoVibe-File-Hash` / `X-GoVibe-File-Meta` (§4.7) — JSON-encoded file arrays and binary
   WebSocket command frames are rejected everywhere else.
8. Carry the WS auth token as a `Sec-WebSocket-Protocol`-encoded value (§5), never as a `?token=`
   query parameter — the sidecar no longer accepts the latter.

## 9. Breaking-change policy

The contract tests (`src/missionProtocol.test.ts`, plus the sidecar RBAC/auth security suites)
intentionally reject:

- Missing required snapshot fields (`orchestration` and friends — §3.4).
- Missing command acknowledgement correlation IDs.
- Unsupported compatibility versions.
- Unknown command or event discriminators.
- Unknown top-level command or event fields.
- Wrong field types and values above the published resource limits (§3.1).

Any change that requires relaxing one of those checks is a protocol-breaking change and must be
reviewed as one — including a `DOC-VERSION-REGISTRY` and masterplan sync, not slipped into an
unrelated feature commit.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-19 | ATHER | Initial governed version, replacing `docs/api/MISSION-PROTOCOL-v1.md` (removed). Brought the declared semantic/compatibility version to match the shipped `2.0.0`/`2`, formally defined all eight live sidecar surfaces (the six named by AUD-34 plus `GET /usage/snapshot` and `GET /usage/history`, which AUD-34 did not enumerate but which are live), documented the TASK-PRD-028 WS auth transport (`Sec-WebSocket-Protocol`, not `?token=`) and the TASK-PRD-033 idempotency/dedup behavior, and added the honest ordering/version-negotiation limitations §7. Opened from AUD-34 / TASK-PRD-034. |
