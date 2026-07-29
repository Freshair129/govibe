// Pure WAVE scheduler over a roadmap DAG.
//
// A "wave" is the set of actionable, not-done tasks that share a DAG topological level —
// i.e. work that can run in parallel because nothing inside the wave depends on anything
// else inside it. Waves are produced here (planning); the AutonomyController (Phase 4)
// executes them. Concurrency per wave is bounded by W-Scale (STD-Execution-Governance §4)
// and optional executor limits, honoring the framework principle "1 Concern -> 1 Task"
// (FRAMEWORK_MASTER_SPEC Principle 2): each wave is a batch of independent single-concern units.
//
// Pure module: DAG in -> wave structures out, no I/O, no runtime coupling.

const DEFAULT_CONCURRENCY_CAP = 3; // STD §4 W2 lower bound — conservative default

function toSet(value) {
  if (value instanceof Set) return value;
  if (Array.isArray(value)) return new Set(value);
  return null;
}

/** Bound the parallelism of a wave by cap, task count, W-Scale ceiling, and executor budget. */
export function concurrencySlots(wave, options = {}) {
  const { concurrencyCap = DEFAULT_CONCURRENCY_CAP, wScaleWorst = "W2", executorLimits } = options;
  const taskCount = wave?.taskIds?.length ?? 0;
  let ceiling = concurrencyCap;
  if (wScaleWorst === "W3") ceiling = Math.min(ceiling, 5); // 6-8 fan-out: lead-review band, throttle
  // W4 (super-hub) is refused at run start by the orchestrator; here we still clamp to the cap.
  let slots = Math.min(ceiling, taskCount);
  if (executorLimits) {
    const budget = (executorLimits.codex ?? Infinity) + (executorLimits.ollama ?? Infinity);
    slots = Math.min(slots, budget);
  }
  return Math.max(0, slots);
}

/**
 * Turn a RoadmapDag into ordered, parallelizable waves.
 * @param {object} dag - output of buildDag (needs nodes, levels, wScale).
 * @param {object} [options]
 * @param {number} [options.concurrencyCap=3]
 * @param {Set<string>|string[]} [options.actionableTypes] - only these node types become wave work.
 * @param {{codex?:number, ollama?:number}} [options.executorLimits]
 * @returns {Array} waves
 */
export function computeWaves(dag, options = {}) {
  if (!dag || !Array.isArray(dag.levels)) return [];
  const actionableTypes = toSet(options.actionableTypes);
  const concurrencyCap = options.concurrencyCap ?? DEFAULT_CONCURRENCY_CAP;
  const executorLimits = options.executorLimits;
  const wScaleWorst = dag.wScale?.worst ?? "none";
  const byId = new Map((dag.nodes ?? []).map((node) => [node.id, node]));

  const waves = [];
  let index = 0;
  for (let level = 0; level < dag.levels.length; level += 1) {
    const taskIds = (dag.levels[level] ?? []).filter((id) => {
      const node = byId.get(id);
      if (!node) return false;
      if (node.status === "done") return false; // no work left
      if (actionableTypes && !actionableTypes.has(node.type)) return false; // containers are not executed
      return true;
    });
    if (taskIds.length === 0) continue; // omit empty bands so wave indices are dense

    const wave = {
      id: `wave-${index}`,
      index,
      level,
      status: "pending",
      taskIds,
      tasks: taskIds.map((taskId) => ({
        taskId,
        assigneeId: byId.get(taskId)?.assigneeId,
        status: "queued",
        attempts: 0,
      })),
      concurrency: 0,
    };
    wave.concurrency = concurrencySlots(wave, { concurrencyCap, wScaleWorst, executorLimits });
    waves.push(wave);
    index += 1;
  }
  return waves;
}

/**
 * The next wave that still has runnable work. Re-checks the live ready frontier (dag.ready)
 * so an early-finishing prerequisite can promote a deeper wave instead of starving it.
 */
export function nextRunnableWave(waves = [], context = {}) {
  const readySet = context.dag ? new Set(context.dag.ready ?? []) : null;
  for (const wave of waves) {
    if (wave.status === "complete" || wave.status === "skipped") continue;
    if (!readySet) return wave;
    if (wave.taskIds.some((id) => readySet.has(id))) return wave;
  }
  return null;
}

function upsertTask(tasks, next) {
  const index = tasks.findIndex((task) => task.taskId === next.taskId);
  if (index === -1) return [...tasks, next];
  return tasks.map((task, i) => (i === index ? { ...task, ...next } : task));
}

function isTerminal(status) {
  return status === "done" || status === "failed" || status === "blocked";
}

function deriveWaveStatus(tasks) {
  if (!tasks.length) return "skipped";
  if (tasks.every((task) => isTerminal(task.status))) return "complete";
  if (tasks.some((task) => task.status === "running" || task.status === "verifying")) return "active";
  return "pending";
}

/** Immutably fold a wave lifecycle event into a wave. */
export function reduceWaveEvent(wave, event = {}) {
  if (event.kind === "start") {
    return { ...wave, status: "active", startedAt: event.at ?? wave.startedAt };
  }
  if (event.kind === "complete") {
    return { ...wave, status: "complete", completedAt: event.at ?? wave.completedAt };
  }
  if (event.kind === "task.update" && event.task) {
    const tasks = upsertTask(wave.tasks, event.task);
    return { ...wave, tasks, status: deriveWaveStatus(tasks) };
  }
  return wave;
}

/** Roll up wave states for a HUD/summary line. */
export function summarizeWaves(waves = []) {
  const summary = { total: waves.length, pending: 0, active: 0, complete: 0, skipped: 0 };
  for (const wave of waves) {
    if (wave.status in summary) summary[wave.status] += 1;
  }
  return summary;
}
