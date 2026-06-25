// Temporal Memory Distillation — the 8-8-8 cadence (FEAT-PER-AGENT-MEMORY-UNIT FR-007).
// Distinct from spatial Hierarchy-Compaction: this folds a WINDOW of >= `cadence` episodic/
// observation entries (per role) into ONE semantic "role-core" atom — the recurring, corroborated
// lesson. Runs for T1/T2 ONLY (T0 ephemeral workers have no distillation; they feed the role unit).
// Pure; composes the promotion gate (classifyLessons) so only corroborated lessons distil.
import { classifyLessons } from "./promotion.mjs";

export function distill(entries, { tier = "T1", cadence = 8, minConfirmations = 2 } = {}) {
  if (tier === "T0") return null;                          // FR-007: T1/T2 only
  const list = (entries || []).filter(Boolean);
  if (list.length < cadence) return null;                 // below the cadence threshold -> nothing yet

  const lessons = classifyLessons(
    list.map((e) => ({
      issue: e.content || e.issue, fix: e.fix,
      taskId: e.taskId || e.agentId, worker: e.worker || e.agentId,
      at: e.recordedAt || e.at,
    })),
    { minConfirmations }
  );
  const confirmed = lessons.filter((l) => l.epistemic_state === "Confirmed");
  if (!confirmed.length) return null;                     // nothing corroborated enough to promote

  return {
    file: "semantic",
    tier,
    epistemic_state: "Confirmed",
    confidence: 0.9,
    scope: "role-shared",
    distilledFrom: list.length,
    cadence,
    atoms: confirmed.map((l) => ({ lesson: l.issue, fix: l.fix, confirmations: l.confirmations })),
  };
}
