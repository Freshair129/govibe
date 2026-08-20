import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";

import { inventoryWorkspace } from "./scan.mjs";

const execFileAsync = promisify(execFile);

// TASK-PRD-007 (round 5, R4): the repo's own real .gitignore -- used by the R4 test below so it
// binds to what THIS repo actually declares, not a synthetic fixture that would pass against any
// .gitignore content. scan.test.mjs lives at packages/govibe-core/src/scan/; four levels up is
// the repo root.
const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));

// TASK-PRD-007 (B3, round 3): direct coverage of inventoryWorkspace() -- previously untested in
// isolation (only exercised indirectly through stage-adapters.test.mjs/stage-runner.test.mjs
// fixtures that never had a real .gitignore). scan.mjs now asks `git ls-files` for the file set
// (tracked + untracked-but-not-ignored) when workspacePath is a git working tree, so most of this
// suite spins up a real, throwaway git repo per test rather than approximating gitignore
// semantics by hand.

const roots = [];
// A just-exited `git` child process can hold its working directory's handle for a few ms on
// Windows, which can race an immediate recursive rm() into EBUSY -- maxRetries/retryDelay is
// Node's own documented mitigation (fs.promises.rm docs), not a real leak.
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))));

async function gitRoot(prefix) {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  roots.push(root);
  await execFileAsync("git", ["init", "-q"], { cwd: root });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: root });
  return root;
}

async function write(root, relative, content = "") {
  const full = path.join(root, relative);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, content);
}

async function track(root, relative) {
  await execFileAsync("git", ["add", "--", relative], { cwd: root });
}

function paths(inventory) {
  return inventory.files.map((file) => file.path).sort();
}

describe("inventoryWorkspace -- git-aware inclusion", () => {
  it("includes tracked files and untracked-but-not-ignored files; excludes gitignored files", async () => {
    const root = await gitRoot("govibe-scan-basic-");
    await write(root, ".gitignore", "ignored.txt\n");
    await write(root, "tracked.ts", "export const a = 1;\n");
    await track(root, "tracked.ts");
    await write(root, "untracked-new.ts", "export const b = 1;\n"); // new, not yet git-added, not ignored
    await write(root, "ignored.txt", "should not appear\n");

    const inventory = await inventoryWorkspace(root);

    // .gitignore itself is a real, untracked-but-not-ignored file -- git correctly includes it
    // (exactly as it does in the real repo, where .gitignore is tracked).
    expect(paths(inventory)).toEqual([".gitignore", "tracked.ts", "untracked-new.ts"]);
  });

  it("honors a partial-path rule (a subdirectory ignored, a sibling subdirectory tracked) -- not an approximation by top-level directory name", async () => {
    const root = await gitRoot("govibe-scan-partial-");
    await write(root, ".gitignore", "benchmark_results/v2/\n");
    await write(root, "benchmark_results/logs/run.log", "kept\n");
    await track(root, "benchmark_results/logs/run.log");
    await write(root, "benchmark_results/v2/scratch.json", "dropped\n");

    const inventory = await inventoryWorkspace(root);

    expect(paths(inventory)).toEqual([".gitignore", "benchmark_results/logs/run.log"]);
  });

  it("honors a negation (!pattern) re-including a file inside an otherwise-ignored directory", async () => {
    const root = await gitRoot("govibe-scan-negation-");
    await write(root, ".gitignore", "local_model/*\n!local_model/auto_scanned_models.json\n");
    await write(root, "local_model/weights.bin", "dropped\n");
    await write(root, "local_model/auto_scanned_models.json", "{}\n");
    await track(root, "local_model/auto_scanned_models.json");

    const inventory = await inventoryWorkspace(root);

    expect(paths(inventory)).toEqual([".gitignore", "local_model/auto_scanned_models.json"]);
  });

  it("excludes SCRATCH_PATH_ROOTS (.agents/, .claude/, .brain/, state/runs/) regardless of git tracking status", async () => {
    const root = await gitRoot("govibe-scan-scratch-");
    await write(root, "src/a.ts", "export const a = 1;\n");
    await track(root, "src/a.ts");
    await write(root, ".agents/notes.md", "# scratch\n");
    await track(root, ".agents/notes.md"); // even TRACKED .agents/ content is excluded -- deliberate policy, not a gitignore fact
    await write(root, "state/runs/run-1/01.json", "{}\n"); // scan's own self-output; not gitignored at all

    const inventory = await inventoryWorkspace(root);

    expect(paths(inventory)).toEqual(["src/a.ts"]);
  });

  it("includes tracked state/ files OUTSIDE state/runs/ -- the old scan.mjs hand list excluded the whole `state` directory, dropping real tracked project state", async () => {
    const root = await gitRoot("govibe-scan-state-");
    await write(root, "state/PROJECT_STATE.json", "{}\n");
    await track(root, "state/PROJECT_STATE.json");
    await write(root, "state/runs/run-1/01.json", "{}\n");

    const inventory = await inventoryWorkspace(root);

    expect(paths(inventory)).toEqual(["state/PROJECT_STATE.json"]);
  });

  // Round-3 orchestrator follow-up: the OLD hand-maintained `ignored` set in scan.mjs contained
  // ".govibe" unconditionally, so tracked files under .govibe/ (and .govibe-knowledge-block/)
  // never reached the inventory. Measured on the real repo: the ONLY files under those roots that
  // enter the inventory are git-TRACKED governance/contract source (.govibe/node-contracts/*.json,
  // .govibe/skills/**/SKILL.md, .govibe-knowledge-block/**) -- every runtime-state file the old
  // list was actually protecting against (config.json, project-state.json, skill-lock.json,
  // runs/, msp/) is ALREADY covered by real .gitignore rules and stays excluded here too, with no
  // hand-listing required. Deliberate choice: trust git's tracked/ignored status for .govibe/ and
  // .govibe-knowledge-block/ (same principle as benchmark_results/ and local_model/ above) rather
  // than re-adding a third hand-maintained root exclusion -- committing a file IS the project
  // declaring it real content.
  it("includes git-TRACKED files under .govibe/ and .govibe-knowledge-block/ (contract/skill source), while runtime state under .govibe/ stays gitignored-excluded", async () => {
    const root = await gitRoot("govibe-scan-govibe-dir-");
    await write(root, ".gitignore", [
      ".govibe/config.json",
      ".govibe/project-state.json",
      ".govibe/skill-lock.json",
      ".govibe/runs/",
      ".govibe/msp/",
    ].join("\n") + "\n");
    await write(root, ".govibe/node-contracts/GLS-001.json", "{}\n");
    await track(root, ".govibe/node-contracts/GLS-001.json");
    await write(root, ".govibe/skills/example/1.0.0/SKILL.md", "# Skill\n");
    await track(root, ".govibe/skills/example/1.0.0/SKILL.md");
    await write(root, ".govibe-knowledge-block/SCHEMA.md", "# Schema\n");
    await track(root, ".govibe-knowledge-block/SCHEMA.md");
    // Runtime/governance state -- gitignored, must stay excluded exactly as before.
    await write(root, ".govibe/config.json", '{"workspaceId":"w"}\n');
    await write(root, ".govibe/skill-lock.json", "{}\n");
    await write(root, ".govibe/runs/run-1/01.json", "{}\n");

    const inventory = await inventoryWorkspace(root);

    expect(paths(inventory)).toEqual([
      ".gitignore",
      ".govibe-knowledge-block/SCHEMA.md",
      ".govibe/node-contracts/GLS-001.json",
      ".govibe/skills/example/1.0.0/SKILL.md",
    ]);
  });

  // TASK-PRD-007 (round 4, M4; fixed round 5, R4): the round-4 version of this test wrote its OWN
  // synthetic `.gitignore` containing exactly the three rules under test, then asserted git
  // honors them -- that tests git's gitignore engine, not THIS repo's .gitignore, and would have
  // passed unchanged even if round 4 had never added the rules at all (the comment right above
  // this one, in round 4, correctly diagnosed this identical flaw in the test IT was replacing,
  // then reintroduced it). Round 5 (R4) binds the test to the real, tracked `.gitignore` at the
  // repo root: the fixture's `.gitignore` is a byte-for-byte copy of `repoRoot/.gitignore`, so if
  // a future edit ever drops the `.govibe/rbac.json` / `.govibe/contexts/` /
  // `.govibe/context-injections/` rules from the real file, this test fails for the right reason.
  it("excludes .govibe/rbac.json, .govibe/contexts/, and .govibe/context-injections/ using THIS REPO's real, tracked .gitignore -- not a synthetic fixture (R4)", async () => {
    const root = await gitRoot("govibe-scan-runtime-writes-");
    const realGitignore = await readFile(path.join(repoRoot, ".gitignore"), "utf8");
    // Sanity check on the copied fixture itself -- if this ever fails, the .gitignore rules this
    // test depends on were removed from the real repo, and the assertion below would otherwise
    // pass or fail for the wrong reason.
    for (const rule of [".govibe/rbac.json", ".govibe/contexts/", ".govibe/context-injections/"]) {
      expect(realGitignore).toContain(rule);
    }
    await write(root, ".gitignore", realGitignore);
    await track(root, ".gitignore");
    await write(root, "src/a.ts", "export const a = 1;\n");
    await track(root, "src/a.ts");
    // Written the way the real runtime writers leave them: untracked, never `git add`-ed.
    await write(root, ".govibe/rbac.json", '{"schema":"govibe-rbac-state/v1","assignments":[]}\n');
    await write(root, ".govibe/contexts/cache_abc123.json", '{"schema":"govibe-context-cache/v1"}\n');
    await write(root, ".govibe/context-injections/inject_abc123.json", '{"schema":"govibe-context-injection/v1"}\n');

    const inventory = await inventoryWorkspace(root);

    expect(paths(inventory)).toEqual([".gitignore", "src/a.ts"]);
  });

  it("falls back to a plain directory walk (still respecting SCRATCH_PATH_ROOTS) when workspacePath is not a git working tree", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-scan-nongit-"));
    roots.push(root);
    await write(root, "src/a.ts", "export const a = 1;\n");
    await write(root, ".agents/notes.md", "# scratch\n");
    await write(root, "node_modules/pkg/index.js", "module.exports = {};\n");

    const inventory = await inventoryWorkspace(root);

    expect(paths(inventory)).toEqual(["src/a.ts"]);
    // TASK-PRD-007 (round 4, M1): the "not a git working tree" case is legitimate and expected --
    // it must still be recorded, not merely silently handled, so the scan result carries a
    // visible signal of which code path produced this inventory.
    expect(inventory.inventoryMode).toBe("fallback-walk");
    expect(inventory.inventoryModeReason).toBe("not-a-git-work-tree");
  });

  // TASK-PRD-007 (round 4, M1; corrected round 5, R2): the round-4 fallback exclusion restored
  // ".govibe" and "state" WHOLESALE, by directory name -- which CONTRADICTED the git-aware path
  // on nine git-tracked files (.govibe/node-contracts/*.json, .govibe/skills/**/SKILL.md,
  // state/PROJECT_STATE.json, state/events.jsonl, state/progress.jsonl): included by git, excluded
  // by the fallback walk, with no test able to catch the divergence because the OLD version of
  // this very test asserted the opposite of "includes tracked state/ files..." above -- one
  // workspace, two answers, depending only on whether git happened to be installed. Round 5 (R2)
  // narrows the exclusion to the specific runtime write-targets .gitignore actually declares under
  // `.govibe/`, and this test now asserts the SAME outcome the git-aware tests above assert:
  // `.govibe/node-contracts/**` and `state/PROJECT_STATE.json` survive on the fallback path too,
  // while the real runtime-state targets and `state/runs/` (SCRATCH_PATH_ROOTS) still do not.
  it("narrows the .govibe/ fallback exclusion to git's own runtime-state rules -- state/ and .govibe/node-contracts survive, consistent with the git-aware path (R2)", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-scan-nongit-govibe-"));
    roots.push(root);
    await write(root, "src/a.ts", "export const a = 1;\n");
    await write(root, ".govibe/config.json", '{"workspaceId":"w"}\n');
    await write(root, ".govibe/project-state.json", "{}\n");
    await write(root, ".govibe/skill-lock.json", "{}\n");
    await write(root, ".govibe/rbac.json", "{}\n");
    await write(root, ".govibe/msp/index.sqlite", "binary\n");
    await write(root, ".govibe/runs/run-1/01.json", "{}\n");
    await write(root, ".govibe/contexts/cache_abc123.json", "{}\n");
    await write(root, ".govibe/context-injections/inject_abc123.json", "{}\n");
    // Git-tracked contract/skill source under .govibe/ -- NOT a runtime write target, must survive
    // exactly as it does on the git-aware path (see the ".govibe/" inclusion test above).
    await write(root, ".govibe/node-contracts/GLS-001.json", "{}\n");
    // Real, git-tracked project state outside state/runs/ -- must survive on BOTH paths.
    await write(root, "state/PROJECT_STATE.json", "{}\n");
    // Scan's own self-output -- still excluded, but via SCRATCH_PATH_ROOTS (state/runs/), not by
    // nuking the whole `state/` directory.
    await write(root, "state/runs/run-1/01.json", "{}\n");

    const inventory = await inventoryWorkspace(root);

    expect(paths(inventory)).toEqual([".govibe/node-contracts/GLS-001.json", "src/a.ts", "state/PROJECT_STATE.json"]);
  });

  // TASK-PRD-007 (round 4, M2): reproduces the reported defect directly -- a workspace ignored by
  // an ENCLOSING repository is itself a valid, real directory with real files, but `git -C <path>
  // ls-files` (without the M2 toplevel check) silently answers using the ENCLOSING repo's ignore
  // rules and returns zero files for it. `workspacePath` here is nested inside (and, via the
  // outer .gitignore, ignored by) an enclosing repo -- the fix must detect that workspacePath is
  // NOT itself the git toplevel and fall back to a plain walk of the real directory, rather than
  // trusting `ls-files` and reporting an empty inventory.
  it("falls back to a plain directory walk (not an empty inventory) when workspacePath is ignored by an ENCLOSING repository (M2)", async () => {
    const enclosing = await gitRoot("govibe-scan-enclosing-");
    await write(enclosing, ".gitignore", "nested/\n");
    const nestedRelative = "nested";
    await write(enclosing, `${nestedRelative}/src/a.ts`, "export const a = 1;\n");
    const nested = path.join(enclosing, nestedRelative);

    const inventory = await inventoryWorkspace(nested);

    // The old (M2-vulnerable) behavior: `git -C nested ls-files` resolves to the ENCLOSING repo's
    // toplevel and reports zero files for the (gitignored-by-the-parent) nested/ subtree. The fix
    // must still see the real file.
    expect(paths(inventory)).toEqual(["src/a.ts"]);
    expect(inventory.inventoryMode).toBe("fallback-walk");
    expect(inventory.inventoryModeReason).toBe("workspace-is-not-git-toplevel");
  });

  it("records inventoryMode: \"git\" and a null inventoryModeReason on a normal, git-aware scan", async () => {
    const root = await gitRoot("govibe-scan-mode-git-");
    await write(root, "src/a.ts", "export const a = 1;\n");
    await track(root, "src/a.ts");

    const inventory = await inventoryWorkspace(root);

    expect(inventory.inventoryMode).toBe("git");
    expect(inventory.inventoryModeReason).toBeNull();
    expect(inventory.governingRuleSets).toContain("git-ls-files (workspace toplevel)");
  });

  // TASK-PRD-007 (round 5, R1): `governingRuleSets` must be a content-addressed token set, not an
  // absolute filesystem path -- it used to include `git-toplevel:${gitContext.toplevel}`, which
  // made `sourceSnapshotHash` (stage-runner.mjs hashes the whole inventory, including this field)
  // depend on WHERE the workspace happened to be cloned. Proves the fix directly: the exact same
  // content, scanned from two DIFFERENT absolute paths, produces the exact same
  // `governingRuleSets` (and therefore the same hashable inventory shape for that field).
  it("governingRuleSets never encodes the workspace's absolute path -- identical content at two different absolute paths yields identical governingRuleSets (R1)", async () => {
    const rootA = await gitRoot("govibe-scan-r1-path-a-");
    await write(rootA, "src/a.ts", "export const a = 1;\n");
    await track(rootA, "src/a.ts");
    const rootB = await gitRoot("govibe-scan-r1-path-b-");
    await write(rootB, "src/a.ts", "export const a = 1;\n");
    await track(rootB, "src/a.ts");

    const inventoryA = await inventoryWorkspace(rootA);
    const inventoryB = await inventoryWorkspace(rootB);

    expect(rootA).not.toBe(rootB); // sanity: these really are two different absolute paths
    expect(inventoryA.governingRuleSets).toEqual(inventoryB.governingRuleSets);
    for (const entry of inventoryA.governingRuleSets) {
      expect(entry).not.toContain(rootA);
      expect(entry).not.toContain(rootB);
    }
  });
});

// TASK-PRD-007 (round 5, R3): an *unexpected* git failure (git itself unavailable, a corrupt
// .git, a maxBuffer overrun, a killed child) must never silently widen scan scope with no signal
// -- AGENTS.md SS10 "Escalate, Do Not Widen". This exercises detectGitContext()'s
// `git-not-on-path` branch (the simplest reproducible "unexpected" case) by hiding `git` from
// PATH resolution for the duration of one call, and asserts inventoryWorkspace() both (a) still
// records the distinguishable inventoryModeReason it already did before R3, and (b) NOW also
// emits a `console.warn` naming inventoryMode/inventoryModeReason/file count -- the part R3 adds.
describe("inventoryWorkspace -- unexpected git failure escalation (R3)", () => {
  // Asserts the console.warn this module emits. The operator-facing Terminal line lives in
  // scripts/mcp/runtime/workspace-service.mjs scan(), which keys off inventoryModeReason --
  // scan.mjs has no snapshot store to write to.
  it("emits a console warning naming inventoryMode, inventoryModeReason, and file count when git itself is unavailable", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-scan-no-git-binary-"));
    roots.push(root);
    await write(root, "src/a.ts", "export const a = 1;\n");

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const originalPath = process.env.PATH;
    try {
      // Hide git from PATH resolution entirely -- causes detectGitContext()'s execFile to fail
      // with ENOENT ("git-not-on-path", unexpected: true), NOT "not a git repository" (which is
      // the normal/expected fallback reason and must NOT warn).
      process.env.PATH = "";

      const inventory = await inventoryWorkspace(root);

      expect(inventory.inventoryMode).toBe("fallback-walk");
      expect(inventory.inventoryModeReason).toBe("git-not-on-path");
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const [message] = warnSpy.mock.calls[0];
      expect(message).toContain("inventoryMode=fallback-walk");
      expect(message).toContain("inventoryModeReason=git-not-on-path");
      expect(message).toContain(`fileCount=${inventory.files.length}`);
    } finally {
      process.env.PATH = originalPath;
      warnSpy.mockRestore();
    }
  });

  it("does NOT warn on the normal, expected \"not a git working tree\" fallback reason", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-scan-expected-fallback-"));
    roots.push(root);
    await write(root, "src/a.ts", "export const a = 1;\n");

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const inventory = await inventoryWorkspace(root);

      expect(inventory.inventoryModeReason).toBe("not-a-git-work-tree");
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe("inventoryWorkspace -- B5 ordering (project-source bias, locale-independence)", () => {
  // TASK-PRD-007 (round 4, M5): root-level files now rank AHEAD of even src/packages/scripts/docs
  // (see scan.mjs's isRootLevelFile()/priorityRank()) -- "zzz-root-file.ts" moved from last to
  // first versus the round-3 version of this test.
  it("orders root-level files first, then src/, packages/, scripts/, docs/, then alphabetically (ordinal, not locale-dependent) within each group", async () => {
    const root = await gitRoot("govibe-scan-ordering-");
    for (const relative of ["zzz-root-file.ts", "docs/z.md", "packages/z.mjs", "scripts/z.mjs", "src/z.ts", "src/a.ts"]) {
      await write(root, relative, "// x\n");
      await track(root, relative);
    }

    const inventory = await inventoryWorkspace(root);

    expect(inventory.files.map((file) => file.path)).toEqual([
      "zzz-root-file.ts",
      "src/a.ts",
      "src/z.ts",
      "packages/z.mjs",
      "scripts/z.mjs",
      "docs/z.md",
    ]);
  });

  // TASK-PRD-007 (round 4, M5): direct regression coverage for the reported defect -- measured on
  // this repo BEFORE this fix, AGENTS.md sorted at inventory index 730, CLAUDE.md 731, PRODUCT.md
  // 740, all past the 500-file stage-1 STAGE_GRAPH_BUDGET, so none of them ever received a
  // `file:` node from a real deep scan. A large src/ tree must not push these out of the front of
  // the inventory.
  it("keeps root-level governance docs (AGENTS.md, CLAUDE.md, PRODUCT.md) ahead of a large src/ tree", async () => {
    const root = await gitRoot("govibe-scan-governance-priority-");
    for (const relative of ["AGENTS.md", "CLAUDE.md", "PRODUCT.md"]) {
      await write(root, relative, "# doc\n");
      await track(root, relative);
    }
    for (let index = 0; index < 20; index += 1) {
      const relative = `src/module-${String(index).padStart(2, "0")}.ts`;
      await write(root, relative, "// x\n");
      await track(root, relative);
    }

    const inventory = await inventoryWorkspace(root);
    const paths = inventory.files.map((file) => file.path);
    const governanceIndices = ["AGENTS.md", "CLAUDE.md", "PRODUCT.md"].map((name) => paths.indexOf(name));

    expect(governanceIndices.every((index) => index >= 0 && index < 3)).toBe(true);
  });
});
