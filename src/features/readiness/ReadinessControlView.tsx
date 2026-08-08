import type { MissionCommand, MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";
import { countByState, findReadinessSource, groupPlanByPhase, selectReadinessPlan } from "./readinessPlan";

export function ReadinessControlView({ snapshot, send }: { snapshot: MissionSnapshot; send: (command: MissionCommand) => void }) {
  const source = findReadinessSource(snapshot.roadmapSources);
  const { plan, origin } = selectReadinessPlan(snapshot);
  const groups = plan ? groupPlanByPhase(plan.nodes) : [];
  const counts = plan ? countByState(plan.nodes.filter((node) => node.type !== "roadmap")) : {};

  return (
    <div className="view-stack">
      <ViewHeader
        eyebrow="Project Overview"
        title="Readiness Control"
        desc="Tracking and command surface for the production-readiness masterplan. All data comes from the live roadmap feed; status is edited in the plan document, never here."
      />

      <section className="panel" aria-label="Readiness plan registration">
        <h2>Plan Registration</h2>
        {source ? (
          <ul>
            <li>Source: {source.sourcePath}</li>
            <li>Approval: {source.approvalStatus ?? "unknown"}</li>
            <li>Active board source: {source.active ? "yes" : "no"}</li>
            <li>Score: {source.score ?? "not scored (draft sources are unscored)"}</li>
            <li>Updated: {source.updatedAt ?? "unknown (no authored update date)"}</li>
          </ul>
        ) : (
          <EmptyState
            title="Readiness plan not in the roadmap feed"
            body="snapshot.roadmapSources has no entry matching MASTERPLAN-govibe-production-readiness. Connect the sidecar transport, then issue Reload sources."
          />
        )}
        {source && source.approvalStatus !== "approved" ? (
          <p>
            Draft plan: the board accepts approved sources only (promotion contract), so Load onto
            board will be rejected until the owner ratifies the plan. Use Preview to track it.
          </p>
        ) : null}
        <div className="ingest-actions">
          <button type="button" disabled={!source} onClick={() => source && send({ type: "roadmap.select", sourcePath: source.sourcePath })}>
            Load onto board
          </button>
          <button type="button" disabled={!source} onClick={() => source && send({ type: "masterplan.preview", sourcePath: source.sourcePath })}>
            Preview
          </button>
          <button type="button" onClick={() => send({ type: "terminal.command", command: "roadmap reload" })}>
            Reload sources
          </button>
        </div>
      </section>

      {plan ? (
        <>
          <section className="panel" aria-label="Readiness plan state summary">
            <h2>State Summary ({origin === "board" ? "board source" : "preview"})</h2>
            <ul>
              {Object.entries(counts).map(([state, count]) => (
                <li key={state}>
                  {state}: {count}
                </li>
              ))}
            </ul>
          </section>
          <section className="record-grid" aria-label="Readiness phases">
            {groups.map(({ phase, sprints }) => (
              <article className="panel" key={phase.id}>
                <h2>
                  {phase.id} — {phase.title}
                </h2>
                <p>
                  state: {phase.state}
                  {typeof phase.progress === "number" ? ` · progress: ${phase.progress}%` : ""}
                </p>
                {sprints.map(({ sprint, tasks }) => (
                  <div key={sprint.id}>
                    <h3>
                      {sprint.id} ({sprint.state})
                    </h3>
                    <ul>
                      {tasks.map((task) => (
                        <li key={task.id}>
                          [{task.state}] {task.id} — {task.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </article>
            ))}
          </section>
        </>
      ) : (
        <EmptyState
          title="Readiness plan not loaded"
          body="Neither the board source nor the Master Plan preview currently holds the readiness plan. Use Load onto board or Preview above to pull it through the live command channel."
        />
      )}
    </div>
  );
}
