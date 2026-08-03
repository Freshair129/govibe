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

function scopeMismatch(field) {
  fail("EXECUTION_BINDING_SCOPE_MISMATCH", `binding ${field} does not match dispatch scope`, { field });
}

function validateBinding(provider, request) {
  const binding = request?.executionBinding;
  if (!binding || typeof binding !== "object") {
    fail("EXECUTION_BINDING_REQUIRED", "governed execution binding is required");
  }

  const legacy = !Object.hasOwn(binding, "schema");
  if (!legacy && binding.schema !== "govibe-execution-binding/v1") {
    fail("EXECUTION_BINDING_SCHEMA_UNSUPPORTED", "unsupported execution binding schema", { schema: binding.schema });
  }

  if (legacy) {
    const extendedFields = ["actor_id", "workspace_id", "task_id", "agent_id", "session_id", "turn_id", "context_id", "cache_id"];
    const mixedField = extendedFields.find((field) => binding[field] !== undefined);
    if (mixedField) {
      fail("EXECUTION_BINDING_LEGACY_INVALID", "schema-less legacy bindings must remain principal-only", { field: mixedField });
    }
  }

  const actorId = legacy ? null : requireText(binding.actor_id, "executionBinding.actor_id");
  const principalId = requireText(binding.principal_id, "executionBinding.principal_id");
  if (!legacy && actorId !== principalId) {
    fail("EXECUTION_BINDING_IDENTITY_MISMATCH", "binding actor and principal must match");
  }

  const normalized = {
    schema: legacy ? null : binding.schema,
    binding_id: requireText(binding.binding_id, "executionBinding.binding_id"),
    provider_id: requireText(binding.provider_id, "executionBinding.provider_id"),
    entitlement_id: requireText(binding.entitlement_id, "executionBinding.entitlement_id"),
    actor_id: actorId,
    principal_id: principalId,
    workspace_id: legacy ? null : requireText(binding.workspace_id, "executionBinding.workspace_id"),
    task_id: legacy ? null : requireText(binding.task_id, "executionBinding.task_id"),
    agent_id: legacy ? null : requireText(binding.agent_id, "executionBinding.agent_id"),
    run_id: requireText(binding.run_id, "executionBinding.run_id"),
    session_id: legacy ? null : requireText(binding.session_id, "executionBinding.session_id"),
    turn_id: legacy ? null : requireText(binding.turn_id, "executionBinding.turn_id"),
    context_id: legacy ? null : requireText(binding.context_id, "executionBinding.context_id"),
    cache_id: legacy ? null : requireText(binding.cache_id, "executionBinding.cache_id"),
    credential_grant_id: binding.credential_grant_id ?? null,
    provider_session_id: binding.provider_session_id ?? null,
  };

  if (normalized.provider_id !== provider) {
    fail("EXECUTION_BINDING_PROVIDER_MISMATCH", "binding provider does not match dispatch provider", {
      expected_provider: provider,
    });
  }
  const requestActorId = requireText(request?.actor_id, "request.actor_id");
  const requestRunId = requireText(request?.run_id, "request.run_id");
  if (requestRunId !== normalized.run_id) {
    if (!legacy) scopeMismatch("run_id");
    fail("EXECUTION_BINDING_RUN_MISMATCH", "binding run does not match request run");
  }
  if (requestActorId !== normalized.principal_id) {
    fail("EXECUTION_BINDING_PRINCIPAL_MISMATCH", "binding principal does not match request actor");
  }

  if (!legacy) {
    const identity = request.contextAuthority.identity;
    const lineage = request.contextAuthority.lineage;
    const expected = {
      workspace_id: identity.workspaceId,
      task_id: identity.taskId,
      agent_id: identity.agentId,
      run_id: identity.runId,
      session_id: request.contextLineage.sessionId,
      turn_id: request.contextLineage.turnId,
      context_id: lineage.contextId,
      cache_id: lineage.cacheId,
    };
    for (const [field, value] of Object.entries(expected)) {
      if (normalized[field] !== value) scopeMismatch(field);
    }
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
