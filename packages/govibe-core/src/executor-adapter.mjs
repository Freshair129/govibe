import { assertExecutorDispatchAllowed } from "./authority-enforcement.mjs";

const PROVIDERS = ["codex", "claude-code", "crewai", "local"];

export class ProviderUnavailableError extends Error {
  constructor(provider) {
    super(`Executor provider unavailable: ${provider}`);
    this.name = "ProviderUnavailableError";
    this.code = "PROVIDER_UNAVAILABLE";
    this.provider = provider;
  }
}

export function createExecutorRegistry(adapters = {}) {
  return {
    inspect() {
      return PROVIDERS.map((id) => ({
        id,
        available: typeof adapters[id]?.execute === "function",
        capabilities: adapters[id]?.capabilities ?? [],
      }));
    },
    async execute(provider, request) {
      const adapter = adapters[provider];
      if (typeof adapter?.execute !== "function") throw new ProviderUnavailableError(provider);
      assertExecutorDispatchAllowed(request);
      return adapter.execute(request);
    },
    async cancel(provider, runId) {
      const adapter = adapters[provider];
      if (typeof adapter?.cancel !== "function") throw new ProviderUnavailableError(provider);
      return adapter.cancel(runId);
    },
  };
}
