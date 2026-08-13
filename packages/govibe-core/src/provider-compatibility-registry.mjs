import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

export const COMPATIBILITY_REGISTRY_SCHEMA = 'govibe-provider-entitlement-compatibility-registry/v1';
export const COMPATIBILITY_RECORD_SCHEMA = 'govibe-provider-entitlement-compatibility/v1';

const APPROVAL_STATES = new Set([
  'draft',
  'under_review',
  'approved_owner_only',
  'approved_shared',
  'suspended',
  'expired',
  'revoked',
  'unknown',
]);
const APPROVED_STATES = new Set(['approved_owner_only', 'approved_shared']);
const AUTHORIZATION_SCOPES = new Set([
  'owner_only',
  'named_users',
  'workspace',
  'organization',
  'service_identity',
  'local_host',
]);
const TELEMETRY_SEMANTICS = new Set(['provider_reported', 'govibe_estimated', 'unknown', 'not_applicable']);
const FORBIDDEN_FIELDS = new Set([
  'credential',
  'credentials',
  'access_token',
  'refresh_token',
  'api_key',
  'secret',
  'password',
  'cookie',
  'cookies',
  'session_token',
]);

export class ProviderCompatibilityError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ProviderCompatibilityError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details = {}) {
  throw new ProviderCompatibilityError(code, message, details);
}

function assert(condition, code, message, details = {}) {
  if (!condition) fail(code, message, details);
}

function requiredText(value, field) {
  assert(typeof value === 'string' && value.trim().length > 0, 'COMPATIBILITY_RECORD_INVALID', `${field} is required`, { field });
  return value.trim();
}

function nullableText(value, field) {
  if (value == null) return null;
  return requiredText(value, field);
}

function textArray(value, field) {
  if (value == null) return [];
  assert(Array.isArray(value), 'COMPATIBILITY_RECORD_INVALID', `${field} must be an array`, { field });
  return [...new Set(value.map((entry, index) => requiredText(entry, `${field}[${index}]`)))];
}

function isoDate(value, field, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = requiredText(value, field);
  assert(!Number.isNaN(Date.parse(normalized)), 'COMPATIBILITY_RECORD_INVALID', `${field} must be an ISO-compatible date`, { field });
  return normalized;
}

function rejectSensitiveMaterial(value, path = '') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectSensitiveMaterial(entry, `${path}[${index}].`));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    assert(!FORBIDDEN_FIELDS.has(key.toLowerCase()), 'COMPATIBILITY_RECORD_SECRET_MATERIAL', `compatibility registry must not contain credential or session material: ${path}${key}`, { field: `${path}${key}` });
    rejectSensitiveMaterial(nested, `${path}${key}.`);
  }
}

function normalizeTelemetryMap(input, field) {
  const out = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    assert(TELEMETRY_SEMANTICS.has(value), 'COMPATIBILITY_RECORD_INVALID', `${field}.${key} has invalid telemetry semantics`, { field: `${field}.${key}`, value });
    out[key] = value;
  }
  return Object.freeze(out);
}

export function normalizeCompatibilityRecord(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'COMPATIBILITY_RECORD_INVALID', 'compatibility record must be an object');
  rejectSensitiveMaterial(input);

  const schemaVersion = requiredText(input.schema_version, 'schema_version');
  assert(schemaVersion === COMPATIBILITY_RECORD_SCHEMA, 'COMPATIBILITY_RECORD_INVALID', `schema_version must be ${COMPATIBILITY_RECORD_SCHEMA}`, { field: 'schema_version' });
  assert(APPROVAL_STATES.has(input.approval_state), 'COMPATIBILITY_RECORD_INVALID', 'approval_state is invalid', { field: 'approval_state' });
  assert(AUTHORIZATION_SCOPES.has(input.approved_scope), 'COMPATIBILITY_RECORD_INVALID', 'approved_scope is invalid', { field: 'approved_scope' });

  const record = {
    record_id: requiredText(input.record_id, 'record_id'),
    schema_version: schemaVersion,
    version: requiredText(input.version, 'version'),
    provider: requiredText(input.provider, 'provider'),
    product: requiredText(input.product, 'product'),
    plan: requiredText(input.plan, 'plan'),
    execution_surface: requiredText(input.execution_surface, 'execution_surface'),
    entitlement_type: requiredText(input.entitlement_type, 'entitlement_type'),
    owner_type: requiredText(input.owner_type, 'owner_type'),
    permitted_user_model: requiredText(input.permitted_user_model, 'permitted_user_model'),
    approved_scope: input.approved_scope,
    automation_allowed: input.automation_allowed === true,
    credential_delegation_allowed: input.credential_delegation_allowed === true,
    session_reuse_allowed: input.session_reuse_allowed === true,
    session_isolation_domain: nullableText(input.session_isolation_domain, 'session_isolation_domain'),
    concurrent_use_allowed: input.concurrent_use_allowed === true,
    allowed_principals: Object.freeze(textArray(input.allowed_principals, 'allowed_principals')),
    allowed_workspaces: Object.freeze(textArray(input.allowed_workspaces, 'allowed_workspaces')),
    allowed_organizations: Object.freeze(textArray(input.allowed_organizations, 'allowed_organizations')),
    allowed_adapter_ids: Object.freeze(textArray(input.allowed_adapter_ids, 'allowed_adapter_ids')),
    quota_visibility: normalizeTelemetryMap(input.quota_visibility, 'quota_visibility'),
    cache_visibility: normalizeTelemetryMap(input.cache_visibility, 'cache_visibility'),
    evidence_refs: Object.freeze(textArray(input.evidence_refs, 'evidence_refs')),
    evidence_hashes: Object.freeze(textArray(input.evidence_hashes, 'evidence_hashes')),
    reviewer: nullableText(input.reviewer, 'reviewer'),
    approval_state: input.approval_state,
    approved_date: isoDate(input.approved_date, 'approved_date', { nullable: true }),
    expiry_date: isoDate(input.expiry_date, 'expiry_date', { nullable: true }),
    next_review_date: isoDate(input.next_review_date, 'next_review_date', { nullable: true }),
    restrictions: Object.freeze(textArray(input.restrictions, 'restrictions')),
    fail_closed_reasons: Object.freeze(textArray(input.fail_closed_reasons, 'fail_closed_reasons')),
  };

  if (APPROVED_STATES.has(record.approval_state)) {
    assert(record.reviewer != null, 'COMPATIBILITY_RECORD_INVALID', 'approved records require reviewer', { field: 'reviewer' });
    assert(record.approved_date != null, 'COMPATIBILITY_RECORD_INVALID', 'approved records require approved_date', { field: 'approved_date' });
    assert(record.expiry_date != null, 'COMPATIBILITY_RECORD_INVALID', 'approved records require expiry_date', { field: 'expiry_date' });
    assert(record.next_review_date != null, 'COMPATIBILITY_RECORD_INVALID', 'approved records require next_review_date', { field: 'next_review_date' });
    assert(record.evidence_refs.length > 0 && record.evidence_hashes.length > 0, 'COMPATIBILITY_RECORD_INVALID', 'approved records require evidence refs and hashes', { field: 'evidence_refs' });
    assert(record.provider !== '*' && record.product !== '*' && record.plan !== '*' && record.execution_surface !== '*', 'COMPATIBILITY_RECORD_INVALID', 'approved records cannot use wildcard provider/product/plan/surface values');
  }

  if (record.session_reuse_allowed) {
    assert(record.session_isolation_domain != null, 'COMPATIBILITY_RECORD_INVALID', 'session reuse requires an isolation domain', { field: 'session_isolation_domain' });
  }

  return Object.freeze(record);
}

function denied(reasonCode, record = null, details = {}) {
  return Object.freeze({
    eligible: false,
    code: 'PROVIDER_COMPATIBILITY_DENIED',
    reason_code: reasonCode,
    record_id: record?.record_id ?? null,
    record_version: record?.version ?? null,
    details: Object.freeze({ ...details }),
  });
}

function allowed(record) {
  return Object.freeze({
    eligible: true,
    code: 'PROVIDER_COMPATIBILITY_ALLOWED',
    reason_code: null,
    record_id: record.record_id,
    record_version: record.version,
    policy_ref: `compatibility:${record.record_id}:${record.version}`,
  });
}

function exactMatch(actual, expected) {
  return typeof actual === 'string' && actual === expected;
}

function scopeDecision(record, request) {
  if (record.approved_scope === 'owner_only') {
    return request.principal_id === request.owner_id ? null : 'PRINCIPAL_NOT_APPROVED';
  }
  if (record.approved_scope === 'named_users') {
    return request.principal_id === request.owner_id || record.allowed_principals.includes(request.principal_id)
      ? null
      : 'PRINCIPAL_NOT_APPROVED';
  }
  if (record.approved_scope === 'workspace') {
    return record.allowed_workspaces.includes(request.workspace_id) ? null : 'SHARE_SCOPE_NOT_APPROVED';
  }
  if (record.approved_scope === 'organization') {
    return record.allowed_organizations.includes(request.organization_id) ? null : 'SHARE_SCOPE_NOT_APPROVED';
  }
  if (record.approved_scope === 'service_identity') {
    return record.allowed_principals.includes(request.principal_id) ? null : 'PRINCIPAL_NOT_APPROVED';
  }
  if (record.approved_scope === 'local_host') {
    return request.requested_scope === 'local_host' ? null : 'SHARE_SCOPE_NOT_APPROVED';
  }
  return 'SHARE_SCOPE_NOT_APPROVED';
}

export function evaluateProviderCompatibility(record, request, now = new Date()) {
  if (!record) return denied('COMPATIBILITY_RECORD_MISSING');
  const timestamp = now instanceof Date ? now.getTime() : Date.parse(now);

  if (!exactMatch(request.provider, record.provider)
    || !exactMatch(request.product, record.product)
    || !exactMatch(request.plan, record.plan)
    || !exactMatch(request.entitlement_type, record.entitlement_type)) {
    return denied('PRODUCT_OR_PLAN_MISMATCH', record);
  }
  if (!exactMatch(request.execution_surface, record.execution_surface)) {
    return denied('EXECUTION_SURFACE_MISMATCH', record);
  }
  if (request.adapter_id && record.allowed_adapter_ids.length > 0 && !record.allowed_adapter_ids.includes(request.adapter_id)) {
    return denied('PROVIDER_POLICY_UNKNOWN', record, { field: 'adapter_id' });
  }

  if (record.approval_state === 'suspended') return denied('COMPATIBILITY_RECORD_SUSPENDED', record);
  if (record.approval_state === 'expired') return denied('COMPATIBILITY_RECORD_EXPIRED', record);
  if (record.approval_state === 'revoked') return denied('PROVIDER_POLICY_UNKNOWN', record, { state: 'revoked' });
  if (!APPROVED_STATES.has(record.approval_state)) return denied('PROVIDER_POLICY_UNKNOWN', record, { state: record.approval_state });
  if (record.expiry_date && timestamp >= Date.parse(record.expiry_date)) return denied('COMPATIBILITY_RECORD_EXPIRED', record);
  if (record.next_review_date && timestamp >= Date.parse(record.next_review_date)) return denied('EVIDENCE_STALE_OR_INVALID', record, { field: 'next_review_date' });
  if (request.evidence_valid === false || record.evidence_refs.length === 0 || record.evidence_hashes.length === 0) {
    return denied('EVIDENCE_STALE_OR_INVALID', record);
  }

  const scopeReason = scopeDecision(record, request);
  if (scopeReason) return denied(scopeReason, record);
  if (request.automation_requested === true && !record.automation_allowed) return denied('AUTOMATION_NOT_APPROVED', record);
  if (request.session_reuse_requested === true && !record.session_reuse_allowed) return denied('SESSION_REUSE_NOT_APPROVED', record);
  if (request.concurrent_use_requested === true && !record.concurrent_use_allowed) return denied('CONCURRENCY_NOT_APPROVED', record);
  if (request.credential_delegation_requested === true && !record.credential_delegation_allowed) return denied('CREDENTIAL_DELEGATION_NOT_APPROVED', record);

  return allowed(record);
}

function normalizeRegistryDocument(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'COMPATIBILITY_REGISTRY_INVALID', 'compatibility registry must be an object');
  assert(input.schema === COMPATIBILITY_REGISTRY_SCHEMA, 'COMPATIBILITY_REGISTRY_INVALID', `registry schema must be ${COMPATIBILITY_REGISTRY_SCHEMA}`, { field: 'schema' });
  assert(input.default_decision === 'deny', 'COMPATIBILITY_REGISTRY_INVALID', 'compatibility registry default_decision must be deny', { field: 'default_decision' });
  assert(Array.isArray(input.records), 'COMPATIBILITY_REGISTRY_INVALID', 'compatibility registry records must be an array', { field: 'records' });
  return input.records.map(normalizeCompatibilityRecord);
}

export function createProviderCompatibilityRegistry(initial = []) {
  const records = new Map();

  function register(input) {
    const record = normalizeCompatibilityRecord(input);
    records.set(record.record_id, record);
    return record;
  }

  initial.forEach(register);

  function explainEligibility(recordId, request, now = new Date()) {
    const record = records.get(recordId) ?? null;
    return evaluateProviderCompatibility(record, request, now);
  }

  function revoke(recordId) {
    const record = records.get(recordId);
    if (!record) return false;
    records.set(recordId, Object.freeze({ ...record, approval_state: 'revoked' }));
    return true;
  }

  return Object.freeze({
    register,
    get(recordId) { return records.get(recordId) ?? null; },
    inspect() { return Object.freeze([...records.values()]); },
    remove(recordId) { return records.delete(recordId); },
    revoke,
    explainEligibility,
  });
}

export function loadProviderCompatibilityRegistry(filePath) {
  const parsed = parseYaml(readFileSync(filePath, 'utf8'));
  return createProviderCompatibilityRegistry(normalizeRegistryDocument(parsed));
}
