import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

export function GraphView({ snapshot, title }: { snapshot: MissionSnapshot; title: string }) {
  const selected = snapshot.graph.nodes[0];
  const liveCallGraph = title === "Live Call Graph";

  return (
    <div className="view-stack">
      <div className="view-title-row">
        <ViewHeader eyebrow="Graph" title={title} desc="Graph nodes and edges are driven by gateway data." />
      </div>
      <div className={liveCallGraph ? "graph-layout" : ""}>
        <section className="panel graph-panel">
          {snapshot.graph.nodes.length === 0 ? <EmptyState title="No graph data" body="Publish graph.update to render the relationship map." /> : (
            <>
              {snapshot.graph.edges.map((edge) => <div className="edge-row" key={`${edge.source}-${edge.target}`}>{edge.source} {"->"} {edge.target}</div>)}
              <div className="node-cloud">
                {snapshot.graph.nodes.map((node) => <span key={node.id}>{node.label}</span>)}
              </div>
            </>
          )}
        </section>
        {liveCallGraph ? (
          <section className="panel graph-info">
            <h2>{selected?.label ?? "Select a node"}</h2>
            <div className="kv-row"><span>Nodes</span><strong>{snapshot.graph.nodes.length}</strong></div>
            <div className="kv-row"><span>Edges</span><strong>{snapshot.graph.edges.length}</strong></div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
