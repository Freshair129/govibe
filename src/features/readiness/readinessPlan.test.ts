import { describe, expect, it } from "vitest";
import type { MissionSnapshot, RoadmapSnapshot, WorkflowTaskNode } from "../../mission";
import {
  countByState,
  findReadinessSource,
  groupPlanByPhase,
  isReadinessPlanPath,
  selectReadinessPlan,
} from "./readinessPlan";

const readinessPath = "docs/roadmap/MASTERPLAN-govibe-production-readiness.md";

function makeNode(partial: Partial<WorkflowTaskNode> & { id: string }): WorkflowTaskNode {
  return { type: "task", title: partial.id, state: "planned", sourcePath: readinessPath, ...partial } as WorkflowTaskNode;
}

function makePlan(nodes: WorkflowTaskNode[], sourcePath = readinessPath): RoadmapSnapshot {
  return { sourcePath, sourceType: "markdown", updatedAt: "2026-08-06T00:00:00Z", nodes, assignments: [], handoffs: [], verifications: [] };
}

function makeSnapshot(partial: Partial<MissionSnapshot>): MissionSnapshot {
  return {
    connectionState: "connected", metrics: [], chart: { labels: [], series: [] }, reactor: [], agents: [],
    capabilities: [], terminal: [], graph: { nodes: [], edges: [] }, specs: [], symbols: [], campaignLogs: [],
    ...partial,
  } as MissionSnapshot;
}

describe("readiness plan helpers", () => {
  it("matches only the readiness masterplan path", () => {
    expect(isReadinessPlanPath(readinessPath)).toBe(true);
    expect(isReadinessPlanPath("docs/roadmap/ROADMAP-govibe-mcp-runtime.html")).toBe(false);
    expect(isReadinessPlanPath(undefined)).toBe(false);
  });

  it("finds the readiness source in the live source list", () => {
    const sources = [
      { title: "Runtime", sourcePath: "docs/roadmap/ROADMAP-govibe-mcp-runtime.html", sourceType: "roadmap" as const, transportType: "html" as const, updatedAt: "", active: true },
      { title: "Readiness", sourcePath: readinessPath, sourceType: "masterplan" as const, transportType: "markdown" as const, updatedAt: "", active: false },
    ];
    expect(findReadinessSource(sources)?.title).toBe("Readiness");
    expect(findReadinessSource([])).toBeUndefined();
    expect(findReadinessSource(undefined)).toBeUndefined();
  });

  it("prefers the board source over the preview and reports its origin", () => {
    const boardPlan = makePlan([makeNode({ id: "PHASE-PRD-00", type: "phase" })]);
    const otherPlan = makePlan([], "docs/roadmap/ROADMAP-govibe-mcp-runtime.html");
    expect(selectReadinessPlan(makeSnapshot({ roadmap: boardPlan })).origin).toBe("board");
    expect(selectReadinessPlan(makeSnapshot({ roadmap: otherPlan, masterPlanPreview: boardPlan })).origin).toBe("preview");
    expect(selectReadinessPlan(makeSnapshot({ roadmap: otherPlan })).plan).toBeUndefined();
  });

  it("groups phases, sprints, and tasks by parent chain", () => {
    const nodes = [
      makeNode({ id: "RM-root", type: "roadmap" }),
      makeNode({ id: "PHASE-PRD-00", type: "phase" }),
      makeNode({ id: "SPR-PRD-00", type: "sprint", parentId: "PHASE-PRD-00" }),
      makeNode({ id: "TASK-PRD-001", parentId: "SPR-PRD-00", state: "in_progress" }),
      makeNode({ id: "TASK-PRD-011", parentId: "SPR-PRD-00" }),
    ];
    const groups = groupPlanByPhase(nodes);
    expect(groups).toHaveLength(1);
    expect(groups[0].sprints[0].tasks.map((task) => task.id)).toEqual(["TASK-PRD-001", "TASK-PRD-011"]);
  });

  it("counts node states without inventing entries", () => {
    const counts = countByState([
      makeNode({ id: "a", state: "planned" }),
      makeNode({ id: "b", state: "planned" }),
      makeNode({ id: "c", state: "in_progress" }),
    ]);
    expect(counts).toEqual({ planned: 2, in_progress: 1 });
  });
});
