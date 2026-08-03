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

export function createExecutionCapabilityPlanner({ capabilityRegistry, entitlementRegistry, clock = () => new Date() } = {}) {
  if (!capabilityRegistry?.inspect || !entitlementRegistry?.inspect || !entitlementRegistry?.explainEligibility) {
    fail('INVALID_PLANNER_CONFIGURATION', 'capability and entitlement registries are required');
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
        entitlement_id: entitlement.entitlement_id,
        executor_class: request.executor_class,
        model_id: authorizedModel.model_id,
        maximum_context_tokens: authorizedModel.context_limit_tokens,
        usage_visibility: descriptor.usage_visibility,
        session_affinity_available: descriptor.supports_session_affinity,
        prompt_cache_reference_available: descriptor.supports_prompt_cache_reference,
        policy_refs: Object.freeze([
          `entitlement:${entitlement.entitlement_id}:${entitlement.version}`,
          `capability:${descriptor.provider_id}:${descriptor.adapter_version}`,
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
