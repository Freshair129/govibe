import { byCodepoint } from "./stage-shared.mjs";

/**
 * View router and projections (architecture §4, prompt §13).
 *
 * A view is a **projection**. It is never canonical semantic truth, and regenerating one must
 * not create a new identity. Every view therefore carries `derived_from` back-references to the
 * semantic entities that produced it, so no generated diagram becomes an independent truth
 * island, and a stable `view_id` derived from its inputs rather than from generation time.
 */

const VIEW_SCHEMA = "govibe-mode2-view/v1";

/** The supported projection catalog. Only the five recommended for Phase 1 are implemented. */
export const VIEW_CATALOG = Object.freeze([
  { id: "01-c4-system-context", title: "C4 System Context", implemented: false, tranche: "T5" },
  { id: "02-c4-container", title: "C4 Container", implemented: true, tranche: "T4" },
  { id: "03-c4-component", title: "C4 Component", implemented: false, tranche: "T5" },
  { id: "04-erd", title: "ER Diagram", implemented: true, tranche: "T4" },
  { id: "05-sequence", title: "Sequence Diagram", implemented: true, tranche: "T4" },
  { id: "06-activity", title: "Activity / Process Flow", implemented: false, tranche: "T5" },
  { id: "07-state-machine", title: "State Machine", implemented: true, tranche: "T4" },
  { id: "08-data-flow", title: "Data Flow Diagram", implemented: false, tranche: "T5" },
  { id: "09-deployment", title: "Deployment Diagram", implemented: false, tranche: "T5" },
  { id: "10-ddd", title: "Domain / DDD View", implemented: false, tranche: "T5" },
  { id: "11-decision", title: "Decision / DMN-style View", implemented: false, tranche: "T5" },
  { id: "12-security", title: "Security / Trust Boundary View", implemented: false, tranche: "T5" },
  { id: "13-traceability", title: "Traceability / Requirement-to-Code View", implemented: true, tranche: "T4" },
]);

/**
 * Routing is by **semantic impact**, not by "generate everything". A view with no semantic
 * entity behind it is not produced at all — an empty diagram is worse than an absent one,
 * because it looks like an answer.
 */
const ROUTING_RULES = [
  { signal: "data_changed", view: "04-erd", test: (ir) => hasDimension(ir, "data") },
  { signal: "cross_module_interaction", view: "05-sequence", test: (ir) => (ir?.relations ?? []).some((relation) => relation.rel === "IMPORTS") },
  { signal: "architecture_boundary_changed", view: "02-c4-container", test: (ir) => hasDimension(ir, "structure") },
  { signal: "stateful_behavior", view: "07-state-machine", test: (ir) => hasDimension(ir, "state") },
  { signal: "traceability_required", view: "13-traceability", test: (ir, context) => Boolean(context?.intendedModel) },
];

function hasDimension(ir, dimension) {
  return (ir?.atoms ?? []).some((atom) => atom.dimension === dimension);
}

function stableViewId(viewId, derivedFrom) {
  // Derived from inputs, never from generation time: regenerating an unchanged model must
  // yield the same view identity (AC-V3).
  let hash = 0;
  for (const character of `${viewId}|${derivedFrom.join(",")}`) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return `mode2-view:${viewId}:${hash.toString(16).padStart(8, "0")}`;
}

function mermaidSafe(value) {
  return String(value ?? "").replace(/["\n\r]/g, " ").replace(/[[\]{}()]/g, "").slice(0, 60);
}

function projection({ viewId, title, mermaid, derivedFrom, fidelity, lossNote, unresolved = [] }) {
  return {
    schema: VIEW_SCHEMA,
    view_id: stableViewId(viewId, derivedFrom),
    catalog_id: viewId,
    title,
    // A projection, never canonical. Regeneration reuses this identity.
    canonical: false,
    projection_state: fidelity,
    loss_note: lossNote ?? null,
    // Back-references: this view exists because of these entities and cannot outlive them.
    derived_from: derivedFrom.slice().sort(byCodepoint),
    derived_count: derivedFrom.length,
    unresolved,
    format: "mermaid",
    body: mermaid,
  };
}

function c4Container(ir) {
  const packages = new Map();
  for (const atom of (ir.atoms ?? []).filter((item) => item.dimension === "structure" && item.source)) {
    const container = atom.source.split("/").slice(0, 2).join("/") || atom.source;
    if (!packages.has(container)) packages.set(container, []);
    packages.get(container).push(atom.identity);
  }
  const containers = [...packages.keys()].sort(byCodepoint).slice(0, 40);
  const edges = new Set();
  for (const relation of (ir.relations ?? []).filter((item) => item.rel === "IMPORTS")) {
    const from = relation.from?.replace("mode2-module:", "").split("/").slice(0, 2).join("/");
    const to = relation.to?.replace("mode2-module:", "").split("/").slice(0, 2).join("/");
    if (from && to && from !== to && containers.includes(from) && containers.includes(to)) edges.add(`${from}|${to}`);
  }
  const alias = new Map(containers.map((container, index) => [container, `C${index}`]));
  const lines = ["graph TD"];
  for (const container of containers) lines.push(`  ${alias.get(container)}["${mermaidSafe(container)}"]`);
  for (const edge of [...edges].sort(byCodepoint)) {
    const [from, to] = edge.split("|");
    lines.push(`  ${alias.get(from)} --> ${alias.get(to)}`);
  }
  const truncated = packages.size > containers.length;
  return projection({
    viewId: "02-c4-container",
    title: "C4 Container",
    mermaid: lines.join("\n"),
    derivedFrom: [...packages.values()].flat(),
    // Grouping modules into containers by path prefix loses module-level structure, and the
    // catalogue is capped, so this is explicitly not an EXACT projection.
    fidelity: truncated ? "PARTIAL" : "APPROXIMATE",
    lossNote: truncated
      ? `containers grouped by two-segment path prefix; ${packages.size - containers.length} container(s) omitted beyond the 40-node cap`
      : "containers grouped by two-segment path prefix; module-level structure is not represented",
  });
}

function erd(ir, dataModel) {
  const entities = dataModel?.entities ?? [];
  if (!entities.length) return null;
  const lines = ["erDiagram"];
  for (const relation of dataModel.relations ?? []) {
    const from = relation.from?.replace("mode2-entity:", "");
    const to = relation.to?.replace("mode2-entity:", "");
    if (from && to) lines.push(`  ${mermaidSafe(from)} ||--o{ ${mermaidSafe(to)} : "${mermaidSafe(relation.via ?? "references")}"`);
  }
  for (const entity of entities.slice(0, 30)) {
    lines.push(`  ${mermaidSafe(entity.name)} {`);
    for (const field of (entity.fields ?? []).slice(0, 12)) {
      lines.push(`    ${mermaidSafe(field.type).replace(/\W/g, "_") || "unknown"} ${mermaidSafe(field.name)}${field.primary_key ? " PK" : field.unique ? " UK" : ""}`);
    }
    lines.push("  }");
  }
  const truncated = entities.length > 30 || entities.some((entity) => (entity.fields ?? []).length > 12);
  return projection({
    viewId: "04-erd",
    title: "ER Diagram",
    mermaid: lines.join("\n"),
    derivedFrom: entities.map((entity) => entity.id),
    fidelity: truncated ? "PARTIAL" : "EQUIVALENT",
    lossNote: truncated ? "entity or field list truncated for legibility" : null,
  });
}

function sequence(ir) {
  const entrypoints = (ir.atoms ?? []).filter((atom) => atom.dimension === "behavior" && atom.properties?.target);
  if (!entrypoints.length) return null;
  const adjacency = new Map();
  for (const relation of (ir.relations ?? []).filter((item) => item.rel === "IMPORTS")) {
    if (!adjacency.has(relation.from)) adjacency.set(relation.from, []);
    adjacency.get(relation.from).push(relation.to);
  }
  const lines = ["sequenceDiagram"];
  const used = [];
  let steps = 0;
  for (const entry of entrypoints.slice(0, 3)) {
    const rootId = `mode2-module:${entry.properties.target}`;
    lines.push(`  participant E${used.length} as ${mermaidSafe(entry.properties.target)}`);
    used.push(entry.identity);
    const queue = [{ node: rootId, depth: 0 }];
    const seen = new Set([rootId]);
    while (queue.length && steps < 25) {
      const current = queue.shift();
      if (current.depth >= 3) continue;
      for (const next of (adjacency.get(current.node) ?? []).slice(0, 4)) {
        if (seen.has(next)) continue;
        seen.add(next);
        lines.push(`  ${mermaidSafe(current.node.replace("mode2-module:", ""))} ->> ${mermaidSafe(next.replace("mode2-module:", ""))}: imports`);
        queue.push({ node: next, depth: current.depth + 1 });
        steps += 1;
      }
    }
  }
  return projection({
    viewId: "05-sequence",
    title: "Sequence Diagram",
    mermaid: lines.join("\n"),
    derivedFrom: used,
    // Module imports are not call ordering. Stage 3 emits no call edges, so the ordering shown
    // is structural reachability, not an execution trace. Claiming EXACT here would be a lie.
    fidelity: "APPROXIMATE",
    lossNote: "edges are module imports traversed breadth-first, not observed call ordering; Stage 3 emits no call edges",
    unresolved: [{ kind: "call-ordering-not-observed", detail: "a true sequence needs a call graph" }],
  });
}

function stateMachine(ir, stateModel) {
  const shapes = stateModel?.state_shapes ?? [];
  if (!shapes.length) return null;
  const lines = ["stateDiagram-v2"];
  const used = [];
  for (const shape of shapes.slice(0, 8)) {
    lines.push(`  state ${mermaidSafe(shape.name).replace(/\W/g, "_")} {`);
    for (const value of (shape.values ?? []).slice(0, 12)) lines.push(`    ${mermaidSafe(value).replace(/\W/g, "_")}`);
    lines.push("  }");
    used.push(shape.id);
  }
  return projection({
    viewId: "07-state-machine",
    title: "State Machine",
    mermaid: lines.join("\n"),
    derivedFrom: used,
    // States are recovered; the transitions between them are not. Rendering guessed arrows
    // would invent behaviour, so the projection shows states only and says so.
    fidelity: "PARTIAL",
    lossNote: "states are recovered from enums and string unions; transitions between them are not observable deterministically and are omitted rather than invented",
    unresolved: [{ kind: "state-transitions-not-recovered", detail: "requires guard and assignment analysis" }],
  });
}

function traceability(ir, intendedModel, verificationModel) {
  const requirements = intendedModel?.requirement_index ?? [];
  if (!requirements.length) return null;
  const explicit = new Map();
  for (const link of verificationModel?.resolvedAnnotationLinks ?? []) {
    const target = link.to?.replace(/^mode2-intent:(requirement|decision):/, "");
    if (!explicit.has(target)) explicit.set(target, []);
    explicit.get(target).push(link.from?.replace("mode2-module:", ""));
  }
  const lines = ["graph LR"];
  let linked = 0;
  for (const [index, requirement] of requirements.slice(0, 40).entries()) {
    lines.push(`  R${index}["${mermaidSafe(requirement.id)}"]`);
    for (const [target, sources] of explicit) {
      if (target !== requirement.id) continue;
      for (const source of sources.slice(0, 3)) {
        lines.push(`  R${index} --> ${mermaidSafe(source).replace(/\W/g, "_")}`);
        linked += 1;
      }
    }
  }
  const unlinked = requirements.length - explicit.size;
  return projection({
    viewId: "13-traceability",
    title: "Traceability / Requirement-to-Code",
    mermaid: lines.join("\n"),
    derivedFrom: requirements.map((requirement) => `mode2-intent:requirement:${requirement.id}`),
    fidelity: linked === 0 ? "UNRESOLVED" : unlinked > 0 ? "PARTIAL" : "EXACT",
    lossNote: unlinked > 0 ? `${unlinked} requirement(s) have no code claiming them` : null,
    unresolved: unlinked > 0 ? [{ kind: "requirement-without-implementation-link", count: unlinked }] : [],
  });
}

/**
 * Routes and generates. `requested` overrides routing; otherwise only views whose semantic
 * signal is actually present are produced.
 */
export function generateViews({ ir, dataModel, stateModel, intendedModel, verificationModel, requested = null }) {
  const context = { intendedModel };
  const routed = ROUTING_RULES.filter((rule) => rule.test(ir, context));
  const selected = requested ?? routed.map((rule) => rule.view);

  const builders = {
    "02-c4-container": () => c4Container(ir),
    "04-erd": () => erd(ir, dataModel),
    "05-sequence": () => sequence(ir),
    "07-state-machine": () => stateMachine(ir, stateModel),
    "13-traceability": () => traceability(ir, intendedModel, verificationModel),
  };

  const views = [];
  const skipped = [];
  for (const viewId of selected) {
    const builder = builders[viewId];
    if (!builder) {
      skipped.push({ view: viewId, reason: "not implemented in this tranche" });
      continue;
    }
    const view = builder();
    if (!view) {
      skipped.push({ view: viewId, reason: "no semantic entity behind this view; an empty diagram would look like an answer" });
      continue;
    }
    views.push(view);
  }

  return {
    schema: "govibe-mode2-view-set/v1",
    canonical: false,
    routing: routed.map((rule) => ({ signal: rule.signal, view: rule.view })),
    catalog: VIEW_CATALOG,
    generated: views.sort((left, right) => byCodepoint(left.catalog_id, right.catalog_id)),
    skipped: skipped.sort((left, right) => byCodepoint(left.view, right.view)),
    projection_states: Object.fromEntries(views.map((view) => [view.catalog_id, view.projection_state])),
    // Every view derives from one model. None is a second truth.
    invariant: "views are projections of one semantic model; regeneration reuses view_id and mints no canonical identity",
  };
}
