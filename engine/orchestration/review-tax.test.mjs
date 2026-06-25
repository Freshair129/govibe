// Review-tax / L0-savings analyzer (FR-005) — unit tests. Deterministic, no LLM.
// Run: node --test engine/orchestration/review-tax.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeReviewTax } from "./review-tax.mjs";

// Synthetic ledger: 1 frontier plan, 1 frontier review, 2 L0-caught fails, 1 L0 pass, 1 local exec.
const rows = [
  { id: "T1", model: "claude:opus", cost: 0.07, out: 600 },               // produce/plan
  { id: "T1", model: "ollama:qwen3:latest", cost: 0 },                    // local execute
  { id: "T1#l0", model: "deterministic:l0:fail", cost: 0 },              // L0 caught
  { id: "T2#l0", model: "deterministic:l0:fail", cost: 0 },              // L0 caught
  { id: "T3#l0", model: "deterministic:l0:pass", cost: 0 },              // L0 passed -> went to review
  { id: "T3#review", model: "claude:opus", cost: 0.74 },                 // the one paid review
];

test("counts review spend, runs, and the review tax %", () => {
  const r = analyzeReviewTax(rows);
  assert.equal(r.reviewRuns, 1);
  assert.equal(r.reviewSpend, 0.74);
  assert.equal(Number(r.avgReviewMeasured.toFixed(2)), 0.74);
  assert.equal(r.avgReviewIsReference, false);                  // ledger has a real review
  assert.equal(Number(r.totalSpend.toFixed(2)), 0.81);          // 0.07 + 0.74
  assert.ok(Math.abs(r.reviewTaxPct - (0.74 / 0.81) * 100) < 0.01);
});

test("L0 telemetry: counts runs and fails, and estimates averted review (measured avg)", () => {
  const r = analyzeReviewTax(rows);
  assert.equal(r.l0Runs, 3);
  assert.equal(r.l0Fails, 2);
  assert.equal(Number(r.avertedEst.toFixed(2)), 1.48);          // 2 fails x $0.74 measured avg
  assert.ok(r.reviewTaxWithoutL0Pct > r.reviewTaxPct, "tax would be higher without L0");
});

test("L0 caught everything (no review in ledger) -> averted uses the reference cost, not $0", () => {
  const allCaught = [
    { id: "A#l0", model: "deterministic:l0:fail", cost: 0 },
    { id: "B#l0", model: "deterministic:l0:fail", cost: 0 },
    { id: "C#l0", model: "deterministic:l0:fail", cost: 0 },
  ];
  const r = analyzeReviewTax(allCaught, { refReviewCost: 0.74 });
  assert.equal(r.reviewRuns, 0);
  assert.equal(r.avgReviewIsReference, true);
  assert.equal(Number(r.avertedEst.toFixed(2)), 2.22);          // 3 fails x $0.74 reference
});

test("L0 entries are never counted as spend", () => {
  const r = analyzeReviewTax(rows);
  assert.equal(Number(r.totalSpend.toFixed(2)), 0.81);          // L0 ($0) excluded, not added
});

test("empty / no-L0 ledger is safe", () => {
  const r = analyzeReviewTax([{ id: "T1", model: "claude:opus", cost: 0.1 }]);
  assert.equal(r.l0Runs, 0);
  assert.equal(r.avertedEst, 0);
  assert.equal(r.reviewRuns, 0);
});
