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
      total: 0,
      done: 0,
      active: 0,
      progress: 0,
      label: "No approved source",
    };
  }

  const actionableNodes = snapshot.nodes.filter((node) => actionableRoadmapTypes.has(node.type));
  const total = actionableNodes.length;
  const done = actionableNodes.filter((node) => node.state === "done").length;
  const active = actionableNodes.filter((node) => node.state !== "done").length;
  const progress = total > 0
    ? Math.round(actionableNodes.reduce((sum, node) => sum + (node.progress ?? (node.state === "done" ? 100 : 0)), 0) / total)
    : 0;

  return {
    total,
    done,
    active,
    progress,
    label: total > 0 ? `${progress}% Live` : "Waiting for source",
  };
}

function getPrimaryRoadmapPhase(snapshot?: RoadmapSnapshot) {
  if (!snapshot) return null;

  const phaseNode = snapshot.nodes.find((node) => node.type === "phase");
  if (phaseNode) {
    const phaseChildren = snapshot.nodes.filter((node) => node.parentId === phaseNode.id);
    const fallbackChildren = snapshot.nodes.filter((node) => node.id !== phaseNode.id && node.type !== "roadmap");
    return {
      phase: phaseNode,
      tasks: (phaseChildren.length > 0 ? phaseChildren : fallbackChildren).filter((node) => node.type !== "phase"),
    };
  }

  const rootRoadmap = snapshot.nodes.find((node) => node.type === "roadmap");
  if (!rootRoadmap) return null;

  return {
    phase: rootRoadmap,
    tasks: snapshot.nodes.filter((node) => node.id !== rootRoadmap.id),
  };
}

const intelligenceBlueprints = [
  { title: "EVA Agent (eva-cli)", body: "Primary code architect assisting custom WebSocket connections.", status: "Active" },
  { title: "Qwen Coder", body: "Sub-agent analyzing code quality and generating tests.", status: "Standby" },
  { title: "UAT Agent", body: "Validation operator for browser, mobile, and acceptance checks.", status: "Ready" },
  { title: "Local Runner", body: "Local model worker for sandboxed inference and offline checks.", status: "Offline" },
];

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
  const assignee = getRoadmapAssignee(snapshot, node);
  const badges = getRoadmapVerificationBadges(snapshot, node);
  const sourceMeta = getRoadmapSourceMeta(snapshot, node);
  return (
    <article className="template-task-row">
      <div>
        <span>{getRoadmapScope(node)}</span>
        <strong>{node.title}</strong>
        {node.summary ? <p>{node.summary}</p> : null}
        {sourceMeta ? (
          <div className="task-source-meta" aria-label={`Source for ${node.title}`}>
            <span>Source</span>
            {sourceMeta.sourceSection ? <code>{sourceMeta.sourceSection}</code> : null}
            {sourceMeta.sourcePath ? <small>{sourceMeta.sourcePath}</small> : null}
          </div>
        ) : null}
        <div className="task-badges">
          <em>{formatRoadmapState(node.state)}</em>
          {badges.map((badge) => <em key={`${node.id}-${badge}`}>{badge}</em>)}
        </div>
      </div>
      <label>
        Assign to
        <select value={assignee} disabled aria-label={`Assignment for ${node.title}`}>
          <option>{assignee}</option>
        </select>
      </label>
    </article>
  );
}

function RoadmapAgentCard({ agent }: { agent: AgentRecord }) {
  return (
    <article className="template-agent-card compact">
      <div className="template-agent-head">
        <div className="agent-orb" style={{ "--agent-accent": agent.accent ?? "#10b981" } as CSSProperties}>
          {agent.avatarUrl ? <img src={agent.avatarUrl} alt="" /> : agent.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <strong>{agent.name}</strong>
          <span>{agent.role}</span>
        </div>
        <em>{agent.status}</em>
      </div>
      <div className="template-agent-stats">
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
  const [templateIndex, setTemplateIndex] = useState(0);
  const templateAgents = snapshot.agents.map((agent) => ({
    ...agent,
    package: agent.fleet?.domain ?? "Registry metadata",
    abilities: agent.fleet?.responsibility ?? [],
  }));
  const activeBlueprint = templateAgents[templateIndex];
  const activeMedia = activeBlueprint?.avatarUrl;
  const deckAgents = templateAgents.map((agent, index) => {
    const rawOffset = index - templateIndex;
    const half = templateAgents.length / 2;
    const offset = rawOffset > half ? rawOffset - templateAgents.length : rawOffset < -half ? rawOffset + templateAgents.length : rawOffset;
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

  const selectTemplateAgent = (index: number) => {
    const nextIndex = (index + templateAgents.length) % templateAgents.length;
    setTemplateIndex(nextIndex);
    setConfigOpen(false);
    void send({ type: "agent.select", agentId: templateAgents[nextIndex].id });
  };

  return (
    <div className="view-stack">
      <div className="view-title-row">
        <ViewHeader eyebrow="Covibe Overview" title="Agent Management" desc="Manage, configure and monitor the AI agent fleet." />
        <span className="fleet-count">{snapshot.agents.length} Registered Agents</span>
      </div>
      {snapshot.agents.length > 0 ? (
        <div className="agent-select-screen" style={{ "--agent-accent": activeBlueprint.accent } as CSSProperties} onPointerMove={updateCursorGlow}>
          <section className="selection-sector agent-deck-panel">
            <div className="top-bar">
              <span>Agent Select</span>
              <strong>{templateIndex + 1} / {templateAgents.length}</strong>
            </div>
            <div className="stats-panel">
              <article><span>Tasks</span><strong>{activeBlueprint.tasks}</strong></article>
              <article><span>Accuracy</span><strong>{activeBlueprint.accuracy}</strong></article>
              <article><span>Speed</span><strong>{activeBlueprint.speed}</strong></article>
            </div>
            <div className="ability-tags large">
              {activeBlueprint.abilities.map((ability) => <span key={ability}>{ability}</span>)}
            </div>
            <div className="carousel-section">
              <div className="carousel-title">
                <span>Roster</span>
                <div>
                  <button type="button" aria-label="Previous agent" onClick={() => selectTemplateAgent(templateIndex - 1)}>Up</button>
                  <button type="button" aria-label="Next agent" onClick={() => selectTemplateAgent(templateIndex + 1)}>Down</button>
                </div>
              </div>
              <div className="agent-carousel-viewport" aria-label="Agent carousel">
                {deckAgents.map(({ agent, index, offset }) => (
                  <button
                    key={agent.name}
                    type="button"
                    className={index === templateIndex ? "agent-deck-card active" : "agent-deck-card"}
                    data-offset={offset}
                    aria-current={index === templateIndex ? "true" : undefined}
                    onClick={() => selectTemplateAgent(index)}
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
                  <img src={activeMedia} alt={`${activeBlueprint.name} portrait`} />
                ) : (
                  <div className="char-media-fallback">{activeBlueprint.name}</div>
                )}
              </div>
              <div className="char-identity">
                <strong>{activeBlueprint.name}</strong>
                <span>{activeBlueprint.role}</span>
                <em>{activeBlueprint.model}</em>
              </div>
              <div className="character-config-face">
                <header>
                  <span>Registry Metadata</span>
                  <button type="button" onClick={() => setConfigOpen(false)}>Close</button>
                </header>
                <AgentFleetMetadataPanel agent={snapshot.agents[templateIndex]} />
              </div>
            </div>
          </section>
        </div>
      ) : (
        <EmptyState
          title="No registered agents available"
          body="The mission runtime did not return agent registry metadata. Template agents are not used as live state."
        />
      )}
    </div>
  );
}

function AgentFleetMetadataPanel({ agent }: { agent: AgentRecord }) {
  const fleet = agent.fleet;
  if (!fleet) return null;

  const scopeStatus = fleet.scopeStatus?.replace(/_/g, " ") ?? "metadata only";
  const authorityCan = fleet.authority?.can ?? [];
  const authorityCannot = fleet.authority?.cannot ?? [];

  return (
    <section className="agent-fleet-panel" aria-label="Visual Agent Fleet role metadata">
      <header>
        <span>Role / provenance metadata</span>
        <strong>{scopeStatus}</strong>
      </header>
      <div className="fleet-meta-grid">
        <article><span>Fleet Role</span><strong>{fleet.fleetRole ?? agent.role}</strong></article>
        <article><span>Job Title</span><strong>{fleet.jobTitleEquivalent ?? "Unspecified"}</strong></article>
        <article><span>Domain</span><strong>{fleet.domain ?? "Unspecified"}</strong></article>
        <article><span>Cluster</span><strong>{fleet.cluster ?? "Unspecified"}</strong></article>
      </div>
      {fleet.responsibility?.length ? (
        <div className="fleet-chip-row">
          {fleet.responsibility.map((item) => <span key={item}>{item}</span>)}
        </div>
      ) : null}
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
      <footer>
        <span>{fleet.approvalGate ?? "Approval gate not specified"}</span>
        <small>{fleet.sourceRefs?.slice(0, 2).join(" | ") ?? "No source refs"}</small>
      </footer>
    </section>
  );
}

function GraphView({ snapshot, title }: { snapshot: MissionSnapshot; title: string }) {
  const [depth, setDepth] = useState("all");
  const selected = snapshot.graph.nodes[0];
  const liveCallGraph = title === "Live Call Graph";
  return (
    <div className="view-stack">
      <div className="view-title-row">
        <ViewHeader eyebrow="Graph" title={title} desc="Graph nodes and edges are driven by gateway data." />
        {liveCallGraph ? (
          <div className="graph-controls">
            {["1", "2", "all"].map((value) => (
              <button key={value} className={depth === value ? "active" : ""} onClick={() => setDepth(value)}>Depth {value}</button>
            ))}
            <button>Sync Graph</button>
          </div>
        ) : null}
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
            <div className="kv-row"><span>Depth</span><strong>{depth}</strong></div>
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
        <button className="panel-action">Add New Node</button>
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
        <section className="panel spec-panel">
          <h2>Business Protocol Specification</h2>
          <p>ตารางต่อไปนี้จัดวางระเบียบข้อบังคับและเวิร์กโฟลว์ของ Genesis Block DB:</p>
          <ul>
            <li><strong>GKS-BLOCK-SYNC:</strong> ระบบตรวจสอบความสอดคล้องของโค้ดจริงกับ Document โดยอัตโนมัติ</li>
            <li><strong>SRS-COMPLIANCE:</strong> ระบบคำนวณสถิติ ROI ของโมเดลและรายงานผลแบบเรียลไทม์ไปยัง AI Benchmark</li>
          </ul>
        </section>
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
  const cells = snapshot.heatmap?.cells ?? Array.from({ length: 64 }, (_, index) => (index % 8) * 8 + 18);
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="AI Benchmark" title="Cyber Reactor Real-time Heatmap" />
      <div className="dashboard-grid">
        <section className="panel reactor-overview">
          <h2>Reactor Overview Status</h2>
          <div className="kv-row"><span>Core Temp</span><strong>{snapshot.heatmap ? `${snapshot.heatmap.coreTemp}C` : "Awaiting feed"}</strong></div>
          <div className="kv-row"><span>GFLOPS Power</span><strong>Awaiting feed</strong></div>
          <div className="kv-row"><span>Coolant Flow Rate</span><strong>Awaiting feed</strong></div>
        </section>
        <section className="panel">
          <h2>Core Thermal Grid (8x8 CPU/GPU Mapping)</h2>
          <div className="heatmap-grid">
            {cells.map((value, index) => (
              <span key={`${index}-${value}`} className={!snapshot.heatmap ? "blueprint-cell" : ""} style={{ background: `rgba(${value > 70 ? "244,63,94" : "16,185,129"},${Math.min(0.85, value / 100)})` }}>{snapshot.heatmap ? value : ""}</span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function RoadmapBoard({ snapshot }: { snapshot: MissionSnapshot }) {
  const [openPhase, setOpenPhase] = useState(true);
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
        <div>
          <ViewHeader eyebrow="Planning" title="CoVibe Development Roadmap" desc="Roadmap state should come from approved docs and live mission events." />
        </div>
        <div className="roadmap-progress">
          <span>Project progress</span>
          <strong>{stats.label}</strong>
          <div><i style={{ width: `${stats.progress}%` }} /></div>
        </div>
        <div className="roadmap-stats">
          <article><strong>{stats.total}</strong><span>Total items</span></article>
          <article><strong>{stats.done}</strong><span>Completed</span></article>
          <article><strong>{stats.active}</strong><span>Active</span></article>
        </div>
        <div className="roadmap-actions">
          <span className={`status-pill ${roadmap ? "online" : "idle"}`}>{sourceState}</span>
          {roadmap ? <code>{roadmap.sourcePath}</code> : null}
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
                  {livePhase.tasks.length > 0 ? livePhase.tasks.map((node) => (
                    <WorkflowTaskRow key={node.id} snapshot={roadmap!} node={node} />
                  )) : (
                    <EmptyState title="No tasks in live phase" body="The roadmap snapshot is connected, but this phase does not include child task nodes yet." />
                  )}
                </>
              ) : (
                <EmptyState
                  title={receivedRoadmap ? "Roadmap source is not approved" : "No approved roadmap connected"}
                  body={receivedRoadmap
                    ? `${receivedRoadmap.sourcePath} reports approval status '${receivedRoadmap.approvalStatus ?? "missing"}' and cannot drive live UI state.`
                    : "Start the GoVibe mission runtime with an approved roadmap source. Hardcoded blueprint tasks are no longer used."}
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
      <ViewHeader eyebrow="Genesis Knowledge" title="AST Tree & Preview" desc="Tree explorer and canvas preview aligned to the template AST Explorer." />
      <div className="ast-layout">
        <section className="panel ast-code-panel">
          <strong>calculateDrift.js</strong>
          {["const latency = report.latencyMs;", "if (latency > 250) {", "  triggerCalibration(latency);", "}"].map((line, index) => (
            <button type="button" key={line}><span>{index + 1}:</span>{line}</button>
          ))}
        </section>
        <section className="panel ast-canvas">
          {(snapshot.graph.nodes.length ? snapshot.graph.nodes : [
            { id: "program", label: "Program" },
            { id: "function", label: "FunctionDecl" },
            { id: "binary", label: "BinaryExpr" },
            { id: "trigger", label: "TriggerCalibration" },
          ]).map((node, index) => (
            <div className="ast-node" key={node.id} style={{ left: `${12 + (index % 2) * 34}%`, top: `${24 + index * 12}%` }}>
              <strong>{node.label}</strong>
              <span>{snapshot.graph.nodes.length ? "Live node" : "Blueprint node"}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function IntelligenceZoo() {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Block DB" title="Intelligence Zoo" desc="Agent and model roster surface from the template." />
      <section className="zoo-grid">
        {intelligenceBlueprints.map((item) => (
          <article className="panel zoo-card" key={item.title}>
            <div>
              <strong>{item.title}</strong>
              <span>{item.status}</span>
            </div>
            <p>{item.body}</p>
          </article>
        ))}
      </section>
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
  const [layer, setLayer] = useState(6);
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Vector Index" title="HNSW Vector Space Map" desc="C5 is separated from ERD so vector topology can evolve independently." />
      <div className="hnsw-layout">
        <section className="panel hnsw-controls">
          <h2>Filter HNSW Layer View</h2>
          {[6, 4, 2, 0].map((value) => (
            <button key={value} className={layer === value ? "active" : ""} onClick={() => setLayer(value)}>Layer {value}</button>
          ))}
        </section>
        <section className="panel vector-panel">
          <div className="vector-title-row">
            <h2>Active: Layer {layer}</h2>
            <span>Simulation Space</span>
          </div>
          {snapshot.graph.nodes.length === 0 ? (
            <EmptyState title="No vector map" body="Publish vector nodes through graph.update or a future vector event to render this map." />
          ) : (
            <div className="node-cloud">
              {snapshot.graph.nodes.map((node) => <span key={node.id}>{node.label}</span>)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ReactorRunTrigger({ send }: { send: (command: MissionCommand) => void }) {
  const [powerLimit, setPowerLimit] = useState(85);
  const [armed, setArmed] = useState(false);
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Benchmark" title="System Execution Safety and Triggers" desc="D1 sends benchmark run commands through the configured mission transport." />
      <div className="reactor-grid">
        <section className="panel regulator-panel">
          <h2>Underclocking Power Regulator</h2>
          <p>Adjust local safety preference before sending the reactor command.</p>
          <input type="range" min="40" max="100" value={powerLimit} onChange={(event) => setPowerLimit(Number(event.target.value))} />
          <div className="kv-row"><span>Power Limit</span><strong>{powerLimit}%</strong></div>
        </section>
        <section className="panel safety-run-panel">
          <div>
            <h2>Reactor Execution Safety Run</h2>
            <span className={armed ? "status-pill online" : "status-pill idle"}>{armed ? "armed" : "ready"}</span>
          </div>
          <div className="safety-progress"><i style={{ width: armed ? "100%" : "0%" }} /></div>
          <button onClick={() => { setArmed(true); void send({ type: "reactor.run", profile: "default" }); }}>Start Safety Campaign Run</button>
        </section>
      </div>
      <section className="panel oscilloscope-panel">
        <div>
          <h2>Oscilloscope Sound Sandbox</h2>
          <button type="button">Play Stream</button>
        </div>
        <div className="oscilloscope-screen">Standby. Connect audio stream to render waveform.</div>
      </section>
    </div>
  );
}

function DataIngestView({ ingest }: { ingest: (json: string) => void }) {
  const [payload, setPayload] = useState("");
  const [query, setQuery] = useState("");
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
      <section className="panel query-debugger">
        <div className="query-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter query text here..." />
          <button type="button">Submit Query</button>
        </div>
        <div className="debug-output-grid">
          <article>
            <span>Standard RAG output</span>
            <p>{query ? "Connect debugger transport to run this query." : "Waiting for query..."}</p>
          </article>
          <article>
            <span>Multi-Hop Graph Retrieve</span>
            <p>{query ? "Connect graph retrieval events to compare results." : "Waiting for query..."}</p>
          </article>
        </div>
      </section>
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
  if (activeView === "C2") return <IntelligenceZoo />;
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
