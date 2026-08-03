import { describe, expect, it } from 'vitest';
import {
  createEntitlementRegistry,
  createProviderCapabilityRegistry,
} from './provider-entitlement-registry.mjs';
import { createExecutionBindingService } from './execution-binding-service.mjs';
import { createExecutionCapabilityPlanner } from './execution-capability-planner.mjs';

function capability(overrides = {}) {
  return {
    schema: 'govibe-provider-capability-descriptor/v1',
    provider_id: 'local',
    adapter_id: 'local-adapter',
    adapter_version: '1.0.0',
    executor_classes: ['local-llm'],
    models: [{
      model_id: 'qwen',
      capabilities: ['text', 'tools'],
      context_limit_tokens: 32768,
      supports_tools: true,
      supports_streaming: true,
      supports_reasoning_control: false,
    }],
    entitlement_types: ['local_compute'],
    usage_visibility: 'detailed',
    token_usage_reported: true,
    cached_token_usage_reported: false,
    remaining_quota_reported: false,
    rate_limit_detectable: false,
    supports_session_affinity: true,
    supports_prompt_cache_reference: false,
    supports_cancellation: true,
    supports_parallel_runs: true,
    credential_modes: ['none'],
    data_policy_tags: ['local', 'th'],
    observed_at: '2026-08-03T00:00:00.000Z',
    ...overrides,
  };
}

function entitlement(overrides = {}) {
  return {
    schema: 'govibe-provider-entitlement/v1',
    entitlement_id: 'ent_1',
    version: '1',
    provider_id: 'local',
    entitlement_type: 'local_compute',
    owner: { owner_type: 'user', owner_id: 'user_1' },
    share_policy: 'owner_only',
    allowed_principals: [],
    allowed_roles: ['worker'],
    allowed_workspaces: ['ws_1'],
    allowed_projects: ['proj_1'],
    data_classifications: ['internal'],
    residency_policy: ['local', 'th'],
    credential_ref: null,
    executor_classes: ['local-llm'],
    model_allowlist: ['qwen'],
    model_denylist: [],
    concurrency: { max_active: 1, max_queued: 2 },
    session_policy: { cross_run_reuse: false, cross_user_reuse: false, ttl_seconds: 300 },
    quota_policy_ref: null,
    state: 'active',
    valid_from: '2026-08-01T00:00:00.000Z',
    valid_until: null,
    ...overrides,
  };
}

function planningRequest(overrides = {}) {
  return {
    request_id: 'req_1',
    actor_id: 'user_1',
    organization_id: 'org_1',
    workspace_id: 'ws_1',
    project_id: 'proj_1',
    task_id: 'task_1',
    agent_id: 'agent_1',
    role: 'worker',
    executor_class: 'local-llm',
    required_capabilities: ['text', 'tools'],
    required_tools: ['filesystem'],
    data_classification: 'internal',
    residency_requirements: ['local', 'th'],
    maximum_context_budget_tokens: 16000,
    context_token_count: 12000,
    tool_contract_hash: 'tools_1',
    allowed_tool_contract_hashes: ['tools_1'],
    context_integrity_valid: true,
    ...overrides,
  };
}

function createPlanner(entitlements = [entitlement()], capabilities = [capability()]) {
  return createExecutionCapabilityPlanner({
    capabilityRegistry: createProviderCapabilityRegistry(capabilities),
    entitlementRegistry: createEntitlementRegistry(entitlements),
    clock: () => new Date('2026-08-03T01:00:00.000Z'),
  });
}

describe('execution capability planner', () => {
  it('returns an authorized target without selecting knowledge or mutating context', () => {
    const planner = createPlanner();
    const plan = planner.plan(planningRequest());

    expect(plan.eligible_targets).toHaveLength(1);
    expect(plan.eligible_targets[0]).toMatchObject({
      authorized: true,
      provider_id: 'local',
      entitlement_id: 'ent_1',
      model_id: 'qwen',
    });
    expect(plan).not.toHaveProperty('knowledge');
    expect(plan.constraints_for_msp.required_rendering_contracts).toEqual(['tools_1']);
  });

  it('rejects when no entitlement is authorized', () => {
    const planner = createPlanner([entitlement({ owner: { owner_type: 'user', owner_id: 'user_2' } })]);
    expect(() => planner.plan(planningRequest())).toThrowError(
      expect.objectContaining({ code: 'NO_AUTHORIZED_ENTITLEMENT' }),
    );
  });

  it('rejects an unsatisfied context budget', () => {
    const planner = createPlanner();
    expect(() => planner.plan(planningRequest({ context_token_count: 17000 }))).toThrowError(
      expect.objectContaining({ code: 'CONTEXT_BUDGET_UNSATISFIED' }),
    );
  });

  it('rejects an incompatible tool contract', () => {
    const planner = createPlanner();
    expect(() => planner.plan(planningRequest({ tool_contract_hash: 'tools_2' }))).toThrowError(
      expect.objectContaining({ code: 'TOOL_CONTRACT_INCOMPATIBLE' }),
    );
  });

  it('rejects failed context integrity', () => {
    const planner = createPlanner();
    expect(() => planner.plan(planningRequest({ context_integrity_valid: false }))).toThrowError(
      expect.objectContaining({ code: 'CONTEXT_INTEGRITY_FAILED' }),
    );
  });

  it('does not silently downgrade model capability or tools', () => {
    const planner = createPlanner([], [capability({
      models: [{
        model_id: 'small',
        capabilities: ['text'],
        context_limit_tokens: 32768,
        supports_tools: false,
        supports_streaming: true,
        supports_reasoning_control: false,
      }],
    })]);
    expect(() => planner.plan(planningRequest())).toThrowError(
      expect.objectContaining({ code: 'NO_AUTHORIZED_ENTITLEMENT' }),
    );
  });

  it('creates a binding only from the planner-selected authorized target', () => {
    const planner = createPlanner();
    const bindingService = createExecutionBindingService({
      idFactory: () => '1',
      clock: () => new Date('2026-08-03T01:00:00.000Z'),
    });

    const binding = planner.planAndBind({
      planning_request: planningRequest(),
      bindingService,
      binding_request: {
        binding_request_id: 'br_1',
        actor_id: 'user_1',
        organization_id: 'org_1',
        workspace_id: 'ws_1',
        project_id: 'proj_1',
        task_id: 'task_1',
        agent_id: 'agent_1',
        run_id: 'run_1',
        session_id: 'session_1',
        turn_id: 'turn_1',
        context: {
          context_id: 'ctx_1',
          cache_id: 'cache_1',
          context_hash: 'hash_1',
          source_manifest_hash: 'manifest_1',
          context_profile: 'T-ctx',
          tool_contract_hash: 'tools_1',
          persisted: true,
        },
      },
    });

    expect(binding).toMatchObject({
      binding_id: 'bind_1',
      provider_id: 'local',
      entitlement_id: 'ent_1',
      model_id: 'qwen',
      context_hash: 'hash_1',
    });
    expect(binding.policy_decision_refs).toContain('entitlement:ent_1:1');
  });
});
