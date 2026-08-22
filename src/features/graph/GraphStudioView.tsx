import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";
import { selectBoundedNodes } from "./bounded-nodes";

// TASK-PRD-007 (F1): this canvas previously positioned every node at
// `left: 16 + index * 24%` inside an `overflow: hidden` panel, which visually clips to ~4 items
// while the rest mount invisibly. There is no node-position event in the published contract
// (see the follow-up note below), so instead of inventing a layout this renders an explicitly
// bounded, honestly-labelled subset.
const GRAPH_STUDIO_NODE_LIMIT = 300;

export function GraphStudioView({ snapshot }: { snapshot: MissionSnapshot }) {
  const { shown, total, truncated } = selectBoundedNodes(snapshot.graph.nodes, GRAPH_STUDIO_NODE_LIMIT);

  return (
    <div className="view-stack">
      <div className="view-title-row">
        <ViewHeader eyebrow="Genesis Knowledge" title="Interactive Graph Studio" desc="2D graph workspace for relationship mapping." />
      </div>
      {total > 0 ? (
        <>
          {truncated ? (
            <p className="view-note">
              Showing {shown.length.toLocaleString()} of {total.toLocaleString()} observed nodes -- the rest are not rendered
              (not silently clipped, they are simply excluded from this view).
            </p>
          ) : null}
          <section className="panel graph-studio-canvas">
            {shown.map((node) => (
              <span key={node.id}>{node.label}</span>
            ))}
          </section>
          <p className="view-note">Click and drag behavior is a follow-up once node position events are defined.</p>
        </>
      ) : (
        <EmptyState
          title="No graph nodes connected"
          body="Publish graph.update events before opening Graph Studio. Placeholder nodes are not used as live state."
        />
      )}
    </div>
  );
}
