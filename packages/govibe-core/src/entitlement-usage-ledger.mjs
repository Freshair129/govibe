import { ENTITLEMENT_TYPES } from './provider-entitlement-registry.mjs';

const USAGE_EVENT_SCHEMA = 'govibe-entitlement-usage-event/v1';
const QUOTA_SNAPSHOT_SCHEMA = 'govibe-entitlement-quota-snapshot/v1';

const USAGE_UNITS = new Set(['request', 'credit', 'token', 'second', 'unknown']);
const OUTCOME_STATES = new Set(['completed', 'failed', 'rate_limited', 'cancelled', 'timed_out']);
const QUOTA_VISIBILITY = new Set(['detailed', 'partial', 'rate-limit-only', 'unknown']);
const QUOTA_SOURCES = new Set(['provider', 'adapter', 'scheduler', 'unknown']);

const REPORTED_TOKEN_FIELDS = ['input_tokens', 'output_tokens', 'reasoning_tokens'];
const REPORTED_FIELDS = [...REPORTED_TOKEN_FIELDS, 'cached_input_tokens', 'provider_credits', 'request_count'];
const ESTIMATED_FIELDS = ['input_tokens', 'output_tokens', 'compute_weight'];

const IDENTITY_FIELDS = [
  'organization_id',
  'user_id',
  'workspace_id',
  'task_id',
  'run_id',
  'binding_id',
  'provider_id',
  'entitlement_id',
  'model_id',
];

const GROUP_KEYS = new Set([
  'organization_id',
  'user_id',
  'workspace_id',
  'project_id',
  'task_id',
  'provider_id',
  'entitlement_id',
  'entitlement_type',
  'model_id',
  'outcome',
]);

const FORBIDDEN_CREDENTIAL_FIELDS = new Set([
  'credential',
  'credentials',
  'access_token',
  'refresh_token',
  'api_key',
  'secret',
  'password',
  'authorization',
]);

export class UsageLedgerError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'UsageLedgerError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details) {
  throw new UsageLedgerError(code, message, details);
}

function assert(condition, code, message, details) {
  if (!condition) fail(code, message, details);
}

function requiredString(value, field) {
  assert(typeof value === 'string' && value.trim().length > 0, 'USAGE_EVENT_INVALID', `${field} must be a non-empty string`, { field });
  return value.trim();
}

function nullableString(value, field) {
  if (value == null) return null;
  return requiredString(value, field);
}

function isoDate(value, field, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  requiredString(value, field);
  assert(!Number.isNaN(Date.parse(value)), 'USAGE_EVENT_INVALID', `${field} must be an ISO-compatible date`, { field });
  return value;
}

function nullableCount(value, field) {
  if (value == null) return null;
  assert(Number.isInteger(value) && value >= 0, 'USAGE_EVENT_INVALID', `${field} must be a non-negative integer or null`, { field });
  return value;
}

function nullableAmount(value, field) {
  if (value == null) return null;
  assert(typeof value === 'number' && Number.isFinite(value) && value >= 0, 'USAGE_EVENT_INVALID', `${field} must be a non-negative number or null`, { field });
  return value;
}

function nullableConfidence(value, field) {
  if (value == null) return null;
  assert(typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1, 'USAGE_EVENT_INVALID', `${field} must be a number between 0 and 1 or null`, { field });
  return value;
}

function rejectCredentialMaterial(record, path) {
  if (!record || typeof record !== 'object') return;
  for (const [key, value] of Object.entries(record)) {
    if (FORBIDDEN_CREDENTIAL_FIELDS.has(key.toLowerCase())) {
      fail('USAGE_EVENT_CREDENTIAL_MATERIAL', `raw credential field is prohibited: ${path}${key}`, { field: `${path}${key}` });
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) rejectCredentialMaterial(value, `${path}${key}.`);
  }
}

function rejectUnknownKeys(record, allowed, field) {
  for (const key of Object.keys(record ?? {})) {
    assert(allowed.includes(key), 'USAGE_EVENT_INVALID', `${field}.${key} is not part of ${USAGE_EVENT_SCHEMA}`, { field: `${field}.${key}` });
  }
}

// A descriptor is the only authority for what a provider actually reports. Absent
// descriptor means unknown telemetry, not zero telemetry, so nothing may be reported.
function resolveDescriptor(capabilityRegistry, providerId) {
  const descriptor = capabilityRegistry?.get?.(providerId) ?? null;
  if (!descriptor) {
    return Object.freeze({
      known: false,
      usage_visibility: 'unknown',
      token_usage_reported: false,
      cached_token_usage_reported: false,
      remaining_quota_reported: false,
      rate_limit_detectable: false,
    });
  }
  return Object.freeze({
    known: true,
    usage_visibility: descriptor.usage_visibility,
    token_usage_reported: descriptor.token_usage_reported === true,
    cached_token_usage_reported: descriptor.cached_token_usage_reported === true,
    remaining_quota_reported: descriptor.remaining_quota_reported === true,
    rate_limit_detectable: descriptor.rate_limit_detectable === true,
  });
}

function normalizeReportedUsage(input, descriptor, providerId) {
  const reported = input ?? {};
  rejectUnknownKeys(reported, ['unit', ...REPORTED_FIELDS], 'reported_usage');

  const unit = reported.unit ?? 'unknown';
  assert(USAGE_UNITS.has(unit), 'USAGE_EVENT_INVALID', 'reported_usage.unit is not a contract unit', { field: 'reported_usage.unit' });

  const normalized = {
    unit,
    input_tokens: nullableCount(reported.input_tokens, 'reported_usage.input_tokens'),
    cached_input_tokens: nullableCount(reported.cached_input_tokens, 'reported_usage.cached_input_tokens'),
    output_tokens: nullableCount(reported.output_tokens, 'reported_usage.output_tokens'),
    reasoning_tokens: nullableCount(reported.reasoning_tokens, 'reported_usage.reasoning_tokens'),
    provider_credits: nullableAmount(reported.provider_credits, 'reported_usage.provider_credits'),
    request_count: nullableCount(reported.request_count, 'reported_usage.request_count'),
  };

  for (const field of REPORTED_TOKEN_FIELDS) {
    if (normalized[field] != null && !descriptor.token_usage_reported) {
      fail('USAGE_SEMANTICS_UNKNOWN', `provider does not report ${field}; it cannot be recorded as provider-reported usage`, {
        provider_id: providerId,
        field: `reported_usage.${field}`,
      });
    }
  }

  if (normalized.cached_input_tokens != null && !descriptor.cached_token_usage_reported) {
    fail('USAGE_SEMANTICS_UNKNOWN', 'provider does not report cached input tokens', {
      provider_id: providerId,
      field: 'reported_usage.cached_input_tokens',
    });
  }

  // API-008 section 14: a request count is never an exact token quantity.
  if (unit === 'request') {
    for (const field of [...REPORTED_TOKEN_FIELDS, 'cached_input_tokens']) {
      if (normalized[field] != null) {
        fail('USAGE_UNIT_CONFLICT', `a request-metered entitlement cannot report ${field} as consumed quota`, {
          field: `reported_usage.${field}`,
          unit,
        });
      }
    }
  }

  return normalized;
}

function normalizeEstimatedUsage(input) {
  const estimated = input ?? {};
  rejectUnknownKeys(estimated, ['method', 'confidence', ...ESTIMATED_FIELDS], 'estimated_usage');

  const normalized = {
    method: nullableString(estimated.method, 'estimated_usage.method'),
    input_tokens: nullableCount(estimated.input_tokens, 'estimated_usage.input_tokens'),
    output_tokens: nullableCount(estimated.output_tokens, 'estimated_usage.output_tokens'),
    compute_weight: nullableAmount(estimated.compute_weight, 'estimated_usage.compute_weight'),
    confidence: nullableConfidence(estimated.confidence, 'estimated_usage.confidence'),
  };

  const hasEstimate = ESTIMATED_FIELDS.some((field) => normalized[field] != null);
  if (hasEstimate) {
    assert(normalized.method != null, 'ESTIMATE_PROVENANCE_REQUIRED', 'an estimate requires estimated_usage.method', { field: 'estimated_usage.method' });
    assert(normalized.confidence != null, 'ESTIMATE_PROVENANCE_REQUIRED', 'an estimate requires estimated_usage.confidence', { field: 'estimated_usage.confidence' });
  }

  return normalized;
}

// Every reported field the provider cannot expose is named, so a null is readable as
// "not reported" rather than "measured as zero".
function deriveUnknownFields(reported, descriptor, declared) {
  const unknown = new Set();
  for (const field of REPORTED_FIELDS) {
    if (reported[field] == null) unknown.add(field);
  }
  if (descriptor.usage_visibility === 'unknown' || !descriptor.known) {
    for (const field of REPORTED_FIELDS) unknown.add(field);
  }
  for (const [index, field] of (declared ?? []).entries()) {
    unknown.add(requiredString(field, `unknown_fields[${index}]`));
  }
  return [...unknown].sort();
}

function normalizeAffinity(input) {
  const affinity = input ?? {};
  rejectUnknownKeys(affinity, ['session_affinity_used', 'prompt_cache_ref_used', 'verified_result_cache_hit'], 'affinity');
  return {
    session_affinity_used: affinity.session_affinity_used === true,
    prompt_cache_ref_used: affinity.prompt_cache_ref_used === true,
    verified_result_cache_hit: affinity.verified_result_cache_hit === true,
  };
}

function normalizeRouting(input) {
  const routing = input ?? {};
  rejectUnknownKeys(routing, ['attempt', 'fallback_used', 'previous_binding_id'], 'routing');
  const attempt = routing.attempt ?? 1;
  assert(Number.isInteger(attempt) && attempt >= 1, 'USAGE_EVENT_INVALID', 'routing.attempt must be an integer of at least 1', { field: 'routing.attempt' });
  return {
    attempt,
    fallback_used: routing.fallback_used === true,
    previous_binding_id: nullableString(routing.previous_binding_id, 'routing.previous_binding_id'),
  };
}

function normalizeOutcome(input) {
  const outcome = input ?? {};
  rejectUnknownKeys(outcome, ['status', 'duration_ms'], 'outcome');
  assert(OUTCOME_STATES.has(outcome.status), 'USAGE_EVENT_INVALID', 'outcome.status is not a contract terminal state', { field: 'outcome.status' });
  return {
    status: outcome.status,
    duration_ms: nullableCount(outcome.duration_ms, 'outcome.duration_ms'),
  };
}

export function normalizeUsageEvent(input, { descriptor = resolveDescriptor(null, null), eventId, recordedAt } = {}) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'USAGE_EVENT_INVALID', 'usage event must be an object');
  rejectCredentialMaterial(input, '');

  const identity = {};
  for (const field of IDENTITY_FIELDS) identity[field] = requiredString(input[field], field);

  const entitlementType = requiredString(input.entitlement_type, 'entitlement_type');
  assert(ENTITLEMENT_TYPES.includes(entitlementType), 'USAGE_EVENT_INVALID', 'entitlement_type is not a registry entitlement type', { field: 'entitlement_type' });

  const reported = normalizeReportedUsage(input.reported_usage, descriptor, identity.provider_id);
  const estimated = normalizeEstimatedUsage(input.estimated_usage);

  return Object.freeze({
    schema: USAGE_EVENT_SCHEMA,
    event_id: requiredString(eventId ?? input.event_id, 'event_id'),
    organization_id: identity.organization_id,
    user_id: identity.user_id,
    workspace_id: identity.workspace_id,
    project_id: nullableString(input.project_id, 'project_id'),
    task_id: identity.task_id,
    run_id: identity.run_id,
    binding_id: identity.binding_id,
    provider_id: identity.provider_id,
    entitlement_id: identity.entitlement_id,
    entitlement_type: entitlementType,
    model_id: identity.model_id,
    reported_usage: Object.freeze(reported),
    estimated_usage: Object.freeze(estimated),
    unknown_fields: Object.freeze(deriveUnknownFields(reported, descriptor, input.unknown_fields)),
    affinity: Object.freeze(normalizeAffinity(input.affinity)),
    routing: Object.freeze(normalizeRouting(input.routing)),
    outcome: Object.freeze(normalizeOutcome(input.outcome)),
    recorded_at: isoDate(recordedAt ?? input.recorded_at, 'recorded_at'),
  });
}

export function normalizeQuotaSnapshot(input, { descriptor = resolveDescriptor(null, null), snapshotId, observedAt } = {}) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'QUOTA_SNAPSHOT_INVALID', 'quota snapshot must be an object');
  rejectCredentialMaterial(input, '');

  const entitlementId = requiredString(input.entitlement_id, 'entitlement_id');
  const providerId = requiredString(input.provider_id, 'provider_id');

  const visibility = input.visibility ?? descriptor.usage_visibility;
  assert(QUOTA_VISIBILITY.has(visibility), 'QUOTA_SNAPSHOT_INVALID', 'visibility is not a contract value', { field: 'visibility' });

  const source = input.source ?? 'unknown';
  assert(QUOTA_SOURCES.has(source), 'QUOTA_SNAPSHOT_INVALID', 'source is not a contract value', { field: 'source' });

  const reported = input.reported ?? {};
  rejectUnknownKeys(reported, ['remaining', 'unit', 'resets_at'], 'reported');
  const reportedUnit = reported.unit ?? 'unknown';
  assert(USAGE_UNITS.has(reportedUnit), 'QUOTA_SNAPSHOT_INVALID', 'reported.unit is not a contract unit', { field: 'reported.unit' });
  const remaining = nullableAmount(reported.remaining, 'reported.remaining');

  if (remaining != null && !descriptor.remaining_quota_reported) {
    fail('USAGE_SEMANTICS_UNKNOWN', 'provider does not report remaining quota', { provider_id: providerId, field: 'reported.remaining' });
  }
  if (remaining != null && visibility === 'rate-limit-only') {
    fail('USAGE_SEMANTICS_UNKNOWN', 'a rate-limit-only provider exposes no remaining quota', { provider_id: providerId, field: 'reported.remaining' });
  }

  const rateLimit = input.observed_rate_limit ?? {};
  rejectUnknownKeys(rateLimit, ['limited', 'retry_after_seconds'], 'observed_rate_limit');

  const estimated = input.estimated ?? {};
  rejectUnknownKeys(estimated, ['capacity_score', 'confidence'], 'estimated');
  const capacityScore = nullableAmount(estimated.capacity_score, 'estimated.capacity_score');
  const capacityConfidence = nullableConfidence(estimated.confidence, 'estimated.confidence');

  // API-008 section 11: a capacity score is an internal operational estimate, so it
  // may never be attributed to the provider as a quota claim.
  if (capacityScore != null) {
    assert(source !== 'provider', 'ESTIMATE_SOURCE_CONFLICT', 'a scheduler capacity score cannot be sourced from the provider', { field: 'estimated.capacity_score' });
    assert(capacityConfidence != null, 'ESTIMATE_PROVENANCE_REQUIRED', 'a capacity score requires estimated.confidence', { field: 'estimated.confidence' });
  }

  return Object.freeze({
    schema: QUOTA_SNAPSHOT_SCHEMA,
    quota_snapshot_id: requiredString(snapshotId ?? input.quota_snapshot_id, 'quota_snapshot_id'),
    entitlement_id: entitlementId,
    provider_id: providerId,
    visibility,
    reported: Object.freeze({
      remaining,
      unit: reportedUnit,
      resets_at: isoDate(reported.resets_at, 'reported.resets_at', { nullable: true }),
    }),
    observed_rate_limit: Object.freeze({
      limited: rateLimit.limited === true,
      retry_after_seconds: nullableCount(rateLimit.retry_after_seconds, 'observed_rate_limit.retry_after_seconds'),
    }),
    estimated: Object.freeze({
      capacity_score: capacityScore,
      confidence: capacityConfidence,
    }),
    source,
    observed_at: isoDate(observedAt ?? input.observed_at, 'observed_at'),
  });
}

function groupKeyOf(event, by) {
  const key = {};
  for (const dimension of by) {
    key[dimension] = dimension === 'outcome' ? event.outcome.status : event[dimension];
  }
  return key;
}

function emptyTotals() {
  const reported = { coverage: {} };
  for (const field of REPORTED_FIELDS) {
    reported[field] = 0;
    reported.coverage[field] = 0;
  }
  const estimated = { coverage: {} };
  for (const field of ESTIMATED_FIELDS) {
    estimated[field] = 0;
    estimated.coverage[field] = 0;
  }
  return { reported, estimated };
}

// Reported and estimated totals are accumulated in separate buckets and never added
// together; coverage counts say how many events actually carried each field, so a
// total of 0 with coverage 0 cannot be read as measured zero usage.
export function aggregateUsageEvents(events, { by = ['entitlement_id'] } = {}) {
  const dimensions = Array.isArray(by) ? by : [by];
  assert(dimensions.length > 0, 'USAGE_AGGREGATION_INVALID', 'at least one grouping dimension is required', { field: 'by' });
  for (const dimension of dimensions) {
    assert(GROUP_KEYS.has(dimension), 'USAGE_AGGREGATION_INVALID', `${dimension} is not an aggregation dimension`, { field: 'by' });
  }

  const groups = new Map();
  for (const event of events) {
    const key = groupKeyOf(event, dimensions);
    const id = JSON.stringify(dimensions.map((dimension) => key[dimension] ?? null));
    if (!groups.has(id)) {
      const { reported, estimated } = emptyTotals();
      groups.set(id, {
        key,
        event_count: 0,
        reported_units: new Set(),
        reported,
        estimated,
        estimation_methods: new Set(),
        min_estimate_confidence: null,
        unknown_field_counts: {},
        outcomes: {},
      });
    }

    const group = groups.get(id);
    group.event_count += 1;
    group.reported_units.add(event.reported_usage.unit);
    group.outcomes[event.outcome.status] = (group.outcomes[event.outcome.status] ?? 0) + 1;

    for (const field of REPORTED_FIELDS) {
      const value = event.reported_usage[field];
      if (value == null) continue;
      group.reported[field] += value;
      group.reported.coverage[field] += 1;
    }

    for (const field of ESTIMATED_FIELDS) {
      const value = event.estimated_usage[field];
      if (value == null) continue;
      group.estimated[field] += value;
      group.estimated.coverage[field] += 1;
    }

    if (event.estimated_usage.method != null) group.estimation_methods.add(event.estimated_usage.method);
    if (event.estimated_usage.confidence != null) {
      group.min_estimate_confidence = group.min_estimate_confidence == null
        ? event.estimated_usage.confidence
        : Math.min(group.min_estimate_confidence, event.estimated_usage.confidence);
    }

    for (const field of event.unknown_fields) {
      group.unknown_field_counts[field] = (group.unknown_field_counts[field] ?? 0) + 1;
    }
  }

  return Object.freeze([...groups.values()].map((group) => Object.freeze({
    key: Object.freeze({ ...group.key }),
    event_count: group.event_count,
    reported_units: Object.freeze([...group.reported_units].sort()),
    reported: Object.freeze({ ...group.reported, coverage: Object.freeze({ ...group.reported.coverage }) }),
    estimated: Object.freeze({ ...group.estimated, coverage: Object.freeze({ ...group.estimated.coverage }) }),
    estimation_methods: Object.freeze([...group.estimation_methods].sort()),
    min_estimate_confidence: group.min_estimate_confidence,
    unknown_field_counts: Object.freeze({ ...group.unknown_field_counts }),
    outcomes: Object.freeze({ ...group.outcomes }),
  })));
}

export function createEntitlementUsageLedger({
  capabilityRegistry = null,
  clock = () => new Date(),
  idFactory = null,
  retentionDays = null,
} = {}) {
  assert(
    retentionDays == null || (Number.isInteger(retentionDays) && retentionDays > 0),
    'USAGE_LEDGER_INVALID',
    'retentionDays must be a positive integer or null',
    { field: 'retentionDays' },
  );

  const events = [];
  const quotaSnapshots = [];
  let sequence = 0;

  const nextId = (prefix) => {
    sequence += 1;
    return idFactory ? `${prefix}_${idFactory(sequence)}` : `${prefix}_${sequence}`;
  };

  function record(input) {
    const providerId = requiredString(input?.provider_id, 'provider_id');
    const descriptor = resolveDescriptor(capabilityRegistry, providerId);
    const event = normalizeUsageEvent(input, {
      descriptor,
      eventId: input?.event_id ?? nextId('usage'),
      recordedAt: input?.recorded_at ?? clock().toISOString(),
    });
    events.push(event);
    return event;
  }

  function recordQuotaSnapshot(input) {
    const providerId = requiredString(input?.provider_id, 'provider_id');
    const descriptor = resolveDescriptor(capabilityRegistry, providerId);
    const snapshot = normalizeQuotaSnapshot(input, {
      descriptor,
      snapshotId: input?.quota_snapshot_id ?? nextId('quota'),
      observedAt: input?.observed_at ?? clock().toISOString(),
    });
    quotaSnapshots.push(snapshot);
    return snapshot;
  }

  function matches(event, filter) {
    return Object.entries(filter).every(([field, value]) => (
      field === 'outcome' ? event.outcome.status === value : event[field] === value
    ));
  }

  function list({ filter = {} } = {}) {
    return Object.freeze(events.filter((event) => matches(event, filter)));
  }

  function aggregate({ by = ['entitlement_id'], filter = {} } = {}) {
    return aggregateUsageEvents(events.filter((event) => matches(event, filter)), { by });
  }

  function latestQuotaSnapshot(entitlementId) {
    for (let index = quotaSnapshots.length - 1; index >= 0; index -= 1) {
      if (quotaSnapshots[index].entitlement_id === entitlementId) return quotaSnapshots[index];
    }
    return null;
  }

  function purgeExpired(now = clock()) {
    if (retentionDays == null) return 0;
    const cutoff = now.getTime() - retentionDays * 86_400_000;
    let removed = 0;
    for (const collection of [events, quotaSnapshots]) {
      const field = collection === events ? 'recorded_at' : 'observed_at';
      for (let index = collection.length - 1; index >= 0; index -= 1) {
        if (Date.parse(collection[index][field]) < cutoff) {
          collection.splice(index, 1);
          removed += 1;
        }
      }
    }
    return removed;
  }

  return Object.freeze({
    record,
    recordQuotaSnapshot,
    list,
    aggregate,
    latestQuotaSnapshot,
    purgeExpired,
    retentionDays,
    inspectQuotaSnapshots() { return Object.freeze([...quotaSnapshots]); },
  });
}
