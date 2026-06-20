import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

export function AstTreeView({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Genesis Knowledge" title="AST Tree & Preview" desc="Tree explorer renders only graph nodes received through the mission snapshot." />
      {snapshot.graph.nodes.length > 0 ? (
        <section className="panel ast-canvas">
          {snapshot.graph.nodes.map((node, index) => (
            <div className="ast-node" key={node.id} style={{ left: `${12 + (index % 2) * 34}%`, top: `${24 + index * 12}%` }}>
              <strong>{node.label}</strong>
              <span>Live node</span>
            </div>
          ))}
        </section>
      ) : (
        <EmptyState
          title="No AST graph connected"
          body="Publish graph.update events before rendering AST hierarchy data. Template source snippets are not used as live state."
        />
      )}
    </div>
  );
}
