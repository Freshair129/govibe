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

## Forward compatibility

Unknown object fields are accepted and preserved by consumers. This allows additive optional fields such as orchestration or workflow state to be introduced without changing compatibility version `1`.

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

## Breaking-change policy

The contract tests intentionally reject:

- Missing required snapshot fields.
- Missing command acknowledgement correlation IDs.
- Unsupported compatibility versions.
- Unknown command or event discriminators.

Any change that requires relaxing those tests must be reviewed as a protocol-breaking change rather than slipped into an unrelated feature commit, a surprisingly common ritual in software teams.
