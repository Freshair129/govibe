import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runMode2Scan } from "./pipeline.mjs";
import { extractAnnotations } from "./stages-verification.mjs";
import { createWorkspaceAdapter } from "./workspace-adapter.mjs";

/**
 * Tranche 2 stages (5–11). The fixture carries real signals for each stage so the assertions
 * exercise extraction rather than empty-input short circuits.
 */

let root;

async function write(relativePath, content) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

function adapterFor(client = "claude-code") {
  return createWorkspaceAdapter({ client, workspaceRoot: root });
}

async function artifact(runId, stage) {
  return JSON.parse(await readFile(path.join(root, ".govibe/mode2/scan/runs", runId, "artifacts", `${String(stage).padStart(2, "0")}.json`), "utf8"));
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "govibe-mode2-t2-"));
  await write("package.json", JSON.stringify({
    name: "t2-fixture",
    main: "src/server.ts",
    bin: { "t2-cli": "src/cli.ts" },
    scripts: { lint: "tsc --noEmit", test: "vitest run", build: "vite build", "security:audit": "npm audit" },
    dependencies: { express: "^4.0.0", pino: "^8.0.0", ioredis: "^5.0.0", jsonwebtoken: "^9.0.0" },
  }, null, 2));
  await write("package-lock.json", "{}\n");

  await write("src/server.ts", [
    "import { handle } from './handler';",
    "import { log } from './log';",
    "const app = express();",
    "app.get('/health', () => handle('health'));",
    "app.post('/orders', () => handle('order'));",
    "const rows = new Map(); rows.get('not-a-route');",
    "fetch('https://api.example.com/v1/orders');",
    "app.on('order.created', () => log('created'));",
    "export function boot() { return app; }",
  ].join("\n"));
  await write("src/cli.ts", "import { boot } from './server';\nboot();\n");
  await write("src/log.ts", "export function log(message: string) { console.log(message); }\n");
  await write("src/orphan.ts", "export function neverImported() { return 1; }\n");

  await write("src/handler.ts", [
    "// @req FR-001, FR-002 — order intake",
    "// @tested src/handler.test.ts",
    "// @designs §5.5",
    "export enum OrderStatus { Pending = 'pending', Shipped = 'shipped' }",
    "export type PaymentState = 'unpaid' | 'paid';",
    "export function handle(kind: string) {",
    "  if (!kind) { throw new Error('invalid kind'); }",
    "  if (kind.length > 3) { return 'long'; }",
    "  switch (kind as OrderStatus) { case OrderStatus.Pending: return 'p'; default: return 'x'; }",
    "}",
  ].join("\n"));
  await write("src/handler.test.ts", "import { handle } from './handler';\nhandle('x');\n");

  await write("prisma/schema.prisma", [
    "model Order {",
    "  id     String  @id",
    "  email  String  @unique",
    "  items  Item[]  @relation(\"OrderItems\")",
    "}",
    "model Item {",
    "  id   String @id",
    "  name String",
    "}",
  ].join("\n"));
  await write("db/migrations/001_init.sql", [
    "CREATE TABLE customers (",
    "  id INTEGER PRIMARY KEY,",
    "  email TEXT UNIQUE,",
    "  FOREIGN KEY (id) REFERENCES orders (id)",
    ");",
  ].join("\n"));

  await write(".github/workflows/ci.yml", "jobs:\n  build:\n    steps:\n      - run: npm run lint\n      - run: npm run test\n");
  await write("AGENTS.md", "# operating contract\n");
  await write("CLAUDE.md", "# claude instructions\n");
  await write(".claude/skills/demo/SKILL.md", "---\nname: demo\n---\n");
  await write(".claude/agents/reviewer.md", "# reviewer subagent\n");
  await write(".mcp.json", JSON.stringify({ mcpServers: { alpha: {}, beta: {} } }));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("Stage 5 — Interface & Integration", () => {
  it("extracts routes only when a path-shaped literal accompanies the verb", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "s5" });
    const model = await artifact("s5", 5);
    const routes = model.interfaces.filter((item) => item.kind === "rest-route");
    expect(routes.map((item) => `${item.method} ${item.route}`).sort()).toEqual(["GET /health", "POST /orders"]);
    // `rows.get('not-a-route')` is a Map access, not a route. The L2 heuristic matched any
    // `.get(` call; requiring a path-shaped argument is what removes it.
    expect(routes.some((item) => item.route === "not-a-route")).toBe(false);
  });

  it("records CLI entrypoints from repository metadata and external hosts from literals", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "s5b" });
    const model = await artifact("s5b", 5);
    expect(model.interfaces.find((item) => item.kind === "cli-entrypoint")).toMatchObject({ name: "t2-cli" });
    expect(model.interfaces.find((item) => item.kind === "external-service")).toMatchObject({ host: "api.example.com" });
    expect(model.interfaces.some((item) => item.kind === "event-listen" && item.channel === "order.created")).toBe(true);
  });
});

describe("Stage 6 — Data Semantic", () => {
  it("parses prisma models, keys, and relations", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "s6" });
    const model = await artifact("s6", 6);
    const order = model.entities.find((entity) => entity.name === "Order");
    expect(order.source).toBe("prisma");
    expect(order.fields.find((field) => field.name === "id").primary_key).toBe(true);
    expect(order.fields.find((field) => field.name === "email").unique).toBe(true);
    expect(model.relations.some((relation) => relation.to === "mode2-entity:Item")).toBe(true);
  });

  it("parses SQL DDL tables and foreign keys without inventing columns", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "s6b" });
    const model = await artifact("s6b", 6);
    const customers = model.entities.find((entity) => entity.name === "customers");
    expect(customers.source).toBe("sql-ddl");
    expect(customers.fields.map((field) => field.name).sort()).toEqual(["email", "id"]);
    expect(model.relations.some((relation) => relation.from === "mode2-entity:customers" && relation.to === "mode2-entity:orders")).toBe(true);
  });
});

describe("Stage 7 — Behaviour", () => {
  it("resolves entrypoints and computes module reachability, flagging unreachable modules", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "s7" });
    const model = await artifact("s7", 7);
    expect(model.granularity).toBe("module");
    expect(model.entrypoints.some((entry) => entry.kind === "module-main" && entry.target === "src/server.ts")).toBe(true);
    expect(model.entrypoints.some((entry) => entry.kind === "npm-script" && entry.name === "lint")).toBe(true);
    expect(model.reachable_modules).toContain("mode2-module:src/handler.ts");
    expect(model.unreachable_modules).toContain("mode2-module:src/orphan.ts");
  });

  it("refuses to claim symbol-level flow it cannot recover", async () => {
    const result = await runMode2Scan({ adapter: adapterFor(), runId: "s7b" });
    const stage7 = result.stageRuns[6];
    expect(stage7.status).toBe("incomplete");
    expect(stage7.error).toBe("behaviour_recovered_at_module_granularity_only");
    expect(stage7.unresolved.some((item) => item.kind === "symbol-level-flow-not-recovered")).toBe(true);
    expect((await artifact("s7b", 7)).execution_paths).toEqual([]);
  });
});

describe("Stage 8 — State & Decision", () => {
  it("recovers enum and string-union state shapes", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "s8" });
    const model = await artifact("s8", 8);
    expect(model.state_shapes.find((shape) => shape.name === "OrderStatus")).toMatchObject({ form: "enum" });
    expect(model.state_shapes.find((shape) => shape.name === "PaymentState")).toMatchObject({ form: "string-union", values: ["unpaid", "paid"] });
  });

  it("classifies branches it can prove and never promotes one to a business decision", async () => {
    const result = await runMode2Scan({ adapter: adapterFor(), runId: "s8b" });
    const model = await artifact("s8b", 8);
    expect(model.branch_counts["error-handling"] ?? model.branch_counts.validation).toBeGreaterThan(0);
    // The specification forbids asserting business intent without evidence. Zero is the
    // correct deterministic result, and it must be stated rather than left implicit.
    expect(model.business_decisions).toEqual([]);
    expect(model.business_decision_note).toMatch(/not derivable deterministically/);
    expect(result.stageRuns[7].error).toBe("business_decision_classification_requires_inference");
  });
});

describe("Stage 9 — Cross-Cutting Concerns", () => {
  it("reports concern presence with citable evidence", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "s9" });
    const model = await artifact("s9", 9);
    expect(model.claim).toBe("presence-with-evidence");
    for (const concern of ["authentication", "logging", "caching", "error_handling"]) {
      expect(model.present).toContain(concern);
    }
    expect(model.observations.every((item) => item.path && item.evidence)).toBe(true);
  });

  it("states that an absent signal is not proof the concern is unimplemented", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "s9b" });
    const model = await artifact("s9b", 9);
    expect(model.absent.length).toBeGreaterThan(0);
    expect(model.absent_note).toMatch(/not that the concern is unimplemented/);
  });
});

describe("Stage 10 — Verification & the ADR-028 D1 annotation extractor", () => {
  it("resolves @tested to a real file and marks it explicit, not inferred", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "s10" });
    const model = await artifact("s10", 10);
    const link = model.annotations.explicit_links.find((item) => item.tag === "tested");
    expect(link).toMatchObject({ to: "mode2-module:src/handler.test.ts", explicit: true, inferred: false, confidence: 1 });
  });

  it("records @req and @designs as UNRESOLVED instead of minting the target", async () => {
    const result = await runMode2Scan({ adapter: adapterFor(), runId: "s10b" });
    const stage10 = result.stageRuns[9];
    const targets = stage10.unresolved.filter((item) => item.kind === "unresolved-annotation-target");
    expect(targets.map((item) => item.target)).toEqual(expect.arrayContaining(["FR-001", "FR-002", "§5.5"]));
    // A scanner that created FR-001 because a comment named it would be minting identity.
    const model = await artifact("s10b", 10);
    expect(model.annotations.explicit_links.some((item) => item.to?.includes("FR-001"))).toBe(false);
  });

  it("keeps import-derived coverage links inferred and lower-confidence than annotations", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "s10c" });
    const model = await artifact("s10c", 10);
    const inferred = model.inferred_links.find((item) => item.rel === "EXERCISES");
    expect(inferred).toMatchObject({ explicit: false, inferred: true });
    expect(inferred.confidence).toBeLessThan(1);
  });

  it("discovers CI invocations and declared gates but names unparsed CI semantics", async () => {
    const result = await runMode2Scan({ adapter: adapterFor(), runId: "s10d" });
    const model = await artifact("s10d", 10);
    expect(model.gates.filter((gate) => gate.kind === "ci-invocation").map((gate) => gate.script).sort()).toEqual(["lint", "test"]);
    expect(model.gates.some((gate) => gate.kind === "declared-security")).toBe(true);
    expect(result.stageRuns[9].unresolved.some((item) => item.kind === "unparsed-ci-semantics")).toBe(true);
  });

  it("extractAnnotations is isolated so rejecting ADR-028 D1 is a clean deletion", () => {
    const { links, unresolved } = extractAnnotations({
      file: { path: "a.ts" },
      text: "// @tested b.ts\n// @req FR-9\n",
      knownPaths: new Set(["a.ts", "b.ts"]),
    });
    expect(links).toHaveLength(1);
    expect(unresolved).toHaveLength(1);
  });
});

describe("Stage 11 — Agentic System Scan (mandatory)", () => {
  it("detects the external agent system and classifies capability axes", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "s11" });
    const manifest = await artifact("s11", 11);
    expect(manifest.agentic_system_detected).toBe(true);
    expect(manifest.detected_clients).toContain("claude-code");
    expect(manifest.observed_capabilities.skills).toContain(".claude/skills/demo/SKILL.md");
    expect(manifest.observed_capabilities.subagents).toContain(".claude/agents/reviewer.md");
    expect(manifest.mcp.servers).toEqual(["alpha", "beta"]);
    expect(manifest.capabilities.find((item) => item.axis === "governor").classification).toBe("HYBRID");
    expect(manifest.boundary).toMatch(/never replaced/);
  });

  it("reports absence as evidence rather than silence, and never as not_applicable", async () => {
    const bare = await mkdtemp(path.join(tmpdir(), "govibe-mode2-bare-"));
    try {
      await writeFile(path.join(bare, "index.js"), "module.exports = 1;\n", "utf8");
      const result = await runMode2Scan({ adapter: createWorkspaceAdapter({ workspaceRoot: bare }), runId: "s11b" });
      const stage11 = result.stageRuns[10];
      expect(stage11.status).toBe("complete");
      expect(stage11.status).not.toBe("not_applicable");
      const manifest = JSON.parse(await readFile(path.join(bare, ".govibe/mode2/scan/runs/s11b/artifacts/11.json"), "utf8"));
      expect(manifest.agentic_system_detected).toBe(false);
      expect(manifest.absence_evidence).toMatch(/none present/);
    } finally {
      await rm(bare, { recursive: true, force: true });
    }
  });

  it("does not let an undetectable axis read as an external gap", async () => {
    const result = await runMode2Scan({ adapter: adapterFor(), runId: "s11c" });
    const stage11 = result.stageRuns[10];
    const notes = stage11.unresolved.filter((item) => item.kind === "capability-not-discoverable-from-filesystem");
    expect(notes.map((item) => item.axis)).toEqual(
      expect.arrayContaining(["task_lifecycle", "handoff", "model_routing", "fallback", "human_approval", "failure_recovery"]),
    );
  });
});
