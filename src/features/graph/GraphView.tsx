import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";
import { resolveEdgeLabels } from "./edge-labels";

// TASK-PRD-007 (F2): this was titled "Live Call Graph" and rendered raw node ids
// ("symbol:packages/govibe-core/src/approval-record.mjs:3509 -> symbol:...:1350"), but
// snapshot.graph.edges is the union of WIKILINK/REFERENCES/IMPORTS/CALLS/INHERITS with relation
// type dropped at publish time -- so it isn't a call graph, and the {source, target} contract
// has no relation field to recover client-side. `showSummaryPanel` replaces the old
// `title === "Live Call Graph"` string comparison, which would have silently broken this
// layout switch the moment the title text changed.
export function GraphView({ snapshot, title, desc, showSummaryPanel = false }: { snapshot: MissionSnapshot; title: string; desc?: string; showSummaryPanel?: boolean }) {
  const nodes = snapshot.graph.nodes;
  const edges = resolveEdgeLabels(nodes, snapshot.graph.edges);
  const selected = nodes[0];
  const unresolvedCount = edges.filter((edge) => !edge.sourceResolved || !edge.targetResolved).length;

  return (
    <div className="view-stack">
      <div className="view-title-row">
        <ViewHeader eyebrow="Graph" title={title} desc={desc ?? "Cross-reference edges observed by Deep Scan, rendered by node label."} />
      </div>
      <div className={showSummaryPanel ? "graph-layout" : ""}>
        <section className="panel graph-panel">
          {nodes.length === 0 ? <EmptyState title="No graph data" body="Publish graph.update to render the relationship map." /> : (
            <>
              {unresolvedCount > 0 ? (
                <p className="view-note">
                  {unresolvedCount.toLocaleString()} of {edges.length.toLocaleString()} edges reference an id outside the
                  currently-published node set -- shown by raw id below instead of a label.
                </p>
              ) : null}
              {edges.map((edge) => (
                <div className="edge-row" key={edge.key}>
                  {edge.sourceLabel} {"->"} {edge.targetLabel}
                </div>
              ))}
              <div className="node-cloud">
                {nodes.map((node) => <span key={node.id}>{node.label}</span>)}
              </div>
            </>
          )}
        </section>
        {showSummaryPanel ? (
          <section className="panel graph-info">
            <h2>{selected?.label ?? "Select a node"}</h2>
            <div className="kv-row"><span>Nodes</span><strong>{nodes.length}</strong></div>
            <div className="kv-row"><span>Edges</span><strong>{snapshot.graph.edges.length}</strong></div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
