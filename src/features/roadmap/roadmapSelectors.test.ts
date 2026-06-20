import { describe, expect, it } from "vitest";
import type { RoadmapSnapshot, WorkflowTaskNode } from "../../mission";
import {
  formatRoadmapState,
  formatRoadmapScore,
  formatRoadmapScoreBreakdown,
  formatRoadmapSourceType,
  getPrimaryRoadmapPhase,
  getRoadmapAssignee,
  getRoadmapScope,
  getRoadmapSourceMeta,
  getRoadmapStats,
  getRoadmapVerificationBadges,
} from "./roadmapSelectors";

function createNode(overrides: Partial<WorkflowTaskNode> = {}): WorkflowTaskNode {
  return {
    id: "task-1",
    type: "task",
    title: "Example task",
    state: "in_progress",
    ...overrides,
  };
}

function createSnapshot(overrides: Partial<RoadmapSnapshot> = {}): RoadmapSnapshot {
  return {
    sourcePath: "docs/roadmap/ROADMAP-example.md",
    sourceType: "markdown",
    updatedAt: "2026-06-19T12:00:00.000Z",
    nodes: [],
    assignments: [],
    handoffs: [],
    verifications: [],
    ...overrides,
  };
}

describe("roadmapSelectors", () => {
  it("formats roadmap state and scope labels for display", () => {
    expect(formatRoadmapState("ready_for_assignment")).toBe("ready for assignment");
    expect(getRoadmapScope(createNode({ type: "micro-task" }))).toBe("MICRO TASK");
    expect(formatRoadmapSourceType("masterplan")).toBe("MASTERPLAN");
    expect(formatRoadmapScore()).toBe("Unranked");
    expect(formatRoadmapScore(createSnapshot({ score: 62 }))).toBe("Score 62");
    expect(formatRoadmapScoreBreakdown(["approved", "roadmap", "task-rich"])).toBe("approved · roadmap · task-rich");
  });

  it("prefers assignment records before node assignee fallback", () => {
    const node = createNode({ assigneeId: "node-owner" });
    const snapshot = createSnapshot({
      assignments: [
        {
          taskId: node.id,
          subjectId: "assignment-owner",
          subjectType: "agent",
          policyModel: "ABAC",
          assignedAt: "2026-06-19T12:00:00.000Z",
        },
      ],
    });

    expect(getRoadmapAssignee(snapshot, node)).toBe("assignment-owner");
    expect(getRoadmapAssignee(createSnapshot(), createNode({ assigneeId: "node-owner" }))).toBe("node-owner");
    expect(getRoadmapAssignee(createSnapshot(), createNode())).toBe("Unassigned");
  });

  it("builds verification badges with honest pending defaults", () => {
    const node = createNode();
    const snapshot = createSnapshot({
      verifications: [
        {
          taskId: node.id,
          qaStatus: "passed",
          auditStatus: "failed",
          deploymentStatus: "n/a",
        },
      ],
    });

    expect(getRoadmapVerificationBadges(snapshot, node)).toEqual(["QA passed", "Audit failed", "Deploy n/a"]);
    expect(getRoadmapVerificationBadges(createSnapshot(), node)).toEqual(["QA pending", "Audit pending", "Deploy n/a"]);
  });

  it("returns source metadata only when at least one source field exists", () => {
    const node = createNode({ sourceSection: "Runtime Core" });
    expect(getRoadmapSourceMeta(createSnapshot(), node)).toEqual({
      sourcePath: "docs/roadmap/ROADMAP-example.md",
      sourceSection: "Runtime Core",
    });

    expect(getRoadmapSourceMeta(createSnapshot({ sourcePath: "" }), createNode())).toBeNull();
  });

  it("computes roadmap stats from actionable nodes only", () => {
    const snapshot = createSnapshot({
      nodes: [
        createNode({ id: "task-done", state: "done", progress: 100 }),
        createNode({ id: "task-live", state: "in_progress", progress: 50 }),
        createNode({ id: "epic-1", type: "epic", state: "done", progress: 100 }),
      ],
    });

    expect(getRoadmapStats()).toEqual({
      totalFeatures: 0,
      readyFeatures: 0,
      backlogTasks: 0,
      progress: 0,
      label: "No approved source",
    });

    expect(getRoadmapStats(snapshot)).toEqual({
      totalFeatures: 2,
      readyFeatures: 1,
      backlogTasks: 1,
      progress: 75,
      label: "75% Live",
    });
  });

  it("returns explicit sprint shells when sprint nodes exist", () => {
    const phase = createNode({ id: "phase-1", type: "phase", title: "Phase 1" });
    const sprint = createNode({ id: "sprint-1", parentId: "phase-1", type: "sprint", title: "Sprint 1" });
    const task = createNode({ id: "task-1", parentId: "sprint-1", type: "task" });
    const snapshot = createSnapshot({ nodes: [phase, sprint, task] });

    const result = getPrimaryRoadmapPhase(snapshot);
    expect(result?.phase.id).toBe("phase-1");
    expect(result?.sprintShells).toHaveLength(1);
    expect(result?.sprintShells[0]).toMatchObject({
      isDerived: false,
      sprint: { id: "sprint-1" },
    });
    expect(result?.sprintShells[0].tasks.map((item) => item.id)).toEqual(["task-1"]);
  });

  it("derives a sprint shell from the phase when no sprint node exists", () => {
    const phase = createNode({
      id: "phase-1",
      type: "phase",
      title: "Phase 1",
      summary: "Phase summary",
    });
    const task = createNode({ id: "task-1", parentId: "phase-1", type: "task" });
    const snapshot = createSnapshot({ nodes: [phase, task] });

    const result = getPrimaryRoadmapPhase(snapshot);
    expect(result?.phase.id).toBe("phase-1");
    expect(result?.sprintShells).toHaveLength(1);
    expect(result?.sprintShells[0]).toMatchObject({
      isDerived: true,
      sprint: {
        id: "phase-1-derived-sprint-shell",
        type: "sprint",
        title: "Sprint shell",
      },
    });
    expect(result?.sprintShells[0].tasks.map((item) => item.id)).toEqual(["task-1"]);
  });
});
