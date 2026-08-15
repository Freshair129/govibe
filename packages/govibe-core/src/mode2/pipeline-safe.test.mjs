import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { getMode2ScanStatus, runMode2Scan } from "./pipeline.mjs";
import { MODE2_STAGES } from "./stage-contract.mjs";
import { createWorkspaceAdapter } from "./workspace-adapter.mjs";

const roots = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixtureRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "govibe-mode2-pipeline-"));
  roots.push(root);
  await writeFile(path.join(root, "README.md"), "# Fixture\n", "utf8");
  return root;
}

function deterministicStages(calls) {
  return MODE2_STAGES.map((name, index) => ({
    stage: index + 1,
    name,
    method: "deterministic-test",
    extractorVersion: "pipeline-safe/v1",
    usesTreeShape: false,
    dependsOnStages: [],
    inputs: () => [],
    async run() {
      calls.push(index + 1);
      return { status: "complete", confidence: 1, artifact: { stage: index + 1, stable: true } };
    },
  }));
}

describe("Mode 2 resumable pipeline boundary", () => {
  it("executes exactly twelve semantic stages and exposes no finalization result", async () => {
    const root = await fixtureRoot();
    const calls = [];
    const result = await runMode2Scan({
      adapter: createWorkspaceAdapter({ workspaceRoot: root }),
      runId: "run-one",
      stages: deterministicStages(calls),
    });

    expect(calls).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
    expect(result.status).toBe("complete");
    expect(result.stageCount).toBe(12);
    expect(result.stageRuns).toHaveLength(12);
    expect(result).not.toHaveProperty("finalization");
    expect(result.incremental).toMatchObject({ reusedStages: 0, executedStages: 12 });
  });

  it("reuses persisted stage artifacts across a later run", async () => {
    const root = await fixtureRoot();
    const firstCalls = [];
    await runMode2Scan({
      adapter: createWorkspaceAdapter({ workspaceRoot: root }),
      runId: "run-one",
      stages: deterministicStages(firstCalls),
    });

    const secondCalls = [];
    const second = await runMode2Scan({
      adapter: createWorkspaceAdapter({ workspaceRoot: root }),
      runId: "run-two",
      stages: deterministicStages(secondCalls),
      reuseFromRunId: "run-one",
    });

    expect(secondCalls).toEqual([]);
    expect(second.incremental).toMatchObject({ reusedStages: 12, executedStages: 0, baselineRunId: "run-one" });
    expect(second.stageRuns.every((record) => record.reusedFrom === "run-one")).toBe(true);
  });

  it("reports persisted status and rejects path-shaped run identifiers", async () => {
    const root = await fixtureRoot();
    const adapter = createWorkspaceAdapter({ workspaceRoot: root });
    await expect(runMode2Scan({ adapter, runId: "../escape", stages: deterministicStages([]) })).rejects.toThrow(/Invalid Mode 2 scan runId/);

    await runMode2Scan({ adapter, runId: "safe-run", stages: deterministicStages([]) });
    const status = await getMode2ScanStatus({ workspaceRoot: root, runId: "safe-run" });
    expect(status.status).toBe("complete");
    expect(status.stageRuns).toHaveLength(12);
    expect(status).not.toHaveProperty("finalization");
  });
});
