export class ExecutionPlanningError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ExecutionPlanningError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details) {
  throw new ExecutionPlanningError(code, message, details);
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('INVALID_CAPABILITY_REQUEST', `${field} is required`, { field });
  }
  return value;
}

function requiredList(value, field) {
  if (!Array.isArray(value)) fail('INVALID_CAPABILITY_REQUEST', `${field} must be an array`, { field });
  return Object.freeze([...new Set(value.map((entry, index) => requireText(entry, `${field}[${index}]`)))]);
}

function includesAll(actual, required) {
  return required.every((entry) => actual.includes(entry));
}

function buildEligibilityRequest(request, executorClass, modelId) {
  return {
    principal_id: request.actor_id,
    organization_id: request.organization_id,
    workspace_id: request.workspace_id,
    project_id: request.project_id,
    role: request.role,
    data_classification: request.data_classification,
    executor_class: executorClass,
    model_id: modelId,
  };
}

function requestedCompatibilityScope(entitlement) {
  if (entitlement.share_policy === 'owner_only') return 'owner_only';
  if (entitlement.share_policy === 'named_principals') return 'named_users';
  if (entitlement.share_policy === 'workspace_pool') return 'workspace';
  if (entitlement.share_policy === 'organization_pool') return 'organization';
  return null;
}

function compatibilityContext(record, entitlement, descriptor, request) {
  const requestedScope = requestedCompatibilityScope(entitlement);
  const crossUser = request.actor_id !== entitlement.owner.owner_id;
  return Object.freeze({
    record_id: record.record_id,
    record_version: record.version,
    provider: record.provider,
    product: record.product,
    plan: record.plan,
    execution_surface: record.execution_surface,
    entitlement_type: entitlement.entitlement_type,
    owner_id: entitlement.owner.owner_id,
    requested_scope: requestedScope,
    principal_id: request.actor_id,
    organization_id: request.organization_id,
    workspace_id: request.workspace_id,
    adapter_id: descriptor.adapter_id,
    automation_requested: request.automation_requested,
    session_reuse_requested: request.session_reuse_requested || (crossUser && entitlement.session_policy.cross_user_reuse),
    concurrent_use_requested: request.concurrent_use_requested,
    credential_delegation_requested: request.credential_delegation_requested || (crossUser && entitlement.credential_ref != null),
    evidence_valid: true,
  });
}

function resolveCompatibilityRecord(compatibilityRegistry, entitlement) {
  const records = compatibilityRegistry.inspect()
    .filter((record) => record.provider === entitlement.provider_id && record.entitlement_type === entitlement.entitlement_type);
  if (records.length === 0) {
    return Object.freeze({ record: null, reason_code: 'COMPATIBILITY_RECORD_MISSING' });
  }
  if (records.length > 1) {
    return Object.freeze({ record: null, reason_code: 'PROVIDER_POLICY_UNKNOWN' });
  }
  return Object.freeze({ record: records[0], reason_code: null });
}

export function createExecutionCapabilityPlanner({ capabilityRegistry, entitlementRegistry, compatibilityRegistry, clock = () => new Date() } = {}) {
  if (!capabilityRegistry?.inspect || !entitlementRegistry?.inspect || !entitlementRegistry?.explainEligibility) {
    fail('INVALID_PLANNER_CONFIGURATION', 'capability and entitlement registries are required');
  }
  if (!compatibilityRegistry?.inspect || !compatibilityRegistry?.explainEligibility) {
    fail('INVALID_PLANNER_CONFIGURATION', 'a provider compatibility registry is required');
  }

  function plan(input) {
    const request = Object.freeze({
      schema: 'govibe-execution-capability-request/v1',
      request_id: requireText(input?.request_id, 'request_id'),
      actor_id: requireText(input?.actor_id, 'actor_id'),
      organization_id: requireText(input?.organization_id, 'organization_id'),
      workspace_id: requireText(input?.workspace_id, 'workspace_id'),
      project_id: input?.project_id ?? null,
      task_id: requireText(input?.task_id, 'task_id'),
      agent_id: requireText(input?.agent_id, 'agent_id'),
      role: input?.role ?? null,
      executor_class: requireText(input?.executor_class, 'executor_class'),
      required_capabilities: requiredList(input?.required_capabilities ?? [], 'required_capabilities'),
      required_tools: requiredList(input?.required_tools ?? [], 'required_tools'),
      data_classification: requireText(input?.data_classification, 'data_classification'),
      residency_requirements: requiredList(input?.residency_requirements ?? [], 'residency_requirements'),
      maximum_context_budget_tokens: input?.maximum_context_budget_tokens ?? null,
      context_token_count: input?.context_token_count ?? null,
      tool_contract_hash: requireText(input?.tool_contract_hash, 'tool_contract_hash'),
      allowed_tool_contract_hashes: requiredList(input?.allowed_tool_contract_hashes ?? [], 'allowed_tool_contract_hashes'),
      context_integrity_valid: input?.context_integrity_valid === true,
      automation_requested: input?.automation_requested === true,
      session_reuse_requested: input?.session_reuse_requested === true,
      concurrent_use_requested: input?.concurrent_use_requested === true,
      credential_delegation_requested: input?.credential_delegation_requested === true,
    });

    if (!request.context_integrity_valid) {
      fail('CONTEXT_INTEGRITY_FAILED', 'context integrity validation failed');
    }
    if (request.maximum_context_budget_tokens != null && request.context_token_count != null
      && request.context_token_count > request.maximum_context_budget_tokens) {
      fail('CONTEXT_BUDGET_UNSATISFIED', 'context exceeds the requested budget', {
        context_token_count: request.context_token_count,
        maximum_context_budget_tokens: request.maximum_context_budget_tokens,
      });
    }
    if (request.allowed_tool_contract_hashes.length > 0
      && !request.allowed_tool_contract_hashes.includes(request.tool_contract_hash)) {
      fail('TOOL_CONTRACT_INCOMPATIBLE', 'tool contract hash is not allowed');
    }

    const eligibleTargets = [];
    const rejectedTargets = [];
    const capabilities = capabilityRegistry.inspect();
    const entitlements = entitlementRegistry.inspect();

    for (const entitlement of entitlements) {
      const descriptor = capabilities.find((item) => item.provider_id === entitlement.provider_id);
      if (!descriptor) {
        rejectedTargets.push(Object.freeze({ provider_id: entitlement.provider_id, entitlement_id: entitlement.entitlement_id, reason_code: 'PROVIDER_CAPABILITY_NOT_FOUND' }));
        continue;
      }
      if (!descriptor.executor_classes.includes(request.executor_class)) {
        rejectedTargets.push(Object.freeze({ provider_id: descriptor.provider_id, entitlement_id: entitlement.entitlement_id, reason_code: 'EXECUTOR_CLASS_UNAVAILABLE' }));
        continue;
      }

      const resolvedCompatibility = resolveCompatibilityRecord(compatibilityRegistry, entitlement);
      if (!resolvedCompatibility.record) {
        rejectedTargets.push(Object.freeze({
          provider_id: descriptor.provider_id,
          entitlement_id: entitlement.entitlement_id,
          reason_code: resolvedCompatibility.reason_code,
          reasons: Object.freeze([resolvedCompatibility.reason_code]),
        }));
        continue;
      }

      const compatibility = compatibilityContext(resolvedCompatibility.record, entitlement, descriptor, request);
      if (resolvedCompatibility.record.approved_scope !== compatibility.requested_scope) {
        rejectedTargets.push(Object.freeze({
          provider_id: descriptor.provider_id,
          entitlement_id: entitlement.entitlement_id,
          reason_code: 'SHARE_SCOPE_NOT_APPROVED',
          reasons: Object.freeze(['SHARE_SCOPE_NOT_APPROVED']),
        }));
        continue;
      }

      const compatibilityDecision = compatibilityRegistry.explainEligibility(
        resolvedCompatibility.record.record_id,
        compatibility,
        clock(),
      );
      if (!compatibilityDecision.eligible) {
        rejectedTargets.push(Object.freeze({
          provider_id: descriptor.provider_id,
          entitlement_id: entitlement.entitlement_id,
          reason_code: compatibilityDecision.reason_code,
          reasons: Object.freeze([compatibilityDecision.reason_code]),
          compatibility_record_id: compatibilityDecision.record_id,
        }));
        continue;
      }

      const candidateModels = descriptor.models.filter((model) => {
        if (!entitlement.executor_classes.includes(request.executor_class)) return false;
        if (entitlement.model_denylist.includes(model.model_id)) return false;
        if (entitlement.model_allowlist.length > 0 && !entitlement.model_allowlist.includes(model.model_id)) return false;
        if (!includesAll(model.capabilities, request.required_capabilities)) return false;
        if (request.required_tools.length > 0 && !model.supports_tools) return false;
        if (request.maximum_context_budget_tokens != null && model.context_limit_tokens != null
          && model.context_limit_tokens < request.maximum_context_budget_tokens) return false;
        if (!includesAll(descriptor.data_policy_tags, request.residency_requirements)) return false;
        return true;
      });

      if (candidateModels.length === 0) {
        rejectedTargets.push(Object.freeze({ provider_id: descriptor.provider_id, entitlement_id: entitlement.entitlement_id, reason_code: 'CAPABILITY_REQUIREMENTS_UNSATISFIED' }));
        continue;
      }

      let authorizedModel = null;
      let decision = null;
      for (const model of candidateModels) {
        decision = entitlementRegistry.explainEligibility(
          entitlement.entitlement_id,
          buildEligibilityRequest(request, request.executor_class, model.model_id),
          clock(),
        );
        if (decision.eligible) {
          authorizedModel = model;
          break;
        }
      }

      if (!authorizedModel) {
        rejectedTargets.push(Object.freeze({
          provider_id: descriptor.provider_id,
          entitlement_id: entitlement.entitlement_id,
          reason_code: decision?.reasons?.[0] ?? 'NO_AUTHORIZED_ENTITLEMENT',
          reasons: decision?.reasons ?? Object.freeze(['NO_AUTHORIZED_ENTITLEMENT']),
        }));
        continue;
      }

      eligibleTargets.push(Object.freeze({
        authorized: true,
        actor_id: request.actor_id,
        workspace_id: request.workspace_id,
        project_id: request.project_id,
        provider_id: descriptor.provider_id,
        adapter_id: descriptor.adapter_id,
        entitlement_id: entitlement.entitlement_id,
        executor_class: request.executor_class,
        model_id: authorizedModel.model_id,
        maximum_context_tokens: authorizedModel.context_limit_tokens,
        usage_visibility: descriptor.usage_visibility,
        session_affinity_available: descriptor.supports_session_affinity,
        prompt_cache_reference_available: descriptor.supports_prompt_cache_reference,
        compatibility: Object.freeze({
          authorized: true,
          ...compatibility,
          policy_ref: compatibilityDecision.policy_ref,
        }),
        policy_refs: Object.freeze([
          `entitlement:${entitlement.entitlement_id}:${entitlement.version}`,
          `capability:${descriptor.provider_id}:${descriptor.adapter_version}`,
          compatibilityDecision.policy_ref,
        ]),
        state: entitlement.state,
      }));
    }

    if (eligibleTargets.length === 0) {
      fail('NO_AUTHORIZED_ENTITLEMENT', 'no authorized entitlement satisfies the capability request', {
        rejected_targets: rejectedTargets,
      });
    }

    return Object.freeze({
      schema: 'govibe-execution-capability-plan/v1',
      request_id: request.request_id,
      eligible_targets: Object.freeze(eligibleTargets),
      rejected_targets: Object.freeze(rejectedTargets),
      constraints_for_msp: Object.freeze({
        maximum_context_budget_tokens: request.maximum_context_budget_tokens,
        required_rendering_contracts: Object.freeze([request.tool_contract_hash]),
        prohibited_provider_features: Object.freeze([]),
      }),
      created_at: clock().toISOString(),
    });
  }

  function planAndBind({ planning_request, binding_request, bindingService }) {
    if (!bindingService?.createBinding) fail('INVALID_PLANNER_CONFIGURATION', 'binding service is required');
    const planResult = plan(planning_request);
    const target = planResult.eligible_targets[0];
    return bindingService.createBinding({
      ...binding_request,
      eligible_target: target,
      policy_decision_refs: target.policy_refs,
    });
  }

  return Object.freeze({ plan, planAndBind });
}
