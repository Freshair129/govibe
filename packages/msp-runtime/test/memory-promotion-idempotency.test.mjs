// AC-04: msp_memory_promote(target_scope=global_private) is idempotent on
// idempotency_key -- calling it twice with the same key returns the same
// promotion_ref/target_ref and does not create a duplicate entity. Runs
// against the real stdio process (matching AC-01's standard), then verifies
// "no duplicate entity" by opening a second, independent connection to the
// same MSP_DB_PATH and reading it back through domain/entity-store.mjs's
// own list() -- the same storage primitive the real handler wrote through
// -- rather than trusting the wire response alone.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { MspClient } from "../../govibe-core/src/msp-client.mjs";
import { createMspStdioCaller } from "../../govibe-core/src/msp-stdio-transport.mjs";
import { createTypedVaultContextMsp } from "../../../scripts/mcp/msp-vault-context-contracts.mjs";

import { open } from "../src/db/connection.mjs";
import { EntityStore } from "../src/domain/entity-store.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, "..");
const binPath = path.join(packageRoot, "bin", "msp-runtime.mjs");

describe("AC-04: msp_memory_promote(target_scope=global_private) idempotency", () => {
  let call;
  let typed;
  let dbPath;
  let tempDir;

  beforeAll(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "msp-runtime-idempotency-test-"));
    dbPath = path.join(tempDir, "msp.sqlite3");
    call = createMspStdioCaller({
      command: process.execPath,
      args: [binPath],
      env: { ...process.env, MSP_DB_PATH: dbPath },
      timeoutMs: 10_000,
    });
    typed = createTypedVaultContextMsp(new MspClient(call));
  });

  afterAll(() => {
    call?.close();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup (Windows file-lock race on child process exit)
    }
  });

  function promoteInput(overrides = {}) {
    return {
      actor: "boss",
      agentId: "agent-idem",
      workspaceId: "workspace-idem",
      sourceMemoryRef: "msp:memory/idem-source",
      targetScope: "global_private",
      candidate: { note: "idempotency candidate", value: 1 },
      evidenceRefs: ["msp:proof/idem-1"],
      reason: "idempotency test",
      idempotencyKey: "idem-key-1",
      ...overrides,
    };
  }

  it("two calls with the same idempotency_key return identical promotion_ref and target_ref", async () => {
    const first = await typed.promoteMemory(promoteInput());
    const second = await typed.promoteMemory(promoteInput());

    expect(second.promotionRef).toBe(first.promotionRef);
    expect(second.targetRef).toBe(first.targetRef);
    expect(second.sourceHash).toBe(first.sourceHash);
    expect(first.promotionRef).toMatch(/^msp:memory-promotion\/idem-key-1$/);
  });

  it("a third call with the same idempotency_key still does not create a duplicate entity (verified via domain/entity-store.mjs's list())", async () => {
    await typed.promoteMemory(promoteInput());

    const db = open(dbPath);
    try {
      const store = new EntityStore(db);
      const { entities } = store.list({ category: "memory-promotion", limit: 200 });
      const matches = entities.filter((entity) => entity.key === "idem-key-1");
      expect(matches).toHaveLength(1);
      expect(matches[0].current_version).toBe(1);
    } finally {
      db.close();
    }
  });

  it("a different idempotency_key produces a distinct promotion_ref/target_ref and a second, distinct entity", async () => {
    const first = await typed.promoteMemory(promoteInput());
    const different = await typed.promoteMemory(promoteInput({ idempotencyKey: "idem-key-2", candidate: { note: "different candidate" } }));

    expect(different.promotionRef).not.toBe(first.promotionRef);
    expect(different.targetRef).not.toBe(first.targetRef);

    const db = open(dbPath);
    try {
      const store = new EntityStore(db);
      const { entities } = store.list({ category: "memory-promotion", limit: 200 });
      expect(entities.map((entity) => entity.key).sort()).toEqual(["idem-key-1", "idem-key-2"]);
    } finally {
      db.close();
    }
  });
});
