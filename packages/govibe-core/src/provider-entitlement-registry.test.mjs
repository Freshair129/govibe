import { describe, expect, it } from 'vitest';
import {
  RegistryValidationError,
  createEntitlementRegistry,
  createProviderCapabilityRegistry,
  normalizeProviderEntitlement,
} from './provider-entitlement-registry.mjs';

const NOW = new Date('2026-08-02T15:00:00.000Z');

function capability(overrides = {}) {
  return {
    schema: 'govibe-provider-capability-descriptor/v1',
    provider_id: 'openai-codex',
    adapter_id: 'codex-cli',
    adapter_version: '0.1.0',
    executor_classes: ['coding_frontier'],
    models: [{
      model_id: 'codex-default',
      capabilities: ['tool_calling', 'filesystem'],
      context_limit_tokens: 200000,
      supports_tools: true,
      supports_streaming: true,
      supports_reasoning_control: null,
    }],
    entitlement_types: ['personal_subscription', 'business_seat'],
    usage_visibility: 'partial',
    token_usage_reported: false,
    cached_token_usage_reported: false,
    remaining_quota_reported: false,
    rate_limit_detectable: true,
    supports_session_affinity: true,
    supports_prompt_cache_reference: false,
    supports_cancellation: true,
    supports_parallel_runs: false,
    credential_modes: ['oauth-session'],
    data_policy_tags: ['internal'],
    observed_at: '2026-08-02T14:00:00.000Z',
    ...overrides,
  };
}

function entitlement(overrides = {}) {
  return {
    schema: 'govibe-provider-entitlement/v1',
    entitlement_id: 'ent-user-a-openai',
    version: '1',
    provider_id: 'openai-codex',
    entitlement_type: 'personal_subscription',
    owner: { owner_type: 'user', owner_id: 'user-a' },
    allowed_principals: [],
    allowed_roles: ['developer'],
    allowed_workspaces: ['workspace-a'],
    allowed_projects: [],
    data_classifications: ['internal'],
    residency_policy: [],
    credential_ref: 'vault://provider/openai/user-a',
    executor_classes: ['coding_frontier'],
    model_allowlist: ['codex-default'],
    model_denylist: [],
    concurrency: { max_active: 1, max_queued: 2 },
    session_policy: { cross_run_reuse: true, ttl_seconds: 3600 },
    quota_policy_ref: null,
    state: 'active',
    valid_from: '2026-08-01T00:00:00.000Z',
    valid_until: null,
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    principal_id: 'user-a',
    organization_id: 'org-a',
    workspace_id: 'workspace-a',
    project_id: 'project-a',
    role: 'developer',
    data_classification: 'internal',
    executor_class: 'coding_frontier',
    model_id: 'codex-default',
    ...overrides,
  };
}

describe('provider capability registry', () => {
  it('registers and inspects API-008 capability descriptors', () => {
    const registry = createProviderCapabilityRegistry();
    const record = registry.register(capability());

    expect(record.provider_id).toBe('openai-codex');
    expect(registry.get('openai-codex')).toBe(record);
    expect(registry.inspect()).toEqual([record]);
  });

  it('rejects unsupported usage visibility', () => {
    const registry = createProviderCapabilityRegistry();
    expect(() => registry.register(capability({ usage_visibility: 'precise-enough' })))
      .toThrow(RegistryValidationError);
  });
});

describe('provider entitlement normalization', () => {
  it('defaults personal subscriptions to owner_only and cross-user reuse false', () => {
    const record = normalizeProviderEntitlement(entitlement());
    expect(record.share_policy).toBe('owner_only');
    expect(record.session_policy.cross_user_reuse).toBe(false);
  });

  it('rejects ownerless entitlements', () => {
    expect(() => normalizeProviderEntitlement(entitlement({ owner: null })))
      .toThrow(RegistryValidationError);
  });

  it('rejects raw credential material', () => {
    expect(() => normalizeProviderEntitlement(entitlement({ api_key: 'secret-value' })))
      .toThrow(/Raw credential field is prohibited/);
  });

  it('rejects owner-only entitlements with cross-user session reuse', () => {
    expect(() => normalizeProviderEntitlement(entitlement({
      share_policy: 'owner_only',
      session_policy: { cross_run_reuse: true, cross_user_reuse: true, ttl_seconds: 3600 },
    }))).toThrow(RegistryValidationError);
  });
});

describe('entitlement eligibility', () => {
  it('returns only authorized active entitlements', () => {
    const registry = createEntitlementRegistry([
      entitlement(),
      entitlement({
        entitlement_id: 'ent-revoked',
        state: 'revoked',
      }),
      entitlement({
        entitlement_id: 'ent-other-owner',
        owner: { owner_type: 'user', owner_id: 'user-b' },
      }),
    ]);

    expect(registry.findEligible(request(), NOW).map((item) => item.entitlement_id))
      .toEqual(['ent-user-a-openai']);
  });

  it('fails closed for workspace, role, data, executor and model mismatches', () => {
    const registry = createEntitlementRegistry([entitlement()]);
    const decision = registry.explainEligibility('ent-user-a-openai', request({
      workspace_id: 'workspace-b',
      role: 'marketing',
      data_classification: 'restricted',
      executor_class: 'research_frontier',
      model_id: 'other-model',
    }), NOW);

    expect(decision.eligible).toBe(false);
    expect(decision.reasons).toEqual(expect.arrayContaining([
      'WORKSPACE_NOT_AUTHORIZED',
      'ROLE_NOT_AUTHORIZED',
      'DATA_CLASSIFICATION_NOT_AUTHORIZED',
      'EXECUTOR_CLASS_UNAVAILABLE',
      'MODEL_NOT_ALLOWED',
    ]));
  });

  it('rejects expired entitlements even when lifecycle state is stale', () => {
    const registry = createEntitlementRegistry([entitlement({
      valid_until: '2026-08-02T14:59:59.000Z',
    })]);

    expect(registry.explainEligibility('ent-user-a-openai', request(), NOW).reasons)
      .toContain('ENTITLEMENT_EXPIRED');
  });

  it('supports explicitly named principals without anonymous pooling', () => {
    const registry = createEntitlementRegistry([entitlement({
      entitlement_id: 'ent-team-seat',
      entitlement_type: 'business_seat',
      share_policy: 'named_principals',
      allowed_principals: ['user-b'],
    })]);

    expect(registry.findEligible(request({ principal_id: 'user-b' }), NOW)).toHaveLength(1);
    expect(registry.findEligible(request({ principal_id: 'user-c' }), NOW)).toHaveLength(0);
  });
});
