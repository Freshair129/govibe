import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  defaultViewByDomain,
  missionDomains,
  missionGateway,
  type AgentRecord,
  type DomainId,
  type MissionCommand,
  type MissionSnapshot,
  type ThemeMode,
  type ViewId,
} from "./mission";

const domainOrder = Object.values(missionDomains);
const moduleLookup = Object.fromEntries(
  domainOrder.flatMap((domain) => domain.subModules.map((subModule) => [subModule.id, subModule])),
) as Record<ViewId, (typeof domainOrder)[number]["subModules"][number]>;

type TemplateAgent = {
  name: string;
  role: string;
  model: string;
  status: "Online" | "Ready" | "Idle" | "Offline";
  tasks: string;
  accuracy: string;
  speed: string;
  accent: string;
  package: string;
  sessionLimit: number;
  weeklyLimit: number;
  abilities: string[];
  videos?: string[];
  portrait?: string;
};

const templateAgents: TemplateAgent[] = [
  {
    name: "EVA",
    role: "Senior Developer",
    model: "Gemini 3.1 Pro",
    status: "Online",
    tasks: "12.4k",
    accuracy: "99.8%",
    speed: "1.2s",
    accent: "#ff6363",
    package: "Google AI Pro",
    sessionLimit: 85,
    weeklyLimit: 62,
    abilities: ["Web Search", "Vision", "Code", "Reasoning", "Persistent memory", "Multi-Agent", "Multi-Modal"],
    videos: ["/agents/eva/eva-vdo-01.mp4", "/agents/eva/eva-vdo-02.mp4"],
    portrait: "/agents/eva/eva-pic-01.jpeg",
  },
  {
    name: "QWEN",
    role: "Research Analyst",
    model: "Qwen 3 235B-A22B",
    status: "Online",
    tasks: "8.7k",
    accuracy: "98.2%",
    speed: "0.8s",
    accent: "#6366f1",
    package: "Research Tier",
    sessionLimit: 42,
    weeklyLimit: 38,
    abilities: ["Deep Search", "Reasoning", "Multilingual", "Analytics"],
  },
  {
    name: "ATLAS",
    role: "Infrastructure Lead",
    model: "Claude 4 Opus",
    status: "Online",
    tasks: "15.1k",
    accuracy: "99.5%",
    speed: "2.1s",
    accent: "#22d3ee",
    package: "Developer Plus",
    sessionLimit: 90,
    weeklyLimit: 75,
    abilities: ["Cloud Ops", "Database", "Security", "CI/CD"],
  },
  {
    name: "NOVA",
    role: "UI/UX Designer",
    model: "GPT-4o Vision",
    status: "Idle",
    tasks: "6.3k",
    accuracy: "97.1%",
    speed: "1.8s",
    accent: "#f472b6",
    package: "Creative Plan",
    sessionLimit: 55,
    weeklyLimit: 48,
    abilities: ["Design", "Figma", "Responsive", "Theming"],
  },
  {
    name: "SENTINEL",
    role: "Security Auditor",
    model: "Llama 4 Maverick",
    status: "Online",
    tasks: "22.9k",
    accuracy: "99.9%",
    speed: "0.4s",
    accent: "#f59e0b",
    package: "Ollama Local",
    sessionLimit: 85,
    weeklyLimit: 72,
    abilities: ["Encryption", "Vuln Scan", "Auth", "Firewall"],
  },
  {
    name: "OMEGA",
    role: "Data Scientist",
    model: "DeepSeek R2",
    status: "Idle",
    tasks: "9.8k",
    accuracy: "98.7%",
    speed: "3.5s",
    accent: "#10b981",
    package: "LM Studio",
    sessionLimit: 89,
    weeklyLimit: 64,
    abilities: ["ML Pipeline", "Data Wrangling", "Visualization", "GPU Compute"],
  },
  {
    name: "PHANTOM",
    role: "Stealth Operator",
    model: "Mistral Large 3",
    status: "Offline",
    tasks: "4.2k",
    accuracy: "96.3%",
    speed: "0.9s",
    accent: "#a78bfa",
    package: "Ollama",
    sessionLimit: 35,
    weeklyLimit: 28,
    abilities: ["Shell", "Network", "OSINT", "Crypto"],
  },
];

const roadmapRows = [
  { scope: "Phase 0", title: "Feasibility Spike — พิสูจน์ความเสถียร", state: "Blueprint", assignee: "Unassigned" },
  { scope: "Sprint 0", title: "Prototype YouTube IFrame Player UI 2 clients พร้อมกัน", state: "Blueprint", assignee: "Unassigned" },
  { scope: "FR", title: "WebSocket room ขั้นต่ำ: สร้างห้อง / join / broadcast event", state: "Blueprint", assignee: "Unassigned" },
  { scope: "FR", title: "Play / Pause / Seek sync เบื้องต้น", state: "Blueprint", assignee: "Unassigned" },
  { scope: "NFR", title: "วัด drift จริงระหว่าง 2 เครื่อง", state: "Blueprint", assignee: "Unassigned" },
  { scope: "NFR", title: "ทดสอบบน iOS Safari + Android Chrome", state: "Blueprint", assignee: "Unassigned" },
];

const capabilityBlueprints = [
  { title: "Transport Plugin", body: "WebSocket, HTTP command endpoint, browser event, and postMessage adapters.", status: "Ready for wiring" },
  { title: "Export Plugin", body: "Roadmap JSON, YAML, and Markdown export actions from the template surface.", status: "UI blueprint" },
  { title: "Knowledge Plugin", body: "Genesis file add, vector indexing, and auto-sync controls from agent configuration.", status: "Pending event shape" },
  { title: "Benchmark Plugin", body: "Safety campaign run, heatmap, and campaign log transport hooks.", status: "Command wired" },
];

const brainConfigSections = [
  { title: "Model Source", detail: "Cloud API / Local Server pill selector with backend-safe empty credentials." },
  { title: "Genesis Knowledge", detail: "Knowledge add surface, indexed vector counter, and auto-sync state." },
  { title: "Agent Behaviors", detail: "Plan Mode, Auto-Execute, file access, and shell runner toggles." },
  { title: "Runtime Limits", detail: "Temperature, context window, and latency budget sliders." },
];

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

function TemplateAgentCard({ agent, compact = false }: { agent: typeof templateAgents[number]; compact?: boolean }) {
  return (
    <article className={compact ? "template-agent-card compact" : "template-agent-card"} style={{ "--agent-accent": agent.accent } as CSSProperties}>
      <div className="template-agent-head">
        <div className="template-agent-avatar">{agent.name.slice(0, 2).toUpperCase()}</div>
        <div>
          <strong>{agent.name}</strong>
          <span>{agent.role}</span>
          <small>{agent.model}</small>
        </div>
        <em>{agent.status}</em>
      </div>
      <div className="template-agent-stats">
        <div><span>Tasks</span><strong>{agent.tasks}</strong></div>
        <div><span>Accuracy</span><strong>{agent.accuracy}</strong></div>
      </div>
      <div className="quota-line">
        <span>Session Quota</span>
        <i style={{ width: `${agent.sessionLimit}%` }} />
      </div>
      <div className="ability-tags">
        {agent.abilities.slice(0, 3).map((ability) => <span key={ability}>{ability}</span>)}
      </div>
      <button type="button">Configure</button>
    </article>
  );
}

function TemplateTaskRow({ row }: { row: typeof roadmapRows[number] }) {
  return (
    <article className="template-task-row">
      <div>
        <span>{row.scope}</span>
        <strong>{row.title}</strong>
        <div className="task-badges">
          <em>{row.state}</em>
          <em>Docs</em>
          <em>Code</em>
          <em>Test</em>
        </div>
      </div>
      <label>
        Assign to
        <select defaultValue={row.assignee}>
          <option>{row.assignee}</option>
          {templateAgents.map((agent) => <option key={agent.name}>{agent.name}</option>)}
        </select>
      </label>
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
  const [activeId, setActiveId] = useState<string | undefined>();
  const [configOpen, setConfigOpen] = useState(false);
  const [templateIndex, setTemplateIndex] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const active = snapshot.agents.find((agent) => agent.id === activeId) ?? snapshot.agents[0];
  const activeBlueprint = templateAgents[templateIndex];
  const activeMedia = activeBlueprint.videos?.[mediaIndex] ?? activeBlueprint.portrait;
  const hasVideo = Boolean(activeMedia?.endsWith(".mp4"));

  const selectTemplateAgent = (index: number) => {
    setTemplateIndex((index + templateAgents.length) % templateAgents.length);
    setMediaIndex(0);
    setConfigOpen(false);
  };

  const selectAgent = (agent: AgentRecord) => {
    setActiveId(agent.id);
    void send({ type: "agent.select", agentId: agent.id });
  };

  return (
    <div className="view-stack">
      <div className="view-title-row">
        <ViewHeader eyebrow="Covibe Overview" title="Agent Management" desc="Manage, configure and monitor the AI agent fleet." />
        <span className="fleet-count">{snapshot.agents.length || templateAgents.length} Agents</span>
      </div>
      {snapshot.agents.length === 0 ? (
        <div className="agent-select-screen" style={{ "--agent-accent": activeBlueprint.accent } as CSSProperties}>
          <section className="selection-sector panel agent-deck-panel">
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
              <div className="agent-carousel-viewport">
                {templateAgents.map((agent, index) => (
                  <button
                    key={agent.name}
                    type="button"
                    className={index === templateIndex ? "agent-deck-card active" : "agent-deck-card"}
                    onClick={() => selectTemplateAgent(index)}
                    style={{ "--agent-accent": agent.accent } as CSSProperties}
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
              <button type="button" onClick={() => setConfigOpen((value) => !value)}>{configOpen ? "Close Config" : "Configure"}</button>
              <button type="button">Deploy Agent</button>
            </div>
          </section>
          <section className="character-sector panel">
            <div className={configOpen ? "character-console flipped" : "character-console"}>
              <span className="corner one" />
              <span className="corner two" />
              <div className="console-lights"><i /><i /><i /></div>
              <div className="vdo-switcher">
                {(activeBlueprint.videos ?? []).map((video, index) => (
                  <button
                    key={video}
                    type="button"
                    className={index === mediaIndex ? "active" : ""}
                    aria-label={`Show EVA video ${index + 1}`}
                    onClick={() => setMediaIndex(index)}
                  />
                ))}
              </div>
              <div className="char-media">
                {activeMedia ? (
                  hasVideo ? (
                    <video key={activeMedia} src={activeMedia} autoPlay muted loop playsInline preload="metadata" />
                  ) : (
                    <img src={activeMedia} alt={`${activeBlueprint.name} portrait`} />
                  )
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
                  <span>Agent Settings</span>
                  <button type="button" onClick={() => setConfigOpen(false)}>Close</button>
                </header>
                <label>
                  System Prompt
                  <textarea defaultValue={`You are ${activeBlueprint.name}, an expert ${activeBlueprint.role} operating in autonomous loop mode.`} />
                </label>
                <label>
                  Model Source
                  <select defaultValue={activeBlueprint.package}>
                    <option>{activeBlueprint.package}</option>
                    <option>Local Server</option>
                  </select>
                </label>
                <div className="config-meter">
                  <span>Session Limit</span>
                  <i style={{ "--meter": `${activeBlueprint.sessionLimit}%` } as CSSProperties} />
                  <strong>{activeBlueprint.sessionLimit}%</strong>
                </div>
                <div className="config-meter">
                  <span>Weekly Limit</span>
                  <i style={{ "--meter": `${activeBlueprint.weeklyLimit}%` } as CSSProperties} />
                  <strong>{activeBlueprint.weeklyLimit}%</strong>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="agent-layout">
          <section className="panel agent-list">
            {snapshot.agents.map((agent) => (
              <button key={agent.id} className={active?.id === agent.id ? "active" : ""} onClick={() => selectAgent(agent)}>
                <span className={`status ${agent.status}`} />
                <strong>{agent.name}</strong>
                <small>{agent.role}</small>
              </button>
            ))}
          </section>
          {active ? (
            <section className={configOpen ? "panel agent-detail config-open" : "panel agent-detail"}>
              <div className="agent-card-front">
                <div className="agent-avatar">{active.name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <h2>{active.name}</h2>
                  <p>{active.role}</p>
                  <span className={`status-pill ${active.status}`}>{active.status}</span>
                </div>
                <button onClick={() => setConfigOpen((value) => !value)}>{configOpen ? "Close Config" : "Configure"}</button>
              </div>
              {!configOpen ? (
                <div className="metric-grid compact">
                  <article><span>Model</span><strong>{active.model}</strong></article>
                  <article><span>Tasks</span><strong>{active.tasks}</strong></article>
                  <article><span>Accuracy</span><strong>{active.accuracy}</strong></article>
                  <article><span>Speed</span><strong>{active.speed}</strong></article>
                </div>
              ) : (
                <div className="agent-config-grid">
                  <label>
                    <span>System Prompt</span>
                    <textarea placeholder="Connect agent config events to edit prompt." />
                  </label>
                  <label>
                    <span>Model Source</span>
                    <select defaultValue="cloud">
                      <option value="cloud">Cloud API</option>
                      <option value="local">Local Server</option>
                    </select>
                  </label>
                  <label>
                    <span>Context Window</span>
                    <input type="range" min="8" max="200" defaultValue="64" />
                  </label>
                  <label>
                    <span>Temperature</span>
                    <input type="range" min="0" max="2" step="0.1" defaultValue="0.7" />
                  </label>
                </div>
              )}
            </section>
          ) : null}
        </div>
      )}
    </div>
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
  const nodes = snapshot.graph.nodes.length ? snapshot.graph.nodes : [
    { id: "room", label: "Room Sync" },
    { id: "player", label: "IFrame Player" },
    { id: "drift", label: "Drift Monitor" },
  ];
  return (
    <div className="view-stack">
      <div className="view-title-row">
        <ViewHeader eyebrow="Genesis Knowledge" title="Interactive Graph Studio" desc="2D graph workspace for relationship mapping." />
        <button className="panel-action">Add New Node</button>
      </div>
      <section className="panel graph-studio-canvas">
        {nodes.map((node, index) => (
          <span key={node.id} style={{ left: `${16 + index * 24}%`, top: `${32 + (index % 2) * 22}%` }}>{node.label}</span>
        ))}
      </section>
      <p className="view-note">Click and drag behavior is a follow-up once node position events are defined.</p>
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
  const logs = snapshot.campaignLogs.length ? snapshot.campaignLogs : [
    "[blueprint] INITIALIZING AI LEVEL 1 COMPLIANCE CHECKS...",
    "[blueprint] AST FILE STRUCTURE CHECK => waiting for campaign feed",
    "[blueprint] TELEMETRY UNDERCLOCK SAFETY HOOK => waiting for reactor.run",
    "[blueprint] CAMPAIGN STATUS => pending live logs",
  ];
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="AI Benchmark" title="EABS-01 Campaign Logs" desc="Campaign stream uses live logs when available and template blueprint rows otherwise." />
      <section className="panel campaign-log-panel">
        {logs.map((line) => <pre key={line}>{line}</pre>)}
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

function RoadmapBoard() {
  const [exportOpen, setExportOpen] = useState(false);
  const [openPhase, setOpenPhase] = useState(true);
  return (
    <div className="view-stack">
      <section className="panel roadmap-header">
        <div>
          <ViewHeader eyebrow="Planning" title="CoVibe Development Roadmap" desc="แผนการพัฒนาและติดตามผลความคืบหน้าของฟีเจอร์" />
        </div>
        <div className="roadmap-progress">
          <span>ความคืบหน้ารวมโครงการ</span>
          <strong>Blueprint</strong>
          <div><i style={{ width: "53%" }} /></div>
        </div>
        <div className="roadmap-stats">
          <article><strong>36</strong><span>งานทั้งหมด</span></article>
          <article><strong>19</strong><span>ทำเสร็จแล้ว</span></article>
          <article><strong>17</strong><span>รอดำเนินการ</span></article>
        </div>
        <div className="roadmap-actions">
          <div className="export-menu">
            <button onClick={() => setExportOpen((value) => !value)}>Export</button>
            {exportOpen ? (
              <div>
                <button>JSON</button>
                <button>YAML</button>
                <button>Markdown</button>
              </div>
            ) : null}
          </div>
          <button>Reset Board</button>
        </div>
      </section>
      <div className="roadmap-layout">
        <section className="panel assist-roster">
          <h2>AI Assist Roster</h2>
          <p>Drag a card to assign an agent to a task when roadmap events are connected.</p>
          {templateAgents.map((agent) => <TemplateAgentCard key={agent.name} agent={agent} compact />)}
        </section>
        <section className="panel roadmap-accordion">
          <button className="phase-header" type="button" onClick={() => setOpenPhase((value) => !value)}>
            <span>Phase 0</span>
            <strong>Feasibility Spike — พิสูจน์ความเสถียร</strong>
            <em>Blueprint</em>
          </button>
          {openPhase ? (
            <div className="task-list">
              <p>ก่อนเริ่ม Sprint จริง ต้องพิสูจน์ให้ได้ว่าระบบ YouTube IFrame API ทำงานร่วมกับ WebSocket sync ในการจัดพิกัดเวลาของเพลงได้เสถียรบนมือถือ 2 เครื่อง และหาข้อจำกัดระบบ</p>
              {roadmapRows.slice(1).map((row) => <TemplateTaskRow key={row.title} row={row} />)}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function CapabilityPlugins() {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Capabilities" title="Capability Plugins" desc="Template-aligned plugin console for operational extension points." />
      <section className="plugin-grid">
        {capabilityBlueprints.map((plugin) => (
          <article className="panel plugin-card" key={plugin.title}>
            <div><span>{plugin.status}</span><strong>{plugin.title}</strong></div>
            <p>{plugin.body}</p>
            <div className="plugin-actions">
              <button type="button">Inspect</button>
              <button type="button">Wire Event</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function BrainConfig() {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Runtime Config" title="Brain & Config" desc="Model, knowledge, behavior, and runtime controls from the template configuration panel." />
      <section className="brain-config-grid">
        {brainConfigSections.map((section) => (
          <article className="panel config-surface" key={section.title}>
            <span>{section.title}</span>
            <p>{section.detail}</p>
            <label>
              <strong>Blueprint Control</strong>
              <input type="range" min="0" max="100" defaultValue="50" />
            </label>
          </article>
        ))}
      </section>
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
  if (activeView === "A2") return <RoadmapBoard />;
  if (activeView === "A3") return <CapabilityPlugins />;
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
