import { describe, expect, it, vi } from "vitest";
import { createCredentialVault, createEncryptedSecretBackend, CredentialVaultError } from "./credential-vault.mjs";

function fixture(clock = () => new Date("2026-08-03T00:00:00.000Z"), options = {}) {
  let id = 0;
  return createCredentialVault({ ...options, clock, idFactory: () => `id-${++id}`, defaultGrantTtlMs: 1_000 });
}

const baseCredential = {
  credential_ref: "cred:openai:user-1",
  entitlement_id: "ent-1",
  owner_id: "user-1",
  provider_id: "openai",
  secret: "super-secret-token",
};

const baseGrant = {
  credential_ref: "cred:openai:user-1",
  entitlement_id: "ent-1",
  principal_id: "user-1",
  run_id: "run-1",
  binding_id: "binding-1",
  provider_id: "openai",
};

describe("credential vault", () => {
  it("returns opaque metadata and never exposes secret through inspection", () => {
    const vault = fixture();
    vault.registerCredential(baseCredential);
    const snapshot = vault.inspect();

    expect(JSON.stringify(snapshot)).not.toContain("super-secret-token");
    expect(snapshot.credentials[0]).toEqual({
      credential_ref: "cred:openai:user-1",
      entitlement_id: "ent-1",
      owner_id: "user-1",
      provider_id: "openai",
      generation: 1,
      state: "active",
      valid_until: null,
    });
  });

  it("issues a run-scoped one-time grant and consumes it", async () => {
    const vault = fixture();
    vault.registerCredential(baseCredential);
    const grant = vault.issueGrant(baseGrant);
    const consumer = vi.fn(async (bytes) => new TextDecoder().decode(bytes));

    await expect(vault.withCredential(grant.grant_id, baseGrant, consumer)).resolves.toBe("super-secret-token");
    expect(consumer).toHaveBeenCalledOnce();
    await expect(vault.withCredential(grant.grant_id, baseGrant, consumer)).rejects.toMatchObject({
      code: "CREDENTIAL_GRANT_CONSUMED",
    });
  });

  it("derives an opaque handoff inside the vault boundary and wipes raw bytes", async () => {
    const vault = fixture();
    vault.registerCredential(baseCredential);
    const grant = vault.issueGrant({ ...baseGrant, adapter_id: "adapter-openai" });
    let bytesSeenByDeriver;
    let handoffSeenByConsumer;

    await expect(vault.withDerivedCredential(
      grant.grant_id,
      { ...baseGrant, adapter_id: "adapter-openai" },
      async (bytes, request) => {
        bytesSeenByDeriver = bytes;
        expect(new TextDecoder().decode(bytes)).toBe("super-secret-token");
        expect(request).toMatchObject({
          schema: "govibe-credential-derivation-request/v1",
          provider_id: "openai",
          adapter_id: "adapter-openai",
          binding_id: "binding-1",
        });
        return { token: "derived-openai-token", token_type: "opaque" };
      },
      async (handoff) => {
        handoffSeenByConsumer = handoff;
        return handoff.token;
      },
    )).resolves.toBe("derived-openai-token");

    expect(handoffSeenByConsumer).toMatchObject({
      schema: "govibe-credential-handoff/v1",
      mode: "derived_token",
      provider_id: "openai",
      adapter_id: "adapter-openai",
      binding_id: "binding-1",
      token: "derived-openai-token",
    });
    expect(bytesSeenByDeriver).toEqual(new Uint8Array(bytesSeenByDeriver.length));
    await expect(vault.withDerivedCredential(
      grant.grant_id,
      { ...baseGrant, adapter_id: "adapter-openai" },
      async () => ({ token: "unused" }),
      async () => true,
    )).rejects.toMatchObject({ code: "CREDENTIAL_GRANT_CONSUMED" });
  });

  it("rejects a deriver that returns the raw secret", async () => {
    const vault = fixture();
    vault.registerCredential(baseCredential);
    const grant = vault.issueGrant({ ...baseGrant, adapter_id: "adapter-openai" });

    await expect(vault.withDerivedCredential(
      grant.grant_id,
      { ...baseGrant, adapter_id: "adapter-openai" },
      async (bytes) => new TextDecoder().decode(bytes),
      async () => true,
    )).rejects.toMatchObject({ code: "CREDENTIAL_DERIVATION_RAW_SECRET_REUSED" });
  });

  it("stores encrypted backend metadata without exposing plaintext", () => {
    const backend = createEncryptedSecretBackend({
      key: new Uint8Array(32).fill(7),
      randomBytes: (length) => new Uint8Array(length).fill(9),
    });
    const secretBytes = new TextEncoder().encode("encrypted-fixture-secret");
    backend.put("cred-encrypted", secretBytes);
    secretBytes.fill(0);

    expect(JSON.stringify(backend.inspect())).not.toContain("encrypted-fixture-secret");
    expect(backend.inspect()[0]).toMatchObject({
      credential_ref: "cred-encrypted",
      version: 1,
      algorithm: "aes-256-gcm",
      iv_bytes: 12,
      ciphertext_bytes: 24,
      auth_tag_bytes: 16,
    });
    expect(new TextDecoder().decode(backend.read("cred-encrypted"))).toBe("encrypted-fixture-secret");

    backend.delete("cred-encrypted");
    expect(backend.has("cred-encrypted")).toBe(false);
    expect(backend.inspect()).toEqual([]);
  });

  it("rejects an encrypted backend without a 32-byte key", () => {
    expect(() => createEncryptedSecretBackend({ key: new Uint8Array(31) })).toThrowError(
      expect.objectContaining({ code: "CREDENTIAL_BACKEND_KEY_INVALID" }),
    );
  });

  it("rotates the encrypted record and rejects stale grants by generation", async () => {
    const backend = createEncryptedSecretBackend({ key: new Uint8Array(32).fill(3) });
    const vault = fixture(() => new Date("2026-08-03T00:00:00.000Z"), { backend });
    vault.registerCredential(baseCredential);
    const oldGrant = vault.issueGrant(baseGrant);

    expect(vault.inspect().credentials[0].generation).toBe(1);
    vault.rotateCredential({ credential_ref: baseCredential.credential_ref, secret: "rotated-secret" });
    expect(vault.inspect().credentials[0].generation).toBe(2);
    expect(JSON.stringify(backend.inspect())).not.toContain("rotated-secret");

    await expect(vault.withCredential(oldGrant.grant_id, baseGrant, async () => true)).rejects.toMatchObject({
      code: "CREDENTIAL_GENERATION_MISMATCH",
    });

    const newGrant = vault.issueGrant(baseGrant);
    await expect(vault.withCredential(newGrant.grant_id, baseGrant, async (bytes) => new TextDecoder().decode(bytes))).resolves.toBe("rotated-secret");
    vault.revokeCredential(baseCredential.credential_ref);
    expect(backend.has(baseCredential.credential_ref)).toBe(false);
  });

  it.each([
    ["entitlement_id", "ent-2"],
    ["principal_id", "user-2"],
    ["run_id", "run-2"],
    ["binding_id", "binding-2"],
    ["provider_id", "anthropic"],
  ])("rejects grant scope mismatch for %s", async (field, value) => {
    const vault = fixture();
    vault.registerCredential(baseCredential);
    const grant = vault.issueGrant(baseGrant);

    await expect(
      vault.withCredential(grant.grant_id, { ...baseGrant, [field]: value }, async () => true),
    ).rejects.toMatchObject({ code: "CREDENTIAL_GRANT_SCOPE_MISMATCH" });
  });

  it("rejects entitlement substitution at grant issuance", () => {
    const vault = fixture();
    vault.registerCredential(baseCredential);
    expect(() => vault.issueGrant({ ...baseGrant, entitlement_id: "ent-evil" })).toThrowError(
      expect.objectContaining({ code: "ENTITLEMENT_SUBSTITUTION_DENIED" }),
    );
  });

  it("rejects cross-user credential use", () => {
    const vault = fixture();
    vault.registerCredential(baseCredential);
    expect(() => vault.issueGrant({ ...baseGrant, principal_id: "user-2" })).toThrowError(
      expect.objectContaining({ code: "CREDENTIAL_PRINCIPAL_MISMATCH" }),
    );
  });

  it("revokes active grants when the credential is revoked", async () => {
    const vault = fixture();
    vault.registerCredential(baseCredential);
    const grant = vault.issueGrant(baseGrant);
    vault.revokeCredential(baseCredential.credential_ref);

    await expect(vault.withCredential(grant.grant_id, baseGrant, async () => true)).rejects.toMatchObject({
      code: "CREDENTIAL_GRANT_REVOKED",
    });
  });

  it("rejects expired grants", async () => {
    let current = new Date("2026-08-03T00:00:00.000Z");
    const vault = fixture(() => current);
    vault.registerCredential(baseCredential);
    const grant = vault.issueGrant({ ...baseGrant, ttl_ms: 500 });
    current = new Date("2026-08-03T00:00:01.000Z");

    await expect(vault.withCredential(grant.grant_id, baseGrant, async () => true)).rejects.toMatchObject({
      code: "CREDENTIAL_GRANT_EXPIRED",
    });
  });

  it("rejects expired credentials before grant issuance", () => {
    let current = new Date("2026-08-03T00:00:00.000Z");
    const vault = fixture(() => current);
    vault.registerCredential({ ...baseCredential, valid_until: "2026-08-03T00:00:01.000Z" });
    current = new Date("2026-08-03T00:00:02.000Z");

    expect(() => vault.issueGrant(baseGrant)).toThrowError(expect.objectContaining({ code: "CREDENTIAL_EXPIRED" }));
  });

  it("does not include credential references in grant inspection", () => {
    const vault = fixture();
    vault.registerCredential(baseCredential);
    vault.issueGrant(baseGrant);

    const snapshot = vault.inspect();
    expect(snapshot.grants[0]).not.toHaveProperty("credential_ref");
  });

  it("uses bounded error metadata without secret material", () => {
    const vault = fixture();
    try {
      vault.issueGrant(baseGrant);
    } catch (error) {
      expect(error).toBeInstanceOf(CredentialVaultError);
      expect(JSON.stringify(error)).not.toContain("super-secret-token");
      expect(error.code).toBe("CREDENTIAL_NOT_FOUND");
    }
  });
});
