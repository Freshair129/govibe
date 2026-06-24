import type { MissionSnapshot } from "../../mission";

export type DerivedAgentStats = {
  taskCount: number;
  verifiedCount: number;
  passedCount: number;
  /** null when the agent has no verified tasks yet — render "—", never a fake 0%. */
  successRate: number | null;
};

const EMPTY: DerivedAgentStats = { taskCount: 0, verifiedCount: 0, passedCount: 0, successRate: null };

/**
 * Derive live per-agent stats from the document-driven roadmap snapshot.
 * Pure read of real assignment + verification state — no fabricated telemetry (PRODUCT.md).
 */
export function deriveAgentStats(snapshot: MissionSnapshot, agent: { id?: string; name?: string }): DerivedAgentStats {
  const roadmap = snapshot.roadmap;
  if (!roadmap) return EMPTY;

  const keys = new Set([agent.id, agent.name].filter(Boolean).map((value) => String(value).toLowerCase()));
  if (keys.size === 0) return EMPTY;
  const isMine = (subject?: string) => subject != null && keys.has(String(subject).toLowerCase());

  const taskIds = new Set<string>();
  for (const node of roadmap.nodes ?? []) {
    if (isMine(node.assigneeId)) taskIds.add(node.id);
  }
  for (const assignment of roadmap.assignments ?? []) {
    if (isMine(assignment.subjectId)) taskIds.add(assignment.taskId);
  }

  let verifiedCount = 0;
  let passedCount = 0;
  for (const verification of roadmap.verifications ?? []) {
    if (!taskIds.has(verification.taskId)) continue;
    if (verification.qaStatus === "passed" || verification.qaStatus === "failed") {
      verifiedCount += 1;
      if (verification.qaStatus === "passed") passedCount += 1;
    }
  }

  return {
    taskCount: taskIds.size,
    verifiedCount,
    passedCount,
    successRate: verifiedCount > 0 ? passedCount / verifiedCount : null,
  };
}
