# Mission Control Protocol v1

## Version

- Semantic version: `1.0.0`
- Compatibility version: `1`
- Runtime source: `packages/mission-protocol/index.js`
- Type declarations: `packages/mission-protocol/index.d.ts`

## Shared surfaces

The package owns runtime validation for:

- Mission commands
- Mission events, including correlated `command.ack`
- Mission snapshots
- Command response envelopes

The command response envelope contains:

```json
{
  "protocolVersion": "1.0.0",
  "compatibilityVersion": 1,
  "commandId": "uuid",
  "ok": true,
  "message": "optional bounded message",
  "snapshot": {},
  "result": {}
}
```

## Validation and resource limits

Every HTTP, WebSocket, and browser-event ingress validates against the shared runtime contract before it invokes runtime behavior or mutates UI state.

Top-level command and event envelopes use a closed-field policy: unknown fields, unknown discriminators, missing required fields, and wrong field types are rejected. Nested domain records and optional snapshot fields remain forward-compatible because their contents are owned by their domain contracts.

The exported `MISSION_PROTOCOL_LIMITS` object is the runtime source of truth:

| Resource | Limit |
|---|---:|
| Discriminator | 64 characters |
| Identifier / hash | 256 characters |
| Path | 4,096 characters |
| Terminal command | 16,384 characters |
| Array | 10,000 items |
| Metadata | 64 keys / 16,384 serialized bytes |
| File payload | 262,144 bytes |
| Event | 1,000,000 serialized bytes |
| Default JSON request body | 1,000,000 bytes |

`GOVIBE_MCP_MAX_BODY_BYTES` configures the sidecar request and WebSocket frame ceiling. An oversized HTTP body returns `413`; malformed JSON and schema-invalid commands return `400`.

## Forward compatibility

Unknown fields are rejected on command and event envelopes. Additive fields therefore require a reviewed shared-contract update. Nested domain records and unknown optional snapshot fields are accepted so compatible domain data can evolve without changing compatibility version `1`.

Unknown command or event discriminator values are rejected. A new command or event variant therefore requires updating the shared package and its exhaustive consumer switch.

Required top-level snapshot fields remain strict. Removing or renaming one is a breaking change and requires:

1. A new compatibility version.
2. Updated fixtures and contract tests.
3. Migration notes for external integrations.

## Workflow and orchestration state

`workflowRuns` and provider state are optional additive snapshot fields. External orchestration-specific state may be added as an unknown optional field while compatibility version remains `1`, but it must not replace existing required snapshot fields.

## External ingest migration

External data-ingest integrations must:

1. Attach the existing command payload plus a stable `commandId`.
2. Accept `protocolVersion` and `compatibilityVersion` in HTTP responses.
3. Correlate WebSocket acknowledgements using `commandId`.
4. Treat unknown optional snapshot fields as opaque data rather than failure.
5. Reject unsupported compatibility versions before mutating local operational state.
6. Stop relying on raw runtime return values from `/mission/commands`; use `result` and `snapshot` inside the response envelope.
7. Send `file.save` bytes to authenticated `POST /mission/files` as `application/octet-stream`; provide the bounded hash and base64url-encoded JSON metadata in `X-GoVibe-File-Hash` and `X-GoVibe-File-Meta`. JSON-encoded file arrays and binary WebSocket command frames are rejected.

## Breaking-change policy

The contract tests intentionally reject:

- Missing required snapshot fields.
- Missing command acknowledgement correlation IDs.
- Unsupported compatibility versions.
- Unknown command or event discriminators.
- Unknown top-level command or event fields.
- Wrong field types and values above the published resource limits.

Any change that requires relaxing those tests must be reviewed as a protocol-breaking change rather than slipped into an unrelated feature commit, a surprisingly common ritual in software teams.
