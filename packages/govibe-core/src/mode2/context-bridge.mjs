import { buildContextPacket } from "../context-packet.mjs";
import { sha256Json } from "../context-lineage.mjs";
import { byCodepoint } from "./stage-shared.mjs";

/**
 * Mode 2 → context packet bridge (implementation prompt §1 responsibility 7: "prepare bounded
 * context for humans and agents").
 *
 * This is the link between "GoVibe understands the workspace" and §32's "the executor is smarter
 * because it receives better structured meaning". It writes **no packet format of its own**: it
 * selects a bounded slice of the Mode 2 model and hands it to the existing `buildContextPacket`,
 * which keeps ownership of lineage, profile invariants, and hashing.
 *
 * Two constraints govern everything here:
 *
 * 1. `context_budget` is its own axis. It is not `H` (access scope), not `R` (retrieval radius),
 *    and not risk. A larger budget never widens permission.
 * 2. Mode 2 output is **candidate** knowledge. A packet must never present an unpromoted
 *    candidate as canonical — F4 promotion through MSP is what makes something canonical, and a
 *    packet is not a promotion.
 */

const BRIDGE_SCHEMA = "govibe-mode2-context-slice/v1";

/**
 * `characters` is a deterministic proxy for tokens, not a tokenizer. Declared as a unit so a
 * consumer cannot mistake the number for a token count.
 */
export const BUDGET_UNITS = Object.freeze(["characters", "items"]);

export const DEFAULT_CONTEXT_BUDGET = Object.freeze({ unit: "characters", max: 24000 });

function measure(entry, unit) {
  return unit === "items" ? 1 : JSON.stringify(entry).length;
}

/**
 * Mode 2 has no vault access and dispatches no turn, so `T-ctx` is the correct default: system
 * plus task/event context. The upstream builder additionally *forbids* private vault refs under
 * `T-ctx`, which is the behaviour we want — the scan must not reach into agent memory.
 */
export const DEFAULT_CONTEXT_PROFILE = "T-ctx";

function rankGap(finding) {
  const severityRank = { critical: 0, warning: 1, info: 2 }[finding.severity] ?? 3;
  return [severityRank, -(finding.evidence?.length ?? 0), finding.id];
}

function rankAtom(atom) {
  return [atom.explicit ? 0 : 1, -(atom.confidence ?? 0), atom.identity];
}

function compare(left, right) {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === b) continue;
    if (typeof a === "number" && typeof b === "number") return a - b;
    return byCodepoint(String(a), String(b));
  }
  return 0;
}

/**
 * Selects the highest-value slice of the Mode 2 model that fits the budget.
 *
 * Truncation is always reported. A packet that silently dropped half the findings would look
 * exactly like a workspace with half as many problems, so the slice carries its own
 * `projection_state` on the semantic-conservation scale.
 */
export function selectContextSlice({ ir, gapAnalysis, coverage, roadmap, views, focus = null, budget = DEFAULT_CONTEXT_BUDGET }) {
  if (!BUDGET_UNITS.includes(budget?.unit)) throw new TypeError(`Invalid context budget unit: ${budget?.unit}. Use ${BUDGET_UNITS.join(" or ")}.`);
  if (!Number.isFinite(budget.max) || budget.max <= 0) throw new TypeError("context_budget.max must be a positive number.");

  const focusPaths = focus?.paths ? new Set(focus.paths) : null;
  const matchesFocus = (item) => !focusPaths || (item.source && focusPaths.has(item.source)) || (item.evidence ?? []).some((entry) => focusPaths.has(entry));

  const candidateGaps = (gapAnalysis?.findings ?? []).filter(matchesFocus).sort((left, right) => compare(rankGap(left), rankGap(right)));
  const candidateAtoms = (ir?.atoms ?? []).filter(matchesFocus).sort((left, right) => compare(rankAtom(left), rankAtom(right)));
  const candidateTasks = (roadmap?.tasks ?? []).slice().sort((left, right) => byCodepoint(left.id, right.id));

  let spent = 0;
  const take = (items, project) => {
    const kept = [];
    let omitted = 0;
    for (const item of items) {
      const projected = project(item);
      const cost = measure(projected, budget.unit);
      if (spent + cost > budget.max) {
        omitted += 1;
        continue;
      }
      spent += cost;
      kept.push(projected);
    }
    return { kept, omitted };
  };

  // Coverage first: it is small and it frames everything else.
  const summary = {
    block_profile: coverage?.block_profile ?? null,
    coverage_ratio: coverage?.coverage_ratio ?? null,
    missing_dimensions: coverage?.missing ?? [],
    gap_total: gapAnalysis?.counts?.total ?? 0,
    atom_total: ir?.atoms?.length ?? 0,
    relation_total: ir?.relations?.length ?? 0,
  };
  spent += measure(summary, budget.unit);

  const gaps = take(candidateGaps, (finding) => ({
    id: finding.id,
    gap_class: finding.gap_class,
    subject: finding.subject,
    severity: finding.severity,
    why: finding.description,
    evidence: (finding.evidence ?? []).slice(0, 5),
    // Never presented as decided. §9 forbids auto-resolution and the packet must not imply it.
    resolution: finding.resolution,
  }));
  const tasks = take(candidateTasks, (task) => ({
    id: task.id,
    title: task.title,
    why: task.why,
    complexity: task.complexity,
    access_scope: task.access_scope,
    acceptance_criteria: task.acceptance_criteria,
    verification: task.verification,
    traces_to: task.traces_to,
  }));
  const atoms = take(candidateAtoms, (atom) => ({
    identity: atom.identity,
    type: atom.type,
    dimension: atom.dimension,
    source: atom.source,
    confidence: atom.confidence,
    inferred: atom.inferred,
  }));
  const viewRefs = take(views?.generated ?? [], (view) => ({
    view_id: view.view_id,
    catalog_id: view.catalog_id,
    projection_state: view.projection_state,
    derived_count: view.derived_count,
  }));

  const omitted = gaps.omitted + tasks.omitted + atoms.omitted + viewRefs.omitted;
  return {
    schema: BRIDGE_SCHEMA,
    // Nothing here is canonical. Promotion happens at F4 through MSP; a packet is not a promotion.
    canonical: false,
    promotion_state: "candidate",
    context_budget: { ...budget, spent, remaining: Math.max(0, budget.max - spent) },
    // Semantic conservation: a truncated slice says so rather than looking like a smaller problem.
    projection_state: omitted === 0 ? "EQUIVALENT" : "PARTIAL",
    omitted_count: omitted,
    omitted_note: omitted
      ? `${omitted} item(s) did not fit the ${budget.unit} budget and were dropped by rank, not by relevance to any specific question`
      : null,
    focus: focus ?? null,
    summary,
    gaps: gaps.kept,
    tasks: tasks.kept,
    atoms: atoms.kept,
    views: viewRefs.kept,
  };
}

/**
 * Builds a governed context packet from the Mode 2 model.
 *
 * `skill` is required and never synthesized: the packet contract demands a real skill reference
 * with a content hash, and fabricating one would put an unverifiable identity into a governed
 * lineage record.
 */
export function buildMode2ContextPacket({
  workspaceBinding,
  ir,
  gapAnalysis,
  coverage,
  roadmap,
  views,
  skill,
  objective,
  focus = null,
  budget = DEFAULT_CONTEXT_BUDGET,
  contextProfile = DEFAULT_CONTEXT_PROFILE,
  parentContextId = null,
  kvId = null,
  mContextInitial = false,
}) {
  if (!workspaceBinding?.workspace_id) throw new TypeError("A Mode 2 context packet requires a bound workspace.");
  if (!skill?.id || !skill?.contentHash) throw new TypeError("A context packet requires a real skill reference; one is never synthesized.");
  if (!objective) throw new TypeError("A context packet requires an objective.");

  const slice = selectContextSlice({ ir, gapAnalysis, coverage, roadmap, views, focus, budget });
  const sliceHash = sha256Json(slice);

  const projectState = {
    workspaceId: workspaceBinding.workspace_id,
    projectId: workspaceBinding.project_id ?? null,
    moduleScope: focus?.paths?.length ? "module" : "workspace",
    objective,
    constraints: [
      "Mode 2 findings are candidates, not canonical knowledge; do not treat them as decided.",
      "Do not auto-resolve a reported contradiction; every finding is for human review.",
      ...(slice.projection_state === "PARTIAL" ? [`Context is truncated: ${slice.omitted_count} item(s) omitted for budget.`] : []),
    ],
    // The workspace manifest is the required source of truth for a scan-derived packet.
    sourceRefs: [{ path: `${workspaceBinding.metadata_root}/workspace.json`, kind: "other", required: true }],
    fileRefs: [...new Set(slice.atoms.map((atom) => atom.source).filter(Boolean))].sort(byCodepoint).slice(0, 50),
    verificationExpectations: [...new Set(slice.tasks.flatMap((task) => task.verification ?? []))].sort(byCodepoint),
    criticalKnownIssues: slice.gaps.filter((gap) => gap.severity === "critical").map((gap) => `${gap.gap_class}: ${gap.subject}`),
  };

  const packet = buildContextPacket({
    projectState,
    skill,
    contextProfile,
    parentContextId,
    kvId,
    mContextInitial,
    context: {
      // Deliberately empty: Mode 2 has no vault access and must not reach into agent memory.
      // Under T-ctx the upstream builder rejects these outright, which is the behaviour we want.
      globalPrivateVaultRefs: [],
      workspacePrivateVaultRefs: [],
      // Mode 2 artefacts enter as task/event context, NOT as shared-vault knowledge. Placing
      // them in sharedVaultRefs would present unpromoted candidates as governed knowledge.
      sharedVaultRefs: [],
      taskEventRefs: [`mode2-slice:${sliceHash.slice(0, 24)}`],
      systemRefs: [`mode2-workspace:${workspaceBinding.workspace_id}`],
      contextBudget: slice.context_budget,
      policyDecisions: [
        { decision: "mode2_output_is_candidate", detail: "promotion happens at F4 through MSP; this packet is not a promotion" },
        { decision: "context_budget_is_its_own_axis", detail: "budget does not widen access scope H or retrieval radius R" },
      ],
      orderingVersion: "context-order/v1",
    },
  });

  return {
    ...packet,
    schema: "govibe-mode2-context-packet/v1",
    mode2: {
      slice_hash: sliceHash,
      canonical: false,
      promotion_state: "candidate",
      projection_state: slice.projection_state,
      context_budget: slice.context_budget,
      omitted_count: slice.omitted_count,
      omitted_note: slice.omitted_note,
      slice,
    },
  };
}
