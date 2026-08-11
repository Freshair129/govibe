import { byCodepoint, sortById } from "./stage-shared.mjs";

/**
 * Roadmap compiler (prompt §17–§19).
 *
 * The compiler must not jump `scan → tasks`. It walks the hierarchy:
 *
 *   Current State → Target State → Gap → Risk/Dependency → Phase → Epic → Feature → Work Package → Task
 *
 * Every emitted item preserves WHY, source evidence, affected semantic dimensions,
 * dependencies, risk, acceptance criteria, verification requirements, and recommended agent
 * capability. An item with no gap behind it is not emitted — the roadmap derives from observed
 * gaps, never from a template.
 */

const ROADMAP_SCHEMA = "govibe-mode2-roadmap/v1";

/** §18 workstreams. A category with no work is not forced into the output. */
const WORKSTREAMS = {
  unimplemented_requirement: "Core Engineering",
  missing_requirement: "Product",
  missing_tests: "Testing",
  orphan_tests: "Testing",
  stale_documentation: "Documentation",
  agent_governor_drift: "Agentic Infrastructure",
  undocumented_implementation: "Documentation",
  unknown_semantic_gap: "Semantic Knowledge",
};

/**
 * Complexity and access scope on the **canonical axes**.
 *
 * The implementation prompt's §19 proposed a six-rung complexity ladder on the `H` letter,
 * extending two rungs past the canonical ceiling. That is rejected: `ADR-021` fixes `H` as the
 * executor Access Scope with a top rung of `H4`, and the rungs above it are abolished.
 * Complexity is the separate `C` axis. §19 itself defers to the project's canonical model.
 * `C-3` maps to access default `H3`; `H4` is an explicit upward override requiring owner
 * approval and is never assigned automatically here.
 */
const COMPLEXITY_BY_GAP = {
  unimplemented_requirement: "C-2",
  missing_requirement: "C-3",
  missing_tests: "C-1",
  orphan_tests: "C-0",
  stale_documentation: "C-0",
  agent_governor_drift: "C-3",
  undocumented_implementation: "C-1",
  unknown_semantic_gap: "C-2",
};

const ACCESS_DEFAULT = { "C-0": "H0", "C-1": "H1", "C-2": "H2", "C-3": "H3" };

const RISK_BY_SEVERITY = { critical: "HIGH", warning: "MEDIUM", info: "LOW" };

/**
 * Effort estimation — ADR-028 Decision 5. **ADR-028 is `proposed`, not accepted**, so this is a
 * separate function and its output lands in a distinct `effort_estimate` field.
 *
 * The load-bearing constraint: an effort score is **not** a governance axis. It must never be
 * written into `complexity` (`C-0..C-3`) or `access_scope` (`H0..H4`), and a high score must
 * never raise `H`. Conflating an estimate with an authority ceiling is the same class of error
 * ADR-021 exists to prevent.
 */
export function estimateEffort({ gapClass, evidenceCount, severity }) {
  const scope = evidenceCount > 20 ? 8 : evidenceCount > 5 ? 5 : evidenceCount > 1 ? 2 : 1;
  const risk = severity === "critical" ? 5 : severity === "warning" ? 2 : 0;
  const dependencies = gapClass === "agent_governor_drift" || gapClass === "missing_requirement" ? 3 : gapClass === "unimplemented_requirement" ? 1 : 0;
  const aiml = 0;
  return {
    points: scope + risk + dependencies + aiml,
    breakdown: { scope, risk, dependencies, ai_ml: aiml },
    governed_by: "ADR-028 D5 (proposed)",
    axis_warning: "effort_estimate is not a governance axis; it must never be written to complexity or access_scope",
  };
}

function acceptanceFor(gapClass, finding) {
  switch (gapClass) {
    case "unimplemented_requirement":
      return [`Given ${finding.subject} is declared in ${finding.evidence[0] ?? "an intent artefact"}, When the scan re-runs, Then at least one code location carries an annotation naming it`];
    case "missing_tests":
      return ["Given the modules listed in evidence, When the scan re-runs, Then each is exercised by at least one test edge"];
    case "orphan_tests":
      return ["Given the tests listed in evidence, When the scan re-runs, Then each either exercises an in-scope module or is removed"];
    case "stale_documentation":
      return [`Given ${finding.subject}, When the document is re-scanned, Then every referenced path resolves inside the workspace`];
    case "agent_governor_drift":
      return [`Given the ${finding.subject} capability axis, When Stage 11 re-runs, Then it is classified NATIVE, PLATFORM, or HYBRID rather than MISSING`];
    case "unknown_semantic_gap":
      return [`Given the block profile requires ${finding.subject}, When coverage is re-evaluated, Then that dimension is covered by at least one atom, relation, or attribute`];
    default:
      return [`Given ${finding.subject}, When the scan re-runs, Then this gap no longer appears`];
  }
}

function verificationFor(gapClass) {
  if (gapClass === "missing_tests" || gapClass === "orphan_tests") return ["test suite run", "Mode 2 Stage 10 re-scan"];
  if (gapClass === "stale_documentation") return ["npm run docs:validate", "Mode 2 intent pass re-scan"];
  if (gapClass === "agent_governor_drift") return ["Mode 2 Stage 11 re-scan"];
  return ["Mode 2 full scan", "coverage re-evaluation"];
}

function capabilityFor(complexity) {
  if (complexity === "C-3") return "architecture-capable executor with owner review";
  if (complexity === "C-2") return "feature-capable executor";
  return "task-capable executor";
}

export function compileRoadmap({ gapAnalysis, coverage, ir, intendedModel, includeEffort = true }) {
  const findings = gapAnalysis?.findings ?? [];

  const currentState = {
    atoms: ir?.atoms?.length ?? 0,
    relations: ir?.relations?.length ?? 0,
    dimensions_covered: coverage?.covered ?? [],
    intent_documents: intendedModel?.document_count ?? 0,
    requirements_declared: intendedModel?.requirement_index?.length ?? 0,
  };
  const targetState = {
    block_profile: coverage?.block_profile ?? null,
    dimensions_required: coverage?.required ?? [],
    definition: coverage?.profile_description ?? null,
  };

  // Phase → Epic → Feature → Work Package → Task, derived from gaps only.
  const byWorkstream = new Map();
  for (const finding of findings) {
    const workstream = WORKSTREAMS[finding.gap_class] ?? "Technical Debt";
    if (!byWorkstream.has(workstream)) byWorkstream.set(workstream, []);
    byWorkstream.get(workstream).push(finding);
  }

  const phases = [];
  const tasks = [];
  let phaseIndex = 0;
  for (const workstream of [...byWorkstream.keys()].sort(byCodepoint)) {
    const group = byWorkstream.get(workstream);
    phaseIndex += 1;
    const phaseId = `M2-PHASE-${String(phaseIndex).padStart(2, "0")}`;
    const epics = [];

    for (const [epicIndex, finding] of group.entries()) {
      const complexity = COMPLEXITY_BY_GAP[finding.gap_class] ?? "C-2";
      const accessScope = ACCESS_DEFAULT[complexity];
      const epicId = `${phaseId}-EPIC-${String(epicIndex + 1).padStart(2, "0")}`;
      const taskId = `${epicId}-TASK-01`;

      const task = {
        id: taskId,
        type: "task",
        title: `Close ${finding.gap_class.replace(/_/g, " ")} for ${finding.subject}`,
        // WHY, preserved from the gap rather than restated.
        why: finding.description,
        gap_class: finding.gap_class,
        source_evidence: finding.evidence,
        affected_dimensions: affectedDimensions(finding, coverage),
        dependencies: [],
        complexity,
        access_scope: accessScope,
        risk: RISK_BY_SEVERITY[finding.severity] ?? "LOW",
        acceptance_criteria: acceptanceFor(finding.gap_class, finding),
        verification: verificationFor(finding.gap_class),
        recommended_agent_capability: capabilityFor(complexity),
        traces_to: finding.id,
      };
      if (includeEffort) {
        task.effort_estimate = estimateEffort({ gapClass: finding.gap_class, evidenceCount: finding.evidence?.length ?? 0, severity: finding.severity });
      }
      tasks.push(task);

      epics.push({
        id: epicId,
        type: "epic",
        title: `${workstream}: ${finding.gap_class.replace(/_/g, " ")}`,
        features: [{ id: `${epicId}-FEAT-01`, type: "feature", work_packages: [{ id: `${epicId}-WP-01`, type: "work-package", tasks: [taskId] }] }],
      });
    }

    phases.push({ id: phaseId, type: "phase", workstream, epics, task_count: epics.length });
  }

  const c3Tasks = tasks.filter((task) => task.complexity === "C-3");
  return {
    schema: ROADMAP_SCHEMA,
    canonical: false,
    derived_from: "observed gaps only; no template contributed an item",
    current_state: currentState,
    target_state: targetState,
    gap_count: findings.length,
    // §18: a workstream with no work is absent rather than empty.
    workstreams: [...byWorkstream.keys()].sort(byCodepoint),
    phases: phases.sort((left, right) => byCodepoint(left.id, right.id)),
    tasks: sortById(tasks),
    axes: {
      note: "complexity is C-0..C-3 and access scope is H0..H4 per ADR-021; the prompt's six-rung complexity ladder on the H letter is rejected",
      h4_override_required: c3Tasks.length > 0,
      h4_override_note: c3Tasks.length
        ? `${c3Tasks.length} task(s) are C-3. Raising any to H4 is an explicit upward override requiring owner approval and is never assigned automatically.`
        : null,
    },
    effort: includeEffort
      ? { governed_by: "ADR-028 D5 (proposed)", total_points: tasks.reduce((total, task) => total + (task.effort_estimate?.points ?? 0), 0) }
      : { governed_by: null, total_points: null },
    completeness_note: gapAnalysis?.completeness ?? null,
  };
}

function affectedDimensions(finding, coverage) {
  if (finding.gap_class === "unknown_semantic_gap") return [finding.subject];
  if (finding.gap_class === "missing_tests" || finding.gap_class === "orphan_tests") return ["verification"];
  if (finding.gap_class === "unimplemented_requirement" || finding.gap_class === "missing_requirement") return ["requirement"];
  if (finding.gap_class === "stale_documentation" || finding.gap_class === "undocumented_implementation") return ["intent"];
  if (finding.gap_class === "agent_governor_drift") return ["agent_governance", "agent_capability"];
  return coverage?.missing ?? [];
}

/**
 * Critical path over task dependencies (ADR-028 D5, proposed). Returns the longest dependency
 * chain and the independently-schedulable subtrees. A cycle is reported, never silently broken.
 */
export function analyzeSchedule({ tasks }) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const memo = new Map();
  const visiting = new Set();
  const cycles = [];

  const depth = (id) => {
    if (memo.has(id)) return memo.get(id);
    if (visiting.has(id)) {
      cycles.push(id);
      return 0;
    }
    visiting.add(id);
    const dependencies = byId.get(id)?.dependencies ?? [];
    const value = 1 + Math.max(0, ...dependencies.filter((dependency) => byId.has(dependency)).map(depth));
    visiting.delete(id);
    memo.set(id, value);
    return value;
  };

  for (const task of tasks) depth(task.id);
  const longest = Math.max(0, ...[...memo.values()]);
  const criticalPath = tasks.filter((task) => memo.get(task.id) === longest).map((task) => task.id).sort(byCodepoint);
  const parallelizable = tasks.filter((task) => (task.dependencies ?? []).length === 0).map((task) => task.id).sort(byCodepoint);

  return {
    schema: "govibe-mode2-schedule/v1",
    governed_by: "ADR-028 D5 (proposed)",
    longest_chain_length: longest,
    critical_path: criticalPath,
    parallelizable_now: parallelizable,
    cycles: [...new Set(cycles)].sort(byCodepoint),
  };
}
