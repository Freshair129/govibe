// T0 per-agent failure memory / anti-error loop (RM-009 / FEAT-PER-AGENT-MEMORY-UNIT) — unit tests.
// Deterministic, no LLM. Run: node --test engine/orchestration/anti-error-loop.test.mjs
//
// Proves the loop end-to-end at the data layer:
//   (1) a recorded failure is retrieved for a SIMILAR future task   (T0 failure-log -> L1 query)
//   (2) the retrieved mistake is injected into the worker prompt as a "ห้ามทำซ้ำ" anti-error block
// Together: once a lesson enters the failure-log, the next similar task is primed not to repeat it.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPrompt, l0Lesson } from "./engine.mjs";
import { getStore } from "./store/knowledge.mjs";

const FAILLOG = join(dirname(fileURLToPath(import.meta.url)), "brain", "failures.jsonl");
let backup = null;
before(() => { backup = existsSync(FAILLOG) ? readFileSync(FAILLOG, "utf8") : null; });   // hermetic: snapshot the runtime log
after(() => { if (backup === null) { try { rmSync(FAILLOG); } catch { /* */ } } else writeFileSync(FAILLOG, backup); });

test("L1 injection: a past mistake renders into the worker prompt as an anti-error block", () => {
  const t = { id: "AE1", title: "add a clippy lint step", type: "test", phase: "0", deps: [], accept: "lint passes" };
  const mistakes = [{ issue: "`pnpm exec clippy` not found", fix: "use `cargo clippy`" }];
  const p = buildPrompt(t, "ollama:qwen3:latest", "ollama", null, mistakes);
  assert.match(p, /ห้ามทำซ้ำ/);            // the anti-error framing is present
  assert.match(p, /pnpm exec clippy/);     // the specific past mistake
  assert.match(p, /cargo clippy/);         // and its fix
});

test("L0 lesson keeps the real tool output (the cause), not just an exit code", () => {
  // This is what makes an L0 deterministic failure a reusable lesson rather than noise.
  const lesson = l0Lesson({ cmd: "npm run -s lint", code: 1, output: "pnpm exec clippy: command not found (hallucinated tooling)\n" });
  assert.match(lesson, /npm run -s lint/);
  assert.match(lesson, /hallucinated tooling/);   // the actual cause is preserved for the next task
  assert.ok(lesson.length <= 280, "lesson stays bounded");   // not the whole log dump
});

test("no past mistakes -> no anti-error block (back-compat)", () => {
  const t = { id: "AE0", title: "x", type: "code", phase: "0", deps: [], accept: "x" };
  const p = buildPrompt(t, "ollama:qwen3:latest", "ollama", null, null);
  assert.doesNotMatch(p, /ห้ามทำซ้ำ/);
});

test("T0 round-trip: a recorded failure is retrieved for a similar future task (file store)", async () => {
  const store = getStore({ store: { knowledge: "file" } });
  const marker = "AEUNIQUE_clippy_tooling_lesson";
  await store.recordOutcome({
    taskId: "AE-prev", taskTitle: "run clippy lint on the rust crate", type: "test", status: "needs-rework",
    issues: [{ severity: "critical", area: "compile", detail: `${marker}: pnpm exec clippy not found`, fix: "use cargo clippy" }],
    at: "2026-06-25T00:00:00.000Z",
  });
  const hits = await store.queryContext({ title: "add a clippy lint check to the crate", type: "test" }, { k: 5 });
  assert.ok(hits.some((h) => (h.issue || "").includes(marker)), "recorded clippy lesson should be retrieved for a similar task");
});
