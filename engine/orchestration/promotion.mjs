// Memory promotion gate (FEAT-PER-AGENT-MEMORY-UNIT FR-003 / FR-005) — T0 failure-log slice.
//
// The anti-hallucination core: a private, one-off lesson is an unverified *Hypothesis* and must
// NOT be treated as shared truth. A lesson confirmed by >= N INDEPENDENT occurrences (distinct
// task or worker — not the same run repeated) is promoted Hypothesis -> Confirmed. This is the
// "promotion gate" applied to the failure-log: experience accumulates, but only corroborated
// experience becomes trusted truth.
//
// Pure + deterministic (no storage engine) so it composes the existing file/genesisdb store and
// is unit-tested without an LLM.

const norm = (s) => String(s || "").toLowerCase().replace(/[`'"]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);

export function classifyLessons(rows, { minConfirmations = 2 } = {}) {
  const groups = new Map();
  for (const r of rows || []) {
    const issue = r.issue || r.detail || "";
    const key = norm(issue);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, { issue, fix: r.fix || "", ind: new Set(), occurrences: 0, lastAt: r.at || "" });
    const g = groups.get(key);
    g.occurrences++;
    g.ind.add(`${r.taskId || r.task || "?"}|${r.worker || "?"}`);   // independence = distinct task/worker pair
    if (r.fix && !g.fix) g.fix = r.fix;
    if ((r.at || "") > g.lastAt) g.lastAt = r.at || "";
  }
  return [...groups.values()].map((g) => {
    const confirmations = g.ind.size;
    const confirmed = confirmations >= minConfirmations;
    return {
      issue: g.issue, fix: g.fix, confirmations, occurrences: g.occurrences, lastAt: g.lastAt,
      epistemic_state: confirmed ? "Confirmed" : "Hypothesis",          // FR-003 epistemic state
      confidence: confirmed ? Math.min(0.5 + 0.1 * confirmations, 0.95) : 0.3,
    };
  }).sort((a, b) =>
    (b.confidence - a.confidence) ||
    (b.confirmations - a.confirmations) ||
    String(b.lastAt).localeCompare(String(a.lastAt))                    // recency tie-break (LCA recency rule)
  );
}
