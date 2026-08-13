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

  if (binding.schema !== "govibe-execution-binding/v1") {
    fail("EXECUTION_BINDING_SCHEMA_UNSUPPORTED", "unsupported execution binding schema", { schema: binding.schema });
  }

  const actorId = requireText(binding.actor_id, "executionBinding.actor_id");
  const principalId = requireText(binding.principal_id, "executionBinding.principal_id");
  if (actorId !== principalId) {
    fail("EXECUTION_BINDING_IDENTITY_MISMATCH", "binding actor and principal must match");
  }

  const normalized = {
    schema: binding.schema,
    binding_id: requireText(binding.binding_id, "executionBinding.binding_id"),
    provider_id: requireText(binding.provider_id, "executionBinding.provider_id"),
    entitlement_id: requireText(binding.entitlement_id, "executionBinding.entitlement_id"),
    actor_id: actorId,
    principal_id: principalId,
    workspace_id: requireText(binding.workspace_id, "executionBinding.workspace_id"),
    task_id: requireText(binding.task_id, "executionBinding.task_id"),
    agent_id: requireText(binding.agent_id, "executionBinding.agent_id"),
    run_id: requireText(binding.run_id, "executionBinding.run_id"),
    session_id: requireText(binding.session_id, "executionBinding.session_id"),
    turn_id: requireText(binding.turn_id, "executionBinding.turn_id"),
    context_id: requireText(binding.context_id, "executionBinding.context_id"),
    cache_id: requireText(binding.cache_id, "executionBinding.cache_id"),
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
  if (requestRunId !== normalized.run_id) scopeMismatch("run_id");
  if (requestActorId !== normalized.principal_id) {
    fail("EXECUTION_BINDING_PRINCIPAL_MISMATCH", "binding principal does not match request actor");
  }

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

function assertBindingIssued(bindingService, binding, request) {
  if (!bindingService || typeof bindingService.assertUsable !== "function") {
    fail("EXECUTION_BINDING_SERVICE_REQUIRED", "a binding service is required to verify binding authenticity");
  }

  try {
    return bindingService.assertUsable(binding.binding_id, {
      actor_id: binding.actor_id,
      principal_id: binding.principal_id,
      workspace_id: binding.workspace_id,
      task_id: binding.task_id,
      agent_id: binding.agent_id,
      run_id: request.run_id,
      session_id: binding.session_id,
      turn_id: binding.turn_id,
      context_id: binding.context_id,
      cache_id: binding.cache_id,
      provider_id: binding.provider_id,
      entitlement_id: binding.entitlement_id,
    });
  } catch (error) {
    if (error?.code === "EXECUTION_BINDING_EXPIRED") {
      fail("BINDING_EXPIRED", "execution binding expired", { binding_id: binding.binding_id, source_code: error.code });
    }
    if (error?.code === "EXECUTION_BINDING_NOT_FOUND") {
      fail("EXECUTION_BINDING_NOT_ISSUED", "execution binding was not issued by the binding service", { binding_id: binding.binding_id });
    }
    throw error;
  }
}

function assertCompatibility(compatibilityRegistry, bindingService, issuedBinding, now) {
  if (!compatibilityRegistry || typeof compatibilityRegistry.explainEligibility !== "function") {
    fail("COMPATIBILITY_REGISTRY_REQUIRED", "provider compatibility registry is required before dispatch");
  }
  if (typeof bindingService?.compatibilityProof !== "function") {
    fail("COMPATIBILITY_REGISTRY_REQUIRED", "binding service cannot resolve compatibility proof");
  }

  const proof = bindingService.compatibilityProof(issuedBinding.binding_id);
  if (!proof || proof.authorized !== true) {
    fail("PROVIDER_COMPATIBILITY_DENIED", "execution binding has no authorized compatibility proof", {
      reason_code: "COMPATIBILITY_RECORD_MISSING",
    });
  }

  const decision = compatibilityRegistry.explainEligibility(proof.record_id, {
    provider: issuedBinding.provider_id,
    product: proof.product,
    plan: proof.plan,
    execution_surface: proof.execution_surface,
    entitlement_type: proof.entitlement_type,
    owner_id: proof.owner_id,
    requested_scope: proof.requested_scope,
    principal_id: issuedBinding.principal_id,
    organization_id: issuedBinding.organization_id,
    workspace_id: issuedBinding.workspace_id,
    adapter_id: proof.adapter_id,
    automation_requested: proof.automation_requested,
    session_reuse_requested: proof.session_reuse_requested,
    concurrent_use_requested: proof.concurrent_use_requested,
    credential_delegation_requested: proof.credential_delegation_requested,
    evidence_valid: proof.evidence_valid,
  }, now);

  if (!decision.eligible) {
    fail("PROVIDER_COMPATIBILITY_DENIED", "provider compatibility was denied before adapter invocation", {
      reason_code: decision.reason_code,
      record_id: decision.record_id,
    });
  }
  if (decision.record_version !== proof.record_version || decision.policy_ref !== proof.policy_ref) {
    fail("PROVIDER_COMPATIBILITY_DENIED", "compatibility proof is stale relative to the current registry", {
      reason_code: "EVIDENCE_STALE_OR_INVALID",
      record_id: proof.record_id,
    });
  }
  if (!issuedBinding.policy_decision_refs?.includes(decision.policy_ref)) {
    fail("PROVIDER_COMPATIBILITY_DENIED", "binding does not preserve the compatibility policy decision", {
      reason_code: "EVIDENCE_STALE_OR_INVALID",
      record_id: proof.record_id,
    });
  }
  return decision;
}

export function createExecutorRegistry(adapters = {}, {
  credentialVault = null,
  sessionRegistry = null,
  bindingService = null,
  compatibilityRegistry = null,
  clock = () => new Date(),
} = {}) {
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
      const binding = validateBinding(provider, request);
      const issuedBinding = assertBindingIssued(bindingService, binding, request);
      assertCompatibility(compatibilityRegistry, bindingService, issuedBinding, clock());
      assertExecutorDispatchAllowed(request);

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
