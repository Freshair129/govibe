import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";
import { viewTitle } from "../../mission/navigation";

export function Heatmap({ snapshot }: { snapshot: MissionSnapshot }) {
  return (
    <div className="view-stack">
      <ViewHeader eyebrow="AI Benchmark" title={viewTitle("D2")} />
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
