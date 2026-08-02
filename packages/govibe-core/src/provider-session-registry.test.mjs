import { describe, expect, it } from "vitest";
import { createProviderSessionRegistry } from "./provider-session-registry.mjs";

function fixture(overrides = {}) {
  return {
    principal_id: "user-1",
    entitlement_id: "ent-1",
    provider_id: "provider-1",
    run_id: "run-1",
    binding_id: "binding-1",
    external_session_id: "secret-provider-session",
    ...overrides,
  };
}

describe("provider session isolation", () => {
  it("accepts the exact principal, entitlement, provider, run and binding", () => {
    const registry = createProviderSessionRegistry({ idFactory: () => "1" });
    const session = registry.createSession(fixture());
    expect(registry.assertUsable(session.session_id, fixture())).toEqual(session);
  });

  it.each([
    ["principal_id", "user-2"],
    ["entitlement_id", "ent-2"],
    ["provider_id", "provider-2"],
    ["binding_id", "binding-2"],
  ])("rejects %s mismatch", (field, value) => {
    const registry = createProviderSessionRegistry();
    const session = registry.createSession(fixture());
    expect(() => registry.assertUsable(session.session_id, fixture({ [field]: value }))).toThrowError(
      expect.objectContaining({ code: "PROVIDER_SESSION_SCOPE_MISMATCH" }),
    );
  });

  it("rejects cross-run reuse by default", () => {
    const registry = createProviderSessionRegistry();
    const session = registry.createSession(fixture());
    expect(() => registry.assertUsable(session.session_id, fixture({ run_id: "run-2" }))).toThrowError(
      expect.objectContaining({ code: "PROVIDER_SESSION_RUN_MISMATCH" }),
    );
  });

  it("never enables cross-user reuse", () => {
    const registry = createProviderSessionRegistry();
    const session = registry.createSession(fixture({ cross_user_reuse: true }));
    expect(session.cross_user_reuse).toBe(false);
  });

  it("revokes all sessions for an entitlement", () => {
    const registry = createProviderSessionRegistry();
    const session = registry.createSession(fixture());
    expect(registry.revokeByEntitlement("ent-1")).toBe(1);
    expect(() => registry.assertUsable(session.session_id, fixture())).toThrowError(
      expect.objectContaining({ code: "PROVIDER_SESSION_REVOKED" }),
    );
  });

  it("redacts external provider session identifiers from inspection", () => {
    const registry = createProviderSessionRegistry();
    registry.createSession(fixture());
    expect(JSON.stringify(registry.inspect())).not.toContain("secret-provider-session");
  });

  it("rejects expired sessions", () => {
    let now = new Date("2026-08-03T00:00:00.000Z");
    const registry = createProviderSessionRegistry({ clock: () => now });
    const session = registry.createSession(fixture({ ttl_ms: 1_000 }));
    now = new Date("2026-08-03T00:00:02.000Z");
    expect(() => registry.assertUsable(session.session_id, fixture())).toThrowError(
      expect.objectContaining({ code: "PROVIDER_SESSION_EXPIRED" }),
    );
  });
});
