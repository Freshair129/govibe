// Composition root: wires db -> domain -> contracts -> transport together.
// This is the one module allowed to import from every layer (db/, domain/,
// contracts/, transport/); it is excluded from
// test/dependency-boundaries.test.mjs, mirroring how
// scripts/mcp/runtime/runtime-core.mjs / sidecar-server.mjs /
// govibe-mcp-server.mjs are excluded from
// scripts/mcp/runtime/dependency-boundaries.test.mjs.
//
// Phase 0/1 (WP-12) registered only a diagnostic `msp_ping`. WP-13 Phase 2
// adds the eleven-tool `msp_*` contract surface (vault registry, context
// tools, promotion tools) that packages/govibe-core/src/msp-client.mjs and
// scripts/mcp/msp-vault-context-contracts.mjs already call today. `msp_ping`
// stays registered alongside them.
import path from "node:path";
import { fileURLToPath } from "node:url";

import { open } from "./db/connection.mjs";
import { runMigrations } from "./db/migrate.mjs";
import { EntityStore } from "./domain/entity-store.mjs";
import { Journal } from "./domain/journal.mjs";
import { VaultRegistry } from "./domain/vault-registry.mjs";
import { createContextHandlers } from "./transport/handlers/context-handlers.mjs";
import { createLifecycleHandlers } from "./transport/handlers/lifecycle-handlers.mjs";
import { createVaultHandlers } from "./transport/handlers/vault-handlers.mjs";
import { createStdioJsonRpcServer } from "./transport/stdio-jsonrpc-server.mjs";
import { ToolRegistry } from "./transport/tool-registry.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MIGRATIONS_DIR = path.join(here, "db", "migrations");

/**
 * @param {object} options
 * @param {string} options.dbPath absolute path to the SQLite database file (MSP_DB_PATH).
 * @param {string} [options.migrationsDir] override for testing.
 * @param {NodeJS.ReadableStream} [options.input] override for testing.
 * @param {NodeJS.WritableStream} [options.output] override for testing.
 */
export function createServer({ dbPath, migrationsDir = DEFAULT_MIGRATIONS_DIR, input, output } = {}) {
  if (!dbPath) {
    throw new TypeError("createServer requires dbPath (MSP_DB_PATH).");
  }

  const db = open(dbPath);
  runMigrations(db, migrationsDir);

  const entityStore = new EntityStore(db);
  const journal = new Journal(db);
  const vaultRegistry = new VaultRegistry(db);

  const vaultHandlers = createVaultHandlers({ vaultRegistry, journal });
  const contextHandlers = createContextHandlers({ db, journal });
  const lifecycleHandlers = createLifecycleHandlers({ db, entityStore, vaultRegistry, journal });

  const toolRegistry = new ToolRegistry();
  toolRegistry.register("msp_ping", async () => ({ ok: true, timestamp: new Date().toISOString() }));
  for (const [name, handler] of Object.entries(vaultHandlers)) toolRegistry.register(name, handler);
  for (const [name, handler] of Object.entries(contextHandlers)) toolRegistry.register(name, handler);
  for (const [name, handler] of Object.entries(lifecycleHandlers)) toolRegistry.register(name, handler);

  const transport = createStdioJsonRpcServer({ toolRegistry, input, output });

  function close() {
    transport.close();
    db.close();
  }

  return { db, entityStore, journal, vaultRegistry, toolRegistry, transport, close };
}
