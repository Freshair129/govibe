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

export class ExecutionBindingError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ExecutionBindingError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details) {
  throw new ExecutionBindingError(code, message, details);
}

function requireText(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    fail("EXECUTION_BINDING_INVALID", `${field} is required`, { field });
  }
  return value;
}

function validateBinding(provider, request) {
  const binding = request?.executionBinding;
  if (!binding || typeof binding !== "object") {
    fail("EXECUTION_BINDING_REQUIRED", "governed execution binding is required");
  }

  const normalized = {
    binding_id: requireText(binding.binding_id, "executionBinding.binding_id"),
    provider_id: requireText(binding.provider_id, "executionBinding.provider_id"),
    entitlement_id: requireText(binding.entitlement_id, "executionBinding.entitlement_id"),
    principal_id: requireText(binding.principal_id, "executionBinding.principal_id"),
    run_id: requireText(binding.run_id, "executionBinding.run_id"),
    credential_grant_id: binding.credential_grant_id ?? null,
    provider_session_id: binding.provider_session_id ?? null,
  };

  if (normalized.provider_id !== provider) {
    fail("EXECUTION_BINDING_PROVIDER_MISMATCH", "binding provider does not match dispatch provider", {
      expected_provider: provider,
    });
  }
  if (request?.run_id && request.run_id !== normalized.run_id) {
    fail("EXECUTION_BINDING_RUN_MISMATCH", "binding run does not match request run");
  }
  if (request?.actor_id && request.actor_id !== normalized.principal_id) {
    fail("EXECUTION_BINDING_PRINCIPAL_MISMATCH", "binding principal does not match request actor");
  }

  return Object.freeze(normalized);
}

function safeRequest(request) {
  const { executionBinding, credential, secret, access_token, api_key, ...safe } = request ?? {};
  return Object.freeze({ ...safe, executionBinding: Object.freeze({
    binding_id: executionBinding.binding_id,
    provider_id: executionBinding.provider_id,
    entitlement_id: executionBinding.entitlement_id,
    principal_id: executionBinding.principal_id,
    run_id: executionBinding.run_id,
    provider_session_id: executionBinding.provider_session_id ?? null,
  }) });
}

export function createExecutorRegistry(adapters = {}, { credentialVault = null, sessionRegistry = null } = {}) {
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
      const binding = validateBinding(provider, request);

      let providerSession = null;
      if (binding.provider_session_id) {
        if (!sessionRegistry) fail("PROVIDER_SESSION_REGISTRY_REQUIRED", "provider session registry is required");
        providerSession = sessionRegistry.assertUsable(binding.provider_session_id, {
          principal_id: binding.principal_id,
          entitlement_id: binding.entitlement_id,
          provider_id: binding.provider_id,
          run_id: binding.run_id,
          binding_id: binding.binding_id,
        });
      }

      const invoke = (credentialBytes = null) => adapter.execute(safeRequest(request), Object.freeze({
        executionBinding: binding,
        credential: credentialBytes,
        providerSession,
      }));

      if (!binding.credential_grant_id) return invoke();
      if (!credentialVault) fail("CREDENTIAL_VAULT_REQUIRED", "credential vault is required for credentialed dispatch");

      return credentialVault.withCredential(binding.credential_grant_id, {
        entitlement_id: binding.entitlement_id,
        principal_id: binding.principal_id,
        run_id: binding.run_id,
        binding_id: binding.binding_id,
        provider_id: binding.provider_id,
      }, invoke);
    },
    async cancel(provider, runId) {
      const adapter = adapters[provider];
      if (typeof adapter?.cancel !== "function") throw new ProviderUnavailableError(provider);
      return adapter.cancel(runId);
    },
  };
}
