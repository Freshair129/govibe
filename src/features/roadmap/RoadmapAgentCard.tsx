import type { CSSProperties } from "react";
import type { AgentRecord } from "../../mission";

export function RoadmapAgentCard({ agent }: { agent: AgentRecord }) {
  return (
    <article className="registry-agent-card compact">
      <div className="registry-agent-head">
        <div className="agent-orb" style={{ "--agent-accent": agent.accent ?? "#10b981" } as CSSProperties}>
          {agent.avatarUrl ? <img src={agent.avatarUrl} alt="" /> : agent.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <strong>{agent.name}</strong>
          <span>{agent.role}</span>
        </div>
        <em>{agent.status}</em>
      </div>
      <div className="registry-agent-stats">
        <div><span>Tasks</span><strong>{agent.tasks}</strong></div>
        <div><span>Model</span><strong>{agent.model}</strong></div>
      </div>
    </article>
  );
}
