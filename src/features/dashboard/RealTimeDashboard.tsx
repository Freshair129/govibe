import type { MissionSnapshot, ThemeMode } from "../../mission";
import { useCanvasChart } from "../../hooks/useCanvasChart";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

export function RealTimeDashboard({ snapshot, theme }: { snapshot: MissionSnapshot; theme: ThemeMode }) {
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
