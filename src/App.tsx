import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent } from "react";
import {
  defaultViewByDomain,
  missionDomains,
  missionGateway,
  type AgentRecord,
  type DomainId,
  type MissionCommand,
  type MissionSnapshot,
  type RoadmapSnapshot,
  type ThemeMode,
  type ViewId,
  type WorkflowTaskNode,
} from "./mission";
import { downloadRoadmapExport as triggerRoadmapExport } from "./roadmapExport";

const domainOrder = Object.values(missionDomains);
const moduleLookup = Object.fromEntries(
  domainOrder.flatMap((domain) => domain.subModules.map((subModule) => [subModule.id, subModule])),
) as Record<ViewId, (typeof domainOrder)[number]["subModules"][number]>;

const actionableRoadmapTypes = new Set(["task", "sub-task", "micro-task", "atomic-task"]);

function formatRoadmapState(state: string) {
  return state.replace(/_/g, " ");
}

function getRoadmapScope(node: WorkflowTaskNode) {
  return node.type.replace(/-/g, " ").toUpperCase();
}

function getRoadmapAssignee(snapshot: RoadmapSnapshot, node: WorkflowTaskNode) {
  const assignment = snapshot.assignments.find((item) => item.taskId === node.id);
  return assignment?.subjectId ?? node.assigneeId ?? "Unassigned";
}

function getRoadmapVerificationBadges(snapshot: RoadmapSnapshot, node: WorkflowTaskNode) {
  const verification = snapshot.verifications.find((item) => item.taskId === node.id);
  return [
    verification?.qaStatus ? `QA ${verification.qaStatus}` : "QA pending",
    verification?.auditStatus ? `Audit ${verification.auditStatus}` : "Audit pending",
    verification?.deploymentStatus ? `Deploy ${verification.deploymentStatus}` : "Deploy n/a",
  ];
}

function getRoadmapSourceMeta(snapshot: RoadmapSnapshot, node: WorkflowTaskNode) {
  const sourcePath = snapshot.sourcePath ?? node.sourcePath;
  const sourceSection = node.sourceSection;
  if (!sourcePath && !sourceSection) return null;
  return { sourcePath, sourceSection };
}

function getRoadmapStats(snapshot?: RoadmapSnapshot) {
  if (!snapshot) {
    return {
      totalFeatures: 0,
      readyFeatures: 0,
      backlogTasks: 0,
      progress: 0,
      label: "No approved source",
    };
  }

  const actionableNodes = snapshot.nodes.filter((node) => actionableRoadmapTypes.has(node.type));
  const totalFeatures = actionableNodes.length;
  const readyFeatures = actionableNodes.filter((node) => node.state === "done").length;
  const backlogTasks = actionableNodes.filter((node) => node.state !== "done").length;
  const progress = totalFeatures > 0
    ? Math.round(actionableNodes.reduce((sum, node) => sum + (node.progress ?? (node.state === "done" ? 100 : 0)), 0) / totalFeatures)
    : 0;

  return {
    totalFeatures,
    readyFeatures,
    backlogTasks,
    progress,
    label: totalFeatures > 0 ? `${progress}% Live` : "Waiting for source",
  };
}

function getPrimaryRoadmapPhase(snapshot?: RoadmapSnapshot) {
  if (!snapshot) return null;

  const rootRoadmap = snapshot.nodes.find((node) => node.type === "roadmap");
  const phaseNode = snapshot.nodes.find((node) => node.type === "phase") ?? rootRoadmap;
  if (!phaseNode) return null;

  const phaseChildren = snapshot.nodes.filter((node) => node.parentId === phaseNode.id);
  const fallbackChildren = snapshot.nodes.filter((node) => node.id !== phaseNode.id && node.type !== "roadmap" && node.type !== "phase");
  const sprintNodes = phaseChildren.filter((node) => node.type === "sprint");

  if (sprintNodes.length > 0) {
    return {
      phase: phaseNode,
      sprintShells: sprintNodes.map((sprintNode) => ({
        sprint: sprintNode,
        isDerived: false,
        tasks: snapshot.nodes.filter((node) => node.parentId === sprintNode.id && actionableRoadmapTypes.has(node.type)),
      })),
    };
  }

  return {
    phase: phaseNode,
    sprintShells: [
      {
        sprint: {
          ...phaseNode,
          id: `${phaseNode.id}-derived-sprint-shell`,
          type: "sprint" as const,
          title: "Sprint shell",
          summary: phaseNode.summary ?? "Derived from the current phase because no sprint node is available in the approved roadmap snapshot.",
          progress: undefined,
        },
        isDerived: true,
        tasks: (phaseChildren.length > 0 ? phaseChildren : fallbackChildren).filter((node) => actionableRoadmapTypes.has(node.type)),
      },
    ],
  };
}

function useMissionSnapshot() {
  const [snapshot, setSnapshot] = useState<MissionSnapshot>(() => missionGateway.getSnapshot());

  useEffect(() => {
    const unsubscribe = missionGateway.subscribe(setSnapshot);
    missionGateway.connect();
    return unsubscribe;
  }, []);

  return {
    snapshot,
    send: (command: MissionCommand) => missionGateway.send(command),
  };
}

function useCanvasChart(snapshot: MissionSnapshot, theme: ThemeMode) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.clientWidth * window.devicePixelRatio;
    const height = canvas.clientHeight * window.devicePixelRatio;
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);

    const labelColor = theme === "light" ? "#18181b" : "#cbd5e1";
    context.strokeStyle = theme === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
    context.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = (height / 4) * i;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    const series = snapshot.chart.series;
    const allValues = series.flatMap((item) => item.values);
    if (allValues.length === 0) {
      context.fillStyle = labelColor;
      context.font = `${12 * window.devicePixelRatio}px monospace`;
      context.fillText("Waiting for live chart data", 24 * window.devicePixelRatio, height / 2);
      return;
    }

    const max = Math.max(...allValues, 1);
    series.forEach((item, seriesIndex) => {
      context.strokeStyle = item.color ?? (seriesIndex === 0 ? "#10b981" : "#6366f1");
      context.lineWidth = 3 * window.devicePixelRatio;
      context.beginPath();
      item.values.forEach((value, index) => {
        const x = (width / Math.max(item.values.length - 1, 1)) * index;
        const y = height - (value / max) * (height - 32 * window.devicePixelRatio) - 16 * window.devicePixelRatio;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
    });
  }, [snapshot.chart, theme]);

  return canvasRef;
}

function Header({
  activeDomain,
  connectionLabel,
  theme,
  onDomainChange,
  onToggleTheme,
  onRun,
}: {
  activeDomain: DomainId;
  connectionLabel: string;
  theme: ThemeMode;
  onDomainChange: (domain: DomainId) => void;
  onToggleTheme: () => void;
  onRun: () => void;
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">GV</div>
        <div>
          <strong>GoVibe Mission Control</strong>
          <span>Agent Command Center</span>
        </div>
      </div>
      <nav className="domain-tabs">
        {domainOrder.map((domain) => (
          <button
            key={domain.id}
            className={activeDomain === domain.id ? "active" : ""}
            style={activeDomain === domain.id ? { borderColor: domain.color, color: domain.color } : undefined}
            onClick={() => onDomainChange(domain.id)}
          >
            {domain.shortTitle}
          </button>
        ))}
      </nav>
      <div className="top-actions">
        <div className="reactor-status">
          <span className={connectionLabel === "CONNECTED" ? "online" : ""} />
          <strong>WS REACTOR</strong>
        </div>
        <button className="primary-action" onClick={onRun}>Test Run</button>
        <button className="icon-action" onClick={onToggleTheme} aria-label="Toggle theme">{theme === "dark" ? "Moon" : "Sun"}</button>
      </div>
    </header>
  );
}

function Sidebar({
  activeDomain,
  activeView,
  expanded,
  onToggle,
  onViewChange,
}: {
  activeDomain: DomainId;
  activeView: ViewId;
  expanded: boolean;
  onToggle: () => void;
  onViewChange: (view: ViewId) => void;
}) {
  const domain = missionDomains[activeDomain];
  return (
    <aside className={expanded ? "sidebar expanded" : "sidebar"}>
      <div className="sidebar-context">
        <span style={{ color: domain.color }}>{activeDomain}</span>
        <div>
          <small>Active Domain</small>
          <strong>{domain.title}</strong>
        </div>
      </div>
      <div className="side-nav">
        {domain.subModules.map((sub) => (
          <button
            key={sub.id}
            aria-label={`${sub.id}: ${sub.name}`}
            data-tooltip={sub.name}
            className={activeView === sub.id ? "active" : ""}
            onClick={() => onViewChange(sub.id)}
          >
            <span>{sub.id}</span>
            <strong>{sub.name}</strong>
          </button>
        ))}
      </div>
      <button className="sidebar-toggle" onClick={onToggle}>{expanded ? "Collapse Sidebar" : "Expand Sidebar"}</button>
    </aside>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </section>
  );
}

function WorkflowTaskRow({ snapshot, node }: { snapshot: RoadmapSnapshot; node: WorkflowTaskNode }) {
  const [expanded, setExpanded] = useState(false);
  const assignee = getRoadmapAssignee(snapshot, node);
  const badges = getRoadmapVerificationBadges(snapshot, node);
  const sourceMeta = getRoadmapSourceMeta(snapshot, node);
  const verification = snapshot.verifications.find((item) => item.taskId === node.id);
  const availabilityBadges = [
    sourceMeta?.sourcePath ? "Doc linked" : "Doc unavailable",
    "Code unavailable",
    "Test unavailable",
    `Progress ${typeof node.progress === "number" ? `${node.progress}%` : "unavailable"}`,
  ];
  const metadataItems = [
    { label: "Version", value: node.version ?? "unavailable" },
    { label: "Complexity", value: "unavailable" },
    { label: "Type", value: getRoadmapScope(node) },
    { label: "Status", value: formatRoadmapState(node.state) },
    { label: "Tokens used", value: "unavailable" },
  ];
  const responsibilityItems = [
    { label: "PIC", value: "unavailable" },
    { label: "Executor", value: assignee },
    { label: "Approver", value: "unavailable" },
    { label: "Auditor", value: verification?.auditStatus ? `Audit ${verification.auditStatus}` : "unavailable" },
  ];
  const dodColumns = [
    { title: "Acceptance Criteria", items: ["Spec approval unavailable", "Docs update unavailable"] },
    { title: "Success Criteria", items: ["Code completion unavailable", "Lint proof unavailable"] },
    { title: "Exit Criteria", items: ["Tests unavailable", "Regression status unavailable"] },
  ];
  const taskStateTone = node.state === "done" ? "is-complete" : "is-active";
  const renderDetailCardClass = (value: string) => value === "unavailable" ? "task-detail-card unavailable" : "task-detail-card";

  return (
    <article className={expanded ? "roadmap-task-row expanded" : "roadmap-task-row"}>
      <div className="roadmap-task-main">
        <div className="roadmap-task-head">
          <div className="roadmap-task-title-group">
            <span>{getRoadmapScope(node)}</span>
            <strong>{node.title}</strong>
          </div>
          <div className="task-badges">
            <em className={taskStateTone}>{formatRoadmapState(node.state)}</em>
            {badges.map((badge) => <em key={`${node.id}-${badge}`}>{badge}</em>)}
          </div>
        </div>
        {node.summary ? <p>{node.summary}</p> : null}
        <div className="task-availability-row">
          {availabilityBadges.map((badge) => <em key={`${node.id}-${badge}`}>{badge}</em>)}
        </div>
        {sourceMeta ? (
          <div className="task-source-meta" aria-label={`Source for ${node.title}`}>
            <span>Source</span>
            {sourceMeta.sourceSection ? <code>{sourceMeta.sourceSection}</code> : null}
            {sourceMeta.sourcePath ? <small>{sourceMeta.sourcePath}</small> : null}
          </div>
        ) : null}
      </div>
      <div className="roadmap-task-side">
        <button
          type="button"
          className="task-detail-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Hide detail" : "Show detail"}
        </button>
        <label>
          Assign to
          <select value={assignee} disabled aria-label={`Assignment for ${node.title}`}>
            <option>{assignee}</option>
          </select>
        </label>
        <div className="task-side-note">
          <span>Detail view</span>
          <strong>{expanded ? "Active" : "MT-A2-03"}</strong>
          <small>{expanded ? "Runtime-backed skeleton with unavailable placeholders" : "Task dropdown available"}</small>
        </div>
      </div>
      {expanded ? (
        <div className="task-detail-panel">
          <section className="task-detail-section">
            <div className="task-detail-section-head">
              <strong>SYMBOL LINKS</strong>
              <span>Only approved source references render here. Missing task-container links stay unavailable.</span>
            </div>
            <div className="task-detail-grid compact">
              <article className="task-detail-card unavailable"><span>Code link</span><code>unavailable</code></article>
              <article className={renderDetailCardClass(sourceMeta?.sourcePath ?? "unavailable")}><span>Doc link</span><code>{sourceMeta?.sourcePath ?? "unavailable"}</code></article>
              <article className="task-detail-card unavailable"><span>Test link</span><code>unavailable</code></article>
            </div>
          </section>
          <section className="task-detail-section">
            <div className="task-detail-section-head">
              <strong>Metadata</strong>
              <span>Snapshot-backed fields appear directly. Template-only telemetry remains unavailable.</span>
            </div>
            <div className="task-detail-grid">
              {metadataItems.map((item) => (
                <article className={renderDetailCardClass(item.value)} key={`${node.id}-${item.label}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>
          <section className="task-detail-section">
            <div className="task-detail-section-head">
              <strong>Responsibility</strong>
              <span>Assignment stays separate from approval and audit placeholders until runtime publishes them.</span>
            </div>
            <div className="task-detail-grid">
              {responsibilityItems.map((item) => (
                <article className={renderDetailCardClass(item.value)} key={`${node.id}-${item.label}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>
          <section className="task-detail-section">
            <div className="task-detail-section-head">
              <strong>DEFINITION OF DONE (DOD)</strong>
              <span>Checklist structure matches the template while unresolved task-container proof stays explicit.</span>
            </div>
            <div className="task-dod-columns">
              {dodColumns.map((column) => (
                <div key={`${node.id}-${column.title}`}>
                  <span>{column.title}</span>
                  <ul>
                    {column.items.map((item) => <li key={`${node.id}-${column.title}-${item}`}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
          <section className="task-detail-section">
            <div className="task-detail-section-head">
              <strong>CHANGELOG</strong>
              <span>Derived from the approved roadmap node and current mission snapshot timestamp.</span>
            </div>
            <div className="task-changelog">
              <code>{node.version ? `[${node.version}]` : "[unavailable]"} Detail snapshot generated from approved roadmap node.</code>
              <small>Task ID: {node.id}</small>
              <small>Updated: {snapshot.updatedAt ?? "unavailable"}</small>
            </div>
          </section>
          <section className="task-detail-footer">
            <div className="task-detail-meta">
              <small>Created: unavailable</small>
              <small>Task ID: {node.id}</small>
            </div>
            <div className="task-export-actions">
              <span>EXPORT TASK</span>
              <button type="button" disabled>JSON</button>
              <button type="button" disabled>YAML</button>
              <button type="button" disabled>Markdown</button>
            </div>
          </section>
        </div>
      ) : null}
    </article>
  );
}

function RoadmapAgentCard({ agent }: { agent: AgentRecord }) {
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

function ViewHeader({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="view-header">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      {desc ? <p>{desc}</p> : null}
    </div>
  );
}

function RealTimeDashboard({ snapshot, theme }: { snapshot: MissionSnapshot; theme: ThemeMode }) {
  const chartRef = useCanvasChart(snapshot, theme);
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Telemetry" title="Real-time Dashboard" desc="Live metrics arrive through the mission data entrypoint." />
      <div className="metric-grid">
        {snapshot.metrics.length > 0 ? snapshot.metrics.map((metric) => (
          <article className="panel metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        )) : <EmptyState title="No telemetry connected" body="Send a snapshot or metrics.update event through WebSocket, HTTP, or window govibe:mission-event." />}
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <h2>Token Performance Analytics</h2>
          <canvas ref={chartRef} />
        </section>
        <section className="panel">
          <h2>Reactor Telemetry</h2>
          {snapshot.reactor.length > 0 ? snapshot.reactor.map((row) => (
            <div className="kv-row" key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          )) : <EmptyState title="No reactor feed" body="Awaiting live reactor data." />}
        </section>
      </div>
    </div>
  );
}

function AgentManagement({ snapshot, send }: { snapshot: MissionSnapshot; send: (command: MissionCommand) => void }) {
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
  const registryAgents = snapshot.agents.map((agent) => ({
    ...agent,
    package: agent.fleet?.domain ?? "Registry metadata",
    abilities: agent.fleet?.responsibility ?? [],
  }));
  const activeAgent = registryAgents[selectedAgentIndex];
  const activeMedia = activeAgent?.avatarUrl;
  const deckAgents = registryAgents.map((agent, index) => {
    const rawOffset = index - selectedAgentIndex;
    const half = registryAgents.length / 2;
    const offset = rawOffset > half ? rawOffset - registryAgents.length : rawOffset < -half ? rawOffset + registryAgents.length : rawOffset;
    return { agent, index, offset };
  });

  const updateCursorGlow = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--cursor-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--cursor-y", `${event.clientY - rect.top}px`);
  };

  const updateTilt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty("--tilt-x", `${(-py * 9).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${(px * 11).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--cursor-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--cursor-y", `${event.clientY - rect.top}px`);
  };

  const resetTilt = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  };

  const selectRegistryAgent = (index: number) => {
    const nextIndex = (index + registryAgents.length) % registryAgents.length;
    setSelectedAgentIndex(nextIndex);
    setConfigOpen(false);
    void send({ type: "agent.select", agentId: registryAgents[nextIndex].id });
  };

  return (
    <div className="view-stack">
      <div className="view-title-row">
        <ViewHeader eyebrow="Covibe Overview" title="Agent Management" desc="Manage, configure and monitor the AI agent fleet." />
        <span className="fleet-count">{snapshot.agents.length} Registered Agents</span>
      </div>
      {snapshot.agents.length > 0 ? (
        <div className="agent-select-screen" style={{ "--agent-accent": activeAgent.accent } as CSSProperties} onPointerMove={updateCursorGlow}>
          <section className="selection-sector agent-deck-panel">
            <div className="top-bar">
              <span>Agent Select</span>
              <strong>{selectedAgentIndex + 1} / {registryAgents.length}</strong>
            </div>
            <div className="stats-panel">
              <article><span>Tasks</span><strong>{activeAgent.tasks}</strong></article>
              <article><span>Accuracy</span><strong>{activeAgent.accuracy}</strong></article>
              <article><span>Speed</span><strong>{activeAgent.speed}</strong></article>
            </div>
            <div className="ability-tags large">
              {activeAgent.abilities.length > 0
                ? activeAgent.abilities.map((ability) => <span key={ability}>{ability}</span>)
                : <span>Responsibility metadata unavailable</span>}
            </div>
            <div className="carousel-section">
              <div className="carousel-title">
                <span>Roster</span>
                <div>
                  <button type="button" aria-label="Previous agent" onClick={() => selectRegistryAgent(selectedAgentIndex - 1)}>Up</button>
                  <button type="button" aria-label="Next agent" onClick={() => selectRegistryAgent(selectedAgentIndex + 1)}>Down</button>
                </div>
              </div>
              <div className="agent-carousel-viewport" aria-label="Agent carousel">
                {deckAgents.map(({ agent, index, offset }) => (
                  <button
                    key={agent.name}
                    type="button"
                    className={index === selectedAgentIndex ? "agent-deck-card active" : "agent-deck-card"}
                    data-offset={offset}
                    aria-current={index === selectedAgentIndex ? "true" : undefined}
                    onClick={() => selectRegistryAgent(index)}
                    style={{ "--agent-accent": agent.accent, "--deck-offset": offset } as CSSProperties}
                  >
                    <span className="deck-avatar">{agent.name.slice(0, 2)}</span>
                    <span>
                      <strong>{agent.name}</strong>
                      <small>{agent.role}</small>
                      <em>{agent.package}</em>
                    </span>
                    <i>{agent.status}</i>
                  </button>
                ))}
              </div>
            </div>
            <div className="bottom-bar">
              <span><kbd>Up</kbd><kbd>Down</kbd> Navigate</span>
              <button type="button" onClick={() => setConfigOpen((value) => !value)}>{configOpen ? "Close Metadata" : "Role Metadata"}</button>
              <button type="button" disabled title="Deployment requires an approved assignment event.">Deploy unavailable</button>
            </div>
          </section>
          <section className="character-sector">
            <div className={configOpen ? "character-console flipped" : "character-console"} onPointerMove={updateTilt} onPointerLeave={resetTilt}>
              <span className="corner one" />
              <span className="corner two" />
              <div className="console-lights"><i /><i /><i /></div>
              <div className="char-media">
                {activeMedia ? (
                  <img src={activeMedia} alt={`${activeAgent.name} portrait`} />
                ) : (
                  <div className="char-media-fallback">{activeAgent.name}</div>
                )}
              </div>
              <div className="char-identity">
                <strong>{activeAgent.name}</strong>
                <span>{activeAgent.role}</span>
                <em>{activeAgent.model}</em>
              </div>
              <div className="character-config-face">
                <header>
                  <span>Registry Metadata</span>
                  <button type="button" onClick={() => setConfigOpen(false)}>Close</button>
                </header>
                <AgentFleetMetadataPanel agent={snapshot.agents[selectedAgentIndex]} />
              </div>
            </div>
          </section>
        </div>
      ) : (
        <EmptyState
          title="No registered agents available"
          body="The mission runtime did not return agent registry metadata. Registry agents are not inferred from UI placeholders."
        />
      )}
    </div>
  );
}

function AgentFleetMetadataPanel({ agent }: { agent: AgentRecord }) {
  const fleet = agent.fleet;
  const scopeStatus = fleet?.scopeStatus?.replace(/_/g, " ") ?? "metadata only";
  const authorityCan = fleet?.authority?.can ?? [];
  const authorityCannot = fleet?.authority?.cannot ?? [];
  const responsibilities = fleet?.responsibility ?? [];
  const outOfScope = fleet?.outOfScope ?? [];
  const sourceRefs = fleet?.sourceRefs ?? [];

  return (
    <section className="agent-fleet-panel" aria-label="Visual Agent Fleet role metadata">
      <header>
        <span>Role / provenance metadata only</span>
        <strong>{scopeStatus}</strong>
      </header>
      {!fleet ? (
        <p className="fleet-unavailable">
          Visual Agent Fleet metadata is unavailable for this live agent record. This panel does not imply assignment, execution, or approval state.
        </p>
      ) : null}
      <div className="fleet-meta-grid">
        <article><span>Fleet Role</span><strong>{fleet?.fleetRole ?? agent.role ?? "unavailable"}</strong></article>
        <article><span>Job Title</span><strong>{fleet?.jobTitleEquivalent ?? "unavailable"}</strong></article>
        <article><span>Domain</span><strong>{fleet?.domain ?? "unavailable"}</strong></article>
        <article><span>Cluster</span><strong>{fleet?.cluster ?? "unavailable"}</strong></article>
      </div>
      {responsibilities.length ? (
        <div className="fleet-chip-row">
          {responsibilities.map((item) => <span key={item}>{item}</span>)}
        </div>
      ) : <p className="fleet-unavailable">Responsibility badges unavailable.</p>}
      <div className="fleet-authority-grid">
        <div>
          <strong>Can</strong>
          {authorityCan.length ? authorityCan.map((item) => <span key={item}>{item}</span>) : <span>Not specified</span>}
        </div>
        <div>
          <strong>Cannot</strong>
          {authorityCannot.length ? authorityCannot.map((item) => <span key={item}>{item}</span>) : <span>Not specified</span>}
        </div>
      </div>
      <div className="fleet-scope-grid">
        <article>
          <span>Scope Boundary</span>
          <strong>{fleet?.scopeBoundary ?? "unavailable"}</strong>
        </article>
        <article>
          <span>Out of Scope</span>
          {outOfScope.length ? outOfScope.map((item) => <strong key={item}>{item}</strong>) : <strong>unavailable</strong>}
        </article>
      </div>
      <footer>
        <span>{fleet?.approvalGate ?? "Approval gate not specified"}</span>
        <small>{sourceRefs.length ? sourceRefs.slice(0, 2).join(" | ") : "No source refs"}</small>
      </footer>
    </section>
  );
}

function GraphView({ snapshot, title }: { snapshot: MissionSnapshot; title: string }) {
  const selected = snapshot.graph.nodes[0];
  const liveCallGraph = title === "Live Call Graph";
  return (
    <div className="view-stack">
      <div className="view-title-row">
        <ViewHeader eyebrow="Graph" title={title} desc="Graph nodes and edges are driven by gateway data." />
      </div>
      <div className={liveCallGraph ? "graph-layout" : ""}>
        <section className="panel graph-panel">
          {snapshot.graph.nodes.length === 0 ? <EmptyState title="No graph data" body="Publish graph.update to render the relationship map." /> : (
            <>
              {snapshot.graph.edges.map((edge) => <div className="edge-row" key={`${edge.source}-${edge.target}`}>{edge.source} {"->"} {edge.target}</div>)}
              <div className="node-cloud">
                {snapshot.graph.nodes.map((node) => <span key={node.id}>{node.label}</span>)}
              </div>
            </>
          )}
        </section>
        {liveCallGraph ? (
          <section className="panel graph-info">
            <h2>{selected?.label ?? "Select a node"}</h2>
            <div className="kv-row"><span>Nodes</span><strong>{snapshot.graph.nodes.length}</strong></div>
            <div className="kv-row"><span>Edges</span><strong>{snapshot.graph.edges.length}</strong></div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function GraphStudioView({ snapshot }: { snapshot: MissionSnapshot }) {
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

function BusinessSpecificationsView({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Genesis Knowledge" title="Functional Specifications" desc="Business protocol specification for Genesis Knowledge." />
      {snapshot.specs.length ? (
        <section className="record-grid">
          {snapshot.specs.map((spec) => <article className="panel" key={spec.title}><h2>{spec.title}</h2><p>{spec.body}</p></article>)}
        </section>
      ) : (
        <EmptyState title="No functional specs connected" body="Publish snapshot.specs before rendering business protocol records." />
      )}
    </div>
  );
}

function CampaignLogsView({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="AI Benchmark" title="EABS-01 Campaign Logs" desc="Campaign stream renders only logs received through the mission snapshot." />
      <section className="panel campaign-log-panel">
        {snapshot.campaignLogs.length > 0 ? snapshot.campaignLogs.map((line, index) => (
          <pre key={`${index}-${line}`}>{line}</pre>
        )) : (
          <EmptyState title="No campaign logs connected" body="Start a governed campaign or publish campaign log events through the mission runtime." />
        )}
      </section>
    </div>
  );
}

function SymbolExplorerView({ snapshot }: { snapshot: MissionSnapshot }) {
  const [filter, setFilter] = useState("");
  const symbols = snapshot.symbols.filter((symbol) => {
    const query = filter.toLowerCase();
    return symbol.name.toLowerCase().includes(query) || symbol.path.toLowerCase().includes(query) || symbol.kind.toLowerCase().includes(query);
  });

  return (
    <div className="view-stack">
      <div className="view-title-row">
        <ViewHeader eyebrow="Block DB" title="Symbol Explorer Hub" />
        <input
          className="table-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter symbols..."
        />
      </div>
      {snapshot.symbols.length === 0 ? <EmptyState title="No symbols indexed" body="Publish snapshot.symbols to populate this view." /> : (
        <section className="panel table-panel">
          <table>
            <thead>
              <tr>
                <th>Symbol Name</th>
                <th>Type</th>
                <th>Source File</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {symbols.map((symbol) => (
                <tr key={`${symbol.path}-${symbol.name}`}>
                  <td>{symbol.name}</td>
                  <td>{symbol.kind}</td>
                  <td>{symbol.path}</td>
                  <td><span>Indexed</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function Heatmap({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="AI Benchmark" title="Cyber Reactor Real-time Heatmap" />
      {snapshot.heatmap ? (
        <div className="dashboard-grid">
        <section className="panel reactor-overview">
          <h2>Reactor Overview Status</h2>
          <div className="kv-row"><span>Core Temp</span><strong>{`${snapshot.heatmap.coreTemp}C`}</strong></div>
        </section>
        <section className="panel">
          <h2>Core Thermal Grid (8x8 CPU/GPU Mapping)</h2>
          <div className="heatmap-grid">
            {snapshot.heatmap.cells.map((value, index) => (
              <span key={`${index}-${value}`} style={{ background: `rgba(${value > 70 ? "244,63,94" : "16,185,129"},${Math.min(0.85, value / 100)})` }}>{value}</span>
            ))}
          </div>
        </section>
      </div>
      ) : (
        <EmptyState title="No heatmap feed connected" body="Publish heatmap.update before rendering reactor grid telemetry." />
      )}
    </div>
  );
}

function RoadmapBoard({ snapshot }: { snapshot: MissionSnapshot }) {
  const [openPhase, setOpenPhase] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const receivedRoadmap = snapshot.roadmap;
  const roadmap = receivedRoadmap?.approvalStatus?.toLowerCase() === "approved" ? receivedRoadmap : undefined;
  const stats = getRoadmapStats(roadmap);
  const livePhase = getPrimaryRoadmapPhase(roadmap);
  const sourceState = roadmap
    ? `${roadmap.approvalStatus} · ${roadmap.sourceType}`
    : receivedRoadmap
      ? `blocked · ${receivedRoadmap.approvalStatus ?? "missing approval status"}`
      : snapshot.connectionState;

  return (
    <div className="view-stack">
      <section className="panel roadmap-header">
        <div className="roadmap-header-top">
          <ViewHeader eyebrow="Planning" title="GoVibe Development Roadmap" desc="Roadmap state should come from approved docs and live mission events." />
        </div>
        <div className="roadmap-progress">
          <span>Project progress</span>
          <strong>{stats.label}</strong>
          <div><i style={{ width: `${stats.progress}%` }} /></div>
        </div>
        <div className="roadmap-stats">
          <article><strong>{stats.totalFeatures}</strong><span>Feature ทั้งหมด</span></article>
          <article><strong>{stats.readyFeatures}</strong><span>พร้อมใช้งาน / IMP แล้ว</span></article>
          <article><strong>{stats.backlogTasks}</strong><span>Task ใน Backlog</span></article>
        </div>
        <div className="roadmap-actions">
          <div className="roadmap-source-meta">
            <span className={`status-pill ${roadmap ? "online" : "idle"}`}>{sourceState}</span>
            {roadmap ? <code>{roadmap.sourcePath}</code> : null}
          </div>
          <div className="roadmap-action-group">
            <div className="export-menu">
              <button
                type="button"
                onClick={() => setExportMenuOpen((value) => !value)}
                disabled={!roadmap}
                title={roadmap ? "Export approved roadmap snapshot" : "Export requires an approved roadmap source"}
                aria-expanded={exportMenuOpen}
              >
                Export
              </button>
              {exportMenuOpen && roadmap ? (
                <div>
                  <button type="button" onClick={() => { triggerRoadmapExport(roadmap, stats, "json"); setExportMenuOpen(false); }}>JSON</button>
                  <button type="button" onClick={() => { triggerRoadmapExport(roadmap, stats, "yaml"); setExportMenuOpen(false); }}>YAML</button>
                  <button type="button" onClick={() => { triggerRoadmapExport(roadmap, stats, "md"); setExportMenuOpen(false); }}>Markdown</button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setOpenPhase(true);
                setExportMenuOpen(false);
              }}
            >
              Reset Board
            </button>
          </div>
        </div>
      </section>
      <div className="roadmap-layout">
        <section className="panel assist-roster">
          <h2>AI Assist Roster</h2>
          <p>Agents shown here come from the current mission snapshot.</p>
          {snapshot.agents.length > 0 ? snapshot.agents.map((agent) => (
            <RoadmapAgentCard key={agent.id} agent={agent} />
          )) : (
            <EmptyState title="No live agent roster" body="Connect the mission runtime or publish an agents.update event." />
          )}
        </section>
        <section className="panel roadmap-accordion">
          <button className="phase-header" type="button" onClick={() => setOpenPhase((value) => !value)}>
            <span>{livePhase?.phase.type === "roadmap" ? "Roadmap" : livePhase ? getRoadmapScope(livePhase.phase) : "No source"}</span>
            <strong>{livePhase?.phase.title ?? "No approved roadmap connected"}</strong>
            <em>{livePhase ? formatRoadmapState(livePhase.phase.state) : sourceState}</em>
          </button>
          {openPhase ? (
            <div className="task-list">
              {livePhase ? (
                <>
                  <p>{livePhase.phase.summary ?? `Live roadmap source: ${roadmap?.sourcePath ?? "connected event source"}`}</p>
                  {livePhase.sprintShells.length > 0 ? livePhase.sprintShells.map(({ sprint, isDerived, tasks }) => (
                    <section className="sprint-shell" key={sprint.id}>
                      <div className="sprint-shell-header">
                        <div className="sprint-shell-title">
                          <span>{isDerived ? "Sprint shell" : getRoadmapScope(sprint)}</span>
                          <strong>{sprint.title}</strong>
                        </div>
                        <div className="sprint-shell-meta">
                          <em>{isDerived ? "derived" : formatRoadmapState(sprint.state)}</em>
                          <em>Duration: unavailable</em>
                          <em>Progress: {typeof sprint.progress === "number" ? `${sprint.progress}%` : "unavailable"}</em>
                        </div>
                      </div>
                      <p>{sprint.summary ?? "Sprint summary unavailable."}</p>
                      {tasks.length > 0 ? tasks.map((node) => (
                        <WorkflowTaskRow key={node.id} snapshot={roadmap!} node={node} />
                      )) : (
                        <EmptyState title="No tasks in sprint shell" body="The roadmap snapshot is connected, but this sprint shell does not include actionable task nodes yet." />
                      )}
                    </section>
                  )) : (
                    <EmptyState title="No sprint shell available" body="The approved roadmap phase is connected, but no sprint shell or actionable task nodes are available yet." />
                  )}
                </>
              ) : (
                <EmptyState
                  title={receivedRoadmap ? "Roadmap source is not approved" : "No approved roadmap connected"}
                  body={receivedRoadmap
                    ? `${receivedRoadmap.sourcePath} reports approval status '${receivedRoadmap.approvalStatus ?? "missing"}' and cannot drive live UI state.`
                    : "Start the GoVibe mission runtime with an approved roadmap source to view executable tasks."}
                />
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function CapabilityPlugins({ snapshot }: { snapshot: MissionSnapshot }) {
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

function BrainConfig() {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Runtime Config" title="Brain & Config" desc="Runtime controls only appear when the mission snapshot publishes them." />
      <EmptyState
        title="No runtime config connected"
        body="The mission snapshot does not yet publish live model, behavior, or limit controls. This view stays read-only until a governed config source exists."
      />
    </div>
  );
}

function AstTreeView({ snapshot }: { snapshot: MissionSnapshot }) {
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

function IntelligenceZoo({ snapshot }: { snapshot: MissionSnapshot }) {
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

function DatabaseErdView({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="view-stack">
      <div className="view-title-row">
        <ViewHeader eyebrow="Schema" title="Database ERD Schema" desc="C4 owns relational schema visibility for Block DB." />
        <button className="panel-action">Re-align Connections</button>
      </div>
      <section className="panel erd-canvas">
        {snapshot.symbols.length === 0 ? (
          <EmptyState title="No schema records" body="Publish schema or symbol records before rendering the ERD." />
        ) : (
          snapshot.symbols.map((symbol) => (
            <article className="db-table-card" key={`${symbol.path}-${symbol.name}`}>
              <strong>{symbol.name}</strong>
              <span>{symbol.kind}</span>
              <small>{symbol.path}</small>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function HnswVectorView({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Vector Index" title="HNSW Vector Space Map" desc="C5 is separated from ERD so vector topology can evolve independently." />
      {snapshot.graph.nodes.length === 0 ? (
        <EmptyState title="No vector map" body="Publish vector nodes through graph.update or a future vector event to render this map." />
      ) : (
        <div className="hnsw-layout">
          <section className="panel vector-panel">
            <div className="vector-title-row">
              <h2>Vector Nodes</h2>
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

function ReactorRunTrigger({ send }: { send: (command: MissionCommand) => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Benchmark" title="System Execution Safety and Triggers" desc="D1 sends benchmark run commands through the configured mission transport." />
      <section className="panel safety-run-panel">
          <div>
            <h2>Reactor Execution Safety Run</h2>
          <span className={armed ? "status-pill online" : "status-pill idle"}>{armed ? "command sent" : "ready"}</span>
          </div>
          <div className="safety-progress"><i style={{ width: armed ? "100%" : "0%" }} /></div>
          <button onClick={() => { setArmed(true); void send({ type: "reactor.run", profile: "default" }); }}>Start Safety Campaign Run</button>
        </section>
    </div>
  );
}

function DataIngestView({ ingest }: { ingest: (json: string) => void }) {
  const [payload, setPayload] = useState("");
  const [message, setMessage] = useState("Paste a MissionEvent JSON payload and ingest it into the live gateway.");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      ingest(payload);
      setMessage("Payload ingested.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid payload.");
    }
  };

  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Debugger" title="SRS-G Debugger" desc="Manual JSON ingress for real MissionEvent payloads." />
      <form className="panel ingest-panel" onSubmit={submit}>
        <label htmlFor="mission-event-json">MissionEvent JSON</label>
        <textarea
          id="mission-event-json"
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          spellCheck={false}
        />
        <div className="ingest-actions">
          <span>{message}</span>
          <button type="submit">Ingest</button>
        </div>
      </form>
    </div>
  );
}

function RenderView({
  activeView,
  snapshot,
  theme,
  send,
  ingest,
}: {
  activeView: ViewId;
  snapshot: MissionSnapshot;
  theme: ThemeMode;
  send: (command: MissionCommand) => void;
  ingest: (json: string) => void;
}) {
  if (activeView === "A1") return <RealTimeDashboard snapshot={snapshot} theme={theme} />;
  if (activeView === "A5") return <AgentManagement snapshot={snapshot} send={send} />;
  if (activeView === "B2") return <BusinessSpecificationsView snapshot={snapshot} />;
  if (activeView === "B3") return <GraphStudioView snapshot={snapshot} />;
  if (activeView === "B4") return <GraphView snapshot={snapshot} title="Live Call Graph" />;
  if (activeView === "C1") return <SymbolExplorerView snapshot={snapshot} />;
  if (activeView === "D2") return <Heatmap snapshot={snapshot} />;
  if (activeView === "D3") return <CampaignLogsView snapshot={snapshot} />;
  if (activeView === "D1") return <ReactorRunTrigger send={send} />;
  if (activeView === "A2") return <RoadmapBoard snapshot={snapshot} />;
  if (activeView === "A3") return <CapabilityPlugins snapshot={snapshot} />;
  if (activeView === "A4") return <BrainConfig />;
  if (activeView === "B1") return <AstTreeView snapshot={snapshot} />;
  if (activeView === "C2") return <IntelligenceZoo snapshot={snapshot} />;
  if (activeView === "C3") return <DataIngestView ingest={ingest} />;
  if (activeView === "C4") return <DatabaseErdView snapshot={snapshot} />;
  return <HnswVectorView snapshot={snapshot} />;
}

function Terminal({ snapshot, send }: { snapshot: MissionSnapshot; send: (command: MissionCommand) => void }) {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!command.trim()) return;
    void send({ type: "terminal.command", command });
    setCommand("");
  };
  return (
    <>
      <button className="terminal-fab" onClick={() => setOpen((value: boolean) => !value)}>$_</button>
      <section className={open ? "terminal open" : "terminal"}>
        <header><strong>mission-transport</strong><button onClick={() => setOpen(false)}>x</button></header>
        <div className="terminal-output">
          {snapshot.terminal.length ? snapshot.terminal.map((line) => (
            <div key={line.id}><span>[{line.time}]</span> <strong>{line.type}</strong> {line.text}</div>
          )) : <div className="muted">No terminal events yet.</div>}
        </div>
        <form onSubmit={submit}>
          <span>$</span>
          <input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Send command to mission transport..." />
          <button type="submit">Send</button>
        </form>
      </section>
    </>
  );
}

export function App() {
  const { snapshot, send } = useMissionSnapshot();
  const [theme, setTheme] = useState<ThemeMode>(() => localStorage.getItem("govibe-theme") === "light" ? "light" : "dark");
  const [activeDomain, setActiveDomain] = useState<DomainId>("A");
  const [activeView, setActiveView] = useState<ViewId>("A1");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const domain = missionDomains[activeDomain];
  const activeModule = moduleLookup[activeView];

  useEffect(() => {
    document.body.classList.toggle("light-theme", theme === "light");
    localStorage.setItem("govibe-theme", theme);
  }, [theme]);

  const connectionLabel = useMemo(() => snapshot.connectionState.toUpperCase(), [snapshot.connectionState]);

  const changeDomain = (next: DomainId) => {
    setActiveDomain(next);
    setActiveView(defaultViewByDomain[next]);
  };

  const ingest = (json: string) => {
    const event = JSON.parse(json) as Parameters<typeof missionGateway.handleEvent>[0];
    missionGateway.handleEvent(event);
  };

  return (
    <div className="app-shell" style={{ "--accent": domain.color } as CSSProperties}>
      <div className="ambient one" />
      <div className="ambient two" />
      <Header
        activeDomain={activeDomain}
        connectionLabel={connectionLabel}
        theme={theme}
        onDomainChange={changeDomain}
        onToggleTheme={() => setTheme((value) => value === "dark" ? "light" : "dark")}
        onRun={() => void send({ type: "reactor.run", profile: "default" })}
      />
      <div className="app-body">
        <Sidebar
          activeDomain={activeDomain}
          activeView={activeView}
          expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((value: boolean) => !value)}
          onViewChange={setActiveView}
        />
        <main>
          <div className="status-row">
            <span>{connectionLabel}</span>
            <span>{snapshot.updatedAt ? `Updated ${new Date(snapshot.updatedAt).toLocaleTimeString()}` : "No live snapshot received"}</span>
          </div>
          <RenderView activeView={activeView} snapshot={snapshot} theme={theme} send={send} ingest={ingest} />
        </main>
      </div>
      <footer>GoVibe Mission Control | {domain.title} &gt; {activeView}: {activeModule.name}</footer>
      <Terminal snapshot={snapshot} send={send} />
    </div>
  );
}
