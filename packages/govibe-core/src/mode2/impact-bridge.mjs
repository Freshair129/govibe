import { byCodepoint } from "./stage-shared.mjs";
import { DEFAULT_RETRIEVAL_RADIUS } from "./coverage.mjs";

/**
 * Mode 2 → existing impact engine bridge.
 *
 * `TASK-M2-018` requires extending `govibe.workspace.impact` rather than duplicating it, and
 * `CURRENT-AS-BUILT` §3 records that `govibe.workspace.impact` already owns the responsibility a
 * second `govibe.impact.analyze` would duplicate.
 *
 * So this module writes **no traversal of its own**. It converts Mode 2 relations into the
 * link-graph shape `calculateWorkspaceImpact` already consumes, and hands them to that engine —
 * which keeps its relation weights, distance decay, scoring, `required_action` thresholds, and
 * chain explanations. Reimplementing any of that here would fork the semantics of impact.
 */

/** Mode 2 relation names mapped onto the weights the impact engine already defines. */
const RELATION_MAP = {
  IMPORTS: "imports",
  DEPENDS_ON: "imports",
  REFERENCES: "references",
  EXERCISES: "validates",
  TESTED_BY: "validates",
  IMPLEMENTS: "implements",
  FOLLOWS: "governed_by",
};

function toPath(nodeId) {
  if (typeof nodeId !== "string") return null;
  const match = nodeId.match(/^mode2-(?:module|atom):(.+)$/);
  return match ? match[1] : null;
}

/**
 * Builds the `govibe-link-graph/v1` shape from a Mode 2 IR. Relations whose endpoints are not
 * workspace paths — package nodes, intent identifiers — are dropped and counted, because the
 * impact engine's seeds are paths and a package node has no file to traverse from.
 */
export function toLinkGraph({ ir }) {
  const edges = [];
  let unmapped = 0;
  for (const relation of ir?.relations ?? []) {
    const from = toPath(relation.from);
    const to = toPath(relation.to);
    const mapped = RELATION_MAP[relation.rel];
    if (!from || !to || !mapped) {
      unmapped += 1;
      continue;
    }
    edges.push({
      id: relation.identity,
      from,
      to,
      relation: mapped,
      confidence: typeof relation.confidence === "number" ? relation.confidence : 1,
    });
  }

  const paths = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  for (const atom of ir?.atoms ?? []) if (atom.source) paths.add(atom.source);

  const incoming = new Map();
  const outgoing = new Map();
  for (const edge of edges) {
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    incoming.get(edge.to).push(edge);
    outgoing.get(edge.from).push(edge);
  }

  return {
    schema: "govibe-link-graph/v1",
    source: "mode2-candidate-semantic-ir",
    nodes: [...paths].sort(byCodepoint).map((candidate) => ({ id: `file:${candidate}`, path: candidate, doc_id: null })),
    edges,
    backlinks: Object.fromEntries(
      [...incoming].map(([target, targetEdges]) => [target, targetEdges.map((edge) => ({ source: edge.from, relation: edge.relation, link_id: edge.id }))]),
    ),
    unresolved: unmapped ? [{ source: null, label: `${unmapped} relation(s)`, relation: "unmapped", reason: "endpoint is not a workspace path or relation has no impact weight" }] : [],
    incoming,
    outgoing,
  };
}

/**
 * Runs impact analysis over the Mode 2 model using the existing engine.
 *
 * `calculateWorkspaceImpact` is injected rather than imported so this module cannot drift into
 * owning traversal: the caller supplies the engine, and this bridge only supplies the graph.
 *
 * `maxDistance` defaults from the `R` axis (`R3`, ADR-028 D6 — proposed). Graph distance is `R`;
 * it is not `H`, not a budget, and not risk.
 */
export async function analyzeMode2Impact({ ir, paths, changeType = "semantic_change", retrievalRadius = DEFAULT_RETRIEVAL_RADIUS, calculateWorkspaceImpact, minimumScore = 0.2 }) {
  if (typeof calculateWorkspaceImpact !== "function") {
    throw new Error("analyzeMode2Impact requires the existing calculateWorkspaceImpact engine; it does not implement traversal.");
  }
  const radius = Number.parseInt(String(retrievalRadius).replace(/^R/i, ""), 10);
  if (!Number.isInteger(radius) || radius < 0 || radius > 6) {
    throw new Error(`Invalid retrieval radius: ${retrievalRadius}. Use R0..R6.`);
  }

  const graph = toLinkGraph({ ir });
  const result = await calculateWorkspaceImpact({ graph, paths, changeType, maxDistance: radius, minimumScore });
  return {
    ...result,
    schema: "govibe-mode2-impact/v1",
    engine: "packages/govibe-core/src/impact/impact-engine.mjs (extended, not duplicated)",
    retrieval_radius: `R${radius}`,
    graph_source: "mode2-candidate-semantic-ir",
    graph_summary: { nodes: graph.nodes.length, links: graph.edges.length, unmapped_relations: graph.unresolved.length },
  };
}
