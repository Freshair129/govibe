// Vault-scoping migration and entity isolation conformance tests.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { open } from "../src/db/connection.mjs";
import { runMigrations } from "../src/db/migrate.mjs";
import { EntityStore } from "../src/domain/entity-store.mjs";
import { VaultRegistry } from "../src/domain/vault-registry.mjs";

const migrationsDir = fileURLToPath(new URL("../src/db/migrations", import.meta.url));
const cleanups = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()();
});

function freshDb() {
  const dir = mkdtempSync(path.join(tmpdir(), "msp-runtime-vault-scoping-test-"));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  const db = open(path.join(dir, "db.sqlite3"));
  cleanups.push(() => db.close());
  return db;
}

describe("vault-scoping migrations", () => {
  it("applies all eight packaged migrations idempotently", () => {
    const db = freshDb();
    const first = runMigrations(db, migrationsDir);
    expect(first.appliedCount).toBe(8);
    expect(first.currentVersion).toBe(8);

    const second = runMigrations(db, migrationsDir);
    expect(second.appliedCount).toBe(0);
    expect(second.currentVersion).toBe(8);

    const rows = db.prepare("SELECT version, name FROM schema_migrations ORDER BY version").all();
    expect(rows.map((row) => row.version)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(rows[2].name).toBe("0003_vault_scoping.sql");
    expect(rows[6].name).toBe("0007_principal_scoped_vaults.sql");
    expect(rows[7].name).toBe("0008_gks_knowledge.sql");
  });

  it("entities.vault_id remains NOT NULL and foreign-key-references vaults(vault_id)", () => {
    const db = freshDb();
    runMigrations(db, migrationsDir);
    const columns = db.prepare("PRAGMA table_info(entities)").all();
    const vaultIdColumn = columns.find((col) => col.name === "vault_id");
    expect(vaultIdColumn).toBeTruthy();
    expect(vaultIdColumn.notnull).toBe(1);
    const fks = db.prepare("PRAGMA foreign_key_list(entities)").all();
    const vaultFk = fks.find((fk) => fk.from === "vault_id");
    expect(vaultFk?.table).toBe("vaults");
    expect(vaultFk?.to).toBe("vault_id");

    expect(() => {
      db.prepare(
        `INSERT INTO entities
           (entity_id, vault_id, category, key, body_json, valid_from, recorded_at, source_hash, created_at, updated_at)
         VALUES ('msp:entity/orphan', 'vault_unknown', 'c', 'k', '{}', '2020-01-01T00:00:00Z', '2020-01-01T00:00:00Z', 'h', '2020-01-01T00:00:00Z', '2020-01-01T00:00:00Z')`,
      ).run();
    }).toThrow(/FOREIGN KEY constraint failed/i);
  });

  it("keeps entity uniqueness scoped by vault", () => {
    const db = freshDb();
    runMigrations(db, migrationsDir);
    const insertVault = db.prepare("INSERT INTO vaults (vault_id, vault_type, status, created_at) VALUES (?, 'workspace_private', 'active', ?)");
    insertVault.run("vault-a", new Date().toISOString());
    insertVault.run("vault-b", new Date().toISOString());
    const insertEntity = db.prepare(`
      INSERT INTO entities
        (entity_id, vault_id, category, key, body_json, valid_from, recorded_at, source_hash, created_at, updated_at)
      VALUES (@entity_id, @vault_id, @category, @key, '{}', @now, @now, 'h', @now, @now)
    `);
    const now = new Date().toISOString();
    expect(() => insertEntity.run({ entity_id: "msp:entity/a1", vault_id: "vault-a", category: "profile", key: "same", now })).not.toThrow();
    expect(() => insertEntity.run({ entity_id: "msp:entity/b1", vault_id: "vault-b", category: "profile", key: "same", now })).not.toThrow();
    expect(() => insertEntity.run({ entity_id: "msp:entity/a2", vault_id: "vault-a", category: "profile", key: "same", now })).toThrow(/UNIQUE constraint failed/i);
  });

  it("adds nullable multi-tenant scope columns without rebuilding legacy data", () => {
    const db = freshDb();
    runMigrations(db, migrationsDir);
    const columns = db.prepare("PRAGMA table_info(vaults)").all().map((col) => col.name);
    expect(columns).toEqual(expect.arrayContaining([
      "tenant_id", "business_id", "principal_id", "visibility", "policy_version",
    ]));

    const legacy = new VaultRegistry(db).provisionWorkspacePrivateVault("legacy-workspace", { projectId: "legacy-project" });
    expect(legacy.tenant_id).toBeNull();
    expect(legacy.principal_id).toBeNull();
  });

  it("entity_history remains keyed by the already vault-scoped entity_id", () => {
    const db = freshDb();
    runMigrations(db, migrationsDir);
    const columns = db.prepare("PRAGMA table_info(entity_history)").all().map((col) => col.name);
    expect(columns).not.toContain("vault_id");
    const indexList = db.prepare("PRAGMA index_list(entity_history)").all();
    expect(indexList.filter((idx) => idx.unique === 1)).toHaveLength(1);
  });
});

describe("entity store remains vault-isolated", () => {
  function freshStoreWithVaults() {
    const db = freshDb();
    runMigrations(db, migrationsDir);
    return { db, store: new EntityStore(db), vaultRegistry: new VaultRegistry(db) };
  }

  it("identical category/key in different vaults receive different entity ids", () => {
    const { store, vaultRegistry } = freshStoreWithVaults();
    const vaultA = vaultRegistry.provisionWorkspacePrivateVault("workspace-a");
    const vaultB = vaultRegistry.provisionWorkspacePrivateVault("workspace-b");
    const resultA = store.upsert({ vaultId: vaultA.vault_id, category: "profile", key: "same-key", bodyJson: { v: 1 }, actor: "test" });
    const resultB = store.upsert({ vaultId: vaultB.vault_id, category: "profile", key: "same-key", bodyJson: { v: 1 }, actor: "test" });
    expect(resultA.entity.entity_id).not.toBe(resultB.entity.entity_id);
  });

  it("entity id derivation is deterministic within one vault", () => {
    const { store, vaultRegistry } = freshStoreWithVaults();
    const vault = vaultRegistry.provisionWorkspacePrivateVault("workspace-det");
    const first = store.upsert({ vaultId: vault.vault_id, category: "cat", key: "k", bodyJson: { v: 1 }, actor: "test" });
    const second = store.upsert({ vaultId: vault.vault_id, category: "cat", key: "k", bodyJson: { v: 1 }, actor: "test" });
    expect(second.entity.entity_id).toBe(first.entity.entity_id);
    expect(second.created).toBe(false);
  });

  it("cross-vault reads cannot see another vault's same-named entity", () => {
    const { store, vaultRegistry } = freshStoreWithVaults();
    const vaultA = vaultRegistry.provisionWorkspacePrivateVault("workspace-read-a");
    const vaultB = vaultRegistry.provisionWorkspacePrivateVault("workspace-read-b");
    store.upsert({ vaultId: vaultB.vault_id, category: "secret", key: "shared-key-name", bodyJson: { owner: "B" }, actor: "test" });
    expect(store.get({ vaultId: vaultA.vault_id, category: "secret", key: "shared-key-name" })).toBeNull();
    expect(store.list({ vaultId: vaultA.vault_id, category: "secret" }).entities).toHaveLength(0);
    expect(store.list({ vaultId: vaultB.vault_id, category: "secret" }).entities).toHaveLength(1);
  });
});
