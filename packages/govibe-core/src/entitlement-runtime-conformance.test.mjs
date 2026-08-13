/**
 * Conformance suite for issue #64.
 *
 * These tests exercise the entitlement runtime end to end: planning, routing,
 * binding, adapter dispatch and usage accounting wired together, rather than one
 * module at a time. Passing this suite is a prerequisite for the #64 gate, not
 * the gate itself.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCredentialVault, createInMemorySecretBackend } from './credential-vault.mjs';
import { createEntitlementUsageLedger } from './entitlement-usage-ledger.mjs';
import { createExecutionBindingService } from './execution-binding-service.mjs';
import { createExecutionCapabilityPlanner } from './execution-capability-planner.mjs';
import { createExecutionRouter } from './execution-router.mjs';
import { createExecutorRegistry } from './executor-adapter.mjs';
import { createProviderAdapterHost } from './provider-adapter-host.mjs';
import { createLocalComputeAdapter, createSubscriptionCliAdapter } from './provider-adapters.mjs';
import { createProviderCompatibilityRegistry } from './provider-compatibility-registry.mjs';
import { createEntitlementRegistry, createProviderCapabilityRegistry } from './provider-entitlement-registry.mjs';

const NOW = new Date('2026-08-04T00:00:00.000Z');
const SECRET = 'conformance-fixture-value';
const SOURCE_HASH = 'a'.repeat(64);

const IDENTITY = Object.freeze({
  taskId: 'task-1', agentId: 'agent-1', workspaceId: 'ws-1', runId: 'run-1', sessionId: 'session-1', turnId: 'turn-1',
});

function contextAuthority() {
  return {
    schemaVersion: 'govibe-context-authority/v1',
    identity: { ...IDENTITY },
    lineage: { contextId: 'ctx-1', cacheId: 'cache-1' },
    unresolvedAssumptions: [],
    traversal: { relationAllowlist: ['contains'], retrievalRadius: 1, inclusions: [], exclusions: [] },
    sources: [{ id: 'doc-1', version: '1', hash: SOURCE_HASH }],
    budget: { maxTokens: 4096 },
    knowledgeRefs: ['gks:doc-1'],
    requiredReasonRefs: ['policy:reason:1'],
  };
}

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
    observed_at: NOW.toISOString(),
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
    credential_ref: `cred-${providerId}`,
    valid_from: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function compatibilityRecord(providerId) {
  return {
    record_id: `compat-${providerId}-owner-v1`,
    schema_version: 'govibe-provider-entitlement-compatibility/v1',
    version: '1.0.0',
    provider: providerId,
    product: `${providerId}-conformance-product`,
    plan: 'conformance-plan',
    execution_surface: 'cli',
    entitlement_type: 'api',
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
    allowed_adapter_ids: [`adapter-${providerId}`],
    quota_visibility: { token_usage: 'provider_reported', remaining_quota: 'provider_reported' },
    cache_visibility: { prompt_cache: 'unknown', provider_session: 'unknown' },
    evidence_refs: [`internal:conformance-${providerId}-policy`],
    evidence_hashes: [`sha256:conformance-${providerId}-policy-v1`],
    reviewer: 'conformance-fixture',
    approval_state: 'approved_owner_only',
    approved_date: '2026-08-01T00:00:00.000Z',
    expiry_date: '2027-08-01T00:00:00.000Z',
    next_review_date: '2027-02-01T00:00:00.000Z',
    restrictions: [],
    fail_closed_reasons: [],
  };
}

function adapterPolicy(providerId) {
  return {
    schema: 'govibe-provider-adapter-policy/v1',
    provider_id: providerId,
    adapter_id: `adapter-${providerId}`,
    adapter_version: '1.0.0',
    entitlement_types: ['api'],
    allowed_executor_classes: ['api-llm'],
    approval_state: 'approved',
    approved_by: 'conformance-fixture',
    approved_at: NOW.toISOString(),
    policy_ref: 'docs/security/POLICY-Provider-Adapter-Enablement.md',
  };
}

function planningRequest(overrides = {}) {
  return {
    request_id: 'req-1', actor_id: 'user-1', organization_id: 'org-1', workspace_id: IDENTITY.workspaceId,
    project_id: 'proj-1', task_id: IDENTITY.taskId, agent_id: IDENTITY.agentId, executor_class: 'api-llm',
    required_capabilities: ['chat'], required_tools: [], data_classification: 'internal',
    tool_contract_hash: 'tools-1', context_integrity_valid: true, ...overrides,
  };
}

function persistedContext() {
  return Object.freeze({
    context_id: 'ctx-1', cache_id: 'cache-1', context_hash: 'hash-1', source_manifest_hash: 'manifest-1',
    context_profile: 'T-ctx', tool_contract_hash: 'tools-1', persisted: true,
  });
}

function bindingRequest(overrides = {}) {
  return {
    binding_request_id: 'br-1', actor_id: 'user-1', organization_id: 'org-1', workspace_id: IDENTITY.workspaceId,
    project_id: 'proj-1', task_id: IDENTITY.taskId, agent_id: IDENTITY.agentId, run_id: IDENTITY.runId,
    session_id: IDENTITY.sessionId, turn_id: IDENTITY.turnId, context: persistedContext(), ...overrides,
  };
}

function runtime({ providers = ['alpha', 'beta'], descriptors = null, entitlements = null, adapters = null, withCredentials = false } = {}) {
  const capabilityRegistry = createProviderCapabilityRegistry(descriptors ?? providers.map((id) => descriptor(id)));
  const entitlementRegistry = createEntitlementRegistry(entitlements ?? providers.map((id) => entitlement(id)));
  const compatibilityRegistry = createProviderCompatibilityRegistry(providers.map((id) => compatibilityRecord(id)));

  let bindingCounter = 0;
  const bindingService = createExecutionBindingService({
    clock: () => NOW,
    idFactory: () => { bindingCounter += 1; return String(bindingCounter); },
  });

  const planner = createExecutionCapabilityPlanner({ capabilityRegistry, entitlementRegistry, compatibilityRegistry, clock: () => NOW });
  const router = createExecutionRouter({ planner, bindingService, clock: () => NOW, idFactory: (n) => String(n) });

  let grantCounter = 0;
  const credentialVault = createCredentialVault({
    backend: createInMemorySecretBackend(),
    clock: () => NOW,
    idFactory: () => { grantCounter += 1; return String(grantCounter); },
  });
  if (withCredentials) {
    for (const id of providers) {
      credentialVault.registerCredential({
        credential_ref: `cred-${id}`, entitlement_id: `ent-${id}`, owner_id: 'user-1', provider_id: id, secret: SECRET,
      });
    }
  }

  const defaultAdapters = Object.fromEntries(providers.map((id) => [
    id,
    createSubscriptionCliAdapter({ providerId: id, run: async () => ({ artifacts: [`${id}-out.txt`] }) }),
  ]));
  const executorRegistry = createExecutorRegistry(adapters ?? defaultAdapters, {
    credentialVault, bindingService, compatibilityRegistry, clock: () => NOW,
  });
  const adapterHost = createProviderAdapterHost({
    executorRegistry,
    capabilityRegistry,
    policyRecords: providers.map(adapterPolicy),
    clock: () => NOW,
    idFactory: (n) => String(n),
  });

  const ledger = createEntitlementUsageLedger({ capabilityRegistry, clock: () => NOW });
  return { capabilityRegistry, entitlementRegistry, compatibilityRegistry, bindingService, planner, router, credentialVault, executorRegistry, adapterHost, ledger };
}

function dispatchRequest(binding, overrides = {}) {
  return {
    actor_id: 'user-1', run_id: IDENTITY.runId, contextAuthority: contextAuthority(), policyDecision: 'allow',
    contextLineage: { runId: IDENTITY.runId, sessionId: IDENTITY.sessionId, turnId: IDENTITY.turnId },
    executionBinding: binding, ...overrides,
  };
}

async function endToEnd(rt, { affinityScope = null } = {}) {
  const { binding, decision } = rt.router.route({
    planning_request: planningRequest(), binding_request: bindingRequest(), affinity_scope: affinityScope,
  });
  const runResult = await rt.adapterHost.execute(binding.provider_id, dispatchRequest(binding));
  const usage = rt.adapterHost.usageFor(runResult);

  const event = rt.ledger.record({
    organization_id: binding.organization_id,
    user_id: binding.actor_id,
    workspace_id: binding.workspace_id,
    project_id: binding.project_id,
    task_id: binding.task_id,
    run_id: binding.run_id,
    binding_id: binding.binding_id,
    provider_id: binding.provider_id,
    entitlement_id: binding.entitlement_id,
    entitlement_type: 'api',
    model_id: binding.model_id,
    reported_usage: { unit: usage.reported_usage.unit, request_count: usage.reported_usage.request_count },
    not_applicable_fields: usage.not_applicable_fields,
    routing: { attempt: 1, fallback_used: false },
    outcome: { status: runResult.status, duration_ms: null },
  });
  return { binding, decision, runResult, usage, event };
}

describe('#64 conformance: end-to-end run from persisted context to candidate result', () => {
  it('carries one identity chain from planning through binding, dispatch and accounting', async () => {
    const { binding, runResult, event } = await endToEnd(runtime());
    expect(binding.context_id).toBe('ctx-1');
    expect(runResult.status).toBe('completed');
    expect(runResult.binding_id).toBe(binding.binding_id);
    expect(runResult.candidate.provider_id).toBe(binding.provider_id);
    expect(runResult.candidate.artifacts).toEqual([`${binding.provider_id}-out.txt`]);
    expect(event.binding_id).toBe(binding.binding_id);
    expect(event.run_id).toBe(binding.run_id);
    expect(event.outcome.status).toBe('completed');
  });

  it('produces a candidate, never canonical knowledge', async () => {
    const { runResult } = await endToEnd(runtime());
    expect(runResult.candidate.schema).toBe('govibe-provider-candidate/v1');
    expect(JSON.stringify(runResult.candidate)).not.toMatch(/gks:/);
  });
});

describe('#64 conformance: API-008 schema contracts', () => {
  it('emits exactly the govibe-provider-run-result/v1 field set', async () => {
    const { runResult } = await endToEnd(runtime());
    expect(Object.keys(runResult).sort()).toEqual([
      'binding_id', 'candidate', 'completed_at', 'normalized_errors', 'provider_request_id',
      'provider_session_id', 'provider_usage', 'retryable', 'run_result_id', 'schema', 'started_at', 'status',
    ]);
  });

  it('emits exactly the govibe-provider-candidate/v1 field set', async () => {
    const { runResult } = await endToEnd(runtime());
    expect(Object.keys(runResult.candidate).sort()).toEqual([
      'artifacts', 'assumptions', 'provider_id', 'provider_version', 'relation_candidates',
      'request_id', 'requested_scope', 'schema', 'source_manifest', 'verification_hints',
    ]);
  });

  it('emits exactly the govibe-entitlement-usage-event/v1 field set', async () => {
    const { event } = await endToEnd(runtime());
    expect(Object.keys(event).sort()).toEqual([
      'affinity', 'binding_id', 'entitlement_id', 'entitlement_type', 'estimated_usage', 'event_id',
      'model_id', 'not_applicable_fields', 'organization_id', 'outcome', 'project_id', 'provider_id', 'recorded_at',
      'reported_usage', 'routing', 'run_id', 'schema', 'task_id', 'unknown_fields', 'user_id', 'workspace_id',
    ]);
  });

  it('emits exactly the govibe-entitlement-quota-snapshot/v1 field set', () => {
    const rt = runtime();
    const snapshot = rt.ledger.recordQuotaSnapshot({
      entitlement_id: 'ent-alpha', provider_id: 'alpha', source: 'provider', reported: { remaining: 100, unit: 'token' },
    });
    expect(Object.keys(snapshot).sort()).toEqual([
      'entitlement_id', 'estimated', 'observed_at', 'observed_rate_limit', 'provider_id',
      'quota_snapshot_id', 'reported', 'schema', 'source', 'visibility',
    ]);
  });
});

describe('#64 conformance: no adapter path to GKS or GenesisBlockDB', () => {
  it('reaches no knowledge or database service from any entitlement runtime module', () => {
    const modules = [
      'provider-entitlement-registry.mjs', 'provider-compatibility-registry.mjs', 'credential-vault.mjs',
      'provider-session-registry.mjs', 'execution-capability-planner.mjs', 'execution-binding-service.mjs',
      'entitlement-usage-ledger.mjs', 'provider-adapter-host.mjs', 'provider-adapters.mjs', 'execution-router.mjs',
    ];
    for (const file of modules) {
      const source = readFileSync(path.resolve('packages/govibe-core/src', file), 'utf8');
      expect(source, file).not.toMatch(/from ['"].*gks-client/i);
      expect(source, file).not.toMatch(/from ['"].*msp-client/i);
      expect(source, file).not.toMatch(/from ['"].*canonical-materialization/i);
      expect(source, file).not.toMatch(/genesisblockdb/i);
    }
  });

  it('exposes no promotion surface on any runtime component', () => {
    const rt = runtime();
    for (const [name, component] of Object.entries(rt)) {
      const surface = Object.keys(component ?? {});
      expect(surface.some((key) => /promote|gks|genesis/i.test(key)), name).toBe(false);
    }
  });
});

describe('#64 conformance: the router cannot alter MSP context content or hash', () => {
  it('preserves context identity and hash across routing, binding and failover', async () => {
    const rt = runtime();
    const context = persistedContext();
    const first = rt.router.route({ planning_request: planningRequest(), binding_request: bindingRequest({ context }) });
    const rebound = rt.router.rebind({
      rebind_request: {
        rebind_request_id: 'rb-1', previous_binding_id: first.binding.binding_id, context_id: context.context_id,
        context_hash: context.context_hash, failure_code: 'PROVIDER_RATE_LIMITED', fallback_policy_id: 'fallback-1',
      },
      planning_request: planningRequest(),
      binding_request: bindingRequest({ binding_request_id: 'br-2', context }),
      previous_binding: first.binding,
    });
    for (const field of ['context_id', 'cache_id', 'context_hash', 'source_manifest_hash', 'context_profile', 'tool_contract_hash']) {
      expect(rebound.binding[field], field).toBe(first.binding[field]);
    }
    expect(rebound.binding.binding_id).not.toBe(first.binding.binding_id);
    expect(context).toEqual(persistedContext());
  });

  it('refuses to rebind changed context instead of rewriting lineage', () => {
    const rt = runtime();
    const first = rt.router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });
    expect(() => rt.router.rebind({
      rebind_request: {
        rebind_request_id: 'rb-1', previous_binding_id: first.binding.binding_id, context_id: 'ctx-1', context_hash: 'hash-2',
        failure_code: 'PROVIDER_UNAVAILABLE', fallback_policy_id: 'fallback-1',
      },
      planning_request: planningRequest(), binding_request: bindingRequest({ binding_request_id: 'br-2' }), previous_binding: first.binding,
    })).toThrowError(expect.objectContaining({ code: 'CONTEXT_LINEAGE_CHANGED' }));
  });
});

describe('#64 conformance: credential material never escapes the vault boundary', () => {
  it('is absent from the binding, run result, candidate, usage event and scheduler decision', async () => {
    const rt = runtime({ withCredentials: true });
    const { binding } = rt.router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });
    const grant = rt.credentialVault.issueGrant({
      credential_ref: `cred-${binding.provider_id}`, entitlement_id: binding.entitlement_id, principal_id: binding.principal_id,
      run_id: binding.run_id, binding_id: binding.binding_id, provider_id: binding.provider_id,
    });

    let secretSeenByAdapter = null;
    const rt2 = runtime({
      withCredentials: true,
      adapters: {
        alpha: {
          capabilities: ['api-llm'],
          async execute(request, context) {
            secretSeenByAdapter = context.credential;
            return {
              schema: 'govibe-provider-run-result/v1', binding_id: context.executionBinding.binding_id, status: 'completed',
              candidate: { provider_id: 'alpha', request_id: context.executionBinding.binding_id },
              provider_usage: { unit: 'request', request_count: 1 }, normalized_errors: [], retryable: false,
            };
          },
          async cancel() {},
        },
      },
      providers: ['alpha'],
    });

    const bound = rt2.router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });
    const grant2 = rt2.credentialVault.issueGrant({
      credential_ref: 'cred-alpha', entitlement_id: bound.binding.entitlement_id, principal_id: bound.binding.principal_id,
      run_id: bound.binding.run_id, binding_id: bound.binding.binding_id, provider_id: 'alpha',
    });
    const runResult = await rt2.adapterHost.execute('alpha', dispatchRequest({ ...bound.binding, credential_grant_id: grant2.grant_id }));
    const event = rt2.ledger.record({
      organization_id: bound.binding.organization_id, user_id: bound.binding.actor_id, workspace_id: bound.binding.workspace_id,
      task_id: bound.binding.task_id, run_id: bound.binding.run_id, binding_id: bound.binding.binding_id, provider_id: 'alpha',
      entitlement_id: bound.binding.entitlement_id, entitlement_type: 'api', model_id: bound.binding.model_id,
      reported_usage: { unit: 'request', request_count: 1 }, outcome: { status: 'completed', duration_ms: null },
    });

    expect(secretSeenByAdapter).toBeInstanceOf(Uint8Array);
    for (const [label, value] of [
      ['binding', bound.binding], ['run result', runResult], ['candidate', runResult.candidate], ['usage event', event],
      ['scheduler decision', bound.decision], ['vault inspection', rt2.credentialVault.inspect()], ['grant', grant],
    ]) {
      expect(JSON.stringify(value), label).not.toContain(SECRET);
      expect(JSON.stringify(value), label).not.toMatch(/"(api_key|access_token|refresh_token|secret|password)"/);
    }
  });

  it('wipes the secret buffer after the adapter returns', async () => {
    let captured = null;
    const rt = runtime({
      providers: ['alpha'],
      withCredentials: true,
      adapters: {
        alpha: {
          capabilities: ['api-llm'],
          async execute(request, context) {
            captured = context.credential;
            return {
              schema: 'govibe-provider-run-result/v1', binding_id: context.executionBinding.binding_id, status: 'completed',
              candidate: { provider_id: 'alpha', request_id: context.executionBinding.binding_id }, provider_usage: {},
              normalized_errors: [], retryable: false,
            };
          },
          async cancel() {},
        },
      },
    });
    const { binding } = rt.router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });
    const grant = rt.credentialVault.issueGrant({
      credential_ref: 'cred-alpha', entitlement_id: binding.entitlement_id, principal_id: binding.principal_id,
      run_id: binding.run_id, binding_id: binding.binding_id, provider_id: 'alpha',
    });
    await rt.adapterHost.execute('alpha', dispatchRequest({ ...binding, credential_grant_id: grant.grant_id }));
    expect(captured.every((byte) => byte === 0)).toBe(true);
  });
});

describe('#64 conformance: unauthorized and revoked entitlements fail closed', () => {
  it('refuses to plan for a revoked entitlement', () => {
    const rt = runtime({ providers: ['alpha'], entitlements: [entitlement('alpha', { state: 'revoked' })] });
    expect(() => rt.router.route({ planning_request: planningRequest(), binding_request: bindingRequest() }))
      .toThrowError(expect.objectContaining({ code: 'NO_AUTHORIZED_ENTITLEMENT' }));
  });

  it('refuses to plan for another principal against an owner-only entitlement', () => {
    const rt = runtime({ providers: ['alpha'] });
    expect(() => rt.router.route({ planning_request: planningRequest({ actor_id: 'user-2' }), binding_request: bindingRequest({ actor_id: 'user-2' }) }))
      .toThrowError(expect.objectContaining({ code: 'NO_AUTHORIZED_ENTITLEMENT' }));
  });

  it('refuses to bind an unpersisted context packet', () => {
    const rt = runtime({ providers: ['alpha'] });
    expect(() => rt.router.route({ planning_request: planningRequest(), binding_request: bindingRequest({ context: { ...persistedContext(), persisted: false } }) }))
      .toThrowError(expect.objectContaining({ code: 'CONTEXT_PACKET_NOT_PERSISTED' }));
  });

  it('refuses to dispatch a provider whose adapter policy is not approved', async () => {
    const rt = runtime({ providers: ['alpha'] });
    const host = createProviderAdapterHost({ executorRegistry: rt.executorRegistry, capabilityRegistry: rt.capabilityRegistry, policyRecords: [], clock: () => NOW });
    const { binding } = rt.router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });
    await expect(host.execute('alpha', dispatchRequest(binding))).rejects.toThrowError(expect.objectContaining({ code: 'ADAPTER_POLICY_MISSING' }));
  });

  it('refuses to dispatch when the policy decision is not allow', async () => {
    const rt = runtime({ providers: ['alpha'] });
    const { binding } = rt.router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });
    await expect(rt.adapterHost.execute('alpha', dispatchRequest(binding, { policyDecision: 'deny' }))).rejects.toThrowError(expect.objectContaining({ code: 'dispatch_denied' }));
  });
});

describe('#64 conformance: reported and estimated usage never merge', () => {
  it('keeps the two buckets separate through aggregation', async () => {
    const rt = runtime({ providers: ['alpha'] });
    const { binding } = rt.router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });
    const base = {
      organization_id: binding.organization_id, user_id: binding.actor_id, workspace_id: binding.workspace_id,
      task_id: binding.task_id, run_id: binding.run_id, binding_id: binding.binding_id, provider_id: 'alpha',
      entitlement_id: binding.entitlement_id, entitlement_type: 'api', model_id: binding.model_id,
      outcome: { status: 'completed', duration_ms: null },
    };
    rt.ledger.record({ ...base, reported_usage: { unit: 'token', input_tokens: 100 }, estimated_usage: { method: 'char-count/v1', input_tokens: 90, confidence: 0.6 } });
    rt.ledger.record({ ...base, run_id: 'run-2', estimated_usage: { method: 'char-count/v1', input_tokens: 40, confidence: 0.4 } });
    const [group] = rt.ledger.aggregate({ by: ['entitlement_id'] });
    expect(group.reported.input_tokens).toBe(100);
    expect(group.reported.coverage.input_tokens).toBe(1);
    expect(group.estimated.input_tokens).toBe(130);
    expect(group.estimated.coverage.input_tokens).toBe(2);
    expect(group.event_count).toBe(2);
  });

  it('keeps partial and unknown telemetry unknown rather than zero', async () => {
    const rt = runtime({
      providers: ['throttled'],
      descriptors: [descriptor('throttled', { usage_visibility: 'rate-limit-only', token_usage_reported: false, cached_token_usage_reported: false, remaining_quota_reported: false })],
      entitlements: [entitlement('throttled')],
    });
    const { runResult, event, usage } = await endToEnd(rt);
    expect(runResult.status).toBe('completed');
    expect(usage.visibility).toBe('rate-limit-only');
    expect(event.reported_usage.input_tokens).toBeNull();
    expect(event.unknown_fields).toContain('input_tokens');
    expect(event.unknown_fields).toContain('cached_input_tokens');
    expect(() => rt.ledger.recordQuotaSnapshot({ entitlement_id: 'ent-throttled', provider_id: 'throttled', reported: { remaining: 25, unit: 'request' } }))
      .toThrowError(expect.objectContaining({ code: 'USAGE_SEMANTICS_UNKNOWN' }));
  });
});

describe('#64 conformance: failover preserves context and creates a new binding', () => {
  it('rebinds to a different provider under a rate limit and records the decision chain', async () => {
    const rt = runtime();
    const first = rt.router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });
    const rebound = rt.router.rebind({
      rebind_request: {
        rebind_request_id: 'rb-1', previous_binding_id: first.binding.binding_id, context_id: 'ctx-1', context_hash: 'hash-1',
        failure_code: 'PROVIDER_RATE_LIMITED', fallback_policy_id: 'fallback-1',
      },
      planning_request: planningRequest(), binding_request: bindingRequest({ binding_request_id: 'br-2' }), previous_binding: first.binding,
    });
    expect(rebound.binding.provider_id).not.toBe(first.binding.provider_id);
    expect(rebound.binding.binding_id).not.toBe(first.binding.binding_id);
    expect(rebound.decision.failure_code).toBe('PROVIDER_RATE_LIMITED');
    expect(rebound.binding.policy_decision_refs).toContain(`scheduler:${rebound.decision.decision_id}`);
    expect(rebound.binding.policy_decision_refs).toContain('rebind:rb-1');
    const runResult = await rt.adapterHost.execute(rebound.binding.provider_id, dispatchRequest(rebound.binding));
    expect(runResult.status).toBe('completed');
    expect(runResult.binding_id).toBe(rebound.binding.binding_id);
  });

  it('has no fallback left when the alternative entitlement is revoked', () => {
    const rt = runtime();
    const first = rt.router.route({ planning_request: planningRequest(), binding_request: bindingRequest() });
    const fallback = first.binding.provider_id === 'alpha' ? 'beta' : 'alpha';
    rt.entitlementRegistry.register(entitlement(fallback, { state: 'revoked' }));
    expect(() => rt.router.rebind({
      rebind_request: {
        rebind_request_id: 'rb-1', previous_binding_id: first.binding.binding_id, context_id: 'ctx-1', context_hash: 'hash-1',
        failure_code: 'PROVIDER_UNAVAILABLE', fallback_policy_id: 'fallback-1',
      },
      planning_request: planningRequest(), binding_request: bindingRequest({ binding_request_id: 'br-2' }), previous_binding: first.binding,
    })).toThrowError(expect.objectContaining({ code: 'NO_AUTHORIZED_ENTITLEMENT' }));
  });
});

describe('#64 gate status', () => {
  it('does not by itself constitute the conformance gate', () => {
    const evidence = readFileSync(path.resolve('docs/assurance/audit/EVIDENCE-Provider-Entitlement-Runtime-Conformance.md'), 'utf8');
    expect(evidence).toMatch(/review_state:\s*"?pending"?/);
    expect(evidence).toMatch(/Not covered/);
  });
});
