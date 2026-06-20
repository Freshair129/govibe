import type { RoadmapSnapshot, RoadmapSourceRecord, WorkflowTaskNode } from "../../mission";

const actionableRoadmapTypes = new Set(["task", "sub-task", "micro-task", "atomic-task"]);

export function formatRoadmapState(state: string) {
  return state.replace(/_/g, " ");
}

export function getRoadmapScope(node: WorkflowTaskNode) {
  return node.type.replace(/-/g, " ").toUpperCase();
}

export function getRoadmapAssignee(snapshot: RoadmapSnapshot, node: WorkflowTaskNode) {
  const assignment = snapshot.assignments.find((item) => item.taskId === node.id);
  return assignment?.subjectId ?? node.assigneeId ?? "Unassigned";
}

export function getRoadmapVerificationBadges(snapshot: RoadmapSnapshot, node: WorkflowTaskNode) {
  const verification = snapshot.verifications.find((item) => item.taskId === node.id);
  return [
    verification?.qaStatus ? `QA ${verification.qaStatus}` : "QA pending",
    verification?.auditStatus ? `Audit ${verification.auditStatus}` : "Audit pending",
    verification?.deploymentStatus ? `Deploy ${verification.deploymentStatus}` : "Deploy n/a",
  ];
}

export function getRoadmapSourceMeta(snapshot: RoadmapSnapshot, node: WorkflowTaskNode) {
  const sourcePath = snapshot.sourcePath ?? node.sourcePath;
  const sourceSection = node.sourceSection;
  if (!sourcePath && !sourceSection) return null;
  return { sourcePath, sourceSection };
}

export function formatRoadmapSourceType(sourceType: RoadmapSourceRecord["sourceType"] | NonNullable<RoadmapSnapshot["planningType"]>) {
  return sourceType.replace(/-/g, " ").toUpperCase();
}

export function formatRoadmapScore(snapshot?: RoadmapSnapshot) {
  if (!snapshot || typeof snapshot.score !== "number") return "Unranked";
  return `Score ${snapshot.score}`;
}

export function formatRoadmapTabLabel(source: RoadmapSourceRecord) {
  return {
    title: source.title || source.sourcePath,
    hint: formatRoadmapSourceType(source.sourceType),
  };
}

export function formatRoadmapScoreBreakdown(scoreBreakdown?: string[]) {
  if (!scoreBreakdown || scoreBreakdown.length === 0) return "No score reason available";
  return scoreBreakdown.join(" · ");
}

export function getRoadmapStats(snapshot?: RoadmapSnapshot) {
  if (!snapshot) {
    return {
      totalFeatures: 0,
      readyFeatures: 0,
      backlogTasks: 0,
      progress: 0,
      label: "No approved source",
    };
  }

  const actionableNodes = snapshot.nodes.filter((node) => actionableRoadmapTypes.has(node.type));
  const totalFeatures = actionableNodes.length;
  const readyFeatures = actionableNodes.filter((node) => node.state === "done").length;
  const backlogTasks = actionableNodes.filter((node) => node.state !== "done").length;
  const progress = totalFeatures > 0
    ? Math.round(actionableNodes.reduce((sum, node) => sum + (node.progress ?? (node.state === "done" ? 100 : 0)), 0) / totalFeatures)
    : 0;

  return {
    totalFeatures,
    readyFeatures,
    backlogTasks,
    progress,
    label: totalFeatures > 0 ? `${progress}% Live` : "Waiting for source",
  };
}

export function getPrimaryRoadmapPhase(snapshot?: RoadmapSnapshot) {
  if (!snapshot) return null;

  const rootRoadmap = snapshot.nodes.find((node) => node.type === "roadmap");
  const phaseNode = snapshot.nodes.find((node) => node.type === "phase") ?? rootRoadmap;
  if (!phaseNode) return null;

  const phaseChildren = snapshot.nodes.filter((node) => node.parentId === phaseNode.id);
  const fallbackChildren = snapshot.nodes.filter((node) => node.id !== phaseNode.id && node.type !== "roadmap" && node.type !== "phase");
  const sprintNodes = phaseChildren.filter((node) => node.type === "sprint");

  if (sprintNodes.length > 0) {
    return {
      phase: phaseNode,
      sprintShells: sprintNodes.map((sprintNode) => ({
        sprint: sprintNode,
        isDerived: false,
        tasks: snapshot.nodes.filter((node) => node.parentId === sprintNode.id && actionableRoadmapTypes.has(node.type)),
      })),
    };
  }

  return {
    phase: phaseNode,
    sprintShells: [
      {
        sprint: {
          ...phaseNode,
          id: `${phaseNode.id}-derived-sprint-shell`,
          type: "sprint" as const,
          title: "Sprint shell",
          summary: phaseNode.summary ?? "Derived from the current phase because no sprint node is available in the approved roadmap snapshot.",
          progress: undefined,
        },
        isDerived: true,
        tasks: (phaseChildren.length > 0 ? phaseChildren : fallbackChildren).filter((node) => actionableRoadmapTypes.has(node.type)),
      },
    ],
  };
}

export function getRoadmapSprintContext(snapshot: RoadmapSnapshot, node: WorkflowTaskNode) {
  const nodeById = new Map(snapshot.nodes.map((item) => [item.id, item]));
  let current: WorkflowTaskNode | undefined = node;

  while (current?.parentId) {
    const parent = nodeById.get(current.parentId);
    if (!parent) break;
    if (parent.type === "sprint") {
      return parent;
    }
    current = parent;
  }

  return undefined;
}
