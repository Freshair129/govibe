// L0 deterministic gate (RM-008 / FEAT-TIERED-REVIEW FR-001) — unit tests.
// Runs with: node --test engine/orchestration/l0-gate.test.mjs  (no LLM, fully deterministic).
import { test } from "node:test";
import assert from "node:assert/strict";
import { runL0, CONFIG } from "./engine.mjs";

const t = { id: "L0T", title: "x", type: "code", phase: "0", deps: [], accept: "x" };
const setL0 = (l0) => { CONFIG.review = { ...(CONFIG.review || {}), l0 }; };

test("no commands -> no-op pass (back-compat)", () => {
  setL0({ enabled: true, commands: [] });
  const r = runL0(t);
  assert.equal(r.ran, false);
  assert.equal(r.pass, true);
});

test("passing check -> pass, no failures", () => {
  setL0({ enabled: true, commands: ['node -e "process.exit(0)"'] });
  const r = runL0(t);
  assert.equal(r.ran, true);
  assert.equal(r.pass, true);
  assert.equal(r.failures.length, 0);
});

test("failing check -> fail, captures exit code (this is what blocks the paid LLM review)", () => {
  setL0({ enabled: true, commands: ['node -e "process.exit(3)"'] });
  const r = runL0(t);
  assert.equal(r.ran, true);
  assert.equal(r.pass, false);
  assert.equal(r.failures[0].code, 3);
});

test("one failing check among many -> overall fail", () => {
  setL0({ enabled: true, commands: ['node -e "process.exit(0)"', 'node -e "process.exit(1)"'] });
  const r = runL0(t);
  assert.equal(r.pass, false);
  assert.equal(r.failures.length, 1);
});

test("enabled:false -> no-op pass even with commands", () => {
  setL0({ enabled: false, commands: ['node -e "process.exit(1)"'] });
  const r = runL0(t);
  assert.equal(r.ran, false);
  assert.equal(r.pass, true);
});
