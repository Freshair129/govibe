import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

export function GraphStudioView({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="view-stack">
      <div className="view-title-row">
        <ViewHeader eyebrow="Genesis Knowledge" title="Interactive Graph Studio" desc="2D graph workspace for relationship mapping." />
      </div>
      {snapshot.graph.nodes.length > 0 ? (
        <>
          <section className="panel graph-studio-canvas">
            {snapshot.graph.nodes.map((node, index) => (
              <span key={node.id} style={{ left: `${16 + index * 24}%`, top: `${32 + (index % 2) * 22}%` }}>{node.label}</span>
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
