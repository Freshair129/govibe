import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * POC repository classes (prompt §28).
 *
 * Classes A, B, and E are **authored** fixtures, and that is the point: because the tree is
 * declared here, its `ground_truth` is known exactly, so precision and recall can be measured
 * rather than estimated. A real repository can be measured for coverage and timing but not for
 * correctness, because nobody has enumerated what a correct extraction would contain.
 *
 * Classes C and D are real repositories supplied by the caller — this repository (monorepo) and
 * RWANG (agentic). They exercise scale and messiness that a fixture cannot fake.
 */

async function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

/** A — simple single-service application, documented, tested. */
async function buildClassA(root) {
  await write(root, "package.json", JSON.stringify({ name: "poc-a", main: "src/server.js", scripts: { test: "node --test" }, dependencies: { express: "^4.0.0" } }, null, 2));
  await write(root, "package-lock.json", "{}\n");
  await write(root, "src/server.js", "import { store } from './store.js';\nconst app = express();\napp.get('/items', () => store.all());\napp.post('/items', () => store.add());\nexport function boot() { return app; }\n");
  await write(root, "src/store.js", "export const store = { all() { return []; }, add() { return 1; } };\n");
  await write(root, "src/server.test.js", "import { boot } from './server.js';\nboot();\n");
  await write(root, "README.md", "# poc-a\nA single service.\n");
  await write(root, "docs/PRD-items.md", "---\ndoc_id: \"PRD-ITEMS\"\nstatus: \"approved\"\nversion: \"1.0.0\"\n---\n# Items PRD\nFR-001 list items\nFR-002 add item\n");
  return {
    class: "A",
    description: "simple single-service application",
    ground_truth: {
      routes: ["GET /items", "POST /items"],
      modules: ["src/server.js", "src/store.js", "src/server.test.js"],
      import_edges: [["src/server.js", "src/store.js"], ["src/server.test.js", "src/server.js"]],
      requirements: ["FR-001", "FR-002"],
      entities: [],
      agentic_system: false,
    },
  };
}

/** B — medium modular application with data and state. */
async function buildClassB(root) {
  await write(root, "package.json", JSON.stringify({ name: "poc-b", main: "src/index.ts", workspaces: ["modules/*"], scripts: { test: "vitest run", lint: "tsc --noEmit" }, dependencies: { fastify: "^4.0.0", pino: "^8.0.0" } }, null, 2));
  await write(root, "pnpm-lock.yaml", "lockfileVersion: 6\n");
  await write(root, "src/index.ts", "import { orders } from './orders';\nimport { billing } from './billing';\nexport function main() { return orders() + billing(); }\n");
  await write(root, "src/orders.ts", "export type OrderState = 'new' | 'paid' | 'shipped';\nexport function orders() { return 1; }\n");
  await write(root, "src/billing.ts", "export enum InvoiceStatus { Draft = 'draft', Sent = 'sent' }\nexport function billing() { if (!1) { throw new Error('bad'); } return 2; }\n");
  await write(root, "src/orders.test.ts", "import { orders } from './orders';\norders();\n");
  await write(root, "db/migrations/001.sql", "CREATE TABLE orders (\n  id INTEGER PRIMARY KEY,\n  email TEXT UNIQUE\n);\nCREATE TABLE invoices (\n  id INTEGER PRIMARY KEY,\n  FOREIGN KEY (id) REFERENCES orders (id)\n);\n");
  await write(root, "docs/SRS-billing.md", "---\ndoc_id: \"SRS-BILLING\"\nstatus: \"approved\"\nversion: \"1.0.0\"\n---\n# SRS\n## Requirements\nFR-010 issue invoice\nNFR-001 respond under 200ms\n");
  await write(root, "docs/adr/ADR-001-storage.md", "---\ndoc_id: \"ADR-001\"\nstatus: \"accepted\"\nversion: \"1.0.0\"\n---\n# ADR-001\n## Context\nwhy\n## Decision\nsqlite\n## Consequences\nfine\n");
  return {
    class: "B",
    description: "medium modular application with data and state",
    ground_truth: {
      routes: [],
      modules: ["src/index.ts", "src/orders.ts", "src/billing.ts", "src/orders.test.ts"],
      import_edges: [["src/index.ts", "src/orders.ts"], ["src/index.ts", "src/billing.ts"], ["src/orders.test.ts", "src/orders.ts"]],
      requirements: ["FR-010", "NFR-001"],
      entities: ["orders", "invoices"],
      state_shapes: ["OrderState", "InvoiceStatus"],
      agentic_system: false,
    },
  };
}

/** E — poor or no documentation. The hardest honest case: nothing top-down to recover. */
async function buildClassE(root) {
  await write(root, "package.json", JSON.stringify({ name: "poc-e", main: "index.js" }, null, 2));
  await write(root, "index.js", "const h = require('./helper');\nmodule.exports = () => h();\n");
  await write(root, "helper.js", "module.exports = () => 42;\n");
  await write(root, "lib/util.js", "module.exports = { noop() {} };\n");
  return {
    class: "E",
    description: "repository with poor or no documentation",
    ground_truth: {
      routes: [],
      modules: ["index.js", "helper.js", "lib/util.js"],
      // CommonJS `require` is not an ESM import declaration, so the structural extractor
      // recovers no edges here. Declared as zero so the measurement reports a real recall
      // limit rather than crediting the scanner for finding nothing.
      import_edges: [],
      requirements: [],
      entities: [],
      agentic_system: false,
      expected_limitation: "commonjs require() is not extracted; the dependency graph is empty by construction",
    },
  };
}

export const POC_CLASSES = Object.freeze({
  A: { builder: buildClassA, kind: "fixture" },
  B: { builder: buildClassB, kind: "fixture" },
  C: { builder: null, kind: "real-repository", note: "monorepo — supplied by the caller" },
  D: { builder: null, kind: "real-repository", note: "agentic repository (RWANG) — supplied by the caller" },
  E: { builder: buildClassE, kind: "fixture" },
});

export async function buildPocFixture(classId, root) {
  const entry = POC_CLASSES[classId];
  if (!entry?.builder) throw new Error(`POC class ${classId} is a real repository and has no fixture builder.`);
  return entry.builder(root);
}
