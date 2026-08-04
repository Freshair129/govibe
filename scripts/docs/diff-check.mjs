import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const args = new Set(process.argv.slice(2));
const stagedOnly = args.has("--staged");
function git(commandArgs) {
  return execFileSync("git", commandArgs, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function listChangedFiles() {
  const files = new Set();
  const diffArgs = stagedOnly ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR"] : ["diff", "--name-only", "HEAD", "--diff-filter=ACMR"];
  const diffOutput = git(diffArgs);
  if (diffOutput) {
    for (const line of diffOutput.split(/\r?\n/)) {
      if (line.trim()) files.add(line.trim());
    }
  }

  if (!stagedOnly) {
    const untracked = git(["ls-files", "--others", "--exclude-standard"]);
    if (untracked) {
      for (const line of untracked.split(/\r?\n/)) {
        if (line.trim()) files.add(line.trim());
      }
    }
  }

  return [...files];
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
  if (/^(src|scripts|packages|public|tests|test|app|views|components)\//i.test(file)) return "code";
  return "other";
}

function runDocsValidate() {
  execSync("npm run docs:validate", { cwd: repoRoot, stdio: "inherit", shell: true });
}

function main() {
  const changedFiles = listChangedFiles();
  const groups = new Map([
    ["docs", []],
    ["code", []],
    ["masterplan", []],
    ["other", []],
  ]);

  for (const file of changedFiles) {
    groups.get(classify(file)).push(file);
  }

  console.log("GoVibe diff check");
  console.log("------------------");
  console.log(`Mode: ${stagedOnly ? "staged" : "HEAD + working tree"}`);
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
  const hasAnyRelevant = hasCode || hasDocs || hasMasterplan;

  if (hasCode && !hasDocs && !hasMasterplan) {
    console.error("\nFAIL: code changed without any accompanying docs or masterplan change.");
    process.exitCode = 1;
    return;
  }

  if (hasAnyRelevant) {
    runDocsValidate();
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
