/**
 * run.mjs — V1 one-shot hybrid run (TASK-HYB-RM-003)
 * plan (frontier) -> atomic tasks -> execute via the FULL engine (route, Verify Gate, usage) -> meter -> diff.
 * Non-destructive: backs up backlog.json/state.json, runs on the planned tasks, restores the board after
 * (the code the workers wrote stays — only the orchestrator board state is restored).
 *
 *   node run.mjs "add a /health endpoint"                       # plan + run via engine routing
 *   node run.mjs "..." --max 1 --exec-model ollama:gemma4:latest  # cap + pin execution model
 */
import { writeFileSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { CONFIG, PATHS, reload, loadState, saveState, freshState, readyTasks, byId, executeWithReview, modelFor } from "./engine.mjs";
import { planTasks, summarizeRepo } from "./planner.mjs";

// L0 (RM-008): pick deterministic compile/lint checks for the target stack. $0, runs before review.
function detectL0(root) {
  const has = (f) => existsSync(join(root, f));
  if (has("Cargo.toml")) return ["cargo build --quiet"];
  if (has("tsconfig.json")) return ["npx --no-install tsc --noEmit"];
  try {
    if (has("package.json")) {
      const p = JSON.parse(readFileSync(join(root, "package.json"), "utf8").replace(/^﻿/, ""));
      if (p.scripts?.lint) return ["npm run -s lint"];
      if (p.scripts?.typecheck) return ["npm run -s typecheck"];
      if (p.scripts?.build) return ["npm run -s build"];
    }
  } catch { /* unreadable package.json -> no L0 */ }
  return [];
}

const BACKLOG_PATH = join(PATHS.__dir, "backlog.json");
const USAGE_PATH = join(PATHS.__dir, "usage.jsonl");

const argv = process.argv.slice(2);
const opts = {}; const taskParts = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) { const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true; opts[a.slice(2)] = v; }
  else taskParts.push(a);
}
const taskText = taskParts.join(" ").trim();
const max = Number(opts.max) || 0;
const execModel = opts["exec-model"] || null;
if (!taskText) { console.error('usage: node run.mjs "<task>" [--repo PATH] [--max N] [--exec-model provider:model]'); process.exit(1); }

// ── 0. optional external target repo (TASK-HYB-RM-005 / RM-008) ──
// Override PATHS.ROOT (agent cwd + file ops + diff), CONFIG.project (prompt facts), and the L0
// gate commands. applyRepoTarget() is re-applied after reload() because reload() re-reads
// config.json from disk and would otherwise wipe these in-memory overrides. Engine board/state/
// usage stay anchored to PATHS.__dir, so bookkeeping never leaks into the target.
let repoTarget = null;
if (opts.repo && opts.repo !== true) {
  repoTarget = resolve(String(opts.repo));
  if (!existsSync(repoTarget) || !statSync(repoTarget).isDirectory()) {
    console.error(`--repo path is not an existing directory: ${repoTarget}`); process.exit(1);
  }
}
const l0cmds = repoTarget ? detectL0(repoTarget) : [];
function applyRepoTarget() {
  if (!repoTarget) return;
  PATHS.ROOT = repoTarget;
  const name = repoTarget.split(/[\\/]/).filter(Boolean).pop() || "target";
  CONFIG.project = { ...(CONFIG.project || {}), name, repoRoot: repoTarget.replace(/\\/g, "/") };
  if (CONFIG.scope?.default) CONFIG.scope.default = { ...CONFIG.scope.default, docs: [] };   // no GoVibe docs in a foreign repo
  CONFIG.docsForContext = [];
  if (CONFIG.review?.l0 && !(CONFIG.review.l0.commands || []).length) CONFIG.review.l0.commands = l0cmds;
}
if (repoTarget) {
  applyRepoTarget();
  console.log(`target repo : ${repoTarget}`);
  if (l0cmds.length) console.log(`L0 gate     : ${l0cmds.join(" && ")}`);
}

const usageSince = (t0) => {
  if (!existsSync(USAGE_PATH)) return [];
  return readFileSync(USAGE_PATH, "utf8").split("\n").filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).filter((r) => r.t >= t0);
};

// ── 1. plan ──
const repo = summarizeRepo(PATHS.ROOT);
console.log(`=== hybrid run ===\ntask : ${taskText}\nrepo : ${repo.replace(/\n/g, "  |  ")}\n`);
const plan = await planTasks(taskText, repo, CONFIG, PATHS, process.env.PLAN_MODEL ? { model: process.env.PLAN_MODEL } : {});
if (!plan.ok) { console.error("plan failed:", plan.error, plan.sample || ""); process.exit(1); }
let tasks = plan.tasks;
if (execModel) tasks = tasks.map((t) => ({ ...t, model: execModel }));
console.log(`planned ${tasks.length} tasks via ${plan.model} ($${(plan.usage?.cost || 0).toFixed(4)})`);
for (const t of tasks) console.log(`  ${t.id} [${t.type}] ${t.title}`);
console.log("");

// ── 2. back up board, swap in planned tasks ──
const bkBacklog = readFileSync(BACKLOG_PATH, "utf8");
const bkState = existsSync(PATHS.STATE) ? readFileSync(PATHS.STATE, "utf8") : null;
const runStart = Date.now();
try {
  writeFileSync(BACKLOG_PATH, JSON.stringify({ $run: taskText, tasks }, null, 2));
  reload();                       // engine BACKLOG now = planned tasks
  applyRepoTarget();              // re-apply --repo overrides (reload re-read config.json from disk)
  saveState(freshState());        // fresh todo state for them

  // ── 3. run via the full engine (route -> produce -> Verify Gate -> usage) ──
  let executed = 0;
  while (true) {
    const s = loadState();
    const ready = readyTasks(s).filter((t) => modelFor(t, s) !== null);
    if (!ready.length || (max && executed >= max)) break;
    const t = ready[0], m = modelFor(t, s);
    process.stdout.write(`▶ ${t.id} [${m}] ${t.title}\n`);
    await executeWithReview(byId(t.id), m, "run");
    executed++;
    process.stdout.write(`  → ${loadState().tasks[t.id].status}\n`);
  }
} finally {
  // ── 4. restore the board (keep the code the workers wrote) ──
  writeFileSync(BACKLOG_PATH, bkBacklog);
  if (bkState !== null) writeFileSync(PATHS.STATE, bkState);
  reload();
}

// ── 5. cost + diff ──
const used = usageSince(runStart);
const local = used.filter((r) => String(r.model).includes("ollama"));
const execCost = used.reduce((a, r) => a + (r.cost || 0), 0);
console.log(`\n--- this run ---`);
console.log(`plan (frontier) : $${(plan.usage?.cost || 0).toFixed(4)}`);
console.log(`execute+review  : $${execCost.toFixed(4)}   (${local.length}/${used.length} runs on-device at $0)`);
const diff = spawnSync("git", ["-C", PATHS.ROOT, "diff", "--stat"], { encoding: "utf8" });
const untracked = spawnSync("git", ["-C", PATHS.ROOT, "ls-files", "--others", "--exclude-standard"], { encoding: "utf8" });
console.log(`\n--- changed files (tracked) ---\n${(diff.stdout || "").trim() || "(none)"}`);
const newFiles = (untracked.stdout || "").split("\n").filter(Boolean);
if (newFiles.length) console.log(`--- new files ---\n${newFiles.map((f) => "  + " + f).join("\n")}`);
