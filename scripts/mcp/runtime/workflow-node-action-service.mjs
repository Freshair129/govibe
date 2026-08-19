import { MISSION_PROTOCOL_LIMITS } from "../../../packages/mission-protocol/index.js";

// ADR-029 governed actions: Mission Canvas lets a human approve, rerun, or
// reassign a node, but the mutation itself is never invented here — every
// action is a thin, audited wrapper over the roadmap mutation engine that
// already exists (RoadmapService#applyRoadmapMutation), the same primitive
// every other roadmap-editing surface uses.

const WORKFLOW_NODE_ACTIONS = new Set(["approve", "rerun", "assign"]);
const AUDIT_LOG_MAX_ENTRIES = 200;

// CLAUDE.md's canonical governance axes: "C-3/H4 is an explicit upward
// override... requires owner approval before implementation." A Task
// Container's complexity is the only place that access tier is recorded
// today, so the gate reads it from there rather than inventing a parallel
// access_scope field on WorkflowTaskNode.
export function accessScopeGateFor(taskContainer) {
  if (taskContainer?.complexity === "C-3") return "C-3/H4 owner approval override";
  return null;
}

function mutationForAction({ action, taskId, assigneeId, actor }) {
  if (action === "assign") {
    if (!assigneeId) throw new Error("workflow.node.action 'assign' requires assigneeId.");
    return { mutationType: "assignment", nodeId: taskId, payload: { subjectId: assigneeId, subjectType: "agent", assignedBy: actor } };
  }
  if (action === "rerun") {
    // Moves a done/blocked task back onto the DAG's ready frontier; computeWaves
    // re-queues anything whose dag-derived status is no longer "done".
    return { mutationType: "node.update", nodeId: taskId, payload: { state: "ready_for_assignment" } };
  }
  // action === "approve": the closest existing WorkflowVerification field to
  // "a human signed off on this" is auditStatus, not a new invented field.
  return { mutationType: "verification", nodeId: taskId, payload: { auditStatus: "passed" } };
}

export class WorkflowNodeActionService {
  #store;
  #applyRoadmapMutation;
  #getSnapshot;
  #now;
  #approvalStore;

  constructor({ store, applyRoadmapMutation, getSnapshot, now = () => new Date().toISOString(), approvalStore }) {
    this.#store = store;
    this.#applyRoadmapMutation = applyRoadmapMutation;
    this.#getSnapshot = getSnapshot;
    this.#now = now;
    // TASK-PRD-029 (AUD-08): required for any gated (C-3) action — see the fail-closed check
    // below. Ungated actions (C-0..C-2) never touch it, so a caller with no gated tasks can
    // still omit it, but a caller that DOES route gated actions here must configure it.
    this.#approvalStore = approvalStore;
  }

  async apply({ taskId, action, actor, assigneeId, approvalRef }) {
    if (!taskId) throw new Error("workflow.node.action requires taskId.");
    if (!actor) throw new Error("workflow.node.action requires actor.");
    if (!WORKFLOW_NODE_ACTIONS.has(action)) {
      throw new Error(`Unknown workflow node action "${action}" (allowed: ${[...WORKFLOW_NODE_ACTIONS].join(", ")}).`);
    }

    const container = (this.#getSnapshot().roadmap?.taskContainers ?? []).find((item) => item.task_id === taskId);
    const gate = accessScopeGateFor(container);
    let verifiedApproval = null;
    if (gate) {
      if (!approvalRef) {
        throw new Error(`Action refused: task ${taskId} requires ${gate} before "${action}" can run (ADR-021).`);
      }
      if (!this.#approvalStore) {
        // Fail closed: a gated task with no approval-record store configured must never fall
        // through to "any non-empty approvalRef passes" — that is exactly the AUD-08 gap.
        throw new Error(`Action refused: task ${taskId} requires ${gate}, but no approval record store is configured to verify it against (fail closed).`);
      }
      // TASK-PRD-029 (AUD-08): verify the presented ref against a RECORDED approval whose
      // scope covers this task and complexity — an unverifiable ref is refused rather than
      // accepted as ceremony. `container.complexity` is always "C-3" here (accessScopeGateFor
      // only names a gate for C-3), included explicitly so the approval is bound to the
      // access-scope override it authorizes, not just the task id.
      verifiedApproval = await this.#approvalStore.verifyApproval({
        approvalRef,
        requiredScope: { taskId, complexity: container.complexity },
      });
    }

    const mutation = await this.#applyRoadmapMutation(mutationForAction({ action, taskId, assigneeId, actor }));

    const entry = {
      id: crypto.randomUUID(),
      actor,
      taskId,
      action,
      at: this.#now(),
      ...(approvalRef ? { approvalRef } : {}),
      // Links the audited action back to the verified approval record so the chain (who
      // approved, under what scope, when) is reconstructable from the audit log alone.
      ...(verifiedApproval ? { approvalApprover: verifiedApproval.approver, approvalRecordedAt: verifiedApproval.recordedAt } : {}),
    };
    this.#appendAudit(entry);

    return { action, taskId, entry, mutation };
  }

  #appendAudit(entry) {
    const auditLog = [...(this.#getSnapshot().auditLog ?? []), entry].slice(-AUDIT_LOG_MAX_ENTRIES);
    this.#store.patch({ auditLog });
    this.#store.emit({ type: "workflow.node.audit", entry });
  }
}

// Exported for tests that need the protocol's own bound without importing
// the whole mission-protocol module just for one number.
export const AUDIT_LOG_CAP = Math.min(AUDIT_LOG_MAX_ENTRIES, MISSION_PROTOCOL_LIMITS.arrayItems);
