import { useState } from "react";
import type { MissionCommand, MissionSnapshot, ThemeMode } from "../../mission";
import { useCanvasChart } from "../../hooks/useCanvasChart";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

function StageScanPanel({ snapshot, send }: { snapshot: MissionSnapshot; send: (command: MissionCommand) => Promise<void> | void }) {
  const [workspacePath, setWorkspacePath] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const latestScan = [...(snapshot.workflowRuns ?? [])].reverse().find((run) => run.kind === "scan");

  async function runScan() {
    if (!workspacePath.trim()) return;
    setSubmitting(true);
    try {
      await send({ type: "workspace.scan", workspacePath: workspacePath.trim(), deep: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel stage-scan-panel">
      <div className="stage-scan-heading">
        <div><h2>12-stage Workspace Scan</h2><p>Runs through GoVibe and records only external GKS/MSP references.</p></div>
        {latestScan ? <strong className={`scan-status ${latestScan.status}`}>{latestScan.status}</strong> : null}
      </div>
      <div className="stage-scan-controls">
        <label htmlFor="workspace-scan-path">Workspace path</label>
        <input id="workspace-scan-path" value={workspacePath} onChange={(event) => setWorkspacePath(event.target.value)} placeholder="C:\\project\\workspace" />
        <button type="button" onClick={() => void runScan()} disabled={submitting || !workspacePath.trim()}>{submitting ? "Running scan…" : "Run 12 stages"}</button>
      </div>
      {latestScan?.stageRuns?.length ? (
        <ol className="stage-run-list">
          {latestScan.stageRuns.map((stage) => <li key={stage.stage} className={`stage-${stage.status}`}><span>{String(stage.stage).padStart(2, "0")}</span><strong>{stage.name}</strong><em>{stage.status}</em></li>)}
        </ol>
      ) : <EmptyState title="No deep scan recorded" body="Enter a configured workspace path to run the canonical twelve stages." />}
      {latestScan?.graphValidation && <small className="stage-validation">Graph validation: {latestScan.graphValidation.passed ? "passed" : latestScan.graphValidation.errors?.join(", ") ?? "incomplete"}</small>}
    </section>
  );
}

export function RealTimeDashboard({ snapshot, theme, send }: { snapshot: MissionSnapshot; theme: ThemeMode; send: (command: MissionCommand) => Promise<void> | void }) {
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
        <StageScanPanel snapshot={snapshot} send={send} />
        <section className="panel">
          <h2>Workflow Runs</h2>
          {(snapshot.workflowRuns ?? []).length > 0 ? snapshot.workflowRuns?.map((run) => (
            <div className="kv-row" key={run.runId}>
              <span>{run.runId}</span>
              <strong>{run.status} · {run.currentTask ?? "complete"}</strong>
            </div>
          )) : <EmptyState title="No workflow runs" body="Create a GoVibe plan to populate evidence-backed run state." />}
        </section>
        <section className="panel">
          <h2>Executor Providers</h2>
          {(snapshot.providers ?? []).map((provider) => (
            <div className="kv-row" key={provider.id}>
              <span>{provider.id}</span>
              <strong>{provider.available ? "available" : "degraded"}</strong>
            </div>
          ))}
        </section>
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
