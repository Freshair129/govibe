import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

// TASK-PRD-007 (D3): this view has no embeddings, no HNSW index, and no vector space anywhere in
// this system -- it renders the same observed-candidate node set as the other graph views (file
// paths discovered by a Deep Scan, packages/govibe-core/src/scan/). It never claimed a capability
// this system doesn't have on purpose; retitled to describe what it actually shows.
export function HnswVectorView({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Deep Scan" title="Observed Candidate Map" desc="C5 is separated from ERD so this candidate layout can evolve independently." />
      {snapshot.graph.nodes.length === 0 ? (
        <EmptyState title="No observed candidates" body="Publish nodes through graph.update, or run a deep scan, to render this map." />
      ) : (
        <div className="hnsw-layout">
          <section className="panel vector-panel">
            <div className="vector-title-row">
              <h2>Observed Nodes</h2>
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
