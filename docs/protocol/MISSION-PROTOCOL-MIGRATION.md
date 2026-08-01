# Mission Control Protocol Migration

The Mission Control transport contract is versioned by `@govibe/mission-protocol`.

## Current versions

- Semantic version: `1.0.0`
- Compatibility version: `1`

## Frontend

Frontend transport code imports runtime validators and shared wire types from `@govibe/mission-protocol`.

- Validate WebSocket frames with `isMissionEvent` before mutating state.
- Validate HTTP command envelopes with `isCommandResponse`.
- Validate bootstrap snapshots with `isMissionSnapshot`.
- Validate browser `CustomEvent` and `postMessage` payloads with `isMissionEvent` before dispatch.
- Use `boundedProtocolMessage` for user-visible transport errors.
- Send `file.save` bytes through `POST /mission/files`; do not serialize byte arrays into command JSON.

Local UI-specific domain types may remain in `src/mission.ts`, but wire command, event, snapshot, and response validation must come from the shared package.

## Backend

The sidecar server validates inbound commands with `isMissionCommand` and returns `createCommandResponse(...)` envelopes over HTTP. WebSocket commands return a correlated `command.ack` event using the same `commandId`. Malformed JSON and schema failures are rejected before runtime execution; bounded binary file transfers use the authenticated `/mission/files` endpoint.

## External data ingest

Browser `postMessage` ingress accepts only exact origins from `VITE_GOVIBE_EVENT_ORIGINS` (default: the current app origin), requires `event.source === window`, and validates the shared event schema. Wildcard origins are ignored. The legacy `govibe:mission-event` custom event is disabled by default because same-page scripts cannot be authenticated; `VITE_GOVIBE_ALLOW_CUSTOM_EVENTS=true` enables it only as an explicitly unsafe development compatibility interface.

External producers must:

1. Include only documented event discriminators.
2. Preserve `commandId` on command acknowledgements.
3. Reject unsupported compatibility versions.
4. Reject unknown top-level command or event fields; treat nested domain-record fields and optional snapshot fields as forward-compatible.
5. Treat required-field removal, discriminator changes, or semantic reinterpretation as breaking changes requiring a compatibility-version bump.

## Forward compatibility

Unknown top-level command or event fields and unknown discriminators are rejected because silently accepting new behavior would make exhaustive handling meaningless. Nested domain records and optional snapshot fields remain extensible within compatibility version 1.
