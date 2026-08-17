---
title: "GoVibe PmAdapter Contract"
doc_id: "CONTRACT-GOVIBE-PMADAPTER"
status: draft
version: "0.1.0+draft"
updated: "2026-08-17"
owner: "ARCHON"
source_of_truth: true
related_docs:
  - "docs/adr/ADR-029-Gov-Layer-Launcher-Console-Boundary.md"
  - "docs/adr/ADR-028-Multi-Tenant-Principal-Scoped-Vault-Binding.md"
  - "docs/integration/REFERENCE-Notion-Jira-Connector-Requirements.md"
  - "docs/roadmap/BACKLOG-govlayer-supervision-surfaces.md"
---

# GoVibe PmAdapter Contract

## 1. Purpose

Defines the integration boundary for **GLS-005**
(`docs/roadmap/BACKLOG-govlayer-supervision-surfaces.md`, TC-GLS-005): outbound-first plan
projection from GoVibe's canonical roadmap to per-team PM tools (Notion, Jira, and future
targets), per ADR-029 Decision 6. GoVibe stays the canonical plan; a connected target platform
gets a projection of it. This is a GoVibe adapter contract, not a Notion or Jira product
definition, and it does not implement the OAuth connect flow, credential storage, or any UI --
those are flagged as deferred in §6.

## 2. Boundary

```text
Canonical roadmap (WorkflowTaskNode / TaskContainer)
  -> PmExportService (scripts/mcp/runtime/pm-export-service.mjs)
  -> PmAdapterRegistry.exportTask(platform, node, connectorConfig)
  -> platform-specific PmAdapter (NotionAdapter | JiraAdapter | ...)
  -> target platform's real API
```

`PmAdapterRegistry.exportTask()` is the single entry point every caller uses, and it never
branches on which platform is registered. Adding a third platform means implementing one
adapter and calling `.register()` once -- no caller, including `PmExportService`, changes.

## 3. Contract surface

Source: `packages/govibe-core/src/pm-adapter/pm-adapter-contract.mjs`.

### 3.1 PmAdapter interface

Every adapter implements:

```text
projectTask(taskContainer, config) -> {
  platform: string,
  taskId: string,
  externalId: string,
  url: string | null,
  backlink: string,          // always the canonical taskId
  fieldProjections: Array<{ field: string, state: ProjectionState, note?: string }>,
}

pullObservedChanges(config) -> Array<{ taskId, field, externalValue, externalId?, observedAt? }>
```

`pullObservedChanges` MUST exist even when a platform has no generic "changed since" primitive
to poll -- it returns `[]` honestly rather than being omitted, since omission would be
indistinguishable from "nothing changed."

### 3.2 Projection states

Every field an adapter attempts MUST be classified into exactly one state -- a field is never
silently dropped:

| State | Meaning |
|---|---|
| `FULL` | The value lands with no fidelity loss. |
| `APPROXIMATE` | The value lands but fidelity is not guaranteed (e.g. a free-text value forced into a fixed-option field, or a backlink folded into free text because no dedicated field exists). |
| `PARTIAL` | The projection is recorded as a side effect, not the field it names (e.g. GoVibe workflow state noted in a description because the target has no matching create-time field). |
| `UNPROJECTABLE` | No target mapping is configured, or no source value exists to project. |

### 3.3 Fail-closed configuration

`PmConnectorUnconfiguredError` (`.code = "pm_connector_unconfigured"`) is thrown, never caught
and converted into a fabricated success envelope, whenever:

- no adapter is registered for the requested platform, or
- no `connectorConfig` is supplied.

This mirrors `packages/msp-runtime/src/contracts/errors.mjs`'s `GksProviderUnconfiguredError` --
an unconfigured external dependency must fail loudly, matching the same shape a genuinely broken
connection would produce, so a caller can never mistake "not configured" for "nothing to
export."

### 3.4 Inbound sync produces observed candidates, never a canonical overwrite

`observedCandidateFromExternalChange()` turns one raw external-platform change into:

```text
{ kind: "pm_observed_update_candidate", platform, externalId, taskId, field, externalValue, observedAt, reviewState: "pending" }
```

This mirrors the repo's existing observed-candidate / MSP-promotion pattern (Deep Scan creates
observed candidates, not canonical GKS truth): a status change made inside an external platform
is an unauthorized-source signal until a human or governed process reviews and applies it
through the roadmap's own mutation engine (`RoadmapService#applyRoadmapMutation`). No code path
in this contract writes an inbound change directly to canonical roadmap state.

## 4. Implemented adapters

| Platform | Module | Endpoint | Notes |
|---|---|---|---|
| Notion | `packages/govibe-core/src/pm-adapter/notion-adapter.mjs` | `POST /v1/pages` | `title`/`rich_text`/`url`/`checkbox` land `FULL`; `select`/`status` land `APPROXIMATE` (target option must already exist or gets auto-created, which is a side effect on the target schema). |
| Jira | `packages/govibe-core/src/pm-adapter/jira-adapter.mjs` | `POST /rest/api/2/issue` (via `accessible-resources` `cloudId`) | `title`->`summary` and GoVibe `summary`->Jira `description` land `FULL`; GoVibe workflow `state` lands `PARTIAL` (Jira status is workflow-transition-driven, not a create-time field); `backlink` lands `FULL` with a mapped custom field, else `APPROXIMATE` folded into `description`. |

Request/response shapes follow `docs/integration/REFERENCE-Notion-Jira-Connector-Requirements.md`
§3-4, current as of 2026-08-17 -- re-verify against live platform docs before extending either
adapter.

## 5. MCP surface

`scripts/mcp/registry.mjs` / `scripts/mcp/handlers.mjs`:

- `govibe.pm.export({ actor, taskId, platform, connectorConfig })` -- outbound projection.
  Resolves `taskId` against the currently loaded roadmap snapshot; fails with a
  node-not-found error if the roadmap containing it has not been loaded first.
- `govibe.pm.sync({ actor, platform, connectorConfig })` -- inbound observed-candidate pull.
  Never mutates canonical roadmap state.

Both fail closed with `pm_connector_unconfigured` when `connectorConfig` is omitted.

## 6. Explicitly deferred (not built in this contract version)

Flagged here rather than silently assumed, per
`docs/integration/REFERENCE-Notion-Jira-Connector-Requirements.md` §5:

- **OAuth connect flow** (authorize URL redirect, token exchange, loopback callback routes
  `/connectors/{platform}/callback`). No UI or sidecar route exists yet.
- **Vault-scoped connector credential storage** under ADR-028
  (`principal_id` + `project_id`/`workspace_id`). `connectorConfig` is currently supplied
  explicitly per call by the caller; there is no persisted "connected account."
- **Site-selection UI** for Jira (`accessible-resources` returns multiple sites per account;
  `cloudId`/`siteUrl` must be supplied pre-resolved today).
- **Rate-limit-aware batching** for outbound sync against Notion's per-token ceiling and Jira's
  points quota -- each `govibe.pm.export` call is a single unbatched request today.
- **Real "changed since" polling** for either platform -- both adapters'
  `pullObservedChanges()` return `[]` unconditionally in this contract version.

## 7. Standalone-PM parity

Per TC-GLS-005's success criterion: with no PM connector configured, the Roadmap Board provides
full PM capability with nothing disabled. This holds structurally, not by a runtime toggle --
`scripts/mcp/runtime/roadmap-service.mjs` and `scripts/mcp/runtime/mission-command-router.mjs`
have zero import-time coupling to `packages/govibe-core/src/pm-adapter/`, pinned by a regression
test in `scripts/mcp/runtime/pm-export-service.test.mjs`.

## 8. Verification evidence

- Unit tests: `packages/govibe-core/src/pm-adapter/pm-adapter-contract.test.mjs`,
  `notion-adapter.test.mjs`, `jira-adapter.test.mjs`,
  `scripts/mcp/runtime/pm-export-service.test.mjs` -- field-mapping and projection-state
  classification per adapter, registry dispatch generality (a third, never-before-seen platform
  requires zero caller changes), fail-closed behavior, and the standalone-parity import boundary.
- Live verification (2026-08-17, this session): `govibe.pm.export` was called against the real
  running MCP runtime with a real roadmap node loaded from an approved roadmap source. A call
  with a deliberately invalid token reached Notion's real production API
  (`https://api.notion.com/v1/pages`) and received a real structured `401 unauthorized` /
  `"API token is invalid."` response -- proving the request shape is well-formed enough for
  Notion's live servers to parse and respond coherently, not merely a malformed-request
  rejection. **No live Notion or Jira account is available in this session** -- a full
  successful export against a real connected account has not been performed and is not claimed
  here.

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.1.0+draft | 2026-08-17 | Initial contract: PmAdapter interface, projection states, fail-closed connector configuration, observed-candidate inbound sync, Notion and Jira adapters implemented and tested against protocol-conformant fakes plus one live (invalid-token) call to Notion's real API. OAuth connect flow, credential storage, and rate-limit-aware batching explicitly deferred. |
