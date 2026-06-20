import { useState } from "react";
import type { RoadmapSnapshot, TaskContainer, TaskContainerCriterion, WorkflowTaskNode } from "../../mission";
import { formatRoadmapState, getRoadmapAssignee, getRoadmapScope } from "./roadmapSelectors";

const UNAVAILABLE = "unavailable";
const isChecked = (value: TaskContainerCriterion["checked"]) => value === true || value === "true";
const isUnavailable = (value?: string) => !value || value.trim().toLowerCase() === UNAVAILABLE;

export function WorkflowTaskRow({ snapshot, node }: { snapshot: RoadmapSnapshot; node: WorkflowTaskNode }) {
  const [open, setOpen] = useState(false);
  const assignee = getRoadmapAssignee(snapshot, node);
  const container = snapshot.taskContainers?.find((item) => item.task_id === node.id);
  const rejected = !container || container.complete === false;

  const done = node.state === "done";
  const pending = !done && (node.state === "in_progress" || node.state === "qa_review" || node.state === "audit_review");
  const statusTone = rejected ? "rejected" : done ? "done" : pending ? "pending" : "idle";
  const statusIcon = rejected ? "✕" : done ? "●" : pending ? "◐" : "○";

  return (
    <article className={open ? "tt-task is-open task-item" : "tt-task task-item"} data-task-id={node.id} data-task-type={node.type} data-rejected={rejected}>
      <div className="tt-row">
        <div className="tt-left">
          <span className={`tt-status ${statusTone}`} aria-hidden="true">{statusIcon}</span>
          <button type="button" className="tt-chevron" aria-expanded={open} aria-label={open ? "Hide task detail" : "Show task detail"} onClick={() => setOpen((value) => !value)}>
            <span className={open ? "tt-caret open" : "tt-caret"}>▸</span>
          </button>
          <div className="tt-title-block">
            <strong className="tt-title">{node.title}</strong>
            <div className="tt-badge-row">
              <span className="tt-badge type">{container?.requirement_type ?? getRoadmapScope(node)}</span>
              {container?.complexity ? <span className="tt-badge state">{container.complexity}</span> : null}
              <span className="tt-badge state">{formatRoadmapState(node.state)}</span>
              {rejected ? (
                <span className="tt-badge reject">Rejected · no container</span>
              ) : (
                <>
                  <span className={isUnavailable(container?.symbol_links?.doc) ? "tt-verif" : "tt-verif active"} title="Doc link">D</span>
                  <span className={isUnavailable(container?.symbol_links?.code) ? "tt-verif" : "tt-verif active"} title="Code link">C</span>
                  <span className={isUnavailable(container?.symbol_links?.test) ? "tt-verif" : "tt-verif active"} title="Test link">T</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="tt-assign">
          <span className="tt-assign-lbl">Assign To:</span>
          <select value={container?.assignee ?? assignee} disabled aria-label={`Assignment for ${node.title}`}>
            <option>{container?.assignee ?? assignee}</option>
          </select>
        </div>
      </div>

      {open ? (
        rejected ? (
          <div className="tt-detail tt-reject">
            <div className="tt-reject-head">Task Container ถูกปฏิเสธ (Rejected)</div>
            <p className="tt-reject-body">
              {!container
                ? "ไม่มี Task Container ที่อนุมัติสำหรับงานนี้ในแหล่ง roadmap — ไม่เรนเดอร์ข้อมูลแทนของจริง"
                : "Task Container ไม่ครบตาม contract — งานนี้ถูกกันออกจากการเรนเดอร์รายละเอียด"}
            </p>
            {container?.missingFields?.length ? (
              <div className="tt-reject-fields">
                <span>Missing fields:</span>
                <ul>{container.missingFields.map((field) => <li key={`${node.id}-${field}`}><code>{field}</code></li>)}</ul>
              </div>
            ) : null}
          </div>
        ) : (
          <TaskContainerDetail node={node} container={container!} updatedAt={snapshot.updatedAt} />
        )
      ) : null}
    </article>
  );
}

function TaskContainerDetail({ node, container, updatedAt }: { node: WorkflowTaskNode; container: TaskContainer; updatedAt?: string }) {
  const sl = container.symbol_links ?? {};
  const tel = container.token_telemetry ?? {};
  const dod = container.definition_of_done ?? {};
  const meta = [
    { label: "Version", value: container.version },
    { label: "Complexity", value: container.complexity },
    { label: "Type", value: container.requirement_type },
    { label: "Status", value: container.status },
    { label: "Tokens Used", value: String(tel.total_token_usage ?? UNAVAILABLE) },
  ];
  const responsibility = [
    { label: "PIC", value: container.pic },
    { label: "Executor", value: container.executor },
    { label: "Approver", value: container.approver },
    { label: "Auditor", value: container.auditor },
  ];
  const dodColumns: { title: string; items: TaskContainerCriterion[] }[] = [
    { title: "Acceptance Criteria", items: dod.acceptance_criteria ?? [] },
    { title: "Success Criteria", items: dod.success_criteria ?? [] },
    { title: "Exit Criteria", items: dod.exit_criteria ?? [] },
  ];
  const telemetry = [
    ["model", tel.model_name], ["context", tel.context_length], ["predicted", tel.predicted_token_usage],
    ["in", tel.actual_input_tokens], ["out", tel.actual_output_tokens], ["tools", tel.tool_calling_tokens], ["total", tel.total_token_usage],
  ] as const;
  const exportEnabled = (flag?: string) => flag === "enabled";

  return (
    <div className="tt-detail">
      <div className="tt-detail-head">
        <span>Symbol Links</span>
        {isUnavailable(sl.code) && isUnavailable(sl.test) ? <span className="tt-notimpl">Partially Implemented</span> : null}
      </div>
      <div className="tt-links">
        <div className="tt-field"><span>Code Link:</span><code className={isUnavailable(sl.code) ? "muted" : ""}>{sl.code ?? UNAVAILABLE}</code></div>
        <div className="tt-field"><span>Doc Link:</span><code className={isUnavailable(sl.doc) ? "muted" : ""}>{sl.doc ?? UNAVAILABLE}</code></div>
        <div className="tt-field"><span>Test Link:</span><code className={isUnavailable(sl.test) ? "muted" : ""}>{sl.test ?? UNAVAILABLE}</code></div>
      </div>

      <div className="tt-meta">
        {meta.map((item) => (
          <div className="tt-field" key={`${node.id}-${item.label}`}>
            <span>{item.label}:</span>
            <em className={isUnavailable(item.value) ? "tt-pill muted" : "tt-pill"}>{item.value || UNAVAILABLE}</em>
          </div>
        ))}
      </div>

      <div className="tt-resp">
        {responsibility.map((item) => (
          <div className="tt-field" key={`${node.id}-${item.label}`}>
            <span>{item.label}:</span>
            <em className={isUnavailable(item.value) ? "tt-pill muted" : "tt-pill"}>{item.value || UNAVAILABLE}</em>
          </div>
        ))}
      </div>

      <div className="tt-dod">
        <span className="tt-section-lbl">Definition of Done (DoD):</span>
        <div className="tt-dod-grid">
          {dodColumns.map((col) => (
            <div className="tt-dod-col" key={`${node.id}-${col.title}`}>
              <span className="tt-dod-title">{col.title}</span>
              {col.items.map((item, index) => (
                <label className="tt-check" key={`${node.id}-${col.title}-${index}`}>
                  <span className={isChecked(item.checked) ? "tt-box on" : "tt-box"}>{isChecked(item.checked) ? "✓" : ""}</span>
                  {item.criterion}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="tt-telemetry">
        {telemetry.map(([label, value]) => (
          <span className="tt-tcell" key={`${node.id}-tel-${label}`}>{label} <b>{value ?? UNAVAILABLE}</b></span>
        ))}
      </div>

      <div className="tt-changelog-block">
        <span className="tt-section-lbl">Changelog:</span>
        <div className="tt-changelog">
          <code>{container.version ? `[${container.version}]` : "[unavailable]"} - {container.changelog ?? "No changelog logged."}</code>
          <code className="muted">[Updated: {container.last_update ?? updatedAt ?? UNAVAILABLE}]</code>
        </div>
      </div>

      <div className="tt-foot">
        <div className="tt-foot-meta">
          <small>Created: {container.created_at ?? UNAVAILABLE}</small>
          <small>Task ID: <b>{container.legacy_code ?? container.task_id}</b></small>
        </div>
        <div className="tt-export">
          <span>Export Task:</span>
          <button type="button" disabled={!exportEnabled(container.export?.json)}>JSON</button>
          <button type="button" disabled={!exportEnabled(container.export?.yaml)}>YAML</button>
          <button type="button" disabled={!exportEnabled(container.export?.markdown)}>Markdown</button>
        </div>
      </div>
    </div>
  );
}
