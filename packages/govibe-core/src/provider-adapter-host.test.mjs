import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createExecutorRegistry } from './executor-adapter.mjs';
import {
  createProviderAdapterHost,
  extractProviderUsage,
  normalizeAdapterFailure,
  normalizeAdapterPolicyRecord,
  normalizeProviderCandidate,
  normalizeProviderRunResult,
} from './provider-adapter-host.mjs';
import { createLocalComputeAdapter, createSubscriptionCliAdapter, ProviderInvocationError } from './provider-adapters.mjs';
import { createProviderCapabilityRegistry } from './provider-entitlement-registry.mjs';
import { createEntitlementUsageLedger } from './entitlement-usage-ledger.mjs';

function contextAuthority() {
  return {
    schemaVersion: 'govibe-context-authority/v1',
    identity: { taskId: 'task-1', agentId: 'agent-1', workspaceId: 'ws-1', runId: 'run-1', sessionId: 'session-1', turnId: 'turn-1' },
    lineage: { contextId: 'context-1', cacheId: 'cache-1' },
    unresolvedAssumptions: [],
    traversal: { relationAllowlist: ['contains'], retrievalRadius: 1, inclusions: [], exclusions: [] },
    sources: [{ id: 'doc-1', version: '1', hash: 'a'.repeat(64) }],
    budget: { maxTokens: 512 },
    knowledgeRefs: ['gks:doc-1'],
    requiredReasonRefs: ['policy:reason:1'],
  };
}

function governedRequest(providerId, overrides = {}) {
  return {
    actor_id: 'user-1',
    run_id: 'run-1',
    contextAuthority: contextAuthority(),
    policyDecision: 'allow',
    contextLineage: { runId: 'run-1', sessionId: 'session-1', turnId: 'turn-1' },
    executionBinding: {
      schema: 'govibe-execution-binding/v1',
      binding_id: 'binding-1',
      actor_id: 'user-1',
      principal_id: 'user-1',
      workspace_id: 'ws-1',
      task_id: 'task-1',
      agent_id: 'agent-1',
      run_id: 'run-1',
      session_id: 'session-1',
      turn_id: 'turn-1',
      context_id: 'context-1',
      cache_id: 'cache-1',
      provider_id: providerId,
      entitlement_id: 'ent-1',
      credential_grant_id: null,
      provider_session_id: null,
    },
    ...overrides,
  };
}

function descriptor(overrides = {}) {
  return {
    schema: 'govibe-provider-capability-descriptor/v1',
    provider_id: 'local',
    adapter_id: 'adapter-local',
    adapter_version: '1.0.0',
    executor_classes: ['local-llm'],
    entitlement_types: ['local_compute'],
    usage_visibility: 'partial',
    token_usage_reported: false,
    cached_token_usage_reported: false,
    remaining_quota_reported: false,
    rate_limit_detectable: false,
    observed_at: '2026-08-04T00:00:00.000Z',
    ...overrides,
  };
}

function policy(overrides = {}) {
  return {
    schema: 'govibe-provider-adapter-policy/v1',
    provider_id: 'local',
    adapter_id: 'adapter-local',
    adapter_version: '1.0.0',
    entitlement_types: ['local_compute'],
    allowed_executor_classes: ['local-llm'],
    approval_state: 'approved',
    approved_by: 'Boss',
    approved_at: '2026-08-04T00:00:00.000Z',
    policy_ref: 'docs/security/POLICY-Provider-Adapter-Enablement.md#local',
    ...overrides,
  };
}

function host({ adapters, policies = [policy(), policy({ provider_id: 'codex', adapter_id: 'adapter-codex', entitlement_types: ['personal_subscription'], allowed_executor_classes: ['external-agent'], policy_ref: 'docs/security/POLICY-Provider-Adapter-Enablement.md#codex' })], capabilities } = {}) {
  return createProviderAdapterHost({
    executorRegistry: createExecutorRegistry(adapters ?? {}),
    capabilityRegistry: createProviderCapabilityRegistry(capabilities ?? [
      descriptor(),
      descriptor({ provider_id: 'codex', adapter_id: 'adapter-codex', executor_classes: ['external-agent'], entitlement_types: ['personal_subscription'], usage_visibility: 'rate-limit-only', rate_limit_detectable: true }),
    ]),
    policyRecords: policies,
    clock: () => new Date('2026-08-04T00:00:00.000Z'),
  });
}

describe('provider adapter policy gate', () => {
  it('refuses to dispatch a provider with no adapter policy record', async () => {
    const instance = host({ adapters: { crewai: createLocalComputeAdapter({ providerId: 'crewai', run: async () => ({}) }) } });
    await expect(instance.execute('crewai', governedRequest('crewai'))).rejects.toThrowError(
      expect.objectContaining({ code: 'ADAPTER_POLICY_MISSING' }),
    );
  });

  it('refuses to dispatch a pending or denied adapter policy', async () => {
    const instance = host({
      adapters: { local: createLocalComputeAdapter({ run: async () => ({}) }) },
      policies: [policy({ approval_state: 'pending', approved_by: null, approved_at: null })],
    });
    await expect(instance.execute('local', governedRequest('local'))).rejects.toThrowError(
      expect.objectContaining({ code: 'ADAPTER_POLICY_NOT_APPROVED' }),
    );
  });

  it('refuses to dispatch without a provider capability descriptor', async () => {
    const instance = host({
      adapters: { local: createLocalComputeAdapter({ run: async () => ({}) }) },
      capabilities: [],
    });
    await expect(instance.execute('local', governedRequest('local'))).rejects.toThrowError(
      expect.objectContaining({ code: 'PROVIDER_DESCRIPTOR_MISSING' }),
    );
  });

  it('rejects an approved policy record with no approver and any cross-user reuse', () => {
    expect(() => normalizeAdapterPolicyRecord(policy({ approved_by: null }))).toThrowError(
      expect.objectContaining({ code: 'ADAPTER_POLICY_INVALID' }),
    );
    expect(() => normalizeAdapterPolicyRecord(policy({ cross_user_session_reuse: true }))).toThrowError(
      expect.objectContaining({ code: 'ADAPTER_POLICY_CROSS_USER_DENIED' }),
    );
  });

  it('reports enablement and blocking reasons without dispatching', () => {
    const rows = host({ adapters: { local: createLocalComputeAdapter({ run: async () => ({}) }) } }).inspect();
    const byId = Object.fromEntries(rows.map((row) => [row.provider_id, row]));

    expect(byId.local).toMatchObject({ enabled: true, blocked_reason: null, approval_state: 'approved', usage_visibility: 'partial' });
    expect(byId.codex).toMatchObject({ enabled: false, blocked_reason: 'ADAPTER_UNAVAILABLE', adapter_available: false });
    expect(byId.crewai).toMatchObject({ enabled: false, blocked_reason: 'ADAPTER_POLICY_MISSING' });
  });
});

describe('run result normalization', () => {
  it('normalizes a completed local run to the v1 contract', async () => {
    const instance = host({ adapters: { local: createLocalComputeAdapter({ run: async () => ({ artifacts: ['out.txt'] }) }) } });
    const result = await instance.execute('local', governedRequest('local'));

    expect(result.schema).toBe('govibe-provider-run-result/v1');
    expect(result.status).toBe('completed');
    expect(result.binding_id).toBe('binding-1');
    expect(result.normalized_errors).toEqual([]);
    expect(result.retryable).toBe(false);
    expect(result.candidate.schema).toBe('govibe-provider-candidate/v1');
    expect(result.candidate.artifacts).toEqual(['out.txt']);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('normalizes rate-limit, timeout, unavailable and cancellation to terminal states', async () => {
    const cases = [
      ['rate limit exceeded', 'rate_limited', 'PROVIDER_RATE_LIMITED', true],
      ['request timed out', 'timed_out', 'PROVIDER_TIMED_OUT', true],
      ['provider unavailable', 'failed', 'PROVIDER_UNAVAILABLE', true],
    ];

    for (const [message, status, code, retryable] of cases) {
      const instance = host({
        adapters: {
          codex: createSubscriptionCliAdapter({ providerId: 'codex', run: async () => { throw new Error(message); } }),
        },
      });
      const result = await instance.execute('codex', governedRequest('codex'));
      expect(result.status).toBe(status);
      expect(result.normalized_errors[0].code).toBe(code);
      expect(result.retryable).toBe(retryable);
      expect(result.candidate.provider_id).toBe('codex');
    }

    const cancelHost = host({ adapters: { local: createLocalComputeAdapter({ run: async () => ({}) }) } });
    const cancelled = await cancelHost.cancel('local', governedRequest('local'));
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.retryable).toBe(false);
  });

  it('does not guess retryability for an unclassified provider failure', async () => {
    const instance = host({
      adapters: { codex: createSubscriptionCliAdapter({ providerId: 'codex', run: async () => { throw new Error('malformed response'); } }) },
    });
    const result = await instance.execute('codex', governedRequest('codex'));

    expect(result.status).toBe('failed');
    expect(result.normalized_errors[0].code).toBe('PROVIDER_REJECTED');
    expect(result.retryable).toBe(false);
  });

  it('lets a governance rejection surface instead of becoming a provider terminal state', async () => {
    const instance = host({
      adapters: { local: { execute: async () => ({ status: 'completed' }), cancel: async () => {} } },
    });
    await expect(instance.execute('local', governedRequest('local', { policyDecision: 'deny' }))).rejects.toThrowError(
      expect.objectContaining({ name: 'RuntimeAuthorityError', code: 'dispatch_denied' }),
    );
  });

  it('lets a binding scope violation surface rather than normalizing it away', async () => {
    const instance = host({
      adapters: { local: { execute: async () => ({ status: 'completed' }), cancel: async () => {} } },
    });
    const request = governedRequest('local');
    request.executionBinding = { ...request.executionBinding, run_id: 'run-2' };

    await expect(instance.execute('local', request)).rejects.toThrowError(
      expect.objectContaining({ code: 'EXECUTION_BINDING_SCOPE_MISMATCH' }),
    );
  });

  it('rejects a run result whose error list contradicts its status', () => {
    expect(() => normalizeProviderRunResult({
      binding_id: 'b1',
      run_result_id: 'r1',
      status: 'completed',
      started_at: '2026-08-04T00:00:00.000Z',
      candidate: { provider_id: 'local', request_id: 'b1' },
      normalized_errors: [{ code: 'PROVIDER_REJECTED', message: 'x' }],
    }, { providerId: 'local' })).toThrowError(expect.objectContaining({ code: 'PROVIDER_RESULT_INVALID' }));

    expect(() => normalizeProviderRunResult({
      binding_id: 'b1',
      run_result_id: 'r1',
      status: 'failed',
      started_at: '2026-08-04T00:00:00.000Z',
      candidate: { provider_id: 'local', request_id: 'b1' },
      normalized_errors: [],
    }, { providerId: 'local' })).toThrowError(expect.objectContaining({ code: 'PROVIDER_RESULT_INVALID' }));
  });

  it('maps an unknown failure code to a non-retryable rejection', () => {
    expect(normalizeAdapterFailure({ code: 'SOMETHING_ELSE', message: 'boom' })).toMatchObject({
      code: 'PROVIDER_REJECTED',
      status: 'failed',
      retryable: false,
    });
  });
});

describe('candidate boundary', () => {
  it('rejects a self-assigned canonical identity in adapter output', async () => {
    const instance = host({
      adapters: { local: createLocalComputeAdapter({ run: async () => ({ relation_candidates: [{ target: 'gks:doc-1', relation: 'contains' }] }) }) },
    });
    await expect(instance.execute('local', governedRequest('local'))).rejects.toThrowError(
      expect.objectContaining({ code: 'PROVIDER_CANDIDATE_CANONICAL_IDENTITY' }),
    );
  });

  it('rejects credential material in adapter output', async () => {
    const instance = host({
      adapters: { local: createLocalComputeAdapter({ run: async () => ({ requested_scope: { api_key: 'sk-1' } }) }) },
    });
    await expect(instance.execute('local', governedRequest('local'))).rejects.toThrowError(
      expect.objectContaining({ code: 'PROVIDER_RESULT_CREDENTIAL_MATERIAL' }),
    );
  });

  it('rejects a candidate claiming a different provider or an unsupported schema', () => {
    expect(() => normalizeProviderCandidate({ provider_id: 'other', request_id: 'r1' }, { providerId: 'local' })).toThrowError(
      expect.objectContaining({ code: 'PROVIDER_CANDIDATE_PROVIDER_MISMATCH' }),
    );
    expect(() => normalizeProviderCandidate({ schema: 'govibe-provider-candidate/v2', provider_id: 'local', request_id: 'r1' }, { providerId: 'local' })).toThrowError(
      expect.objectContaining({ code: 'PROVIDER_CANDIDATE_SCHEMA_UNSUPPORTED' }),
    );
  });

  it('defaults every candidate collection to empty rather than absent', async () => {
    const instance = host({ adapters: { local: createLocalComputeAdapter({ run: async () => ({}) }) } });
    const { candidate } = await instance.execute('local', governedRequest('local'));

    expect(candidate.source_manifest).toEqual([]);
    expect(candidate.assumptions).toEqual([]);
    expect(candidate.relation_candidates).toEqual([]);
    expect(candidate.verification_hints).toEqual([]);
    expect(candidate.requested_scope).toEqual({});
  });
});

describe('usage extraction stays inside declared visibility', () => {
  it('keeps unsupported token and cache fields unknown', () => {
    const usage = extractProviderUsage(
      { provider_usage: { unit: 'request', request_count: 1, input_tokens: 999, cached_input_tokens: 50 } },
      descriptor({ usage_visibility: 'partial', token_usage_reported: false, cached_token_usage_reported: false }),
    );

    expect(usage.visibility).toBe('partial');
    expect(usage.reported_usage.request_count).toBe(1);
    expect(usage.reported_usage.input_tokens).toBeNull();
    expect(usage.reported_usage.cached_input_tokens).toBeNull();
    expect(usage.unknown_fields).toContain('input_tokens');
    expect(usage.unknown_fields).toContain('cached_input_tokens');
  });

  it('reads token fields only when the descriptor declares them', () => {
    const usage = extractProviderUsage(
      { provider_usage: { unit: 'token', input_tokens: 120, output_tokens: 30 } },
      descriptor({ usage_visibility: 'detailed', token_usage_reported: true }),
    );

    expect(usage.reported_usage.input_tokens).toBe(120);
    expect(usage.reported_usage.output_tokens).toBe(30);
    expect(usage.unknown_fields).not.toContain('input_tokens');
  });

  it('reports nothing for a provider with unknown visibility', () => {
    const usage = extractProviderUsage({ provider_usage: { request_count: 5 } }, descriptor({ usage_visibility: 'unknown' }));
    expect(usage.reported_usage.request_count).toBeNull();
    expect(usage.unknown_fields).toHaveLength(6);
  });

  it('hands a subscription run to the ledger without inventing token usage', async () => {
    const instance = host({
      adapters: { codex: createSubscriptionCliAdapter({ providerId: 'codex', run: async () => ({}) }) },
    });
    const result = await instance.execute('codex', governedRequest('codex'));
    const usage = instance.usageFor(result);

    expect(result.provider_usage).toMatchObject({ unit: 'request', request_count: 1 });
    expect(usage.reported_usage.input_tokens).toBeNull();

    const ledger = createEntitlementUsageLedger({
      capabilityRegistry: createProviderCapabilityRegistry([
        descriptor({ provider_id: 'codex', adapter_id: 'adapter-codex', usage_visibility: 'rate-limit-only' }),
      ]),
      clock: () => new Date('2026-08-04T00:00:00.000Z'),
    });

    const recorded = ledger.record({
      organization_id: 'org-1',
      user_id: 'user-1',
      workspace_id: 'ws-1',
      task_id: 'task-1',
      run_id: 'run-1',
      binding_id: result.binding_id,
      provider_id: 'codex',
      entitlement_id: 'ent-1',
      entitlement_type: 'personal_subscription',
      model_id: 'model-1',
      reported_usage: { unit: usage.reported_usage.unit, request_count: usage.reported_usage.request_count },
      outcome: { status: result.status, duration_ms: null },
    });

    expect(recorded.reported_usage.request_count).toBe(1);
    expect(recorded.reported_usage.input_tokens).toBeNull();
    expect(recorded.unknown_fields).toContain('input_tokens');
  });
});

describe('knowledge boundary', () => {
  it('reaches no knowledge or database service from the adapter modules', () => {
    for (const file of ['provider-adapter-host.mjs', 'provider-adapters.mjs']) {
      const source = readFileSync(path.resolve('packages/govibe-core/src', file), 'utf8');
      expect(source).not.toMatch(/from ['"].*gks-client/i);
      expect(source).not.toMatch(/from ['"].*msp-client/i);
      expect(source).not.toMatch(/from ['"].*canonical-materialization/i);
      expect(source).not.toMatch(/genesisblockdb/i);
    }
  });

  it('exposes no promotion surface on the host', () => {
    const instance = host({ adapters: { local: createLocalComputeAdapter({ run: async () => ({}) }) } });
    expect(Object.keys(instance).some((name) => /promote|gks|genesis/i.test(name))).toBe(false);
  });

  it('requires a governed executor registry', () => {
    expect(() => createProviderAdapterHost({})).toThrowError(expect.objectContaining({ code: 'EXECUTOR_REGISTRY_REQUIRED' }));
  });

  it('refuses to build an adapter without a runner', () => {
    expect(() => createLocalComputeAdapter({})).toThrowError(ProviderInvocationError);
    expect(() => createSubscriptionCliAdapter({ providerId: 'codex' })).toThrowError(ProviderInvocationError);
  });
});
