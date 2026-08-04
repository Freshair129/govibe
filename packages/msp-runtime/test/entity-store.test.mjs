// AC-04: domain/entity-store supports upsert/get/list/history/forget
// against the SQLite schema with PRAGMA foreign_keys=ON enforced (a
// foreign-key violation is rejected, not silently accepted).
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { open } from "../src/db/connection.mjs";
import { runMigrations } from "../src/db/migrate.mjs";
import { EntityStore } from "../src/domain/entity-store.mjs";

const migrationsDir = fileURLToPath(new URL("../src/db/migrations", import.meta.url));

const cleanups = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()();
});

function freshStore() {
  const dir = mkdtempSync(path.join(tmpdir(), "msp-runtime-entity-test-"));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  const db = open(path.join(dir, "db.sqlite3"));
  cleanups.push(() => db.close());
  runMigrations(db, migrationsDir);
  return { db, store: new EntityStore(db) };
}

describe("domain/entity-store (AC-04)", () => {
  it("upsert is idempotent for unchanged content: no version bump, same entity_id", () => {
    const { store } = freshStore();
    const first = store.upsert({ category: "profile", key: "alice", bodyJson: { name: "Alice" }, actor: "test" });
    expect(first.created).toBe(true);
    expect(first.entity.current_version).toBe(1);

    const second = store.upsert({ category: "profile", key: "alice", bodyJson: { name: "Alice" }, actor: "test" });
    expect(second.created).toBe(false);
    expect(second.changed).toBe(false);
    expect(second.entity.current_version).toBe(1);
    expect(second.entity.entity_id).toBe(first.entity.entity_id);
    expect(second.entity.entity_id).toMatch(/^msp:entity\//);
  });

  it("a content change bumps the version and writes an entity_history snapshot", () => {
    const { store } = freshStore();
    store.upsert({ category: "profile", key: "bob", bodyJson: { role: "engineer" }, actor: "test" });
    const updated = store.upsert({
      category: "profile",
      key: "bob",
      bodyJson: { role: "manager" },
      actor: "test",
      reason: "promotion",
    });

    expect(updated.changed).toBe(true);
    expect(updated.entity.current_version).toBe(2);

    const history = store.history({ category: "profile", key: "bob" });
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe(2); // newest-first, per WP-12's entity-store spec
    expect(history[1].version).toBe(1);
    expect(history[0].change_reason).toBe("promotion");
    expect(history[0].body_json).toEqual({ role: "manager" });
    expect(history[1].body_json).toEqual({ role: "engineer" });
  });

  it("get without as-of params returns current state", () => {
    const { store } = freshStore();
    store.upsert({ category: "cat", key: "k", bodyJson: { v: 1 }, actor: "test" });
    const entity = store.get({ category: "cat", key: "k" });
    expect(entity.body_json).toEqual({ v: 1 });
  });

  it("get returns null for an entity that has never existed", () => {
    const { store } = freshStore();
    expect(store.get({ category: "cat", key: "nope" })).toBeNull();
  });

  it("get with as-of params performs a bitemporal point read against entity_history", async () => {
    const { store } = freshStore();
    const v1 = store.upsert({
      category: "cat",
      key: "bitemporal",
      bodyJson: { v: 1 },
      actor: "test",
      validFrom: "2020-01-01T00:00:00Z",
    });
    // recorded_at has millisecond resolution and is server-assigned (not
    // caller-overridable, by design -- it is an audit-trail timestamp). A
    // deliberate short delay guarantees v1 and v2 land in different
    // milliseconds so the as-of query below exercises a real, non-empty
    // [recordedAt, supersededAt) window rather than racing the clock.
    await new Promise((resolve) => setTimeout(resolve, 10));
    const v2 = store.upsert({
      category: "cat",
      key: "bitemporal",
      bodyJson: { v: 2 },
      actor: "test",
      validFrom: "2021-01-01T00:00:00Z",
    });

    const asOfV1 = store.get({
      category: "cat",
      key: "bitemporal",
      asOfValidAt: "2020-06-01T00:00:00Z",
      asOfRecordedAt: v1.entity.recorded_at,
    });
    expect(asOfV1.version).toBe(1);
    expect(asOfV1.body_json).toEqual({ v: 1 });

    const asOfV2 = store.get({
      category: "cat",
      key: "bitemporal",
      asOfValidAt: "2021-06-01T00:00:00Z",
      asOfRecordedAt: v2.entity.recorded_at,
    });
    expect(asOfV2.version).toBe(2);
    expect(asOfV2.body_json).toEqual({ v: 2 });
  });

  it("list paginates and excludes forgotten entities by default", () => {
    const { store } = freshStore();
    for (let index = 0; index < 5; index += 1) {
      store.upsert({ category: "page", key: `k${index}`, bodyJson: { index }, actor: "test" });
    }
    store.forget({ category: "page", key: "k0", reason: "cleanup", actor: "test" });

    const page1 = store.list({ category: "page", limit: 2 });
    expect(page1.entities).toHaveLength(2);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = store.list({ category: "page", limit: 2, cursor: page1.nextCursor });
    expect(page2.entities.length).toBeGreaterThan(0);

    const all = store.list({ category: "page", limit: 50 });
    expect(all.entities).toHaveLength(4); // k0 is forgotten, excluded by default
    expect(all.entities.every((entity) => entity.key !== "k0")).toBe(true);

    const explicitlyForgotten = store.list({ category: "page", lifecycleState: "forgotten" });
    expect(explicitlyForgotten.entities).toHaveLength(1);
    expect(explicitlyForgotten.entities[0].key).toBe("k0");
  });

  it("history returns the full ledger newest-first, including a forgotten final entry", () => {
    const { store } = freshStore();
    store.upsert({ category: "h", key: "x", bodyJson: { v: 1 }, actor: "test" });
    store.upsert({ category: "h", key: "x", bodyJson: { v: 2 }, actor: "test" });
    store.forget({ category: "h", key: "x", reason: "done", actor: "test" });

    const history = store.history({ category: "h", key: "x" });
    expect(history.map((entry) => entry.version)).toEqual([3, 2, 1]);
    expect(history[0].change_reason).toBe("done");
  });

  it("forget is a soft delete: row still exists, lifecycle_state='forgotten', absent from default list()", () => {
    const { store, db } = freshStore();
    store.upsert({ category: "f", key: "y", bodyJson: { v: 1 }, actor: "test" });
    const forgotten = store.forget({ category: "f", key: "y", reason: "gdpr-request", actor: "test" });
    expect(forgotten.lifecycle_state).toBe("forgotten");

    const row = db.prepare("SELECT * FROM entities WHERE category = ? AND key = ?").get("f", "y");
    expect(row).toBeTruthy(); // no hard DELETE
    expect(row.lifecycle_state).toBe("forgotten");

    expect(store.list({ category: "f" }).entities).toHaveLength(0);
    expect(store.list({ category: "f", lifecycleState: "forgotten" }).entities).toHaveLength(1);
  });

  it("forget remains visible via as-of queries into history", () => {
    const { store } = freshStore();
    store.upsert({
      category: "f2",
      key: "z",
      bodyJson: { v: 1 },
      actor: "test",
      validFrom: "2020-01-01T00:00:00Z",
    });
    const forgotten = store.forget({ category: "f2", key: "z", reason: "gdpr-request", actor: "test" });

    const history = store.history({ category: "f2", key: "z" });
    expect(history[0].change_reason).toBe("gdpr-request");
    expect(history[0].valid_to).toBe(forgotten.valid_to);

    const asOfForget = store.get({
      category: "f2",
      key: "z",
      asOfValidAt: forgotten.valid_to,
      asOfRecordedAt: forgotten.updated_at ?? forgotten.valid_to,
    });
    expect(asOfForget).not.toBeNull();
  });

  it("forget on a nonexistent entity throws MemoryNotFoundError", async () => {
    const { store } = freshStore();
    const { MemoryNotFoundError } = await import("../src/domain/errors.mjs");
    expect(() => store.forget({ category: "nope", key: "nope", reason: "x", actor: "test" })).toThrow(
      MemoryNotFoundError,
    );
  });

  it("enforces PRAGMA foreign_keys=ON: an entity_history row referencing a nonexistent entity_id is rejected (AC-04)", () => {
    const { db } = freshStore();
    expect(() => {
      db.prepare(
        `INSERT INTO entity_history
           (entity_id, version, body_json, epistemic_state, confidence, valid_from, recorded_at, actor, source_hash)
         VALUES (?, 1, '{}', 'hypothesis', 0.5, '2020-01-01T00:00:00Z', '2020-01-01T00:00:00Z', 'test', 'deadbeef')`,
      ).run("msp:entity/does-not-exist");
    }).toThrow(/FOREIGN KEY constraint failed/i);
  });
});
