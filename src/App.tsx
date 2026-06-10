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
  theme,
  onDomainChange,
  onToggleTheme,
  onRun,
}: {
  activeDomain: DomainId;
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
          <span>React Data Runtime</span>
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
        <button onClick={onRun}>Run</button>
        <button onClick={onToggleTheme}>{theme === "dark" ? "Dark" : "Light"}</button>
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
        <span style={{ color: domain.color }}>{domain.icon}</span>
        <strong>{domain.title}</strong>
      </div>
      <div className="side-nav">
        {domain.subModules.map((sub) => (
          <button key={sub.id} className={activeView === sub.id ? "active" : ""} onClick={() => onViewChange(sub.id)}>
            <span>{sub.icon}</span>
            <strong>{sub.name}</strong>
          </button>
        ))}
      </div>
      <button className="sidebar-toggle" onClick={onToggle}>{expanded ? "Collapse" : "Expand"}</button>
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
  const active = snapshot.agents.find((agent) => agent.id === activeId) ?? snapshot.agents[0];

  const selectAgent = (agent: AgentRecord) => {
    setActiveId(agent.id);
    void send({ type: "agent.select", agentId: agent.id });
  };

  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Agent Ops" title="Agent Management" desc="Agent roster is sourced from live gateway snapshots." />
      {snapshot.agents.length === 0 ? <EmptyState title="No agents online" body="Publish agents.update or snapshot.agents to populate the roster." /> : (
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
            <section className="panel agent-detail">
              <h2>{active.name}</h2>
              <p>{active.role}</p>
              <div className="metric-grid compact">
                <article><span>Model</span><strong>{active.model}</strong></article>
                <article><span>Tasks</span><strong>{active.tasks}</strong></article>
                <article><span>Accuracy</span><strong>{active.accuracy}</strong></article>
                <article><span>Speed</span><strong>{active.speed}</strong></article>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function GraphView({ snapshot, title }: { snapshot: MissionSnapshot; title: string }) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Graph" title={title} desc="Graph nodes and edges are driven by gateway data." />
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
    </div>
  );
}

function RecordsView({ snapshot, kind }: { snapshot: MissionSnapshot; kind: "specs" | "symbols" | "logs" }) {
  const title = kind === "specs" ? "Business Specifications" : kind === "symbols" ? "Symbol Explorer Hub" : "Campaign Logs";
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Data" title={title} />
      <section className="record-grid">
        {kind === "specs" && (snapshot.specs.length ? snapshot.specs.map((spec) => (
          <article className="panel" key={spec.title}><h2>{spec.title}</h2><p>{spec.body}</p></article>
        )) : <EmptyState title="No specifications" body="Publish snapshot.specs to populate this view." />)}
        {kind === "symbols" && (snapshot.symbols.length ? snapshot.symbols.map((symbol) => (
          <article className="panel" key={`${symbol.path}-${symbol.name}`}><h2>{symbol.name}</h2><p>{symbol.path}</p><small>{symbol.kind}</small></article>
        )) : <EmptyState title="No symbols indexed" body="Publish snapshot.symbols to populate this view." />)}
        {kind === "logs" && (snapshot.campaignLogs.length ? snapshot.campaignLogs.map((line) => (
          <pre className="panel log-line" key={line}>{line}</pre>
        )) : <EmptyState title="No campaign logs" body="Publish snapshot.campaignLogs to populate this view." />)}
      </section>
    </div>
  );
}

function Heatmap({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Thermal" title="Cyber Reactor Heatmap" />
      {!snapshot.heatmap ? <EmptyState title="No heatmap feed" body="Publish heatmap.update to render thermal cells." /> : (
        <div className="dashboard-grid">
          <section className="panel heatmap-grid">
            {snapshot.heatmap.cells.map((value, index) => (
              <span key={`${index}-${value}`} style={{ background: `rgba(${value > 70 ? "244,63,94" : "16,185,129"},${Math.min(0.85, value / 100)})` }}>{value}</span>
            ))}
          </section>
          <section className="panel">
            <span>Core Temp</span>
            <strong className="giant">{snapshot.heatmap.coreTemp}C</strong>
          </section>
        </div>
      )}
    </div>
  );
}

function SimpleLiveView({ title, body }: { title: string; body: string }) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="Live Data" title={title} />
      <EmptyState title="Awaiting live feed" body={body} />
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
      <ViewHeader eyebrow="Entry Point" title="SRS-G Data Ingest" desc="Manual JSON ingress for real MissionEvent payloads." />
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
  if (activeView === "B2") return <RecordsView snapshot={snapshot} kind="specs" />;
  if (activeView === "B3" || activeView === "B4") return <GraphView snapshot={snapshot} title={activeView === "B3" ? "Interactive Knowledge Graph" : "Live Call Graph"} />;
  if (activeView === "C1") return <RecordsView snapshot={snapshot} kind="symbols" />;
  if (activeView === "D2") return <Heatmap snapshot={snapshot} />;
  if (activeView === "D3") return <RecordsView snapshot={snapshot} kind="logs" />;
  if (activeView === "D1") return <SimpleLiveView title="Reactor Run Trigger" body="Use the Run button to send a reactor.run command to the configured transport." />;
  if (activeView === "A2") return <SimpleLiveView title="Roadmap Board" body="Connect roadmap task snapshots through the mission gateway." />;
  if (activeView === "A3") return <SimpleLiveView title="Capability Plugins" body="Connect plugin capability data through the mission gateway." />;
  if (activeView === "A4") return <SimpleLiveView title="Brain & Config" body="Connect model/runtime configuration through the mission gateway." />;
  if (activeView === "B1") return <SimpleLiveView title="AST Hierarchy Tree" body="Connect AST records through graph.update or snapshot.graph." />;
  if (activeView === "C2") return <SimpleLiveView title="Intelligence Zoo" body="Connect capability experiment records through the mission gateway." />;
  if (activeView === "C3") return <DataIngestView ingest={ingest} />;
  return <SimpleLiveView title="HNSW Vector Space Map" body="Connect vector map data through graph.update." />;
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
      <footer>GoVibe Mission Control | {domain.title} &gt; {activeView}</footer>
      <Terminal snapshot={snapshot} send={send} />
    </div>
  );
}
