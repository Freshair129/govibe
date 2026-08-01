---
title: "Blueprint: Mission Gateway and Runtime Responsibility Split"
doc_id: "BLUEPRINT-MISSION-GATEWAY-RUNTIME-SPLIT"
status: "candidate"
version: "0.1.0b"
updated: "2026-08-02"
owner: "Boss / ATHER"
source_of_truth: true
related_docs:
  - "docs/api/MISSION-PROTOCOL-v1.md"
  - "docs/protocol/MISSION-PROTOCOL-MIGRATION.md"
  - "docs/design/DESIGN_SYSTEM.md"
  - "docs/architecture/BLUEPRINT-GoVibe-Capability-Vertical-Slice.md"
---

# Mission Gateway and Runtime Responsibility Split

## Decision request

Approve a behavior-preserving, staged split of `src/mission.ts`, `src/missionGateway.ts`, and `scripts/mcp/runtime-core.mjs`. This document is the implementation gate for issue #27. No code movement is authorized while its status remains `candidate`.

## Evidence and root cause

- `src/mission.ts` is 724 lines and owns domain types, navigation data, snapshot reduction, HTTP/WebSocket transport, browser registration, and file helpers.
- `src/missionGateway.ts` is 621 lines and duplicates snapshot reduction and transport behavior while adding acknowledgement/reconnect behavior.
- The application imports `src/mission.ts`; `src/missionGateway.ts` is therefore a second implementation, not the current composition root.
- `scripts/mcp/runtime-core.mjs` is 1,216 lines and owns registry parsing, roadmap ranking, temporal overlays, workspace workflows, orchestration, translators, command routing, and snapshot publication.
- Agent registry YAML is parsed with indentation-sensitive regular expressions inside `runtime-core.mjs`.

The root cause is ownership collapse: composition roots accumulated domain implementation and state mutation instead of depending on isolated services. Duplicate frontend gateways then drifted because there was no single canonical owner.

## Constraints

- Preserve all public `MissionCommand`, `MissionEvent`, snapshot, MCP tool, HTTP, WebSocket, and browser-ingress behavior.
- Keep `@govibe/mission-protocol` as the only wire-validation owner.
- Keep `src/mission.ts`, `src/missionGateway.ts`, and `scripts/mcp/runtime-core.mjs` as compatibility facades until all current imports and tests use the new modules.
- Add no new feature, command, event, configuration surface, or transport.
- Preserve the security boundaries delivered by issues #20-#23.
- Every migration slice must pass `npm run baseline:check` before the next slice begins.

## Target boundaries

```text
@govibe/mission-protocol
        |
        v
frontend domain types/navigation --> snapshot reducer --> snapshot store
                                              ^               |
                                              |               v
browser ingress --> MissionGateway <-- HTTP/WebSocket transports

runtime domain services --> MissionCommandRouter --> SnapshotStore --> event publisher
        ^                         ^                   ^
        |                         |                   |
registry / roadmap / workspace / orchestration / translator services
```

Dependencies point inward toward protocol and domain contracts. Transports and composition roots depend on services; services never import transports, UI modules, MCP stdio, or the composition root.

### Frontend modules

| Module | Owns | Must not own |
|---|---|---|
| `src/mission/domain.ts` | UI-facing mission types and compatibility aliases | transport or state |
| `src/mission/navigation.ts` | domain/view configuration | snapshot or transport |
| `src/mission/snapshot-reducer.ts` | pure `MissionEvent + MissionSnapshot -> MissionSnapshot` transition | listeners or I/O |
| `src/mission/snapshot-store.ts` | the single mutable snapshot and subscriptions | protocol parsing or transport |
| `src/mission/transport/http.ts` | bounded authenticated HTTP command/file requests | snapshot mutation |
| `src/mission/transport/websocket.ts` | connect/reconnect/frame/ack lifecycle | domain transitions |
| `src/mission/browser-ingestion.ts` | origin/source/custom-event trust checks | direct state mutation |
| `src/mission/gateway.ts` | orchestration of store and transports | duplicated reducers |

`src/mission.ts` becomes the compatibility export and singleton composition facade. `src/missionGateway.ts` re-exports the canonical gateway during migration; it must not retain a second implementation.

### Runtime modules

| Module | Owns | Must not own |
|---|---|---|
| `scripts/mcp/runtime/agent-registry-service.mjs` | YAML parsing and registry projection | runtime snapshot |
| `scripts/mcp/runtime/roadmap-service.mjs` | discovery, ranking, containment-aware load/preview/export | temporal overlay storage |
| `scripts/mcp/runtime/temporal-overlay-store.mjs` | versioned roadmap overlay records and selection | parsing or command routing |
| `scripts/mcp/runtime/workspace-service.mjs` | initialize/continue/scan/review/impact delegation | roadmap or transport |
| `scripts/mcp/runtime/orchestration-service.mjs` | DAG/wave/step/verification coordination | command discrimination |
| `scripts/mcp/runtime/translator-service.mjs` | atomize/template/render/fidelity operations | snapshot publication |
| `scripts/mcp/runtime/mission-command-router.mjs` | exhaustive command-to-service routing | domain implementation |
| `scripts/mcp/runtime/snapshot-store.mjs` | the single runtime snapshot, terminal lines, subscriptions, event publication | domain I/O |

`scripts/mcp/runtime-core.mjs` remains the composition facade that constructs these services and exports `GovibeRuntime` / `govibeRuntime`.

## YAML parser decision

Use the maintained `yaml` npm package for `.agents/agent-registry.yaml`. The registry service validates the parsed object and returns the existing projected agent shape. Invalid YAML and invalid registry shapes fail closed with bounded errors. The regex parser is removed only after fixture parity tests cover quoted scalars, lists, authority rules, and execution policy.

## Migration sequence

1. Characterize current public behavior with contract tests and dependency checks.
2. Extract pure frontend reducer and the single snapshot store; keep both facade imports working.
3. Extract HTTP, WebSocket, and browser-ingress adapters; make `mission.ts` and `missionGateway.ts` use one gateway implementation.
4. Introduce the YAML-backed agent registry service and prove projection parity.
5. Extract temporal overlay store, then roadmap service; retain the #23 containment tests unchanged.
6. Extract workspace, orchestration, and translator services behind injected interfaces.
7. Move command discrimination into the exhaustive command router and leave `runtime-core.mjs` as composition only.
8. Run dependency-cycle detection, full baseline, MCP smoke, and browser E2E; then remove only dead duplicate implementation code created obsolete by this refactor.

Each numbered step is a separately reviewable commit or PR. A failed gate rolls back only that slice.

## Compatibility and test gates

- Golden fixtures assert identical snapshot transitions for every current event.
- Contract tests assert identical command result/acknowledgement shapes for every current command.
- Transport tests instantiate HTTP and WebSocket adapters with fakes; no real server is required.
- Browser-ingress tests retain origin, source-window, schema, and development-only custom-event coverage.
- Runtime service tests use injected stores/adapters and do not start HTTP, WebSocket, MCP stdio, or external executors.
- Agent registry fixtures prove parser parity before the regex parser is deleted.
- A module dependency test rejects cycles and forbidden inward-to-outward imports.
- Security regression tests for authentication, protocol limits, binary transfer, and path containment remain mandatory.
- Final gates: `npm run baseline:check`, `npm run mcp:smoke`, and CI E2E.

## Acceptance criteria

- Public commands, events, tools, snapshots, and transport behavior are unchanged.
- Command routing contains no domain implementation.
- Frontend and runtime snapshot mutation each have exactly one explicit store owner.
- Roadmap temporal state is accessed only through the temporal overlay API.
- Agent registry parsing uses `yaml` and no indentation-sensitive regex parser remains.
- Services are unit-testable without live transports, stdio, or executors.
- Dependency direction is enforced and circular imports are absent.
- Full baseline, protocol/security tests, MCP smoke, and E2E pass.

## Success criteria

- `src/mission.ts` and `scripts/mcp/runtime-core.mjs` are composition/compatibility facades rather than domain implementations.
- The duplicate gateway implementation is eliminated without changing consumers.
- A change to one domain service no longer requires editing an unrelated service or transport module.

## Exit criteria

- Owner approves this candidate blueprint and its dependency choice.
- Architecture review confirms the boundaries and migration order before implementation.
- Every migration slice has passing tests and a reversible commit boundary.
- Issue #27 closes only after final CI and behavior-parity evidence is attached.

## Risk assessment

**HIGH** — the work moves shared state ownership and command routing across frontend and runtime boundaries. Risk is controlled through compatibility facades, characterization tests, incremental commits, and no behavior changes.

## Out of scope

- New commands, events, tools, transports, retry policies, or UI behavior.
- Schema redesign or protocol version bump.
- Runtime performance tuning.
- Moving GoVibe capabilities across MSP/GKS authority boundaries.

## Changelog

| Version | Date | Status | Summary | Commit Hash | Agent |
|---|---|---|---|---|---|
| 0.1.0b | 2026-08-02 | candidate | Initial responsibility split and staged compatibility plan for issue #27. | pending | ATHER |
