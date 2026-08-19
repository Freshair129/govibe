import { useState } from "react";
import type { MissionCommand } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

// TASK-PRD-020 (AUD-07): this view previously fabricated a hardcoded model roster with
// invented benchmark results, randomly-generated "real-time" hardware telemetry, a
// simulated GGUF download/benchmark lifecycle, and canned "Telemetry Replay Logs" -- all
// presented as live state in violation of the live-data-only product rule (PRODUCT.md).
// None of that had a real producer: there is no benchmark/telemetry feed wired into
// MissionSnapshot (see scripts/mcp/runtime/snapshot-store.mjs) and reactor.run is
// acknowledged as a no-op by scripts/mcp/runtime/mission-command-router.mjs. This
// replacement removes every fabricated value and shows only what is real: the trigger
// button (which reports the backend's actual acknowledgement, not a simulated run) and
// the on-disk model config list, labeled honestly as static config -- not telemetry.

// @ts-ignore -- JSON import; no type declarations shipped for local_model fixtures.
import autoScannedModels from "../../../local_model/auto_scanned_models.json";

interface StaticModelConfig {
  id: string;
  displayName: string;
  tag: string;
  hfUrl: string;
  category: string;
  configFile: string;
  paramSize: string;
  quantization: string;
  sizeGb: number;
}

function isStaticModelConfig(value: unknown): value is StaticModelConfig {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.displayName === "string" && typeof record.tag === "string";
}

// Real, on-disk data written by the local model scanner ahead of time -- a static config
// snapshot, not a live feed. Every benchmark field on these records (passRate/avgLatency/tps)
// is genuinely 0/unset in the source file, so this view does not render them as if measured.
const STATIC_MODEL_CONFIGS: StaticModelConfig[] = Array.isArray(autoScannedModels)
  ? (autoScannedModels as unknown[]).filter(isStaticModelConfig)
  : [];

export function ReactorRunTrigger({ send }: { send: (command: MissionCommand) => void }) {
  const [runStatus, setRunStatus] = useState<string | null>(null);

  const triggerReactorRun = () => {
    send({ type: "reactor.run", profile: "standalone_default" });
    setRunStatus(
      "reactor.run sent to the backend. The router acknowledges receipt (see the Terminal panel) " +
        "but there is no benchmark execution engine wired to it -- this is a no-op, not a completed run."
    );
  };

  return (
    <div className="view-stack" style={{ gap: "1.5rem" }}>
      <ViewHeader
        eyebrow="GoVibe Standalone Governance"
        title="Reactor Run Trigger"
        desc="No live benchmark or hardware-telemetry feed is wired to this view. It sends the real reactor.run command and reports the backend's actual response -- it does not simulate a run."
      />

      <EmptyState
        title="No live benchmark or telemetry feed connected"
        body="MissionSnapshot has no benchmark/hardware-telemetry producer for D1 (see scripts/mcp/runtime/snapshot-store.mjs). Hardware usage, VRAM residency, model download progress, and benchmark pass/fail results shown here previously were fabricated in the browser and have been removed."
      />

      <section className="panel" aria-label="Reactor run trigger">
        <h2>Trigger reactor.run</h2>
        <p>
          Sends a <code>reactor.run</code> mission command. Today{" "}
          <code>scripts/mcp/runtime/mission-command-router.mjs</code> acknowledges the command and logs it
          to the terminal, but does not run an actual benchmark -- no benchmark runner is implemented yet.
        </p>
        <div className="ingest-actions">
          <button type="button" onClick={triggerReactorRun}>
            Send reactor.run
          </button>
        </div>
        {runStatus ? <EmptyState title="Backend status: acknowledged, unimplemented" body={runStatus} /> : null}
      </section>

      <section className="panel" aria-label="Local model configs" style={{ overflowX: "auto" }}>
        <h2>Local Model Configs (static, on-disk -- not live telemetry)</h2>
        {STATIC_MODEL_CONFIGS.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr>
                <th style={{ padding: "0.5rem" }}>Model</th>
                <th style={{ padding: "0.5rem" }}>Category</th>
                <th style={{ padding: "0.5rem" }}>Params</th>
                <th style={{ padding: "0.5rem" }}>Quantization</th>
                <th style={{ padding: "0.5rem" }}>Size (GB)</th>
                <th style={{ padding: "0.5rem" }}>Config file</th>
              </tr>
            </thead>
            <tbody>
              {STATIC_MODEL_CONFIGS.map((model) => (
                <tr key={model.id}>
                  <td style={{ padding: "0.5rem" }}>
                    <a href={model.hfUrl} target="_blank" rel="noreferrer">
                      {model.displayName}
                    </a>
                    <div style={{ fontFamily: "monospace", fontSize: "0.75rem", opacity: 0.7 }}>{model.tag}</div>
                  </td>
                  <td style={{ padding: "0.5rem" }}>{model.category}</td>
                  <td style={{ padding: "0.5rem" }}>{model.paramSize}</td>
                  <td style={{ padding: "0.5rem" }}>{model.quantization}</td>
                  <td style={{ padding: "0.5rem" }}>{model.sizeGb}</td>
                  <td style={{ padding: "0.5rem", fontFamily: "monospace", fontSize: "0.75rem" }}>{model.configFile}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No local model configs on disk"
            body="local_model/auto_scanned_models.json has no entries. Run the local model scanner to populate it."
          />
        )}
      </section>
    </div>
  );
}
