import { describe, expect, it } from 'vitest';
import { createExecutionBindingService } from './execution-binding-service.mjs';
import { createExecutionCapabilityPlanner } from './execution-capability-planner.mjs';
import { affinityKeyOf, createExecutionRouter, normalizeRebindRequest, scoreQuota } from './execution-router.mjs';
import { createEntitlementRegistry, createProviderCapabilityRegistry } from './provider-entitlement-registry.mjs';

function descriptor(providerId, overrides = {}) {
  return {
    schema: 'govibe-provider-capability-descriptor/v1',
    provider_id: providerId,
    adapter_id: `adapter-${providerId}`,
    adapter_version: '1.0.0',
    executor_classes: ['api-llm'],
    entitlement_types: ['api'],
    models: [{ model_id: `${providerId}-model`, capabilities: ['chat'], context_limit_tokens: 100_000, supports_tools: true }],
    usage_visibility: 'detailed',
    token_usage_reported: true,
    cached_token_usage_reported: true,
    remaining_quota_reported: true,
    rate_limit_detectable: true,
    data_policy_tags: [],
    observed_at: '2026-08-04T00:00:00.000Z',
    ...overrides,
  };
}

function entitlement(providerId, overrides = {}) {
  return {
    schema: 'govibe-provider-entitlement/v1',
    entitlement_id: `ent-${providerId}`,
    version: '1',
    provider_id: providerId,
    entitlement_type: 'api',
    owner: { owner_type: 'user', owner_id: 'user-1' },
    share_policy: 'owner_only',
    executor_classes: ['api-llm'],
    valid_from: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function planningRequest(overrides = {}) {
  return {
    request_id: 'req-1',
    actor_id: 'user-1',
    organization_id: 'org-1',
    workspace_id: 'ws-1',
    project_id: 'proj-1',
    task_id: 'task-1',
    agent_id: 'agent-1',
    executor_class: 'api-llm',
    required_capabilities: ['chat'],
    required_tools: [],
    data_classification: 'internal',
    tool_contract_hash: 'tools-1',
    context_integrity_valid: true,
    ...overrides,
  };
}

function bindingRequest(overrides = {}) {
  return {
    binding_request_id: 'br-1',
    actor_id: 'user-1',
    organization_id: 'org-1',
    workspace_id: 'ws-1',
    project_id: 'proj-1',
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
    ...overrides,
  };
}

function harness({ providers = ['alpha', 'beta'], entitlements = null, quotaSource = null, reliabilitySource = null, descriptors = null } = {}) {
  const capabilityRegistry = createProviderCapabilityRegistry(descriptors ?? providers.map((id) => descriptor(id)));
  const entitlementRegistry = createEntitlementRegistry(entitlements ?? providers.map((id) => entitlement(id)));
  const planner = createExecutionCapabilityPlanner({
    capabilityRegistry,
    entitlementRegistry,
    clock: () => new Date('2026-08-04T00:00:00.000Z'),
  });
  let counter = 0;
  const bindingService = createExecutionBindingService({
    clock: () => new Date('2026-08-04T00:00:00.000Z'),
    idFactory: () => { counter += 1; return String(counter); },
  });
  const router = createExecutionRouter({
    planner,
    bindingService,
    quotaSource,
    reliabilitySource,
    clock: () => new Date('2026-08-04T00:00:00.000Z'),
    idFactory: (n) => String(n),
  });
  return { router, planner, bindingService, capabilityRegistry, entitlementRegistry };
}

describe('authorization-first routing', () => {
  it('never selects a target the planner did not authorize, however attractive its score', () => {
    // beta is revoked, so the planner must drop it even though reliability favours it.
    const { router } = harness({
      entitlements: [entitlement('alpha'), entitlement('beta', { state: 'revoked' })],
      reliabilitySource: (target) => (target.provider_id === 'beta' ? 1 : 0),
    });

    const { binding, decision } = router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });

    expect(binding.provider_id).toBe('alpha');
    expect(decision.candidates.map((c) => c.provider_id)).toEqual(['alpha']);
    expect(decision.selected_target_key).toBe('alpha:ent-alpha:alpha-model');
  });

  it('fails closed when every eligible target is excluded', () => {
    const { router } = harness({ providers: ['alpha'] });

    expect(() => router.route({
      planning_request: planningRequest(),
      binding_request: bindingRequest(),
      exclude_targets: ['alpha'],
    })).toThrowError(expect.objectContaining({ code: 'NO_AUTHORIZED_ENTITLEMENT' }));

    expect(router.decisions().at(-1)).toMatchObject({ outcome: 'NO_ELIGIBLE_TARGET', selected_target_key: null });
  });

  it('rejects an incompatible tool contract before any routing happens', () => {
    const { router } = harness();

    expect(() => router.route({
      planning_request: planningRequest({ allowed_tool_contract_hashes: ['tools-2'] }),
      binding_request: bindingRequest(),
    })).toThrowError(expect.objectContaining({ code: 'TOOL_CONTRACT_INCOMPATIBLE' }));

    expect(router.decisions()).toHaveLength(0);
  });

  it('carries the scheduler decision into the binding policy references', () => {
    const { router } = harness({ providers: ['alpha'] });
    const { binding, decision } = router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });

    expect(binding.policy_decision_refs).toContain(`scheduler:${decision.decision_id}`);
  });
});

describe('quota signals are preferences, not capacity', () => {
  it('scores an observed rate limit to zero and reports the observation', () => {
    expect(scoreQuota({ visibility: 'detailed', observed_rate_limit: { limited: true }, reported: { remaining: 500 } })).toEqual({
      score: 0,
      signal: 'observed_rate_limit',
      reason: 'PROVIDER_RATE_LIMITED',
    });
  });

  it('keeps unknown and rate-limit-only providers neutral instead of inventing capacity', () => {
    expect(scoreQuota(null)).toMatchObject({ score: 0.5, signal: 'unknown', reason: 'NO_QUOTA_SNAPSHOT' });
    expect(scoreQuota({ visibility: 'rate-limit-only', observed_rate_limit: { limited: false } })).toMatchObject({ score: 0.5, signal: 'unknown' });
    expect(scoreQuota({ visibility: 'unknown', reported: { remaining: null } })).toMatchObject({ score: 0.5, signal: 'unknown' });
  });

  it('never attributes a scheduler capacity estimate to the provider', () => {
    expect(scoreQuota({ visibility: 'partial', source: 'scheduler', estimated: { capacity_score: 0.9 } })).toMatchObject({
      score: 0.9,
      signal: 'scheduler_estimated',
    });
    expect(scoreQuota({ visibility: 'partial', source: 'provider', estimated: { capacity_score: 0.9 } })).toMatchObject({
      signal: 'unknown',
      reason: 'UNKNOWN_QUOTA_SEMANTICS',
    });
  });

  it('prefers a provider with reported headroom over one that is rate limited', () => {
    const { router } = harness({
      quotaSource: (target) => (target.provider_id === 'alpha'
        ? { visibility: 'detailed', observed_rate_limit: { limited: true } }
        : { visibility: 'detailed', reported: { remaining: 900 }, observed_rate_limit: { limited: false } }),
    });

    const { binding, decision } = router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });

    expect(binding.provider_id).toBe('beta');
    const alpha = decision.candidates.find((c) => c.provider_id === 'alpha');
    expect(alpha.quota_signal).toBe('observed_rate_limit');
    expect(alpha.components.quota).toBe(0);
    expect(decision.quota_signals_are_not_capacity).toBe(true);
  });
});

describe('affinity is an optimization only', () => {
  it('reuses a sticky target when it is still eligible', () => {
    const scope = { workspace_id: 'ws-1', agent_id: 'agent-1', model_family: 'chat' };
    const { router } = harness();

    const first = router.route({ planning_request: planningRequest(), binding_request: bindingRequest(), affinity_scope: scope });
    const second = router.route({ planning_request: planningRequest(), binding_request: bindingRequest(), affinity_scope: scope });

    expect(second.binding.provider_id).toBe(first.binding.provider_id);
    expect(second.decision.affinity_target_key).toBe(first.decision.selected_target_key);
    expect(second.decision.affinity_target_still_eligible).toBe(true);
    expect(second.decision.candidates.find((c) => c.target_key === first.decision.selected_target_key).affinity_hit).toBe(true);
  });

  it('drops a sticky target that is no longer authorized rather than honouring it', () => {
    const scope = { workspace_id: 'ws-1', agent_id: 'agent-1' };
    const capabilities = [descriptor('alpha'), descriptor('beta')];
    const registry = createEntitlementRegistry([entitlement('alpha'), entitlement('beta')]);
    const planner = createExecutionCapabilityPlanner({
      capabilityRegistry: createProviderCapabilityRegistry(capabilities),
      entitlementRegistry: registry,
      clock: () => new Date('2026-08-04T00:00:00.000Z'),
    });
    let counter = 0;
    const router = createExecutionRouter({
      planner,
      bindingService: createExecutionBindingService({ clock: () => new Date('2026-08-04T00:00:00.000Z'), idFactory: () => { counter += 1; return String(counter); } }),
      reliabilitySource: (target) => (target.provider_id === 'alpha' ? 1 : 0),
      clock: () => new Date('2026-08-04T00:00:00.000Z'),
      idFactory: (n) => String(n),
    });

    const first = router.route({ planning_request: planningRequest(), binding_request: bindingRequest(), affinity_scope: scope });
    expect(first.binding.provider_id).toBe('alpha');

    registry.register(entitlement('alpha', { state: 'revoked' }));
    const second = router.route({ planning_request: planningRequest(), binding_request: bindingRequest(), affinity_scope: scope });

    expect(second.binding.provider_id).toBe('beta');
    expect(second.decision.affinity_target_key).toBe('alpha:ent-alpha:alpha-model');
    expect(second.decision.affinity_target_still_eligible).toBe(false);
  });

  it('states on every decision record that affinity is not a memory-validity signal', () => {
    const { router } = harness({ providers: ['alpha'] });
    const { decision } = router.route({ planning_request: planningRequest(), binding_request: bindingRequest(), affinity_scope: { workspace_id: 'ws-1' } });

    expect(decision.affinity_is_optimization_only).toBe(true);
    expect(decision.schema).toBe('govibe-scheduler-decision/v1');
  });

  it('builds a stable affinity key across the declared dimensions', () => {
    expect(affinityKeyOf({ workspace_id: 'ws-1', model_family: 'chat' })).toBe(
      'workspace_id=ws-1|project_id=*|agent_id=*|workflow_id=*|provider_id=*|model_family=chat',
    );
  });
});

describe('governed failover', () => {
  function firstBinding(router) {
    return router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });
  }

  function rebindRequest(previousBindingId, overrides = {}) {
    return {
      rebind_request_id: 'rb-1',
      previous_binding_id: previousBindingId,
      context_id: 'ctx-1',
      context_hash: 'hash-1',
      failure_code: 'PROVIDER_RATE_LIMITED',
      fallback_policy_id: 'fallback-1',
      ...overrides,
    };
  }

  it('creates a new binding id, excludes the failed target and preserves context lineage', () => {
    const { router } = harness();
    const first = firstBinding(router);

    const result = router.rebind({
      rebind_request: rebindRequest(first.binding.binding_id),
      planning_request: planningRequest(),
      binding_request: bindingRequest({ binding_request_id: 'br-2' }),
      previous_binding: first.binding,
    });

    expect(result.binding.binding_id).not.toBe(first.binding.binding_id);
    expect(result.binding.provider_id).not.toBe(first.binding.provider_id);
    expect(result.binding.context_id).toBe(first.binding.context_id);
    expect(result.binding.context_hash).toBe(first.binding.context_hash);
    expect(result.decision.reason).toBe('FAILOVER_REBIND');
    expect(result.decision.failure_code).toBe('PROVIDER_RATE_LIMITED');
    expect(result.decision.previous_binding_id).toBe(first.binding.binding_id);
  });

  it('re-evaluates entitlement policy so a revoked fallback cannot be used', () => {
    const registry = createEntitlementRegistry([entitlement('alpha'), entitlement('beta')]);
    const planner = createExecutionCapabilityPlanner({
      capabilityRegistry: createProviderCapabilityRegistry([descriptor('alpha'), descriptor('beta')]),
      entitlementRegistry: registry,
      clock: () => new Date('2026-08-04T00:00:00.000Z'),
    });
    let counter = 0;
    const router = createExecutionRouter({
      planner,
      bindingService: createExecutionBindingService({ clock: () => new Date('2026-08-04T00:00:00.000Z'), idFactory: () => { counter += 1; return String(counter); } }),
      clock: () => new Date('2026-08-04T00:00:00.000Z'),
      idFactory: (n) => String(n),
    });

    const first = firstBinding(router);
    const fallbackProvider = first.binding.provider_id === 'alpha' ? 'beta' : 'alpha';
    registry.register(entitlement(fallbackProvider, { state: 'revoked' }));

    expect(() => router.rebind({
      rebind_request: rebindRequest(first.binding.binding_id),
      planning_request: planningRequest(),
      binding_request: bindingRequest({ binding_request_id: 'br-2' }),
      previous_binding: first.binding,
    })).toThrowError(expect.objectContaining({ code: 'NO_AUTHORIZED_ENTITLEMENT' }));
  });

  it('refuses a rebind when the context changed', () => {
    const { router } = harness();
    const first = firstBinding(router);

    for (const change of [{ context_hash: 'hash-2' }, { context_id: 'ctx-2' }]) {
      expect(() => router.rebind({
        rebind_request: rebindRequest(first.binding.binding_id, change),
        planning_request: planningRequest(),
        binding_request: bindingRequest({ binding_request_id: 'br-2' }),
        previous_binding: first.binding,
      })).toThrowError(expect.objectContaining({ code: 'CONTEXT_LINEAGE_CHANGED' }));
    }
  });

  it('refuses a rebind that names a different previous binding', () => {
    const { router } = harness();
    const first = firstBinding(router);

    expect(() => router.rebind({
      rebind_request: rebindRequest('bind_elsewhere'),
      planning_request: planningRequest(),
      binding_request: bindingRequest({ binding_request_id: 'br-2' }),
      previous_binding: first.binding,
    })).toThrowError(expect.objectContaining({ code: 'PREVIOUS_BINDING_MISMATCH' }));
  });

  it('reports a capability downgrade taken during failover', () => {
    const { router } = harness({
      descriptors: [
        descriptor('alpha'),
        descriptor('beta', { usage_visibility: 'rate-limit-only', models: [{ model_id: 'beta-model', capabilities: ['chat'], context_limit_tokens: 8_000, supports_tools: true }] }),
      ],
      reliabilitySource: (target) => (target.provider_id === 'alpha' ? 1 : 0),
    });
    const first = firstBinding(router);
    expect(first.binding.provider_id).toBe('alpha');

    const result = router.rebind({
      rebind_request: rebindRequest(first.binding.binding_id, { failure_code: 'PROVIDER_UNAVAILABLE' }),
      planning_request: planningRequest(),
      binding_request: bindingRequest({ binding_request_id: 'br-2' }),
      previous_binding: first.binding,
    });

    expect(result.binding.provider_id).toBe('beta');
    expect(result.decision.downgrades).toContainEqual({ kind: 'provider', from: 'alpha', to: 'beta' });
    expect(result.decision.downgrades).toContainEqual({ kind: 'model', from: 'alpha-model', to: 'beta-model' });
  });

  it('rejects an unsupported or malformed rebind schema', () => {
    expect(() => normalizeRebindRequest({ schema: 'govibe-execution-rebind-request/v2' })).toThrowError(
      expect.objectContaining({ code: 'REBIND_SCHEMA_UNSUPPORTED' }),
    );
    expect(() => normalizeRebindRequest({ rebind_request_id: 'rb-1' })).toThrowError(
      expect.objectContaining({ code: 'INVALID_REBIND_REQUEST' }),
    );
  });
});

describe('scheduler decision evidence', () => {
  it('records every candidate with its score components and reasons', () => {
    const { router } = harness({
      quotaSource: () => ({ visibility: 'rate-limit-only' }),
    });
    router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });

    const [decision] = router.decisions();
    expect(decision.candidates).toHaveLength(2);
    for (const candidate of decision.candidates) {
      expect(candidate).toMatchObject({ quota_signal: 'unknown', quota_reason: 'UNKNOWN_QUOTA_SEMANTICS' });
      expect(Object.keys(candidate.components).sort()).toEqual(['affinity', 'capability_fit', 'queue', 'quota', 'reliability']);
      expect(candidate.score).toBeGreaterThan(0);
    }
    expect(decision.decided_at).toBe('2026-08-04T00:00:00.000Z');
    expect(Object.isFrozen(decision)).toBe(true);
  });

  it('keeps one decision record per routing attempt including failures', () => {
    const { router } = harness({ providers: ['alpha'] });
    router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });
    expect(() => router.route({ planning_request: planningRequest(), binding_request: bindingRequest(), exclude_targets: ['alpha'] })).toThrow();

    const decisions = router.decisions();
    expect(decisions.map((entry) => entry.outcome)).toEqual(['SELECTED', 'NO_ELIGIBLE_TARGET']);
    expect(new Set(decisions.map((entry) => entry.decision_id)).size).toBe(2);
  });

  it('requires a planner and a binding service', () => {
    expect(() => createExecutionRouter({})).toThrowError(expect.objectContaining({ code: 'INVALID_ROUTER_CONFIGURATION' }));
    expect(() => createExecutionRouter({ planner: { plan() {} } })).toThrowError(
      expect.objectContaining({ code: 'INVALID_ROUTER_CONFIGURATION' }),
    );
  });
});
