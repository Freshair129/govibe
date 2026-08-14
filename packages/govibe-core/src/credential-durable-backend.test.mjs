import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createCredentialVault } from "./credential-vault.mjs";
import { createDurableEncryptedSecretBackend } from "./credential-durable-backend.mjs";

const dirs = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), "govibe-credential-"));
  dirs.push(dir);
  return dir;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

describe("durable credential backend security boundary", () => {
  it("persists encrypted material across backend restart without writing plaintext", () => {
    const directory = tempDir();
    const key = new Uint8Array(32).fill(7);
    const raw = "raw-provider-secret-DO-NOT-LEAK";

    const first = createDurableEncryptedSecretBackend({ directory, key });
    first.put("cred-restart", new TextEncoder().encode(raw));

    const files = readdirSync(directory);
    expect(files).toHaveLength(1);
    expect(readFileSync(join(directory, files[0]), "utf8")).not.toContain(raw);

    const restarted = createDurableEncryptedSecretBackend({ directory, key });
    const bytes = restarted.read("cred-restart");
    expect(new TextDecoder().decode(bytes)).toBe(raw);
    bytes.fill(0);
  });

  it("purges the durable record when credential revocation occurs", () => {
    const directory = tempDir();
    const backend = createDurableEncryptedSecretBackend({ directory, key: new Uint8Array(32).fill(9) });
    const vault = createCredentialVault({ backend, idFactory: () => "grant-1" });

    vault.registerCredential({
      credential_ref: "cred-purge",
      entitlement_id: "ent-1",
      owner_id: "principal-1",
      provider_id: "provider-1",
      secret: "purge-me",
    });
    expect(backend.has("cred-purge")).toBe(true);

    vault.revokeCredential("cred-purge");
    expect(backend.has("cred-purge")).toBe(false);
    expect(readdirSync(directory)).toHaveLength(0);
  });

  it("fails closed when persisted ciphertext is opened with the wrong key", () => {
    const directory = tempDir();
    const first = createDurableEncryptedSecretBackend({ directory, key: new Uint8Array(32).fill(1) });
    first.put("cred-key", new TextEncoder().encode("provider-secret"));

    const wrongKey = createDurableEncryptedSecretBackend({ directory, key: new Uint8Array(32).fill(2) });
    expect(() => wrongKey.read("cred-key")).toThrowError(expect.objectContaining({ code: "CREDENTIAL_DECRYPTION_FAILED" }));
  });
});

describe("protected child-process credential handoff", () => {
  it("passes only the derived run-scoped token and never the raw credential as an argv/env value", async () => {
    const rawSecret = "raw-child-secret-NEVER-EXPORT";
    const vault = createCredentialVault({ idFactory: () => "child" });
    vault.registerCredential({
      credential_ref: "cred-child",
      entitlement_id: "ent-child",
      owner_id: "principal-child",
      provider_id: "provider-child",
      secret: rawSecret,
    });
    const grant = vault.issueGrant({
      credential_ref: "cred-child",
      entitlement_id: "ent-child",
      principal_id: "principal-child",
      run_id: "run-child",
      binding_id: "binding-child",
      provider_id: "provider-child",
      adapter_id: "adapter-child",
    });

    const expected = {
      entitlement_id: "ent-child",
      principal_id: "principal-child",
      run_id: "run-child",
      binding_id: "binding-child",
      provider_id: "provider-child",
      adapter_id: "adapter-child",
    };

    const result = await vault.withDerivedCredential(
      grant.grant_id,
      expected,
      async () => ({ token: "derived-run-token-123", token_type: "opaque" }),
      async (handoff) => {
        const rawHash = sha256(rawSecret);
        const childScript = [
          "const { createHash } = require('node:crypto');",
          "const hash = (v) => createHash('sha256').update(v).digest('hex');",
          "const rawHash = process.env.GOVIBE_RAW_SHA256;",
          "const envHasRaw = Object.values(process.env).some((v) => hash(String(v)) === rawHash);",
          "const argvHasRaw = process.argv.some((v) => hash(String(v)) === rawHash);",
          "console.log(JSON.stringify({ token: process.env.GOVIBE_DERIVED_TOKEN, run: process.env.GOVIBE_RUN_ID, envHasRaw, argvHasRaw }));",
        ].join("\n");
        const childEnv = {
          PATH: process.env.PATH ?? "",
          GOVIBE_DERIVED_TOKEN: handoff.token,
          GOVIBE_RUN_ID: "run-child",
          GOVIBE_RAW_SHA256: rawHash,
        };
        expect(JSON.stringify(childEnv)).not.toContain(rawSecret);

        const child = spawnSync(process.execPath, ["-e", childScript], {
          encoding: "utf8",
          env: childEnv,
        });
        expect(child.status).toBe(0);
        expect(child.stderr).not.toContain(rawSecret);
        expect(child.stdout).not.toContain(rawSecret);
        return JSON.parse(child.stdout.trim());
      },
    );

    expect(result).toMatchObject({
      token: "derived-run-token-123",
      run: "run-child",
      envHasRaw: false,
      argvHasRaw: false,
    });
  });
});
