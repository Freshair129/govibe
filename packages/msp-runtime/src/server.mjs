// Composition root: wires db -> domain -> contracts -> transport together.
// This is the one module allowed to import from every layer (db/, domain/,
// retrieval/, contracts/, transport/, and provider adapters); it is excluded
// from test/dependency-boundaries.test.mjs.
import path from "node:path";
import { fileURLToPath } from "node:url";

import { open } from "./db/connection.mjs";
import { runMigrations } from "./db/migrate.mjs";
import { EntityStore } from "./domain/entity-store.mjs";
import { Journal } from "./domain/journal.mjs";
import { LinksStore } from "./domain/links.mjs";
import { VaultRegistry } from "./domain/vault-registry.mjs";
import { createSqliteGksProvider } from "./gks/sqlite-provider.mjs";
import { createRetrievalService } from "./retrieval/retrieval-service.mjs";
import { createVectorClient } from "./retrieval/vector.mjs";
import { createContextHandlers } from "./transport/handlers/context-handlers.mjs";
import { createHealthHandler } from "./transport/handlers/health-handlers.mjs";
import { createKnowledgeHandlers } from "./transport/handlers/knowledge-handlers.mjs";
import { createLifecycleHandlers } from "./transport/handlers/lifecycle-handlers.mjs";
import { createMemoryHandlers } from "./transport/handlers/memory-handlers.mjs";
import { createVaultHandlers } from "./transport/handlers/vault-handlers.mjs";
import { createStdioJsonRpcServer } from "./transport/stdio-jsonrpc-server.mjs";
import { ToolRegistry } from "./transport/tool-registry.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MIGRATIONS_DIR = path.join(here, "db", "migrations");
const GKS_PROVIDER_MODES = new Set(["unconfigured", "sqlite"]);

/**
 * @param {object} options
 * @param {string} options.dbPath absolute path to the SQLite database file (MSP_DB_PATH).
 * @param {"unconfigured"|"sqlite"} [options.gksProviderMode] explicit GKS provider selection.
 * @param {string} [options.migrationsDir] override for testing.
 * @param {NodeJS.ReadableStream} [options.input] override for testing.
 * @param {NodeJS.WritableStream} [options.output] override for testing.
 * @param {(args: Record<string, unknown>) => object|Promise<object>} [options.mspProbe]
 * @param {(args: Record<string, unknown>) => object|Promise<object>} [options.gksProbe]
 * @param {(args: Record<string, unknown>) => object|Promise<object>} [options.storageProbe]
 * @param {number} [options.healthTimeoutMs]
 * @param {() => Date} [options.clock]
 */
export function createServer({
  dbPath,
  gksProviderMode = "unconfigured",
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
  input,
  output,
  mspProbe,
  gksProbe,
  storageProbe,
  healthTimeoutMs = 1_000,
  clock = () => new Date(),
} = {}) {
  if (!dbPath) throw new TypeError("createServer requires dbPath (MSP_DB_PATH).");
  if (!GKS_PROVIDER_MODES.has(gksProviderMode)) {
    throw new TypeError(`Unsupported GKS provider mode "${gksProviderMode}". Expected one of: ${[...GKS_PROVIDER_MODES].join(", ")}.`);
  }

  const db = open(dbPath);
  runMigrations(db, migrationsDir);

  const entityStore = new EntityStore(db);
  const journal = new Journal(db);
  const vaultRegistry = new VaultRegistry(db);
  const linksStore = new LinksStore(db);
  const vectorClient = createVectorClient();
  const retrievalService = createRetrievalService({ db, vectorClient });
  const gksProvider = gksProviderMode === "sqlite" ? createSqliteGksProvider({ db, clock }) : null;

  const vaultHandlers = createVaultHandlers({ vaultRegistry, journal });
  const contextHandlers = createContextHandlers({ db, journal });
  const lifecycleHandlers = createLifecycleHandlers({ db, entityStore, vaultRegistry, journal });
  const memoryHandlers = createMemoryHandlers({ db, entityStore, vaultRegistry, journal, retrievalService, vectorClient, linksStore });
  const knowledgeHandlers = gksProvider ? createKnowledgeHandlers({ gksProvider, journal }) : null;

  const effectiveGksProbe = gksProbe ?? (gksProvider ? (() => gksProvider.health()) : undefined);
  const healthHandler = createHealthHandler({
    db,
    mspProbe,
    gksProbe: effectiveGksProbe,
    storageProbe,
    timeoutMs: healthTimeoutMs,
    clock,
  });

  const toolRegistry = new ToolRegistry();
  toolRegistry.register("msp_ping", async () => ({ ok: true, timestamp: clock().toISOString() }));
  toolRegistry.register("msp_health", healthHandler);
  for (const [name, handler] of Object.entries(vaultHandlers)) toolRegistry.register(name, handler);

  for (const [name, handler] of Object.entries(contextHandlers)) {
    if (name === "msp_context_resolve" && knowledgeHandlers) {
      toolRegistry.register(name, async (args = {}) => {
        // The legacy v1 context handler rejects caller-supplied gks: refs by
        // design. In provider mode, canonical refs are selected by MSP/GKS,
        // not trusted from the caller, so persist the ordinary context shell
        // without those refs and merge the governed provider selection.
        const base = await handler({ ...args, knowledge_refs: [] });
        const governed = await knowledgeHandlers.resolveKnowledgeContext(args);
        return {
          ...base,
          ...governed,
          context_id: base.context_id,
          cache_id: base.cache_id,
          policy_decision: "allow",
          policy_decisions: [...(base.policy_decisions ?? []), ...(governed.policy_decisions ?? [])],
          diagnostics: base.diagnostics ?? [],
        };
      });
    } else {
      toolRegistry.register(name, handler);
    }
  }

  for (const [name, handler] of Object.entries(lifecycleHandlers)) {
    if (name === "msp_knowledge_promote" && knowledgeHandlers) {
      toolRegistry.register(name, knowledgeHandlers.msp_knowledge_promote);
    } else {
      toolRegistry.register(name, handler);
    }
  }
  for (const [name, handler] of Object.entries(memoryHandlers)) toolRegistry.register(name, handler);

  const transport = createStdioJsonRpcServer({ toolRegistry, input, output });

  function close() {
    transport.close();
    db.close();
  }

  return {
    db,
    entityStore,
    journal,
    vaultRegistry,
    linksStore,
    retrievalService,
    vectorClient,
    gksProvider,
    healthHandler,
    toolRegistry,
    transport,
    close,
  };
}
