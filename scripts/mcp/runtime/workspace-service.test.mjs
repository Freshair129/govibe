import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

// TASK-PRD-007: default implementation delegates to the real scanWorkspace so most tests exercise
// the actual scan pipeline; individual tests override the mock for one call via
// mockResolvedValueOnce/mockImplementationOnce to inject a precise `observed` shape without
// needing to create thousands of fixture files to force truncation or unresolved-edge cases.
vi.mock("../../../packages/govibe-core/src/index.mjs", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, scanWorkspace: vi.fn(actual.scanWorkspace) };
});

import { isMissionEvent, MISSION_PROTOCOL_LIMITS } from "../../../packages/mission-protocol/index.js";
import { MspClient, scanWorkspace } from "../../../packages/govibe-core/src/index.mjs";
import { RuntimeSnapshotStore, createRuntimeSnapshot } from "./snapshot-store.mjs";
import { mapObservedGraph, MAX_PUBLISHED_WORKFLOW_RUNS, SCAN_SLICE_WIRE_BYTE_BUDGET, WorkspaceService } from "./workspace-service.mjs";

function contextAuthority() {
  return {
    schemaVersion: "govibe-context-authority/v1",
    identity: { taskId: "TASK-workspace", agentId: "workspace-agent", workspaceId: "workspace-service", runId: "run-workspace", sessionId: "session-workspace", turnId: "turn-workspace" },
    sources: [{ id: "API-007", version: "0.1.0", hash: "a".repeat(64) }],
    requiredReasonRefs: ["issue:workspace"],
    traversal: { relationAllowlist: ["implements"], retrievalRadius: 1, inclusions: [], exclusions: [] },
    knowledgeRefs: [], budget: { maxTokens: 1024, compaction: "bounded" },
    lineage: { contextId: "ctx-workspace", cacheId: "cache-workspace", parentContextId: null }, unresolvedAssumptions: [],
  };
}

const roots = [];
// TASK-PRD-007 (B3, round 3): inventoryWorkspace() now spawns `git -C <path> ls-files` per scan.
// On Windows, a just-exited child process can hold the directory tree's handle for a few ms after
// its promise resolves, which can race this cleanup into EBUSY -- maxRetries/retryDelay is Node's
// own documented mitigation for exactly this (see fs.promises.rm docs), not a real leak.
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))));
describe("workspace service", () => {
  it("can be instantiated and validates roots without transports or executors", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-workspace-service-")); roots.push(root);
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: new RuntimeSnapshotStore(createRuntimeSnapshot()) });
    await expect(service.target(root)).resolves.toBe(root);
    await expect(service.target(path.parse(root).root)).rejects.toThrow("outside configured GoVibe roots");
  });

  it("fails closed before loading workspace continuation dependencies without caller authority", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-workspace-service-")); roots.push(root);
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: new RuntimeSnapshotStore(createRuntimeSnapshot()) });
    await expect(service.continue({ workspacePath: root })).rejects.toMatchObject({ code: "missing_runtime_authority" });
  });

  it("rejects a caller agent that differs from the supplied authority before loading dependencies", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-workspace-service-")); roots.push(root);
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: new RuntimeSnapshotStore(createRuntimeSnapshot()) });
    await expect(service.continue({ workspacePath: root, agentId: "other-agent", contextAuthority: contextAuthority() })).rejects.toMatchObject({ code: "authority_identity_mismatch" });
  });
});

// TASK-PRD-007: WorkspaceService.scan() is the sole publisher of snapshot.graph / snapshot.symbols
// -- the slices AstTreeView, GraphStudioView, GraphView, HnswVectorView, SymbolExplorerView, and
// DatabaseErdView all consume. These tests cover the publish/mapping/bounding contract.
async function scanFixtureRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "govibe-workspace-service-scan-"));
  roots.push(root);
  await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "package.json"), "{}\n");
  await writeFile(path.join(root, "README.md"), "# Fixture\n");
  await writeFile(path.join(root, "src", "a.ts"), "export function a() { b(); }\nexport function b() {}\n");
  return root;
}

function mockMsp() {
  const client = new MspClient(async (name, input) => {
    if (name === "msp_knowledge_promote") return { knowledge_ref: `gks:${input.idempotency_key}`, source_hash: "c".repeat(64), promotion_ref: `msp:promotion/${input.idempotency_key}` };
    if (name === "msp_evidence_record") return { proof_ref: `msp:proof/${input.idempotency_key}` };
    throw new Error(`Unexpected tool ${name}`);
  });
  return client;
}

function scanResult(overrides = {}) {
  return { schema: "govibe-scan-result/v1", runId: "run-observed", level: "L2", status: "complete", sourceSnapshotHash: "hash", workspaceId: null, stageRuns: [], graphValidation: { passed: true, errors: [] }, ...overrides };
}

function collectEvents(store) {
  const events = [];
  store.subscribe((event) => events.push(event));
  return events;
}

describe("workspace service scan observed graph publishing", () => {
  it("maps and publishes graph+symbols on a real deep scan, and the emitted graph.update event is protocol-valid", async () => {
    const root = await scanFixtureRoot();
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const events = collectEvents(store);
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: store, mspClient: mockMsp() });

    const result = await service.scan({ workspacePath: root, deep: true, actor: "test", runId: "deep-real-1" });
    expect(result.observed).toBeDefined();

    const snapshot = store.getSnapshot();
    expect(snapshot.graph.nodes.length).toBeGreaterThan(0);
    expect(snapshot.symbols.length).toBeGreaterThan(0);
    expect(snapshot.symbols.some((symbol) => symbol.name === "a" && symbol.kind === "function")).toBe(true);
    // Node label falls back to props.path (file nodes have no name/title).
    const packageNode = snapshot.graph.nodes.find((node) => node.id === "file:package.json");
    expect(packageNode).toMatchObject({ id: "file:package.json", label: "package.json" });
    // Snapshot contract: no extra fields beyond {nodes,edges} / {name,path,kind}.
    expect(Object.keys(snapshot.graph).sort()).toEqual(["edges", "nodes"]);
    for (const symbol of snapshot.symbols) expect(Object.keys(symbol).sort()).toEqual(["kind", "name", "path"]);

    // TASK-PRD-007 defect 2: fixture's src/a.ts has `function a() { b(); }` -- Stage 5 emits a
    // CALLS candidate from symbol a to symbol b. Both symbols must now be published as graph
    // nodes (id = the scan symbol id, label = its name) so this edge survives mapObservedGraph's
    // endpoint check instead of being silently dropped.
    const nodeA = snapshot.graph.nodes.find((node) => node.label === "a");
    const nodeB = snapshot.graph.nodes.find((node) => node.label === "b");
    expect(nodeA).toBeDefined();
    expect(nodeB).toBeDefined();
    expect(nodeA.id.startsWith("symbol:")).toBe(true);
    expect(nodeB.id.startsWith("symbol:")).toBe(true);
    expect(snapshot.graph.edges).toContainEqual({ source: nodeA.id, target: nodeB.id });

    const graphEvent = events.find((event) => event.type === "graph.update");
    expect(graphEvent).toBeDefined();
    expect(graphEvent.graph).toEqual(snapshot.graph);
    expect(isMissionEvent(graphEvent)).toBe(true);
  });

  // TASK-PRD-007 defect 1: Stage 8 (orm-schema-parser) OrmModel nodes genuinely satisfy the
  // {name,path,kind} symbols contract as schema entities -- they must be published into
  // snapshot.symbols with a schema-flavoured kind, in addition to remaining ordinary graph nodes.
  // TypeScript symbols (Stage 5) must never carry that kind.
  it("maps Stage 8 OrmModel nodes into symbols with a schema kind, while TypeScript symbols keep their own kind", async () => {
    scanWorkspace.mockResolvedValueOnce(scanResult({
      observed: {
        nodes: [
          { id: "orm:src/schema/user.ts:0", labels: ["OrmModel"], props: { path: "src/schema/user.ts", name: "User" } },
          { id: "file:src/a.ts", labels: ["File"], props: { path: "src/a.ts" } },
        ],
        edges: [],
        symbols: [{ id: "symbol:src/a.ts:0", name: "a", kind: "function", path: "src/a.ts", line: 1 }],
        totals: { nodes: 2, edges: 0, symbols: 1 },
        truncated: false,
      },
    }));
    const root = await scanFixtureRoot();
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: store, mspClient: {} });

    await service.scan({ workspacePath: root, deep: true });

    const snapshot = store.getSnapshot();
    const ormSymbol = snapshot.symbols.find((symbol) => symbol.name === "User");
    expect(ormSymbol).toEqual({ name: "User", path: "src/schema/user.ts", kind: "orm-model" });
    const tsSymbol = snapshot.symbols.find((symbol) => symbol.name === "a");
    expect(tsSymbol).toEqual({ name: "a", path: "src/a.ts", kind: "function" });
    expect(tsSymbol.kind).not.toBe("orm-model");
    // Still kept as an ordinary graph node too (not only projected into symbols).
    expect(snapshot.graph.nodes).toContainEqual({ id: "orm:src/schema/user.ts:0", label: "User" });
  });

  it("publishes nothing on an L1 (non-deep) scan -- graph/symbols stay at their honest empty state", async () => {
    const root = await scanFixtureRoot();
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const events = collectEvents(store);
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: store, mspClient: {} });

    const result = await service.scan({ workspacePath: root, deep: false });
    expect(result.observed).toBeUndefined();

    const snapshot = store.getSnapshot();
    expect(snapshot.graph).toEqual({ nodes: [], edges: [] });
    expect(snapshot.symbols).toEqual([]);
    expect(events.some((event) => event.type === "graph.update")).toBe(false);
  });

  it("drops edges whose target is null/undefined or whose endpoints are outside the published node set", async () => {
    scanWorkspace.mockResolvedValueOnce(scanResult({
      observed: {
        nodes: [{ id: "file:a.ts", labels: ["File"], props: { path: "a.ts" } }],
        edges: [
          { id: "e-null-to", from: "file:a.ts", to: null, rel: "CALLS", props: {} },
          { id: "e-unresolved-target", from: "file:a.ts", to: "file:missing.ts", rel: "IMPORTS", props: {} },
          { id: "e-symbol-source", from: "symbol:a.ts:0", to: "file:a.ts", rel: "CALLS", props: {} },
        ],
        symbols: [],
        totals: { nodes: 1, edges: 3, symbols: 0 },
        truncated: false,
      },
    }));
    const root = await scanFixtureRoot();
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: store, mspClient: {} });

    await service.scan({ workspacePath: root, deep: true });

    const snapshot = store.getSnapshot();
    expect(snapshot.graph.nodes).toEqual([{ id: "file:a.ts", label: "a.ts" }]);
    expect(snapshot.graph.edges).toEqual([]);
  });

  // TASK-PRD-007 defect 2: CALLS (Stage 5) and INHERITS (Stage 10) edges reference `symbol:*`
  // ids. Now that observed symbols are also published as graph nodes, these edges must resolve
  // and survive mapObservedGraph's endpoint check -- while an edge with `to: null` (an
  // unresolved call candidate) must still be dropped, even between two published symbol nodes.
  it("resolves CALLS/INHERITS edges between two published symbol nodes, and still drops a to:null edge", async () => {
    scanWorkspace.mockResolvedValueOnce(scanResult({
      observed: {
        nodes: [],
        edges: [
          { id: "calls-1", from: "symbol:src/a.ts:0", to: "symbol:src/a.ts:20", rel: "CALLS", props: {} },
          { id: "inherits-1", from: "symbol:src/b.ts:0", to: "symbol:src/a.ts:0", rel: "INHERITS", props: {} },
          { id: "calls-unresolved", from: "symbol:src/a.ts:0", to: null, rel: "CALLS", props: {} },
        ],
        symbols: [
          { id: "symbol:src/a.ts:0", name: "a", kind: "function", path: "src/a.ts", line: 1 },
          { id: "symbol:src/a.ts:20", name: "b", kind: "function", path: "src/a.ts", line: 2 },
          { id: "symbol:src/b.ts:0", name: "Derived", kind: "class", path: "src/b.ts", line: 1 },
        ],
        totals: { nodes: 0, edges: 3, symbols: 3 },
        truncated: false,
      },
    }));
    const root = await scanFixtureRoot();
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: store, mspClient: {} });

    await service.scan({ workspacePath: root, deep: true });

    const snapshot = store.getSnapshot();
    expect(snapshot.graph.nodes).toContainEqual({ id: "symbol:src/a.ts:0", label: "a" });
    expect(snapshot.graph.nodes).toContainEqual({ id: "symbol:src/a.ts:20", label: "b" });
    expect(snapshot.graph.nodes).toContainEqual({ id: "symbol:src/b.ts:0", label: "Derived" });
    expect(snapshot.graph.edges).toContainEqual({ source: "symbol:src/a.ts:0", target: "symbol:src/a.ts:20" });
    expect(snapshot.graph.edges).toContainEqual({ source: "symbol:src/b.ts:0", target: "symbol:src/a.ts:0" });
    expect(snapshot.graph.edges).toHaveLength(2);
  });

  it("sets truncated and writes a terminal warning naming the real totals and what was published, when the accumulator was capped", async () => {
    scanWorkspace.mockResolvedValueOnce(scanResult({
      observed: {
        nodes: [{ id: "file:a.ts", labels: ["File"], props: { path: "a.ts" } }],
        edges: [],
        symbols: [],
        totals: { nodes: 5000, edges: 10, symbols: 3 },
        truncated: true,
      },
    }));
    const root = await scanFixtureRoot();
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: store, mspClient: {} });

    await service.scan({ workspacePath: root, deep: true });

    const snapshot = store.getSnapshot();
    const warning = snapshot.terminal.find((line) => line.type === "warn" && /capped/i.test(line.text));
    expect(warning).toBeDefined();
    // TASK-PRD-007 (round 4, M3): the "nodes" denominator is `totals.nodes + totals.symbols`
    // (5000 + 3), not `totals.nodes` alone -- graph.nodes counts candidates from BOTH
    // populations (a TypeScript symbol is published as a graph node too), so the denominator
    // must cover the same population the numerator does.
    expect(warning.text).toContain("1/5003");
    expect(warning.text).toContain("0/10");
    expect(warning.text).toContain("0/3");
  });

  // TASK-PRD-007 (F5b): stage 7 emits `id: tool:${node.text}`, so the same tool string appearing
  // in several files yields duplicate node ids in the observed accumulator. Published nodes must
  // be deduped by id.
  it("dedupes published nodes by id (same tool string discovered in two different files)", async () => {
    scanWorkspace.mockResolvedValueOnce(scanResult({
      observed: {
        nodes: [
          { id: "tool:govibe.workspace.scan", labels: ["Tool"], props: { path: "a.ts", name: "govibe.workspace.scan" } },
          { id: "tool:govibe.workspace.scan", labels: ["Tool"], props: { path: "b.ts", name: "govibe.workspace.scan" } },
        ],
        edges: [],
        symbols: [],
        totals: { nodes: 2, edges: 0, symbols: 0 },
        truncated: false,
      },
    }));
    const root = await scanFixtureRoot();
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: store, mspClient: {} });

    await service.scan({ workspacePath: root, deep: true });

    const snapshot = store.getSnapshot();
    expect(snapshot.graph.nodes).toHaveLength(1);
    expect(snapshot.graph.nodes[0].id).toBe("tool:govibe.workspace.scan");
  });

  // TASK-PRD-007 (F5b): stage 3 can emit both a WIKILINK and a REFERENCES edge for the same file
  // pair, and stage 9 an IMPORTS edge over the same pair -- mapping drops `rel`, so these become
  // byte-identical published {source,target} duplicates unless deduped.
  it("dedupes published edges by (source,target) even when they came from different relation types", async () => {
    scanWorkspace.mockResolvedValueOnce(scanResult({
      observed: {
        nodes: [
          { id: "file:a.ts", labels: ["File"], props: { path: "a.ts" } },
          { id: "file:b.ts", labels: ["File"], props: { path: "b.ts" } },
        ],
        edges: [
          { id: "link-candidate:wikilink:a.ts:b.ts", from: "file:a.ts", to: "file:b.ts", rel: "WIKILINK", props: {} },
          { id: "link-candidate:references:a.ts:b.ts", from: "file:a.ts", to: "file:b.ts", rel: "REFERENCES", props: {} },
          { id: "imports:a.ts:b.ts", from: "file:a.ts", to: "file:b.ts", rel: "IMPORTS", props: {} },
        ],
        symbols: [],
        totals: { nodes: 2, edges: 3, symbols: 0 },
        truncated: false,
      },
    }));
    const root = await scanFixtureRoot();
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: store, mspClient: {} });

    await service.scan({ workspacePath: root, deep: true });

    const snapshot = store.getSnapshot();
    expect(snapshot.graph.edges).toEqual([{ source: "file:a.ts", target: "file:b.ts" }]);
  });

  // TASK-PRD-007 (F5b): stage 8 can yield two OrmModel matches with an identical {name,path}
  // (e.g. two CREATE TABLE statements for a renamed table with the same final name).
  it("dedupes published symbols by identical {name,path}", async () => {
    scanWorkspace.mockResolvedValueOnce(scanResult({
      observed: {
        nodes: [
          { id: "orm:db/migrations/0001.sql:0", labels: ["OrmModel"], props: { path: "db/migrations/0001.sql", name: "users" } },
          { id: "orm:db/migrations/0002.sql:0", labels: ["OrmModel"], props: { path: "db/migrations/0001.sql", name: "users" } },
        ],
        edges: [],
        symbols: [],
        totals: { nodes: 2, edges: 0, symbols: 0 },
        truncated: false,
      },
    }));
    const root = await scanFixtureRoot();
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: store, mspClient: {} });

    await service.scan({ workspacePath: root, deep: true });

    const snapshot = store.getSnapshot();
    expect(snapshot.symbols).toEqual([{ name: "users", path: "db/migrations/0001.sql", kind: "orm-model" }]);
    // Both OrmModel nodes are still published as ordinary graph nodes (different ids) -- only the
    // projected `symbols` entry is deduped.
    expect(snapshot.graph.nodes).toHaveLength(2);
  });

  // TASK-PRD-007 (B8, round 3): two DIFFERENT symbols that merely share a name and file (a
  // `run()` method on class A and another `run()` method on class B in the SAME file) must not
  // collapse into one published entry -- that is data loss, not dedup. Distinguished here by
  // `line` (both are real, distinct AST declarations at different positions).
  it("does NOT collapse two distinct symbols that share {name,path} but differ in position (B8: dedup was silently dropping data)", async () => {
    scanWorkspace.mockResolvedValueOnce(scanResult({
      observed: {
        nodes: [],
        edges: [],
        symbols: [
          { id: "symbol:src/two-classes.ts:10", name: "run", kind: "method", path: "src/two-classes.ts", line: 2 },
          { id: "symbol:src/two-classes.ts:60", name: "run", kind: "method", path: "src/two-classes.ts", line: 8 },
        ],
        totals: { nodes: 0, edges: 0, symbols: 2 },
        truncated: false,
      },
    }));
    const root = await scanFixtureRoot();
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: store, mspClient: {} });

    await service.scan({ workspacePath: root, deep: true });

    const snapshot = store.getSnapshot();
    // Both survive, and the published shape is still exactly {name, path, kind} -- no leaked
    // `line`/`position` field.
    expect(snapshot.symbols).toEqual([
      { name: "run", path: "src/two-classes.ts", kind: "method" },
      { name: "run", path: "src/two-classes.ts", kind: "method" },
    ]);
    expect(snapshot.symbols).toHaveLength(2);
  });

  // TASK-PRD-007 (F2): the truncation warning must report the TRUE PUBLISHED counts, not the
  // pre-mapping accumulator length -- this fixture's accumulator holds 2 edges, but only 1
  // survives the endpoint filter (the other's target was never published), so the warning must
  // say "1/10", never "2/10".
  it("truncation warning reports true published counts, which can differ from the accumulator's own length", async () => {
    scanWorkspace.mockResolvedValueOnce(scanResult({
      observed: {
        nodes: [{ id: "file:a.ts", labels: ["File"], props: { path: "a.ts" } }],
        edges: [
          { id: "e1", from: "file:a.ts", to: "file:missing.ts", rel: "IMPORTS", props: {} },
        ],
        symbols: [],
        totals: { nodes: 5000, edges: 10, symbols: 3 },
        truncated: true,
      },
    }));
    const root = await scanFixtureRoot();
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: store, mspClient: {} });

    await service.scan({ workspacePath: root, deep: true });

    const snapshot = store.getSnapshot();
    const warning = snapshot.terminal.find((line) => line.type === "warn" && /capped/i.test(line.text));
    expect(warning).toBeDefined();
    // TASK-PRD-007 (round 4, M3): denominator is totals.nodes(5000) + totals.symbols(3) -- see
    // the equivalent comment on the previous test.
    expect(warning.text).toContain("1/5003");
    // The accumulator held 1 edge (already reflected in totals.edges=10 as the true production
    // count), and 0 of it survived the endpoint filter -- the warning must say "0/10", matching
    // what was actually published, not what the accumulator held before the endpoint filter ran.
    expect(warning.text).toContain("0/10");
  });

  // TASK-PRD-007 (round 4, M3): the regression this must catch -- every OTHER mapObservedGraph
  // fixture in this file has either a non-empty node total OR a non-empty symbols population,
  // never both at once, which is exactly how a real scan of this repo shipped a "1996/1981
  // symbols" warning (published symbols EXCEEDING the reported total) with full test coverage
  // green. This fixture combines a Stage 8 OrmModel node (projected into BOTH graph.nodes and
  // graph.symbols) with a Stage 5 TypeScript symbol in the SAME accumulator, so both the "nodes"
  // and "symbols" ratios mix two populations the way a real scan does -- and asserts the
  // denominators cover the SAME population as their numerators (no numerator may exceed its
  // denominator).
  it("reports coherent published/total ratios when both a node total and a non-empty symbols population are present in the same scan (regression: round-3 shipped an inverted '1996/1981 symbols' ratio here)", async () => {
    scanWorkspace.mockResolvedValueOnce(scanResult({
      observed: {
        nodes: [
          { id: "orm:db/schema.sql:0", labels: ["OrmModel"], props: { path: "db/schema.sql", name: "User" } },
          { id: "file:a.ts", labels: ["File"], props: { path: "a.ts" } },
        ],
        edges: [],
        symbols: [{ id: "symbol:a.ts:0", name: "run", kind: "function", path: "a.ts", line: 1 }],
        totals: { nodes: 2, edges: 0, symbols: 1, ormModelNodes: 1 },
        truncated: true,
      },
    }));
    const root = await scanFixtureRoot();
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: store, mspClient: {} });

    await service.scan({ workspacePath: root, deep: true });

    const snapshot = store.getSnapshot();
    // Published population: the OrmModel node + the file node + the TS-symbol-as-node = 3 graph
    // nodes, against a coherent total of totals.nodes(2) + totals.symbols(1) = 3 candidates.
    expect(snapshot.graph.nodes).toHaveLength(3);
    // Published population: the TS symbol + the OrmModel projection = 2 symbols, against a
    // coherent total of totals.symbols(1) + totals.ormModelNodes(1) = 2 candidates -- round 3's
    // formula (denominator = totals.symbols alone = 1) would have reported "2/1" here, a
    // numerator exceeding its own denominator.
    expect(snapshot.symbols).toHaveLength(2);
    const warning = snapshot.terminal.find((line) => line.type === "warn" && /capped/i.test(line.text));
    expect(warning).toBeDefined();
    expect(warning.text).toContain("3/3");
    expect(warning.text).toContain("2/2");
    // The defect class this test exists to catch, stated directly: no published count may exceed
    // the total it is reported against.
    for (const [published, total] of [[3, 3], [2, 2]]) expect(published).toBeLessThanOrEqual(total);
  });

  // TASK-PRD-007 (F2): silent drops are forbidden. An edge losing its endpoint to the endpoint
  // filter must be reported even on a run that was never truncated.
  it("reports edges dropped by the endpoint filter even when the accumulator was never truncated", async () => {
    scanWorkspace.mockResolvedValueOnce(scanResult({
      observed: {
        nodes: [{ id: "file:a.ts", labels: ["File"], props: { path: "a.ts" } }],
        edges: [
          { id: "e1", from: "file:a.ts", to: "file:missing.ts", rel: "IMPORTS", props: {} },
        ],
        symbols: [],
        totals: { nodes: 1, edges: 1, symbols: 0 },
        truncated: false,
      },
    }));
    const root = await scanFixtureRoot();
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: store, mspClient: {} });

    await service.scan({ workspacePath: root, deep: true });

    const snapshot = store.getSnapshot();
    expect(snapshot.terminal.some((line) => line.type === "warn" && /capped/i.test(line.text))).toBe(false);
    const dropWarning = snapshot.terminal.find((line) => line.type === "warn" && /dropped/i.test(line.text));
    expect(dropWarning).toBeDefined();
    expect(dropWarning.text).toContain("1 edge candidate(s) dropped");
  });
});

// TASK-PRD-007 (round 5): boundForWire had NO test at all, and no fixture in this file came
// within two orders of magnitude of the 10,000-item cap -- which is precisely why the gap
// shipped. The bound that actually binds is MISSION_PROTOCOL_LIMITS.eventBytes (1,000,000
// SERIALIZED bytes), enforced by isMissionEvent -> isBoundedRecord -> isBoundedJson. A measured
// deep scan of this repository publishes 3,540 nodes / 2,633 edges = 667,348 bytes of
// `graph.update` and an 869,491-byte initial snapshot frame at ~35% of the item cap; a repo
// ~15% larger crosses the ceiling and the payload is dropped with a generic warning.
//
// Every fixture below is deliberately built to EXCEED the byte budget while staying far under
// the item cap, and each test first proves the unbounded payload would have been rejected --
// otherwise the test would pass against the broken code too.
const WIRE_FIXTURE_ID_PADDING = 600;

function paddedId(prefix, index) {
  return `${prefix}:${String(index).padStart(6, "0")}${"x".repeat(WIRE_FIXTURE_ID_PADDING)}`;
}

// Nodes, edges and symbols are each individually large enough that their combined serialized size
// is more than double the shared budget, so the bound must bite on more than one slice.
function oversizedObserved({ nodeCount = 800, symbolCount = 400 } = {}) {
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({ id: paddedId("file", index), labels: ["File"], props: { path: paddedId("file", index) } }));
  const edges = Array.from({ length: nodeCount - 1 }, (_, index) => ({ id: `edge-${index}`, from: nodes[index].id, to: nodes[index + 1].id, rel: "IMPORTS", props: {} }));
  const symbols = Array.from({ length: symbolCount }, (_, index) => ({ id: paddedId("symbol", index), name: `symbol${index}`, kind: "function", path: paddedId("src", index), line: index }));
  return { nodes, edges, symbols, totals: { nodes: nodeCount, edges: nodeCount - 1, symbols: symbolCount, ormModelNodes: 0 }, truncated: false };
}

function wireBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

// A dense graph: few nodes, but every ordered pair between them is an edge. Nodes and symbols
// both fit inside an equal third, so the whole remaining budget goes to edges and the EDGE byte
// bound is what bites -- the complement of oversizedObserved(), where the node bound bites first
// and edges shrink with it. 100 nodes yield 9,900 edges: under the 10,000-item cap, ~12 MB of
// wire payload.
function denseObserved({ nodeCount = 100, symbolCount = 50 } = {}) {
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({ id: paddedId("file", index), labels: ["File"], props: { path: paddedId("file", index) } }));
  const edges = [];
  for (const from of nodes) {
    for (const to of nodes) {
      if (from.id !== to.id) edges.push({ id: `edge-${edges.length}`, from: from.id, to: to.id, rel: "IMPORTS", props: {} });
    }
  }
  const symbols = Array.from({ length: symbolCount }, (_, index) => ({ id: paddedId("symbol", index), name: `symbol${index}`, kind: "function", path: paddedId("src", index), line: index }));
  return { nodes, edges, symbols, totals: { nodes: nodeCount, edges: edges.length, symbols: symbolCount, ormModelNodes: 0 }, truncated: false };
}

describe("workspace service scan observed graph wire byte bound", () => {
  it("publishes a protocol-valid graph.update for an observed graph whose unbounded payload would exceed MISSION_PROTOCOL_LIMITS.eventBytes", () => {
    const observed = oversizedObserved();

    // What the old item-count-only bound would have produced: every deduped candidate, unbounded
    // by bytes. This MUST fail the gate, or the fixture proves nothing.
    const unbounded = {
      nodes: [...observed.nodes.map((node) => ({ id: node.id, label: node.props.path })), ...observed.symbols.map((symbol) => ({ id: symbol.id, label: symbol.name }))],
      edges: observed.edges.map((edge) => ({ source: edge.from, target: edge.to })),
    };
    expect(unbounded.nodes.length).toBeLessThan(MISSION_PROTOCOL_LIMITS.arrayItems);
    expect(unbounded.edges.length).toBeLessThan(MISSION_PROTOCOL_LIMITS.arrayItems);
    expect(wireBytes(unbounded)).toBeGreaterThan(MISSION_PROTOCOL_LIMITS.eventBytes);
    expect(isMissionEvent({ type: "graph.update", graph: unbounded })).toBe(false);

    const graph = mapObservedGraph(observed);
    const published = { nodes: graph.nodes, edges: graph.edges };
    expect(isMissionEvent({ type: "graph.update", graph: published })).toBe(true);
    expect(wireBytes(published)).toBeLessThanOrEqual(MISSION_PROTOCOL_LIMITS.eventBytes);
    // The graph and symbols slices ride ONE frame (the connect-time {type:"snapshot"} frame), so
    // their combined size -- not just the graph's -- is what the shared budget has to hold.
    expect(wireBytes(published.nodes) + wireBytes(published.edges) + wireBytes(graph.symbols)).toBeLessThanOrEqual(SCAN_SLICE_WIRE_BYTE_BUDGET);
  });

  it("reports byte-driven NODE drops through the same counter as count-driven drops, with numerator and denominator over the same population", () => {
    const observed = oversizedObserved();
    const graph = mapObservedGraph(observed);

    // Node candidates = observed.nodes UNION observed.symbols (defect 2: a TS symbol is published
    // as a graph node too). No duplicate ids in this fixture, so the deduped population is the sum.
    const nodeCandidates = observed.nodes.length + observed.symbols.length;
    expect(graph.diagnostics.nodeDuplicatesDropped).toBe(0);
    expect(graph.diagnostics.nodesDroppedByWireBound).toBeGreaterThan(0);
    expect(graph.nodes.length + graph.diagnostics.nodesDroppedByWireBound).toBe(nodeCandidates);

    // The node bound cascades into edges: every raw edge candidate is accounted for by exactly one
    // of published / dropped-by-wire-bound / dropped-by-endpoint-filter / duplicate. Nothing is
    // lost without a counter naming why.
    expect(graph.diagnostics.edgesDroppedByEndpointFilter).toBeGreaterThan(0);
    expect(
      graph.edges.length
      + graph.diagnostics.edgesDroppedByWireBound
      + graph.diagnostics.edgesDroppedByEndpointFilter
      + graph.diagnostics.edgeDuplicatesDropped,
    ).toBe(observed.edges.length);

    expect(graph.symbols.length + graph.diagnostics.symbolsDroppedByWireBound).toBe(observed.symbols.length);

    // The defect class round 4 was fixed for, restated for the byte bound: no published count may
    // exceed the population it is reported against.
    expect(graph.nodes.length).toBeLessThanOrEqual(nodeCandidates);
    expect(graph.edges.length).toBeLessThanOrEqual(observed.edges.length);
    expect(graph.symbols.length).toBeLessThanOrEqual(observed.symbols.length);
  });

  it("reports byte-driven EDGE drops through edgesDroppedByWireBound when the edge slice alone overruns the budget", () => {
    const observed = denseObserved();
    expect(observed.edges.length).toBeLessThan(MISSION_PROTOCOL_LIMITS.arrayItems);
    expect(wireBytes(observed.edges.map((edge) => ({ source: edge.from, target: edge.to })))).toBeGreaterThan(MISSION_PROTOCOL_LIMITS.eventBytes);

    const graph = mapObservedGraph(observed);
    // Every node survives, so no edge is lost to the endpoint filter -- the byte bound is the only
    // thing dropping edges here, and it must own the whole difference.
    expect(graph.nodes).toHaveLength(observed.nodes.length + observed.symbols.length);
    expect(graph.diagnostics.nodesDroppedByWireBound).toBe(0);
    expect(graph.diagnostics.edgesDroppedByEndpointFilter).toBe(0);
    expect(graph.diagnostics.edgesDroppedByWireBound).toBeGreaterThan(0);
    expect(graph.edges.length + graph.diagnostics.edgesDroppedByWireBound + graph.diagnostics.edgeDuplicatesDropped).toBe(observed.edges.length);
    expect(isMissionEvent({ type: "graph.update", graph: { nodes: graph.nodes, edges: graph.edges } })).toBe(true);
  });

  it("never publishes an edge whose endpoint the byte bound dropped -- the endpoint filter runs against the FINAL node set", () => {
    const graph = mapObservedGraph(oversizedObserved());
    const publishedIds = new Set(graph.nodes.map((node) => node.id));
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThan(0);
    for (const edge of graph.edges) {
      expect(publishedIds.has(edge.source)).toBe(true);
      expect(publishedIds.has(edge.target)).toBe(true);
    }
  });

  it("shares the budget so an oversized node slice cannot starve edges or symbols to zero", () => {
    const graph = mapObservedGraph(oversizedObserved());
    // Filling in declaration order would spend the whole budget on nodes and render a node cloud
    // with no edges and no symbol list.
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.symbols.length).toBeGreaterThan(0);
    // Symbols fit inside an equal third, so max-min fair share gives them everything they asked
    // for and re-shares the remainder between the two slices that did not fit.
    expect(graph.diagnostics.symbolsDroppedByWireBound).toBe(0);
  });

  it("still enforces the item cap when each item is small enough to stay under the byte budget", () => {
    const nodeCount = MISSION_PROTOCOL_LIMITS.arrayItems + 25;
    const observed = {
      nodes: Array.from({ length: nodeCount }, (_, index) => ({ id: `f${index}`, labels: ["File"], props: { path: `f${index}` } })),
      edges: [],
      symbols: [],
      totals: { nodes: nodeCount, edges: 0, symbols: 0, ormModelNodes: 0 },
      truncated: false,
    };
    const graph = mapObservedGraph(observed);
    expect(wireBytes(graph.nodes)).toBeLessThan(SCAN_SLICE_WIRE_BYTE_BUDGET);
    expect(graph.nodes).toHaveLength(MISSION_PROTOCOL_LIMITS.arrayItems);
    expect(graph.diagnostics.nodesDroppedByWireBound).toBe(25);
  });

  it("emits a protocol-valid graph.update and an honest terminal warning when a real scan payload exceeds the byte budget", async () => {
    scanWorkspace.mockResolvedValueOnce(scanResult({ observed: oversizedObserved() }));
    const root = await scanFixtureRoot();
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    const events = collectEvents(store);
    const service = new WorkspaceService({ workspaceRoot: root, allowedRoots: [root], snapshotStore: store, mspClient: {} });

    await service.scan({ workspacePath: root, deep: true });

    const graphEvent = events.find((event) => event.type === "graph.update");
    expect(graphEvent).toBeDefined();
    expect(isMissionEvent(graphEvent)).toBe(true);

    const snapshot = store.getSnapshot();
    expect(graphEvent.graph).toEqual(snapshot.graph);
    // The connect-time frame src/mission/gateway.ts validates on arrival must survive the gate too.
    expect(isMissionEvent({ type: "snapshot", snapshot })).toBe(true);

    const warning = snapshot.terminal.find((line) => line.type === "warn" && /wire-protocol limit/i.test(line.text));
    expect(warning).toBeDefined();
    expect(warning.text).toContain("serialized-size budget");
    expect(warning.text).toContain(String(SCAN_SLICE_WIRE_BYTE_BUDGET));
    expect(warning.text).not.toContain("dropped 0 node(s), 0 edge(s), 0 symbol(s)");
  });
});

// TASK-PRD-007 follow-up: `workflowRuns` was the last UNBOUNDED snapshot slice. publishRun() and
// status() de-duplicate by runId but otherwise append forever, so a session running repeated
// scans grew it without limit -- while `terminal` has always been capped at 199 lines. Because
// the WebSocket connect frame carries the whole snapshot and is validated against
// MISSION_PROTOCOL_LIMITS.eventBytes, an unbounded slice eventually costs a connecting client
// its snapshot entirely. Measured on this repository: ~45 KB of non-scan content, a 900 KB scan
// budget, ~55 KB of headroom, and ~6.2 KB per workflow run -- about nine scans to the ceiling.
describe("workflowRuns bounding", () => {
  const makeService = () => {
    const store = new RuntimeSnapshotStore(createRuntimeSnapshot());
    return { store, service: new WorkspaceService({ workspaceRoot: "/tmp", allowedRoots: ["/tmp"], snapshotStore: store }) };
  };

  it("keeps the slice bounded no matter how many distinct runs are published", () => {
    const { store, service } = makeService();
    for (let index = 0; index < MAX_PUBLISHED_WORKFLOW_RUNS + 40; index += 1) {
      service.publishRun({ runId: `run-${index}`, status: "complete" });
    }
    expect(store.getSnapshot().workflowRuns.length).toBe(MAX_PUBLISHED_WORKFLOW_RUNS);
  });

  it("keeps the NEWEST runs and drops the oldest -- the tail is what a reader is looking at", () => {
    const { store, service } = makeService();
    const total = MAX_PUBLISHED_WORKFLOW_RUNS + 5;
    for (let index = 0; index < total; index += 1) {
      service.publishRun({ runId: `run-${index}`, status: "complete" });
    }
    const ids = store.getSnapshot().workflowRuns.map((run) => run.runId);
    expect(ids.at(-1)).toBe(`run-${total - 1}`);
    expect(ids).not.toContain("run-0");
    expect(ids).toContain(`run-${total - MAX_PUBLISHED_WORKFLOW_RUNS}`);
  });

  it("discloses the trim rather than silently dropping runs", () => {
    const { store, service } = makeService();
    for (let index = 0; index < MAX_PUBLISHED_WORKFLOW_RUNS + 3; index += 1) {
      service.publishRun({ runId: `run-${index}`, status: "complete" });
    }
    const warning = store.getSnapshot().terminal.find((line) => line.type === "warn" && line.text.includes("workflow runs"));
    expect(warning, "trimming must be reported, not silent").toBeTruthy();
    expect(warning.text).toContain(String(MAX_PUBLISHED_WORKFLOW_RUNS));
    expect(warning.text).toContain("state/runs/");
  });

  it("does not warn or trim while the slice is still within bounds", () => {
    const { store, service } = makeService();
    for (let index = 0; index < MAX_PUBLISHED_WORKFLOW_RUNS; index += 1) {
      service.publishRun({ runId: `run-${index}`, status: "complete" });
    }
    expect(store.getSnapshot().workflowRuns.length).toBe(MAX_PUBLISHED_WORKFLOW_RUNS);
    expect(store.getSnapshot().terminal.some((line) => line.text.includes("workflow runs"))).toBe(false);
  });

  it("still replaces a run in place when the same runId is published again", () => {
    const { store, service } = makeService();
    service.publishRun({ runId: "run-a", status: "running" });
    service.publishRun({ runId: "run-a", status: "complete" });
    const runs = store.getSnapshot().workflowRuns;
    expect(runs.length).toBe(1);
    expect(runs[0].status).toBe("complete");
  });
});
