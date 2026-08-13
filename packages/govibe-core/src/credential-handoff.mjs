const DERIVED_HANDOFF_SCHEMA = 'govibe-credential-handoff/v1';

export const CREDENTIAL_HANDOFF_MODES = Object.freeze(['none', 'raw_secret', 'derived_token']);

export class CredentialHandoffError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'CredentialHandoffError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details) {
  throw new CredentialHandoffError(code, message, details);
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('CREDENTIAL_HANDOFF_INVALID', `${field} is required`, { field });
  }
  return value;
}

export function normalizeCredentialMode(value, field = 'credential_mode') {
  if (value == null) return null;
  if (!CREDENTIAL_HANDOFF_MODES.includes(value)) {
    fail('CREDENTIAL_MODE_INVALID', `${field} is unsupported`, { field });
  }
  return value;
}

function sameBytes(left, right) {
  if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array) || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function toBytes(value) {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (typeof value === 'string') return new TextEncoder().encode(value);
  return null;
}

function normalizeDerivedResult(result) {
  if (typeof result === 'string') return { token: result, token_type: 'opaque' };
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    fail('CREDENTIAL_HANDOFF_INVALID', 'credential deriver must return an opaque token');
  }

  const allowedFields = new Set(['token', 'token_type']);
  for (const field of Object.keys(result)) {
    if (!allowedFields.has(field)) {
      fail('CREDENTIAL_HANDOFF_INVALID', 'credential deriver returned an unsupported field', { field });
    }
  }
  return { token: result.token, token_type: result.token_type ?? 'opaque' };
}

export function normalizeDerivedCredentialHandoff({
  provider_id,
  adapter_id,
  binding_id,
  derived,
  raw_secret = null,
} = {}) {
  const providerId = requireText(provider_id, 'provider_id');
  const adapterId = requireText(adapter_id, 'adapter_id');
  const bindingId = requireText(binding_id, 'binding_id');
  const result = normalizeDerivedResult(derived);
  const token = requireText(result.token, 'derived_token');
  const tokenType = requireText(result.token_type, 'token_type');

  const rawBytes = toBytes(raw_secret);
  const tokenBytes = toBytes(token);
  if (rawBytes && tokenBytes && sameBytes(rawBytes, tokenBytes)) {
    fail('CREDENTIAL_DERIVATION_RAW_SECRET_REUSED', 'credential deriver returned the raw credential material');
  }

  return Object.freeze({
    schema: DERIVED_HANDOFF_SCHEMA,
    mode: 'derived_token',
    provider_id: providerId,
    adapter_id: adapterId,
    binding_id: bindingId,
    token_type: tokenType,
    token,
  });
}

export { DERIVED_HANDOFF_SCHEMA };
