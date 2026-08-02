import { randomUUID } from "node:crypto";

const ACTIVE = "active";
const REVOKED = "revoked";

export class CredentialVaultError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "CredentialVaultError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details) {
  throw new CredentialVaultError(code, message, details);
}

function requireText(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    fail("INVALID_CREDENTIAL_REQUEST", `${field} is required`, { field });
  }
  return value;
}

function toSecretBytes(secret) {
  if (secret instanceof Uint8Array) return new Uint8Array(secret);
  if (typeof secret === "string" && secret.length > 0) return new TextEncoder().encode(secret);
  fail("INVALID_CREDENTIAL_SECRET", "secret must be a non-empty string or Uint8Array");
}

function wipe(bytes) {
  if (bytes instanceof Uint8Array) bytes.fill(0);
}

function nowIso(clock) {
  return clock().toISOString();
}

function assertFuture(dateValue, clock, field) {
  const timestamp = Date.parse(dateValue);
  if (!Number.isFinite(timestamp)) fail("INVALID_CREDENTIAL_REQUEST", `${field} must be an ISO timestamp`, { field });
  if (timestamp <= clock().getTime()) fail("CREDENTIAL_EXPIRED", `${field} is not in the future`, { field });
  return new Date(timestamp).toISOString();
}

export function createInMemorySecretBackend() {
  const entries = new Map();

  return Object.freeze({
    put(ref, bytes) {
      if (entries.has(ref)) fail("CREDENTIAL_REF_CONFLICT", "credential reference already exists", { credential_ref: ref });
      entries.set(ref, new Uint8Array(bytes));
    },
    read(ref) {
      const bytes = entries.get(ref);
      if (!bytes) fail("CREDENTIAL_NOT_FOUND", "credential reference was not found", { credential_ref: ref });
      return new Uint8Array(bytes);
    },
    delete(ref) {
      const bytes = entries.get(ref);
      if (bytes) wipe(bytes);
      entries.delete(ref);
    },
    has(ref) {
      return entries.has(ref);
    },
  });
}

export function createCredentialVault({
  backend = createInMemorySecretBackend(),
  clock = () => new Date(),
  idFactory = randomUUID,
  defaultGrantTtlMs = 60_000,
} = {}) {
  const credentials = new Map();
  const grants = new Map();

  function registerCredential(input) {
    const credentialRef = requireText(input?.credential_ref, "credential_ref");
    const entitlementId = requireText(input?.entitlement_id, "entitlement_id");
    const ownerId = requireText(input?.owner_id, "owner_id");
    const providerId = requireText(input?.provider_id, "provider_id");
    const validUntil = input?.valid_until ? assertFuture(input.valid_until, clock, "valid_until") : null;
    const secretBytes = toSecretBytes(input?.secret);

    try {
      backend.put(credentialRef, secretBytes);
    } finally {
      wipe(secretBytes);
    }

    const record = Object.freeze({
      credential_ref: credentialRef,
      entitlement_id: entitlementId,
      owner_id: ownerId,
      provider_id: providerId,
      state: ACTIVE,
      valid_until: validUntil,
      created_at: nowIso(clock),
      revoked_at: null,
    });
    credentials.set(credentialRef, record);
    return record;
  }

  function revokeCredential(credentialRef) {
    const current = credentials.get(credentialRef);
    if (!current) fail("CREDENTIAL_NOT_FOUND", "credential reference was not found", { credential_ref: credentialRef });
    if (current.state === REVOKED) return current;

    const revoked = Object.freeze({ ...current, state: REVOKED, revoked_at: nowIso(clock) });
    credentials.set(credentialRef, revoked);
    for (const [grantId, grant] of grants) {
      if (grant.credential_ref === credentialRef && grant.state === ACTIVE) {
        grants.set(grantId, Object.freeze({ ...grant, state: REVOKED, revoked_at: nowIso(clock) }));
      }
    }
    backend.delete(credentialRef);
    return revoked;
  }

  function issueGrant(input) {
    const credentialRef = requireText(input?.credential_ref, "credential_ref");
    const entitlementId = requireText(input?.entitlement_id, "entitlement_id");
    const principalId = requireText(input?.principal_id, "principal_id");
    const runId = requireText(input?.run_id, "run_id");
    const bindingId = requireText(input?.binding_id, "binding_id");
    const providerId = requireText(input?.provider_id, "provider_id");
    const credential = credentials.get(credentialRef);

    if (!credential) fail("CREDENTIAL_NOT_FOUND", "credential reference was not found", { credential_ref: credentialRef });
    if (credential.state !== ACTIVE) fail("CREDENTIAL_REVOKED", "credential is not active", { credential_ref: credentialRef });
    if (credential.entitlement_id !== entitlementId) fail("ENTITLEMENT_SUBSTITUTION_DENIED", "credential is bound to a different entitlement");
    if (credential.owner_id !== principalId) fail("CREDENTIAL_PRINCIPAL_MISMATCH", "principal does not own this credential");
    if (credential.provider_id !== providerId) fail("CREDENTIAL_PROVIDER_MISMATCH", "credential is bound to a different provider");
    if (credential.valid_until && Date.parse(credential.valid_until) <= clock().getTime()) {
      fail("CREDENTIAL_EXPIRED", "credential has expired", { credential_ref: credentialRef });
    }

    const ttlMs = input?.ttl_ms ?? defaultGrantTtlMs;
    if (!Number.isInteger(ttlMs) || ttlMs <= 0) fail("INVALID_CREDENTIAL_REQUEST", "ttl_ms must be a positive integer");

    const grantId = `grant_${idFactory()}`;
    const issuedAt = clock();
    const grant = Object.freeze({
      grant_id: grantId,
      credential_ref: credentialRef,
      entitlement_id: entitlementId,
      principal_id: principalId,
      run_id: runId,
      binding_id: bindingId,
      provider_id: providerId,
      state: ACTIVE,
      one_time: input?.one_time !== false,
      issued_at: issuedAt.toISOString(),
      expires_at: new Date(issuedAt.getTime() + ttlMs).toISOString(),
      consumed_at: null,
      revoked_at: null,
    });
    grants.set(grantId, grant);
    return grant;
  }

  function validateGrant(grantId, expected) {
    const grant = grants.get(grantId);
    if (!grant) fail("CREDENTIAL_GRANT_NOT_FOUND", "credential grant was not found", { grant_id: grantId });
    if (grant.state === REVOKED) fail("CREDENTIAL_GRANT_REVOKED", "credential grant was revoked", { grant_id: grantId });
    if (grant.state === "consumed") fail("CREDENTIAL_GRANT_CONSUMED", "credential grant was already consumed", { grant_id: grantId });
    if (Date.parse(grant.expires_at) <= clock().getTime()) fail("CREDENTIAL_GRANT_EXPIRED", "credential grant expired", { grant_id: grantId });

    for (const field of ["entitlement_id", "principal_id", "run_id", "binding_id", "provider_id"]) {
      if (grant[field] !== expected?.[field]) fail("CREDENTIAL_GRANT_SCOPE_MISMATCH", `credential grant ${field} mismatch`, { field });
    }

    const credential = credentials.get(grant.credential_ref);
    if (!credential || credential.state !== ACTIVE || !backend.has(grant.credential_ref)) {
      fail("CREDENTIAL_REVOKED", "credential is no longer available", { credential_ref: grant.credential_ref });
    }
    if (credential.valid_until && Date.parse(credential.valid_until) <= clock().getTime()) {
      fail("CREDENTIAL_EXPIRED", "credential has expired", { credential_ref: grant.credential_ref });
    }
    return { grant, credential };
  }

  async function withCredential(grantId, expected, consumer) {
    if (typeof consumer !== "function") fail("INVALID_CREDENTIAL_REQUEST", "consumer must be a function");
    const { grant } = validateGrant(grantId, expected);
    const secretBytes = backend.read(grant.credential_ref);

    try {
      return await consumer(secretBytes);
    } finally {
      wipe(secretBytes);
      if (grant.one_time) {
        grants.set(grantId, Object.freeze({ ...grant, state: "consumed", consumed_at: nowIso(clock) }));
      }
    }
  }

  function revokeGrant(grantId) {
    const grant = grants.get(grantId);
    if (!grant) fail("CREDENTIAL_GRANT_NOT_FOUND", "credential grant was not found", { grant_id: grantId });
    const revoked = Object.freeze({ ...grant, state: REVOKED, revoked_at: nowIso(clock) });
    grants.set(grantId, revoked);
    return revoked;
  }

  function inspect() {
    return Object.freeze({
      credentials: [...credentials.values()].map(({ credential_ref, entitlement_id, owner_id, provider_id, state, valid_until }) =>
        Object.freeze({ credential_ref, entitlement_id, owner_id, provider_id, state, valid_until }),
      ),
      grants: [...grants.values()].map(({ credential_ref, ...safeGrant }) => Object.freeze(safeGrant)),
    });
  }

  return Object.freeze({ registerCredential, revokeCredential, issueGrant, withCredential, revokeGrant, inspect });
}
