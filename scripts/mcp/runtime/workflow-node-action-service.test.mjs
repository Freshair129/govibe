import { describe, expect, it, vi } from "vitest";
import { WorkflowNodeActionService, accessScopeGateFor } from "./workflow-node-action-service.mjs";

const FIXED_NOW = () => "2026-08-17T12:00:00.000Z";

function fakeContext(overrides = {}) {
  let snapshot = { roadmap: { taskContainers: [] }, auditLog: [], ...overrides };
  const store = {
    patch(patch) { snapshot = { ...snapshot, ...patch }; return snapshot; },
    emit: vi.fn(),
  };
  const applyRoadmapMutation = vi.fn(async (args) => ({ mutationType: args.mutationType, applied: true }));
  const service = new WorkflowNodeActionService({
    store,
    applyRoadmapMutation,
    getSnapshot: () => snapshot,
    now: FIXED_NOW,
  });
  return { service, store, applyRoadmapMutation, getSnapshot: () => snapshot };
}

describe("accessScopeGateFor", () => {
  it("names the C-3/H4 override gate for a C-3 Task Container", () => {
    expect(accessScopeGateFor({ complexity: "C-3" })).toBe("C-3/H4 owner approval override");
  });

  it("requires no gate for C-0..C-2 or an absent container", () => {
    expect(accessScopeGateFor({ complexity: "C-2" })).toBeNull();
    expect(accessScopeGateFor({ complexity: "C-1" })).toBeNull();
    expect(accessScopeGateFor(undefined)).toBeNull();
  });
});

describe("WorkflowNodeActionService", () => {
  it("rejects a missing taskId, actor, or an unknown action before touching the mutation engine", async () => {
    const { service, applyRoadmapMutation } = fakeContext();
    await expect(service.apply({ action: "approve", actor: "Boss" })).rejects.toThrow(/requires taskId/);
    await expect(service.apply({ taskId: "T1", action: "approve" })).rejects.toThrow(/requires actor/);
    await expect(service.apply({ taskId: "T1", action: "nuke", actor: "Boss" })).rejects.toThrow(/Unknown workflow node action/);
    expect(applyRoadmapMutation).not.toHaveBeenCalled();
  });

  it("refuses any action on a C-3 task without an approvalRef, naming the gate, and never calls the mutation engine", async () => {
    const { service, applyRoadmapMutation } = fakeContext({
      roadmap: { taskContainers: [{ task_id: "T1", complexity: "C-3" }] },
    });
    await expect(service.apply({ taskId: "T1", action: "approve", actor: "Boss" }))
      .rejects.toThrow(/requires C-3\/H4 owner approval override/);
    expect(applyRoadmapMutation).not.toHaveBeenCalled();
  });

  it("allows a C-3 action once an approvalRef is supplied", async () => {
    const { service, applyRoadmapMutation } = fakeContext({
      roadmap: { taskContainers: [{ task_id: "T1", complexity: "C-3" }] },
    });
    const result = await service.apply({ taskId: "T1", action: "approve", actor: "Boss", approvalRef: "owner-signoff-1" });
    expect(applyRoadmapMutation).toHaveBeenCalledTimes(1);
    expect(result.entry.approvalRef).toBe("owner-signoff-1");
  });

  it("never gates a C-2 (or lower) task, even without an approvalRef", async () => {
    const { service, applyRoadmapMutation } = fakeContext({
      roadmap: { taskContainers: [{ task_id: "T1", complexity: "C-2" }] },
    });
    await expect(service.apply({ taskId: "T1", action: "rerun", actor: "Boss" })).resolves.toBeTruthy();
    expect(applyRoadmapMutation).toHaveBeenCalledTimes(1);
  });

  it("maps 'assign' to an assignment mutation and requires assigneeId", async () => {
    const { service, applyRoadmapMutation } = fakeContext();
    await expect(service.apply({ taskId: "T1", action: "assign", actor: "Boss" })).rejects.toThrow(/requires assigneeId/);
    await service.apply({ taskId: "T1", action: "assign", actor: "Boss", assigneeId: "VIBE" });
    expect(applyRoadmapMutation).toHaveBeenCalledWith({
      mutationType: "assignment", nodeId: "T1",
      payload: { subjectId: "VIBE", subjectType: "agent", assignedBy: "Boss" },
    });
  });

  it("maps 'rerun' to a node.update mutation that re-queues the task", async () => {
    const { service, applyRoadmapMutation } = fakeContext();
    await service.apply({ taskId: "T1", action: "rerun", actor: "Boss" });
    expect(applyRoadmapMutation).toHaveBeenCalledWith({
      mutationType: "node.update", nodeId: "T1", payload: { state: "ready_for_assignment" },
    });
  });

  it("maps 'approve' to a verification mutation recording a pass, never inventing a new field", async () => {
    const { service, applyRoadmapMutation } = fakeContext();
    await service.apply({ taskId: "T1", action: "approve", actor: "Boss" });
    expect(applyRoadmapMutation).toHaveBeenCalledWith({
      mutationType: "verification", nodeId: "T1", payload: { auditStatus: "passed" },
    });
  });

  it("appends an audit entry with actor, taskId, action, and timestamp, and emits workflow.node.audit", async () => {
    const { service, store, getSnapshot } = fakeContext();
    const result = await service.apply({ taskId: "T1", action: "approve", actor: "Boss" });
    expect(result.entry).toMatchObject({ actor: "Boss", taskId: "T1", action: "approve", at: "2026-08-17T12:00:00.000Z" });
    expect(getSnapshot().auditLog).toEqual([result.entry]);
    expect(store.emit).toHaveBeenCalledWith({ type: "workflow.node.audit", entry: result.entry });
  });

  it("caps the audit log at 200 entries, dropping the oldest first", async () => {
    let snapshot = { roadmap: { taskContainers: [] }, auditLog: Array.from({ length: 200 }, (_, i) => ({ id: `old-${i}`, actor: "x", taskId: "x", action: "approve", at: "t" })) };
    const store = { patch: (patch) => { snapshot = { ...snapshot, ...patch }; }, emit: vi.fn() };
    const applyRoadmapMutation = vi.fn(async () => ({}));
    const service = new WorkflowNodeActionService({ store, applyRoadmapMutation, getSnapshot: () => snapshot, now: FIXED_NOW });
    await service.apply({ taskId: "T-new", action: "approve", actor: "Boss" });
    expect(snapshot.auditLog).toHaveLength(200);
    expect(snapshot.auditLog[0].id).toBe("old-1");
    expect(snapshot.auditLog.at(-1).taskId).toBe("T-new");
  });
});
