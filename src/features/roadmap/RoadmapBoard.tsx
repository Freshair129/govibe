import { useState } from "react";
import type { MissionSnapshot } from "../../mission";
import { downloadRoadmapExport as triggerRoadmapExport } from "../../roadmapExport";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";
import { RoadmapAgentCard } from "./RoadmapAgentCard";
import { WorkflowTaskRow } from "./WorkflowTaskRow";
import {
  formatRoadmapState,
  getPrimaryRoadmapPhase,
  getRoadmapScope,
  getRoadmapStats,
} from "./roadmapSelectors";

export function RoadmapBoard({ snapshot }: { snapshot: MissionSnapshot }) {
  const [openPhase, setOpenPhase] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const receivedRoadmap = snapshot.roadmap;
  const roadmap = receivedRoadmap?.approvalStatus?.toLowerCase() === "approved" ? receivedRoadmap : undefined;
  const stats = getRoadmapStats(roadmap);
  const livePhase = getPrimaryRoadmapPhase(roadmap);
  const sourceState = roadmap
    ? `${roadmap.approvalStatus} · ${roadmap.sourceType}`
    : receivedRoadmap
      ? `blocked · ${receivedRoadmap.approvalStatus ?? "missing approval status"}`
      : snapshot.connectionState;

  return (
    <div className="view-stack">
      <section className="panel roadmap-header">
        <div className="roadmap-header-top">
          <ViewHeader eyebrow="Planning" title="GoVibe Development Roadmap" desc="Roadmap state should come from approved docs and live mission events." />
        </div>
        <div className="roadmap-progress">
          <span>Project progress</span>
          <strong>{stats.label}</strong>
          <div><i style={{ width: `${stats.progress}%` }} /></div>
        </div>
        <div className="roadmap-stats">
          <article><strong>{stats.totalFeatures}</strong><span>Feature ทั้งหมด</span></article>
          <article><strong>{stats.readyFeatures}</strong><span>พร้อมใช้งาน / IMP แล้ว</span></article>
          <article><strong>{stats.backlogTasks}</strong><span>Task ใน Backlog</span></article>
        </div>
        <div className="roadmap-actions">
          <div className="roadmap-source-meta">
            <span className={`status-pill ${roadmap ? "online" : "idle"}`}>{sourceState}</span>
            {roadmap ? <code>{roadmap.sourcePath}</code> : null}
          </div>
          <div className="roadmap-action-group">
            <div className="export-menu">
              <button
                type="button"
                onClick={() => setExportMenuOpen((value) => !value)}
                disabled={!roadmap}
                title={roadmap ? "Export approved roadmap snapshot" : "Export requires an approved roadmap source"}
                aria-expanded={exportMenuOpen}
              >
                Export
              </button>
              {exportMenuOpen && roadmap ? (
                <div>
                  <button type="button" onClick={() => { triggerRoadmapExport(roadmap, stats, "json"); setExportMenuOpen(false); }}>JSON</button>
                  <button type="button" onClick={() => { triggerRoadmapExport(roadmap, stats, "yaml"); setExportMenuOpen(false); }}>YAML</button>
                  <button type="button" onClick={() => { triggerRoadmapExport(roadmap, stats, "md"); setExportMenuOpen(false); }}>Markdown</button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setOpenPhase(true);
                setExportMenuOpen(false);
              }}
            >
              Reset Board
            </button>
          </div>
        </div>
      </section>
      <div className="roadmap-layout">
        <section className="panel assist-roster">
          <h2>AI Assist Roster</h2>
          <p>Agents shown here come from the current mission snapshot.</p>
          {snapshot.agents.length > 0 ? snapshot.agents.map((agent) => (
            <RoadmapAgentCard key={agent.id} agent={agent} />
          )) : (
            <EmptyState title="No live agent roster" body="Connect the mission runtime or publish an agents.update event." />
          )}
        </section>
        <section className="panel roadmap-accordion">
          <button className="phase-header" type="button" onClick={() => setOpenPhase((value) => !value)}>
            <span>{livePhase?.phase.type === "roadmap" ? "Roadmap" : livePhase ? getRoadmapScope(livePhase.phase) : "No source"}</span>
            <strong>{livePhase?.phase.title ?? "No approved roadmap connected"}</strong>
            <em>{livePhase ? formatRoadmapState(livePhase.phase.state) : sourceState}</em>
          </button>
          {openPhase ? (
            <div className="task-list">
              {livePhase ? (
                <>
                  <p>{livePhase.phase.summary ?? `Live roadmap source: ${roadmap?.sourcePath ?? "connected event source"}`}</p>
                  {livePhase.sprintShells.length > 0 ? livePhase.sprintShells.map(({ sprint, isDerived, tasks }) => (
                    <section className="sprint-shell" key={sprint.id}>
                      <div className="sprint-shell-header">
                        <div className="sprint-shell-title">
                          <span>{isDerived ? "Sprint shell" : getRoadmapScope(sprint)}</span>
                          <strong>{sprint.title}</strong>
                        </div>
                        <div className="sprint-shell-meta">
                          <em>{isDerived ? "derived" : formatRoadmapState(sprint.state)}</em>
                          <em>Duration: unavailable</em>
                          <em>Progress: {typeof sprint.progress === "number" ? `${sprint.progress}%` : "unavailable"}</em>
                        </div>
                      </div>
                      <p>{sprint.summary ?? "Sprint summary unavailable."}</p>
                      {tasks.length > 0 ? tasks.map((node) => (
                        <WorkflowTaskRow key={node.id} snapshot={roadmap!} node={node} />
                      )) : (
                        <EmptyState title="No tasks in sprint shell" body="The roadmap snapshot is connected, but this sprint shell does not include actionable task nodes yet." />
                      )}
                    </section>
                  )) : (
                    <EmptyState title="No sprint shell available" body="The approved roadmap phase is connected, but no sprint shell or actionable task nodes are available yet." />
                  )}
                </>
              ) : (
                <EmptyState
                  title={receivedRoadmap ? "Roadmap source is not approved" : "No approved roadmap connected"}
                  body={receivedRoadmap
                    ? `${receivedRoadmap.sourcePath} reports approval status '${receivedRoadmap.approvalStatus ?? "missing"}' and cannot drive live UI state.`
                    : "Start the GoVibe mission runtime with an approved roadmap source to view executable tasks."}
                />
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
