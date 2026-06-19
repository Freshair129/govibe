import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

export function HnswVectorView({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Vector Index" title="HNSW Vector Space Map" desc="C5 is separated from ERD so vector topology can evolve independently." />
      {snapshot.graph.nodes.length === 0 ? (
        <EmptyState title="No vector map" body="Publish vector nodes through graph.update or a future vector event to render this map." />
      ) : (
        <div className="hnsw-layout">
          <section className="panel vector-panel">
            <div className="vector-title-row">
              <h2>Vector Nodes</h2>
              <span>Live graph data</span>
            </div>
            <div className="node-cloud">
              {snapshot.graph.nodes.map((node) => <span key={node.id}>{node.label}</span>)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
