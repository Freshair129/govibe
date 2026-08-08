import type { MissionSnapshot, RoadmapSnapshot, RoadmapSourceRecord, WorkflowTaskNode } from "../../mission";

export const READINESS_PLAN_PATH_FRAGMENT = "MASTERPLAN-govibe-production-readiness";

export function isReadinessPlanPath(path?: string): boolean {
  return typeof path === "string" && path.includes(READINESS_PLAN_PATH_FRAGMENT);
}

export function findReadinessSource(sources?: RoadmapSourceRecord[]): RoadmapSourceRecord | undefined {
  return sources?.find((source) => isReadinessPlanPath(source.sourcePath));
}

export type ReadinessPlanSelection = {
  plan: RoadmapSnapshot | undefined;
  origin: "board" | "preview" | undefined;
};

export function selectReadinessPlan(snapshot: MissionSnapshot): ReadinessPlanSelection {
  if (isReadinessPlanPath(snapshot.roadmap?.sourcePath)) {
    return { plan: snapshot.roadmap, origin: "board" };
  }
  if (isReadinessPlanPath(snapshot.masterPlanPreview?.sourcePath)) {
    return { plan: snapshot.masterPlanPreview, origin: "preview" };
  }
  return { plan: undefined, origin: undefined };
}

export function countByState(nodes: WorkflowTaskNode[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const node of nodes) {
    counts[node.state] = (counts[node.state] ?? 0) + 1;
  }
  return counts;
}

export type ReadinessPhaseGroup = {
  phase: WorkflowTaskNode;
  sprints: Array<{ sprint: WorkflowTaskNode; tasks: WorkflowTaskNode[] }>;
};

export function groupPlanByPhase(nodes: WorkflowTaskNode[]): ReadinessPhaseGroup[] {
  const phases = nodes.filter((node) => node.type === "phase");
  const sprints = nodes.filter((node) => node.type === "sprint");
  return phases.map((phase) => ({
    phase,
    sprints: sprints
      .filter((sprint) => sprint.parentId === phase.id)
      .map((sprint) => ({
        sprint,
        tasks: nodes.filter((node) => node.parentId === sprint.id && node.type !== "phase" && node.type !== "sprint"),
      })),
  }));
}
