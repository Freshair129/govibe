import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { evaluateCoverage, evaluateSectionCoverage } from "./coverage.mjs";
import { consolidate, runFinalization, submitPromotion, validateGraph } from "./finalization.mjs";
import { resolveAnnotationTargets, runIntentScan } from "./intent-scan.mjs";
import { runMode2Scan } from "./pipeline.mjs";
import { BLOCK_PROFILES, selectBlockProfile, TOP_DOWN_ONLY_DIMENSIONS } from "./semantic-dimensions.mjs";
import { createWorkspaceAdapter } from "./workspace-adapter.mjs";

let root;

async function write(relativePath, content) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

function adapterFor() {
  return createWorkspaceAdapter({ client: "claude-code", workspaceRoot: root });
}

async function artifact(runId, stage) {
  return JSON.parse(await readFile(path.join(root, ".govibe/mode2/scan/runs", runId, "artifacts", `${String(stage).padStart(2, "0")}.json`), "utf8"));
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "govibe-mode2-t3-"));
  await write("package.json", JSON.stringify({ name: "t3", main: "src/app.ts", scripts: { test: "vitest run" }, dependencies: { express: "^4.0.0" } }, null, 2));
  await write("src/app.ts", "// @req FR-001\n// @spec ADR-007\nimport './svc';\nexport function boot() { return 1; }\n");
  await write("src/svc.ts", "export enum JobStatus { Queued = 'q' }\nexport function svc() { if (!1) { throw new Error('x'); } return 2; }\n");
  await write("src/app.test.ts", "import { boot } from './app';\nboot();\n");
  await write("AGENTS.md", "# contract\n");
  await write("CLAUDE.md", "# claude\n");
  await write("docs/PRD-product.md", "---\ndoc_id: \"PRD-PRODUCT\"\nstatus: \"approved\"\nversion: \"1.0.0\"\n---\n# PRD\n## Functional Requirements\nFR-001 order intake\nFR-002 dispatch\n## Acceptance Criteria\n- AC-001 | order accepted under 300ms\n");
  await write("docs/adr/ADR-007-choice.md", "---\ndoc_id: \"ADR-007\"\nstatus: \"accepted\"\nversion: \"1.0.0\"\n---\n# ADR-007\n## Context\nwhy\n## Decision\nwhat\n");
  await write("docs/adr/ADR-008-silent.md", "---\ndoc_id: \"ADR-008\"\n---\n# ADR-008\n## Notes\nno rationale headings here\n");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("Stage 12 — Candidate Semantic IR", () => {
  it("composes atoms with a full provenance envelope and no canonical identity", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "ir" });
    const ir = await artifact("ir", 12);
    expect(ir.canonical).toBe(false);
    expect(ir.atoms.length).toBeGreaterThan(0);
    for (const atom of ir.atoms) {
      expect(atom.identity.startsWith("mode2-atom:")).toBe(true);
      expect(atom.canonical).toBe(false);
      expect(atom.provenance).toMatchObject({ extractor_version: expect.any(String) });
      expect(typeof atom.provenance.stage).toBe("number");
      expect(typeof atom.confidence).toBe("number");
      expect(atom.explicit === !atom.inferred).toBe(true);
    }
  });

  it("never mints a canonical GKS identity", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "ir2" });
    const ir = await artifact("ir2", 12);
    const all = [...ir.atoms, ...ir.relations];
    expect(all.some((item) => /^gks:/.test(item.identity))).toBe(false);
    expect(all.every((item) => item.canonical === false)).toBe(true);
    expect(ir.identity_namespace).toMatch(/pipeline-local/);
  });

  it("records the seven dimensions no bottom-up stage can produce", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "ir3" });
    const ir = await artifact("ir3", 12);
    expect(ir.dimensions_without_producer.sort()).toEqual(
      ["authority", "change", "deployment", "domain", "intent", "rationale", "requirement"],
    );
    expect(TOP_DOWN_ONLY_DIMENSIONS.length).toBe(7);
  });

  it("keeps annotation relations explicit and import-derived relations inferred", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "ir4" });
    const ir = await artifact("ir4", 12);
    const inferred = ir.relations.filter((relation) => relation.inferred);
    expect(inferred.length).toBeGreaterThan(0);
    expect(inferred.every((relation) => relation.confidence < 1)).toBe(true);
  });
});

describe("F1–F4 finalization", () => {
  it("runs in strict F1 -> F2 -> F3 -> F4 order", async () => {
    const result = await runMode2Scan({ adapter: adapterFor(), runId: "fin" });
    expect(result.finalization.canonical).toBe(false);
    const detail = JSON.parse(await readFile(path.join(root, ".govibe/mode2/scan/runs/fin/finalization.json"), "utf8"));
    expect(detail.order).toEqual(["F1", "F2", "F3", "F4"]);
    expect(detail.F1.operation).toBe("consolidation");
    expect(detail.F2.operation).toBe("graph-validation");
    expect(detail.F3.operation).toBe("evidence-packaging");
    expect(detail.F4.operation).toBe("promotion-submission");
  });

  it("F1 deduplicates by identity and never merges look-alikes", () => {
    const ir = {
      atoms: [
        { identity: "mode2-atom:a", dimension: "structure" },
        { identity: "mode2-atom:a", dimension: "structure" },
        { identity: "mode2-atom:b", dimension: "structure" },
      ],
      relations: [],
    };
    const f1 = consolidate({ ir, stageRecords: [] });
    expect(f1.atom_count).toBe(2);
    expect(f1.duplicates).toEqual([{ kind: "duplicate-atom-identity", identity: "mode2-atom:a" }]);
  });

  it("F1 carries every stage's unresolved forward rather than dropping it", () => {
    const f1 = consolidate({
      ir: { atoms: [], relations: [] },
      stageRecords: [{ stage: 3, unresolved: [{ kind: "unsupported-language" }] }, { stage: 8, unresolved: [{ kind: "unclassified-branch" }] }],
    });
    expect(f1.unresolved_count).toBe(2);
    expect(f1.unresolved_register.map((item) => item.stage)).toEqual([3, 8]);
  });

  it("F2 reports acyclicity and backlink symmetry as not_applicable rather than green", () => {
    const f2 = validateGraph({ stageRecords: [], consolidated: { relations: [] } });
    expect(f2.checks.acyclicity).toBe("not_applicable");
    expect(f2.checks.backlinkSymmetry).toBe("not_applicable");
    expect(f2.not_applicable_reasons.acyclicity).toMatch(/no Mode 2 relation type is declared acyclic-required/);
  });

  it("F2 surfaces relation cycles as findings without failing on them", () => {
    const f2 = validateGraph({
      stageRecords: [],
      consolidated: {
        relations: [
          { rel: "IMPORTS", from: "a", to: "b" },
          { rel: "IMPORTS", from: "b", to: "a" },
        ],
      },
    });
    expect(f2.findings.some((finding) => finding.kind === "relation-cycle")).toBe(true);
  });

  it("F3 includes the unresolved register even when it is empty", () => {
    const f2 = validateGraph({ stageRecords: [], consolidated: { relations: [] } });
    const f1 = consolidate({ ir: { atoms: [], relations: [] }, stageRecords: [] });
    const f3 = JSON.parse(JSON.stringify({ ...f1, f2 }));
    expect(f3.unresolved_register).toEqual([]);
    expect(f3.unresolved_count).toBe(0);
  });

  it("F4 refuses to submit when F2 did not pass", async () => {
    const outcome = await submitPromotion({
      runId: "x",
      proof: { verification: { verdict: "blocked", errors: ["failed_stages:5"] }, source_snapshot_hash: "h" },
      consolidated: { atoms: [], relations: [], unresolved_register: [] },
      mspClient: { submitKnowledgeCandidate: async () => ({ knowledgeRef: "should-not-happen" }) },
    });
    expect(outcome.status).toBe("refused");
    expect(outcome.submitted).toBe(false);
  });

  it("F4 reports blocked rather than success when no MSP boundary is configured", async () => {
    const outcome = await submitPromotion({
      runId: "x",
      proof: { verification: { verdict: "passed", errors: [] }, source_snapshot_hash: "h" },
      consolidated: { atoms: [], relations: [], unresolved_register: [] },
      mspClient: null,
    });
    expect(outcome.status).toBe("blocked");
    expect(outcome.reason).toBe("no_msp_boundary_configured");
    expect(outcome.submitted).toBe(false);
  });

  it("F4 submits through MSP and treats the returned reference as opaque", async () => {
    const calls = [];
    const outcome = await submitPromotion({
      runId: "run",
      proof: { verification: { verdict: "passed", errors: [] }, source_snapshot_hash: "h" },
      consolidated: { atoms: [{ identity: "mode2-atom:a" }], relations: [], unresolved_register: [] },
      mspClient: {
        submitKnowledgeCandidate: async (input) => {
          calls.push(input);
          return { knowledgeRef: "gks:opaque/1", promotionRef: "msp:promo/1", sourceHash: "h" };
        },
      },
    });
    expect(outcome.status).toBe("submitted");
    expect(outcome.knowledge_ref).toBe("gks:opaque/1");
    expect(calls[0].schema_version).toBe("govibe-mode2-knowledge-candidate/v1");
  });

  it("F4 is blocked in a workspace with no MSP configured, so nothing is silently promoted", async () => {
    const result = await runMode2Scan({ adapter: adapterFor(), runId: "fin2" });
    expect(result.finalization.F4.submitted).toBe(false);
    expect(["blocked", "refused"]).toContain(result.finalization.F4.status);
  });

  it("does not run finalization when the caller opts out", async () => {
    const result = await runMode2Scan({ adapter: adapterFor(), runId: "fin3", finalize: false });
    expect(result.finalization).toBeNull();
  });
});

describe("Semantic coverage engine", () => {
  it("selects a block profile from evidence and states why", () => {
    expect(selectBlockProfile({ agentManifest: { agentic_system_detected: true } })).toMatchObject({ profile: "agentic-system" });
    expect(selectBlockProfile({ documentationRoots: ["docs"] })).toMatchObject({ profile: "service-governed" });
    expect(selectBlockProfile({})).toMatchObject({ profile: "service-minimal" });
    expect(selectBlockProfile({}).reason).toBeTruthy();
  });

  it("distinguishes a gap with no producer from a producer that found nothing", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "cov" });
    const ir = await artifact("cov", 12);
    const coverage = evaluateCoverage({ ir, profile: "platform-governed" });
    const requirement = coverage.detail.find((item) => item.dimension === "requirement");
    expect(requirement.covered).toBe(false);
    expect(requirement.gap_cause).toBe("no-bottom-up-producer-requires-top-down-artefacts");
    const structure = coverage.detail.find((item) => item.dimension === "structure");
    expect(structure.covered).toBe(true);
  });

  // Regression: coverage originally counted only atoms, so `dependency` reported missing on a
  // repository with over a thousand real dependency edges, because Stage 4 produces edges not
  // nodes. `provenance` was likewise missing because it is an atom attribute, not an atom type.
  it("counts relation-bearing and attribute-satisfied dimensions as covered", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "cov-rel" });
    const ir = await artifact("cov-rel", 12);
    const coverage = evaluateCoverage({ ir, profile: "platform-governed" });
    const dependency = coverage.detail.find((item) => item.dimension === "dependency");
    expect(dependency.bottom_up_atoms).toBe(0);
    expect(dependency.bottom_up_relations).toBeGreaterThan(0);
    expect(dependency.covered).toBe(true);
    expect(dependency.satisfied_by).toBe("relations");

    const provenance = coverage.detail.find((item) => item.dimension === "provenance");
    expect(provenance.covered).toBe(true);
    expect(provenance.satisfied_by).toBe("atom-attribute");

    expect(coverage.missing).not.toContain("dependency");
    expect(coverage.missing).not.toContain("provenance");
  });

  it("does not treat document volume as semantic completeness", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "cov2" });
    const ir = await artifact("cov2", 12);
    // Three governed documents exist in the fixture, yet with no intent model supplied the
    // requirement dimension is still a gap. Counting documents must not close it.
    const coverage = evaluateCoverage({ ir, profile: "service-governed", governedDocCount: 3 });
    expect(coverage.missing).toContain("requirement");
    expect(coverage.claim).toMatch(/not a document count/);
  });

  it("closes top-down gaps once the intent model is supplied", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "cov3" });
    const ir = await artifact("cov3", 12);
    const intendedModel = await runIntentScan({ adapter: adapterFor(), files: (await adapterFor().discoverProjectFiles()).files });
    const before = evaluateCoverage({ ir, profile: "service-governed" });
    const after = evaluateCoverage({ ir, profile: "service-governed", intendedModel });
    expect(before.missing).toContain("requirement");
    expect(after.missing).not.toContain("requirement");
    expect(after.coverage_ratio).toBeGreaterThan(before.coverage_ratio);
    expect(after.top_down_dependency.intent_scan_supplied).toBe(true);
  });

  it("defaults impact traversal to R3 on the existing retrieval-radius axis", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "cov4" });
    const coverage = evaluateCoverage({ ir: await artifact("cov4", 12), profile: "service-minimal" });
    // ADR-028 D6 maps RWANG's 3-hop guard onto R, rather than introducing a second field.
    expect(coverage.retrieval_radius).toBe("R3");
  });

  it("section coverage is inert until a checklist is configured", () => {
    expect(evaluateSectionCoverage({ documents: [{ path: "a.md", doc_type: "SDD", sections: [] }] })).toMatchObject({ applicable: false });
    const result = evaluateSectionCoverage({
      documents: [{ path: "a.md", doc_type: "SDD", sections: ["Architecture Overview"] }],
      checklists: { SDD: ["Architecture Overview", "Error Handling"] },
    });
    expect(result.applicable).toBe(true);
    expect(result.results[0].missing).toEqual(["Error Handling"]);
    expect(result.governed_by).toMatch(/ADR-028 D4 \(proposed\)/);
  });

  it("every block profile requires only known dimensions", () => {
    for (const [name, definition] of Object.entries(BLOCK_PROFILES)) {
      expect(definition.required.length, name).toBeGreaterThan(0);
      expect(definition.description, name).toBeTruthy();
    }
  });
});

describe("Top-down intent scan", () => {
  it("classifies documents and indexes requirement and decision identifiers", async () => {
    const { files } = await adapterFor().discoverProjectFiles();
    const model = await runIntentScan({ adapter: adapterFor(), files });
    expect(model.canonical).toBe(false);
    expect(model.doc_type_counts.PRD).toBe(1);
    expect(model.doc_type_counts.ADR).toBe(2);
    expect(model.requirement_index.map((entry) => entry.id)).toEqual(expect.arrayContaining(["FR-001", "FR-002", "AC-001"]));
    expect(model.decision_index.map((entry) => entry.id)).toEqual(expect.arrayContaining(["ADR-007", "ADR-008"]));
  });

  it("refuses to invent a WHY the document does not state", async () => {
    const { files } = await adapterFor().discoverProjectFiles();
    const model = await runIntentScan({ adapter: adapterFor(), files });
    const gap = model.unresolved.find((item) => item.kind === "rationale-not-stated");
    // ADR-008 has no Context/Decision/Consequences headings, so no rationale is produced.
    expect(gap.path).toBe("docs/adr/ADR-008-silent.md");
    expect(gap.detail).toMatch(/WHY is not inferred/);
  });

  it("resolves the annotation targets Stage 10 parked, and admits those it cannot", async () => {
    const { files } = await adapterFor().discoverProjectFiles();
    const model = await runIntentScan({ adapter: adapterFor(), files });
    const { resolved, unresolved } = resolveAnnotationTargets({
      verificationModel: {
        unresolvedAnnotationTargets: [
          { tag: "req", target: "FR-001", path: "src/app.ts", line: 1 },
          { tag: "spec", target: "ADR-007", path: "src/app.ts", line: 2 },
          { tag: "req", target: "FR-999", path: "src/app.ts", line: 3 },
        ],
      },
      intendedModel: model,
    });
    expect(resolved.map((item) => item.rel).sort()).toEqual(["FOLLOWS", "IMPLEMENTS"]);
    expect(resolved.every((item) => item.explicit && !item.inferred && item.canonical === false)).toBe(true);
    // FR-999 is named by a comment but declared nowhere; it stays unresolved rather than minted.
    expect(unresolved).toHaveLength(1);
    expect(unresolved[0].target).toBe("FR-999");
  });

  it("reports honestly when a workspace has no intent artefacts at all", async () => {
    const bare = await mkdtemp(path.join(tmpdir(), "govibe-mode2-noint-"));
    try {
      await writeFile(path.join(bare, "index.js"), "module.exports = 1;\n", "utf8");
      const adapter = createWorkspaceAdapter({ workspaceRoot: bare });
      const model = await runIntentScan({ adapter, files: (await adapter.discoverProjectFiles()).files });
      expect(model.document_count).toBe(0);
      expect(model.unresolved.some((item) => item.kind === "no-intent-artefacts-found")).toBe(true);
    } finally {
      await rm(bare, { recursive: true, force: true });
    }
  });
});

describe("F1–F4 are not stages", () => {
  it("keeps the stage axis at twelve and exposes finalization separately", async () => {
    const result = await runMode2Scan({ adapter: adapterFor(), runId: "axis" });
    expect(result.stageRuns).toHaveLength(12);
    expect(result.stageCount).toBe(12);
    // No record may claim to be stage 13-16.
    expect(result.stageRuns.every((record) => record.stage <= 12)).toBe(true);
    const detail = await runFinalization({ runId: "axis", stageRecords: result.stageRuns, artifacts: new Map() });
    expect(detail.order).toEqual(["F1", "F2", "F3", "F4"]);
    expect(Object.keys(detail)).not.toContain("stage");
  });
});
