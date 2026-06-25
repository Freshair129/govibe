// Onboarding preflight (TASK-HYB-RM-006) — unit tests. Deterministic, no LLM/network (deps injected).
// Run: node --test engine/orchestration/preflight.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizePreflight, probeReadiness } from "./preflight.mjs";

test("all green -> ready, no issues", () => {
  const r = summarizePreflight({ ollama: true, localModels: ["qwen3"], frontier: true });
  assert.equal(r.ready, true);
  assert.deepEqual(r.issues, []);
});

test("no Ollama -> not ready but can degrade to frontier; issue guides install", () => {
  const r = summarizePreflight({ ollama: false, frontier: true });
  assert.equal(r.ready, false);
  assert.equal(r.canRunDegraded, true);
  assert.match(r.issues.join(" "), /Ollama/);
});

test("Ollama up but no model pulled -> issue guides `ollama pull`", () => {
  const r = summarizePreflight({ ollama: true, localModels: [], frontier: true });
  assert.equal(r.ready, false);
  assert.match(r.issues.join(" "), /ollama pull/);
});

test("no frontier provider -> not ready and cannot degrade", () => {
  const r = summarizePreflight({ ollama: true, localModels: ["x"], frontier: false });
  assert.equal(r.ready, false);
  assert.equal(r.canRunDegraded, false);
  assert.match(r.issues.join(" "), /frontier/);
});

test("probeReadiness composes injected probes; Ollama probe failure degrades gracefully", async () => {
  const ok = await probeReadiness({}, { ollamaTags: async () => ["m1"], frontierEnabled: () => true });
  assert.equal(ok.ready, true);
  const down = await probeReadiness({}, { ollamaTags: async () => { throw new Error("conn refused"); }, frontierEnabled: () => true });
  assert.equal(down.ollama, false);
  assert.equal(down.canRunDegraded, true);          // never throws — still usable on frontier
});
