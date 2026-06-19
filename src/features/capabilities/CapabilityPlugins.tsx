import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

export function CapabilityPlugins({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Capabilities" title="Capability Plugins" desc="Read-only capability records declared by the current MCP registry." />
      <section className="plugin-grid">
        {snapshot.capabilities.length > 0 ? snapshot.capabilities.map((capability) => (
          <article className="panel plugin-card" key={capability.id}>
            <div><span>{capability.status}</span><strong>{capability.title}</strong></div>
            <p>{capability.description}</p>
            <small>{capability.sourcePath}</small>
          </article>
        )) : (
          <EmptyState title="No capability registry connected" body="The mission runtime has not published MCP capability metadata." />
        )}
      </section>
    </div>
  );
}
