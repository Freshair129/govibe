import { describe, expect, it } from "vitest";

import { buildDag, detectCycles, getReadyTasks, wScaleForOutDegree } from "./dag.mjs";

const ACTIONABLE = new Set(["task", "sub-task", "micro-task", "atomic-task"]);

function task(id, dependsOn = [], state = "planned", type = "task") {
  return { id, type, title: id, state, dependsOn };
}

describe("wScaleForOutDegree", () => {
  it("maps out-degree to W-Scale bands at the STD §4 boundaries", () => {
    expect(wScaleForOutDegree(0)).toBe("W2");
    expect(wScaleForOutDegree(5)).toBe("W2");
    expect(wScaleForOutDegree(6)).toBe("W3");
    expect(wScaleForOutDegree(8)).toBe("W3");
    expect(wScaleForOutDegree(9)).toBe("W4");
  });
});

describe("buildDag - linear chain", () => {
  const dag = buildDag([task("A"), task("B", ["A"]), task("C", ["B"])], { actionableTypes: ACTIONABLE });

  it("orders nodes into one level per step", () => {
    expect(dag.levels).toEqual([["A"], ["B"], ["C"]]);
    expect(dag.cycles).toEqual([]);
  });

  it("only the dependency-free task is ready", () => {
    expect(dag.ready).toEqual(["A"]);
    expect(getReadyTasks(dag)).toEqual(["A"]);
  });

  it("derives a depends_on edge per declared dependency", () => {
    expect(dag.edges).toEqual([
      { source: "A", target: "B", kind: "depends_on" },
      { source: "B", target: "C", kind: "depends_on" },
    ]);
  });
});

describe("buildDag - readiness advances as dependencies complete", () => {
  it("promotes B to ready once A is done", () => {
    const dag = buildDag([task("A", [], "done"), task("B", ["A"]), task("C", ["B"])], { actionableTypes: ACTIONABLE });
    expect(dag.ready).toEqual(["B"]);
    expect(dag.nodes.find((n) => n.id === "A").status).toBe("done");
    expect(dag.nodes.find((n) => n.id === "B").status).toBe("ready");
    expect(dag.nodes.find((n) => n.id === "C").status).toBe("blocked");
  });
});

describe("buildDag - diamond", () => {
  const dag = buildDag(
    [task("A"), task("B", ["A"]), task("C", ["A"]), task("D", ["B", "C"])],
    { actionableTypes: ACTIONABLE },
  );

  it("places parallel siblings on the same level", () => {
    expect(dag.levels).toEqual([["A"], ["B", "C"], ["D"]]);
  });

  it("counts A's fan-out as out-degree 2", () => {
    expect(dag.nodes.find((n) => n.id === "A").outDegree).toBe(2);
    expect(dag.nodes.find((n) => n.id === "D").inDegree).toBe(2);
  });
});

describe("buildDag - dangling dependency", () => {
  const dag = buildDag([task("A", ["GHOST"]), task("B", ["A"])], { actionableTypes: ACTIONABLE });

  it("records the unknown dependency without blocking on it", () => {
    expect(dag.danglingDeps).toEqual([{ id: "A", missing: ["GHOST"] }]);
    // A's only declared dep is unknown -> dropped -> A is ready
    expect(dag.ready).toContain("A");
  });

  it("does not create an edge to a non-existent node", () => {
    expect(dag.edges).toEqual([{ source: "A", target: "B", kind: "depends_on" }]);
  });
});

describe("buildDag - cycle is reported, never thrown", () => {
  const nodes = [task("A", ["B"]), task("B", ["A"]), task("C", ["B"])];
  const dag = buildDag(nodes, { actionableTypes: ACTIONABLE });

  it("detects the strongly-connected cycle", () => {
    expect(dag.cycles).toEqual([["A", "B"]]);
  });

  it("excludes unschedulable nodes from levels and marks them blocked", () => {
    expect(dag.levels).toEqual([]);
    expect(dag.nodes.find((n) => n.id === "A").level).toBe(-1);
    expect(dag.nodes.find((n) => n.id === "A").status).toBe("blocked");
    expect(dag.nodes.find((n) => n.id === "C").status).toBe("blocked");
    expect(dag.ready).toEqual([]);
  });

  it("detectCycles works directly over a dependents adjacency map", () => {
    const dependents = new Map([
      ["A", ["B"]],
      ["B", ["A", "C"]],
      ["C", []],
    ]);
    expect(detectCycles(nodes, dependents)).toEqual([["A", "B"]]);
  });
});

describe("buildDag - W-Scale fan-out", () => {
  it("flags a W4 super-hub (9+ dependents) and refuses to call it W2", () => {
    const dependents = Array.from({ length: 9 }, (_, i) => task(`T${i}`, ["HUB"]));
    const dag = buildDag([task("HUB"), ...dependents], { actionableTypes: ACTIONABLE });
    expect(dag.wScale.worst).toBe("W4");
    expect(dag.wScale.warnings).toContainEqual({ id: "HUB", outDegree: 9, level: "W4" });
  });

  it("flags a W3 hub (6 dependents)", () => {
    const dependents = Array.from({ length: 6 }, (_, i) => task(`T${i}`, ["HUB"]));
    const dag = buildDag([task("HUB"), ...dependents]);
    expect(dag.wScale.worst).toBe("W3");
    expect(dag.wScale.warnings).toContainEqual({ id: "HUB", outDegree: 6, level: "W3" });
  });
});

describe("buildDag - actionable filter and empty input", () => {
  it("keeps non-actionable container nodes out of the ready frontier", () => {
    const dag = buildDag(
      [task("RM", [], "planned", "roadmap"), task("T1", ["RM"], "done"), task("T2", ["T1"])],
      { actionableTypes: ACTIONABLE },
    );
    // RM is ready by topology but not actionable, so it is excluded; T2's dep T1 is done -> ready
    expect(dag.ready).toEqual(["T2"]);
  });

  it("returns an honest empty structure for no nodes", () => {
    const dag = buildDag([]);
    expect(dag.nodes).toEqual([]);
    expect(dag.levels).toEqual([]);
    expect(dag.cycles).toEqual([]);
    expect(dag.ready).toEqual([]);
    expect(dag.wScale.worst).toBe("none");
  });
});
