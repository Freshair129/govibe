import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const argv = process.argv.slice(2);
const args = new Set(argv);
const stagedOnly = args.has("--staged");
// CI mode: diff against a PR's base branch (three-dot: base...HEAD via the merge-base),
// not the working tree. `--staged` and `--base` are mutually exclusive; `--base` wins if
// both are somehow passed since it is the more explicit, CI-authoritative signal.
const baseIndex = argv.indexOf("--base");
const baseRef = baseIndex !== -1 ? argv[baseIndex + 1] : undefined;
if (baseIndex !== -1 && !baseRef) {
  console.error("FAIL: --base requires a ref argument, e.g. --base origin/main");
  process.exitCode = 1;
}
function git(commandArgs) {
  return execFileSync("git", commandArgs, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function listChangedFiles() {
  const files = new Set();
  const diffArgs = baseRef
    ? ["diff", "--name-only", `${baseRef}...HEAD`, "--diff-filter=ACMR"]
    : stagedOnly
      ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR"]
      : ["diff", "--name-only", "HEAD", "--diff-filter=ACMR"];
  const diffOutput = git(diffArgs);
  if (diffOutput) {
    for (const line of diffOutput.split(/\r?\n/)) {
      if (line.trim()) files.add(line.trim());
    }
  }

  // Untracked files only make sense against the live working tree (local/staged modes).
  // A --base CI run diffs two committed refs, where "untracked" is meaningless.
  if (!stagedOnly && !baseRef) {
    const untracked = git(["ls-files", "--others", "--exclude-standard"]);
    if (untracked) {
      for (const line of untracked.split(/\r?\n/)) {
        if (line.trim()) files.add(line.trim());
      }
    }
  }

  return [...files];
}

// A pure test/spec change legitimately needs no product docs update — only carve these
// out of the docs-first "code" trigger, never weaken it for actual product code. Matches
// a *.test.*/*.spec.* filename suffix (vitest convention used throughout this repo) or a
// file living under an exact tests/test/__tests__/e2e directory segment.
const TEST_SUFFIX_PATTERN = /\.(test|spec)\.[^./]+$/i;
const TEST_DIRECTORY_PATTERN = /(^|\/)(tests?|__tests__|e2e)\//i;

function isTestFile(file) {
  return TEST_SUFFIX_PATTERN.test(file) || TEST_DIRECTORY_PATTERN.test(file);
}

function classify(file) {
  if (
    /^docs\/roadmap\//i.test(file) ||
    /^docs\/features\/project-roadmap\//i.test(file) ||
    /^\.agents\/pm\/asset\//i.test(file) ||
    /^\.agents\/pm\//i.test(file) ||
    /^docs\/STD-/i.test(file) ||
    /^docs\/DOC-VERSION-REGISTRY\.md$/i.test(file)
  ) {
    return "masterplan";
  }
  if (/^docs\//i.test(file) || /^\.agents\//i.test(file) || /^implementation_plan_template\.md$/i.test(file)) return "docs";
  if (/^(src|scripts|packages|public|tests|test|app|views|components)\//i.test(file)) {
    return isTestFile(file) ? "test" : "code";
  }
  return "other";
}

function runDocsValidate() {
  execSync("npm run docs:validate", { cwd: repoRoot, stdio: "inherit", shell: true });
}

function main() {
  if (baseIndex !== -1 && !baseRef) return; // already reported above; exitCode is set
  const changedFiles = listChangedFiles();
  const groups = new Map([
    ["docs", []],
    ["code", []],
    ["test", []],
    ["masterplan", []],
    ["other", []],
  ]);

  for (const file of changedFiles) {
    groups.get(classify(file)).push(file);
  }

  console.log("GoVibe diff check");
  console.log("------------------");
  console.log(`Mode: ${baseRef ? `base ${baseRef}...HEAD` : stagedOnly ? "staged" : "HEAD + working tree"}`);
  console.log(`Changed files: ${changedFiles.length}`);
  for (const [group, files] of groups) {
    console.log(`${group}: ${files.length}`);
    for (const file of files.slice(0, 5)) {
      console.log(`  - ${file}`);
    }
    if (files.length > 5) {
      console.log(`  - ...and ${files.length - 5} more`);
    }
  }

  const hasCode = groups.get("code").length > 0;
  const hasDocs = groups.get("docs").length > 0;
  const hasMasterplan = groups.get("masterplan").length > 0;
  const hasTestOnly = groups.get("test").length > 0;
  const hasAnyRelevant = hasCode || hasDocs || hasMasterplan;

  // "code" here already excludes pure test/spec files (see classify()/isTestFile above),
  // so this only ever fires on an actual product-code change — a test-only PR (product
  // "code" group empty, "test" group non-empty) does not reach this branch.
  if (hasCode && !hasDocs && !hasMasterplan) {
    console.error("\nFAIL: code changed without any accompanying docs or masterplan change.");
    process.exitCode = 1;
    return;
  }

  if (hasAnyRelevant) {
    runDocsValidate();
  } else if (hasTestOnly) {
    console.log("\nPASS: only test/spec files changed; no product-doc requirement triggered.");
  } else {
    console.log("\nPASS: no docs/code/masterplan changes detected.");
  }
}

try {
  main();
} catch (error) {
  console.error("\nFAIL: diff check failed.");
  console.error(`Reason: ${error?.message || "unknown error"}`);
  if (error?.stdout) process.stdout.write(error.stdout);
  if (error?.stderr) process.stderr.write(error.stderr);
  process.exitCode = 1;
}
