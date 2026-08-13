const RUN_RESULT_SCHEMA = 'govibe-provider-run-result/v1';
const CANDIDATE_SCHEMA = 'govibe-provider-candidate/v1';
const ADAPTER_POLICY_SCHEMA = 'govibe-provider-adapter-policy/v1';

const TERMINAL_STATES = new Set(['completed', 'failed', 'rate_limited', 'cancelled', 'timed_out']);
const APPROVAL_STATES = new Set(['approved', 'pending', 'denied']);

const CANDIDATE_ARRAYS = ['source_manifest', 'assumptions', 'artifacts', 'relation_candidates', 'verification_hints'];

const REPORTED_TOKEN_FIELDS = ['input_tokens', 'output_tokens', 'reasoning_tokens'];
const REPORTED_USAGE_FIELDS = [...REPORTED_TOKEN_FIELDS, 'cached_input_tokens', 'provider_credits', 'request_count'];

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

export class ProviderAdapterError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ProviderAdapterError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details) {
  throw new ProviderAdapterError(code, message, details);
}

function assert(condition, code, message, details) {
  if (!condition) fail(code, message, details);
}

function requiredString(value, field, code = 'PROVIDER_RESULT_INVALID') {
  assert(typeof value === 'string' && value.trim().length > 0, code, `${field} must be a non-empty string`, { field });
  return value.trim();
}

function nullableString(value, field, code = 'PROVIDER_RESULT_INVALID') {
  if (value == null) return null;
  return requiredString(value, field, code);
}

function isoDate(value, field, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  requiredString(value, field);
  assert(!Number.isNaN(Date.parse(value)), 'PROVIDER_RESULT_INVALID', `${field} must be an ISO-compatible date`, { field });
  return value;
}

function stringArray(value, field, code = 'PROVIDER_RESULT_INVALID') {
  if (value == null) return [];
  assert(Array.isArray(value), code, `${field} must be an array`, { field });
  return value.map((entry, index) => requiredString(entry, `${field}[${index}]`, code));
}

function stripCredentialMaterial(value, path = '') {
  if (Array.isArray(value)) return value.map((entry, index) => stripCredentialMaterial(entry, `${path}[${index}]`));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_CREDENTIAL_FIELDS.has(key.toLowerCase())) {
      fail('PROVIDER_RESULT_CREDENTIAL_MATERIAL', `adapter output must not carry credential material: ${path}${key}`, { field: `${path}${key}` });
    }
    out[key] = stripCredentialMaterial(nested, `${path}${key}.`);
  }
  return out;
}

// API-008 section 9: an adapter may propose, never assert canonical identity.
// A `gks:` identifier in adapter output would be a self-assigned canonical claim.
function rejectCanonicalIdentities(value, path) {
  if (typeof value === 'string' && value.trim().toLowerCase().startsWith('gks:')) {
    fail('PROVIDER_CANDIDATE_CANONICAL_IDENTITY', `adapter output must not assert a canonical identity: ${path}`, { field: path, value });
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectCanonicalIdentities(entry, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) rejectCanonicalIdentities(nested, `${path}.${key}`);
  }
}

export function normalizeProviderCandidate(input, { providerId, requestId } = {}) {
  const candidate = input ?? {};
  const schema = candidate.schema ?? CANDIDATE_SCHEMA;
  assert(schema === CANDIDATE_SCHEMA, 'PROVIDER_CANDIDATE_SCHEMA_UNSUPPORTED', `candidate schema must be ${CANDIDATE_SCHEMA}`, { schema });

  const normalized = {
    schema: CANDIDATE_SCHEMA,
    provider_id: requiredString(candidate.provider_id ?? providerId, 'candidate.provider_id'),
    provider_version: nullableString(candidate.provider_version, 'candidate.provider_version'),
    request_id: requiredString(candidate.request_id ?? requestId, 'candidate.request_id'),
    requested_scope: stripCredentialMaterial(candidate.requested_scope ?? {}, 'candidate.requested_scope.'),
  };
  assert(
    normalized.requested_scope && typeof normalized.requested_scope === 'object' && !Array.isArray(normalized.requested_scope),
    'PROVIDER_RESULT_INVALID',
    'candidate.requested_scope must be an object',
    { field: 'candidate.requested_scope' },
  );

  for (const field of CANDIDATE_ARRAYS) {
    const value = candidate[field] ?? [];
    assert(Array.isArray(value), 'PROVIDER_RESULT_INVALID', `candidate.${field} must be an array`, { field: `candidate.${field}` });
    normalized[field] = stripCredentialMaterial(value, `candidate.${field}`);
  }

  assert(
    normalized.provider_id === (providerId ?? normalized.provider_id),
    'PROVIDER_CANDIDATE_PROVIDER_MISMATCH',
    'candidate provider does not match the dispatched provider',
    { field: 'candidate.provider_id' },
  );

  rejectCanonicalIdentities(normalized.requested_scope, 'candidate.requested_scope');
  for (const field of CANDIDATE_ARRAYS) rejectCanonicalIdentities(normalized[field], `candidate.${field}`);

  return Object.freeze({
    ...normalized,
    requested_scope: Object.freeze(normalized.requested_scope),
    ...Object.fromEntries(CANDIDATE_ARRAYS.map((field) => [field, Object.freeze(normalized[field])])),
  });
}

function normalizeErrors(value) {
  if (value == null) return [];
  assert(Array.isArray(value), 'PROVIDER_RESULT_INVALID', 'normalized_errors must be an array', { field: 'normalized_errors' });
  return value.map((entry, index) => Object.freeze({
    code: requiredString(entry?.code, `normalized_errors[${index}].code`),
    message: requiredString(entry?.message, `normalized_errors[${index}].message`),
    retryable: entry?.retryable === true,
  }));
}

export function normalizeProviderRunResult(input, { providerId, bindingId, runResultId, startedAt, completedAt } = {}) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'PROVIDER_RESULT_INVALID', 'run result must be an object');

  const schema = input.schema ?? RUN_RESULT_SCHEMA;
  assert(schema === RUN_RESULT_SCHEMA, 'PROVIDER_RESULT_SCHEMA_UNSUPPORTED', `run result schema must be ${RUN_RESULT_SCHEMA}`, { schema });

  const status = input.status;
  assert(TERMINAL_STATES.has(status), 'PROVIDER_RESULT_INVALID', 'status is not a contract terminal state', { field: 'status', status });

  const errors = normalizeErrors(input.normalized_errors);
  assert(
    status === 'completed' ? errors.length === 0 : errors.length > 0,
    'PROVIDER_RESULT_INVALID',
    status === 'completed'
      ? 'a completed run cannot carry normalized errors'
      : 'a non-completed run must carry at least one normalized error',
    { field: 'normalized_errors', status },
  );

  const resolvedBindingId = requiredString(input.binding_id ?? bindingId, 'binding_id');
  const requestId = requiredString(input.candidate?.request_id ?? input.provider_request_id ?? resolvedBindingId, 'candidate.request_id');

  return Object.freeze({
    schema: RUN_RESULT_SCHEMA,
    run_result_id: requiredString(input.run_result_id ?? runResultId, 'run_result_id'),
    binding_id: resolvedBindingId,
    provider_request_id: nullableString(input.provider_request_id, 'provider_request_id'),
    provider_session_id: nullableString(input.provider_session_id, 'provider_session_id'),
    status,
    started_at: isoDate(input.started_at ?? startedAt, 'started_at'),
    completed_at: isoDate(input.completed_at ?? completedAt, 'completed_at', { nullable: true }),
    candidate: normalizeProviderCandidate(input.candidate, { providerId, requestId }),
    provider_usage: Object.freeze(stripCredentialMaterial(input.provider_usage ?? {}, 'provider_usage.')),
    normalized_errors: Object.freeze(errors),
    retryable: input.retryable === true,
  });
}

const FAILURE_SHAPES = Object.freeze({
  PROVIDER_RATE_LIMITED: { status: 'rate_limited', retryable: true },
  PROVIDER_UNAVAILABLE: { status: 'failed', retryable: true },
  PROVIDER_TIMED_OUT: { status: 'timed_out', retryable: true },
  PROVIDER_CANCELLED: { status: 'cancelled', retryable: false },
  SESSION_AFFINITY_UNAVAILABLE: { status: 'failed', retryable: true },
  CREDENTIAL_UNAVAILABLE: { status: 'failed', retryable: false },
  PROVIDER_REJECTED: { status: 'failed', retryable: false },
});

// An adapter may throw anything. Callers still get exactly one contract terminal
// state, and an unrecognized failure is never guessed as retryable.
export function normalizeAdapterFailure(error) {
  const code = typeof error?.code === 'string' && FAILURE_SHAPES[error.code] ? error.code : 'PROVIDER_REJECTED';
  const shape = FAILURE_SHAPES[code];
  return Object.freeze({
    code,
    status: shape.status,
    retryable: shape.retryable,
    message: typeof error?.message === 'string' && error.message.trim() !== '' ? error.message : code,
  });
}

// Only fields the descriptor declares are read. Everything else stays null and is
// named, so an adapter cannot widen a provider's telemetry by reporting more.
export function extractProviderUsage(runResult, descriptor) {
  const visibility = descriptor?.usage_visibility ?? 'unknown';
  const tokensReported = descriptor?.token_usage_reported === true;
  const cacheReported = descriptor?.cached_token_usage_reported === true;
  const raw = runResult?.provider_usage ?? {};

  const allowed = new Set();
  if (tokensReported) for (const field of REPORTED_TOKEN_FIELDS) allowed.add(field);
  if (cacheReported) allowed.add('cached_input_tokens');
  if (visibility !== 'unknown') {
    allowed.add('provider_credits');
    allowed.add('request_count');
  }

  const reported = { unit: typeof raw.unit === 'string' ? raw.unit : 'unknown' };
  const unknownFields = [];
  for (const field of REPORTED_USAGE_FIELDS) {
    const value = allowed.has(field) ? raw[field] : null;
    reported[field] = value == null ? null : value;
    if (reported[field] == null) unknownFields.push(field);
  }

  return Object.freeze({
    visibility,
    reported_usage: Object.freeze(reported),
    unknown_fields: Object.freeze(unknownFields.sort()),
    not_applicable_fields: Object.freeze([]),
  });
}

export function normalizeAdapterPolicyRecord(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'ADAPTER_POLICY_INVALID', 'adapter policy record must be an object');
  assert(input.schema === ADAPTER_POLICY_SCHEMA, 'ADAPTER_POLICY_INVALID', `schema must be ${ADAPTER_POLICY_SCHEMA}`, { field: 'schema' });

  const approvalState = input.approval_state;
  assert(APPROVAL_STATES.has(approvalState), 'ADAPTER_POLICY_INVALID', 'approval_state is not a policy value', { field: 'approval_state' });

  const record = {
    schema: ADAPTER_POLICY_SCHEMA,
    provider_id: requiredString(input.provider_id, 'provider_id', 'ADAPTER_POLICY_INVALID'),
    adapter_id: requiredString(input.adapter_id, 'adapter_id', 'ADAPTER_POLICY_INVALID'),
    adapter_version: requiredString(input.adapter_version, 'adapter_version', 'ADAPTER_POLICY_INVALID'),
    entitlement_types: stringArray(input.entitlement_types, 'entitlement_types', 'ADAPTER_POLICY_INVALID'),
    allowed_executor_classes: stringArray(input.allowed_executor_classes, 'allowed_executor_classes', 'ADAPTER_POLICY_INVALID'),
    approval_state: approvalState,
    cross_user_session_reuse: input.cross_user_session_reuse === true,
    policy_ref: requiredString(input.policy_ref, 'policy_ref', 'ADAPTER_POLICY_INVALID'),
    approved_by: nullableString(input.approved_by, 'approved_by', 'ADAPTER_POLICY_INVALID'),
    approved_at: input.approved_at == null ? null : isoDate(input.approved_at, 'approved_at'),
  };

  if (approvalState === 'approved') {
    assert(record.approved_by != null, 'ADAPTER_POLICY_INVALID', 'an approved adapter policy requires approved_by', { field: 'approved_by' });
    assert(record.approved_at != null, 'ADAPTER_POLICY_INVALID', 'an approved adapter policy requires approved_at', { field: 'approved_at' });
  }
  // The sharing policy denies cross-user provider sessions until a provider-specific
  // review approves it, so an adapter record cannot enable it on its own.
  assert(!record.cross_user_session_reuse, 'ADAPTER_POLICY_CROSS_USER_DENIED', 'cross-user session reuse is denied by the sharing policy', { field: 'cross_user_session_reuse' });

  return Object.freeze({
    ...record,
    entitlement_types: Object.freeze(record.entitlement_types),
    allowed_executor_classes: Object.freeze(record.allowed_executor_classes),
  });
}

export function createProviderAdapterHost({
  executorRegistry,
  capabilityRegistry = null,
  policyRecords = [],
  clock = () => new Date(),
  idFactory = null,
} = {}) {
  assert(
    executorRegistry && typeof executorRegistry.execute === 'function',
    'EXECUTOR_REGISTRY_REQUIRED',
    'a governed executor registry is required',
  );

  const policiesByProvider = new Map();
  const policiesByAdapter = new Map();
  for (const input of policyRecords) {
    const record = normalizeAdapterPolicyRecord(input);
    policiesByProvider.set(record.provider_id, record);
    policiesByAdapter.set(record.adapter_id, record);
  }

  let sequence = 0;
  const nextId = () => {
    sequence += 1;
    return idFactory ? `run_${idFactory(sequence)}` : `run_${sequence}`;
  };

  function policyFor(providerId, adapterId = null) {
    const adapterPolicy = adapterId ? policiesByAdapter.get(adapterId) ?? null : null;
    if (adapterPolicy && adapterPolicy.provider_id !== providerId) {
      fail('ADAPTER_POLICY_PROVIDER_MISMATCH', 'adapter policy does not belong to the dispatch provider', {
        provider_id: providerId,
        adapter_id: adapterId,
        policy_provider_id: adapterPolicy.provider_id,
      });
    }
    return adapterPolicy ?? policiesByProvider.get(providerId) ?? null;
  }

  function enablement(providerId, adapterId = null) {
    const policy = policyFor(providerId, adapterId);
    if (!policy) return { enabled: false, reason: 'ADAPTER_POLICY_MISSING', policy: null };
    if (policy.approval_state !== 'approved') return { enabled: false, reason: 'ADAPTER_POLICY_NOT_APPROVED', policy };
    if (!capabilityRegistry?.get?.(providerId)) return { enabled: false, reason: 'PROVIDER_DESCRIPTOR_MISSING', policy };
    return { enabled: true, reason: null, policy };
  }

  function assertEnabled(providerId, adapterId = null) {
    const state = enablement(providerId, adapterId);
    if (!state.enabled) {
      fail(state.reason, `provider adapter is not enabled: ${providerId}`, {
        provider_id: providerId,
        adapter_id: adapterId,
        reason: state.reason,
      });
    }
    return state.policy;
  }

  function inspect() {
    const dispatchable = new Map(
      (typeof executorRegistry.inspect === 'function' ? executorRegistry.inspect() : []).map((entry) => [entry.id, entry]),
    );
    const providerIds = [...new Set([...dispatchable.keys(), ...policiesByProvider.keys()])].sort();
    return Object.freeze(providerIds.map((providerId) => {
      const state = enablement(providerId);
      const descriptor = capabilityRegistry?.get?.(providerId) ?? null;
      return Object.freeze({
        provider_id: providerId,
        adapter_available: dispatchable.get(providerId)?.available === true,
        enabled: state.enabled && dispatchable.get(providerId)?.available === true,
        blocked_reason: state.enabled
          ? (dispatchable.get(providerId)?.available === true ? null : 'ADAPTER_UNAVAILABLE')
          : state.reason,
        approval_state: state.policy?.approval_state ?? null,
        policy_ref: state.policy?.policy_ref ?? null,
        usage_visibility: descriptor?.usage_visibility ?? 'unknown',
      });
    }));
  }

  function failureResult(providerId, request, failure, startedAt) {
    const bindingId = request?.executionBinding?.binding_id;
    return normalizeProviderRunResult({
      binding_id: bindingId,
      provider_request_id: null,
      provider_session_id: request?.executionBinding?.provider_session_id ?? null,
      status: failure.status,
      candidate: { provider_id: providerId, request_id: bindingId },
      provider_usage: {},
      normalized_errors: [{ code: failure.code, message: failure.message, retryable: failure.retryable }],
      retryable: failure.retryable,
    }, {
      providerId,
      bindingId,
      runResultId: nextId(),
      startedAt,
      completedAt: clock().toISOString(),
    });
  }

  async function execute(providerId, request) {
    const adapterId = request?.executionBinding?.adapter_id ?? null;
    assertEnabled(providerId, adapterId);
    const startedAt = clock().toISOString();
    let raw;
    try {
      raw = await executorRegistry.execute(providerId, request);
    } catch (error) {
      // A governance rejection is not a provider terminal state; it must surface.
      if (error instanceof ProviderAdapterError) throw error;
      if (typeof error?.code === 'string' && !FAILURE_SHAPES[error.code]) throw error;
      return failureResult(providerId, request, normalizeAdapterFailure(error), startedAt);
    }

    return normalizeProviderRunResult(raw ?? {}, {
      providerId,
      bindingId: request?.executionBinding?.binding_id,
      runResultId: nextId(),
      startedAt,
      completedAt: clock().toISOString(),
    });
  }

  async function cancel(providerId, request) {
    assertEnabled(providerId);
    const startedAt = clock().toISOString();
    const runId = request?.run_id ?? request?.executionBinding?.run_id;
    try {
      await executorRegistry.cancel(providerId, runId);
    } catch (error) {
      if (typeof error?.code === 'string' && !FAILURE_SHAPES[error.code]) throw error;
      return failureResult(providerId, request, normalizeAdapterFailure(error), startedAt);
    }
    return failureResult(providerId, request, normalizeAdapterFailure({ code: 'PROVIDER_CANCELLED', message: 'run cancelled by request' }), startedAt);
  }

  return Object.freeze({
    inspect,
    execute,
    cancel,
    enablement,
    usageFor(runResult) {
      return extractProviderUsage(runResult, capabilityRegistry?.get?.(runResult?.candidate?.provider_id) ?? null);
    },
  });
}
