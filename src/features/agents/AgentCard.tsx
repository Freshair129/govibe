import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import type { AgentRecord } from "../../mission";
import type { DerivedAgentStats } from "./agentStats";

export function AgentCard({
  agent,
  stats,
  offset,
  active,
  onSelect,
  onTilt,
  onResetTilt,
}: {
  agent: AgentRecord;
  stats: DerivedAgentStats;
  offset: number;
  active: boolean;
  onSelect: () => void;
  onTilt: (event: PointerEvent<HTMLDivElement>) => void;
  onResetTilt: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  const role = agent.fleet?.jobTitleEquivalent ?? agent.role;
  const successLabel = stats.successRate != null ? `${Math.round(stats.successRate * 100)}%` : "—";

  // Curved-arc placement — mirrors UI Components/curve-carousel updateCarousel():
  // farther-from-center cards shift + shrink + fade, forming the arc.
  const absDiff = Math.abs(offset);
  const curveStyle = {
    "--agent-accent": agent.accent,
    transform: `translateY(calc(-50% + ${offset * 110}px)) translateX(${-absDiff * 14}px) scale(${Math.max(0.75, 1 - absDiff * 0.08)})`,
    opacity: Math.max(0, 1 - absDiff * 0.28),
    zIndex: 100 - absDiff,
    pointerEvents: absDiff <= 2 ? "auto" : "none",
  } as CSSProperties;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={active ? "agent-deck-card active" : "agent-deck-card"}
      data-offset={offset}
      aria-current={active ? "true" : undefined}
      aria-label={`Select agent ${agent.name}`}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      onPointerMove={onTilt}
      onPointerLeave={onResetTilt}
      style={curveStyle}
    >
      <span className="deck-shimmer" aria-hidden="true" />

      <span className="deck-avatar">{agent.name.slice(0, 2).toUpperCase()}</span>

      <div className="deck-info">
        <span className="deck-name" title={agent.name}>{agent.name}</span>
        <span className="deck-role" title={role}>{role}</span>
        <span className="deck-badges">
          <span className="deck-chip">{agent.defaultExecutor ?? agent.model}</span>
          {agent.modelTier ? <span className="deck-chip alt">{agent.modelTier}</span> : null}
        </span>
      </div>

      <div className="deck-aside">
        <span className="deck-status">
          <span className={`deck-status-dot ${agent.status}`} aria-hidden="true" />
          {agent.status}
        </span>
        <span className="deck-stat">
          {stats.taskCount} tasks{successLabel !== "—" ? ` · ${successLabel}` : ""}
        </span>
      </div>
    </div>
  );
}
