import { describe, expect, it } from "vitest";

import { buildDag } from "./dag.mjs";
import {
  computeWaves,
  concurrencySlots,
  nextRunnableWave,
  reduceWaveEvent,
  summarizeWaves,
} from "./wave.mjs";

const ACTIONABLE = new Set(["task", "sub-task", "micro-task", "atomic-task"]);

function task(id, dependsOn = [], state = "planned", type = "task") {
  return { id, type, title: id, state, dependsOn };
}

describe("computeWaves - topology", () => {
  it("turns a linear chain into one single-task wave per level", () => {
    const dag = buildDag([task("A"), task("B", ["A"]), task("C", ["B"])], { actionableTypes: ACTIONABLE });
    const waves = computeWaves(dag, { actionableTypes: ACTIONABLE });
    expect(waves.map((w) => w.taskIds)).toEqual([["A"], ["B"], ["C"]]);
    expect(waves.map((w) => w.index)).toEqual([0, 1, 2]);
    expect(waves[0].tasks[0]).toMatchObject({ taskId: "A", status: "queued", attempts: 0 });
  });

  it("groups independent siblings of a diamond into one parallel wave", () => {
    const dag = buildDag(
      [task("A"), task("B", ["A"]), task("C", ["A"]), task("D", ["B", "C"])],
      { actionableTypes: ACTIONABLE },
    );
    const waves = computeWaves(dag, { actionableTypes: ACTIONABLE });
    expect(waves.map((w) => w.taskIds)).toEqual([["A"], ["B", "C"], ["D"]]);
    expect(waves[1].concurrency).toBe(2); // min(cap 3, 2 tasks)
  });

  it("omits done tasks and reindexes waves densely", () => {
    const dag = buildDag([task("A", [], "done"), task("B", ["A"])], { actionableTypes: ACTIONABLE });
    const waves = computeWaves(dag, { actionableTypes: ACTIONABLE });
    // A is done -> its level becomes empty -> only B's wave remains, indexed 0
    expect(waves).toHaveLength(1);
    expect(waves[0]).toMatchObject({ index: 0, level: 1, taskIds: ["B"] });
  });

  it("excludes non-actionable container nodes sharing a level with real work", () => {
    const dag = buildDag(
      [task("RM", [], "planned", "roadmap"), task("T1"), task("T2", ["T1"])],
      { actionableTypes: ACTIONABLE },
    );
    const waves = computeWaves(dag, { actionableTypes: ACTIONABLE });
    expect(waves.map((w) => w.taskIds)).toEqual([["T1"], ["T2"]]);
  });

  it("returns no waves for an empty or absent dag", () => {
    expect(computeWaves(buildDag([]))).toEqual([]);
    expect(computeWaves(null)).toEqual([]);
  });
});

describe("concurrencySlots", () => {
  it("caps at the concurrency cap and the task count", () => {
    expect(concurrencySlots({ taskIds: [1, 2, 3, 4, 5, 6, 7, 8] }, { concurrencyCap: 3 })).toBe(3);
    expect(concurrencySlots({ taskIds: [1, 2] }, { concurrencyCap: 3 })).toBe(2);
  });

  it("applies the W3 ceiling of 5 when the cap is higher", () => {
    expect(concurrencySlots({ taskIds: [1, 2, 3, 4, 5, 6] }, { concurrencyCap: 10, wScaleWorst: "W3" })).toBe(5);
    expect(concurrencySlots({ taskIds: [1, 2, 3, 4, 5, 6] }, { concurrencyCap: 10, wScaleWorst: "W2" })).toBe(6);
  });

  it("respects an executor budget", () => {
    expect(concurrencySlots({ taskIds: [1, 2, 3, 4] }, { concurrencyCap: 10, executorLimits: { codex: 1, ollama: 1 } })).toBe(2);
  });
});

describe("nextRunnableWave", () => {
  it("returns the first wave whose tasks are in the live ready frontier", () => {
    const dag = buildDag(
      [task("A", [], "done"), task("B", ["A"]), task("C", ["A"]), task("D", ["B", "C"])],
      { actionableTypes: ACTIONABLE },
    );
    const waves = computeWaves(dag, { actionableTypes: ACTIONABLE });
    // A done -> ready is [B,C]; first wave [B,C] is runnable
    expect(nextRunnableWave(waves, { dag })?.taskIds).toEqual(["B", "C"]);
  });

  it("skips completed waves and returns null when nothing is ready", () => {
    const dag = buildDag([task("A"), task("B", ["A"])], { actionableTypes: ACTIONABLE });
    const waves = computeWaves(dag, { actionableTypes: ACTIONABLE });
    waves[0].status = "complete";
    // A's wave complete; B not ready (A not marked done in dag) -> null
    expect(nextRunnableWave(waves, { dag })).toBeNull();
  });
});

describe("reduceWaveEvent + summarizeWaves", () => {
  const base = { id: "wave-0", index: 0, status: "pending", taskIds: ["T1", "T2"], tasks: [
    { taskId: "T1", status: "queued" },
    { taskId: "T2", status: "queued" },
  ] };

  it("marks a wave active on start", () => {
    expect(reduceWaveEvent(base, { kind: "start" }).status).toBe("active");
  });

  it("derives active then complete from task updates", () => {
    const running = reduceWaveEvent(base, { kind: "task.update", task: { taskId: "T1", status: "running" } });
    expect(running.status).toBe("active");
    const oneDone = reduceWaveEvent(running, { kind: "task.update", task: { taskId: "T1", status: "done" } });
    const allDone = reduceWaveEvent(oneDone, { kind: "task.update", task: { taskId: "T2", status: "done" } });
    expect(allDone.status).toBe("complete");
  });

  it("summarizes wave states", () => {
    const waves = [
      { status: "complete" },
      { status: "active" },
      { status: "pending" },
      { status: "pending" },
    ];
    expect(summarizeWaves(waves)).toEqual({ total: 4, pending: 2, active: 1, complete: 1, skipped: 0 });
  });
});
