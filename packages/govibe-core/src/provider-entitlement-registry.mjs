const CAPABILITY_SCHEMA = 'govibe-provider-capability-descriptor/v1';
const ENTITLEMENT_SCHEMA = 'govibe-provider-entitlement/v1';

export const ENTITLEMENT_TYPES = Object.freeze([
  'personal_subscription',
  'business_seat',
  'organization_service',
  'api',
  'local_compute',
]);
const ENTITLEMENT_TYPE_SET = new Set(ENTITLEMENT_TYPES);
const OWNER_TYPES = new Set(['user', 'team', 'organization', 'service']);
const SHARE_POLICIES = new Set(['owner_only', 'named_principals', 'workspace_pool', 'organization_pool']);
const STATES = new Set(['active', 'suspended', 'revoked', 'expired']);
const USAGE_VISIBILITY = new Set(['detailed', 'partial', 'rate-limit-only', 'unknown']);
const FORBIDDEN_CREDENTIAL_FIELDS = new Set([
  'credential',
  'credentials',
  'access_token',
  'refresh_token',
  'api_key',
  'secret',
  'password',
]);

export class RegistryValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'RegistryValidationError';
    this.code = 'REGISTRY_VALIDATION_FAILED';
    this.details = details;
  }
}

function assert(condition, message, details) {
  if (!condition) throw new RegistryValidationError(message, details);
}

function requiredString(value, field) {
  assert(typeof value === 'string' && value.trim().length > 0, `${field} must be a non-empty string`, { field });
  return value.trim();
}

function stringArray(value, field, { required = false } = {}) {
  if (value == null && !required) return [];
  assert(Array.isArray(value), `${field} must be an array`, { field });
  const normalized = value.map((entry, index) => requiredString(entry, `${field}[${index}]`));
  return [...new Set(normalized)];
}

function nullablePositiveInteger(value, field) {
  if (value == null) return null;
  assert(Number.isInteger(value) && value >= 0, `${field} must be a non-negative integer or null`, { field });
  return value;
}

function isoDate(value, field, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  requiredString(value, field);
  assert(!Number.isNaN(Date.parse(value)), `${field} must be an ISO-compatible date`, { field });
  return value;
}

function rejectCredentialMaterial(record) {
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_CREDENTIAL_FIELDS.has(key.toLowerCase())) {
      throw new RegistryValidationError(`Raw credential field is prohibited: ${key}`, { field: key });
    }
  }
}

export function normalizeProviderCapabilityDescriptor(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'Capability descriptor must be an object');
  rejectCredentialMaterial(input);
  assert(input.schema === CAPABILITY_SCHEMA, `schema must be ${CAPABILITY_SCHEMA}`, { field: 'schema' });
  assert(USAGE_VISIBILITY.has(input.usage_visibility), 'Invalid usage_visibility', { field: 'usage_visibility' });

  const models = Array.isArray(input.models) ? input.models.map((model, index) => {
    assert(model && typeof model === 'object' && !Array.isArray(model), `models[${index}] must be an object`);
    return Object.freeze({
      model_id: requiredString(model.model_id, `models[${index}].model_id`),
      capabilities: stringArray(model.capabilities, `models[${index}].capabilities`),
      context_limit_tokens: nullablePositiveInteger(model.context_limit_tokens, `models[${index}].context_limit_tokens`),
      supports_tools: Boolean(model.supports_tools),
      supports_streaming: Boolean(model.supports_streaming),
      supports_reasoning_control: model.supports_reasoning_control == null ? null : Boolean(model.supports_reasoning_control),
    });
  }) : [];

  const entitlementTypes = stringArray(input.entitlement_types, 'entitlement_types', { required: true });
  entitlementTypes.forEach((type) => assert(ENTITLEMENT_TYPE_SET.has(type), `Invalid entitlement type: ${type}`, { field: 'entitlement_types' }));

  return Object.freeze({
    schema: CAPABILITY_SCHEMA,
    provider_id: requiredString(input.provider_id, 'provider_id'),
    adapter_id: requiredString(input.adapter_id, 'adapter_id'),
    adapter_version: requiredString(input.adapter_version, 'adapter_version'),
    executor_classes: stringArray(input.executor_classes, 'executor_classes', { required: true }),
    models: Object.freeze(models),
    entitlement_types: Object.freeze(entitlementTypes),
    usage_visibility: input.usage_visibility,
    token_usage_reported: Boolean(input.token_usage_reported),
    cached_token_usage_reported: Boolean(input.cached_token_usage_reported),
    remaining_quota_reported: Boolean(input.remaining_quota_reported),
    rate_limit_detectable: Boolean(input.rate_limit_detectable),
    supports_session_affinity: Boolean(input.supports_session_affinity),
    supports_prompt_cache_reference: Boolean(input.supports_prompt_cache_reference),
    supports_cancellation: Boolean(input.supports_cancellation),
    supports_parallel_runs: Boolean(input.supports_parallel_runs),
    credential_modes: Object.freeze(stringArray(input.credential_modes, 'credential_modes')),
    data_policy_tags: Object.freeze(stringArray(input.data_policy_tags, 'data_policy_tags')),
    observed_at: isoDate(input.observed_at, 'observed_at'),
  });
}

export function normalizeProviderEntitlement(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'Entitlement must be an object');
  rejectCredentialMaterial(input);
  assert(input.schema === ENTITLEMENT_SCHEMA, `schema must be ${ENTITLEMENT_SCHEMA}`, { field: 'schema' });
  assert(ENTITLEMENT_TYPE_SET.has(input.entitlement_type), 'Invalid entitlement_type', { field: 'entitlement_type' });
  assert(input.owner && typeof input.owner === 'object' && !Array.isArray(input.owner), 'owner is required', { field: 'owner' });
  assert(OWNER_TYPES.has(input.owner.owner_type), 'Invalid owner.owner_type', { field: 'owner.owner_type' });

  const ownerId = requiredString(input.owner.owner_id, 'owner.owner_id');
  const sharePolicy = input.share_policy ?? (input.entitlement_type === 'personal_subscription' ? 'owner_only' : null);
  assert(SHARE_POLICIES.has(sharePolicy), 'Invalid or missing share_policy', { field: 'share_policy' });
  if (input.entitlement_type === 'personal_subscription') {
    assert(sharePolicy === 'owner_only' || sharePolicy === 'named_principals', 'Personal subscriptions cannot default to pooled sharing', { field: 'share_policy' });
  }

  const state = input.state ?? 'active';
  assert(STATES.has(state), 'Invalid entitlement state', { field: 'state' });
  const validFrom = isoDate(input.valid_from, 'valid_from');
  const validUntil = isoDate(input.valid_until, 'valid_until', { nullable: true });
  if (validUntil != null) assert(Date.parse(validUntil) >= Date.parse(validFrom), 'valid_until must not precede valid_from');

  const sessionPolicy = input.session_policy ?? {};
  const crossUserReuse = sessionPolicy.cross_user_reuse === true;
  assert(!(sharePolicy === 'owner_only' && crossUserReuse), 'owner_only entitlements cannot enable cross-user session reuse');

  return Object.freeze({
    schema: ENTITLEMENT_SCHEMA,
    entitlement_id: requiredString(input.entitlement_id, 'entitlement_id'),
    version: requiredString(input.version, 'version'),
    provider_id: requiredString(input.provider_id, 'provider_id'),
    entitlement_type: input.entitlement_type,
    owner: Object.freeze({ owner_type: input.owner.owner_type, owner_id: ownerId }),
    share_policy: sharePolicy,
    allowed_principals: Object.freeze(stringArray(input.allowed_principals, 'allowed_principals')),
    allowed_roles: Object.freeze(stringArray(input.allowed_roles, 'allowed_roles')),
    allowed_workspaces: Object.freeze(stringArray(input.allowed_workspaces, 'allowed_workspaces')),
    allowed_projects: Object.freeze(stringArray(input.allowed_projects, 'allowed_projects')),
    data_classifications: Object.freeze(stringArray(input.data_classifications, 'data_classifications')),
    residency_policy: Object.freeze(stringArray(input.residency_policy, 'residency_policy')),
    credential_ref: input.credential_ref == null ? null : requiredString(input.credential_ref, 'credential_ref'),
    executor_classes: Object.freeze(stringArray(input.executor_classes, 'executor_classes', { required: true })),
    model_allowlist: Object.freeze(stringArray(input.model_allowlist, 'model_allowlist')),
    model_denylist: Object.freeze(stringArray(input.model_denylist, 'model_denylist')),
    concurrency: Object.freeze({
      max_active: nullablePositiveInteger(input.concurrency?.max_active, 'concurrency.max_active'),
      max_queued: nullablePositiveInteger(input.concurrency?.max_queued, 'concurrency.max_queued'),
    }),
    session_policy: Object.freeze({
      cross_run_reuse: sessionPolicy.cross_run_reuse === true,
      cross_user_reuse: crossUserReuse,
      ttl_seconds: nullablePositiveInteger(sessionPolicy.ttl_seconds, 'session_policy.ttl_seconds'),
    }),
    quota_policy_ref: input.quota_policy_ref == null ? null : requiredString(input.quota_policy_ref, 'quota_policy_ref'),
    state,
    valid_from: validFrom,
    valid_until: validUntil,
  });
}

export function createProviderCapabilityRegistry(initial = []) {
  const records = new Map();
  const register = (input) => {
    const record = normalizeProviderCapabilityDescriptor(input);
    records.set(record.provider_id, record);
    return record;
  };
  initial.forEach(register);
  return Object.freeze({
    register,
    get(providerId) { return records.get(providerId) ?? null; },
    inspect() { return [...records.values()]; },
    remove(providerId) { return records.delete(providerId); },
  });
}

function listAllows(list, value) {
  return list.length === 0 || (value != null && list.includes(value));
}

function isAuthorizedBySharePolicy(record, request) {
  if (record.share_policy === 'owner_only') return request.principal_id === record.owner.owner_id;
  if (record.share_policy === 'named_principals') {
    return request.principal_id === record.owner.owner_id || record.allowed_principals.includes(request.principal_id);
  }
  if (record.share_policy === 'workspace_pool') return listAllows(record.allowed_workspaces, request.workspace_id);
  if (record.share_policy === 'organization_pool') return record.owner.owner_type === 'organization' && request.organization_id === record.owner.owner_id;
  return false;
}

export function evaluateEntitlementEligibility(record, request, now = new Date()) {
  const reasons = [];
  const timestamp = now instanceof Date ? now.getTime() : Date.parse(now);
  if (record.state !== 'active') reasons.push(`ENTITLEMENT_${record.state.toUpperCase()}`);
  if (timestamp < Date.parse(record.valid_from)) reasons.push('ENTITLEMENT_NOT_YET_VALID');
  if (record.valid_until && timestamp > Date.parse(record.valid_until)) reasons.push('ENTITLEMENT_EXPIRED');
  if (!isAuthorizedBySharePolicy(record, request)) reasons.push('PRINCIPAL_NOT_AUTHORIZED');
  if (!listAllows(record.allowed_workspaces, request.workspace_id)) reasons.push('WORKSPACE_NOT_AUTHORIZED');
  if (!listAllows(record.allowed_projects, request.project_id)) reasons.push('PROJECT_NOT_AUTHORIZED');
  if (!listAllows(record.allowed_roles, request.role)) reasons.push('ROLE_NOT_AUTHORIZED');
  if (!listAllows(record.data_classifications, request.data_classification)) reasons.push('DATA_CLASSIFICATION_NOT_AUTHORIZED');
  if (!listAllows(record.executor_classes, request.executor_class)) reasons.push('EXECUTOR_CLASS_UNAVAILABLE');
  if (request.model_id && record.model_denylist.includes(request.model_id)) reasons.push('MODEL_DENIED');
  if (request.model_id && record.model_allowlist.length > 0 && !record.model_allowlist.includes(request.model_id)) reasons.push('MODEL_NOT_ALLOWED');
  return Object.freeze({ eligible: reasons.length === 0, reasons: Object.freeze(reasons) });
}

export function createEntitlementRegistry(initial = []) {
  const records = new Map();
  const register = (input) => {
    const record = normalizeProviderEntitlement(input);
    records.set(record.entitlement_id, record);
    return record;
  };
  initial.forEach(register);
  return Object.freeze({
    register,
    get(entitlementId) { return records.get(entitlementId) ?? null; },
    inspect() { return [...records.values()]; },
    remove(entitlementId) { return records.delete(entitlementId); },
    findEligible(request, now = new Date()) {
      return [...records.values()]
        .map((record) => ({ record, decision: evaluateEntitlementEligibility(record, request, now) }))
        .filter(({ decision }) => decision.eligible)
        .map(({ record }) => record);
    },
    explainEligibility(entitlementId, request, now = new Date()) {
      const record = records.get(entitlementId);
      if (!record) return Object.freeze({ eligible: false, reasons: Object.freeze(['ENTITLEMENT_NOT_FOUND']) });
      return evaluateEntitlementEligibility(record, request, now);
    },
  });
}
