// L1 SLM escalate-only routing (RM-008+ / FEAT-TIERED-REVIEW FR-002, FR-003) — unit tests.
// Deterministic, no LLM. Run: node --test engine/orchestration/l1-route.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { l1Route } from "./engine.mjs";

test("disabled -> always L2 (back-compat: no behavior change when L1 is off)", () => {
  assert.equal(l1Route({ enabled: false, lowStakes: true, verdict: "pass" }), "l2");
});

test("high-stakes -> always L2 even on an L1 pass (FR-003)", () => {
  assert.equal(l1Route({ enabled: true, lowStakes: false, verdict: "pass" }), "l2");
});

test("low-stakes + L1 pass -> done, the paid L2 reviewer is skipped (FR-002)", () => {
  assert.equal(l1Route({ enabled: true, lowStakes: true, verdict: "pass" }), "done");
});

test("low-stakes + L1 escalate -> L2", () => {
  assert.equal(l1Route({ enabled: true, lowStakes: true, verdict: "escalate" }), "l2");
});

test("L1 can never reject: any non-pass verdict escalates, never 'done'/'rework'", () => {
  for (const v of ["escalate", "fail", "unsure", "", undefined]) {
    assert.equal(l1Route({ enabled: true, lowStakes: true, verdict: v }), "l2");
  }
});
