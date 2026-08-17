// GLS-005: PmAdapter contract -- outbound-first plan projection to per-team
// PM tools (Notion, Jira, ...), per ADR-029 Decision 6. GoVibe stays the
// canonical plan; a target platform gets a projection of it. This module is
// the platform-neutral boundary: PmAdapterRegistry.exportTask() is the only
// entry point every caller uses, and it never branches on which platform is
// registered -- adding a new platform means calling .register() once, never
// touching this file or any caller of it (TC-GLS-005 success criterion).

// A field either projects cleanly (FULL), projects with reduced fidelity
// (APPROXIMATE: value lands but may not round-trip exactly, e.g. a free-text
// value forced into a fixed-option field), lands as a side effect rather
// than the field it names (PARTIAL: e.g. GoVibe workflow state recorded as
// a note because the target has no matching create-time field), or has
// nowhere to go at all (UNPROJECTABLE: no mapping configured, or no source
// value to project). An adapter must classify every canonical field it
// attempts, never silently drop one.
export const PROJECTION_STATES = Object.freeze({
  FULL: "FULL",
  APPROXIMATE: "APPROXIMATE",
  PARTIAL: "PARTIAL",
  UNPROJECTABLE: "UNPROJECTABLE",
});

const PROJECTION_STATE_VALUES = new Set(Object.values(PROJECTION_STATES));

export function isProjectionState(value) {
  return PROJECTION_STATE_VALUES.has(value);
}

// Fail-closed, never caught and converted into a fabricated success
// envelope -- mirrors packages/msp-runtime/src/contracts/errors.mjs's
// GksProviderUnconfiguredError for the same reason: an unconfigured external
// dependency must produce an honest error, not a silently-skipped no-op or
// invented result.
export class PmConnectorUnconfiguredError extends Error {
  constructor(platform, message) {
    super(message ?? `No PM connector is configured for platform "${platform}"; export is fail-closed.`);
    this.name = "PmConnectorUnconfiguredError";
    this.code = "pm_connector_unconfigured";
    this.platform = platform;
  }
}

function assertAdapterShape(platform, adapter) {
  if (typeof adapter?.projectTask !== "function") {
    throw new Error(`PmAdapter for platform "${platform}" must implement projectTask(taskContainer, config).`);
  }
}

export class PmAdapterRegistry {
  #adapters = new Map();

  register(platform, adapter) {
    if (typeof platform !== "string" || platform.trim() === "") {
      throw new Error("platform key must be a non-empty string.");
    }
    assertAdapterShape(platform, adapter);
    this.#adapters.set(platform, adapter);
    return this;
  }

  has(platform) {
    return this.#adapters.has(platform);
  }

  platforms() {
    return [...this.#adapters.keys()];
  }

  // The single generic outbound entry point. taskContainer is whatever
  // canonical record the caller resolved (a WorkflowTaskNode or
  // TaskContainer shape); config is per-platform connector configuration
  // (tokens, target IDs, field maps). No config, or no adapter registered
  // for the platform, both fail closed with the same error code -- an
  // unconfigured connector and an unimplemented platform must be equally
  // impossible to mistake for a successful export.
  async exportTask(platform, taskContainer, config) {
    const adapter = this.#adapters.get(platform);
    if (!adapter) {
      throw new PmConnectorUnconfiguredError(platform, `No PmAdapter is registered for platform "${platform}".`);
    }
    if (!config || typeof config !== "object") {
      throw new PmConnectorUnconfiguredError(platform, `No connector configuration was supplied for platform "${platform}"; export is fail-closed.`);
    }
    const result = await adapter.projectTask(taskContainer, config);
    for (const projection of result.fieldProjections ?? []) {
      if (!isProjectionState(projection.state)) {
        throw new Error(`Adapter for platform "${platform}" returned an invalid projection state "${projection.state}" for field "${projection.field}".`);
      }
    }
    return result;
  }

  // Symmetric inbound entry point. Adapters that cannot poll for changes
  // (no generic "changed since" primitive on the platform) implement
  // pullObservedChanges() returning [] rather than omitting the method --
  // omission here would silently look identical to "nothing changed".
  async pullObserved(platform, config) {
    const adapter = this.#adapters.get(platform);
    if (!adapter) {
      throw new PmConnectorUnconfiguredError(platform, `No PmAdapter is registered for platform "${platform}".`);
    }
    if (typeof adapter.pullObservedChanges !== "function") {
      throw new Error(`PmAdapter for platform "${platform}" must implement pullObservedChanges(config), even if it always returns [].`);
    }
    if (!config || typeof config !== "object") {
      throw new PmConnectorUnconfiguredError(platform, `No connector configuration was supplied for platform "${platform}"; sync is fail-closed.`);
    }
    return adapter.pullObservedChanges(config);
  }
}

// Turns one raw external-platform change into an observed update candidate
// -- never a canonical mutation. This mirrors the repo's existing
// observed-candidate/MSP-promotion pattern (Deep Scan creates observed
// candidates, not canonical GKS truth): a status change made inside Notion
// or Jira is an unauthorized-source signal until a human or governed
// process reviews and applies it through the roadmap's own mutation engine.
export function observedCandidateFromExternalChange({ platform, externalId, taskId, field, externalValue, observedAt }) {
  if (!platform || !taskId || !field) {
    throw new Error("observedCandidateFromExternalChange requires platform, taskId, and field.");
  }
  return {
    kind: "pm_observed_update_candidate",
    platform,
    externalId: externalId ?? null,
    taskId,
    field,
    externalValue: externalValue ?? null,
    observedAt: observedAt ?? new Date().toISOString(),
    reviewState: "pending",
  };
}
