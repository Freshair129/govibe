import type { AgentRecord } from "../../mission";

export function AgentFleetMetadataPanel({ agent }: { agent: AgentRecord }) {
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
