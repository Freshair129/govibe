import { describe, expect, it, vi } from "vitest";

import { buildDag } from "./dag.mjs";
import { computeWaves } from "./wave.mjs";
import { runAutonomy } from "./autonomy.mjs";

const ACTIONABLE = new Set(["task", "sub-task", "micro-task", "atomic-task"]);
const NOW = () => "2026-06-24T00:00:00.000Z";

function task(id, dependsOn = [], state = "planned", type = "task") {
  return { id, type, title: id, state, dependsOn };
}

// A → {B, C} → D diamond: a two-task parallel middle wave for concurrency tests.
function diamondDag() {
  return buildDag(
    [task("A"), task("B", ["A"]), task("C", ["A"]), task("D", ["B", "C"])],
    { actionableTypes: ACTIONABLE },
  );
}

const buildStep = (taskId) => ({ stepId: `step-${taskId}`, taskId, agentId: "eva", definitionOfDone: { checks: [] } });

// A runStep test double: pass unless taskId is in `blockOn`.
function fakeRunStep(blockOn = new Set()) {
  return vi.fn(async (step) =>
    blockOn.has(step.taskId)
      ? { stepId: step.stepId, taskId: step.taskId, status: "blocked", attempts: 2, humanGate: { required: true, reason: "DoD failed" } }
      : { stepId: step.stepId, taskId: step.taskId, status: "done", attempts: 1 },
  );
}

describe("runAutonomy - guarded dry-run (default)", () => {
  it("plans every wave and emits the lifecycle WITHOUT calling runStep", async () => {
    const dag = diamondDag();
    const emit = vi.fn();
    const runStep = vi.fn();
    const report = await runAutonomy({ dag, actionableTypes: ACTIONABLE, buildStep }, { runStep, emit, now: NOW });

    expect(report.mode).toBe("dry-run");
    expect(report.status).toBe("planned");
    expect(runStep).not.toHaveBeenCalled(); // no agents spawned, no gates run
    expect(report.steps).toEqual([]);
    expect(report.plannedSteps.map((s) => s.taskId).sort()).toEqual(["A", "B", "C", "D"]);
    // every wave starts + completes, and tasks are reported as planned/queued — never "done"
    expect(emit.mock.calls.filter(([e]) => e.type === "wave.start")).toHaveLength(3);
    expect(emit.mock.calls.filter(([e]) => e.type === "wave.complete")).toHaveLength(3);
    const taskUpdates = emit.mock.calls.map(([e]) => e).filter((e) => e.type === "wave.task.update");
    expect(taskUpdates.every((e) => e.task.status === "queued" && e.task.planned === true)).toBe(true);
  });
});

describe("runAutonomy - live execution", () => {
  it("runs each task's StEP wave-by-wave and reports complete on all-pass", async () => {
    const dag = diamondDag();
    const runStep = fakeRunStep();
    const emit = vi.fn();
    const report = await runAutonomy(
      { dag, execute: true, actionableTypes: ACTIONABLE, buildStep },
      { runStep, emit, now: NOW },
    );

    expect(report.mode).toBe("live");
    expect(report.status).toBe("complete");
    expect(runStep).toHaveBeenCalledTimes(4);
    expect(report.waves.map((w) => w.status)).toEqual(["complete", "complete", "complete"]);
    expect(report.steps.every((s) => s.status === "done")).toBe(true);
    const doneUpdates = emit.mock.calls.map(([e]) => e).filter((e) => e.type === "wave.task.update" && e.task.status === "done");
    expect(doneUpdates).toHaveLength(4);
  });

  it("respects wave concurrency: the 2-task middle wave runs both before completing", async () => {
    const dag = diamondDag();
    let inFlight = 0;
    let peak = 0;
    const runStep = vi.fn(async (step) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return { stepId: step.stepId, taskId: step.taskId, status: "done", attempts: 1 };
    });
    const report = await runAutonomy(
      { dag, execute: true, actionableTypes: ACTIONABLE, buildStep },
      { runStep, now: NOW },
    );
    const middle = report.waves.find((w) => w.index === 1);
    expect(middle.concurrency).toBe(2);
    expect(peak).toBe(2); // B and C ran concurrently
  });

  it("stops the whole run at the wave where a StEP blocks (DoD never auto-overridden)", async () => {
    // Linear A→B→C so the block in B must halt before C ever runs.
    const dag = buildDag([task("A"), task("B", ["A"]), task("C", ["B"])], { actionableTypes: ACTIONABLE });
    const runStep = fakeRunStep(new Set(["B"]));
    const report = await runAutonomy(
      { dag, execute: true, actionableTypes: ACTIONABLE, buildStep },
      { runStep, now: NOW },
    );

    expect(report.status).toBe("blocked");
    expect(report.blockedAt).toMatchObject({ taskId: "B" });
    expect(runStep).toHaveBeenCalledTimes(2); // A ran, B blocked, C never started
    expect(report.waves.map((w) => w.status)).toEqual(["complete", "blocked"]);
  });
});

describe("runAutonomy - refusals & guards", () => {
  it("refuses a W4 super-hub fan-out at run start", async () => {
    const hub = task("HUB");
    const dependents = Array.from({ length: 9 }, (_, i) => task(`T${i}`, ["HUB"]));
    const dag = buildDag([hub, ...dependents], { actionableTypes: ACTIONABLE });
    expect(dag.wScale.worst).toBe("W4");
    const runStep = vi.fn();
    const report = await runAutonomy({ dag, execute: true, actionableTypes: ACTIONABLE, buildStep }, { runStep });
    expect(report.status).toBe("refused");
    expect(runStep).not.toHaveBeenCalled();
  });

  it("refuses execute:true without a runStep dependency instead of throwing", async () => {
    const dag = diamondDag();
    const report = await runAutonomy({ dag, execute: true, actionableTypes: ACTIONABLE, buildStep }, {});
    expect(report.status).toBe("refused");
  });

  it("reports empty when there is no actionable work", async () => {
    const dag = buildDag([task("A", [], "done")], { actionableTypes: ACTIONABLE });
    const report = await runAutonomy({ dag, actionableTypes: ACTIONABLE, buildStep }, { now: NOW });
    expect(report.status).toBe("empty");
    expect(report.waveCount).toBe(0);
  });

  it("honors maxWaves to bound autonomous depth", async () => {
    const dag = buildDag([task("A"), task("B", ["A"]), task("C", ["B"])], { actionableTypes: ACTIONABLE });
    const runStep = fakeRunStep();
    const report = await runAutonomy(
      { dag, execute: true, maxWaves: 1, actionableTypes: ACTIONABLE, buildStep },
      { runStep, now: NOW },
    );
    expect(report.waveCount).toBe(1);
    expect(runStep).toHaveBeenCalledTimes(1); // only wave 0 (A) ran
  });

  it("accepts precomputed waves and threads them through unchanged", async () => {
    const dag = diamondDag();
    const waves = computeWaves(dag, { actionableTypes: ACTIONABLE });
    const runStep = fakeRunStep();
    const report = await runAutonomy(
      { dag, waves, execute: true, buildStep },
      { runStep, now: NOW },
    );
    expect(report.waveCount).toBe(waves.length);
    expect(report.status).toBe("complete");
  });
});
