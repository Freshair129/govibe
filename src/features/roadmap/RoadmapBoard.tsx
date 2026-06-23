import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { MissionCommand, MissionSnapshot } from "../../mission";
import { downloadRoadmapExport as triggerRoadmapExport } from "../../roadmapExport";
import { EmptyState } from "../../shared/EmptyState";
import { RoadmapAgentCard } from "./RoadmapAgentCard";
import { WorkflowTaskRow } from "./WorkflowTaskRow";
import {
  formatRoadmapScore,
  formatRoadmapSourceType,
  formatRoadmapState,
  formatRoadmapTabLabel,
  getAgentRoadmapStats,
  getPrimaryRoadmapPhase,
  getRoadmapScope,
  getRoadmapStats,
} from "./roadmapSelectors";

type DragState = {
  sourceCard: HTMLElement | null;
  floatEl: HTMLElement | null;
  offsetX: number;
  offsetY: number;
  agentId: string | null;
  agentAccent: string;
  hoveredTask: HTMLElement | null;
};

export function RoadmapBoard({ snapshot, send }: { snapshot: MissionSnapshot; send?: (command: MissionCommand) => Promise<void> | void }) {
  const [openPhase, setOpenPhase] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [switchingSource, setSwitchingSource] = useState(false);
  const [draggingAgentId, setDraggingAgentId] = useState<string | null>(null);
  const receivedRoadmap = snapshot.roadmap;
  const roadmap = receivedRoadmap?.approvalStatus?.toLowerCase() === "approved" ? receivedRoadmap : undefined;
  const roadmapSources = (snapshot.roadmapSources ?? []).filter((source) => source.approvalStatus?.toLowerCase() === "approved");
  const stats = getRoadmapStats(roadmap);
  const livePhase = getPrimaryRoadmapPhase(roadmap);
  const sourceState = roadmap
    ? `${roadmap.approvalStatus} · ${roadmap.sourceType}`
    : receivedRoadmap
      ? `blocked · ${receivedRoadmap.approvalStatus ?? "missing approval status"}`
      : snapshot.connectionState;
  const activeSourcePath = roadmap?.sourcePath ?? roadmapSources.find((source) => source.active)?.sourcePath ?? "";
  const dragStateRef = useRef<DragState>({
    sourceCard: null,
    floatEl: null,
    offsetX: 0,
    offsetY: 0,
    agentId: null,
    agentAccent: "#10b981",
    hoveredTask: null,
  });

  const clearTaskHover = useCallback(() => {
    const current = dragStateRef.current;
    if (current.hoveredTask) {
      current.hoveredTask.classList.remove("task-drop-hover", "drop-ready");
      if (!current.hoveredTask.classList.contains("task-drop-commit")) {
        current.hoveredTask.style.removeProperty("--drop-accent");
      }
      current.hoveredTask = null;
    }
  }, []);

  const resetDrag = useCallback((updateState = true) => {
    const current = dragStateRef.current;
    current.floatEl?.remove();
    current.floatEl = null;
    current.sourceCard?.classList.remove("agent-card-dragging");
    if (current.sourceCard) {
      current.sourceCard.style.cursor = "";
    }
    current.sourceCard = null;
    current.agentId = null;
    current.agentAccent = "#10b981";
    current.offsetX = 0;
    current.offsetY = 0;
    clearTaskHover();
    if (updateState) {
      setDraggingAgentId(null);
    }
    document.body.style.userSelect = "";
  }, [clearTaskHover]);

  const findTaskItem = useCallback((clientX: number, clientY: number) => {
    const current = dragStateRef.current;
    if (current.floatEl) {
      current.floatEl.style.display = "none";
    }
    const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (current.floatEl) {
      current.floatEl.style.display = "";
    }
    return (hit?.closest(".task-item") as HTMLElement | null) ?? null;
  }, []);

  const setTaskHover = useCallback((taskEl: HTMLElement, agentAccent: string) => {
    const current = dragStateRef.current;
    if (current.hoveredTask === taskEl) return;
    clearTaskHover();
    current.hoveredTask = taskEl;
    taskEl.classList.add("task-drop-hover", "drop-ready");
    taskEl.style.setProperty("--drop-accent", agentAccent);
  }, [clearTaskHover]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const current = dragStateRef.current;
      if (!current.floatEl || !current.sourceCard || event.pointerType === "touch") return;

      current.floatEl.style.left = `${event.clientX - current.offsetX}px`;
      current.floatEl.style.top = `${event.clientY - current.offsetY}px`;

      const taskEl = findTaskItem(event.clientX, event.clientY);
      if (taskEl) {
        setTaskHover(taskEl, current.agentAccent);
      } else {
        clearTaskHover();
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const current = dragStateRef.current;
      if (!current.floatEl || !current.sourceCard || event.pointerType === "touch") return;

      const taskEl = findTaskItem(event.clientX, event.clientY);
      if (taskEl && current.agentId) {
        taskEl.style.setProperty("--drop-accent", current.agentAccent);
        taskEl.classList.add("task-drop-commit");
        window.setTimeout(() => {
          taskEl.classList.remove("task-drop-commit");
          taskEl.style.removeProperty("--drop-accent");
        }, 720);
      }

      resetDrag();
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [clearTaskHover, findTaskItem, resetDrag, setTaskHover]);

  useEffect(() => () => {
    resetDrag(false);
  }, [resetDrag]);

  async function handleSourceChange(nextSourcePath: string) {
    if (!send || !nextSourcePath || nextSourcePath === roadmap?.sourcePath) return;
    setSwitchingSource(true);
    try {
      await send({ type: "roadmap.select", sourcePath: nextSourcePath });
      setOpenPhase(true);
      setExportMenuOpen(false);
    } finally {
      setSwitchingSource(false);
    }
  }

  function startAgentDrag(event: ReactPointerEvent<HTMLElement>, agentId: string, agentAccent: string) {
    if (event.button !== 0 || event.pointerType === "touch") return;
    if (event.target instanceof Element && (event.target.closest("button") || event.target.closest("select") || event.target.closest("input"))) {
      return;
    }

    event.preventDefault();
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const clone = target.cloneNode(true) as HTMLElement;

    clone.classList.add("agent-drag-float");
    clone.classList.remove("is-dragging");
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.setProperty("--tilt-x", "0deg");
    clone.style.setProperty("--tilt-y", "0deg");
    clone.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
    clone.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
    clone.style.pointerEvents = "none";
    clone.setAttribute("aria-hidden", "true");
    document.body.appendChild(clone);

    dragStateRef.current = {
      sourceCard: target,
      floatEl: clone,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      agentId,
      agentAccent,
      hoveredTask: null,
    };

    target.classList.add("agent-card-dragging");
    target.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    setDraggingAgentId(agentId);
  }

  function updateAgentRaycast(event: ReactPointerEvent<HTMLElement>) {
    const current = dragStateRef.current;
    if (current.floatEl || current.sourceCard !== event.currentTarget || event.pointerType === "touch") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateX = ((rect.height / 2 - y) / (rect.height / 2)) * 12;
    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 14;

    event.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    event.currentTarget.style.setProperty("--mouse-y", `${y}px`);
    event.currentTarget.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
  }

  function resetAgentRaycast(event: ReactPointerEvent<HTMLElement>) {
    if (dragStateRef.current.sourceCard === event.currentTarget && dragStateRef.current.floatEl) return;
    event.currentTarget.style.setProperty("--mouse-x", "50%");
    event.currentTarget.style.setProperty("--mouse-y", "50%");
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div className="view-stack a2-template-board">
      <section className="a2-roadmap-header-card">
        <div className="a2-roadmap-header-top">
          <div className="a2-roadmap-title">
            <strong>GoVibe Development Roadmap</strong>
            <p>แผนการพัฒนาและติดตามผลความคืบหน้าของฟีเจอร์</p>
          </div>
          <div className="a2-roadmap-progress">
            <span className="a2-roadmap-progress-label">ความคืบหน้ารวมโครงการ</span>
            <strong className="a2-roadmap-progress-value">{roadmap ? `${stats.progress}%` : stats.label}</strong>
          </div>
        </div>
        <div className="a2-roadmap-progress-bar"><i style={{ width: `${stats.progress}%` }} /></div>
        <hr className="a2-roadmap-divider" />
        <div className="a2-roadmap-footer-row">
          <div className="a2-roadmap-stats">
            <article className="a2-roadmap-stat"><strong style={{ color: "var(--muted)" }}>{stats.totalFeatures}</strong><span>Feature ทั้งหมด</span></article>
            <article className="a2-roadmap-stat"><strong style={{ color: "#10b981" }}>{stats.readyFeatures}</strong><span>พร้อมใช้งาน / IMP แล้ว</span></article>
            <article className="a2-roadmap-stat"><strong style={{ color: "#f59e0b" }}>{stats.backlogTasks}</strong><span>Task ใน Backlog</span></article>
          </div>
          <div className="a2-roadmap-actions">
            <div className="a2-roadmap-source-meta">
              <span className={`status-pill ${roadmap ? "online" : "idle"}`}>{sourceState}</span>
              {roadmap ? <code>{roadmap.sourcePath}</code> : null}
              {roadmap ? <span>{formatRoadmapScore(roadmap)}</span> : null}
            </div>
            <div className="a2-roadmap-export-menu">
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
                <div className="a2-roadmap-export-menu-panel">
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
        {roadmapSources.length > 0 ? (
          <div className="a2-roadmap-tab-strip" aria-label="Approved roadmap sources">
            {roadmapSources.map((source) => {
              const { title, hint } = formatRoadmapTabLabel(source);
              const isActive = source.sourcePath === activeSourcePath;
              return (
                <button
                  key={source.sourcePath}
                  type="button"
                  className={isActive ? "a2-roadmap-tab is-active" : "a2-roadmap-tab"}
                  onClick={() => void handleSourceChange(source.sourcePath)}
                  disabled={switchingSource || isActive}
                  aria-pressed={isActive}
                  title={`${title} · ${formatRoadmapSourceType(source.sourceType)} · ${source.score ?? 0}`}
                >
                  <span>{title}</span>
                  <small>{hint}</small>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>
      <div className="a2-roadmap-layout">
        <section className="a2-roster-panel">
          <div className="a2-roster-head">
            <div>
              <strong>AI Assist Roster</strong>
              <span>Agents shown here come from the current mission snapshot.</span>
            </div>
          </div>
          <div className="a2-roster-grid">
            {snapshot.agents.length > 0 ? snapshot.agents.map((agent) => (
              <RoadmapAgentCard
                key={agent.id}
                agent={agent}
                stats={getAgentRoadmapStats(roadmap, agent.id)}
                dragging={draggingAgentId === agent.id}
                onPointerDown={(event, nextAgent) => startAgentDrag(event, nextAgent.id, nextAgent.accent ?? "#10b981")}
                onPointerMove={updateAgentRaycast}
                onPointerLeave={resetAgentRaycast}
              />
            )) : (
              <EmptyState title="No live agent roster" body="Connect the mission runtime or publish an agents.update event." />
            )}
          </div>
        </section>
        <section className="a2-roadmap-panel">
          <div className="a2-panel-head">
            <div>
              <strong>แผนงานพัฒนา (Execution view)</strong>
              <span>บอร์ดนี้ขับเคลื่อนด้วยแหล่งแผนงานที่อนุมัติแล้ว — masterplan ที่ข้อมูลน้อยจะแสดงตามจริง</span>
            </div>
          </div>
          <button className="a2-roadmap-phase-toggle" type="button" onClick={() => setOpenPhase((value) => !value)}>
            <span>{livePhase?.phase.type === "roadmap" ? "Roadmap" : livePhase ? getRoadmapScope(livePhase.phase) : "No source"}</span>
            <strong>{livePhase?.phase.title ?? "No approved roadmap connected"}</strong>
            <em>{livePhase ? formatRoadmapState(livePhase.phase.state) : sourceState}</em>
          </button>
          {openPhase ? (
            <div className="a2-roadmap-accordion-body">
              {livePhase ? (
                <>
                  <p className="a2-roadmap-empty-note">{livePhase.phase.summary ?? `Live roadmap source: ${roadmap?.sourcePath ?? "connected event source"}`}</p>
                  {livePhase.sprintShells.length > 0 ? livePhase.sprintShells.map(({ sprint, isDerived, tasks }) => (
                    <section className="a2-sprint-shell" key={sprint.id}>
                      <div className="a2-sprint-head">
                        <div className="a2-sprint-title">
                          <span className="a2-sprint-type">{isDerived ? "Sprint shell" : getRoadmapScope(sprint)}</span>
                          <strong>{sprint.title}</strong>
                        </div>
                        <div className="a2-sprint-meta">
                          <em>{isDerived ? "derived" : formatRoadmapState(sprint.state)}</em>
                          <em>Duration: unavailable</em>
                          <em>Progress: {typeof sprint.progress === "number" ? `${sprint.progress}%` : "unavailable"}</em>
                        </div>
                      </div>
                      <p className="a2-sprint-note">{sprint.summary ?? "Sprint summary unavailable."}</p>
                      <div className="a2-sprint-tasks">
                        {tasks.length > 0 ? tasks.map((node) => (
                          <WorkflowTaskRow key={node.id} snapshot={roadmap!} node={node} />
                        )) : (
                          <EmptyState title="No tasks in sprint shell" body="The roadmap snapshot is connected, but this sprint shell does not include actionable task nodes yet." />
                        )}
                      </div>
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
