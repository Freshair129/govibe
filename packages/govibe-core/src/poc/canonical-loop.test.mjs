import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { extractRoadmapCandidates } from "./candidate-extractor.mjs";
import { createCanonicalStore } from "./canonical-store.mjs";
import { createMspStub } from "./msp-stub.mjs";
import { renderRoadmapMarkdown } from "./markdown-projection.mjs";
import { promoteCandidates, promoteRoadmapSource } from "./promotion-runner.mjs";
import { applySemanticDelta, proposeSemanticDelta, StaleDeltaError } from "./semantic-delta.mjs";
import { compileRoadmapView } from "./view-compiler.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../../..");
const FIXED_CLOCK = () => "2026-08-04T00:00:00.000Z";
const SOURCE_PATH = "docs/roadmap/POC-FIXTURE.md";

const FIXTURE = `---
doc_id: "RM-POC"
status: "draft"
version: "0.1.0"
---

# POC Roadmap

## Phases

| Phase | Goal | Status | Progress |
|---|---|---|---|
| PH-1 | Foundation | in-progress | 40 |

## Backlog Items

| ID | Parent ID | Type | Title | Status | Owner |
|---|---|---|---|---|---|
| T-1 | PH-1 | task | Promotion runner | planned | ather |
| T-2 | PH-1 | task | View compiler | planned | vibe |
| T-9 | PH-MISSING | task | Orphan item | planned | ather |
`;

const roots = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function newWorkspace() {
  const root = await mkdtemp(path.join(os.tmpdir(), "govibe-poc-"));
  roots.push(root);
  return root;
}

/** Full forward loop: artifact -> candidates -> MSP -> canonical -> view. */
async function runLoop({ text = FIXTURE, viewDefinition = "roadmap-board" } = {}) {
  const root = await newWorkspace();
  const store = createCanonicalStore({ root });
  const mspClient = createMspStub({ store, now: FIXED_CLOCK });
  const promotion = await promoteRoadmapSource({
    sourcePath: SOURCE_PATH,
    text,
    store,
    mspClient,
    actor: "poc-test",
    runId: "run-1",
    now: FIXED_CLOCK,
  });
  const view = await compileRoadmapView({ store, viewDefinition, now: FIXED_CLOCK });
  return { root, store, mspClient, promotion, view };
}

describe("POC canonical loop — criterion 1: the view comes from the graph", () => {
  it("compiles a board without any POC module importing the document-driven parser", async () => {
    const files = (await readdir(HERE)).filter((name) => name.endsWith(".mjs") && !name.endsWith(".test.mjs"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = await readFile(path.join(HERE, file), "utf8");
      const imports = [...source.matchAll(/^import[\s\S]*?from\s+"([^"]+)";/gm)].map((match) => match[1]);
      for (const specifier of imports) {
        expect(specifier, `${file} must not depend on the document parser`).not.toMatch(/roadmap-parser|mission\.ts/);
      }
    }
  });

  it("renders every promoted node from canonical state alone", async () => {
    const { view } = await runLoop();
    expect(view.manifest.graphRevision).toBe("rev-000001");
    expect(view.nodes.map((node) => node.id)).toEqual(["RM-POC", "PH-1", "T-1", "T-2", "T-9"]);
    expect(view.nodes.every((node) => node.canonicalRef.startsWith("gks:atom/"))).toBe(true);
  });

  it("cannot compile a view before anything is promoted", async () => {
    const store = createCanonicalStore({ root: await newWorkspace() });
    await expect(compileRoadmapView({ store })).rejects.toThrow(/empty canonical graph/);
  });
});

describe("POC canonical loop — criterion 2: provenance", () => {
  it("carries candidate, source path, section and hash on every node", async () => {
    const { view } = await runLoop();
    for (const node of view.nodes) {
      expect(node.provenance.candidateRef).toMatch(/^candidate:roadmap\//);
      expect(node.provenance.sourcePath).toBe(SOURCE_PATH);
      expect(node.provenance.sourceSection).toBeTruthy();
      expect(node.provenance.sourceHash).toMatch(/^[a-f0-9]{64}$/);
      expect(node.provenance.assertionCount).toBe(1);
    }
  });

  it("records an identity decision with evidence for every candidate", async () => {
    const { promotion } = await runLoop();
    expect(promotion.decisions).toHaveLength(5);
    for (const decision of promotion.decisions) {
      expect(["reuse", "create", "conflict", "human_review"]).toContain(decision.decision);
      expect(decision.evidence).toHaveProperty("logicalId");
    }
    expect(promotion.decisions.every((decision) => decision.decision === "create")).toBe(true);
  });

  it("reports an unresolved parent instead of inventing a relation", async () => {
    const { view } = await runLoop();
    expect(view.unresolved).toEqual([
      expect.objectContaining({ parentId: "PH-MISSING", reason: "unresolved-parent" }),
    ]);
    const orphan = view.nodes.find((node) => node.id === "T-9");
    expect(orphan.parentCanonicalRef).toBeUndefined();
  });
});

describe("POC canonical loop — criterion 3: determinism", () => {
  it("recompiles byte-identical output from the same revision", async () => {
    const { store } = await runLoop();
    const first = await compileRoadmapView({ store, now: FIXED_CLOCK });
    const second = await compileRoadmapView({ store, now: FIXED_CLOCK });
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(renderRoadmapMarkdown(second)).toBe(renderRoadmapMarkdown(first));
  });

  it("keeps the content hash stable when only the generation clock moves", async () => {
    const { store } = await runLoop();
    const first = await compileRoadmapView({ store, now: FIXED_CLOCK });
    const later = await compileRoadmapView({ store, now: () => "2027-01-01T00:00:00.000Z" });
    expect(later.manifest.contentHash).toBe(first.manifest.contentHash);
    expect(later.manifest.generatedAt).not.toBe(first.manifest.generatedAt);
  });

  it("projects two different views from one graph revision", async () => {
    const { store } = await runLoop();
    const board = await compileRoadmapView({ store, viewDefinition: "roadmap-board", now: FIXED_CLOCK });
    const backlog = await compileRoadmapView({ store, viewDefinition: "backlog", now: FIXED_CLOCK });
    expect(board.manifest.graphRevision).toBe(backlog.manifest.graphRevision);
    expect(backlog.nodes.map((node) => node.id)).toEqual(["T-1", "T-2", "T-9"]);
    expect(backlog.omitted.map((entry) => entry.kind).sort()).toEqual(["phase", "roadmap"]);
  });
});

describe("POC canonical loop — criterion 4: reverse semantic delta", () => {
  it("applies a one-field edit and preserves every other canonical field", async () => {
    const { store, mspClient, view } = await runLoop();
    const target = view.nodes.find((node) => node.id === "T-1");
    const before = (await store.readHead()).atoms.find((atom) => atom.canonicalRef === target.canonicalRef);

    const delta = proposeSemanticDelta({ view, canonicalRef: target.canonicalRef, edits: { state: "done" } });
    const outcome = await applySemanticDelta({
      store, mspClient, delta, actor: "poc-test", runId: "run-2", now: FIXED_CLOCK,
    });

    expect(outcome.revision).toBe("rev-000002");
    const after = (await store.readHead()).atoms.find((atom) => atom.canonicalRef === target.canonicalRef);
    expect(after.payload.state).toBe("done");
    for (const field of outcome.preservedFields) {
      expect(after.payload[field]).toEqual(before.payload[field]);
    }
    expect(after.canonicalRef).toBe(before.canonicalRef);
  });

  it("regenerates the Markdown projection so it reflects the delta", async () => {
    const { store, mspClient, view } = await runLoop();
    const target = view.nodes.find((node) => node.id === "T-1");
    const beforeMarkdown = renderRoadmapMarkdown(view);
    expect(beforeMarkdown).toMatch(/\| T-1 \| PH-1 \| task \| Promotion runner \| planned \|/);

    await applySemanticDelta({
      store,
      mspClient,
      delta: proposeSemanticDelta({ view, canonicalRef: target.canonicalRef, edits: { state: "done" } }),
      actor: "poc-test",
      runId: "run-2",
      now: FIXED_CLOCK,
    });

    const afterMarkdown = renderRoadmapMarkdown(await compileRoadmapView({ store, now: FIXED_CLOCK }));
    expect(afterMarkdown).toMatch(/\| T-1 \| PH-1 \| task \| Promotion runner \| done \|/);

    // Bounded diff: only the edited row and the manifest hashes may move.
    const changed = afterMarkdown.split("\n").filter((line, index) => line !== beforeMarkdown.split("\n")[index]);
    expect(changed.every((line) => /T-1|graph_revision|graph_hash|content_hash/.test(line))).toBe(true);
  });

  it("rejects a stale delta computed against an older revision", async () => {
    const { store, mspClient, view } = await runLoop();
    const target = view.nodes.find((node) => node.id === "T-1");
    const stale = proposeSemanticDelta({ view, canonicalRef: target.canonicalRef, edits: { state: "done" } });

    await applySemanticDelta({
      store,
      mspClient,
      delta: proposeSemanticDelta({ view, canonicalRef: view.nodes[1].canonicalRef, edits: { state: "blocked" } }),
      actor: "poc-test",
      runId: "run-2",
      now: FIXED_CLOCK,
    });

    await expect(applySemanticDelta({ store, mspClient, delta: stale, actor: "poc-test", runId: "run-3", now: FIXED_CLOCK }))
      .rejects.toBeInstanceOf(StaleDeltaError);
  });

  it("refuses to edit a field that does not exist on the canonical atom", async () => {
    const { store, mspClient, view } = await runLoop();
    const delta = proposeSemanticDelta({ view, canonicalRef: view.nodes[2].canonicalRef, edits: { invented: "x" } });
    await expect(applySemanticDelta({ store, mspClient, delta, actor: "poc-test", runId: "run-2", now: FIXED_CLOCK }))
      .rejects.toThrow(/unknown canonical fields/);
  });
});

describe("POC canonical loop — criterion 5: no authority bypass", () => {
  it("refuses a materialization that returns a candidate-namespace canonical ref", async () => {
    const store = createCanonicalStore({ root: await newWorkspace() });
    const rogue = {
      async call(_capability, request) {
        return {
          schema_version: "govibe-canonical-materialization-result/v1",
          materialization_ref: "gks:materialization/rogue",
          promotion_ref: "msp:promotion/rogue",
          mappings: request.candidates.map((candidate) => ({
            candidate_ref: candidate.candidate_ref,
            canonical_ref: candidate.candidate_ref,
            source_hash: candidate.source_hash,
            version: "1",
          })),
          relations: [],
          graph_version: "1",
          source_hash: request.source_snapshot_hash,
        };
      },
      getMaterializationRecord: () => ({ atoms: [], decisions: [], unresolved: [] }),
    };
    const extraction = extractRoadmapCandidates({ sourcePath: SOURCE_PATH, text: FIXTURE });
    await expect(promoteCandidates({ extraction, store, mspClient: rogue, actor: "x", runId: "r", now: FIXED_CLOCK }))
      .rejects.toThrow(/canonical GKS reference/);
    await expect(store.readHead()).resolves.toMatchObject({ empty: true });
  });

  it("refuses a materialization that does not cover every candidate", async () => {
    const store = createCanonicalStore({ root: await newWorkspace() });
    const partial = {
      async call(_capability, request) {
        return {
          schema_version: "govibe-canonical-materialization-result/v1",
          materialization_ref: "gks:materialization/partial",
          promotion_ref: "msp:promotion/partial",
          mappings: [{
            candidate_ref: request.candidates[0].candidate_ref,
            canonical_ref: "gks:atom/0000000000000001",
            source_hash: request.candidates[0].source_hash,
            version: "1",
          }],
          relations: [],
          graph_version: "1",
          source_hash: request.source_snapshot_hash,
        };
      },
      getMaterializationRecord: () => ({ atoms: [], decisions: [], unresolved: [] }),
    };
    const extraction = extractRoadmapCandidates({ sourcePath: SOURCE_PATH, text: FIXTURE });
    await expect(promoteCandidates({ extraction, store, mspClient: partial, actor: "x", runId: "r", now: FIXED_CLOCK }))
      .rejects.toThrow(/complete candidate set/);
    await expect(store.readHead()).resolves.toMatchObject({ empty: true });
  });

  it("keeps direct GKS access disabled", async () => {
    const { GksClient } = await import("../gks-client.mjs");
    await expect(new GksClient().upsertCodeKnowledge()).rejects.toMatchObject({ code: "DIRECT_GKS_DISABLED" });
  });
});

describe("POC canonical loop — identity and idempotence", () => {
  it("does not commit a second revision for an unchanged source", async () => {
    const { store, mspClient, promotion } = await runLoop();
    expect(promotion.committed).toBe(true);
    const replay = await promoteRoadmapSource({
      sourcePath: SOURCE_PATH, text: FIXTURE, store, mspClient, actor: "poc-test", runId: "run-2", now: FIXED_CLOCK,
    });
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.committed).toBe(false);
    await expect(store.listRevisions()).resolves.toEqual(["rev-000001"]);
  });

  it("reuses canonical identity across a meaning-preserving rewrite", async () => {
    const { store, mspClient, view } = await runLoop();
    const before = view.nodes.find((node) => node.id === "T-1");

    const rewritten = FIXTURE.replace("| T-1 | PH-1 | task | Promotion runner |", "| T-1 | PH-1 | task | Candidate promotion runner |");
    const second = await promoteRoadmapSource({
      sourcePath: SOURCE_PATH, text: rewritten, store, mspClient, actor: "poc-test", runId: "run-2", now: FIXED_CLOCK,
    });

    expect(second.committed).toBe(true);
    const after = (await compileRoadmapView({ store, now: FIXED_CLOCK })).nodes.find((node) => node.id === "T-1");
    expect(after.canonicalRef).toBe(before.canonicalRef);
    expect(after.title).toBe("Candidate promotion runner");
    expect(after.provenance.sourceHash).not.toBe(before.provenance.sourceHash);

    const decision = second.decisions.find((entry) => entry.canonicalRef === before.canonicalRef);
    expect(decision.decision).toBe("reuse");
    expect(decision.evidence.payloadChanged).toBe(true);
  });

  it("preserves prior revisions rather than overwriting canonical state", async () => {
    const { store, mspClient, view } = await runLoop();
    const target = view.nodes.find((node) => node.id === "T-1");
    await applySemanticDelta({
      store,
      mspClient,
      delta: proposeSemanticDelta({ view, canonicalRef: target.canonicalRef, edits: { state: "done" } }),
      actor: "poc-test",
      runId: "run-2",
      now: FIXED_CLOCK,
    });

    const first = await store.readRevision("rev-000001");
    expect(first.atoms.find((atom) => atom.canonicalRef === target.canonicalRef).payload.state).toBe("planned");
    expect(first.parentRevision).toBeNull();
    const second = await store.readRevision("rev-000002");
    expect(second.parentRevision).toBe("rev-000001");
  });
});

describe("POC canonical loop — parity with the live document-driven board", () => {
  it("covers the same roadmap items as the existing parser on a real source", async () => {
    const sourcePath = path.join(REPO_ROOT, "docs/roadmap/BACKLOG-p1-mvp-core.md");
    const text = await readFile(sourcePath, "utf8");

    const root = await newWorkspace();
    const store = createCanonicalStore({ root });
    const mspClient = createMspStub({ store, now: FIXED_CLOCK });
    await promoteRoadmapSource({
      sourcePath: "docs/roadmap/BACKLOG-p1-mvp-core.md",
      text, store, mspClient, actor: "poc-test", runId: "parity", now: FIXED_CLOCK,
    });
    const view = await compileRoadmapView({ store, now: FIXED_CLOCK });

    // The comparator imports the legacy parser; the POC path above does not.
    const { parseRoadmapSource } = await import("../../../../scripts/mcp/roadmap-parser.mjs");
    const legacy = await parseRoadmapSource(sourcePath);

    const legacyIds = new Set(legacy.nodes.filter((node) => node.type !== "roadmap").map((node) => node.id));
    const canonicalIds = new Set(view.nodes.filter((node) => node.type !== "roadmap").map((node) => node.id));
    for (const id of legacyIds) expect(canonicalIds.has(id), `canonical view is missing ${id}`).toBe(true);

    for (const node of view.nodes) {
      const match = legacy.nodes.find((entry) => entry.id === node.id);
      if (!match || node.type === "roadmap") continue;
      expect(node.title, `title drift on ${node.id}`).toBe(match.title);
      expect(node.state, `state drift on ${node.id}`).toBe(match.state);
    }
  });

  it("writes a regenerable projection file that declares its graph revision", async () => {
    const { store, root } = await runLoop();
    const view = await compileRoadmapView({ store, now: FIXED_CLOCK });
    const target = path.join(root, "projection.md");
    await writeFile(target, renderRoadmapMarkdown(view), "utf8");

    const written = await readFile(target, "utf8");
    expect(written).toContain(`graph_revision: "${view.manifest.graphRevision}"`);
    expect(written).toContain('source_of_truth: false');
    // CSIR-FR-043: deleting a generated view must not touch canonical state.
    await rm(target);
    await expect(store.readHead()).resolves.toMatchObject({ revision: view.manifest.graphRevision });
  });
});
