import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";
import { BrainConfig } from "../config/BrainConfig";
import "./context-operations.css";

const governedCommands = [
  "govibe.vault.status",
  "govibe.vault.mount",
  "govibe.context.resolve",
  "govibe.context.diff",
  "govibe.context.audit",
  "govibe.context.replay",
  "govibe.memory.promote",
];

function commandState(snapshot: MissionSnapshot, name: string) {
  return snapshot.capabilities.some((capability) => capability.id === name) ? "registered" : "unavailable";
}

function latestEvidence(snapshot: MissionSnapshot) {
  return [...snapshot.terminal]
    .reverse()
    .filter((line) => /context|vault|replay|impact|policy|MSP/i.test(line.text))
    .slice(0, 8);
}

export function ContextOperationsView({ snapshot }: { snapshot: MissionSnapshot }) {
  const evidence = latestEvidence(snapshot);
  const latestRun = [...(snapshot.workflowRuns ?? [])].reverse()[0];
  const mspProvider = (snapshot.providers ?? []).find((provider) => /msp/i.test(provider.id));
  const impactRegistered = snapshot.capabilities.some((capability) => capability.id === "govibe.workspace.impact");

  return (
    <div className="view-stack">
      <ViewHeader
        eyebrow="Governed context"
        title="Vault, Context & Impact"
        desc="Read-only operational surface for MSP-mediated vault state, context lineage, replay evidence, and dependency impact. Missing evidence is shown as unavailable rather than invented."
      />

      <div className="context-status-grid">
        <article className="panel context-status-card">
          <span>MSP boundary</span>
          <strong>{mspProvider ? (mspProvider.available ? "available" : "degraded") : "not reported"}</strong>
          <small>GoVibe → MSP only. No direct GKS or GenesisBlockDB authority.</small>
        </article>
        <article className="panel context-status-card">
          <span>Latest workflow</span>
          <strong>{latestRun?.status ?? "no run"}</strong>
          <small>{latestRun?.runId ?? "No lineage-bearing workflow has been reported."}</small>
        </article>
        <article className="panel context-status-card">
          <span>Impact engine</span>
          <strong>{impactRegistered ? "registered" : "unavailable"}</strong>
          <small>Requires observed graph coverage before affected-artifact claims are trusted.</small>
        </article>
      </div>

      <div className="context-ops-grid">
        <section className="panel">
          <h2>Governed command surface</h2>
          <div className="context-command-list">
            {governedCommands.map((name) => (
              <div className="kv-row" key={name}>
                <code>{name}</code>
                <strong className={`context-state ${commandState(snapshot, name)}`}>{commandState(snapshot, name)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Lineage & policy evidence</h2>
          {evidence.length > 0 ? (
            <ol className="context-evidence-list">
              {evidence.map((line) => (
                <li key={line.id}>
                  <time>{line.time}</time>
                  <span>{line.text}</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="No context evidence reported"
              body="Run a governed vault, context, replay, or impact operation. The UI will not fabricate context IDs, hashes, policy decisions, or replayability."
            />
          )}
        </section>

        <section className="panel context-trust-panel">
          <h2>Trust gates</h2>
          <div className="kv-row"><span>Source hashes</span><strong>required</strong></div>
          <div className="kv-row"><span>Policy decision</span><strong>allow / deny / shadow</strong></div>
          <div className="kv-row"><span>Replay source version</span><strong>exact match</strong></div>
          <div className="kv-row"><span>Promotion evidence</span><strong>mandatory</strong></div>
          <div className="kv-row"><span>Blocked reason</span><strong>must be explicit</strong></div>
        </section>
      </div>

      <BrainConfig />
    </div>
  );
}
