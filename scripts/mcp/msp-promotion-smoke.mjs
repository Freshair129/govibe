// TASK-PRD-023 (MASTERPLAN-govibe-production-readiness §3.3 AUD-01): MSP promotion smoke.
//
// Boots the in-repo msp-runtime through the SAME environment contract the MCP
// server uses (GOVIBE_MSP_COMMAND / GOVIBE_MSP_ARGS / GOVIBE_MSP_CWD consumed by
// createMspClientFromEnvironment, MSP_DB_PATH / MSP_GKS_PROVIDER consumed by
// packages/msp-runtime/bin/msp-runtime.mjs — see
// docs/operations/runbooks/RUNBOOK-Persistent-Memory-Runtime.md §3-§5), then
// drives one real deep-scan promotion round-trip end-to-end:
//
//   probeHealth -> deep scan (12 stages) -> msp_knowledge_promote -> gks: refs
//
// Exits non-zero on any failure, including a failed MSP boot, so wiring this
// into CI makes a broken launch contract fail the check instead of silently
// degrading to the unavailable client.
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

import { createMspClientFromEnvironment, scanWorkspace } from "../../packages/govibe-core/src/index.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const workRoot = path.join(tmpdir(), `govibe-msp-smoke-${randomBytes(6).toString("hex")}`);
const fixtureRoot = path.join(workRoot, "workspace");
const dbPath = path.join(workRoot, "msp.sqlite3");

function fail(message) {
  process.stderr.write(`msp-promotion-smoke FAIL: ${message}\n`);
  process.exitCode = 1;
}

async function createFixtureWorkspace() {
  await mkdir(path.join(fixtureRoot, ".govibe"), { recursive: true });
  await mkdir(path.join(fixtureRoot, "docs"), { recursive: true });
  await mkdir(path.join(fixtureRoot, "src"), { recursive: true });
  await writeFile(
    path.join(fixtureRoot, ".govibe", "config.json"),
    `${JSON.stringify({ schema: "govibe-workspace-config/v1", workspaceId: "workspace-msp-promotion-smoke" }, null, 2)}\n`,
  );
  await writeFile(
    path.join(fixtureRoot, "package.json"),
    `${JSON.stringify({ name: "msp-promotion-smoke-fixture", version: "0.0.0", private: true, scripts: { noop: "node --version" } }, null, 2)}\n`,
  );
  await writeFile(
    path.join(fixtureRoot, "README.md"),
    "# MSP Promotion Smoke Fixture\n\nSee [[SPEC]] and [docs/SPEC.md](docs/SPEC.md).\n",
  );
  await writeFile(
    path.join(fixtureRoot, "docs", "SPEC.md"),
    "# SPEC\n\n## Purpose\n\nMinimal governed fixture used by scripts/mcp/msp-promotion-smoke.mjs.\n",
  );
  await writeFile(
    path.join(fixtureRoot, "src", "base.ts"),
    "export class Base {\n  greet(): string {\n    return \"base\";\n  }\n}\n",
  );
  await writeFile(
    path.join(fixtureRoot, "src", "index.ts"),
    "import { Base } from \"./base\";\n\nexport class Greeter extends Base {\n  run(): string {\n    return this.greet();\n  }\n}\n\nexport function main(): string {\n  return new Greeter().run();\n}\n",
  );
}

async function main() {
  await createFixtureWorkspace();

  const env = {
    ...process.env,
    GOVIBE_MSP_COMMAND: process.execPath,
    GOVIBE_MSP_ARGS: JSON.stringify([path.join(repoRoot, "packages", "msp-runtime", "bin", "msp-runtime.mjs")]),
    GOVIBE_MSP_CWD: repoRoot,
    MSP_DB_PATH: dbPath,
    MSP_GKS_PROVIDER: "sqlite",
  };
  const client = createMspClientFromEnvironment(env);

  try {
    // Cold boot of the child (first better-sqlite3 load, migrations) can lose
    // the very first request on slow machines; a bounded retry keeps the smoke
    // deterministic without masking a genuinely broken launch contract.
    let health = await client.probeHealth();
    for (let attempt = 1; attempt <= 3 && health.health_state === "unavailable"; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      health = await client.probeHealth();
    }
    if (health.health_state === "unavailable") {
      fail(`MSP parent is unavailable (reason: ${health.reason ?? "unknown"}). Launch contract is broken.`);
      return;
    }
    process.stdout.write(`msp-promotion-smoke: MSP health_state=${health.health_state}\n`);

    const result = await scanWorkspace({ workspacePath: fixtureRoot, deep: true, mspClient: client, actor: "msp-promotion-smoke" });
    const stageSummary = result.stageRuns.map((run) => `${String(run.stage).padStart(2, "0")}:${run.status}`).join(" ");
    process.stdout.write(`msp-promotion-smoke: deep scan ${result.status} [${stageSummary}]\n`);

    if (result.status !== "complete") {
      const failures = result.stageRuns.filter((run) => run.status !== "complete" && run.status !== "not_applicable");
      fail(`deep scan did not complete: ${JSON.stringify(failures.map((run) => ({ stage: run.stage, status: run.status, error: run.error ?? null })))}`);
      return;
    }

    const knowledgeRefs = result.stageRuns.flatMap((run) => run.outputRefs.filter((ref) => ref.startsWith("gks:")));
    if (knowledgeRefs.length === 0) {
      fail("no stage produced a canonical gks: knowledge reference — promotion did not round-trip.");
      return;
    }
    process.stdout.write(`msp-promotion-smoke PASS: ${knowledgeRefs.length} candidate(s) promoted end-to-end (first: ${knowledgeRefs[0]}).\n`);
  } finally {
    client.callTool?.close?.();
    // Best-effort cleanup: on Windows the killed child can hold the SQLite
    // -shm/-wal locks for a moment (same race the msp-runtime tests tolerate).
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await rm(workRoot, { recursive: true, force: true });
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }
}

main().catch((error) => {
  fail(error instanceof Error ? (error.stack ?? error.message) : String(error));
});
