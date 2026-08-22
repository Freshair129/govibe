import type { MissionSnapshot } from "../../mission";

// TASK-PRD-007 (F2): snapshot.graph.edges only carries {source, target} node ids -- byte-offset
// symbol ids like `symbol:packages/govibe-core/src/approval-record.mjs:3509`, not names. The
// node list already carries a human `label` for every id; this resolves edges to those labels
// so the UI never has to show a raw id when a label is available. When an endpoint has no
// matching node (an edge referencing an id outside the currently-published node set), the raw
// id is kept as the fallback and the row is flagged unresolved rather than silently hidden.

export type ResolvedEdge = {
  key: string;
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
  sourceResolved: boolean;
  targetResolved: boolean;
};

export function resolveEdgeLabels(
  nodes: MissionSnapshot["graph"]["nodes"],
  edges: MissionSnapshot["graph"]["edges"],
): ResolvedEdge[] {
  const labelById = new Map(nodes.map((node) => [node.id, node.label]));

  return edges.map((edge, index) => {
    const sourceLabel = labelById.get(edge.source);
    const targetLabel = labelById.get(edge.target);
    return {
      key: `${edge.source}->${edge.target}#${index}`,
      sourceId: edge.source,
      targetId: edge.target,
      sourceLabel: sourceLabel ?? edge.source,
      targetLabel: targetLabel ?? edge.target,
      sourceResolved: sourceLabel !== undefined,
      targetResolved: targetLabel !== undefined,
    };
  });
}
