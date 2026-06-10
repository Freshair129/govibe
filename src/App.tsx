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

function ModuleBlueprint({
  title,
  eyebrow,
  desc,
  lanes,
  empty,
}: {
  title: string;
  eyebrow: string;
  desc: string;
  lanes: Array<{ title: string; body: string }>;
  empty: string;
}) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow={eyebrow} title={title} desc={desc} />
      <section className="blueprint-grid">
        {lanes.map((lane) => (
          <article className="panel blueprint-card" key={lane.title}>
            <span>{lane.title}</span>
            <p>{lane.body}</p>
          </article>
        ))}
      </section>
      <EmptyState title="Awaiting live feed" body={empty} />
    </div>
  );
}

function RoadmapBoard() {
  const [exportOpen, setExportOpen] = useState(false);
  return (
    <div className="view-stack">
      <section className="panel roadmap-header">
        <div>
          <ViewHeader eyebrow="Planning" title="CoVibe Development Roadmap" desc="Roadmap controls are ready for live task snapshots." />
        </div>
        <div className="roadmap-progress">
          <span>Overall Progress</span>
          <strong>Awaiting feed</strong>
          <div><i /></div>
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
          <p>Agent assignment activates when roadmap tasks arrive from the mission gateway.</p>
          <div className="mini-agent-card">
            <span>GV</span>
            <strong>Live agent feed required</strong>
            <small>Use `agents.update` with roadmap events.</small>
          </div>
        </section>
        <section className="roadmap-board">
          {["Phase", "Sprint", "Epic", "User Story", "Task"].map((lane) => (
            <article className="panel roadmap-lane" key={lane}>
              <span>{lane}</span>
              <EmptyState title="No roadmap items" body={`Connect ${lane.toLowerCase()} records through the mission gateway.`} />
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

function CapabilityPlugins() {
  return (
    <ModuleBlueprint
      eyebrow="Capabilities"
      title="Capability Plugins"
      desc="Plugin slots are separated from runtime state so capabilities can be wired without raw template code."
      lanes={[
        { title: "Transport", body: "WebSocket, HTTP, browser event, and postMessage adapters." },
        { title: "Runtime", body: "Mission commands and live event handlers." },
        { title: "Workspace", body: "File save and local integration entrypoints." },
      ]}
      empty="Publish plugin capability records through the mission gateway to populate this view."
    />
  );
}

function BrainConfig() {
  return (
    <ModuleBlueprint
      eyebrow="Runtime Config"
      title="Brain & Config"
      desc="Configuration belongs in React state and gateway events, not in legacy inline script."
      lanes={[
        { title: "Models", body: "Model routing and profile metadata." },
        { title: "Memory", body: "Context, storage, and recall policies." },
        { title: "Safety", body: "Execution guardrails and transport constraints." },
      ]}
      empty="Connect model or runtime configuration events before this panel shows active settings."
    />
  );
}

function AstTreeView({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="AST" title="AST Hierarchy Tree" desc="B1 is the tree-oriented source view for Genesis Knowledge." />
      <section className="panel tree-panel">
        {snapshot.graph.nodes.length === 0 ? (
          <EmptyState title="No AST records" body="Publish AST nodes through snapshot.graph or graph.update to render the hierarchy." />
        ) : (
          snapshot.graph.nodes.map((node) => (
            <div className="tree-row" key={node.id}>
              <span>{node.id}</span>
              <strong>{node.label}</strong>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function IntelligenceZoo() {
  return (
    <ModuleBlueprint
      eyebrow="Experiments"
      title="Intelligence Zoo"
      desc="C2 groups capability experiments before they are promoted into stable mission workflows."
      lanes={[
        { title: "Candidate", body: "Experiments waiting for evaluation." },
        { title: "Observed", body: "Runs with collected behavior data." },
        { title: "Promoted", body: "Validated intelligence modules." },
      ]}
      empty="Publish experiment records through the mission gateway to activate the zoo."
    />
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
  if (activeView === "B2") return <RecordsView snapshot={snapshot} kind="specs" />;
  if (activeView === "B3" || activeView === "B4") return <GraphView snapshot={snapshot} title={activeView === "B3" ? "Interactive Knowledge Graph" : "Live Call Graph"} />;
  if (activeView === "C1") return <SymbolExplorerView snapshot={snapshot} />;
  if (activeView === "D2") return <Heatmap snapshot={snapshot} />;
  if (activeView === "D3") return <RecordsView snapshot={snapshot} kind="logs" />;
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
