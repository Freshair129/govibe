// Memory promotion gate (FEAT-PER-AGENT-MEMORY-UNIT FR-005) — unit tests. Deterministic, no LLM.
// Run: node --test engine/orchestration/promotion.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyLessons } from "./promotion.mjs";

test("a one-off lesson stays an unverified Hypothesis (not treated as truth)", () => {
  const r = classifyLessons([{ taskId: "T1", worker: "w1", issue: "X failed", fix: "do Y" }]);
  assert.equal(r.length, 1);
  assert.equal(r[0].epistemic_state, "Hypothesis");
  assert.equal(r[0].confirmations, 1);
  assert.equal(r[0].confidence, 0.3);
});

test("repetition by the SAME task/worker does NOT promote (independence required)", () => {
  const r = classifyLessons([
    { taskId: "T1", worker: "w1", issue: "X failed", fix: "do Y" },
    { taskId: "T1", worker: "w1", issue: "X failed", fix: "do Y" },
  ]);
  assert.equal(r[0].epistemic_state, "Hypothesis");
  assert.equal(r[0].confirmations, 1);     // 1 independent source
  assert.equal(r[0].occurrences, 2);       // but seen twice
});

test(">= 2 INDEPENDENT confirmations promote Hypothesis -> Confirmed (normalized match)", () => {
  const r = classifyLessons([
    { taskId: "T1", worker: "w1", issue: "`pnpm exec clippy` not found", fix: "use cargo clippy" },
    { taskId: "T2", worker: "w2", issue: "pnpm exec clippy not found", fix: "use cargo clippy" },
  ]);
  assert.equal(r.length, 1, "normalized to one lesson");
  assert.equal(r[0].epistemic_state, "Confirmed");
  assert.equal(r[0].confirmations, 2);
  assert.ok(r[0].confidence > 0.3);
});

test("Confirmed lessons rank above one-off Hypotheses", () => {
  const r = classifyLessons([
    { taskId: "A", worker: "w", issue: "one-off thing", fix: "" },
    { taskId: "B", worker: "w1", issue: "recurring thing", fix: "f" },
    { taskId: "C", worker: "w2", issue: "recurring thing", fix: "f" },
  ]);
  assert.equal(r[0].epistemic_state, "Confirmed");
  assert.equal(r[0].issue, "recurring thing");
});

test("empty / junk input is safe", () => {
  assert.deepEqual(classifyLessons([]), []);
  assert.deepEqual(classifyLessons([{ issue: "" }]), []);
});
