// AutonomyController — the Phase 4 runner that wave.mjs defers to.
//
// computeWaves() (planning) turns a roadmap DAG into ordered, parallelizable waves but runs
// nothing. This controller is the executor: it walks the waves in topological order and drives
// each wave's tasks through a StEP (step.mjs) with bounded concurrency (wave.concurrency, from
// W-Scale), advancing wave-by-wave until the roadmap is done or a human gate blocks it.
//
// GUARDED BY DEFAULT (live-data-only, PRODUCT.md): with `execute:false` (the default) the
// controller produces the real execution PLAN and emits the full wave.*/step lifecycle so the
// Visual Fleet can render the lanes — but it spawns NO agents, runs NO Definition-of-Done gate,
// and mutates NO roadmap state. Tasks stay "queued"; nothing is ever falsely reported "done".
// Real execution (spawn agents + real gates + roadmap mutation) happens only with `execute:true`.
//
// Stop-on-block: a StEP that exhausts its retries blocks its task and raises a human gate. The
// controller halts the whole run at that wave — a Definition-of-Done is never auto-overridden
// (mirrors step.mjs). W4 super-hub fan-out (9+ dependents) is refused at run start (wave.mjs §).
//
// Pure + fully injectable: all side effects (runStep / emit / now) come in via `deps`, so the
// sequencing, concurrency batching, and stop-on-block logic unit-test without spawning anything.

import { computeWaves } from "./wave.mjs";

const REFUSED_W4 =
  "Refusing autonomous run: roadmap DAG has a W4 super-hub (9+ dependents). " +
  "Refactor the fan-out before autonomous execution (STD-Execution-Governance §4).";

/** Bounded concurrency pool: run `worker(item)` over `items`, at most `slots` in flight. */
async function pool(items, slots, worker) {
  const width = Math.max(1, Math.min(slots || 1, items.length));
  let cursor = 0;
  async function lane() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: width }, () => lane()));
}

/**
 * Run a roadmap DAG autonomously, wave by wave.
 *
 * @param {object} plan
 * @param {object} plan.dag - RoadmapDag (buildDag output); its wScale gates the run.
 * @param {Array}  [plan.waves] - precomputed waves; computed from dag when omitted.
 * @param {boolean} [plan.execute=false] - false = dry-run plan (no side effects); true = live.
 * @param {number} [plan.concurrencyCap=3]
 * @param {Set<string>|string[]} [plan.actionableTypes]
 * @param {{codex?:number, ollama?:number}} [plan.executorLimits]
 * @param {number} [plan.maxWaves=Infinity] - stop after this many waves (bounded autonomy).
 * @param {(taskId:string, wave:object)=>object} plan.buildStep - maps a task id to a StepInput.
 * @param {object} deps
 * @param {(step:object)=>Promise<object>} [deps.runStep] - REQUIRED when execute=true.
 * @param {(event:object)=>void} [deps.emit]
 * @param {()=>string} [deps.now]
 * @returns {Promise<object>} run report
 */
export async function runAutonomy(plan = {}, deps = {}) {
  const {
    dag,
    execute = false,
    concurrencyCap = 3,
    actionableTypes,
    executorLimits,
    maxWaves = Infinity,
    buildStep,
  } = plan;
  const { runStep, emit = () => {}, now = () => new Date().toISOString() } = deps;

  const mode = execute ? "live" : "dry-run";

  if (dag?.wScale?.worst === "W4") {
    return { mode, status: "refused", refusedReason: REFUSED_W4, waveCount: 0, waves: [], steps: [], plannedSteps: [] };
  }
  if (execute && typeof runStep !== "function") {
    return { mode, status: "refused", refusedReason: "execute:true requires a runStep dependency.", waveCount: 0, waves: [], steps: [], plannedSteps: [] };
  }
  if (typeof buildStep !== "function") {
    return { mode, status: "refused", refusedReason: "runAutonomy requires a buildStep mapper.", waveCount: 0, waves: [], steps: [], plannedSteps: [] };
  }

  const waves = Array.isArray(plan.waves)
    ? plan.waves
    : computeWaves(dag, { concurrencyCap, actionableTypes, executorLimits });

  if (waves.length === 0) {
    return { mode, status: "empty", waveCount: 0, waves: [], steps: [], plannedSteps: [] };
  }

  const steps = [];
  const plannedSteps = [];
  const waveReports = [];
  let blockedAt = null;

  for (const wave of waves) {
    if (waveReports.length >= maxWaves) break;
    if (blockedAt) break;

    const taskState = new Map(
      wave.tasks.map((task) => [task.taskId, { taskId: task.taskId, assigneeId: task.assigneeId, status: "queued", attempts: 0 }]),
    );

    emit({ type: "wave.start", wave: { ...wave, status: "active", startedAt: now() } });

    await pool(wave.taskIds, wave.concurrency, async (taskId) => {
      if (blockedAt) return; // a sibling in this wave already blocked — start no new work
      const entry = taskState.get(taskId);
      const step = buildStep(taskId, wave);

      if (!execute) {
        plannedSteps.push(step);
        entry.status = "queued";
        emit({ type: "wave.task.update", waveId: wave.id, task: { ...entry, planned: true, updatedAt: now() } });
        return;
      }

      entry.status = "running";
      entry.startedAt = now();
      emit({ type: "wave.task.update", waveId: wave.id, task: { ...entry, updatedAt: now() } });

      const result = await runStep(step); // step.mjs emits its own step.start/attempt/gate
      steps.push(result);
      entry.attempts = result.attempts ?? entry.attempts;
      if (result.status === "done") {
        entry.status = "done";
        entry.progress = 100;
      } else {
        entry.status = "blocked";
        blockedAt = { waveId: wave.id, taskId, reason: result.humanGate?.reason ?? "Definition-of-Done failed." };
      }
      emit({ type: "wave.task.update", waveId: wave.id, task: { ...entry, updatedAt: now() } });
    });

    const tasks = [...taskState.values()];
    const waveStatus = blockedAt && blockedAt.waveId === wave.id ? "blocked" : execute ? "complete" : "planned";
    waveReports.push({
      id: wave.id,
      index: wave.index,
      level: wave.level,
      concurrency: wave.concurrency,
      status: waveStatus,
      tasks,
    });
    emit({ type: "wave.complete", waveId: wave.id, completedAt: now() });
  }

  let status;
  if (blockedAt) status = "blocked";
  else if (!execute) status = "planned";
  else status = "complete";

  return {
    mode,
    status,
    waveCount: waveReports.length,
    waves: waveReports,
    steps,
    plannedSteps,
    ...(blockedAt ? { blockedAt } : {}),
  };
}
