import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { calculateWorkspaceImpact } from "../impact/impact-engine.mjs";
import { evaluateCoverage } from "./coverage.mjs";
import { DIMENSION_PRODUCERS, SEMANTIC_DIMENSIONS } from "./semantic-dimensions.mjs";
import { analyzeGaps, GAP_CLASSES, rankContradiction, UNCONSUMED_CAPABILITY_SCOPE } from "./gap-analysis.mjs";
import { analyzeMode2Impact, toLinkGraph } from "./impact-bridge.mjs";
import { runIntentScan } from "./intent-scan.mjs";
import { runMode2Scan } from "./pipeline.mjs";
import { analyzeSchedule, compileRoadmap, estimateEffort } from "./roadmap-compiler.mjs";
import { generateViews, VIEW_CATALOG } from "./view-router.mjs";
import { createWorkspaceAdapter } from "./workspace-adapter.mjs";

let root;
let context;

async function write(relativePath, content) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

const adapterFor = () => createWorkspaceAdapter({ client: "claude-code", workspaceRoot: root });

async function artifact(runId, stage) {
  return JSON.parse(await readFile(path.join(root, ".govibe/mode2/scan/runs", runId, "artifacts", `${String(stage).padStart(2, "0")}.json`), "utf8"));
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "govibe-mode2-t45-"));
  await write("package.json", JSON.stringify({ name: "t45", main: "src/app.ts", scripts: { test: "vitest run" }, dependencies: { express: "^4.0.0" } }, null, 2));
  await write("src/app.ts", "// @req FR-001\nimport './svc';\nexport function boot() { return 1; }\n");
  await write("src/svc.ts", "export enum JobStatus { Queued = 'q', Done = 'd' }\nexport function svc() { return 2; }\n");
  await write("src/lonely.ts", "export function lonely() { return 3; }\n");
  await write("src/app.test.ts", "import { boot } from './app';\nboot();\n");
  await write("prisma/schema.prisma", "model Order {\n  id    String @id\n  item  Item   @relation(\"OI\")\n}\nmodel Item {\n  id String @id\n}\n");
  await write("AGENTS.md", "# contract\n");
  await write("docs/PRD-x.md", "---\ndoc_id: \"PRD-X\"\nstatus: \"approved\"\nversion: \"1.0.0\"\n---\n# PRD\nFR-001 boot\nFR-002 never built\nSee `src/gone.ts` for details.\n");

  const runId = "t45";
  const result = await runMode2Scan({ adapter: adapterFor(), runId });
  const { files } = await adapterFor().discoverProjectFiles();
  const ir = await artifact(runId, 12);
  const intendedModel = await runIntentScan({ adapter: adapterFor(), files });
  const agentManifest = await artifact(runId, 11);
  const coverage = evaluateCoverage({ ir, agentManifest, intendedModel });
  const verificationModel = await artifact(runId, 10);
  const behaviourModel = await artifact(runId, 7);
  const structureModel = await artifact(runId, 3);
  const gapAnalysis = analyzeGaps({ ir, intendedModel, coverage, verificationModel, agentManifest, behaviourModel, structureModel, files });
  context = { result, files, ir, intendedModel, agentManifest, coverage, verificationModel, gapAnalysis, behaviourModel, structureModel, dataModel: await artifact(runId, 6), stateModel: await artifact(runId, 8), concernModel: await artifact(runId, 9) };
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("T4 — view router", () => {
  it("routes by semantic signal and refuses to emit a view with nothing behind it", () => {
    const views = generateViews(context);
    expect(views.routing.map((rule) => rule.signal)).toEqual(
      expect.arrayContaining(["data_changed", "cross_module_interaction", "architecture_boundary_changed", "stateful_behavior"]),
    );
    const emptyViews = generateViews({ ir: { atoms: [], relations: [] } });
    expect(emptyViews.generated).toEqual([]);
    expect(emptyViews.skipped.length).toBe(0);
  });

  it("AC-V2 derives multiple views from one semantic model", () => {
    const views = generateViews(context);
    expect(views.generated.length).toBeGreaterThanOrEqual(3);
    expect(new Set(views.generated.map((view) => view.catalog_id)).size).toBe(views.generated.length);
  });

  it("AC-V3 regeneration reuses view_id and mints no canonical identity", () => {
    const first = generateViews(context);
    const second = generateViews(context);
    expect(second.generated.map((view) => view.view_id)).toEqual(first.generated.map((view) => view.view_id));
    expect(first.generated.every((view) => view.canonical === false)).toBe(true);
    expect(first.canonical).toBe(false);
  });

  it("every view carries back-references so it cannot become a truth island", () => {
    const views = generateViews(context);
    for (const view of views.generated) {
      expect(view.derived_from.length).toBeGreaterThan(0);
      expect(view.derived_count).toBe(view.derived_from.length);
    }
    expect(views.invariant).toMatch(/projections of one semantic model/);
  });

  it("declares an honest projection state and never claims EXACT for an approximation", () => {
    const views = generateViews(context);
    const states = new Set(["EXACT", "EQUIVALENT", "APPROXIMATE", "PARTIAL", "UNRESOLVED", "UNPROJECTABLE"]);
    for (const view of views.generated) expect(states.has(view.projection_state)).toBe(true);
    // Module imports are not call ordering, so the sequence view must not claim EXACT.
    const sequence = views.generated.find((view) => view.catalog_id === "05-sequence");
    expect(sequence.projection_state).toBe("APPROXIMATE");
    expect(sequence.loss_note).toMatch(/not observed call ordering/);
    // States are recoverable; transitions are not — so the state view is PARTIAL, not EXACT.
    const state = views.generated.find((view) => view.catalog_id === "07-state-machine");
    expect(state.projection_state).toBe("PARTIAL");
    expect(state.unresolved[0].kind).toBe("state-transitions-not-recovered");
  });

  it("keeps the unimplemented catalog visible rather than pretending it is complete", () => {
    expect(VIEW_CATALOG).toHaveLength(13);
    expect(VIEW_CATALOG.filter((entry) => entry.implemented).map((entry) => entry.catalog_id ?? entry.id).length).toBe(5);
    expect(VIEW_CATALOG.filter((entry) => !entry.implemented).length).toBe(8);
  });

  it("renders mermaid for the ERD from real parsed entities", () => {
    const views = generateViews(context);
    const erd = views.generated.find((view) => view.catalog_id === "04-erd");
    expect(erd.format).toBe("mermaid");
    expect(erd.body).toContain("erDiagram");
    expect(erd.body).toContain("Order");
  });
});

describe("T4 — WHAT-IS vs WHAT-SHOULD-BE", () => {
  it("AC-G1 compares both models and AC-G2 reports every finding with evidence", () => {
    expect(context.gapAnalysis.comparable).toBe(true);
    expect(context.gapAnalysis.findings.length).toBeGreaterThan(0);
    for (const finding of context.gapAnalysis.findings) {
      expect(Array.isArray(finding.evidence)).toBe(true);
      expect(finding.evidence.length).toBeGreaterThan(0);
    }
  });

  it("never auto-resolves a contradiction", () => {
    expect(context.gapAnalysis.auto_resolution).toMatch(/disabled by architecture/);
    for (const finding of context.gapAnalysis.findings) {
      expect(finding.auto_resolved).toBe(false);
      expect(finding.resolution).toBe("candidate-for-human-review");
    }
  });

  it("detects an unimplemented requirement and stale documentation", () => {
    const classes = context.gapAnalysis.findings.map((finding) => finding.gap_class);
    // FR-002 is declared in the PRD and claimed by no code.
    expect(classes).toContain("unimplemented_requirement");
    expect(context.gapAnalysis.findings.find((finding) => finding.subject === "FR-002")).toBeTruthy();
    // The PRD names `src/gone.ts`, which does not exist. Findings aggregate per document, so
    // the subject is the document and the broken references are the evidence.
    const stale = context.gapAnalysis.findings.find((finding) => finding.gap_class === "stale_documentation");
    expect(stale.subject).toBe("docs/PRD-x.md");
    expect(stale.evidence).toContain("src/gone.ts");
  });

  it("does not report globs, placeholders, relative paths, or case variants as stale", async () => {
    await write(
      "docs/SPEC-noise.md",
      [
        "---", 'doc_id: "SPEC-NOISE"', "---", "# spec",
        "A glob `docs/**/SDD-*.md` names a family, not a file.",
        "A placeholder `<scope>/AGENTS.md` is a template slot.",
        "A relative link [svc](../src/svc.ts) resolves against this document.",
        "A case variant `agents.md` matches AGENTS.md on a case-insensitive tree.",
      ].join("\n"),
    );
    const { files } = await adapterFor().discoverProjectFiles();
    const intendedModel = await runIntentScan({ adapter: adapterFor(), files });
    const gaps = analyzeGaps({ ...context, intendedModel, files });
    const stale = gaps.findings.filter((finding) => finding.gap_class === "stale_documentation");
    expect(stale.some((finding) => finding.subject === "docs/SPEC-noise.md")).toBe(false);
  });

  it("applies the two-axis trust hierarchy and leaves an unknown axis unranked", () => {
    expect(rankContradiction({ axis: "behaviour" }).precedence).toEqual(["code", "sdd", "prd"]);
    // Governed semantics invert RWANG's flat order: the standard defines the term.
    expect(rankContradiction({ axis: "governed" }).precedence).toEqual(["std_adr", "sdd", "code"]);
    expect(rankContradiction({ axis: "unknown" }).ranked).toBe(false);
  });

  it("states its own detection limits rather than implying completeness", () => {
    const detectable = Object.values(GAP_CLASSES).filter((meta) => meta.detectable).length;
    const undetectable = Object.keys(GAP_CLASSES).length - detectable;
    // Fourteen from architecture §10, plus `unconsumed_capability` added by RCA CA-04 and
    // marked `architecture_class: false` so the provenance of each class stays legible.
    expect(Object.values(GAP_CLASSES).filter((meta) => meta.architecture_class !== false)).toHaveLength(14);
    expect(Object.keys(GAP_CLASSES)).toHaveLength(15);
    expect(context.gapAnalysis.undetectable_classes).toHaveLength(undetectable);
    // The claim is derived from the table, so it cannot drift away from what is implemented.
    expect(context.gapAnalysis.completeness).toBe(`${detectable} of 15 gap classes are deterministically detectable in this tranche`);
    expect(detectable).toBeLessThan(14);
  });
});

describe("RCA CA-03 — the context semantic dimension", () => {
  it("exists as a dimension with Stage 9 as its producer", () => {
    expect(SEMANTIC_DIMENSIONS).toContain("context");
    expect(DIMENSION_PRODUCERS.context).toEqual([9]);
  });

  it("Stage 9 observes context management as a cross-cutting concern", async () => {
    await write("src/ctx.ts", "export function make() { const contextProfile = 'T-ctx'; return buildContextPacket({ contextProfile }); }\n");
    await runMode2Scan({ adapter: adapterFor(), runId: "ca03" });
    const concerns = await artifact("ca03", 9);
    expect(concerns.present).toContain("context_management");
    expect(concerns.observations.some((item) => item.concern === "context_management" && item.path === "src/ctx.ts")).toBe(true);
  });

  it("routes context observations to the context dimension, not to operations", async () => {
    await write("src/ctx.ts", "export const CONTEXT_PROFILES = ['T-ctx'];\n");
    await runMode2Scan({ adapter: adapterFor(), runId: "ca03b" });
    const ir = await artifact("ca03b", 12);
    const contextAtoms = ir.atoms.filter((atom) => atom.dimension === "context");
    expect(contextAtoms.length).toBeGreaterThan(0);
    expect(contextAtoms.every((atom) => atom.type === "context-concern")).toBe(true);
    expect(ir.atoms.some((atom) => atom.dimension === "operations" && atom.properties?.concern === "context_management")).toBe(false);
  });
});

describe("RCA CA-04 — the unconsumed_capability gap class", () => {
  it("flags an exporting module that no reachable module imports", () => {
    const finding = context.gapAnalysis.findings.find((item) => item.gap_class === "unconsumed_capability");
    // src/lonely.ts exports lonely() and nothing imports it.
    expect(finding).toBeTruthy();
    expect(finding.evidence).toContain("mode2-module:src/lonely.ts");
    expect(finding.severity).toBe("info");
  });

  it("does not flag a module that is reached from an entrypoint", () => {
    const finding = context.gapAnalysis.findings.find((item) => item.gap_class === "unconsumed_capability");
    expect(finding.evidence).not.toContain("mode2-module:src/svc.ts");
    expect(finding.evidence).not.toContain("mode2-module:src/app.ts");
  });

  it("is marked as a GoVibe addition rather than an architecture class", () => {
    expect(GAP_CLASSES.unconsumed_capability.architecture_class).toBe(false);
    expect(Object.values(GAP_CLASSES).filter((meta) => meta.architecture_class !== false)).toHaveLength(14);
  });

  // The honest half. This class was created by the RCA about the context packet, and it would
  // NOT have caught that case: context-packet.mjs was imported by continue.mjs, which is
  // reachable, so the capability was consumed — just not by the subsystem that should have.
  it("states plainly that it would not have caught the case that created it", () => {
    expect(UNCONSUMED_CAPABILITY_SCOPE.does_not_detect).toMatch(/consumed by one subsystem but skipped by another/);
    expect(UNCONSUMED_CAPABILITY_SCOPE.reason).toMatch(/declared expectation, not an observation/);
  });

  it("emits nothing when the behaviour or structure model is absent", () => {
    const withoutModels = analyzeGaps({ ...context, behaviourModel: undefined, structureModel: undefined });
    expect(withoutModels.findings.some((item) => item.gap_class === "unconsumed_capability")).toBe(false);
  });
});

describe("T5 — roadmap compiler", () => {
  it("AC-R1 derives every item from an observed gap, never from a template", () => {
    const roadmap = compileRoadmap({ ...context, coverage: context.coverage });
    expect(roadmap.gap_count).toBe(context.gapAnalysis.findings.length);
    expect(roadmap.tasks.length).toBe(context.gapAnalysis.findings.length);
    expect(roadmap.derived_from).toMatch(/observed gaps only/);
  });

  it("AC-R2 preserves source traceability through the hierarchy", () => {
    const roadmap = compileRoadmap({ ...context, coverage: context.coverage });
    const findingIds = new Set(context.gapAnalysis.findings.map((finding) => finding.id));
    for (const task of roadmap.tasks) {
      expect(findingIds.has(task.traces_to)).toBe(true);
      expect(task.why).toBeTruthy();
      expect(task.source_evidence.length).toBeGreaterThan(0);
    }
    for (const phase of roadmap.phases) {
      expect(phase.epics.every((epic) => epic.features.every((feature) => feature.work_packages.every((wp) => wp.tasks.length > 0)))).toBe(true);
    }
  });

  it("AC-R3 gives every task acceptance and verification criteria", () => {
    const roadmap = compileRoadmap({ ...context, coverage: context.coverage });
    for (const task of roadmap.tasks) {
      expect(task.acceptance_criteria.length).toBeGreaterThan(0);
      expect(task.acceptance_criteria[0]).toMatch(/Given .*When .*Then /);
      expect(task.verification.length).toBeGreaterThan(0);
    }
  });

  it("uses the canonical C and H axes and never auto-assigns the override rung", () => {
    const roadmap = compileRoadmap({ ...context, coverage: context.coverage });
    for (const task of roadmap.tasks) {
      expect(task.complexity).toMatch(/^C-[0-3]$/);
      expect(task.access_scope).toMatch(/^H[0-3]$/);
    }
    // H4 is an explicit upward override requiring owner approval; the compiler never assigns it.
    expect(roadmap.tasks.some((task) => task.access_scope === "H4")).toBe(false);
    if (roadmap.axes.h4_override_required) expect(roadmap.axes.h4_override_note).toMatch(/owner approval/);
  });

  it("keeps the effort score out of the governance axes", () => {
    const roadmap = compileRoadmap({ ...context, coverage: context.coverage });
    const heavy = estimateEffort({ gapClass: "missing_requirement", evidenceCount: 50, severity: "critical" });
    expect(heavy.points).toBeGreaterThan(10);
    expect(heavy.axis_warning).toMatch(/never be written to complexity or access_scope/);
    // A high estimate must not have raised any task's access scope.
    for (const task of roadmap.tasks) {
      expect(task.effort_estimate.points).not.toBe(task.access_scope);
      expect(task.access_scope).toBe({ "C-0": "H0", "C-1": "H1", "C-2": "H2", "C-3": "H3" }[task.complexity]);
    }
  });

  it("omits the effort block entirely when ADR-028 D5 is not adopted", () => {
    const roadmap = compileRoadmap({ ...context, coverage: context.coverage, includeEffort: false });
    expect(roadmap.tasks.every((task) => task.effort_estimate === undefined)).toBe(true);
    expect(roadmap.effort.governed_by).toBeNull();
  });

  it("does not force a workstream that has no work", () => {
    const roadmap = compileRoadmap({ ...context, coverage: context.coverage });
    expect(roadmap.workstreams.length).toBeGreaterThan(0);
    expect(roadmap.workstreams.length).toBeLessThan(14);
    for (const phase of roadmap.phases) expect(phase.task_count).toBeGreaterThan(0);
  });

  it("computes a critical path and reports cycles instead of breaking them", () => {
    const schedule = analyzeSchedule({
      tasks: [
        { id: "A", dependencies: [] },
        { id: "B", dependencies: ["A"] },
        { id: "C", dependencies: ["B"] },
        { id: "D", dependencies: [] },
      ],
    });
    expect(schedule.longest_chain_length).toBe(3);
    expect(schedule.critical_path).toEqual(["C"]);
    expect(schedule.parallelizable_now.sort()).toEqual(["A", "D"]);

    const cyclic = analyzeSchedule({ tasks: [{ id: "X", dependencies: ["Y"] }, { id: "Y", dependencies: ["X"] }] });
    expect(cyclic.cycles.length).toBeGreaterThan(0);
  });
});

describe("T5 — impact bridge extends the engine rather than duplicating it", () => {
  it("refuses to run without the existing engine injected", async () => {
    await expect(analyzeMode2Impact({ ir: context.ir, paths: ["src/svc.ts"] })).rejects.toThrow(/does not implement traversal/);
  });

  it("converts Mode 2 relations into the link-graph shape the engine already consumes", () => {
    const graph = toLinkGraph({ ir: context.ir });
    expect(graph.schema).toBe("govibe-link-graph/v1");
    expect(graph.edges.length).toBeGreaterThan(0);
    // Weights are the engine's; Mode 2 relation names map onto them.
    expect(graph.edges.every((edge) => ["imports", "references", "validates", "implements", "governed_by"].includes(edge.relation))).toBe(true);
    expect(graph.incoming instanceof Map).toBe(true);
  });

  it("produces impact with the engine's own scoring, chains, and required_action", async () => {
    const impact = await analyzeMode2Impact({ ir: context.ir, paths: ["src/svc.ts"], calculateWorkspaceImpact });
    expect(impact.engine).toMatch(/extended, not duplicated/);
    expect(impact.retrieval_radius).toBe("R3");
    for (const item of impact.affected) {
      expect(item.reason).toBeTruthy();
      expect(item.chain.length).toBeGreaterThan(0);
      expect(["must_update", "review_and_update", "review"]).toContain(item.required_action);
    }
  });

  it("expresses traversal depth on the R axis and rejects an out-of-range radius", async () => {
    const shallow = await analyzeMode2Impact({ ir: context.ir, paths: ["src/svc.ts"], retrievalRadius: "R1", calculateWorkspaceImpact });
    expect(shallow.retrieval_radius).toBe("R1");
    expect(shallow.policy.max_distance).toBe(1);
    await expect(analyzeMode2Impact({ ir: context.ir, paths: ["x"], retrievalRadius: "R9", calculateWorkspaceImpact })).rejects.toThrow(/R0\.\.R6/);
  });

  it("leaves the filesystem-backed impact path working unchanged", async () => {
    const result = await calculateWorkspaceImpact({ workspacePath: root, paths: ["docs/PRD-x.md"] });
    expect(result.schema).toBe("govibe-impact/v2");
    await expect(calculateWorkspaceImpact({})).rejects.toThrow(/either a workspacePath or a pre-built graph/);
  });
});
