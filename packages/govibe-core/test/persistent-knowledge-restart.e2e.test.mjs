import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";
import { open as openMspDb } from "../../msp-runtime/src/db/connection.mjs";

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const worker = path.join(here, "fixtures", "persistent-knowledge-worker.mjs");
const cleanup = [];

afterEach(async () => {
  while (cleanup.length) await cleanup.pop()();
});

async function fixtureWorkspace() {
  const root = await mkdtemp(path.join(tmpdir(), "govibe-issue-77-"));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".govibe"), { recursive: true });
  await mkdir(path.join(root, "src"), { recursive: true });
  const workspaceId = "workspace-issue-77-fixture";
  await writeFile(path.join(root, ".govibe", "config.json"), `${JSON.stringify({
    schema: "govibe-workspace-config/v1",
    workspaceId,
    projectId: "project-issue-77-fixture",
    createdAt: "2026-08-15T00:00:00.000Z",
  }, null, 2)}\n`);

  const markdown = ["# Persistent Knowledge Fixture", "Fixture root."].concat(
    Array.from({ length: 60 }, (_, index) => [`## Requirement ${index + 1}`, `Requirement body ${index + 1}.`]).flat(),
  ).join("\n\n");
  const typescript = Array.from({ length: 60 }, (_, index) =>
    `export function operation${index + 1}(value: number) { return value + ${index + 1}; }`,
  ).join("\n\n");
  await writeFile(path.join(root, "README.md"), `${markdown}\n`);
  await writeFile(path.join(root, "src", "operations.ts"), `${typescript}\n`);
  return { root, dbPath: path.join(root, "msp.sqlite3"), workspaceId };
}

async function runWorker(phase, fixture, sourceHash = "0".repeat(64), env = {}) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [worker, phase, fixture.root, fixture.dbPath, fixture.workspaceId, sourceHash], {
    env: { ...process.env, ...env },
    timeout: 30_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (stderr.trim()) throw new Error(`Issue #77 worker stderr: ${stderr}`);
  return JSON.parse(stdout.trim());
}

function dbCounts(dbPath) {
  const db = openMspDb(dbPath);
  try {
    return {
      contexts: db.prepare("SELECT COUNT(*) AS count FROM contexts").get().count,
      retrievals: db.prepare("SELECT COUNT(*) AS count FROM gks_retrieval_evidence").get().count,
      knowledge: db.prepare("SELECT COUNT(*) AS count FROM gks_knowledge").get().count,
    };
  } finally {
    db.close();
  }
}

describe("#77 persistent MSP-governed knowledge E2E", () => {
  it("Deep Scans Markdown + TypeScript, restarts the GoVibe/MSP processes, and retrieves canonical provenance", async () => {
    const fixture = await fixtureWorkspace();
    const firstProcess = await runWorker("scan", fixture);
    expect(firstProcess.health.health_state).toBe("ready");
    expect(firstProcess.result.status).toBe("complete");
    expect(firstProcess.result.workspaceId).toBe(fixture.workspaceId);
    expect(firstProcess.result.sourceSnapshotHash).toMatch(/^[a-f0-9]{64}$/);

    const markdownStage = firstProcess.result.stageRuns.find((stage) => stage.stage === 3);
    const typescriptStage = firstProcess.result.stageRuns.find((stage) => stage.stage === 5);
    expect(markdownStage).toMatchObject({ status: "complete", method: "markdown-document-link-parser" });
    expect(typescriptStage).toMatchObject({ status: "complete", method: "typescript-symbol-and-call-ast" });
    expect(markdownStage.outputRefs.some((ref) => ref.startsWith("gks:"))).toBe(true);
    expect(typescriptStage.outputRefs.some((ref) => ref.startsWith("gks:"))).toBe(true);

    const secondProcess = await runWorker("retrieve", fixture, firstProcess.result.sourceSnapshotHash);
    expect(secondProcess.health.health_state).toBe("ready");
    expect(secondProcess.context.contextId).toMatch(/^msp:context\//);
    expect(secondProcess.context.policyDecision).toBe("allow");
    expect(secondProcess.context.retrievalEvidenceRef).toMatch(/^gks:retrieval\//);
    expect(secondProcess.context.approvedBudget).toMatchObject({ maxTokens: 32768, retrievalRadius: 2 });
    expect(secondProcess.context.lineage).toMatchObject({ runId: "run-retrieve", sessionId: "session-retrieve", turnId: "turn-retrieve" });
    expect(secondProcess.context.sharedVaultRefs.length).toBeGreaterThan(0);
    expect(secondProcess.context.sharedVaultRefs.every((item) => item.ref.startsWith("gks:") && item.sourceHash === firstProcess.result.sourceSnapshotHash)).toBe(true);

    const markdownProvenance = secondProcess.context.provenance.find((item) => item.stage === 3);
    const typescriptProvenance = secondProcess.context.provenance.find((item) => item.stage === 5);
    expect(markdownProvenance).toBeTruthy();
    expect(markdownProvenance.provenanceRef).toMatch(/^msp:proof\//);
    expect(markdownProvenance.sourceRefs).toContain("README.md");
    expect(markdownProvenance.atomRefs.some((ref) => ref.startsWith("markdown:README.md:"))).toBe(true);
    expect(typescriptProvenance).toBeTruthy();
    expect(typescriptProvenance.sourceRefs).toContain("src/operations.ts");
    expect(typescriptProvenance.atomRefs.some((ref) => ref.startsWith("symbol:src/operations.ts:"))).toBe(true);

    const representedAtoms = new Set(secondProcess.context.provenance.flatMap((item) => item.atomRefs));
    expect(representedAtoms.size).toBeGreaterThanOrEqual(100);

    const benchmark = await runWorker("benchmark", fixture, firstProcess.result.sourceSnapshotHash);
    expect(benchmark.retrievedItems).toBeGreaterThan(0);
    expect(benchmark.sampleCount).toBe(20);
    expect(benchmark.p95Ms).toBeLessThanOrEqual(1_000);
  }, 45_000);

  it("rejects unauthorized workspace and invalid radius before provider/context storage traversal", async () => {
    const fixture = await fixtureWorkspace();
    const scanned = await runWorker("scan", fixture);
    const before = dbCounts(fixture.dbPath);

    const workspaceDenied = await runWorker("deny-workspace", fixture, scanned.result.sourceSnapshotHash);
    expect(workspaceDenied.unexpectedSuccess).toBe(false);
    expect(workspaceDenied.error).toMatch(/workspace_id does not match context authority/i);
    expect(dbCounts(fixture.dbPath)).toEqual(before);

    const radiusDenied = await runWorker("deny-radius", fixture, scanned.result.sourceSnapshotHash);
    expect(radiusDenied.unexpectedSuccess).toBe(false);
    expect(radiusDenied.error).toMatch(/radius|retrieval/i);
    expect(dbCounts(fixture.dbPath)).toEqual(before);
  }, 45_000);

  it("never reports promotion success when the GKS provider is unavailable", async () => {
    const fixture = await fixtureWorkspace();
    const scanned = await runWorker("scan", fixture);
    const unavailable = await runWorker("unavailable", fixture, scanned.result.sourceSnapshotHash, { TEST_GKS_PROVIDER: "unconfigured" });
    expect(unavailable.health.health_state).not.toBe("ready");
    expect(unavailable.health.components.gks.state).toBe("blocked");
    expect(unavailable.unexpectedSuccess).toBe(false);
    expect(unavailable.error).toMatch(/gks_provider_unconfigured/i);
  }, 45_000);
});