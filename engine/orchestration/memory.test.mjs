// Per-agent memory unit (FEAT-PER-AGENT-MEMORY-UNIT) — unit tests for the full PHASE-HYB-04 slice:
// tiers (FR-001), Diamond entry + epistemic + bitemporal (FR-002/003/004), LCA (FR-006), 8-8-8
// distillation (FR-007). Deterministic, no LLM. Run: node --test engine/orchestration/memory.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createVersion, supersede, isVisible, resolveTier, makeEntry, observation, semantic, EPISTEMIC } from "./memory.mjs";
import { resolveConflict } from "./lca.mjs";
import { distill } from "./distill.mjs";

// ---- bitemporal (FR-004) ----
test("createVersion stamps validFrom + recordedAt; supersede closes validTo + supersededAt", () => {
  const v = createVersion({}, "2026-06-01T00:00:00.000Z");
  assert.equal(v.validFrom, "2026-06-01T00:00:00.000Z");
  assert.equal(v.recordedAt, "2026-06-01T00:00:00.000Z");
  assert.equal(v.validTo, undefined);
  const s = supersede(v, "2026-06-10T00:00:00.000Z");
  assert.equal(s.validTo, "2026-06-10T00:00:00.000Z");
  assert.equal(s.supersededAt, "2026-06-10T00:00:00.000Z");
});

test("isVisible respects bitemporal windows", () => {
  const item = createVersion({ validFrom: "2026-06-05T00:00:00.000Z" }, "2026-06-05T00:00:00.000Z");
  assert.equal(isVisible(item, { asOfValidAt: "2026-06-04T00:00:00.000Z" }), false); // before validFrom
  assert.equal(isVisible(item, { asOfValidAt: "2026-06-06T00:00:00.000Z" }), true);
  const closed = supersede(item, "2026-06-08T00:00:00.000Z");
  assert.equal(isVisible(closed, { asOfValidAt: "2026-06-09T00:00:00.000Z" }), false); // past validTo
});

// ---- tiers (FR-001) ----
test("resolveTier: worker -> T0, role -> T1, named agent -> T2 (default T0)", () => {
  const cfg = { roles: { coder: {}, architect: {} }, memory: { namedAgents: ["LYRA"] } };
  assert.equal(resolveTier("run-worker-7", cfg), "T0");
  assert.equal(resolveTier("coder", cfg), "T1");
  assert.equal(resolveTier("LYRA", cfg), "T2");
  assert.equal(resolveTier("anything", {}), "T0");
});

// ---- Diamond entry (FR-002/003) ----
test("makeEntry validates file + epistemic_state; observation is a raw signal", () => {
  const o = observation({ agentId: "w1", content: "cargo build: error[E0277]", now: "2026-06-01T00:00:00.000Z" });
  assert.equal(o.file, "observation");
  assert.equal(o.epistemic_state, "Hypothesis");
  assert.ok(EPISTEMIC.includes(o.epistemic_state));
  assert.equal(o.validFrom, "2026-06-01T00:00:00.000Z");
  const s = semantic({ agentId: "coder", content: "repo uses pnpm workspaces", now: "x" });
  assert.equal(s.file, "semantic");
  assert.equal(s.scope, "role-shared");
  assert.throws(() => makeEntry({ file: "feelings" }));
  assert.throws(() => makeEntry({ epistemic_state: "Vibes" }));
});

// ---- LCA conflict resolution (FR-006) ----
test("LCA: more evidence wins; loser is Deprecated and retained", () => {
  const { winner, deprecated } = resolveConflict([
    { issue: "repo uses pnpm", confirmations: 1, recordedAt: "2026-01-01" },
    { issue: "repo uses npm", confirmations: 3, recordedAt: "2026-02-01" },
  ]);
  assert.equal(winner.issue, "repo uses npm");
  assert.equal(winner.epistemic_state, "Confirmed");
  assert.equal(deprecated.length, 1);                 // retained, not deleted
  assert.equal(deprecated[0].epistemic_state, "Deprecated");
});

test("LCA: specific overrides general at equal evidence; recency breaks final ties", () => {
  const { winner } = resolveConflict([
    { issue: "general rule", confirmations: 2, granularity: "general", recordedAt: "2026-03-01" },
    { issue: "specific rule", confirmations: 2, granularity: "specific", recordedAt: "2026-01-01" },
  ]);
  assert.equal(winner.issue, "specific rule");
});

test("LCA: a claim whose validity ended loses to a still-valid one but is retained", () => {
  const { winner, deprecated } = resolveConflict([
    { issue: "old truth", confirmations: 9, validTo: "2026-05-01" },
    { issue: "current truth", confirmations: 1 },
  ], { asOf: "2026-06-01" });
  assert.equal(winner.issue, "current truth");        // temporal beats evidence
  assert.equal(deprecated[0].issue, "old truth");
});

// ---- 8-8-8 distillation (FR-007) ----
test("distill: T0 and below-cadence windows yield nothing", () => {
  assert.equal(distill([{ content: "x" }], { tier: "T0" }), null);
  assert.equal(distill([{ content: "x" }], { tier: "T1", cadence: 8 }), null);
});

test("distill: a window of corroborated episodes folds into a semantic role-core atom (T1)", () => {
  const entries = Array.from({ length: 8 }, (_, i) => ({
    content: "`pnpm exec clippy` not found", fix: "use cargo clippy",
    agentId: `w${i}`, recordedAt: `2026-06-0${(i % 9)}`,
  }));
  const out = distill(entries, { tier: "T1", cadence: 8 });
  assert.ok(out, "should distil");
  assert.equal(out.file, "semantic");
  assert.equal(out.epistemic_state, "Confirmed");
  assert.equal(out.distilledFrom, 8);
  assert.ok(out.atoms.some((a) => /clippy/.test(a.lesson)));
});
