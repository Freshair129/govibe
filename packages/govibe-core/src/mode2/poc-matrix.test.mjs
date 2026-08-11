import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { measureWorkspace } from "./measurement.mjs";
import { buildPocFixture, POC_CLASSES } from "./poc-fixtures.mjs";

/**
 * POC repository matrix, fixture classes only (A, B, E).
 *
 * Classes C and D are real repositories and are measured by the operator script, not here — a
 * unit suite must not depend on a checkout existing at a particular path.
 */

let roots = [];

async function fixture(classId) {
  const root = await mkdtemp(path.join(tmpdir(), `govibe-poc-${classId.toLowerCase()}-`));
  roots.push(root);
  const declared = await buildPocFixture(classId, root);
  return { root, declared };
}

beforeEach(() => {
  roots = [];
});

afterEach(async () => {
  for (const root of roots) await rm(root, { recursive: true, force: true });
});

describe("POC class A — simple single-service application", () => {
  it("recovers routes, modules, imports, and requirements against declared ground truth", async () => {
    const { root, declared } = await fixture("A");
    const measurement = await measureWorkspace({ workspaceRoot: root, label: "A", groundTruth: declared.ground_truth });

    expect(measurement.accuracy.routes.recall).toBe(1);
    expect(measurement.accuracy.routes.precision).toBe(1);
    expect(measurement.accuracy.modules.recall).toBe(1);
    expect(measurement.accuracy.import_edges.recall).toBe(1);
    expect(measurement.accuracy.requirements.recall).toBe(1);
    expect(measurement.accuracy.agentic_system.correct).toBe(true);
    // No spurious import edge: this is the false-relation rate the prompt asks to measure.
    expect(measurement.false_relation_rate).toBe(0);
  });
});

describe("POC class B — medium modular application", () => {
  it("recovers entities, state shapes, and the module graph", async () => {
    const { root, declared } = await fixture("B");
    const measurement = await measureWorkspace({ workspaceRoot: root, label: "B", groundTruth: declared.ground_truth });

    expect(measurement.accuracy.entities.recall).toBe(1);
    expect(measurement.accuracy.state_shapes.recall).toBe(1);
    expect(measurement.accuracy.import_edges.recall).toBe(1);
    expect(measurement.false_relation_rate).toBe(0);
    expect(measurement.accuracy.agentic_system.correct).toBe(true);
  });
});

describe("POC class E — poor or no documentation", () => {
  it("reports honest gaps instead of scoring a bare repository as complete", async () => {
    const { root, declared } = await fixture("E");
    const measurement = await measureWorkspace({ workspaceRoot: root, label: "E", groundTruth: declared.ground_truth });

    // No intent artefacts exist, so the top-down dimensions cannot be covered.
    expect(measurement.semantic_coverage.ratio).toBeLessThan(1);
    expect(measurement.accuracy.requirements.expected).toBe(0);
    expect(measurement.accuracy.agentic_system.correct).toBe(true);
    // The declared limitation holds: CommonJS require() yields no import edges, and the
    // fixture says so rather than the scanner being credited for an empty graph.
    expect(declared.ground_truth.expected_limitation).toMatch(/commonjs/i);
    expect(measurement.accuracy.import_edges.found).toBe(0);
  });
});

describe("measurement harness", () => {
  it("reports accuracy as null for a repository with no declared ground truth", async () => {
    const { root } = await fixture("A");
    const measurement = await measureWorkspace({ workspaceRoot: root, label: "no-truth" });
    expect(measurement.accuracy).toBeNull();
    expect(measurement.false_relation_rate).toBeNull();
    expect(measurement.accuracy_note).toMatch(/not measurable/);
    // Coverage, volume, unresolved, and timing are still measurable without ground truth.
    expect(measurement.semantic_coverage.ratio).toBeGreaterThan(0);
    expect(measurement.volume.atoms).toBeGreaterThan(0);
  });

  it("measures incremental rebuild by counting stages actually re-executed", async () => {
    const { root, declared } = await fixture("A");
    const measurement = await measureWorkspace({
      workspaceRoot: root,
      label: "A-incremental",
      groundTruth: declared.ground_truth,
      touchFile: () => writeFile(path.join(root, "src/store.js"), "export const store = { all() { return [1]; }, add() { return 2; } };\n", "utf8"),
    });
    expect(measurement.incremental.stages_reexecuted).toBeGreaterThan(0);
    expect(measurement.incremental.stages_reexecuted).toBeLessThan(12);
    expect(measurement.incremental.stages_reused).toBeGreaterThan(0);
  });

  it("does not publish a wall-clock figure as a benchmark", async () => {
    const { root } = await fixture("E");
    const measurement = await measureWorkspace({ workspaceRoot: root, label: "E" });
    expect(measurement.timing.caveat).toMatch(/not a benchmark/);
  });

  it("declares which POC classes are fixtures and which are real repositories", () => {
    expect(Object.keys(POC_CLASSES).sort()).toEqual(["A", "B", "C", "D", "E"]);
    expect(POC_CLASSES.C.kind).toBe("real-repository");
    expect(POC_CLASSES.D.kind).toBe("real-repository");
    expect(["A", "B", "E"].every((id) => POC_CLASSES[id].kind === "fixture")).toBe(true);
  });
});
