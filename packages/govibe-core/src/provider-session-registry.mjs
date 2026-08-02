import { randomUUID } from "node:crypto";

export class ProviderSessionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ProviderSessionError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function fail(code, message, details) {
  throw new ProviderSessionError(code, message, details);
}

function requireText(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    fail("INVALID_PROVIDER_SESSION", `${field} is required`, { field });
  }
  return value;
}

export function createProviderSessionRegistry({ clock = () => new Date(), idFactory = randomUUID } = {}) {
  const sessions = new Map();

  function createSession(input) {
    const principalId = requireText(input?.principal_id, "principal_id");
    const entitlementId = requireText(input?.entitlement_id, "entitlement_id");
    const providerId = requireText(input?.provider_id, "provider_id");
    const runId = requireText(input?.run_id, "run_id");
    const bindingId = requireText(input?.binding_id, "binding_id");
    const externalSessionId = input?.external_session_id ?? null;
    const ttlMs = input?.ttl_ms ?? 300_000;
    if (!Number.isInteger(ttlMs) || ttlMs <= 0) fail("INVALID_PROVIDER_SESSION", "ttl_ms must be a positive integer");

    const createdAt = clock();
    const record = Object.freeze({
      session_id: `ps_${idFactory()}`,
      external_session_id: externalSessionId,
      principal_id: principalId,
      entitlement_id: entitlementId,
      provider_id: providerId,
      run_id: runId,
      binding_id: bindingId,
      cross_run_reuse: input?.cross_run_reuse === true,
      cross_user_reuse: false,
      state: "active",
      created_at: createdAt.toISOString(),
      expires_at: new Date(createdAt.getTime() + ttlMs).toISOString(),
      revoked_at: null,
    });
    sessions.set(record.session_id, record);
    return record;
  }

  function assertUsable(sessionId, expected) {
    const session = sessions.get(sessionId);
    if (!session) fail("PROVIDER_SESSION_NOT_FOUND", "provider session was not found", { session_id: sessionId });
    if (session.state !== "active") fail("PROVIDER_SESSION_REVOKED", "provider session is not active", { session_id: sessionId });
    if (Date.parse(session.expires_at) <= clock().getTime()) fail("PROVIDER_SESSION_EXPIRED", "provider session expired", { session_id: sessionId });

    for (const field of ["principal_id", "entitlement_id", "provider_id", "binding_id"]) {
      if (session[field] !== expected?.[field]) fail("PROVIDER_SESSION_SCOPE_MISMATCH", `provider session ${field} mismatch`, { field });
    }
    if (session.run_id !== expected?.run_id && !session.cross_run_reuse) {
      fail("PROVIDER_SESSION_RUN_MISMATCH", "provider session cannot be reused across runs", { session_id: sessionId });
    }
    return session;
  }

  function revokeSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) fail("PROVIDER_SESSION_NOT_FOUND", "provider session was not found", { session_id: sessionId });
    const revoked = Object.freeze({ ...session, state: "revoked", revoked_at: clock().toISOString() });
    sessions.set(sessionId, revoked);
    return revoked;
  }

  function revokeByEntitlement(entitlementId) {
    let count = 0;
    for (const [sessionId, session] of sessions) {
      if (session.entitlement_id === entitlementId && session.state === "active") {
        sessions.set(sessionId, Object.freeze({ ...session, state: "revoked", revoked_at: clock().toISOString() }));
        count += 1;
      }
    }
    return count;
  }

  function inspect() {
    return Object.freeze([...sessions.values()].map(({ external_session_id, ...safe }) => Object.freeze(safe)));
  }

  return Object.freeze({ createSession, assertUsable, revokeSession, revokeByEntitlement, inspect });
}
