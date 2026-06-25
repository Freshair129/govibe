// Per-agent memory unit (FEAT-PER-AGENT-MEMORY-UNIT) — foundation: tiers (FR-001), the 3-file
// Diamond entry schema with epistemic + bitemporal metadata (FR-002/003/004). Pure + deterministic;
// composes existing systems (no new storage engine — FR-008). The engine ships a minimal local
// bitemporal mirror of FEAT-Bi-Temporal-Versioning so it stays standalone (not importing GoVibe's
// app-side scripts/mcp/temporal-versioning.mjs).

// ---- bitemporal (FR-004) — mirrors validFrom/validTo/recordedAt/supersededAt ----
export function createVersion(input = {}, now = new Date().toISOString()) {
  return {
    validFrom: input.validFrom || now,
    validTo: input.validTo,
    recordedAt: input.recordedAt || now,
    supersededAt: input.supersededAt,
  };
}
export function supersede(version, now = new Date().toISOString()) {
  return { ...version, validTo: version.validTo ?? now, supersededAt: now };
}
export function isVisible(item = {}, { asOfValidAt, asOfRecordedAt } = {}) {
  const vf = Date.parse(item.validFrom ?? item.recordedAt ?? 0);
  const vt = item.validTo ? Date.parse(item.validTo) : undefined;
  const rec = Date.parse(item.recordedAt ?? 0);
  const sup = item.supersededAt ? Date.parse(item.supersededAt) : undefined;
  const av = asOfValidAt ? Date.parse(asOfValidAt) : Infinity;
  const ar = asOfRecordedAt ? Date.parse(asOfRecordedAt) : Infinity;
  if (av < vf) return false;
  if (vt !== undefined && av > vt) return false;
  if (ar < rec) return false;
  if (sup !== undefined && ar >= sup) return false;
  return true;
}

// ---- tiers (FR-001) ----
// T0 ephemeral pool worker (failure-log slice only) · T1 role aggregate · T2 named/persistent agent.
// Resolved from the engine's own roles/config; default is T0 (FEAT: "default rollout starts at T0").
export function resolveTier(idOrWorker, config = {}) {
  const m = config.memory || {};
  if ((m.namedAgents || []).includes(idOrWorker)) return "T2";
  if (Object.keys(config.roles || {}).includes(idOrWorker)) return "T1";
  return "T0";
}

// ---- Diamond entry (FR-002/003) ----
export const EPISTEMIC = ["Hypothesis", "Confirmed", "Contested", "Deprecated"];
export const FILES = ["episodic", "observation", "semantic"];

export function makeEntry({
  agentId, role, tier = "T0", file = "observation", content,
  epistemic_state = "Hypothesis", confidence = 0.3, scope = "agent-private",
  source_refs = [], now,
} = {}) {
  if (!FILES.includes(file)) throw new Error(`memory: invalid file '${file}'`);
  if (!EPISTEMIC.includes(epistemic_state)) throw new Error(`memory: invalid epistemic_state '${epistemic_state}'`);
  return {
    agentId: agentId || role || "?", tier, file, content,
    epistemic_state, confidence, scope, source_refs,
    ...createVersion({}, now),
  };
}
// Episodic = what the agent did/decided (the run/turn log).
export const episodic = (o) => makeEntry({ ...o, file: "episodic" });
// Observation = RAW SWE signals only (compiler/test/diff/tool output) — never affective state (FR-002).
export const observation = (o) => makeEntry({ ...o, file: "observation" });
// Semantic = distilled lesson/concept.
export const semantic = (o) => makeEntry({ ...o, file: "semantic", scope: o.scope || "role-shared" });
