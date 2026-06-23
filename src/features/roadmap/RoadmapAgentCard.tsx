import "./RoadmapAgentCard.css";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { AgentRecord, AgentUsageWindow } from "../../mission";
import type { RoadmapAgentStats } from "./roadmapSelectors";

type RoadmapAgentCardProps = {
  agent: AgentRecord;
  /** Live, roadmap-derived rollup (task count + QA success rate). Omitted → honest "—". */
  stats?: RoadmapAgentStats;
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

/** Plan-quota meter — rendered only when a real usage window is present (live-data-only). */
function UsageMeter({ label, window }: { label: string; window: AgentUsageWindow }) {
  const pct = window.limit > 0 ? Math.min(100, Math.round((window.used / window.limit) * 100)) : 0;
  const tone = pct >= 90 ? "danger" : pct >= 70 ? "warn" : "ok";
  return (
    <div className="rac-usage-row" title={`${label}: ${window.used} / ${window.limit}`}>
      <span className="rac-usage-label">{label}</span>
      <span className="rac-usage-track">
        <i className="rac-usage-fill" data-tone={tone} style={{ width: `${pct}%` }} />
      </span>
      <span className="rac-usage-value">{window.used}/{window.limit}</span>
    </div>
  );
}

export function RoadmapAgentCard({ agent, stats, dragging, onPointerDown, onPointerMove, onPointerLeave }: RoadmapAgentCardProps) {
  const accent = agent.accent ?? "#10b981";

  // Live stats (real, from the approved roadmap snapshot); honest "—" when no data.
  const taskCount = stats ? String(stats.taskCount) : "—";
  const doneCount = stats ? String(stats.doneCount) : "—";
  const successRate = stats && stats.successRate !== null ? `${stats.successRate}%` : "—";

  // Default / recommended model route from the registry execution policy (real).
  const modelRoute = [agent.defaultExecutor, agent.modelTier].filter(Boolean).join(" · ")
    || (agent.model && agent.model !== "Registry-defined" ? agent.model : "—");

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
      <span className="rac-shimmer" aria-hidden="true" />

      {/* Status badge — top-right, color follows status */}
      <span className="rac-status-badge" data-status={agent.status} title={`Status: ${agent.status}`}>
        {agent.status}
      </span>

      <div className="registry-agent-head">
        <div className="agent-orb" style={{ "--agent-accent": accent } as CSSProperties}>
          {agent.avatarUrl ? <img src={agent.avatarUrl} alt="" /> : agent.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="rac-name-block">
          <strong>{agent.name}</strong>
          <span className="rac-role">{agent.role}</span>
          <span className="rac-model-subtitle" title="Default model / executor route">{modelRoute}</span>
        </div>
      </div>

      {/* Responsibility badges — only rendered when fleet.responsibility has entries */}
      <ResponsibilityBadges items={agent.fleet?.responsibility} />

      {/* Live stats: Task count / Done / QA success rate */}
      <div className="rac-stats">
        <div><span>Tasks</span><strong>{taskCount}</strong></div>
        <div><span>Done</span><strong>{doneCount}</strong></div>
        <div><span>Success</span><strong>{successRate}</strong></div>
      </div>

      {/* Plan usage (5h + weekly) — rendered only when a real quota feed populates agent.usage */}
      {agent.usage ? (
        <div className="rac-usage">
          {agent.usage.planType ? <span className="rac-usage-plan">{agent.usage.planType}</span> : null}
          {agent.usage.fiveHour ? <UsageMeter label="5h" window={agent.usage.fiveHour} /> : null}
          {agent.usage.weekly ? <UsageMeter label="Weekly" window={agent.usage.weekly} /> : null}
        </div>
      ) : null}

      {/* Configure affordance — visual placeholder, no behavior wired */}
      <div className="rac-footer">
        <button type="button" className="rac-configure-btn" tabIndex={-1}>
          Configure
        </button>
      </div>
    </article>
  );
}
