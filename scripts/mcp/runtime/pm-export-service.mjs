import { createDefaultPmAdapterRegistry, observedCandidateFromExternalChange, PmConnectorUnconfiguredError } from "../../../packages/govibe-core/src/pm-adapter/index.mjs";

// GLS-005: outbound-first plan projection to per-team PM tools. This service
// is deliberately thin -- all platform-specific logic lives behind
// PmAdapterRegistry (packages/govibe-core/src/pm-adapter/); this file only
// resolves the canonical task from the live roadmap snapshot and forwards
// to the registry, so adding a third platform never touches this file.
export class PmExportService {
  #getSnapshot;
  #registry;
  #now;

  constructor({ getSnapshot, registry = createDefaultPmAdapterRegistry(), now = () => new Date().toISOString() }) {
    this.#getSnapshot = getSnapshot;
    this.#registry = registry;
    this.#now = now;
  }

  platforms() {
    return this.#registry.platforms();
  }

  async exportTask({ taskId, platform, connectorConfig }) {
    if (!taskId) throw new Error("pm.export requires taskId.");
    if (!platform) throw new Error("pm.export requires platform.");

    const node = (this.#getSnapshot().roadmap?.nodes ?? []).find((item) => item.id === taskId);
    if (!node) {
      throw new Error(`pm.export: no roadmap node found for taskId "${taskId}". Load the roadmap source that contains it first.`);
    }

    // This contract version does not implement ADR-028 vault-scoped
    // connector credential storage (no OAuth connect flow exists yet --
    // see docs/integration/REFERENCE-Notion-Jira-Connector-Requirements.md
    // §5). Reading an implicit env-var default here would let a caller
    // believe a connection exists when none does; instead the caller must
    // supply configuration explicitly per call, and its absence fails
    // closed with the same error a genuinely unconfigured connector would
    // produce.
    if (!connectorConfig) {
      throw new PmConnectorUnconfiguredError(
        platform,
        `No connector configuration supplied for platform "${platform}". Vault-scoped connector credential storage is not implemented in this contract version -- pass connectorConfig explicitly.`,
      );
    }

    const result = await this.#registry.exportTask(platform, node, connectorConfig);
    return { ...result, exportedAt: this.#now() };
  }

  // Inbound sync never overwrites canonical roadmap state -- it returns
  // observed update candidates for review, matching this repo's existing
  // observed-candidate/MSP-promotion governance pattern.
  async syncObserved({ platform, connectorConfig }) {
    if (!platform) throw new Error("pm.sync requires platform.");
    if (!connectorConfig) {
      throw new PmConnectorUnconfiguredError(platform, `No connector configuration supplied for platform "${platform}".`);
    }
    const changes = await this.#registry.pullObserved(platform, connectorConfig);
    return changes.map((change) => observedCandidateFromExternalChange({ platform, ...change }));
  }
}
