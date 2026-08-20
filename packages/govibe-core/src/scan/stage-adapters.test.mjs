import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { inventoryWorkspace } from "./scan.mjs";
import { createDefaultStageAdapters } from "./stage-adapters.mjs";

// TASK-PRD-007 (D2, F4): direct coverage of createDefaultStageAdapters()'s stage functions,
// independent of runDeepScan()/MSP promotion -- the fixtures below are deliberately larger/more
// varied than a 4-file workspace so an unsupported-language file, a per-file AST parse failure,
// and non-schema files that merely mention "model"/"schema" all appear in the SAME scan the way
// they do on the real repo, instead of each defect having its own trivial single-purpose fixture.

const STAGE = { SCAN: 0, STRUCTURE: 1, MARKDOWN: 2, COBOL: 3, SYMBOLIC: 4, ROUTES: 5, TOOLS: 6, ORM: 7, IMPORTS: 8, INHERITANCE: 9, COMMUNITIES: 10, PROCESSES: 11 };

const roots = [];
// TASK-PRD-007 (B3, round 3): inventoryWorkspace() now spawns `git -C <path> ls-files` per scan.
// On Windows, a just-exited child process can hold the directory tree's handle for a few ms after
// its promise resolves, which can race this cleanup into EBUSY -- maxRetries/retryDelay is Node's
// own documented mitigation for exactly this (see fs.promises.rm docs), not a real leak.
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))));

async function makeRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "govibe-stage-adapters-"));
  roots.push(root);
  return root;
}

async function run(root, stageIndex) {
  const inventory = await inventoryWorkspace(root);
  const adapters = createDefaultStageAdapters();
  return adapters[stageIndex]({ inventory, workspacePath: root });
}

describe("stage 5 (Symbolic Parse) -- D2 coverage-not-abandonment", () => {
  it("parses supported files and records unsupported extensions as a coverage finding, instead of bailing before parsing anything", async () => {
    const root = await makeRoot();
    await mkdir(path.join(root, "src"));
    await writeFile(path.join(root, "src", "good.ts"), "export function good() {}\n");
    await writeFile(path.join(root, "src", "legacy.py"), "def legacy():\n    pass\n");

    const output = await run(root, STAGE.SYMBOLIC);

    expect(output.incomplete).toBeUndefined();
    expect(output.symbols.some((symbol) => symbol.name === "good")).toBe(true);
    expect(output.unresolved_links).toContainEqual(expect.objectContaining({ source_path: "src/legacy.py", relation: "UNSUPPORTED_LANGUAGE", target_label: ".py" }));
  });

  it("skips a file with an AST parse failure and still reports symbols from every other file, recording the failure as a coverage finding", async () => {
    const root = await makeRoot();
    await mkdir(path.join(root, "src"));
    await writeFile(path.join(root, "src", "good.ts"), "export function good() {}\n");
    await writeFile(path.join(root, "src", "broken.ts"), "function broken( {\n");

    const output = await run(root, STAGE.SYMBOLIC);

    expect(output.symbols.some((symbol) => symbol.name === "good")).toBe(true);
    expect(output.unresolved_links.some((link) => link.source_path === "src/broken.ts" && link.relation === "PARSE_FAILURE")).toBe(true);
  });
});

describe("stages 6/7/9/10 share the same parseTypeScriptFiles() root cause -- a per-file parse failure must not kill the stage", () => {
  async function brokenAndGoodFixture() {
    const root = await makeRoot();
    await mkdir(path.join(root, "src"));
    await writeFile(path.join(root, "src", "broken.ts"), "function broken( {\n");
    return root;
  }

  it("stage 9 (Cross-File Resolution / imports) still resolves imports between two good files despite a third, unparseable file", async () => {
    const root = await brokenAndGoodFixture();
    await writeFile(path.join(root, "src", "a.ts"), 'import { b } from "./b";\nexport function a() { b(); }\n');
    await writeFile(path.join(root, "src", "b.ts"), "export function b() {}\n");

    const output = await run(root, STAGE.IMPORTS);

    expect(output.notApplicable).toBeUndefined();
    expect(output.edges.some((edge) => edge.from === "file:src/a.ts" && edge.to === "file:src/b.ts")).toBe(true);
    expect(output.unresolved_links.some((link) => link.source_path === "src/broken.ts" && link.relation === "PARSE_FAILURE")).toBe(true);
  });

  it("stage 10 (MRO/inheritance) still resolves a real INHERITS edge despite a third, unparseable file, AND despite one class extending an unresolvable base (its own former all-or-nothing bug)", async () => {
    const root = await brokenAndGoodFixture();
    await writeFile(path.join(root, "src", "base.ts"), "export class Base {}\n");
    await writeFile(path.join(root, "src", "derived.ts"), 'import { Base } from "./base";\nexport class Derived extends Base {}\n');
    await writeFile(path.join(root, "src", "external.ts"), "export class UsesExternal extends SomeThirdPartyBase {}\n");

    const output = await run(root, STAGE.INHERITANCE);

    expect(output.notApplicable).toBeUndefined();
    expect(output.edges.length).toBe(1);
    expect(output.edges[0]).toMatchObject({ rel: "INHERITS" });
    // Both the broken file AND the unresolvable heritage clause are coverage findings, not stage
    // failures.
    expect(output.unresolved_links.some((link) => link.source_path === "src/broken.ts" && link.relation === "PARSE_FAILURE")).toBe(true);
    expect(output.unresolved_links.some((link) => link.relation === "UNRESOLVED_INHERITANCE" && link.target_label === "UsesExternal->SomeThirdPartyBase")).toBe(true);
  });

  it("stage 6 (Routes) and stage 7 (Tools) still report what they found despite an unparseable file", async () => {
    const root = await brokenAndGoodFixture();
    await writeFile(path.join(root, "src", "server.ts"), 'app.get("/health", handler);\n');
    await writeFile(path.join(root, "src", "tool.ts"), 'const name = "govibe.workspace.scan";\n');

    const routesOutput = await run(root, STAGE.ROUTES);
    expect(routesOutput.notApplicable).toBeUndefined();
    expect(routesOutput.nodes.some((node) => node.props.path === "src/server.ts")).toBe(true);
    expect(routesOutput.unresolved_links.some((link) => link.source_path === "src/broken.ts")).toBe(true);

    const toolsOutput = await run(root, STAGE.TOOLS);
    expect(toolsOutput.notApplicable).toBeUndefined();
    expect(toolsOutput.nodes.some((node) => node.id === "tool:govibe.workspace.scan")).toBe(true);
    expect(toolsOutput.unresolved_links.some((link) => link.source_path === "src/broken.ts")).toBe(true);
  });
});

describe("stage 6 (Routes) -- B2 (round 3): no fabricated routes", () => {
  it("does not promote a non-router call whose text merely ends in .get/.post/.delete -- the exact false positives measured on this repo", async () => {
    const root = await makeRoot();
    await mkdir(path.join(root, "src"));
    await writeFile(
      path.join(root, "src", "not-routes.ts"),
      [
        'const id = searchParams.get("id");',
        "class Client { post(url: string, body: unknown) { return fetch(url, { method: \"POST\", body: JSON.stringify(body) }); } }",
        "const client = new Client();",
        'client.post("/api/foo", {});', // property name IS "post", but "client" is not an app/router handle
        "const target = {}; const value = Reflect.get(target, \"key\");",
        "const map = new Map(); const cached = map.get(\"key\");",
      ].join("\n"),
    );

    const output = await run(root, STAGE.ROUTES);

    expect(output.notApplicable).toBeDefined();
    expect(output.nodes).toBeUndefined();
  });

  it("still detects a genuine route registration -- an app/router handle, an HTTP-verb method, and a string-literal path", async () => {
    const root = await makeRoot();
    await mkdir(path.join(root, "src"));
    await writeFile(
      path.join(root, "src", "server.ts"),
      [
        'app.get("/health", handler);',
        'router.post("/users", createUser);',
        "const dynamicKey = getKey();",
        "app.get(dynamicKey, handler);", // not a string-literal path -- must NOT be promoted
      ].join("\n"),
    );

    const output = await run(root, STAGE.ROUTES);

    expect(output.notApplicable).toBeUndefined();
    expect(output.nodes).toHaveLength(2);
    expect(output.nodes.map((node) => node.props.route).sort()).toEqual(["/health", "/users"]);
  });
});

describe("stage 8 (ORM) -- F4 tightened extraction", () => {
  it("extracts real table names from CREATE TABLE statements in a real migration file, ignoring ALTER TABLE and prose in the same file", async () => {
    const root = await makeRoot();
    await mkdir(path.join(root, "db", "migrations"), { recursive: true });
    await writeFile(
      path.join(root, "db", "migrations", "0001_init.sql"),
      [
        "-- plain ALTER TABLE ADD COLUMN ... NOT NULL is unexpectedly disallowed without a default",
        "CREATE TABLE users (",
        "  id TEXT PRIMARY KEY",
        ");",
        "ALTER TABLE users ADD COLUMN name TEXT;",
        "CREATE TABLE IF NOT EXISTS sessions (id TEXT);",
      ].join("\n"),
    );

    const output = await run(root, STAGE.ORM);

    const names = output.nodes.map((node) => node.props.name);
    expect(names).toEqual(["users", "sessions"]);
    expect(names).not.toContain("ADD");
    expect(names).not.toContain("without");
    expect(names).not.toContain("unexpectedly");
  });

  it("does not treat a markdown/doc file that merely has 'model' or 'migration' in its path as an ORM source", async () => {
    const root = await makeRoot();
    await mkdir(path.join(root, "docs"), { recursive: true });
    await writeFile(path.join(root, "docs", "MIGRATION-PLAN-template.md"), "The data model for this migration includes a table of users.\n");

    const output = await run(root, STAGE.ORM);

    expect(output.notApplicable).toBeDefined();
    expect(output.nodes).toBeUndefined();
  });

  // TASK-PRD-007 (B4, round 3): this used to assert `notApplicable` here, which round 3 confirmed
  // is FALSE: `not_applicable` means "the inventory excludes this stage" (stage-runner.mjs writes
  // `method: "inventory-exclusion"`, `confidence: 1`, MSP verdict "passed"), but a real .sql file
  // under db/schema/ IS present -- extraction just found nothing reliable in it. That is a
  // coverage gap (`incomplete`), not an exclusion; the exclusion string would otherwise
  // contradict its own reason and flip validateDeepScan into reporting a scan that found no
  // schema entities as `complete`.
  it("reports incomplete (a coverage gap, not an exclusion) rather than a wrong table list when a real .sql file has no CREATE TABLE statement", async () => {
    const root = await makeRoot();
    await mkdir(path.join(root, "db", "schema"), { recursive: true });
    await writeFile(path.join(root, "db", "schema", "seed.sql"), "INSERT INTO users (id) VALUES ('a');\n");

    const output = await run(root, STAGE.ORM);

    expect(output.notApplicable).toBeUndefined();
    expect(output.incomplete).toBeDefined();
    expect(output.nodes).toBeUndefined();
  });
});

// TASK-PRD-007 (W1-W4): stage 3 (Markdown Document Link Parser) coverage. Measured against the
// real repo before this fix: 103 wikilink occurrences extracted, 48 of them fabricated out of
// fenced/inline code (e.g. `[[:space:]]` -- a POSIX character class inside `git grep -E`
// examples -- 11 occurrences alone), and only 2 of the remaining 55 real links resolved.
describe("stage 3 (Markdown Document Link Parser) -- W1: fenced/inline code must not be harvested as links", () => {
  it("does not fabricate a wikilink or heading from a fenced code block, including the measured `[[:space:]]` POSIX character-class case", async () => {
    const root = await makeRoot();
    await writeFile(
      path.join(root, "doc-a.md"),
      [
        "# Doc A",
        "",
        "```text",
        "git grep -n -E 'foo[[:space:]]*bar'",
        "## Not a real heading, this is fenced content",
        "[[TYPE::Name]]",
        "```",
        "",
        "Real text after the fence, no links here.",
      ].join("\n"),
    );

    const output = await run(root, STAGE.MARKDOWN);

    expect(output.unresolved_links.some((link) => link.target_label === ":space:")).toBe(false);
    expect(output.unresolved_links.some((link) => link.target_label === "TYPE::Name")).toBe(false);
    expect(output.nodes.some((node) => node.labels?.includes("MarkdownSection") && node.props.title === "Not a real heading, this is fenced content")).toBe(false);
  });

  it("does not fabricate a wikilink from an inline code span", async () => {
    const root = await makeRoot();
    await writeFile(
      path.join(root, "doc-a.md"),
      "Use `[[NOT-A-LINK]]` as the wikilink syntax; do not treat this as an actual reference.\n",
    );

    const output = await run(root, STAGE.MARKDOWN);

    expect(output.unresolved_links.some((link) => link.target_label === "NOT-A-LINK")).toBe(false);
    expect(output.edges ?? []).toHaveLength(0);
  });

  it("still extracts a real wikilink and a real heading that are outside any fence or code span", async () => {
    const root = await makeRoot();
    await writeFile(path.join(root, "doc-a.md"), ["# Doc A", "", "See [[doc-b.md]] for details.", "", "```text", "fenced noise [[ignored]]", "```"].join("\n"));
    await writeFile(path.join(root, "doc-b.md"), "# Doc B\n");

    const output = await run(root, STAGE.MARKDOWN);

    expect(output.nodes.some((node) => node.labels?.includes("MarkdownSection") && node.props.title === "Doc A")).toBe(true);
    expect(output.edges.some((edge) => edge.from === "file:doc-a.md" && edge.to === "file:doc-b.md" && edge.rel === "WIKILINK")).toBe(true);
    expect(output.unresolved_links.some((link) => link.target_label === "ignored")).toBe(false);
  });
});

describe("stage 3 -- W2: resolver gaps measured on this repo", () => {
  it("resolves a bare wikilink label by appending .md, the dominant real-repo gap (byBasename keys always carry the extension)", async () => {
    const root = await makeRoot();
    await writeFile(path.join(root, "doc-a.md"), "See [[STD-Execution-Governance]] for the governance standard.\n");
    await writeFile(path.join(root, "STD-Execution-Governance.md"), "# Standard\n");

    const output = await run(root, STAGE.MARKDOWN);

    expect(output.edges.some((edge) => edge.from === "file:doc-a.md" && edge.to === "file:STD-Execution-Governance.md")).toBe(true);
    expect(output.unresolved_links.some((link) => link.target_label === "STD-Execution-Governance")).toBe(false);
  });

  it("resolves a wikilink label against a doc_id STEM, case-insensitively (label is a prefix of the full frontmatter doc_id)", async () => {
    const root = await makeRoot();
    await writeFile(path.join(root, "doc-a.md"), "See [[ADR-022]] for the decision.\n");
    await writeFile(path.join(root, "adr-022-full.md"), '---\ndoc_id: "ADR-022-VAULT-OWNERSHIP-CONTEXT-LINEAGE"\n---\n\n# ADR-022\n');

    const output = await run(root, STAGE.MARKDOWN);

    expect(output.edges.some((edge) => edge.from === "file:doc-a.md" && edge.to === "file:adr-022-full.md")).toBe(true);
    expect(output.unresolved_links.some((link) => link.target_label === "ADR-022")).toBe(false);
  });

  it("a TYPE--NAME-shaped label that DOES have a real document resolves normally rather than being misclassified as an entity reference", async () => {
    const root = await makeRoot();
    await writeFile(path.join(root, "doc-a.md"), "See [[CONCEPT--WIDGET]] for the concept.\n");
    await writeFile(path.join(root, "CONCEPT--WIDGET.md"), "# Widget concept\n");

    const output = await run(root, STAGE.MARKDOWN);

    expect(output.edges.some((edge) => edge.from === "file:doc-a.md" && edge.to === "file:CONCEPT--WIDGET.md")).toBe(true);
    expect(output.unresolved_links.some((link) => link.target_label === "CONCEPT--WIDGET")).toBe(false);
  });
});

describe("stage 3 -- W3: ambiguity is recorded, not silently disabled or picked", () => {
  it("records an ambiguous_target unresolved_link (with both candidates) instead of resolving to either file when two documents share a basename", async () => {
    const root = await makeRoot();
    await mkdir(path.join(root, "team-a"));
    await mkdir(path.join(root, "team-b"));
    await writeFile(path.join(root, "team-a", "README.md"), "# Team A\n");
    await writeFile(path.join(root, "team-b", "README.md"), "# Team B\n");
    await writeFile(path.join(root, "doc-a.md"), "See [[README.md]] for onboarding.\n");

    const output = await run(root, STAGE.MARKDOWN);

    expect(output.edges.some((edge) => edge.from === "file:doc-a.md")).toBe(false);
    const ambiguous = output.unresolved_links.find((link) => link.target_label === "README.md");
    expect(ambiguous).toBeDefined();
    expect(ambiguous.reason).toBe("ambiguous_target");
    expect(ambiguous.candidates?.slice().sort()).toEqual(["team-a/README.md", "team-b/README.md"]);
  });
});

describe("stage 3 -- W4: honest, distinct reasons for genuinely unresolved labels", () => {
  it("classifies a TYPE::NAME entity reference with no matching document as entity_reference_not_a_document, not a generic broken link", async () => {
    const root = await makeRoot();
    await writeFile(path.join(root, "doc-a.md"), "See [[AGENT::LYRA]] for the planner agent.\n");

    const output = await run(root, STAGE.MARKDOWN);

    const entry = output.unresolved_links.find((link) => link.target_label === "AGENT::LYRA");
    expect(entry).toBeDefined();
    expect(entry.reason).toBe("entity_reference_not_a_document");
  });

  it("classifies a genuinely missing document link as document_not_found, distinct from an entity reference", async () => {
    const root = await makeRoot();
    await writeFile(path.join(root, "doc-a.md"), "See [[TOTALLY-MISSING-DOC]] for details.\n");

    const output = await run(root, STAGE.MARKDOWN);

    const entry = output.unresolved_links.find((link) => link.target_label === "TOTALLY-MISSING-DOC");
    expect(entry).toBeDefined();
    expect(entry.reason).toBe("document_not_found");
  });
});
