import { describe, expect, it, vi } from "vitest";
import { createCredentialVault } from "./credential-vault.mjs";
import { createExecutorRegistry } from "./executor-adapter.mjs";
import { createProviderSessionRegistry } from "./provider-session-registry.mjs";

function governedRequest(overrides = {}) {
  return {
    actor_id: "user-1",
    run_id: "run-1",
    contextAuthority: { authorized: true },
    executionBinding: {
      binding_id: "binding-1",
      provider_id: "codex",
      entitlement_id: "ent-1",
      principal_id: "user-1",
      run_id: "run-1",
      credential_grant_id: null,
      provider_session_id: null,
    },
    ...overrides,
  };
}

describe("executor adapter governed handoff", () => {
  it("fails closed when no execution binding exists", async () => {
    const registry = createExecutorRegistry({ codex: { execute: vi.fn() } });
    await expect(registry.execute("codex", { contextAuthority: { authorized: true } }))
      .rejects.toMatchObject({ code: "EXECUTION_BINDING_REQUIRED" });
  });

  it("rejects provider-string substitution", async () => {
    const registry = createExecutorRegistry({ local: { execute: vi.fn() } });
    await expect(registry.execute("local", governedRequest()))
      .rejects.toMatchObject({ code: "EXECUTION_BINDING_PROVIDER_MISMATCH" });
  });

  it("passes credential only through the protected adapter channel", async () => {
    const vault = createCredentialVault({ idFactory: () => "fixed" });
    vault.registerCredential({
      credential_ref: "cred-1",
      entitlement_id: "ent-1",
      owner_id: "user-1",
      provider_id: "codex",
      secret: "top-secret",
    });
    const grant = vault.issueGrant({
      credential_ref: "cred-1",
      entitlement_id: "ent-1",
      principal_id: "user-1",
      run_id: "run-1",
      binding_id: "binding-1",
      provider_id: "codex",
    });

    const execute = vi.fn(async (request, runtime) => ({
      requestHasSecret: JSON.stringify(request).includes("top-secret"),
      bindingHasGrant: "credential_grant_id" in request.executionBinding,
      credential: new TextDecoder().decode(runtime.credential),
    }));
    const registry = createExecutorRegistry({ codex: { execute } }, { credentialVault: vault });
    const request = governedRequest({
      secret: "must-not-pass",
      executionBinding: { ...governedRequest().executionBinding, credential_grant_id: grant.grant_id },
    });

    await expect(registry.execute("codex", request)).resolves.toEqual({
      requestHasSecret: false,
      bindingHasGrant: false,
      credential: "top-secret",
    });
  });

  it("validates an isolated provider session before dispatch", async () => {
    const sessions = createProviderSessionRegistry({ idFactory: () => "session" });
    const session = sessions.createSession({
      principal_id: "user-1",
      entitlement_id: "ent-1",
      provider_id: "codex",
      run_id: "run-1",
      binding_id: "binding-1",
      external_session_id: "external-secret-session",
    });
    const execute = vi.fn(async (_request, runtime) => runtime.providerSession.session_id);
    const registry = createExecutorRegistry({ codex: { execute } }, { sessionRegistry: sessions });

    const request = governedRequest({
      executionBinding: { ...governedRequest().executionBinding, provider_session_id: session.session_id },
    });
    await expect(registry.execute("codex", request)).resolves.toBe(session.session_id);
  });

  it("rejects cross-principal binding reuse", async () => {
    const registry = createExecutorRegistry({ codex: { execute: vi.fn() } });
    await expect(registry.execute("codex", governedRequest({ actor_id: "user-2" })))
      .rejects.toMatchObject({ code: "EXECUTION_BINDING_PRINCIPAL_MISMATCH" });
  });
});
