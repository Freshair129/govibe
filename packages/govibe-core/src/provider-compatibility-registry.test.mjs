import { describe, expect, it, vi } from 'vitest';
import { createExecutionBindingService } from './execution-binding-service.mjs';
import { createExecutionCapabilityPlanner } from './execution-capability-planner.mjs';
import { createExecutorRegistry } from './executor-adapter.mjs';
import {
  createEntitlementRegistry,
  createProviderCapabilityRegistry,
} from './provider-entitlement-registry.mjs';
import {
  createProviderCompatibilityRegistry,
  evaluateProviderCompatibility,
  loadProviderCompatibilityRegistry,
  normalizeCompatibilityRecord,
} from './provider-compatibility-registry.mjs';

const NOW = new Date('2026-08-13T12:00:00.000Z');

function compatibility(overrides = {}) {
  return {
    record_id: 'compat-local-v1',
    schema_version: 'govibe-provider-entitlement-compatibility/v1',
    version: '1.0.0',
    provider: 'local',
    product: 'govibe-local-runtime',
    plan: 'self-hosted',
    execution_surface: 'local_runtime',
    entitlement_type: 'local_compute',
    owner_type: 'user',
    permitted_user_model: 'owner',
    approved_scope: 'owner_only',
    automation_allowed: false,
    credential_delegation_allowed: false,
    session_reuse_allowed: false,
    session_isolation_domain: null,
    concurrent_use_allowed: false,
    allowed_principals: [],
    allowed_workspaces: [],
    allowed_organizations: [],
    allowed_adapter_ids: ['local-adapter'],
    quota_visibility: {
      compute_seconds: 'provider_reported',
      token_usage: 'govibe_estimated',
    },
    cache_visibility: {
      prompt_cache: 'unknown',
      provider_session: 'not_applicable',
    },
    evidence_refs: ['internal:test-policy'],
    evidence_hashes: ['sha256:test-policy-v1'],
    reviewer: 'test-reviewer',
    approval_state: 'approved_owner_only',
    approved_date: '2026-08-01T00:00:00.000Z',
    expiry_date: '2027-08-01T00:00:00.000Z',
    next_review_date: '2027-02-01T00:00:00.000Z',
    restrictions: [],
    fail_closed_reasons: [],
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    provider: 'local',
    product: 'govibe-local-runtime',
    plan: 'self-hosted',
    execution_surface: 'local_runtime',
    entitlement_type: 'local_compute',
    owner_id: 'user-1',
    requested_scope: 'owner_only',
    principal_id: 'user-1',
    organization_id: 'org-1',
    workspace_id: 'ws-1',
    adapter_id: 'local-adapter',
    automation_requested: false,
    session_reuse_requested: false,
    concurrent_use_requested: false,
    credential_delegation_requested: false,
    evidence_valid: true,
    ...overrides,
  };
}

function capability() {
  return {
    schema: 'govibe-provider-capability-descriptor/v1',
    provider_id: 'local',
    adapter_id: 'local-adapter',
    adapter_version: '1.0.0',
    executor_classes: ['local-llm'],
    models: [{
      model_id: 'qwen',
      capabilities: ['text'],
      context_limit_tokens: 32768,
      supports_tools: false,
      supports_streaming: true,
      supports_reasoning_control: false,
    }],
    entitlement_types: ['local_compute'],
    usage_visibility: 'detailed',
    token_usage_reported: false,
    cached_token_usage_reported: false,
    remaining_quota_reported: false,
    rate_limit_detectable: false,
    supports_session_affinity: false,
    supports_prompt_cache_reference: false,
    supports_cancellation: true,
    supports_parallel_runs: false,
    credential_modes: ['none'],
    data_policy_tags: ['local'],
    observed_at: NOW.toISOString(),
  };
}

function entitlement() {
  return {
    schema: 'govibe-provider-entitlement/v1',
    entitlement_id: 'ent-local',
    version: '1',
    provider_id: 'local',
    entitlement_type: 'local_compute',
    owner: { owner_type: 'user', owner_id: 'user-1' },
    share_policy: 'owner_only',
    allowed_principals: [],
    allowed_roles: [],
    allowed_workspaces: ['ws-1'],
    allowed_projects: [],
    data_classifications: ['internal'],
    residency_policy: ['local'],
    credential_ref: null,
    executor_classes: ['local-llm'],
    model_allowlist: ['qwen'],
    model_denylist: [],
    concurrency: { max_active: 1, max_queued: 0 },
    session_policy: { cross_run_reuse: false, cross_user_reuse: false, ttl_seconds: 60 },
    quota_policy_ref: null,
    state: 'active',
    valid_from: '2026-08-01T00:00:00.000Z',
    valid_until: null,
  };
}

function planningRequest() {
  return {
    request_id: 'req-1',
    actor_id: 'user-1',
    organization_id: 'org-1',
    workspace_id: 'ws-1',
    project_id: null,
    task_id: 'task-1',
    agent_id: 'agent-1',
    role: null,
    executor_class: 'local-llm',
    required_capabilities: ['text'],
    required_tools: [],
    data_classification: 'internal',
    residency_requirements: ['local'],
    maximum_context_budget_tokens: 1000,
    context_token_count: 100,
    tool_contract_hash: 'tools-1',
    allowed_tool_contract_hashes: ['tools-1'],
    context_integrity_valid: true,
  };
}

function bindingRequest() {
  return {
    binding_request_id: 'br-1',
    actor_id: 'user-1',
    organization_id: 'org-1',
    workspace_id: 'ws-1',
    project_id: null,
    task_id: 'task-1',
    agent_id: 'agent-1',
    run_id: 'run-1',
    session_id: 'session-1',
    turn_id: 'turn-1',
    context: {
      context_id: 'ctx-1',
      cache_id: 'cache-1',
      context_hash: 'hash-1',
      source_manifest_hash: 'manifest-1',
      context_profile: 'T-ctx',
      tool_contract_hash: 'tools-1',
      persisted: true,
    },
  };
}

function dispatchRequest(binding) {
  return {
    actor_id: 'user-1',
    run_id: 'run-1',
    policyDecision: 'allow',
    contextAuthority: {
      schemaVersion: 'govibe-context-authority/v1',
      identity: {
        taskId: 'task-1',
        agentId: 'agent-1',
        workspaceId: 'ws-1',
        runId: 'run-1',
        sessionId: 'session-1',
        turnId: 'turn-1',
      },
      lineage: { contextId: 'ctx-1', cacheId: 'cache-1' },
      unresolvedAssumptions: [],
      traversal: { relationAllowlist: [], retrievalRadius: 0, inclusions: [], exclusions: [] },
      sources: [],
      budget: { maxTokens: 1000 },
      knowledgeRefs: [],
      requiredReasonRefs: [],
    },
    contextLineage: { runId: 'run-1', sessionId: 'session-1', turnId: 'turn-1' },
    executionBinding: binding,
  };
}

describe('provider entitlement compatibility registry', () => {
  it('loads the canonical machine-readable registry with default deny', () => {
    const registry = loadProviderCompatibilityRegistry('config/provider-entitlement-compatibility.yaml');
    expect(registry.inspect().length).toBeGreaterThan(0);
    expect(registry.inspect().every((record) => record.approval_state !== 'approved_shared')).toBe(true);
  });

  it('fails closed when the compatibility record is missing', () => {
    const registry = createProviderCompatibilityRegistry();
    expect(registry.explainEligibility('missing', request(), NOW)).toMatchObject({
      eligible: false,
      code: 'PROVIDER_COMPATIBILITY_DENIED',
      reason_code: 'COMPATIBILITY_RECORD_MISSING',
    });
  });

  it('fails closed when the record is expired or review-stale', () => {
    const expired = normalizeCompatibilityRecord(compatibility({ expiry_date: '2026-08-12T00:00:00.000Z' }));
    expect(evaluateProviderCompatibility(expired, request(), NOW).reason_code).toBe('COMPATIBILITY_RECORD_EXPIRED');

    const stale = normalizeCompatibilityRecord(compatibility({ next_review_date: '2026-08-12T00:00:00.000Z' }));
    expect(evaluateProviderCompatibility(stale, request(), NOW).reason_code).toBe('EVIDENCE_STALE_OR_INVALID');
  });

  it.each([
    ['product', { product: 'other-product' }, 'PRODUCT_OR_PLAN_MISMATCH'],
    ['plan', { plan: 'other-plan' }, 'PRODUCT_OR_PLAN_MISMATCH'],
    ['surface', { execution_surface: 'cli' }, 'EXECUTION_SURFACE_MISMATCH'],
  ])('fails closed on %s mismatch', (_name, overrides, reason) => {
    const record = normalizeCompatibilityRecord(compatibility());
    expect(evaluateProviderCompatibility(record, request(overrides), NOW).reason_code).toBe(reason);
  });

  it('does not let an owner-only record authorize another principal', () => {
    const record = normalizeCompatibilityRecord(compatibility());
    expect(evaluateProviderCompatibility(record, request({ principal_id: 'user-2' }), NOW).reason_code)
      .toBe('PRINCIPAL_NOT_APPROVED');
  });

  it('does not let workspace approval cross workspaces', () => {
    const record = normalizeCompatibilityRecord(compatibility({
      approval_state: 'approved_shared',
      approved_scope: 'workspace',
      allowed_workspaces: ['ws-1'],
    }));
    expect(evaluateProviderCompatibility(record, request({ requested_scope: 'workspace', workspace_id: 'ws-2' }), NOW).reason_code)
      .toBe('SHARE_SCOPE_NOT_APPROVED');
  });

  it('denies cross-user session reuse without explicit compatibility approval', () => {
    const record = normalizeCompatibilityRecord(compatibility());
    expect(evaluateProviderCompatibility(record, request({ session_reuse_requested: true }), NOW).reason_code)
      .toBe('SESSION_REUSE_NOT_APPROVED');
  });

  it('prohibits approved wildcard records', () => {
    expect(() => normalizeCompatibilityRecord(compatibility({ provider: '*' })))
      .toThrowError(expect.objectContaining({ code: 'COMPATIBILITY_RECORD_INVALID' }));
  });

  it('rechecks current compatibility before adapter invocation so revocation cannot be overridden', async () => {
    const compatibilityRegistry = createProviderCompatibilityRegistry([compatibility()]);
    const planner = createExecutionCapabilityPlanner({
      capabilityRegistry: createProviderCapabilityRegistry([capability()]),
      entitlementRegistry: createEntitlementRegistry([entitlement()]),
      compatibilityRegistry,
      clock: () => NOW,
    });
    const bindingService = createExecutionBindingService({ clock: () => NOW, idFactory: () => '1' });
    const binding = planner.planAndBind({
      planning_request: planningRequest(),
      binding_request: bindingRequest(),
      bindingService,
    });

    compatibilityRegistry.revoke('compat-local-v1');
    const execute = vi.fn(async () => ({ ok: true }));
    const executorRegistry = createExecutorRegistry({ local: { execute } }, {
      bindingService,
      compatibilityRegistry,
      clock: () => NOW,
    });

    await expect(executorRegistry.execute('local', dispatchRequest(binding)))
      .rejects.toMatchObject({
        code: 'PROVIDER_COMPATIBILITY_DENIED',
        details: { reason_code: 'PROVIDER_POLICY_UNKNOWN', record_id: 'compat-local-v1' },
      });
    expect(execute).not.toHaveBeenCalled();
  });
});
