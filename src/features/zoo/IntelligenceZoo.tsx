import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

export function IntelligenceZoo({ snapshot }: { snapshot: MissionSnapshot }) {
  const entries = [
    ...snapshot.agents.map((agent) => ({
      id: `agent-${agent.id}`,
      title: agent.name,
      body: agent.role,
      status: agent.status,
    })),
    ...snapshot.capabilities.map((capability) => ({
      id: `capability-${capability.id}`,
      title: capability.title,
      body: capability.description,
      status: capability.status,
    })),
  ];

  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Block DB" title="Intelligence Zoo" desc="Registered agents and MCP capabilities from the mission snapshot." />
      {entries.length > 0 ? (
        <section className="zoo-grid">
          {entries.map((item) => (
            <article className="panel zoo-card" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.status}</span>
              </div>
              <p>{item.body}</p>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState title="No intelligence records connected" body="Publish registered agents or MCP capability metadata before rendering the zoo." />
      )}
    </div>
  );
}
