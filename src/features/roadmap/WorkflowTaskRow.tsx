import { useState } from "react";
import type { RoadmapSnapshot, WorkflowTaskNode } from "../../mission";
import {
  formatRoadmapState,
  getRoadmapAssignee,
  getRoadmapScope,
  getRoadmapSourceMeta,
  getRoadmapVerificationBadges,
} from "./roadmapSelectors";

export function WorkflowTaskRow({ snapshot, node }: { snapshot: RoadmapSnapshot; node: WorkflowTaskNode }) {
  const [expanded, setExpanded] = useState(false);
  const assignee = getRoadmapAssignee(snapshot, node);
  const badges = getRoadmapVerificationBadges(snapshot, node);
  const sourceMeta = getRoadmapSourceMeta(snapshot, node);
  const verification = snapshot.verifications.find((item) => item.taskId === node.id);
  const availabilityBadges = [
    sourceMeta?.sourcePath ? "Doc linked" : "Doc unavailable",
    "Code unavailable",
    "Test unavailable",
    `Progress ${typeof node.progress === "number" ? `${node.progress}%` : "unavailable"}`,
  ];
  const metadataItems = [
    { label: "Version", value: node.version ?? "unavailable" },
    { label: "Complexity", value: "unavailable" },
    { label: "Type", value: getRoadmapScope(node) },
    { label: "Status", value: formatRoadmapState(node.state) },
    { label: "Tokens used", value: "unavailable" },
  ];
  const responsibilityItems = [
    { label: "PIC", value: "unavailable" },
    { label: "Executor", value: assignee },
    { label: "Approver", value: "unavailable" },
    { label: "Auditor", value: verification?.auditStatus ? `Audit ${verification.auditStatus}` : "unavailable" },
  ];
  const dodColumns = [
    { title: "Acceptance Criteria", items: ["Spec approval unavailable", "Docs update unavailable"] },
    { title: "Success Criteria", items: ["Code completion unavailable", "Lint proof unavailable"] },
    { title: "Exit Criteria", items: ["Tests unavailable", "Regression status unavailable"] },
  ];
  const taskStateTone = node.state === "done" ? "is-complete" : "is-active";
  const renderDetailCardClass = (value: string) => value === "unavailable" ? "task-detail-card unavailable" : "task-detail-card";

  return (
    <article className={expanded ? "roadmap-task-row expanded" : "roadmap-task-row"}>
      <div className="roadmap-task-main">
        <div className="roadmap-task-head">
          <div className="roadmap-task-title-group">
            <span>{getRoadmapScope(node)}</span>
            <strong>{node.title}</strong>
          </div>
          <div className="task-badges">
            <em className={taskStateTone}>{formatRoadmapState(node.state)}</em>
            {badges.map((badge) => <em key={`${node.id}-${badge}`}>{badge}</em>)}
          </div>
        </div>
        {node.summary ? <p>{node.summary}</p> : null}
        <div className="task-availability-row">
          {availabilityBadges.map((badge) => <em key={`${node.id}-${badge}`}>{badge}</em>)}
        </div>
        {sourceMeta ? (
          <div className="task-source-meta" aria-label={`Source for ${node.title}`}>
            <span>Source</span>
            {sourceMeta.sourceSection ? <code>{sourceMeta.sourceSection}</code> : null}
            {sourceMeta.sourcePath ? <small>{sourceMeta.sourcePath}</small> : null}
          </div>
        ) : null}
      </div>
      <div className="roadmap-task-side">
        <button
          type="button"
          className="task-detail-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Hide detail" : "Show detail"}
        </button>
        <label>
          Assign to
          <select value={assignee} disabled aria-label={`Assignment for ${node.title}`}>
            <option>{assignee}</option>
          </select>
        </label>
        <div className="task-side-note">
          <span>Detail view</span>
          <strong>{expanded ? "Active" : "MT-A2-03"}</strong>
          <small>{expanded ? "Runtime-backed skeleton with unavailable placeholders" : "Task dropdown available"}</small>
        </div>
      </div>
      {expanded ? (
        <div className="task-detail-panel">
          <section className="task-detail-section">
            <div className="task-detail-section-head">
              <strong>SYMBOL LINKS</strong>
              <span>Only approved source references render here. Missing task-container links stay unavailable.</span>
            </div>
            <div className="task-detail-grid compact">
              <article className="task-detail-card unavailable"><span>Code link</span><code>unavailable</code></article>
              <article className={renderDetailCardClass(sourceMeta?.sourcePath ?? "unavailable")}><span>Doc link</span><code>{sourceMeta?.sourcePath ?? "unavailable"}</code></article>
              <article className="task-detail-card unavailable"><span>Test link</span><code>unavailable</code></article>
            </div>
          </section>
          <section className="task-detail-section">
            <div className="task-detail-section-head">
              <strong>Metadata</strong>
              <span>Snapshot-backed fields appear directly. Template-only telemetry remains unavailable.</span>
            </div>
            <div className="task-detail-grid">
              {metadataItems.map((item) => (
                <article className={renderDetailCardClass(item.value)} key={`${node.id}-${item.label}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>
          <section className="task-detail-section">
            <div className="task-detail-section-head">
              <strong>Responsibility</strong>
              <span>Assignment stays separate from approval and audit placeholders until runtime publishes them.</span>
            </div>
            <div className="task-detail-grid">
              {responsibilityItems.map((item) => (
                <article className={renderDetailCardClass(item.value)} key={`${node.id}-${item.label}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>
          <section className="task-detail-section">
            <div className="task-detail-section-head">
              <strong>DEFINITION OF DONE (DOD)</strong>
              <span>Checklist structure matches the template while unresolved task-container proof stays explicit.</span>
            </div>
            <div className="task-dod-columns">
              {dodColumns.map((column) => (
                <div key={`${node.id}-${column.title}`}>
                  <span>{column.title}</span>
                  <ul>
                    {column.items.map((item) => <li key={`${node.id}-${column.title}-${item}`}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
          <section className="task-detail-section">
            <div className="task-detail-section-head">
              <strong>CHANGELOG</strong>
              <span>Derived from the approved roadmap node and current mission snapshot timestamp.</span>
            </div>
            <div className="task-changelog">
              <code>{node.version ? `[${node.version}]` : "[unavailable]"} Detail snapshot generated from approved roadmap node.</code>
              <small>Task ID: {node.id}</small>
              <small>Updated: {snapshot.updatedAt ?? "unavailable"}</small>
            </div>
          </section>
          <section className="task-detail-footer">
            <div className="task-detail-meta">
              <small>Created: unavailable</small>
              <small>Task ID: {node.id}</small>
            </div>
            <div className="task-export-actions">
              <span>EXPORT TASK</span>
              <button type="button" disabled>JSON</button>
              <button type="button" disabled>YAML</button>
              <button type="button" disabled>Markdown</button>
            </div>
          </section>
        </div>
      ) : null}
    </article>
  );
}
