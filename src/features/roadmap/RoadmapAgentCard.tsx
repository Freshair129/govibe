import "./RoadmapAgentCard.css";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { AgentRecord } from "../../mission";

type RoadmapAgentCardProps = {
  agent: AgentRecord;
  dragging?: boolean;
  onPointerDown?: (event: ReactPointerEvent<HTMLElement>, agent: AgentRecord) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLElement>, agent: AgentRecord) => void;
  onPointerLeave?: (event: ReactPointerEvent<HTMLElement>, agent: AgentRecord) => void;
};

/** Render up to `max` responsibility badges from fleet metadata. */
function ResponsibilityBadges({ items, max = 3 }: { items: string[] | undefined; max?: number }) {
  if (!items || items.length === 0) return null;
  const visible = items.slice(0, max);
  return (
    <div className="rac-badges">
      {visible.map((label) => (
        <span key={label} className="rac-badge" title={label}>
          {label}
        </span>
      ))}
    </div>
  );
}

export function RoadmapAgentCard({ agent, dragging, onPointerDown, onPointerMove, onPointerLeave }: RoadmapAgentCardProps) {
  const accent = agent.accent ?? "#10b981";

  const tasks = agent.tasks || "—";
  const accuracy = agent.accuracy || "—";
  const speed = agent.speed || "—";

  return (
    <article
      className={dragging ? "registry-agent-card compact raycast-perspective-container raycast-agent-card is-dragging" : "registry-agent-card compact raycast-perspective-container raycast-agent-card"}
      data-agent={agent.id}
      style={
        {
          "--agent-accent": accent,
          "--tilt-x": "0deg",
          "--tilt-y": "0deg",
          "--mouse-x": "50%",
          "--mouse-y": "50%",
        } as CSSProperties
      }
      onPointerDown={(event) => onPointerDown?.(event, agent)}
      onPointerMove={(event) => onPointerMove?.(event, agent)}
      onPointerLeave={(event) => onPointerLeave?.(event, agent)}
    >
      <span className="card-shine" aria-hidden="true" />
      <span className="card-glare" aria-hidden="true" />

      <div className="registry-agent-head">
        <div className="agent-orb" style={{ "--agent-accent": agent.accent ?? "#10b981" } as CSSProperties}>
          {agent.avatarUrl ? <img src={agent.avatarUrl} alt="" /> : agent.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="rac-name-block">
          <strong>{agent.name}</strong>
          <span className="rac-role">{agent.role}</span>
          <span className="rac-model-subtitle">{agent.model}</span>
        </div>
        <em>{agent.status}</em>
      </div>

      {/* Responsibility badges — only rendered when fleet.responsibility has entries */}
      <ResponsibilityBadges items={agent.fleet?.responsibility} />

      {/* Stats: Tasks / Accuracy / Speed */}
      <div className="rac-stats">
        <div><span>Tasks</span><strong>{tasks}</strong></div>
        <div><span>Accuracy</span><strong>{accuracy}</strong></div>
        <div><span>Speed</span><strong>{speed}</strong></div>
      </div>

      {/* Configure affordance — visual placeholder, no behavior wired */}
      <div className="rac-footer">
        <button type="button" className="rac-configure-btn" tabIndex={-1}>
          Configure
        </button>
      </div>
    </article>
  );
}
