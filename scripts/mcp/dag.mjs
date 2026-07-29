// Pure dependency-graph utilities over roadmap task nodes.
//
// Edge direction: `X dependsOn Y`  =>  edge `Y -> X` (Y must reach "done" before X is ready).
// `parentId` is hierarchy, NOT a dependency, and is intentionally ignored here.
// Cycles are *reported*, never thrown — a malformed roadmap must degrade honestly, not crash.
// W-Scale flags fan-out per docs/STD-Execution-Governance.md §4 (W2 ≤5 / W3 6-8 / W4 9+).
//
// This module is pure: it takes nodes in and returns a structure out, with no I/O and no
// runtime coupling, so it is unit-testable without spawning agents or loading the runtime.

const W3_OUT_DEGREE = 6; // 6-8 dependents => W3 (lead review)
const W4_OUT_DEGREE = 9; // 9+ dependents  => W4 (block until refactored)

/** Map an out-degree (number of dependents) to a W-Scale band. */
export function wScaleForOutDegree(outDegree) {
  if (outDegree >= W4_OUT_DEGREE) return "W4";
  if (outDegree >= W3_OUT_DEGREE) return "W3";
  return "W2";
}

function normalizeDependsOn(node) {
  const raw = Array.isArray(node.dependsOn) ? node.dependsOn : [];
  const cleaned = raw.map((id) => String(id ?? "").trim()).filter(Boolean);
  // de-dupe and drop self-references (a self-loop is never a real dependency)
  return [...new Set(cleaned)].filter((id) => id !== node.id);
}

/**
 * Tarjan strongly-connected-components cycle finder over the dependency graph.
 * Returns each cycle as a sorted array of node ids. SCCs of size 1 are not cycles
 * (self-references are already stripped upstream).
 */
export function detectCycles(nodeList, dependents) {
  let index = 0;
  const stack = [];
  const onStack = new Set();
  const indices = new Map();
  const low = new Map();
  const cycles = [];

  function strongConnect(v) {
    indices.set(v, index);
    low.set(v, index);
    index += 1;
    stack.push(v);
    onStack.add(v);

    for (const w of dependents.get(v) ?? []) {
      if (!indices.has(w)) {
        strongConnect(w);
        low.set(v, Math.min(low.get(v), low.get(w)));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v), indices.get(w)));
      }
    }

    if (low.get(v) === indices.get(v)) {
      const scc = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      if (scc.length > 1) cycles.push(scc.sort());
    }
  }

  for (const node of nodeList) {
    if (!indices.has(node.id)) strongConnect(node.id);
  }
  return cycles;
}

function deriveStatus(node, depsAllDone, inCycle) {
  if (node.state === "done") return "done";
  if (node.state === "in_progress") return "active";
  if (node.state === "blocked" || inCycle || !depsAllDone) return "blocked";
  return "ready";
}

/**
 * Build a directed acyclic dependency graph view from roadmap nodes.
 *
 * @param {Array} nodes - WorkflowTaskNode-shaped objects ({ id, type, state, dependsOn? }).
 * @param {object} [options]
 * @param {Set<string>|string[]} [options.actionableTypes] - node types eligible for the `ready` frontier.
 * @param {string} [options.computedAt] - override timestamp (tests pass a fixed value).
 * @returns {{nodes, edges, levels, cycles, ready, danglingDeps, wScale, computedAt}}
 */
export function buildDag(nodes = [], options = {}) {
  const actionableTypes = options.actionableTypes instanceof Set
    ? options.actionableTypes
    : Array.isArray(options.actionableTypes)
      ? new Set(options.actionableTypes)
      : null;

  const nodeList = (nodes ?? []).filter((node) => node && node.id);
  const idSet = new Set(nodeList.map((node) => node.id));
  const byId = new Map(nodeList.map((node) => [node.id, node]));

  // Resolve dependency ids; record unknown (dangling) references but do not let them block.
  const depsById = new Map();
  const danglingDeps = [];
  for (const node of nodeList) {
    const declared = normalizeDependsOn(node);
    const valid = declared.filter((dep) => idSet.has(dep));
    const missing = declared.filter((dep) => !idSet.has(dep));
    depsById.set(node.id, valid);
    if (missing.length) danglingDeps.push({ id: node.id, missing });
  }

  // Build edges (dep -> dependent), dependents adjacency, and indegree.
  const dependents = new Map(nodeList.map((node) => [node.id, []]));
  const indegree = new Map(nodeList.map((node) => [node.id, 0]));
  const edges = [];
  for (const node of nodeList) {
    for (const dep of depsById.get(node.id)) {
      dependents.get(dep).push(node.id);
      indegree.set(node.id, indegree.get(node.id) + 1);
      edges.push({ source: dep, target: node.id, kind: "depends_on" });
    }
  }

  const cycles = detectCycles(nodeList, dependents);
  const cycleMembers = new Set(cycles.flat());

  // Kahn topological layering. Nodes in or downstream of a cycle never reach indegree 0,
  // so they are naturally left unplaced (level -1) — an honest "cannot be scheduled" signal.
  const workingIndegree = new Map(indegree);
  const levelOf = new Map();
  const placed = new Set();
  const levels = [];
  let frontier = nodeList
    .filter((node) => workingIndegree.get(node.id) === 0)
    .map((node) => node.id)
    .sort();
  let level = 0;
  while (frontier.length) {
    levels.push([...frontier]);
    for (const id of frontier) {
      levelOf.set(id, level);
      placed.add(id);
    }
    const next = [];
    for (const id of frontier) {
      for (const dependent of dependents.get(id)) {
        if (placed.has(dependent)) continue;
        workingIndegree.set(dependent, workingIndegree.get(dependent) - 1);
        if (workingIndegree.get(dependent) === 0) next.push(dependent);
      }
    }
    frontier = [...new Set(next)].sort();
    level += 1;
  }

  const isDone = (id) => byId.get(id)?.state === "done";
  const ready = [];
  const dagNodes = nodeList.map((node) => {
    const deps = depsById.get(node.id);
    const inCycle = cycleMembers.has(node.id);
    const depsAllDone = deps.every((dep) => isDone(dep));
    const status = deriveStatus(node, depsAllDone, inCycle);
    const actionable = !actionableTypes || actionableTypes.has(node.type);
    if (status === "ready" && actionable) ready.push(node.id);
    return {
      id: node.id,
      label: node.title ?? node.id,
      type: node.type,
      state: node.state,
      status,
      level: levelOf.has(node.id) ? levelOf.get(node.id) : -1,
      dependsOn: deps,
      outDegree: dependents.get(node.id).length,
      inDegree: deps.length,
    };
  });

  // W-Scale: worst band across all nodes + the offending nodes as warnings.
  const warnings = [];
  let worst = dagNodes.length ? "W2" : "none";
  for (const dn of dagNodes) {
    const scale = wScaleForOutDegree(dn.outDegree);
    if (scale === "W3" || scale === "W4") warnings.push({ id: dn.id, outDegree: dn.outDegree, level: scale });
    if (scale === "W4") worst = "W4";
    else if (scale === "W3" && worst === "W2") worst = "W3";
  }

  return {
    nodes: dagNodes,
    edges,
    levels,
    cycles,
    ready,
    danglingDeps,
    wScale: { worst, warnings },
    computedAt: options.computedAt ?? new Date().toISOString(),
  };
}

/** Canonical accessor for the runnable frontier (actionable nodes whose deps are all done). */
export function getReadyTasks(dag) {
  return dag?.ready ?? [];
}
