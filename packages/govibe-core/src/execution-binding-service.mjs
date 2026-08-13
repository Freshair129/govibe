import { randomUUID } from "node:crypto";

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
    fail("INVALID_EXECUTION_BINDING_REQUEST", `${field} is required`, { field });
  }
  return value;
}

function requireContext(context) {
  if (!context || typeof context !== "object") fail("CONTEXT_PACKET_REQUIRED", "persisted context packet is required");
  const normalized = {
    context_id: requireText(context.context_id, "context.context_id"),
    cache_id: requireText(context.cache_id, "context.cache_id"),
    context_hash: requireText(context.context_hash, "context.context_hash"),
    source_manifest_hash: requireText(context.source_manifest_hash, "context.source_manifest_hash"),
    context_profile: requireText(context.context_profile, "context.context_profile"),
    tool_contract_hash: requireText(context.tool_contract_hash, "context.tool_contract_hash"),
    persisted: context.persisted === true,
  };
  if (!normalized.persisted) fail("CONTEXT_PACKET_NOT_PERSISTED", "execution binding requires a persisted context packet");
  return Object.freeze(normalized);
}

function normalizeCompatibilityProof(input) {
  if (input == null) return null;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("INVALID_EXECUTION_BINDING_REQUEST", "eligible_target.compatibility must be an object", { field: "eligible_target.compatibility" });
  }
  if (input.authorized !== true) {
    fail("PROVIDER_COMPATIBILITY_DENIED", "eligible target does not carry an authorized compatibility decision");
  }
  return Object.freeze({
    authorized: true,
    record_id: requireText(input.record_id, "eligible_target.compatibility.record_id"),
    record_version: requireText(input.record_version, "eligible_target.compatibility.record_version"),
    provider: requireText(input.provider, "eligible_target.compatibility.provider"),
    product: requireText(input.product, "eligible_target.compatibility.product"),
    plan: requireText(input.plan, "eligible_target.compatibility.plan"),
    execution_surface: requireText(input.execution_surface, "eligible_target.compatibility.execution_surface"),
    entitlement_type: requireText(input.entitlement_type, "eligible_target.compatibility.entitlement_type"),
    owner_id: requireText(input.owner_id, "eligible_target.compatibility.owner_id"),
    requested_scope: requireText(input.requested_scope, "eligible_target.compatibility.requested_scope"),
    principal_id: requireText(input.principal_id, "eligible_target.compatibility.principal_id"),
    organization_id: requireText(input.organization_id, "eligible_target.compatibility.organization_id"),
    workspace_id: requireText(input.workspace_id, "eligible_target.compatibility.workspace_id"),
    adapter_id: requireText(input.adapter_id, "eligible_target.compatibility.adapter_id"),
    automation_requested: input.automation_requested === true,
    session_reuse_requested: input.session_reuse_requested === true,
    concurrent_use_requested: input.concurrent_use_requested === true,
    credential_delegation_requested: input.credential_delegation_requested === true,
    evidence_valid: input.evidence_valid !== false,
    policy_ref: requireText(input.policy_ref, "eligible_target.compatibility.policy_ref"),
  });
}

function assertEligibleTarget(target, request) {
  if (!target || typeof target !== "object") fail("ELIGIBLE_TARGET_REQUIRED", "eligible target is required");
  const providerId = requireText(target.provider_id, "eligible_target.provider_id");
  const entitlementId = requireText(target.entitlement_id, "eligible_target.entitlement_id");
  const executorClass = requireText(target.executor_class, "eligible_target.executor_class");
  const modelId = requireText(target.model_id, "eligible_target.model_id");

  if (target.authorized !== true) fail("ENTITLEMENT_NOT_AUTHORIZED", "target was not authorized by entitlement policy");
  if (target.actor_id && target.actor_id !== request.actor_id) fail("ENTITLEMENT_PRINCIPAL_MISMATCH", "eligible target belongs to another principal");
  if (target.workspace_id && target.workspace_id !== request.workspace_id) fail("ENTITLEMENT_WORKSPACE_MISMATCH", "eligible target belongs to another workspace");
  if (target.project_id && target.project_id !== request.project_id) fail("ENTITLEMENT_PROJECT_MISMATCH", "eligible target belongs to another project");
  if (target.state && target.state !== "active") fail("ENTITLEMENT_NOT_ACTIVE", "eligible target is not active", { state: target.state });

  return Object.freeze({
    providerId,
    entitlementId,
    executorClass,
    modelId,
    compatibility: normalizeCompatibilityProof(target.compatibility),
  });
}

export function createExecutionBindingService({
  clock = () => new Date(),
  idFactory = randomUUID,
  defaultTtlMs = 60_000,
} = {}) {
  const bindings = new Map();

  function createBinding(input) {
    const bindingRequestId = requireText(input?.binding_request_id, "binding_request_id");
    const actorId = requireText(input?.actor_id, "actor_id");
    const organizationId = requireText(input?.organization_id, "organization_id");
    const workspaceId = requireText(input?.workspace_id, "workspace_id");
    const taskId = requireText(input?.task_id, "task_id");
    const agentId = requireText(input?.agent_id, "agent_id");
    const runId = requireText(input?.run_id, "run_id");
    const sessionId = requireText(input?.session_id, "session_id");
    const turnId = requireText(input?.turn_id, "turn_id");
    const context = requireContext(input?.context);
    const target = assertEligibleTarget(input?.eligible_target, {
      actor_id: actorId,
      workspace_id: workspaceId,
      project_id: input?.project_id ?? null,
    });

    const policyDecisionRefs = input?.policy_decision_refs;
    if (!Array.isArray(policyDecisionRefs) || policyDecisionRefs.length === 0 || policyDecisionRefs.some((ref) => typeof ref !== "string" || ref.trim() === "")) {
      fail("POLICY_DECISION_REQUIRED", "at least one policy decision reference is required");
    }

    if (target.compatibility) {
      if (target.compatibility.principal_id !== actorId) fail("ENTITLEMENT_PRINCIPAL_MISMATCH", "compatibility proof belongs to another principal");
      if (target.compatibility.workspace_id !== workspaceId) fail("ENTITLEMENT_WORKSPACE_MISMATCH", "compatibility proof belongs to another workspace");
      if (target.compatibility.organization_id !== organizationId) fail("ENTITLEMENT_ORGANIZATION_MISMATCH", "compatibility proof belongs to another organization");
      if (target.compatibility.provider !== target.providerId) fail("PROVIDER_COMPATIBILITY_DENIED", "compatibility proof provider does not match target provider");
      if (target.compatibility.entitlement_type == null) fail("PROVIDER_COMPATIBILITY_DENIED", "compatibility proof entitlement type is required");
      if (!policyDecisionRefs.includes(target.compatibility.policy_ref)) fail("POLICY_DECISION_REQUIRED", "compatibility policy reference must be preserved on the binding");
    }

    const ttlMs = input?.ttl_ms ?? defaultTtlMs;
    if (!Number.isInteger(ttlMs) || ttlMs <= 0) fail("INVALID_EXECUTION_BINDING_REQUEST", "ttl_ms must be a positive integer");

    const createdAt = clock();
    const binding = Object.freeze({
      schema: "govibe-execution-binding/v1",
      binding_id: `bind_${idFactory()}`,
      binding_request_id: bindingRequestId,
      actor_id: actorId,
      principal_id: actorId,
      organization_id: organizationId,
      workspace_id: workspaceId,
      project_id: input?.project_id ?? null,
      task_id: taskId,
      agent_id: agentId,
      run_id: runId,
      session_id: sessionId,
      turn_id: turnId,
      context_id: context.context_id,
      cache_id: context.cache_id,
      context_hash: context.context_hash,
      source_manifest_hash: context.source_manifest_hash,
      context_profile: context.context_profile,
      tool_contract_hash: context.tool_contract_hash,
      provider_id: target.providerId,
      entitlement_id: target.entitlementId,
      executor_class: target.executorClass,
      model_id: target.modelId,
      provider_session_id: input?.provider_session_id ?? null,
      affinity_key: input?.affinity_key ?? null,
      fallback_policy_id: input?.fallback_policy_id ?? null,
      quota_snapshot_ref: input?.quota_snapshot_ref ?? null,
      compatibility: target.compatibility,
      policy_decision_refs: Object.freeze([...policyDecisionRefs]),
      state: "active",
      authorized_at: createdAt.toISOString(),
      expires_at: new Date(createdAt.getTime() + ttlMs).toISOString(),
      revoked_at: null,
    });

    bindings.set(binding.binding_id, binding);
    return binding;
  }

  function assertUsable(bindingId, expected = {}) {
    const binding = bindings.get(bindingId);
    if (!binding) fail("EXECUTION_BINDING_NOT_FOUND", "execution binding was not found", { binding_id: bindingId });
    if (binding.state !== "active") fail("EXECUTION_BINDING_REVOKED", "execution binding is not active", { binding_id: bindingId });
    if (Date.parse(binding.expires_at) <= clock().getTime()) fail("EXECUTION_BINDING_EXPIRED", "execution binding expired", { binding_id: bindingId });

    for (const field of [
      "actor_id",
      "principal_id",
      "workspace_id",
      "task_id",
      "agent_id",
      "run_id",
      "session_id",
      "turn_id",
      "context_id",
      "cache_id",
      "provider_id",
      "entitlement_id",
      "context_hash",
    ]) {
      if (expected[field] !== undefined && binding[field] !== expected[field]) {
        fail("EXECUTION_BINDING_SCOPE_MISMATCH", `execution binding ${field} mismatch`, { field });
      }
    }
    return binding;
  }

  function revokeBinding(bindingId) {
    const binding = bindings.get(bindingId);
    if (!binding) fail("EXECUTION_BINDING_NOT_FOUND", "execution binding was not found", { binding_id: bindingId });
    const revoked = Object.freeze({ ...binding, state: "revoked", revoked_at: clock().toISOString() });
    bindings.set(bindingId, revoked);
    return revoked;
  }

  function inspect() {
    return Object.freeze([...bindings.values()].map((binding) => Object.freeze({ ...binding })));
  }

  return Object.freeze({ createBinding, assertUsable, revokeBinding, inspect });
}
