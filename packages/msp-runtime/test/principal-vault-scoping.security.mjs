import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { open } from "../src/db/connection.mjs";
import { runMigrations } from "../src/db/migrate.mjs";
import { VaultRegistry } from "../src/domain/vault-registry.mjs";

const migrationsDir = fileURLToPath(new URL("../src/db/migrations", import.meta.url));

function withRegistry(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "msp-principal-vault-"));
  const db = open(path.join(dir, "db.sqlite3"));
  try {
    runMigrations(db, migrationsDir);
    return fn(new VaultRegistry(db), db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const base = {
  tenantId: "tenant-a",
  businessId: "business-a",
  agentId: "sales-agent",
  projectId: "project-a",
  workspaceId: "workspace-a",
  threadId: "group-thread-1",
  sessionId: "session-1",
};

test("#136: same thread + same agent/workspace + different principals resolve different Workspace Private vaults", () => {
  withRegistry((registry) => {
    const alice = registry.resolveAuthorizedVaultSet({ ...base, principalId: "alice" }, { membershipActive: true });
    const bob = registry.resolveAuthorizedVaultSet({ ...base, principalId: "bob" }, { membershipActive: true });

    assert.notEqual(alice.workspacePrivateVaultId, bob.workspacePrivateVaultId);
    assert.notDeepEqual(alice.globalPrivateVaultIds, bob.globalPrivateVaultIds);
    assert.deepEqual(alice.sharedVaultIds, bob.sharedVaultIds);
  });
});

test("#136: Global Private is tenant-isolated by default", () => {
  withRegistry((registry) => {
    const tenantA = registry.resolveAuthorizedVaultSet({ ...base, principalId: "alice" }, { membershipActive: true });
    const tenantB = registry.resolveAuthorizedVaultSet(
      { ...base, tenantId: "tenant-b", businessId: "business-b", principalId: "alice" },
      { membershipActive: true },
    );

    for (const vaultId of tenantA.globalPrivateVaultIds) {
      assert.equal(tenantB.globalPrivateVaultIds.includes(vaultId), false);
      assert.equal(
        registry.isVaultAccessibleTo(vaultId, {
          workspaceId: base.workspaceId,
          agentId: base.agentId,
          tenantId: "tenant-b",
          businessId: "business-b",
          principalId: "alice",
        }),
        false,
      );
    }
  });
});

test("#136: authorization is re-evaluated per resolution; revoked membership denies the next turn", () => {
  withRegistry((registry) => {
    registry.resolveAuthorizedVaultSet({ ...base, principalId: "alice" }, { membershipActive: true });
    assert.throws(
      () => registry.resolveAuthorizedVaultSet({ ...base, principalId: "alice" }, { membershipActive: false }),
      (error) => error?.code === "vault_scope_denied",
    );
  });
});

test("#136: principal_id cannot substitute for agent_id", () => {
  withRegistry((registry) => {
    assert.throws(
      () => registry.resolveAuthorizedVaultSet({ ...base, principalId: base.agentId }, { membershipActive: true }),
      /principal_id must never substitute for agent_id/i,
    );
  });
});

test("#136: resolver returns an authorized set and never uses thread/session as a vault owner", () => {
  withRegistry((registry) => {
    const first = registry.resolveAuthorizedVaultSet({ ...base, principalId: "alice" }, { membershipActive: true });
    const second = registry.resolveAuthorizedVaultSet(
      { ...base, principalId: "alice", threadId: "other-thread", sessionId: "other-session" },
      { membershipActive: true },
    );

    assert.equal(first.workspacePrivateVaultId, second.workspacePrivateVaultId);
    assert.deepEqual(first.globalPrivateVaultIds, second.globalPrivateVaultIds);
    assert.deepEqual(first.sharedVaultIds, second.sharedVaultIds);
    assert.equal(Array.isArray(first.globalPrivateVaultIds), true);
    assert.equal(Array.isArray(first.sharedVaultIds), true);
    assert.equal(typeof first.permissions, "object");
  });
});
