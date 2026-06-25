// Latched Contextual Anchor (LCA) conflict resolution (FEAT-PER-AGENT-MEMORY-UNIT FR-006).
// When two shared claims conflict (e.g. "repo uses X" vs "repo uses Y"), resolve deterministically
// to a SINGLE reconciled truth by this order:
//   1. Temporal      — a claim still valid now wins over one whose validity has ended.
//   2. Evidence      — more independent confirmations win.
//   3. Granularity   — specific overrides general.
//   4. Recency       — newer supersedes older.
// The loser is marked `Deprecated` and RETAINED (bitemporal history, never deleted). Pure.

const evidence = (c) => c.confirmations ?? c.evidence ?? 0;
const isSpecific = (c) => (c.granularity === "specific" ? 1 : 0);
const recencyKey = (c) => String(c.recordedAt || c.lastAt || c.at || "");
const stillValid = (c, asOf) => !c.validTo || (asOf ? String(c.validTo) >= String(asOf) : true);

export function resolveConflict(claims, { asOf } = {}) {
  const list = (claims || []).filter(Boolean);
  if (!list.length) return { winner: null, deprecated: [] };

  // 1. temporal: prefer claims still valid; fall back to all if none are currently valid.
  const valid = list.filter((c) => stillValid(c, asOf));
  const pool = valid.length ? valid : list;

  const sorted = [...pool].sort((a, b) =>
    (evidence(b) - evidence(a)) ||                 // 2. evidence strength
    (isSpecific(b) - isSpecific(a)) ||             // 3. granularity
    recencyKey(b).localeCompare(recencyKey(a))     // 4. recency
  );

  const winner = { ...sorted[0], epistemic_state: "Confirmed" };
  // every other claim (including temporally-excluded ones) is retained but marked Deprecated
  const deprecated = list
    .filter((c) => c !== sorted[0])
    .map((c) => ({ ...c, epistemic_state: "Deprecated" }));
  return { winner, deprecated };
}
