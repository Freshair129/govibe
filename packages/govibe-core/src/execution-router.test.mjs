import { describe, expect, it } from 'vitest';
import { createExecutionBindingService } from './execution-binding-service.mjs';
import { createExecutionCapabilityPlanner } from './execution-capability-planner.mjs';
import { affinityKeyOf, createExecutionRouter, normalizeRebindRequest, scoreQuota } from './execution-router.mjs';
import { createProviderCompatibilityRegistry } from './provider-compatibility-registry.mjs';
import { createEntitlementRegistry, createProviderCapabilityRegistry } from './provider-entitlement-registry.mjs';

const NOW = new Date('2026-08-04T00:00:00.000Z');
const descriptor = (id, extra = {}) => ({
  schema: 'govibe-provider-capability-descriptor/v1', provider_id: id, adapter_id: `adapter-${id}`, adapter_version: '1.0.0',
  executor_classes: ['api-llm'], entitlement_types: ['api'], models: [{ model_id: `${id}-model`, capabilities: ['chat'], context_limit_tokens: 100000, supports_tools: true }],
  usage_visibility: 'detailed', token_usage_reported: true, cached_token_usage_reported: true, remaining_quota_reported: true,
  rate_limit_detectable: true, data_policy_tags: [], observed_at: NOW.toISOString(), ...extra,
});
const entitlement = (id, extra = {}) => ({
  schema: 'govibe-provider-entitlement/v1', entitlement_id: `ent-${id}`, version: '1', provider_id: id, entitlement_type: 'api',
  owner: { owner_type: 'user', owner_id: 'user-1' }, share_policy: 'owner_only', executor_classes: ['api-llm'],
  valid_from: '2026-01-01T00:00:00.000Z', ...extra,
});
const compatibility = (id) => ({
  record_id: `compat-${id}-owner-v1`, schema_version: 'govibe-provider-entitlement-compatibility/v1', version: '1.0.0',
  provider: id, product: `${id}-router-product`, plan: 'router-test', execution_surface: 'api', entitlement_type: 'api',
  owner_type: 'user', permitted_user_model: 'owner', approved_scope: 'owner_only', automation_allowed: false,
  credential_delegation_allowed: false, session_reuse_allowed: false, session_isolation_domain: null, concurrent_use_allowed: false,
  allowed_principals: [], allowed_workspaces: [], allowed_organizations: [], allowed_adapter_ids: [`adapter-${id}`],
  quota_visibility: { request_quota: 'unknown' }, cache_visibility: { provider_session: 'unknown' },
  evidence_refs: [`internal:router-${id}`], evidence_hashes: [`sha256:router-${id}-v1`], reviewer: 'router-test',
  approval_state: 'approved_owner_only', approved_date: '2026-08-01T00:00:00.000Z', expiry_date: '2027-08-01T00:00:00.000Z',
  next_review_date: '2027-02-01T00:00:00.000Z', restrictions: [], fail_closed_reasons: [],
});
const compatRegistry = (ids) => createProviderCompatibilityRegistry(ids.map(compatibility));
const planningRequest = (extra = {}) => ({
  request_id: 'req-1', actor_id: 'user-1', organization_id: 'org-1', workspace_id: 'ws-1', project_id: 'proj-1', task_id: 'task-1', agent_id: 'agent-1',
  executor_class: 'api-llm', required_capabilities: ['chat'], required_tools: [], data_classification: 'internal', tool_contract_hash: 'tools-1', context_integrity_valid: true, ...extra,
});
const bindingRequest = (extra = {}) => ({
  binding_request_id: 'br-1', actor_id: 'user-1', organization_id: 'org-1', workspace_id: 'ws-1', project_id: 'proj-1', task_id: 'task-1', agent_id: 'agent-1',
  run_id: 'run-1', session_id: 'session-1', turn_id: 'turn-1', context: { context_id: 'ctx-1', cache_id: 'cache-1', context_hash: 'hash-1', source_manifest_hash: 'manifest-1', context_profile: 'T-ctx', tool_contract_hash: 'tools-1', persisted: true }, ...extra,
});

function makePlanner(ids, registry, capabilities = ids.map(descriptor)) {
  return createExecutionCapabilityPlanner({
    capabilityRegistry: createProviderCapabilityRegistry(capabilities), entitlementRegistry: registry,
    compatibilityRegistry: compatRegistry(ids), clock: () => NOW,
  });
}
function harness({ providers = ['alpha', 'beta'], entitlements = null, descriptors = null, quotaSource = null, reliabilitySource = null } = {}) {
  const registry = createEntitlementRegistry(entitlements ?? providers.map(entitlement));
  const planner = makePlanner(providers, registry, descriptors ?? providers.map(descriptor));
  let n = 0;
  const bindingService = createExecutionBindingService({ clock: () => NOW, idFactory: () => String(++n) });
  const router = createExecutionRouter({ planner, bindingService, quotaSource, reliabilitySource, clock: () => NOW, idFactory: String });
  return { router, planner, bindingService, entitlementRegistry: registry };
}

describe('authorization-first routing', () => {
  it('never selects an unauthorized target', () => {
    const { router } = harness({ entitlements: [entitlement('alpha'), entitlement('beta', { state: 'revoked' })], reliabilitySource: t => t.provider_id === 'beta' ? 1 : 0 });
    const { binding, decision } = router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });
    expect(binding.provider_id).toBe('alpha'); expect(decision.candidates.map(c => c.provider_id)).toEqual(['alpha']);
  });
  it('fails closed when every eligible target is excluded', () => {
    const { router } = harness({ providers: ['alpha'] });
    expect(() => router.route({ planning_request: planningRequest(), binding_request: bindingRequest(), exclude_targets: ['alpha'] })).toThrowError(expect.objectContaining({ code: 'NO_AUTHORIZED_ENTITLEMENT' }));
    expect(router.decisions().at(-1)).toMatchObject({ outcome: 'NO_ELIGIBLE_TARGET', selected_target_key: null });
  });
  it('rejects an incompatible tool contract before routing', () => {
    const { router } = harness();
    expect(() => router.route({ planning_request: planningRequest({ allowed_tool_contract_hashes: ['tools-2'] }), binding_request: bindingRequest() })).toThrowError(expect.objectContaining({ code: 'TOOL_CONTRACT_INCOMPATIBLE' }));
    expect(router.decisions()).toHaveLength(0);
  });
  it('carries scheduler and compatibility policy refs into the binding', () => {
    const { router } = harness({ providers: ['alpha'] }); const { binding, decision } = router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });
    expect(binding.policy_decision_refs).toContain(`scheduler:${decision.decision_id}`); expect(binding.policy_decision_refs).toContain('compatibility:compat-alpha-owner-v1:1.0.0');
  });
});

describe('quota signals are preferences, not capacity', () => {
  it('scores an observed rate limit to zero', () => expect(scoreQuota({ visibility: 'detailed', observed_rate_limit: { limited: true }, reported: { remaining: 500 } })).toEqual({ score: 0, signal: 'observed_rate_limit', reason: 'PROVIDER_RATE_LIMITED' }));
  it('keeps unknown capacity neutral', () => {
    expect(scoreQuota(null)).toMatchObject({ score: .5, signal: 'unknown' }); expect(scoreQuota({ visibility: 'rate-limit-only', observed_rate_limit: { limited: false } })).toMatchObject({ score: .5, signal: 'unknown' });
  });
  it('does not attribute scheduler estimates to providers', () => {
    expect(scoreQuota({ visibility: 'partial', source: 'scheduler', estimated: { capacity_score: .9 } })).toMatchObject({ score: .9, signal: 'scheduler_estimated' });
    expect(scoreQuota({ visibility: 'partial', source: 'provider', estimated: { capacity_score: .9 } })).toMatchObject({ signal: 'unknown', reason: 'UNKNOWN_QUOTA_SEMANTICS' });
  });
  it('prefers reported headroom over a rate-limited provider', () => {
    const { router } = harness({ quotaSource: t => t.provider_id === 'alpha' ? { visibility: 'detailed', observed_rate_limit: { limited: true } } : { visibility: 'detailed', reported: { remaining: 900 }, observed_rate_limit: { limited: false } } });
    const { binding, decision } = router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });
    expect(binding.provider_id).toBe('beta'); expect(decision.candidates.find(c => c.provider_id === 'alpha').components.quota).toBe(0); expect(decision.quota_signals_are_not_capacity).toBe(true);
  });
});

describe('affinity is an optimization only', () => {
  it('reuses a sticky eligible target', () => {
    const scope = { workspace_id: 'ws-1', agent_id: 'agent-1', model_family: 'chat' }; const { router } = harness();
    const first = router.route({ planning_request: planningRequest(), binding_request: bindingRequest(), affinity_scope: scope });
    const second = router.route({ planning_request: planningRequest(), binding_request: bindingRequest(), affinity_scope: scope });
    expect(second.binding.provider_id).toBe(first.binding.provider_id); expect(second.decision.affinity_target_still_eligible).toBe(true);
  });
  it('drops a sticky target after entitlement revocation', () => {
    const ids = ['alpha', 'beta']; const registry = createEntitlementRegistry(ids.map(entitlement)); const planner = makePlanner(ids, registry); let n = 0;
    const router = createExecutionRouter({ planner, bindingService: createExecutionBindingService({ clock: () => NOW, idFactory: () => String(++n) }), reliabilitySource: t => t.provider_id === 'alpha' ? 1 : 0, clock: () => NOW, idFactory: String });
    const scope = { workspace_id: 'ws-1', agent_id: 'agent-1' }; const first = router.route({ planning_request: planningRequest(), binding_request: bindingRequest(), affinity_scope: scope });
    registry.register(entitlement('alpha', { state: 'revoked' })); const second = router.route({ planning_request: planningRequest(), binding_request: bindingRequest(), affinity_scope: scope });
    expect(first.binding.provider_id).toBe('alpha'); expect(second.binding.provider_id).toBe('beta'); expect(second.decision.affinity_target_still_eligible).toBe(false);
  });
  it('states affinity is not a memory-validity signal', () => {
    const { decision } = harness({ providers: ['alpha'] }).router.route({ planning_request: planningRequest(), binding_request: bindingRequest(), affinity_scope: { workspace_id: 'ws-1' } });
    expect(decision.affinity_is_optimization_only).toBe(true); expect(decision.schema).toBe('govibe-scheduler-decision/v1');
  });
  it('builds a stable affinity key', () => expect(affinityKeyOf({ workspace_id: 'ws-1', model_family: 'chat' })).toBe('workspace_id=ws-1|project_id=*|agent_id=*|workflow_id=*|provider_id=*|model_family=chat'));
});

describe('governed failover', () => {
  const first = r => r.route({ planning_request: planningRequest(), binding_request: bindingRequest() });
  const rebind = (id, extra = {}) => ({ rebind_request_id: 'rb-1', previous_binding_id: id, context_id: 'ctx-1', context_hash: 'hash-1', failure_code: 'PROVIDER_RATE_LIMITED', fallback_policy_id: 'fallback-1', ...extra });
  it('creates a new binding and preserves context lineage', () => {
    const { router } = harness(); const a = first(router); const b = router.rebind({ rebind_request: rebind(a.binding.binding_id), planning_request: planningRequest(), binding_request: bindingRequest({ binding_request_id: 'br-2' }), previous_binding: a.binding });
    expect(b.binding.binding_id).not.toBe(a.binding.binding_id); expect(b.binding.provider_id).not.toBe(a.binding.provider_id); expect(b.binding.context_hash).toBe(a.binding.context_hash); expect(b.decision.reason).toBe('FAILOVER_REBIND');
  });
  it('re-evaluates entitlement policy for fallback', () => {
    const ids = ['alpha', 'beta']; const registry = createEntitlementRegistry(ids.map(entitlement)); const planner = makePlanner(ids, registry); let n = 0;
    const router = createExecutionRouter({ planner, bindingService: createExecutionBindingService({ clock: () => NOW, idFactory: () => String(++n) }), clock: () => NOW, idFactory: String }); const a = first(router);
    registry.register(entitlement(a.binding.provider_id === 'alpha' ? 'beta' : 'alpha', { state: 'revoked' }));
    expect(() => router.rebind({ rebind_request: rebind(a.binding.binding_id), planning_request: planningRequest(), binding_request: bindingRequest({ binding_request_id: 'br-2' }), previous_binding: a.binding })).toThrowError(expect.objectContaining({ code: 'NO_AUTHORIZED_ENTITLEMENT' }));
  });
  it('refuses changed context', () => {
    const { router } = harness(); const a = first(router); for (const delta of [{ context_hash: 'hash-2' }, { context_id: 'ctx-2' }]) expect(() => router.rebind({ rebind_request: rebind(a.binding.binding_id, delta), planning_request: planningRequest(), binding_request: bindingRequest({ binding_request_id: 'br-2' }), previous_binding: a.binding })).toThrowError(expect.objectContaining({ code: 'CONTEXT_LINEAGE_CHANGED' }));
  });
  it('refuses a different previous binding id', () => {
    const { router } = harness(); const a = first(router); expect(() => router.rebind({ rebind_request: rebind('bind_elsewhere'), planning_request: planningRequest(), binding_request: bindingRequest({ binding_request_id: 'br-2' }), previous_binding: a.binding })).toThrowError(expect.objectContaining({ code: 'PREVIOUS_BINDING_MISMATCH' }));
  });
  it('reports provider and model downgrade', () => {
    const { router } = harness({ descriptors: [descriptor('alpha'), descriptor('beta', { usage_visibility: 'rate-limit-only', models: [{ model_id: 'beta-model', capabilities: ['chat'], context_limit_tokens: 8000, supports_tools: true }] })], reliabilitySource: t => t.provider_id === 'alpha' ? 1 : 0 });
    const a = first(router); const b = router.rebind({ rebind_request: rebind(a.binding.binding_id, { failure_code: 'PROVIDER_UNAVAILABLE' }), planning_request: planningRequest(), binding_request: bindingRequest({ binding_request_id: 'br-2' }), previous_binding: a.binding });
    expect(a.binding.provider_id).toBe('alpha'); expect(b.binding.provider_id).toBe('beta'); expect(b.decision.downgrades).toContainEqual({ kind: 'provider', from: 'alpha', to: 'beta' }); expect(b.decision.downgrades).toContainEqual({ kind: 'model', from: 'alpha-model', to: 'beta-model' });
  });
  it('rejects unsupported or malformed rebind schema', () => {
    expect(() => normalizeRebindRequest({ schema: 'govibe-execution-rebind-request/v2' })).toThrowError(expect.objectContaining({ code: 'REBIND_SCHEMA_UNSUPPORTED' }));
    expect(() => normalizeRebindRequest({ rebind_request_id: 'rb-1' })).toThrowError(expect.objectContaining({ code: 'INVALID_REBIND_REQUEST' }));
  });
});

describe('scheduler decision evidence', () => {
  it('records candidates with score components and reasons', () => {
    const { router } = harness({ quotaSource: () => ({ visibility: 'rate-limit-only' }) }); router.route({ planning_request: planningRequest(), binding_request: bindingRequest() }); const [d] = router.decisions();
    expect(d.candidates).toHaveLength(2); for (const c of d.candidates) { expect(c).toMatchObject({ quota_signal: 'unknown', quota_reason: 'UNKNOWN_QUOTA_SEMANTICS' }); expect(Object.keys(c.components).sort()).toEqual(['affinity', 'capability_fit', 'queue', 'quota', 'reliability']); }
    expect(d.decided_at).toBe(NOW.toISOString()); expect(Object.isFrozen(d)).toBe(true);
  });
  it('keeps one decision per attempt including failures', () => {
    const { router } = harness({ providers: ['alpha'] }); router.route({ planning_request: planningRequest(), binding_request: bindingRequest() }); expect(() => router.route({ planning_request: planningRequest(), binding_request: bindingRequest(), exclude_targets: ['alpha'] })).toThrow();
    expect(router.decisions().map(d => d.outcome)).toEqual(['SELECTED', 'NO_ELIGIBLE_TARGET']);
  });
  it('requires a planner and binding service', () => {
    expect(() => createExecutionRouter({})).toThrowError(expect.objectContaining({ code: 'INVALID_ROUTER_CONFIGURATION' })); expect(() => createExecutionRouter({ planner: { plan() {} } })).toThrowError(expect.objectContaining({ code: 'INVALID_ROUTER_CONFIGURATION' }));
  });
});
