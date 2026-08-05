// AC-03: migrations apply idempotently, schema_migrations records applied
// migrations with a checksum, a checksum-drift guard rejects a modified
// already-applied migration file, and a downgrade guard rejects a database
// whose recorded schema version is higher than any migration file present.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { open } from "../src/db/connection.mjs";
import { runMigrations, SchemaVersionError } from "../src/db/migrate.mjs";

const cleanups = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()();
});

function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), "msp-runtime-migrate-test-"));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function setupMigrationsDir(files) {
  const dir = tempDir();
  for (const [name, sql] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), sql, "utf8");
  }
  return dir;
}

function freshDb() {
  const db = open(path.join(tempDir(), "db.sqlite3"));
  cleanups.push(() => db.close());
  return db;
}

const migration1 = "CREATE TABLE t1 (id INTEGER PRIMARY KEY);";
const migration2 = "CREATE TABLE t2 (id INTEGER PRIMARY KEY);";

describe("db/migrate (AC-03)", () => {
  it("applies all migration files in order and records them with a checksum in schema_migrations", () => {
    const migrationsDir = setupMigrationsDir({ "0001_a.sql": migration1, "0002_b.sql": migration2 });
    const db = freshDb();

    const result = runMigrations(db, migrationsDir);

    expect(result.appliedCount).toBe(2);
    const rows = db.prepare("SELECT version, name, checksum FROM schema_migrations ORDER BY version").all();
    expect(rows).toHaveLength(2);
    expect(rows[0].version).toBe(1);
    expect(rows[1].version).toBe(2);
    expect(rows[0].checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(db.pragma("user_version", { simple: true })).toBe(2);

    // The migrations actually ran (not just recorded).
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('t1','t2')").all()).toHaveLength(2);
  });

  it("re-running migrations against an already-migrated database is a no-op", () => {
    const migrationsDir = setupMigrationsDir({ "0001_a.sql": migration1 });
    const db = freshDb();

    runMigrations(db, migrationsDir);
    const second = runMigrations(db, migrationsDir);

    expect(second.appliedCount).toBe(0);
    expect(db.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get().count).toBe(1);
  });

  it("throws SchemaVersionError when an already-applied migration file's checksum has drifted", () => {
    const migrationsDir = setupMigrationsDir({ "0001_a.sql": migration1 });
    const db = freshDb();

    runMigrations(db, migrationsDir);

    // Tamper with the already-applied migration file after the fact.
    writeFileSync(path.join(migrationsDir, "0001_a.sql"), `${migration1}\n-- tampered`, "utf8");

    expect(() => runMigrations(db, migrationsDir)).toThrow(SchemaVersionError);
    expect(() => runMigrations(db, migrationsDir)).toThrow(/checksum drift/i);
  });

  it("throws SchemaVersionError when PRAGMA user_version exceeds the newest migration file present (downgrade guard)", () => {
    const migrationsDir = setupMigrationsDir({ "0001_a.sql": migration1 });
    const db = freshDb();

    db.pragma("user_version = 999");

    expect(() => runMigrations(db, migrationsDir)).toThrow(SchemaVersionError);
    expect(() => runMigrations(db, migrationsDir)).toThrow(/downgrade|newer than the newest/i);
  });

  it("applies the real packaged migrations (0001_init.sql + 0002_phase2.sql + 0003_vault_scoping.sql + 0004_retrieval.sql, WP-15) without error", () => {
    const migrationsDir = fileURLToPath(new URL("../src/db/migrations", import.meta.url));
    const db = freshDb();
    const result = runMigrations(db, migrationsDir);
    expect(result.appliedCount).toBe(4);
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN " +
          "('entities','entity_history','vaults','vault_mounts','contexts','journal','state','promotions','embeddings')",
      )
      .all();
    expect(tables).toHaveLength(9);
    // WP-15: entities_fts is a virtual table (type='table' in sqlite_master
    // for FTS5's shadow-table implementation detail is not guaranteed
    // portable, so check by name against the sqlite_master rows FTS5 itself
    // registers instead).
    const ftsRows = db.prepare("SELECT name FROM sqlite_master WHERE name = 'entities_fts'").all();
    expect(ftsRows).toHaveLength(1);

    // WP-14 AC-01/AC-05: the new columns this migration adds are present.
    const entityCols = db.prepare("PRAGMA table_info(entities)").all().map((col) => col.name);
    expect(entityCols).toContain("vault_id");
    const promotionCols = db.prepare("PRAGMA table_info(promotions)").all().map((col) => col.name);
    expect(promotionCols).toContain("vault_id");
    const vaultCols = db.prepare("PRAGMA table_info(vaults)").all().map((col) => col.name);
    expect(vaultCols).toContain("role");
  });

  it("re-applying the packaged migrations directory a second time is a no-op (AC-01: migrations apply idempotently)", () => {
    const migrationsDir = fileURLToPath(new URL("../src/db/migrations", import.meta.url));
    const db = freshDb();
    runMigrations(db, migrationsDir);
    const second = runMigrations(db, migrationsDir);
    expect(second.appliedCount).toBe(0);
    expect(second.currentVersion).toBe(4);
  });
});
