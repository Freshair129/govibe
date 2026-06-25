// 8-8-8 distillation over the live failure-log store (FR-007 integration) — deterministic, no LLM.
// Run: node --test engine/orchestration/distill-store.test.mjs
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getStore } from "./store/knowledge.mjs";

const BRAIN = join(dirname(fileURLToPath(import.meta.url)), "brain");
const FAILLOG = join(BRAIN, "failures.jsonl");
let backup = null;
before(() => { backup = existsSync(FAILLOG) ? readFileSync(FAILLOG, "utf8") : null; });
after(() => { if (backup === null) { try { rmSync(FAILLOG); } catch { /* */ } } else writeFileSync(FAILLOG, backup); });

test("distillRole folds a role's >= 8 corroborated lessons into a semantic role-core atom", async () => {
  if (!existsSync(BRAIN)) mkdirSync(BRAIN, { recursive: true });
  // 8 independent occurrences (distinct task/worker) of the SAME lesson for role 'coder'
  const rows = Array.from({ length: 8 }, (_, i) => JSON.stringify({
    taskId: `D${i}`, worker: `w${i}`, role: "coder", tier: "T0",
    issue: "`pnpm exec clippy` not found", fix: "use cargo clippy", at: `2026-06-0${i % 9}`,
  })).join("\n") + "\n";
  // plus an unrelated single-shot lesson for another role (must not pollute the coder role-core)
  writeFileSync(FAILLOG, rows + JSON.stringify({ taskId: "Z", worker: "z", role: "docs", issue: "typo", at: "2026-06-01" }) + "\n");

  const store = getStore({ store: { knowledge: "file" } });
  const atom = await store.distillRole("coder");
  assert.ok(atom, "should distil a role-core for coder");
  assert.equal(atom.file, "semantic");
  assert.equal(atom.epistemic_state, "Confirmed");
  assert.ok(atom.atoms.some((a) => /clippy/.test(a.lesson)));
  assert.ok(!atom.atoms.some((a) => /typo/.test(a.lesson)), "other-role lesson excluded");

  // below cadence for an under-represented role -> nothing yet
  const none = await store.distillRole("docs");
  assert.equal(none, null);
});
