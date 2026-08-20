import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { createDefaultStageAdapters } from "./stage-adapters.mjs";
import { runDeepScan } from "./stage-runner.mjs";
import { isScratchPath, SCRATCH_PATH_ROOTS as SCRATCH_ROOT_EXCLUSIONS } from "./graph-presentation-policy.mjs";

const execFileAsync = promisify(execFile);

// TASK-PRD-007 (round 4, M1; narrowed round 5, R2): fallback exclusion set used ONLY when
// workspacePath is not usable as a git working tree for inventory purposes -- either because it
// genuinely is not one (git unavailable, plain directory, a test fixture), or because it IS one
// but its own rules cannot be trusted (M2: workspacePath is not the git toplevel, so
// `git ls-files` would silently answer using an ENCLOSING repository's
// .gitignore/exclude/excludesFile instead of this workspace's own). There is no .gitignore this
// code can safely read in either case, so it falls back to this conservative, historical list
// rather than walking node_modules/dist/etc. by directory name.
//
// Round 4 restored `.govibe` and `state` here WHOLESALE, by directory name -- but that
// CONTRADICTS the git-aware path on nine git-tracked files: `.govibe/node-contracts/GLS-001..005.json`,
// `.govibe/skills/block-decomposition/1.0.0/SKILL.md`, and `state/PROJECT_STATE.json`,
// `state/events.jsonl`, `state/progress.jsonl` are all real, git-tracked project source that the
// git-aware path correctly includes (see graph-presentation-policy.mjs's own note: excluding the
// whole `state/` root "was wrong"). One workspace produced two different answers for the same
// files depending on whether git happened to be installed. Round 5 (R2) narrows the exclusion to
// APPROXIMATE the git path's real .gitignore rules instead of contradicting them:
// FALLBACK_ONLY_IGNORED_DIRECTORY_NAMES now covers only build/tooling directories that are never
// meaningfully git-tracked project source under ANY name collision; the `.govibe/` runtime
// write-targets .gitignore actually declares (config.json, project-state.json, skill-lock.json,
// runs/, msp/, contexts/, context-injections/, rbac.json) are excluded by exact relative path via
// FALLBACK_ONLY_IGNORED_GOVIBE_FILES/DIRECTORIES below, not by nuking the whole `.govibe/` or
// `state/` root. This is an approximation, not a full .gitignore reimplementation, and the gap is
// LARGE -- measured on this repository, a fallback walk admits 1737 files against the git path's
// 923. The unmirrored rules are not merely "a few JSONL files under .govibe/": they include
// ref/ (577 files -- a vendored checkout of a FOREIGN project, whose .md/.ts content is then read
// and decomposed by stages 3 and 5, not just its paths), playwright-report/ (90), local_model/
// (78), benchmark_results/v2/ (48), .playwright-cli/ (20), scripts/bench/ (6 -- .gitignore
// annotates this one as holding real customer/account mapping data), .env and .env.example,
// JULES_REPORT.md, engine/orchestration/*, .govibe/{roadmap-overlay,rbac-audit,approvals}.jsonl,
// .govibe/brain/, .govibe/govibe-knowledge-base/*, .govibe-knowledge-block/*.json, *.log, .vscode/
// and .vercel. Do not size this risk from the .govibe/ entries alone. The divergence is strictly
// one-directional -- fallback is WIDER than git, never narrower, so no git-tracked file is ever
// dropped by it -- and workspace-service.mjs surfaces an operator-facing Terminal warning whenever
// an UNEXPECTED git failure is what put us on this path.
// SCRATCH_PATH_ROOTS (.agents/, .claude/, .brain/, state/runs/) is
// layered on top of BOTH paths below via isScratchPath(), so it never drifts between the
// git-aware and fallback code paths -- see graph-presentation-policy.mjs.
const FALLBACK_ONLY_IGNORED_DIRECTORY_NAMES = new Set(["node_modules", "dist", ".turbo", ".vite"]);

// TASK-PRD-007 (round 5, R2): exact-relative-path approximation of the runtime-state rules the
// real .gitignore declares under `.govibe/` (see repo .gitignore lines ~21-42) -- matched by
// relative path, not by directory/file NAME, so a git-tracked file that happens to share a name
// (e.g. a future `.govibe/skills/**/config.json`) is never accidentally excluded.
const FALLBACK_ONLY_IGNORED_GOVIBE_FILES = new Set([".govibe/config.json", ".govibe/project-state.json", ".govibe/skill-lock.json", ".govibe/rbac.json"]);
const FALLBACK_ONLY_IGNORED_GOVIBE_DIRECTORIES = new Set([".govibe/runs", ".govibe/msp", ".govibe/contexts", ".govibe/context-injections"]);

async function realpathSafe(value) {
  try {
    return await realpath(value);
  } catch {
    return path.resolve(value);
  }
}

// Windows paths differ only by separator style and drive-letter case between git's stdout
// ("G:/govibe") and Node's realpath() ("G:\\govibe") -- neither difference should defeat the
// toplevel comparison below.
function normalizeForCompare(value) {
  const posix = value.replaceAll("\\", "/");
  return process.platform === "win32" ? posix.toLowerCase() : posix;
}

function firstLine(error) {
  return String(error?.message ?? error ?? "").split(/\r?\n/)[0].slice(0, 300);
}

// TASK-PRD-007 (round 4, M1/M2): `git -C <path> ls-files` succeeds -- and answers with an
// ENCLOSING repository's ignore rules -- whenever <path> is anywhere under a git working tree,
// even when <path> itself is ignored by that enclosing repo. Reproduced directly on this repo:
// `git -C G:/govibe/ref rev-parse --is-inside-work-tree --show-toplevel` answers `true` /
// `G:/govibe` -- i.e. scanning the gitignored `ref/` subtree resolves to THIS repo's toplevel, not
// its own. Trusting `ls-files` there would silently apply this repo's .gitignore, .git/info/
// exclude, and the operator's global core.excludesFile to a workspace they were never written
// for, and make `sourceSnapshotHash` depend on whatever untracked files happen to exist in the
// enclosing repo on that machine (AGENTS.md SS6 requires exact, replay-comparable source
// versions). So before trusting `git ls-files`, this independently confirms workspacePath IS the
// toplevel of the working tree it resolves into -- not merely somewhere inside one.
// `rev-parse --is-inside-work-tree --show-toplevel` in one call answers both questions together
// (one output line per flag, in the order given); realpath() on both sides makes the toplevel
// comparison independent of symlinks or path-casing.
//
// Returns exactly one of:
//   { usable: true, toplevel }                                           -- workspacePath IS a git toplevel; ls-files is trustworthy
//   { usable: false, reason: "not-a-git-work-tree" }                     -- legitimate, expected: no repository here at all
//   { usable: false, reason: "workspace-is-not-git-toplevel", toplevel } -- inside a (possibly enclosing) repo, but not its root
//   { usable: false, reason: "git-not-on-path", unexpected: true }       -- git itself is unavailable
//   { usable: false, reason: "git-command-failed:<message>", unexpected: true } -- any other git failure (corrupt .git, timeout, maxBuffer, ...)
// The `unexpected` flag distinguishes "not a git working tree" -- a normal, expected outcome on a
// plain directory or test fixture -- from every other failure, which is not. Both are visible via
// inventoryModeReason on the returned inventory: the expected cases produce
// "not-a-git-work-tree"/"workspace-is-not-git-toplevel", the unexpected ones produce
// "git-not-on-path"/"git-command-failed:...". As of round 5 (R3), `unexpected: true` additionally
// drives a `console.warn` naming inventoryMode/inventoryModeReason/file count from
// inventoryWorkspace() -- previously this flag was computed here and then discarded by every
// caller, so "must never be silently indistinguishable" was aspirational rather than true; it is
// now actually enforced.
async function detectGitContext(workspacePath) {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", workspacePath, "rev-parse", "--is-inside-work-tree", "--show-toplevel"],
      { maxBuffer: 1024 * 1024 },
    );
    const [isInsideWorkTree, toplevel] = stdout.trim().split(/\r?\n/);
    if (isInsideWorkTree !== "true" || !toplevel) return { usable: false, reason: "not-a-git-work-tree" };
    const [actualReal, toplevelReal] = await Promise.all([realpathSafe(workspacePath), realpathSafe(toplevel)]);
    if (normalizeForCompare(actualReal) !== normalizeForCompare(toplevelReal)) {
      return { usable: false, reason: "workspace-is-not-git-toplevel", toplevel };
    }
    return { usable: true, toplevel };
  } catch (error) {
    const stderr = String(error?.stderr ?? "");
    if (/not a git repository/i.test(stderr)) return { usable: false, reason: "not-a-git-work-tree" };
    if (error?.code === "ENOENT") return { usable: false, reason: "git-not-on-path", unexpected: true };
    return { usable: false, reason: `git-command-failed:${firstLine(error)}`, unexpected: true };
  }
}

// TASK-PRD-007 (B3, round 3; hardened round 4 M1/M2): ask git for the files it actually considers
// part of this working tree -- tracked files, plus untracked files it does NOT ignore -- rather
// than hand-maintaining an approximation of .gitignore. This is the ONLY reliable way to honor
// negations (!.env.example, !local_model/auto_scanned_models.json) and partial-path rules
// (benchmark_results/v2/ is ignored, benchmark_results/logs/ is tracked) without reimplementing
// gitignore glob semantics. Also consults .git/info/exclude and the user's global excludesFile,
// exactly as `git status` does. Callers MUST have already confirmed detectGitContext() returned
// `usable: true` -- this throws (never silently returns null) on failure, so a genuine command
// failure here (maxBuffer exceeded, corrupt .git, a hung/killed child) stays distinguishable from
// "not a git working tree" instead of collapsing into the same fallback with no signal (M1).
async function gitAwareFileList(workspacePath) {
  // Use `git -C <path>` rather than spawning with `cwd: workspacePath` -- on Windows, a child
  // process's working-directory handle can outlive the process by a few ms after it exits, which
  // races an immediate `rm(workspacePath, { recursive: true })` (e.g. a test fixture's own
  // cleanup) into EBUSY. `-C` is documented by git as a real `chdir()` for git's own process
  // ("Run as if git was started in <path>") -- it does NOT avoid that race; the actual mitigation
  // is the `maxRetries`/`retryDelay` on this module's tests' own `rm()` calls (Node's documented
  // fix for exactly this handle-lifetime race, per the fs.promises.rm docs).
  const options = { maxBuffer: 1024 * 1024 * 256 };
  const [tracked, untracked] = await Promise.all([
    execFileAsync("git", ["-C", workspacePath, "ls-files", "-z"], options),
    execFileAsync("git", ["-C", workspacePath, "ls-files", "-z", "--others", "--exclude-standard"], options),
  ]);
  const parse = (stdout) => stdout.split("\0").filter(Boolean).map((value) => value.replaceAll("\\", "/"));
  return [...new Set([...parse(tracked.stdout), ...parse(untracked.stdout)])];
}

// TASK-PRD-007 (round 4, M5): stage 1 publishes `inventory.files` in array order, and every other
// stage filters/walks that same order (filesWith() in stage-adapters.mjs) -- so the ORDER of this
// array is what the per-stage STAGE_GRAPH_BUDGET quota (stage-runner.mjs) actually keeps when it
// truncates. A plain alphabetical sort put the whole quota inside packages/govibe-core/src/... and
// left docs/architecture, docs/roadmap, and every file under src/ past the cutoff -- the frontend
// the views render was invisible to its own scan. Bias toward the project's own source roots
// first; everything else keeps its (locale-independent) alphabetical position after that.
const PRIORITY_SOURCE_ROOTS = ["src/", "packages/", "scripts/", "docs/"];

// TASK-PRD-007 (round 4, M5): root-level files (no "/" in their repo-relative path) rank AHEAD of
// even PRIORITY_SOURCE_ROOTS. Measured on this repo before this fix: AGENTS.md sorted at
// inventory index 730, CLAUDE.md 731, PRODUCT.md 740 -- all past the 500-file stage-1
// STAGE_GRAPH_BUDGET, so none of them ever got a `file:` node. There are only ~26 root-level
// tracked files in this repo (governance docs, package.json, tsconfig*.json, ...) -- promoting
// all of them costs a handful of budget slots and guarantees the project's own highest-authority
// docs (AGENTS.md, CLAUDE.md, PRODUCT.md, docs:validate's own template roots) are never silently
// dropped by a large src/packages/scripts/docs tree on any bigger repo either.
function isRootLevelFile(relativePath) {
  return !relativePath.includes("/");
}

function priorityRank(relativePath) {
  if (isRootLevelFile(relativePath)) return -1;
  const index = PRIORITY_SOURCE_ROOTS.findIndex((root) => relativePath.startsWith(root));
  return index === -1 ? PRIORITY_SOURCE_ROOTS.length : index;
}

// Plain UTF-16 code-unit comparison -- unlike String.prototype.localeCompare(), this never
// depends on the ICU/locale environment the process happens to run under, so file ordering (and
// therefore what a truncating per-stage quota keeps) is reproducible across machines.
function ordinal(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function byProjectSourceFirst(a, b) {
  const rank = priorityRank(a.path) - priorityRank(b.path);
  return rank !== 0 ? rank : ordinal(a.path, b.path);
}

async function statFile(workspacePath, relative) {
  try {
    return await stat(path.join(workspacePath, relative));
  } catch (error) {
    if (error?.code === "ENOENT") return null; // listed by git, removed since (race) -- skip, don't fail the scan
    throw error;
  }
}

// stat() every candidate concurrently -- git can hand back thousands of paths (this repo: ~1000
// after scratch exclusion), and statting them one at a time serialized the whole inventory behind
// disk I/O latency (measured: ~17s sequential vs. well under 1s concurrent on this repo).
const STAT_CONCURRENCY = 64;

async function statAll(workspacePath, relatives) {
  const results = new Array(relatives.length);
  let cursor = 0;
  async function worker() {
    while (cursor < relatives.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await statFile(workspacePath, relatives[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(STAT_CONCURRENCY, relatives.length) }, worker));
  return results;
}

// TASK-PRD-007 (round 3 fix, found by capability-runtime.test.mjs during verification):
// `directories` must be derived from files that actually SURVIVED filtering, not from every
// directory name a walk happens to pass through. Registering a directory as soon as it is seen --
// regardless of whether anything under it survives -- made a scan's own state/runs/<runId>/ output
// (created as a side effect of the FIRST scan, excluded from `files` by SCRATCH_PATH_ROOTS) leave
// the otherwise-empty `state/` directory behind for every SUBSEQUENT scan to pick up as a real,
// non-scratch `directory:state` community with zero members -- non-deterministic between the
// first and second scan of the same workspace, and a small self-referential leak of the scan's
// own output back into its own inventory.
function ancestorDirectoriesOf(relativeFilePaths) {
  const directories = new Set();
  for (const relative of relativeFilePaths) {
    let directory = path.posix.dirname(relative);
    while (directory && directory !== ".") {
      directories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }
  return directories;
}

async function gitAwareInventory(workspacePath, candidates) {
  const files = [];
  const relatives = candidates.filter((relative) => !isScratchPath(relative));
  const infos = await statAll(workspacePath, relatives);
  for (let index = 0; index < relatives.length; index += 1) {
    const relative = relatives[index];
    const info = infos[index];
    if (!info || !info.isFile()) continue;
    files.push({ path: relative, size: info.size, extension: path.extname(relative).toLowerCase() });
  }
  return { files, directories: ancestorDirectoriesOf(files.map((file) => file.path)) };
}

async function walkedInventory(workspacePath) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === ".git" || FALLBACK_ONLY_IGNORED_DIRECTORY_NAMES.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      const relative = path.relative(workspacePath, full).replaceAll("\\", "/");
      if (entry.isDirectory() && FALLBACK_ONLY_IGNORED_GOVIBE_DIRECTORIES.has(relative)) continue;
      if (entry.isFile() && FALLBACK_ONLY_IGNORED_GOVIBE_FILES.has(relative)) continue;
      const relativeForScratchCheck = entry.isDirectory() ? `${relative}/` : relative;
      if (isScratchPath(relativeForScratchCheck)) continue;
      if (entry.isDirectory()) {
        await visit(full); // pruned for traversal efficiency; NOT registered unless a surviving file justifies it (see ancestorDirectoriesOf)
      } else if (entry.isFile()) {
        const info = await stat(full);
        files.push({ path: relative, size: info.size, extension: path.extname(entry.name).toLowerCase() });
      }
    }
  }
  await visit(path.resolve(workspacePath));
  return { files, directories: ancestorDirectoriesOf(files.map((file) => file.path)) };
}

export async function inventoryWorkspace(workspacePath) {
  const root = path.resolve(workspacePath);
  const gitContext = await detectGitContext(root);
  let files;
  let directories;
  let inventoryMode;
  let inventoryModeReason = null;
  let governingRuleSets;
  // TASK-PRD-007 (round 5, R3): tracks whether the fallback walk was reached via an *unexpected*
  // git failure (safe.directory/dubious-ownership rejection, a corrupt .git, a maxBuffer
  // overrun, a killed child -- anything detectGitContext()/gitAwareFileList() report with
  // `unexpected: true` or a genuine command failure after the toplevel was already confirmed
  // usable) as opposed to the two legitimate, expected fallback reasons ("not-a-git-work-tree",
  // "workspace-is-not-git-toplevel"). See the warning emitted below.
  let unexpectedGitFailure = false;

  if (gitContext.usable) {
    try {
      const gitCandidates = await gitAwareFileList(root);
      ({ files, directories } = await gitAwareInventory(root, gitCandidates));
      inventoryMode = "git";
      // TASK-PRD-007 (round 5, R1): this list must stay a content-addressed token set, never an
      // absolute filesystem path. It used to include `git-toplevel:${gitContext.toplevel}` --
      // `gitContext.toplevel` is raw `git rev-parse --show-toplevel` stdout, unnormalized -- so
      // two byte-identical clones at different absolute paths (or even the SAME clone compared by
      // drive-letter case on Windows, since normalizeForCompare() is applied only to the
      // toplevel-match check above, never to a stored string) produced different
      // `sourceSnapshotHash` values (hashed below, stage-runner.mjs). That defeats the one thing
      // the hash exists for -- letting a replay tell whether two inventories are even comparable
      // (AGENTS.md SS6: exact, replay-comparable source hashes) -- and separately leaked the
      // operator's filesystem layout onto the public MCP `structuredContent` (handlers.mjs) and
      // sidecar response. "git-ls-files (workspace toplevel)" names WHICH rule governed the scan
      // without encoding WHERE it ran.
      governingRuleSets = [
        "git-ls-files (workspace toplevel)",
        ".gitignore (working tree)",
        ".git/info/exclude",
        "core.excludesFile (global, if configured)",
      ];
    } catch (error) {
      // TASK-PRD-007 (round 4, M1): a real git command failure (maxBuffer exceeded, corrupt
      // .git, a hung/killed child) after we already confirmed this IS a usable git toplevel --
      // distinct from "not a git working tree", and must not be silently indistinguishable from
      // it. Still falls back so the scan itself does not hard-fail, but the reason is recorded.
      inventoryMode = "fallback-walk";
      inventoryModeReason = `git-command-failed:${firstLine(error)}`;
      unexpectedGitFailure = true;
      ({ files, directories } = await walkedInventory(root));
      governingRuleSets = ["FALLBACK_ONLY_IGNORED_DIRECTORY_NAMES", "SCRATCH_PATH_ROOTS"];
    }
  } else {
    inventoryMode = "fallback-walk";
    inventoryModeReason = gitContext.reason;
    unexpectedGitFailure = Boolean(gitContext.unexpected);
    ({ files, directories } = await walkedInventory(root));
    governingRuleSets = ["FALLBACK_ONLY_IGNORED_DIRECTORY_NAMES", "SCRATCH_PATH_ROOTS"];
  }

  files.sort(byProjectSourceFirst);

  // TASK-PRD-007 (round 5, R3): AGENTS.md SS10 "Escalate, Do Not Widen" -- an unexpected git
  // failure must never be silently indistinguishable from a normal git-aware scan while scope
  // widens under the fallback walk. Measured on this repo: git inventory 922 files; the fallback
  // walk admits 1726, 577 of them under `ref/` (a gitignored checkout of a foreign repository)
  // that would otherwise be inventoried, decomposed, and submitted to MSP as this project's own
  // knowledge with no operator-visible signal. Failing closed here would also break the two
  // LEGITIMATE fallback reasons this same function serves (plain non-git directories, test
  // fixtures) -- so this is the documented minimum from R3: a `warn` terminal line naming the
  // three facts an operator needs to notice the widen happened, not a hard failure.
  if (unexpectedGitFailure) {
    console.warn(
      `[govibe-scan] unexpected git failure widened inventory scope to a fallback walk -- inventoryMode=${inventoryMode} inventoryModeReason=${inventoryModeReason} fileCount=${files.length}`,
    );
  }
  const languages = {};
  for (const file of files) {
    const key = file.extension || "[no-extension]";
    languages[key] = (languages[key] ?? 0) + 1;
  }
  const sourceOfTruth = files
    .filter((file) => /(^|\/)(readme\.md|package\.json|docs\/|specs\/|src\/)/i.test(file.path))
    .map((file) => file.path);
  const usedGit = inventoryMode === "git";
  const exclusions = usedGit
    ? [".git", "git-ignore-rules (tracked + untracked-not-ignored via `git ls-files`)", ...SCRATCH_ROOT_EXCLUSIONS]
    : [".git", ...FALLBACK_ONLY_IGNORED_DIRECTORY_NAMES, ...FALLBACK_ONLY_IGNORED_GOVIBE_FILES, ...FALLBACK_ONLY_IGNORED_GOVIBE_DIRECTORIES, ...SCRATCH_ROOT_EXCLUSIONS];
  return {
    schema: "govibe-scan-inventory/v1",
    files,
    directories: [...directories].sort(ordinal),
    languages,
    sourceOfTruth,
    exclusions,
    // TASK-PRD-007 (round 4, M1/M2; corrected round 5, R5): which code path produced this
    // inventory, and why -- so a silent semantic downgrade (git-aware -> fallback walk) is
    // visible on the scan result instead of indistinguishable from a normal git-aware scan.
    // `governingRuleSets` is hashed INTO `sourceSnapshotHash` alongside the rest of this object
    // (stage-runner.mjs's hash(inventory)), so two runs whose governing rules genuinely differ
    // will genuinely hash differently -- but that is as far as it goes today: these three fields
    // are NOT written to `state/runs/<runId>/run.json` (stage-runner.mjs's runMeta has only
    // {schema, runId, createdAt, resumeRequested}), not carried on any stage-run record
    // (stage-contract.mjs's govibe-stage-run/v1), and not part of any MSP evidence or knowledge
    // payload (only `source_snapshot_hash` itself is). They exist solely on this in-memory
    // result and on runDeepScan()'s in-memory L2 result -- a caller in the SAME process (or one
    // reading the raw MCP/sidecar response for this run) can see them; nothing durable persists
    // them for a later, separate replay to consult.
    inventoryMode,
    inventoryModeReason,
    governingRuleSets,
  };
}

async function readWorkspaceId(workspacePath) {
  try {
    const config = JSON.parse(await readFile(path.join(workspacePath, ".govibe", "config.json"), "utf8"));
    if (config?.schema !== "govibe-workspace-config/v1" || typeof config.workspaceId !== "string" || !config.workspaceId.trim()) {
      throw new Error("invalid .govibe/config.json workspace identity");
    }
    return config.workspaceId.trim();
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function scanWorkspace({ workspacePath, deep = false, mspClient, actor = "unknown", adapters = createDefaultStageAdapters(), runId = randomUUID(), resume = false }) {
  const root = path.resolve(workspacePath);
  const inventory = await inventoryWorkspace(root);
  if (!deep) return { schema: "govibe-scan-result/v1", runId, level: "L1", status: "complete", inventory, deepScanRun: false };
  const workspaceId = await readWorkspaceId(root);
  return runDeepScan({ workspacePath: root, workspaceId, inventory, mspClient, actor, adapters, runId, resume });
}
