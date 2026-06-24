import { useMemo, useState } from "react";
import type {
  AgentRecord,
  MissionCommand,
  MissionSnapshot,
  OrchestrationWave,
  WaveTask,
  WaveTaskStatus,
} from "../../mission";
import { EmptyState } from "../../shared/EmptyState";

// Phase 5 — Visual Fleet. Renders the live AutonomyController state (snapshot.orchestration):
// the roadmap DAG's waves as parallel lanes, each task a fleet cell that transitions as the
// wave.*/step.* event stream arrives. Live-data-only: when the runtime has no orchestration
// snapshot, it shows an honest empty state instead of inventing lanes.

const TASK_STATUS_LABEL: Record<WaveTaskStatus, string> = {
  queued: "Queued",
  running: "Running",
  verifying: "Verifying",
  handoff: "Handoff",
  blocked: "Blocked",
  done: "Done",
  failed: "Failed",
};

function waveSummary(waves: OrchestrationWave[]) {
  const summary = { pending: 0, active: 0, complete: 0, skipped: 0 };
  for (const wave of waves) {
    if (wave.status in summary) summary[wave.status as keyof typeof summary] += 1;
  }
  return summary;
}

function FleetCell({ task, agent }: { task: WaveTask; agent?: AgentRecord }) {
  const label = agent?.name ?? task.assigneeId ?? "unassigned";
  return (
    <div className={`fleet-cell fleet-cell--${task.status}`} title={`${task.taskId} · ${TASK_STATUS_LABEL[task.status]}`}>
      <span className="fleet-cell__dot" aria-hidden="true" style={agent?.accent ? { background: agent.accent } : undefined} />
      <span className="fleet-cell__task">{task.taskId}</span>
      <span className="fleet-cell__assignee">{label}</span>
      <span className={`fleet-cell__status fleet-cell__status--${task.status}`}>
        {TASK_STATUS_LABEL[task.status]}
        {task.attempts && task.attempts > 1 ? ` ·${task.attempts}` : ""}
      </span>
    </div>
  );
}

export function FleetWaves({ snapshot, send }: { snapshot: MissionSnapshot; send: (command: MissionCommand) => void }) {
  const [pending, setPending] = useState(false);
  const waves = snapshot.orchestration?.waves ?? [];
  const agentsById = useMemo(() => new Map(snapshot.agents.map((agent) => [agent.id, agent])), [snapshot.agents]);
  const summary = useMemo(() => waveSummary(waves), [waves]);
  const taskTotal = useMemo(() => waves.reduce((total, wave) => total + wave.taskIds.length, 0), [waves]);

  const runPlan = () => {
    setPending(true);
    void send({ type: "orchestrate.run", execute: false });
    // The event stream drives the lanes; clear the local pending hint shortly after dispatch.
    window.setTimeout(() => setPending(false), 1200);
  };

  const runLive = () => {
    const ok = window.confirm(
      "Live autonomy run spawns real agents, runs real lint/build/test gates, and advances the roadmap until a human gate blocks it. Continue?",
    );
    if (!ok) return;
    setPending(true);
    void send({ type: "orchestrate.run", execute: true });
    window.setTimeout(() => setPending(false), 1200);
  };

  return (
    <section className="fleet-waves">
      <header className="fleet-waves__head">
        <div>
          <h3 className="fleet-waves__title">Visual Fleet · Wave Orchestration</h3>
          <p className="fleet-waves__sub">
            {waves.length > 0
              ? `${waves.length} wave${waves.length === 1 ? "" : "s"} · ${taskTotal} task${taskTotal === 1 ? "" : "s"} · ${summary.complete} complete · ${summary.active} active`
              : "AutonomyController plan from the live roadmap DAG."}
          </p>
        </div>
        <div className="fleet-waves__actions">
          <button type="button" className="fleet-btn" onClick={runPlan} disabled={pending || waves.length === 0}>
            {pending ? "Dispatching…" : "Plan (dry-run)"}
          </button>
          <button type="button" className="fleet-btn fleet-btn--live" onClick={runLive} disabled={pending || waves.length === 0}>
            Live run
          </button>
        </div>
      </header>

      {waves.length === 0 ? (
        <EmptyState
          title="No orchestration plan yet"
          body="The runtime has not produced a wave plan. Load an approved roadmap source so the AutonomyController can derive the DAG and waves."
        />
      ) : (
        <div className="fleet-lanes">
          {waves.map((wave) => (
            <article key={wave.id} className={`fleet-lane fleet-lane--${wave.status}`}>
              <div className="fleet-lane__head">
                <span className="fleet-lane__index">Wave {wave.index + 1}</span>
                <span className={`fleet-lane__status fleet-lane__status--${wave.status}`}>{wave.status}</span>
                <span className="fleet-lane__meta">
                  ⇶ {wave.concurrency ?? wave.taskIds.length} parallel
                </span>
              </div>
              <div className="fleet-lane__cells">
                {wave.tasks.map((task) => (
                  <FleetCell key={task.taskId} task={task} agent={agentsById.get(task.assigneeId ?? "")} />
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
