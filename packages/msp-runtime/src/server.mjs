// Composition root: wires db -> domain -> transport together. This is the
// one module allowed to import from every layer (db/, domain/, transport/);
// it is excluded from test/dependency-boundaries.test.mjs, mirroring how
// scripts/mcp/runtime/runtime-core.mjs / sidecar-server.mjs /
// govibe-mcp-server.mjs are excluded from
// scripts/mcp/runtime/dependency-boundaries.test.mjs.
//
// Phase 0/1 scope (WP-12): the only tool registered here is a diagnostic
// `msp_ping`, used to prove the transport round-trip (AC-01). No `msp_*` or
// `msp_memory_*` tool is implemented in this packet -- that is Phase 2+.
import path from "node:path";
import { fileURLToPath } from "node:url";

import { open } from "./db/connection.mjs";
import { runMigrations } from "./db/migrate.mjs";
import { EntityStore } from "./domain/entity-store.mjs";
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

  const toolRegistry = new ToolRegistry();
  toolRegistry.register("msp_ping", async () => ({ ok: true, timestamp: new Date().toISOString() }));

  const transport = createStdioJsonRpcServer({ toolRegistry, input, output });

  function close() {
    transport.close();
    db.close();
  }

  return { db, entityStore, toolRegistry, transport, close };
}
