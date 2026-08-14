import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { aggregateUsageEvents, createEntitlementUsageLedger } from './entitlement-usage-ledger.mjs';
import { createProviderCapabilityRegistry } from './provider-entitlement-registry.mjs';

function descriptor(overrides = {}) {
  return {
    schema: 'govibe-provider-capability-descriptor/v1',
    provider_id: 'detailed-api',
    adapter_id: 'adapter-detailed',
    adapter_version: '1.0.0',
    executor_classes: ['api-llm'],
    entitlement_types: ['api'],
    usage_visibility: 'detailed',
    token_usage_reported: true,
    cached_token_usage_reported: true,
    remaining_quota_reported: true,
    rate_limit_detectable: true,
    observed_at: '2026-08-04T00:00:00.000Z',
    ...overrides,
  };
}

// detailed-api reports everything; seat-sub is a request-metered subscription that
// reports nothing; throttled is rate-limit-only.
function registry() {
  return createProviderCapabilityRegistry([
    descriptor(),
    descriptor({
      provider_id: 'seat-sub',
      adapter_id: 'adapter-seat',
      entitlement_types: ['business_seat'],
      usage_visibility: 'partial',
      token_usage_reported: false,
      cached_token_usage_reported: false,
      remaining_quota_reported: false,
    }),
    descriptor({
      provider_id: 'throttled',
      adapter_id: 'adapter-throttled',
      usage_visibility: 'rate-limit-only',
      token_usage_reported: false,
      cached_token_usage_reported: false,
      remaining_quota_reported: false,
    }),
    descriptor({
      provider_id: 'local-compute',
      adapter_id: 'adapter-local-compute',
      entitlement_types: ['local_compute'],
      usage_visibility: 'partial',
      token_usage_reported: false,
      cached_token_usage_reported: false,
      remaining_quota_reported: false,
    }),
  ]);
}

function event(overrides = {}) {
  return {
    organization_id: 'org_1',
    user_id: 'user_1',
    workspace_id: 'ws_1',
    project_id: 'proj_1',
    task_id: 'task_1',
    run_id: 'run_1',
    binding_id: 'bind_1',
    provider_id: 'detailed-api',
    entitlement_id: 'ent_api',
    entitlement_type: 'api',
    model_id: 'model-x',
    outcome: { status: 'completed', duration_ms: 1200 },
    ...overrides,
  };
}

function ledger(options = {}) {
  return createEntitlementUsageLedger({
    capabilityRegistry: registry(),
    clock: () => new Date('2026-08-04T00:00:00.000Z'),
    ...options,
  });
}

describe('entitlement usage ledger', () => {
  it('records provider-reported usage separately from GoVibe estimates', () => {
    const recorded = ledger().record(event({
      reported_usage: { unit: 'token', input_tokens: 900, cached_input_tokens: 400, output_tokens: 120 },
      estimated_usage: { method: 'char-count/v1', input_tokens: 880, confidence: 0.6 },
    }));

    expect(recorded.schema).toBe('govibe-entitlement-usage-event/v1');
    expect(recorded.reported_usage).toMatchObject({ unit: 'token', input_tokens: 900, cached_input_tokens: 400, output_tokens: 120 });
    expect(recorded.estimated_usage).toMatchObject({ method: 'char-count/v1', input_tokens: 880, confidence: 0.6 });
    expect(recorded.reported_usage.input_tokens).not.toBe(recorded.estimated_usage.input_tokens);
    expect(Object.isFrozen(recorded)).toBe(true);
    expect(Object.isFrozen(recorded.reported_usage)).toBe(true);
  });

  it('refuses to record token usage a provider does not report', () => {
    expect(() => ledger().record(event({
      provider_id: 'seat-sub',
      entitlement_id: 'ent_seat',
      entitlement_type: 'business_seat',
      reported_usage: { unit: 'request', request_count: 1, input_tokens: 700 },
    }))).toThrowError(expect.objectContaining({ code: 'USAGE_SEMANTICS_UNKNOWN' }));
  });

  it('refuses to record cached tokens a provider does not report', () => {
    expect(() => ledger().record(event({
      provider_id: 'seat-sub',
      entitlement_id: 'ent_seat',
      entitlement_type: 'business_seat',
      reported_usage: { unit: 'credit', cached_input_tokens: 50 },
    }))).toThrowError(expect.objectContaining({ code: 'USAGE_SEMANTICS_UNKNOWN' }));
  });

  it('refuses to record any provider usage when the provider has no capability descriptor', () => {
    expect(() => ledger().record(event({
      provider_id: 'undeclared',
      reported_usage: { unit: 'token', input_tokens: 10 },
    }))).toThrowError(expect.objectContaining({ code: 'USAGE_SEMANTICS_UNKNOWN' }));
  });

  it('keeps request quota distinct from token quantity', () => {
    expect(() => ledger().record(event({
      reported_usage: { unit: 'request', request_count: 1, input_tokens: 900 },
    }))).toThrowError(expect.objectContaining({ code: 'USAGE_UNIT_CONFLICT' }));

    expect(() => ledger().record(event({
      reported_usage: { unit: 'request', request_count: 1, cached_input_tokens: 400 },
    }))).toThrowError(expect.objectContaining({ code: 'USAGE_UNIT_CONFLICT' }));
  });

  it('requires provenance before accepting an estimate', () => {
    expect(() => ledger().record(event({
      estimated_usage: { input_tokens: 500 },
    }))).toThrowError(expect.objectContaining({ code: 'ESTIMATE_PROVENANCE_REQUIRED' }));

    expect(() => ledger().record(event({
      estimated_usage: { method: 'char-count/v1', input_tokens: 500 },
    }))).toThrowError(expect.objectContaining({ code: 'ESTIMATE_PROVENANCE_REQUIRED' }));
  });

  it('rejects an estimate smuggled into the reported bucket', () => {
    expect(() => ledger().record(event({
      reported_usage: { unit: 'token', input_tokens: 10, method: 'char-count/v1' },
    }))).toThrowError(expect.objectContaining({ code: 'USAGE_EVENT_INVALID' }));

    expect(() => ledger().record(event({
      estimated_usage: { method: 'char-count/v1', confidence: 0.5, cached_input_tokens: 12 },
    }))).toThrowError(expect.objectContaining({ code: 'USAGE_EVENT_INVALID' }));
  });

  it('names every unreported field instead of defaulting it to zero', () => {
    const partial = ledger().record(event({
      provider_id: 'seat-sub',
      entitlement_id: 'ent_seat',
      entitlement_type: 'business_seat',
      reported_usage: { unit: 'request', request_count: 1 },
    }));

    expect(partial.reported_usage.request_count).toBe(1);
    expect(partial.reported_usage.input_tokens).toBeNull();
    expect(partial.reported_usage.output_tokens).toBeNull();
    expect(partial.unknown_fields).toContain('input_tokens');
    expect(partial.unknown_fields).toContain('output_tokens');
    expect(partial.unknown_fields).toContain('provider_credits');
    expect(partial.unknown_fields).not.toContain('request_count');
  });

  it('marks every reported field unknown for a rate-limit-only provider', () => {
    const throttled = ledger().record(event({
      provider_id: 'throttled',
      entitlement_id: 'ent_throttled',
      outcome: { status: 'rate_limited', duration_ms: null },
    }));

    expect(throttled.outcome.status).toBe('rate_limited');
    expect(throttled.unknown_fields).toEqual([
      'cached_input_tokens',
      'input_tokens',
      'output_tokens',
      'provider_credits',
      'reasoning_tokens',
      'request_count',
    ]);
  });

  it('keeps local-compute not-applicable fields separate from unknown telemetry', () => {
    const local = ledger().record(event({
      provider_id: 'local-compute',
      entitlement_id: 'ent_local',
      entitlement_type: 'local_compute',
      reported_usage: { unit: 'second', request_count: 1 },
      not_applicable_fields: ['input_tokens', 'output_tokens', 'reasoning_tokens', 'cached_input_tokens'],
    }));

    expect(local.not_applicable_fields).toEqual(['cached_input_tokens', 'input_tokens', 'output_tokens', 'reasoning_tokens']);
    expect(local.unknown_fields).toEqual(['provider_credits']);
    const [group] = ledgerWithEvent(local).aggregate({ by: ['entitlement_id'] });
    expect(group.not_applicable_field_counts).toEqual({
      cached_input_tokens: 1,
      input_tokens: 1,
      output_tokens: 1,
      reasoning_tokens: 1,
    });
    expect(group.unknown_field_counts).toEqual({ provider_credits: 1 });
  });

  it('rejects invalid or conflicting telemetry classifications', () => {
    expect(() => ledger().record(event({
      not_applicable_fields: ['not_a_usage_field'],
    }))).toThrowError(expect.objectContaining({ code: 'USAGE_EVENT_INVALID' }));

    expect(() => ledger().record(event({
      reported_usage: { unit: 'token', input_tokens: 10 },
      not_applicable_fields: ['input_tokens'],
    }))).toThrowError(expect.objectContaining({ code: 'USAGE_CLASSIFICATION_CONFLICT' }));

    expect(() => ledger().record(event({
      not_applicable_fields: ['input_tokens'],
      unknown_fields: ['input_tokens'],
    }))).toThrowError(expect.objectContaining({ code: 'USAGE_CLASSIFICATION_CONFLICT' }));
  });

  it('rejects credential material anywhere in an event', () => {
    expect(() => ledger().record(event({ api_key: 'sk-live-1' }))).toThrowError(
      expect.objectContaining({ code: 'USAGE_EVENT_CREDENTIAL_MATERIAL' }),
    );
    expect(() => ledger().record(event({ routing: { attempt: 1, access_token: 'tok' } }))).toThrowError(
      expect.objectContaining({ code: 'USAGE_EVENT_CREDENTIAL_MATERIAL' }),
    );
  });

  it('rejects an unknown terminal state and a malformed attempt counter', () => {
    expect(() => ledger().record(event({ outcome: { status: 'succeeded' } }))).toThrowError(
      expect.objectContaining({ code: 'USAGE_EVENT_INVALID' }),
    );
    expect(() => ledger().record(event({ routing: { attempt: 0 } }))).toThrowError(
      expect.objectContaining({ code: 'USAGE_EVENT_INVALID' }),
    );
  });
});

function ledgerWithEvent(recorded) {
  return {
    aggregate(options) {
      return aggregateUsageEvents([recorded], options);
    },
  };
}

describe('entitlement quota snapshots', () => {
  it('records a detailed provider quota with its reset window', () => {
    const snapshot = ledger().recordQuotaSnapshot({
      entitlement_id: 'ent_api',
      provider_id: 'detailed-api',
      source: 'provider',
      reported: { remaining: 4000, unit: 'token', resets_at: '2026-08-05T00:00:00.000Z' },
    });

    expect(snapshot.schema).toBe('govibe-entitlement-quota-snapshot/v1');
    expect(snapshot.visibility).toBe('detailed');
    expect(snapshot.reported.remaining).toBe(4000);
    expect(snapshot.estimated.capacity_score).toBeNull();
  });

  it('keeps a rate-limit-only provider free of fabricated remaining quota', () => {
    const snapshot = ledger().recordQuotaSnapshot({
      entitlement_id: 'ent_throttled',
      provider_id: 'throttled',
      source: 'adapter',
      observed_rate_limit: { limited: true, retry_after_seconds: 30 },
    });

    expect(snapshot.visibility).toBe('rate-limit-only');
    expect(snapshot.reported.remaining).toBeNull();
    expect(snapshot.reported.unit).toBe('unknown');
    expect(snapshot.observed_rate_limit).toEqual({ limited: true, retry_after_seconds: 30 });

    expect(() => ledger().recordQuotaSnapshot({
      entitlement_id: 'ent_throttled',
      provider_id: 'throttled',
      reported: { remaining: 10, unit: 'request' },
    })).toThrowError(expect.objectContaining({ code: 'USAGE_SEMANTICS_UNKNOWN' }));
  });

  it('never attributes a scheduler capacity score to the provider', () => {
    const snapshot = ledger().recordQuotaSnapshot({
      entitlement_id: 'ent_throttled',
      provider_id: 'throttled',
      source: 'scheduler',
      estimated: { capacity_score: 0.4, confidence: 0.3 },
    });

    expect(snapshot.source).toBe('scheduler');
    expect(snapshot.estimated).toEqual({ capacity_score: 0.4, confidence: 0.3 });
    expect(snapshot.reported.remaining).toBeNull();

    expect(() => ledger().recordQuotaSnapshot({
      entitlement_id: 'ent_throttled',
      provider_id: 'throttled',
      source: 'provider',
      estimated: { capacity_score: 0.4, confidence: 0.3 },
    })).toThrowError(expect.objectContaining({ code: 'ESTIMATE_SOURCE_CONFLICT' }));
  });

  it('returns the latest snapshot per entitlement', () => {
    const instance = ledger();
    instance.recordQuotaSnapshot({ entitlement_id: 'ent_api', provider_id: 'detailed-api', source: 'provider', reported: { remaining: 9, unit: 'token' } });
    instance.recordQuotaSnapshot({ entitlement_id: 'ent_api', provider_id: 'detailed-api', source: 'provider', reported: { remaining: 4, unit: 'token' } });

    expect(instance.latestQuotaSnapshot('ent_api').reported.remaining).toBe(4);
    expect(instance.latestQuotaSnapshot('ent_missing')).toBeNull();
  });
});

describe('usage aggregation', () => {
  function populated() {
    const instance = ledger();
    instance.record(event({
      reported_usage: { unit: 'token', input_tokens: 100, output_tokens: 20 },
      estimated_usage: { method: 'char-count/v1', input_tokens: 90, confidence: 0.7 },
    }));
    instance.record(event({
      run_id: 'run_2',
      reported_usage: { unit: 'token', input_tokens: 300, output_tokens: 40 },
      estimated_usage: { method: 'char-count/v1', input_tokens: 280, confidence: 0.5 },
      outcome: { status: 'failed', duration_ms: 90 },
    }));
    instance.record(event({
      user_id: 'user_2',
      run_id: 'run_3',
      provider_id: 'seat-sub',
      entitlement_id: 'ent_seat',
      entitlement_type: 'business_seat',
      reported_usage: { unit: 'request', request_count: 1 },
    }));
    return instance;
  }

  it('aggregates by entitlement without merging reported and estimated totals', () => {
    const [api, seat] = populated().aggregate({ by: ['entitlement_id'] });

    expect(api.key).toEqual({ entitlement_id: 'ent_api' });
    expect(api.event_count).toBe(2);
    expect(api.reported.input_tokens).toBe(400);
    expect(api.reported.coverage.input_tokens).toBe(2);
    expect(api.estimated.input_tokens).toBe(370);
    expect(api.estimation_methods).toEqual(['char-count/v1']);
    expect(api.min_estimate_confidence).toBe(0.5);
    expect(api.outcomes).toEqual({ completed: 1, failed: 1 });

    expect(seat.key).toEqual({ entitlement_id: 'ent_seat' });
    expect(seat.reported.request_count).toBe(1);
    expect(seat.reported.input_tokens).toBe(0);
    expect(seat.reported.coverage.input_tokens).toBe(0);
    expect(seat.unknown_field_counts.input_tokens).toBe(1);
  });

  it('aggregates by user, workspace and outcome', () => {
    const instance = populated();

    expect(instance.aggregate({ by: ['user_id'] }).map((group) => group.key.user_id)).toEqual(['user_1', 'user_2']);
    expect(instance.aggregate({ by: ['workspace_id'] })[0]).toMatchObject({ key: { workspace_id: 'ws_1' }, event_count: 3 });

    const byOutcome = instance.aggregate({ by: ['outcome'] });
    expect(byOutcome.map((group) => [group.key.outcome, group.event_count])).toEqual([
      ['completed', 2],
      ['failed', 1],
    ]);

    const composite = instance.aggregate({ by: ['workspace_id', 'entitlement_id'], filter: { entitlement_id: 'ent_api' } });
    expect(composite).toHaveLength(1);
    expect(composite[0].key).toEqual({ workspace_id: 'ws_1', entitlement_id: 'ent_api' });
  });

  it('reports the units observed rather than collapsing them', () => {
    const [group] = populated().aggregate({ by: ['workspace_id'] });
    expect(group.reported_units).toEqual(['request', 'token']);
  });

  it('rejects an unsupported aggregation dimension', () => {
    expect(() => aggregateUsageEvents([], { by: ['credential_ref'] })).toThrowError(
      expect.objectContaining({ code: 'USAGE_AGGREGATION_INVALID' }),
    );
  });
});

describe('retention and knowledge boundary', () => {
  it('purges records past the retention window and keeps the rest', () => {
    let now = new Date('2026-08-04T00:00:00.000Z');
    const instance = createEntitlementUsageLedger({
      capabilityRegistry: registry(),
      clock: () => now,
      retentionDays: 30,
    });

    instance.record(event());
    instance.recordQuotaSnapshot({ entitlement_id: 'ent_api', provider_id: 'detailed-api', source: 'provider', reported: { remaining: 5, unit: 'token' } });

    now = new Date('2026-09-01T00:00:00.000Z');
    expect(instance.purgeExpired()).toBe(0);

    now = new Date('2026-09-10T00:00:00.000Z');
    instance.record(event({ run_id: 'run_fresh' }));
    expect(instance.purgeExpired()).toBe(2);
    expect(instance.list().map((entry) => entry.run_id)).toEqual(['run_fresh']);
    expect(instance.inspectQuotaSnapshots()).toHaveLength(0);
  });

  it('keeps every record when no retention window is configured', () => {
    const instance = ledger();
    instance.record(event());
    expect(instance.retentionDays).toBeNull();
    expect(instance.purgeExpired(new Date('2030-01-01T00:00:00.000Z'))).toBe(0);
    expect(instance.list()).toHaveLength(1);
  });

  it('exposes no promotion path and reaches no knowledge service', () => {
    const instance = ledger();
    expect(Object.keys(instance).some((name) => /promote|gks|genesis/i.test(name))).toBe(false);

    const source = readFileSync(path.resolve('packages/govibe-core/src/entitlement-usage-ledger.mjs'), 'utf8');
    expect(source).not.toMatch(/gks|genesis|canonical-materialization|msp-client/i);
  });
});
