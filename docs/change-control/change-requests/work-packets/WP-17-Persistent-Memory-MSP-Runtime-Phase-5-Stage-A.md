---
title: "WP-17: Persistent-Memory MSP Runtime — Phase 5 Stage A (Links + GoVibe Bridge)"
doc_id: "WP-17-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-5-STAGE-A"
status: "draft"
version: "0.2.5+draft"
updated: "2026-08-06"
owner: "Boss (CEO)"
proposal_author: "Claude (final-gate session)"
approval_owner: "Boss (CEO)"
source_of_truth: false
approval_recorded_at: "2026-08-06"
execution_authorized: true
execution_complete: true
complexity: "C-3"
access_scope: "H4"
risk: "HIGH"
parent_change_request: "CR-2026-08-04-PERSISTENT-MEMORY-MSP-RUNTIME"
depends_on: "WP-16-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-4"
related_adrs: ["ADR-027", "ADR-026", "ADR-023"]
related_apis: ["API-009"]
---

# WP-17: Persistent-Memory MSP Runtime — Phase 5 Stage A (Links + GoVibe Bridge)

## Objective

Deliver the data half of Phase 5: the typed entity-link graph inside
`packages/msp-runtime`, and the complete GoVibe-side bridge that carries
memory state from that runtime into GoVibe's MCP server and all the way to
Mission Control's snapshot — with **no user interface**. At the end of this
packet, memory data is reachable by agents through `govibe.memory.*` MCP
tools and present in `MissionSnapshot`, but nothing renders it. Stage B
(WP-18) is purely presentational and depends on this packet.

The risk being accepted is blast radius: this is the first packet in the
series to modify GoVibe's own runtime code (`scripts/mcp/**`), its
wire-protocol allow-list (`packages/mission-protocol/**`), and its frontend
data layer (`src/mission/**`). A defect here can degrade Mission Control for
every domain, not only Memory — including silently, via the failure mode in
Bounded scope item 4.

## Why this packet is Stage A of two

The governing CR describes Phase 5 as one phase. It was originally authored
as a single work packet, which carried a recommendation to split it because
it spanned three risk domains and crossed the `packages/msp-runtime`
boundary that WP-12 through WP-16 all stayed inside. The owner authorized
the split on 2026-08-05.

The split boundary is **data vs. presentation**, refined slightly from the
original marking:

- **Stage A (this packet)** — everything that moves or shapes data: the
  runtime's links, the typed MSP client, the runtime service, command
  routing, the `govibe.memory.*` tool surface, the mission-protocol
  allow-list, and the `MissionSnapshot` type plus its reducer/merge wiring.
  All of it is testable without rendering anything, using the reducer and
  protocol test conventions this repo already has.
- **Stage B (WP-18)** — navigation registration, the Domain E view
  components, styling, and the design-doc updates. Purely presentational,
  consuming the snapshot slice this packet delivers.

Placing the snapshot type and reducer wiring in Stage A (rather than with
the views) is deliberate: `mergeMissionSnapshot` silently drops any field it
does not explicitly carry, so shipping the emit path without the merge path
would produce a bridge that appears to work and delivers nothing. Keeping
both in one packet makes Stage A independently verifiable end to end.

## Ground truth as of 2026-08-05 (verify before editing; do not assume)

This packet is written to be executable by a session with no prior context.

### `packages/msp-runtime` (after WP-12/13/14, and by execution time WP-15/16)

- Test baseline after WP-14 was 92 tests (70 vitest + 22 `node --test`);
  WP-15 and WP-16 will have raised it. Re-measure with `npm test` inside
  `packages/msp-runtime` and treat the real number as the no-regression floor.
- `src/` layers: `db/`, `domain/`, `contracts/`, `transport/`, plus
  `server.mjs` (composition root). WP-15 adds `retrieval/`.
- Layering rule enforced by `packages/msp-runtime/test/dependency-boundaries.test.mjs`:
  `db <- domain <- retrieval`, `domain <- contracts`,
  `{db, domain, retrieval, contracts} <- transport`; `domain` never imports
  `retrieval` or `contracts`.
- **There is no `links` table** — this packet creates it.
- Vault scoping is mandatory on every entity-touching path (WP-14 closed a
  confirmed cross-agent disclosure); links are entity-touching.
- Wire contract: newline-delimited JSON-RPC 2.0 over stdio matching
  `packages/govibe-core/src/msp-stdio-transport.mjs`.

### GoVibe MCP server (`scripts/mcp/`)

- **Runtime service pattern** (copy this shape): a plain class in
  `scripts/mcp/runtime/<name>-service.mjs`, constructed with an options
  object (`{snapshotStore, mspClient, ...}`), whose methods call out and then
  `this.snapshotStore.patch({...})` and `this.snapshotStore.emit({type, ...})`.
  See `scripts/mcp/runtime/roadmap-service.mjs` and `workspace-service.mjs`.
  Wire the new service once in `scripts/mcp/runtime-core.mjs`'s
  `GovibeRuntime` constructor alongside the existing services.
- **`scripts/mcp/runtime/dependency-boundaries.test.mjs` automatically covers
  any new file placed in `scripts/mcp/runtime/`** — it statically asserts no
  runtime service imports `runtime-core|sidecar-server|govibe-mcp-server` and
  that the service import graph is acyclic. Respect the layering; the test is
  free governance, not an obstacle to route around.
- **Typed-client pattern**: `scripts/mcp/msp-vault-context-contracts.mjs`'s
  `createTypedVaultContextMsp(client)` is the established shape for
  validating MSP responses before GoVibe trusts them (`requireString`,
  `requireRef(value, "msp:...", label)`, `requireHash`, `requireDecision`).
  The new `msp-memory-contracts.mjs` must mirror it, including rejecting any
  `gks:`-namespaced reference.
- **Command routing**: `scripts/mcp/runtime/mission-command-router.mjs` is a
  flat `if (command.type === "...")` dispatcher returning
  `{ok, action, result, snapshot}`.
- **MCP tool exposure**: `scripts/mcp/govibe-mcp-server.mjs` dispatches
  `tools/call` by checking `handlesVaultContextTool(name)` first, then
  falling through to `handleToolCall`. A new `govibe.memory.*` surface
  follows `scripts/mcp/vault-context-surface-v2.mjs`'s shape
  (`memoryToolCatalog` + `handlesMemoryTool` + `createMemoryToolHandler`).
  **Note**: a tool named `govibe.memory.promote` already exists in
  `scripts/mcp/vault-context-surface.mjs` — reuse it, do not duplicate it.
- `scripts/mcp/runtime/snapshot-store.mjs`'s `createRuntimeSnapshot()`
  defines the server-side default snapshot shape and must gain the memory
  slice as an empty value (never `undefined`, matching every other
  array-typed field's convention).

### The protocol gate and the frontend data layer

- **`packages/mission-protocol/index.js` is the real security boundary**, not
  `src/mission/domain.ts`. Both the sidecar (`scripts/mcp/sidecar-server.mjs`)
  and the browser gateway (`src/mission/gateway.ts`) validate against it.
  **Its failure mode is silent**: an event whose `type` has no `case` in
  `isMissionEvent` is *dropped with a console warning, not an error* — the
  bridge will look connected and deliver nothing. This is the single easiest
  defect to ship unnoticed in this packet.
- `MISSION_PROTOCOL_LIMITS.eventBytes` is `1_000_000`. Memory results embed
  entity bodies; an oversized payload is silently rejected by that same gate.
  Cap result count and per-entity body size **server-side**, not in the UI.
- `isMissionSnapshot` does **not** allow-list top-level keys, so a new
  optional snapshot field passes validation without a change there — but
  `isMissionEvent` and `isMissionCommand` **do** switch on `type` with
  `hasOnlyKeys`, so every new event and command type needs an explicit case.
- `src/mission/domain.ts` holds `MissionSnapshot`, `MissionEvent`,
  `MissionCommand`, `DomainId`, and `ViewId`. This packet adds the memory
  types, events, and commands. It does **not** add `DomainId` `"E"` or any
  `ViewId` — those are Stage B's, since nothing navigates to a view that
  does not exist.
- `src/mission/snapshot-reducer.ts`: `emptyMissionSnapshot` needs the new
  slice as an empty value (never mock content); `mergeMissionSnapshot` uses
  an **explicit per-field fallback** pattern — a field not listed there is
  silently dropped on merge; `reduceMissionEvent` needs a `case` per new
  event type. `src/mission/snapshot-reducer.test.ts` is the established
  place to test all three.

## Preconditions

- WP-16 is execution-complete and independently verified.
- `docs/api/API-009-Persistent-Memory-Contract.md` §4.8-§4.9 define
  `msp_memory_links_list` / `msp_memory_links_create`, and its
  `govibe.memory.*` section defines the GoVibe-side exposure. Read them
  directly; they are the wire contract, not a summary.
- `docs/adr/ADR-023-Knowledge-Authority-Context-Authority-Boundary.md` and
  `docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md` govern what the
  bridge may and may not do — in particular, GoVibe may never mint a
  `gks:`-namespaced canonical identity, and the runtime remains a separate
  OS process reached over stdio, never imported as a library into GoVibe's
  server process.

## Bounded scope

1. **`domain/links.mjs` + migration** (inside `packages/msp-runtime`): a
   `links` table (source entity, target entity, typed relation, confidence,
   bi-temporal validity columns consistent with `domain/temporal-engine.mjs`'s
   semantics) with flat create/list only. **No traversal, no backlink
   materialization, no graph queries** — the table accumulates data now so a
   future graph layer has history to work with, but nothing walks it here.
   Both endpoints must be vault-scoped, and a link whose endpoints are in two
   different vaults must be rejected.

2. **`msp_memory_links_list` / `msp_memory_links_create`** (API-009
   §4.8/§4.9) in the existing `transport/handlers/memory-handlers.mjs`,
   vault-scoped via the established `contracts/vault-scope-guard.mjs` +
   `isVaultAccessibleTo` pattern (handler computes the boolean, guard
   receives it — `contracts/` must not import `domain/vault-registry.mjs`).
   One `journal` row per mutating call.

3. **GoVibe-side bridge** (`scripts/mcp/`):
   - `scripts/mcp/msp-memory-contracts.mjs` (new) — typed client mirroring
     `msp-vault-context-contracts.mjs`, validating every response field and
     rejecting `gks:` namespaces.
   - `scripts/mcp/runtime/memory-service.mjs` (new) — runtime service in the
     established shape, calling MSP then `snapshotStore.patch` + `.emit`.
   - `scripts/mcp/runtime-core.mjs` — construct the service in
     `GovibeRuntime`'s constructor plus thin delegate methods.
   - `scripts/mcp/runtime/mission-command-router.mjs` — `memory.*` command
     branches returning the established `{ok, action, result, snapshot}` shape.
   - `scripts/mcp/memory-surface.mjs` (new) — the `govibe.memory.*` MCP tool
     surface, dispatched from `govibe-mcp-server.mjs` alongside the existing
     vault-context surface. Reuse the pre-existing `govibe.memory.promote`.
   - `scripts/mcp/runtime/snapshot-store.mjs` — memory slice in
     `createRuntimeSnapshot()`'s default shape.
   - Server-side caps on result count and per-entity body size, so a
     legitimate large memory cannot exceed `MISSION_PROTOCOL_LIMITS.eventBytes`
     and blackhole its own update.

4. **Protocol allow-list** — `packages/mission-protocol/index.js` and
   `index.d.ts`: new `isMissionEvent` cases and `isMissionCommand` cases for
   the memory events and commands, with the same `hasOnlyKeys` +
   bounded-length discipline every existing case uses. **This is mandatory;
   without it the bridge silently emits nothing.**

5. **Frontend data layer only** (`src/mission/`): memory types added to
   `src/mission/domain.ts` (`MissionSnapshot` slice, `MissionEvent` variants,
   `MissionCommand` variants — **no `DomainId` `"E"`, no `ViewId`**);
   `emptyMissionSnapshot`, `mergeMissionSnapshot`, and `reduceMissionEvent`
   updated in `src/mission/snapshot-reducer.ts`. No component, no
   navigation entry, no route.

6. **Doc updates**: `docs/lld/LLD-GoVibe-MCP-Tools.md` updated for the new
   `govibe.memory.*` tools (it is the canonical tools doc — do not create a
   second one), with a version bump, Changelog row, and a synchronized row in
   `docs/DOC-VERSION-REGISTRY.md`.

## Explicit exclusions

- **All Mission Control UI** — `DomainId` `"E"`, any `ViewId`,
  `src/mission/navigation.ts`, `src/app/RenderView.tsx`,
  `src/features/memory/**`, styling, and the `docs/design/SITE_MAP.md` /
  `docs/design/DOMAIN_DETAILS.md` updates. All of that is Stage B (WP-18).
- Graph traversal, backlink materialization, community detection, GraphRAG,
  or any multi-hop reasoning over `links`. The table is written, never walked.
- Pointing `GOVIBE_MSP_COMMAND` at `packages/msp-runtime` in GoVibe's real
  runtime configuration. Even after this packet the bridge is code that
  *would* work if a runtime were configured; designating this runtime as
  GoVibe's live MSP parent is a separate decision, and ADR-026's fail-closed
  requirements still govern it (a configured transport is not a health
  result; a missing parent blocks governed operations rather than falling
  back to local storage).
- Any relaxation of `msp_knowledge_promote` / `msp_memory_promote
  (target_scope=shared)`'s fail-closed `gks_provider_unconfigured` stub, or
  any minting of `gks:` identity anywhere in the bridge.
- ADR-020's tiering, distillation cadence, LCA conflict resolution.
- Modifying `packages/govibe-core/src/msp-client.mjs`,
  `scripts/mcp/msp-vault-context-contracts.mjs`, or
  `scripts/mcp/context-authority-contract.mjs` — the frozen contracts every
  prior packet built against.

## Acceptance and exit gate

- AC-01: `links` create/list work vault-scoped over the **real** stdio child
  process; a link whose endpoints are in two different vaults is rejected.
  Cross-vault rejection is security-relevant and belongs in a
  `*.security.mjs` file.
- AC-02: `scripts/mcp/msp-memory-contracts.mjs` rejects a `gks:`-namespaced
  reference in any response field, proven by a test with a fake client
  returning one.
- AC-03: **the protocol allow-list additions are proven to work end to end.**
  Given the silent-drop failure mode, an integration-level assertion that an
  emitted memory event actually survives the sidecar's `isMissionEvent` gate
  and reaches a subscriber is worth more than a unit assertion that the
  predicate returns `true`. Include a negative test proving a malformed or
  oversized variant is rejected.
- AC-04: `scripts/mcp/runtime/dependency-boundaries.test.mjs` still passes
  unmodified with `memory-service.mjs` present (no upward import, no cycle).
- AC-05: server-side result/body caps are enforced and tested — a
  deliberately oversized memory does not produce an event exceeding
  `MISSION_PROTOCOL_LIMITS.eventBytes`.
- AC-06: `src/mission/snapshot-reducer.test.ts` covers the new event
  reduction **and** the merge fallback — specifically, a patch that omits the
  memory slice must not drop it. This is the assertion that proves Stage B
  will have data to render.
- AC-07: no regression against `packages/msp-runtime`'s test baseline;
  report the final count and how many pre-existing tests required
  modification and why.
- AC-08: repo-root gates pass — `npm run lint` (`tsc --noEmit`), `npm test`,
  and `npm run build`. This packet touches TypeScript for the first time in
  the series, so the frontend gates matter even though it ships no UI.
- AC-09: `node scripts/docs/validate-docs.mjs` and
  `node scripts/docs/diff-check.mjs` pass, with the LLD and registry updates
  landed in the same change as the code (diff-check requires a doc change
  accompanying code changes).
- AC-10: independent review and owner approval recorded **before** closure.

## Rollback

Capture pre-change source hashes and inverse patches before any runtime or
test mutation. Unlike WP-12 through WP-16, **this packet is not
self-contained inside an unwired package** — rollback must restore
`scripts/mcp/**`, `packages/mission-protocol/**`, and `src/mission/**` as
well as `packages/msp-runtime/**`, plus a downgrade migration dropping
`links`. Because `packages/mission-protocol/index.js` is enforced by both the
sidecar and the browser gateway, a partial rollback reverting one side but
not the other produces silent event drops; roll the protocol package back
together with its consumers, and re-run `npm run baseline:check` after any
rollback step.

## Owner accepted-risk record

Authorized 2026-08-06 by Boss (CEO), owner and approval owner, in the
resuming session's chat channel (directive: "เริ่ม WP-17" — start WP-17),
after that session presented this packet's Ground truth, Bounded scope, and
risk framing (C-3/H4, risk HIGH — the first packet in the series to modify
GoVibe's own runtime code, protocol allow-list, and frontend data layer, with
the silent-drop failure mode of `packages/mission-protocol/index.js` called
out explicitly) for review, with WP-16 already `execution_complete: true`
(its precondition), closed by explicit owner approval in chat on 2026-08-05.
Recorded here, in frontmatter, before implementation is dispatched, per the
process correction established by WP-14: an executing session must not set
its own `execution_authorized` / `execution_complete` flags. This entry sets
`execution_authorized` only; `execution_complete` remains false until
independent post-execution verification is recorded separately.

## Execution closure

Executed on `feat/wp-17-msp-runtime-phase-5-stage-a` (branched from
`feat/wp-16-msp-runtime-phase-4` at the WP-17 authorization commit). Bounded
Scope items 1-6 built:

1. **`domain/links.mjs` + `db/migrations/0006_links.sql`**
   (`packages/msp-runtime`): a flat `links` table (bi-temporal columns
   consistent with `domain/temporal-engine.mjs`'s naming), create/list only,
   idempotent by `(vault_id, from_entity_id, to_entity_id, link_type)`. No
   traversal, no backlink materialization, no graph query.
2. **`msp_memory_links_list`/`msp_memory_links_create`**
   (API-009 §4.8/§4.9) added to the existing `memory-handlers.mjs`. One
   journal row per successful create.
3. **GoVibe-side bridge**: `scripts/mcp/msp-memory-contracts.mjs` (typed
   client for search/forget/decay_tick, rejecting any `gks:`-namespaced
   reference recursively in the response), `scripts/mcp/runtime/memory-service.mjs`
   (search/select/forget/decayRun, server-side result-count cap of 20 hits
   and 500-char body-preview truncation per hit), wired into
   `runtime-core.mjs` (constructor + four delegate methods) and
   `mission-command-router.mjs` (four `memory.*` command branches).
   `scripts/mcp/memory-surface.mjs` exposes the four `govibe.memory.*` tools
   (search/select/forget/decay.run), reusing the pre-existing
   `govibe.memory.promote` without duplication. `snapshot-store.mjs`'s
   `createRuntimeSnapshot()` gained the `memory` slice, always a real object.
4. **Protocol allow-list**: `packages/mission-protocol/index.js` and
   `index.d.ts` gained `isMissionCommand`/`isMissionEvent` cases for the four
   new command types and four new event types, same `hasOnlyKeys` +
   bounded-length discipline as every existing case.
5. **Frontend data layer**: `src/mission/domain.ts` gained
   `MissionMemory*` types, the `MissionSnapshot.memory` slice, and the eight
   new `MissionEvent`/`MissionCommand` variants (no `DomainId` `"E"`, no
   `ViewId`, per Explicit Exclusions). `src/mission/snapshot-reducer.ts`
   updated `emptyMissionSnapshot`, `mergeMissionSnapshot`, and
   `reduceMissionEvent` accordingly.
6. **Doc updates**: `docs/lld/LLD-GoVibe-MCP-Tools.md` synchronized to
   `0.3.1` (§3.10-§3.13 flipped planned -> implemented; §3.15's MSP-side
   table corrected -- see Deviation 2 below) and `docs/DOC-VERSION-REGISTRY.md`
   synchronized in the same change.

**Deviation 1 (documented, mirrors WP-15/WP-16's own precedent, not a silent
guess).** Bounded Scope item 2 asked for `msp_memory_links_create` to be
vault-scoped through the established `vault-scope-guard.mjs` +
`isVaultAccessibleTo` caller-ownership pattern. API-009 §4.9's documented
request shape (`{from_entity_id, to_entity_id, link_type}`) carries no
caller identity, exactly like the six `msp_memory_*` tools WP-15 built and
`msp_memory_decay_tick` WP-16 added -- there is no `isVaultAccessibleTo`
boolean this wire shape can support. This packet still reuses
`assertVaultScope`/`VaultScopeDeniedError` (the guard mechanism itself),
just computed from an endpoint-consistency boolean (`fromEntity.vault_id ===
toEntity.vault_id`) rather than caller ownership -- the actual, testable
security property AC-01 asks for (a link may not cross a vault boundary),
proven end-to-end in `test/memory-links-vault-scoping.security.mjs`.

**Deviation 2 (a doc-accuracy correction, recorded not silently absorbed).**
`docs/lld/LLD-GoVibe-MCP-Tools.md` §3.15's original planning-stage table
claimed `govibe.memory.select` would call `msp_memory_get` and that
`memory-service.mjs` would call `msp_memory_upsert`/`list`/`history`.
Neither happened, and neither is a gap: API-009 §2's own tool-list comment
is explicit that `govibe.memory.select` "records a UI selection, no MSP
call", and this packet's own Bounded Scope item 3 lists only
search/forget/decay_tick as the tools this phase's bridge calls. The LLD's
false "called by" claims for those four tools were corrected in the same
change (§3.15), not left stale; those four `msp_memory_*` tools remain
`planned` with no caller. `msp_memory_links_list`/`links_create` are marked
implemented in `packages/msp-runtime` with no GoVibe-facing wrapper in this
phase -- API-009 §2's `govibe.memory.*` list has no links equivalent, and
Explicit Exclusions rule out any traversal/graph consumption of `links` in
this packet regardless.

**Testing.** `packages/msp-runtime`'s baseline was re-measured before any
edit: 154 vitest + 28 `node --test` = 182/182 (WP-16's closed baseline,
reproduced). After this packet: 164 vitest + 30 `node --test` = **194/194
passing**, zero regressions. Three pre-existing test files required the same
mechanical migration-count bump WP-16 already established as normal
(`test/migrate.test.mjs`, `test/retrieval-fts-sync.test.mjs`,
`test/vault-scoping.test.mjs`: 5 -> 6 applied migrations). New test files:
`test/links.test.mjs` (domain-level, in-process), `test/memory-links.test.mjs`
(AC-01, real stdio process), `test/memory-links-vault-scoping.security.mjs`
(AC-01 cross-vault rejection, `node --test`). At the repo root:
`scripts/mcp/msp-memory-contracts.test.mjs` (AC-02, fake-client `gks:`
rejection), `scripts/mcp/runtime/memory-service.test.mjs` (server-side caps,
AC-05, plus end-to-end `GovibeRuntime.handleMissionCommand` router wiring),
`scripts/mcp/sidecar-memory-bridge.test.mjs` (AC-03, real `startSidecarServer`
+ real WebSocket client -- both a well-formed event surviving the gate and a
malformed/oversized one being silently dropped), and additions to
`src/missionProtocol.test.ts` (unit-level command/event validation) and
`src/mission/snapshot-reducer.test.ts` (AC-06: reduction for all four new
event types, plus the explicit merge-fallback assertion that a patch
omitting `memory` does not drop it). Root suite: 69 files, 553 passed + 1
skipped (up from 64 files / 518 passed + 1 skipped before this packet), zero
regressions.

**Gates (AC-08/AC-09).** Root `npm run lint` (tsc --noEmit): PASS. Root
`npm run build`: PASS. Root `npm test`: PASS. `npm run docs:validate`: PASS.
`npm run diff:check`: PASS (this Execution closure section plus the LLD/
registry sync are the accompanying docs change for the code diff).

**Post-PR CI finding (pre-existing, not caused by this packet's own code, but
surfaced by it).** PR #121's `verify` (P0 Security CI) job failed once on
`test/shared-scope-fail-closed.security.mjs`'s "AC-03: msp_knowledge_promote
..." test with `SqliteError: duplicate column name: role`. Root cause: that
WP-13-authored test spawns two independent child processes
(`spawnRuntime(dbPath)` and, separately, `rawToolCall(dbPath, ...)`'s own
`spawn()`) against the *same brand-new* `dbPath`; both processes eagerly run
`db/migrate.mjs`'s `runMigrations()` on startup, and when spawned
concurrently, two separate connections can each read `schema_migrations` as
"migration 0003 not yet applied" before either commits, so both attempt
`0003_vault_scoping.sql`'s `ALTER TABLE vaults ADD COLUMN role`. This bug
predates WP-17 (it depends only on `db/migrate.mjs`, untouched by WP-14
through WP-17) and is orthogonal to this packet's own scope, but adding a
sixth migration file plausibly widened the per-process migration-application
window enough to make a previously-latent race newly observable in CI.
Fixed in `test/shared-scope-fail-closed.security.mjs`: `spawnRuntime(dbPath)`
is no longer constructed until after `rawToolCall`'s ephemeral process has
fully returned, making the two processes' migration runs strictly
sequential against that shared file rather than concurrent. Reproduced
locally (3 consecutive clean runs) and re-verified through the exact CI
command, `npm run test:security` (65/65 passing) plus the full `packages/msp-runtime`
suite (194/194) and all other gates, before pushing.

**Second post-PR CI finding: the broader concurrency issue, fixed.**
Checking the rest of the WP-14-17 PR series after the fix above, PR #118
(WP-14)'s `verify` job was found hung for the full 15-minute CI timeout --
a *different*, broader instance of the same class of problem, independently
diagnosed (but not fixed) by a concurrent session's own investigation (see
`.brain/session/2026-08-06-msp-runtime-wp14-wp15-parallel-collision.md`,
not part of this packet). Root cause: root `npm run test:security` runs
`node --test scripts/mcp/*.security.mjs packages/msp-runtime/test/*.security.mjs`
-- 10 files, 8 of which spawn one or more real MSP child processes over
stdio each. `node --test`'s default file-level concurrency runs several of
these files in parallel; under a CI runner's constrained CPU, enough
concurrently-spawned real child processes (each independently opening
SQLite, running migrations, and completing a JSON-RPC handshake) contend for
scheduling and can miss a client's 10-second request timeout on
`initialize` -- nondeterministically (PR #119/#120/#121 all passed `verify`
on the same code path; only #118 happened to hit it), which is why this
class of failure reads as CI flake rather than a consistent break. Fixed by
adding `--test-concurrency=1` to both the root `test:security` script and
`packages/msp-runtime`'s own (for the same reason, standalone), fully
serializing these files' execution rather than tuning concurrency down to a
still-nondeterministic middle value. Verified locally: full serial run is
~23s (root) / ~22s (`packages/msp-runtime`), both 65/65 and 30/30 passing
respectively -- trivially inside the CI job's 15-minute budget, trading a
few seconds of wall-clock time for eliminating the contention class of
failure entirely rather than reducing its odds.

**AC-10 / independent review, honestly stated.** As with WP-16, this packet
was executed and self-verified (all gates re-run from a clean state, as
recorded above) within a single continuous session -- no *separate*
dispatching/final-gate session independently reproduced these results before
this record was written. That gap is recorded here, not hidden: this
Execution closure section (including the two Deviations above) was presented
to the owner in chat verbatim before any closure flag was set. Boss (CEO),
owner and approval owner, reviewed it and responded "ปิดงานเลย ตั้ง
execution_complete: true" (close it out, set execution_complete: true) in
the same chat channel on 2026-08-06. `execution_complete: true` is set by
this same versioned record, per that explicit instruction -- AC-10 is closed
on the owner's own review standing in for the separate-session pattern, not
on a claim that a second session independently reproduced the results.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.5+draft | 2026-08-06 | Claude (CI-fix session) | Post-closure CI fix #2, owner-directed ("Fix the concurrency issue properly"): PR #118 (WP-14)'s `verify` job was found hung for the full 15-minute timeout -- root `npm run test:security` runs 10 `*.security.mjs` files, 8 spawning real MSP child processes, with `node --test`'s default file-level concurrency letting several run in parallel; under CI's constrained CPU, contention can push a real child process's `initialize` handshake past its 10s client timeout, nondeterministically (only #118 hit it; #119/#120/#121 all passed the same code path). Fixed by adding `--test-concurrency=1` to both root `package.json` and `packages/msp-runtime/package.json`'s `test:security` scripts, fully serializing rather than tuning down to a still-nondeterministic value. Verified locally: ~23s/~22s full serial runtime, 65/65 and 30/30 passing, trivially inside the 15-minute CI budget. See Execution closure's second "Post-PR CI finding" for the full record. `execution_complete` was already `true`; this row does not reopen it. |
| 0.2.4+draft | 2026-08-06 | Claude (CI-fix session) | Post-closure CI fix: PR #121's P0 Security CI `verify` job failed once on `test/shared-scope-fail-closed.security.mjs`'s WP-13-authored "AC-03: msp_knowledge_promote..." test (`SqliteError: duplicate column name: role`) -- a pre-existing two-process concurrent-migration race against a shared fresh `dbPath`, unrelated to this packet's own code but plausibly surfaced by this packet's sixth migration file widening the race window. Fixed by sequencing the test's two spawned processes (see Execution closure's "Post-PR CI finding" for the full record); reproduced clean 3x locally and re-verified via `npm run test:security` (65/65) plus the full gate sweep before push. `execution_complete` was already `true`; this row does not reopen it. |
| 0.2.3+draft | 2026-08-06 | Boss (CEO) | AC-10 closed: `execution_complete` set `true` after the owner reviewed this packet's Execution closure section (194/194 msp-runtime tests, 553+1 root tests, all gates green, two documented Deviations) presented in chat and explicitly approved closure ("ปิดงานเลย ตั้ง execution_complete: true"). Recorded honestly: this is owner review of a single-session self-verified execution, not a separate dispatching/final-gate session independently reproducing the results the way WP-14/WP-15 closed -- see the Execution closure section's AC-10 note for the full record. |
| 0.2.2+draft | 2026-08-06 | Claude (WP-17 execution session) | Executed Bounded Scope items 1-6: `packages/msp-runtime` links table + tools; `scripts/mcp/msp-memory-contracts.mjs` + `memory-service.mjs` + `memory-surface.mjs` GoVibe-side bridge; `packages/mission-protocol` allow-list; `src/mission/domain.ts` + `snapshot-reducer.ts` frontend data layer; `docs/lld/LLD-GoVibe-MCP-Tools.md` synchronized. 164 vitest + 30 `node --test` = 194/194 passing in `packages/msp-runtime` (baseline 182/182 reproduced first); root suite 69 files / 553 passed + 1 skipped (up from 64/518+1). Two documented Deviations: `msp_memory_links_create`'s vault check reuses `assertVaultScope` with an endpoint-consistency boolean rather than caller-ownership (same wire-shape gap WP-15/WP-16 recorded); the LLD's MSP-side table's false "called by" claims for `msp_memory_get`/`upsert`/`list`/`history` were corrected, not left stale. Root lint/build/test/docs:validate/diff:check gates all pass. `execution_complete` intentionally left `false` -- single-session self-verified execution, not the arm's-length dispatching/final-gate-session pattern; AC-10 remains to be closed. |
| 0.2.1+draft | 2026-08-06 | Boss (CEO) | Owner-authorized for execution in chat ("เริ่ม WP-17"), with WP-16 already `execution_complete: true` (its precondition), closed by explicit owner approval on 2026-08-05. `execution_authorized` set to `true`, `approval_recorded_at` set; `execution_complete` remains `false` pending independent post-execution verification. Authorization recorded before dispatch, per the process WP-14 established. |
| 0.2.0+draft | 2026-08-05 | Boss (CEO) / Claude (final-gate session) | **Split applied, owner-directed.** Re-scoped this packet to Phase 5 Stage A (data only): runtime links, the GoVibe-side bridge, the mission-protocol allow-list, and the `MissionSnapshot` type plus reducer/merge wiring. All Mission Control UI moved to the new `WP-18-Persistent-Memory-MSP-Runtime-Phase-5-Stage-B`. The split boundary was refined from the original marking: the snapshot type and reducer wiring stay in Stage A, because `mergeMissionSnapshot` silently drops fields it does not explicitly carry — shipping the emit path without the merge path would produce a bridge that appears to work and delivers nothing. Complexity lowered C-4 -> C-3 accordingly; risk stays HIGH (first packet to modify GoVibe's own runtime, protocol, and frontend). |
| 0.1.0+draft | 2026-08-05 | Claude (final-gate session) | Proposed WP-17 covering all of Phase 5 (links, bridge, and Domain E dashboard) with a pre-marked Stage A / Stage B split recommendation for the owner to decide at authorization. Recorded the ground-truth state of the runtime package, GoVibe's MCP server patterns, and the frontend/protocol gate as of 2026-08-05, including the silent-drop failure mode of `packages/mission-protocol/index.js` and the `eventBytes` cap. |
