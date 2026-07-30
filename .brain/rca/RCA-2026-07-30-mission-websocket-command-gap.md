# RCA: Mission WebSocket command gap

## Symptom

Mission Control showed a connected WebSocket session, but selecting the draft MVP Master Plan did not load its review snapshot.

## Evidence

- `MissionGateway.send()` sends commands over WebSocket when that connection is open.
- `startSidecarServer()` broadcast snapshots over WebSocket but had no message handler.
- The same `roadmap.select` command works through the HTTP `/mission/commands` endpoint, which calls `runtime.handleMissionCommand()`.

## Root Cause

The sidecar exposed two transport paths with different capabilities: HTTP accepted mission commands while the preferred connected WebSocket path was broadcast-only. A connected UI therefore never reached `runtime.handleMissionCommand()`.

## Why the issue escaped detection

Existing verification covered direct runtime commands and snapshot delivery, but did not exercise a browser-connected WebSocket command.

## Fix and Prevention

- Route JSON WebSocket messages through the same `runtime.handleMissionCommand()` entrypoint as HTTP.
- Convert command failures into an existing terminal warning rather than silently discarding them.
- Keep draft Master Plans on a separate read-only `masterplan.preview` path; `roadmap.select` remains approval-gated and cannot promote a draft by viewing it.
- Keep the browser regression path for roadmap source selection and workspace scan in the MVP verification checklist.
