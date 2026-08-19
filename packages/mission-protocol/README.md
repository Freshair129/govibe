# @govibe/mission-protocol

Shared runtime contract for Mission Control commands, events, snapshots, and correlated command responses.

Backend JavaScript imports runtime validators from `index.js`. TypeScript consumers receive declarations from `index.d.ts`. Compatibility rules and ingest migration guidance live in `docs/api/MISSION-PROTOCOL-v2.md`.

`MISSION_PROTOCOL_LIMITS` publishes the enforced string, path, array, metadata, event, file, and request-body ceilings. Command and event envelopes reject unknown top-level fields. File bytes use the dedicated authenticated `/mission/files` binary endpoint rather than command JSON or WebSocket frames.
