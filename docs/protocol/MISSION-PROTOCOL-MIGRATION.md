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
- Use `boundedProtocolMessage` for user-visible transport errors.

Local UI-specific domain types may remain in `src/mission.ts`, but wire command, event, snapshot, and response validation must come from the shared package.

## Backend

The sidecar server validates inbound commands with `isMissionCommand` and returns `createCommandResponse(...)` envelopes over HTTP. WebSocket commands return a correlated `command.ack` event using the same `commandId`.

## External data ingest

External producers must:

1. Include only documented event discriminators.
2. Preserve `commandId` on command acknowledgements.
3. Reject unsupported compatibility versions.
4. Ignore unknown optional fields within compatibility version 1.
5. Treat required-field removal, discriminator changes, or semantic reinterpretation as breaking changes requiring a compatibility-version bump.

## Forward compatibility

Unknown optional object fields are preserved or ignored. Unknown event or command discriminators are rejected because silently accepting new behavior would make exhaustive handling meaningless.
