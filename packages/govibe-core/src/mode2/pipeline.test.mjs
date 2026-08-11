import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { bindExternalWorkspace, inspectExternalWorkspace } from "./external-binding.mjs";
import { getMode2ScanStatus, runMode2Scan } from "./pipeline.mjs";
import { createMode2Stages } from "./stages.mjs";
import { MODE2_STAGES, MODE2_STAGE_RUN_SCHEMA, validateMode2StageRun } from "./stage-contract.mjs";
import { createWorkspaceAdapter } from "./workspace-adapter.mjs";

let root;

async function write(relativePath, content) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

function adapterFor(client = "claude-code") {
  return createWorkspaceAdapter({ client, workspaceRoot: root });
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "govibe-mode2-pipeline-"));
  await write(
    "package.json",
    JSON.stringify({ name: "fixture-app", dependencies: { react: "^18.0.0", express: "^4.0.0" }, devDependencies: { vitest: "^1.0.0" } }, null, 2),
  );
  await write("package-lock.json", "{}\n");
  await write("vite.config.ts", "export default {};\n");
  await write("CLAUDE.md", "# instructions\n");
  await write("docs/ADR-001.md", "# decision\n");
  await write("src/index.ts", "import { helper } from './helper';\nexport function main() { return helper(); }\n");
  await write("src/helper.ts", "export function helper() { return 1; }\n");
  await write("src/index.test.ts", "import { main } from './index';\nmain();\n");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("DS-01/DS-02 stage contract", () => {
  it("runs twelve stages in canonical order and validates every record", async () => {
    const result = await runMode2Scan({ adapter: adapterFor(), runId: "run-a" });
    expect(result.stageRuns).toHaveLength(12);
    result.stageRuns.forEach((record, index) => {
      expect(record.schema).toBe(MODE2_STAGE_RUN_SCHEMA);
      expect(record.stage).toBe(index + 1);
      expect(record.name).toBe(MODE2_STAGES[index]);
      expect(() => validateMode2StageRun(record)).not.toThrow();
    });
  });

  it("rejects an out-of-order stage record", () => {
    expect(() =>
      validateMode2StageRun({ schema: MODE2_STAGE_RUN_SCHEMA, stage: 2, name: "Workspace Discovery", status: "complete", method: "x", extractorVersion: "1.0.0", confidence: 1 }),
    ).toThrow(/out of canonical order/);
  });

  it("DS-03 rejects not_applicable without exclusion evidence", () => {
    expect(() =>
      validateMode2StageRun({ schema: MODE2_STAGE_RUN_SCHEMA, stage: 3, name: MODE2_STAGES[2], status: "not_applicable", exclusions: [], method: "x", extractorVersion: "1.0.0", confidence: 1 }),
    ).toThrow(/requires exclusion evidence/);
  });

  it("refuses to let the mandatory agentic stage report absence by omission", () => {
    expect(() =>
      validateMode2StageRun({ schema: MODE2_STAGE_RUN_SCHEMA, stage: 11, name: MODE2_STAGES[10], status: "not_applicable", exclusions: ["nothing here"], method: "x", extractorVersion: "1.0.0", confidence: 1 }),
    ).toThrow(/mandatory/);
  });
});

describe("Stage 1-4 extraction", () => {
  it("detects package manager, build system, and frameworks with file evidence", async () => {
    const result = await runMode2Scan({ adapter: adapterFor(), runId: "run-b" });
    expect(result.stageRuns[0].status).toBe("complete");
    const manifest = JSON.parse(
      await import("node:fs/promises").then((fs) => fs.readFile(path.join(root, ".govibe/mode2/scan/runs/run-b/artifacts/01.json"), "utf8")),
    );
    expect(manifest.package_managers).toContainEqual({ kind: "package-manager", name: "npm", evidence: "package-lock.json" });
    expect(manifest.build_systems).toContainEqual({ kind: "build-system", name: "vite", evidence: "vite.config.ts" });
    expect(manifest.frameworks.map((item) => item.name).sort()).toEqual(["express", "react", "vitest"]);
    expect(manifest.agent_instruction_files.find((source) => source.path === "CLAUDE.md").exists).toBe(true);
  });

  it("classifies artifacts deterministically before any inference", async () => {
    const result = await runMode2Scan({ adapter: adapterFor(), runId: "run-c" });
    expect(result.stageRuns[1].status).toBe("complete");
    const inventory = JSON.parse(
      await import("node:fs/promises").then((fs) => fs.readFile(path.join(root, ".govibe/mode2/scan/runs/run-c/artifacts/02.json"), "utf8")),
    );
    const byPath = new Map(inventory.files.map((file) => [file.path, file.classification]));
    expect(byPath.get("src/index.ts")).toBe("source");
    expect(byPath.get("src/index.test.ts")).toBe("test");
    expect(byPath.get("docs/ADR-001.md")).toBe("documentation");
    expect(byPath.get("CLAUDE.md")).toBe("agent-configuration");
    expect(byPath.get("package.json")).toBe("config");
  });

  it("resolves imports and classifies dependency edges", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "run-d" });
    const graph = JSON.parse(
      await import("node:fs/promises").then((fs) => fs.readFile(path.join(root, ".govibe/mode2/scan/runs/run-d/artifacts/04.json"), "utf8")),
    );
    const fileEdge = graph.edges.find((edge) => edge.from === "mode2-module:src/index.ts" && edge.to === "mode2-module:src/helper.ts");
    expect(fileEdge).toMatchObject({ rel: "IMPORTS", kind: "runtime", candidate: true });
    const testEdge = graph.edges.find((edge) => edge.from === "mode2-module:src/index.test.ts");
    expect(testEdge.kind).toBe("test");
    expect(graph.edges.find((edge) => edge.to === "mode2-package:vitest").kind).toBe("tooling");
    expect(graph.edges.find((edge) => edge.to === "mode2-package:react").kind).toBe("runtime");
  });

  it("DS-07 names unparsable languages instead of guessing at them", async () => {
    await write("service/handler.py", "def handler():\n    return 1\n");
    const result = await runMode2Scan({ adapter: adapterFor(), runId: "run-e" });
    const structural = result.stageRuns[2];
    expect(structural.status).toBe("incomplete");
    expect(structural.error).toContain(".py");
    expect(structural.unresolved.some((item) => item.kind === "unsupported-language")).toBe(true);
    expect(structural.confidence).toBeLessThan(1);
  });

  it("has no unimplemented stage left, and still reports incomplete honestly", async () => {
    const result = await runMode2Scan({ adapter: adapterFor(), runId: "run-f" });
    // T3 implemented Stage 12; all twelve now have real extractors.
    expect(result.stageRuns.filter((record) => /^stage_not_implemented_before_tranche_/.test(record.error ?? ""))).toEqual([]);
    // The run is still `incomplete` — stages 7, 8, and 10 report real coverage limits rather
    // than claiming a model they cannot derive. "All implemented" is not "all complete".
    expect(result.status).toBe("incomplete");
    const limited = result.stageRuns.filter((record) => record.status === "incomplete").map((record) => record.stage);
    expect(limited).toEqual(expect.arrayContaining([7, 8]));
  });
});

describe("DS-04/DS-05/DS-06 resume and incremental rescan", () => {
  it("DS-05 re-scans an unchanged tree with zero stage executions", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "base" });
    const second = await runMode2Scan({ adapter: adapterFor(), runId: "second", reuseFromRunId: "base" });
    expect(second.incremental.reusedStages).toBe(12);
    expect(second.incremental.executedStages).toBe(0);
    expect(second.incremental.rehashedFiles).toBe(0);
  });

  // The invariant is that a stage re-runs iff the changed file is in its declared inputs —
  // not that some fixed set re-runs. Asserting a hardcoded list would break every time a new
  // stage legitimately declares a dependency, which is exactly what happened when T2 landed.
  it("DS-06 re-runs exactly the stages whose declared inputs contain the changed file", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "base2" });
    await write("src/helper.ts", "export function helper() { return 2; }\n");
    const second = await runMode2Scan({ adapter: adapterFor(), runId: "second2", reuseFromRunId: "base2" });

    const { files } = await adapterFor().discoverProjectFiles();
    const expected = createMode2Stages()
      .filter((stage) => stage.inputs(files).includes("src/helper.ts"))
      .map((stage) => stage.stage);
    const executed = second.stageRuns.filter((record) => !record.reusedFrom).map((record) => record.stage);

    expect(expected.length).toBeGreaterThan(0);
    expect(executed).toEqual(expected);
    expect(executed.length).toBeLessThan(12);
    // Stages that read no TypeScript content must not be disturbed by a .ts edit.
    for (const stage of [1, 2, 7, 11]) expect(second.stageRuns[stage - 1].reusedFrom).toBe("base2");
  });

  // Regression. A stage that consumes an upstream artifact must invalidate when that artifact
  // changes, not only when its own declared files do. Stage 7 declares only package.json as an
  // input but reads the Stage 3 and 4 artifacts, and Stage 12 declares no files at all — so
  // before `dependsOnStages` existed, Stage 7 kept stale reachability and Stage 12's input hash
  // was constant and it was never invalidated at all.
  it("cascades invalidation to stages that consume a changed upstream artifact", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "casc-base" });

    // A body-only edit does not change what Stage 3 extracts, so the cascade must NOT fire —
    // invalidation is content-addressed on the artifact, not on the file.
    await write("src/helper.ts", "export function helper() { return 99; }\n");
    const bodyOnly = await runMode2Scan({ adapter: adapterFor(), runId: "casc-body", reuseFromRunId: "casc-base" });
    const afterBody = bodyOnly.stageRuns.filter((record) => !record.reusedFrom).map((record) => record.stage);
    expect(afterBody).not.toContain(7);
    expect(afterBody).not.toContain(12);

    // Adding an export does change the Stage 3 artifact, so every consumer of it must re-run.
    await write("src/helper.ts", "export function helper() { return 99; }\nexport function brandNew() { return 3; }\n");
    const structural = await runMode2Scan({ adapter: adapterFor(), runId: "casc-struct", reuseFromRunId: "casc-body" });
    const afterStructural = structural.stageRuns.filter((record) => !record.reusedFrom).map((record) => record.stage);
    expect(afterStructural).toContain(7);
    expect(afterStructural).toContain(12);
  });

  it("re-runs a stage when its extractor version changes", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "base3" });
    const stages = createMode2Stages().map((stage) => (stage.stage === 2 ? { ...stage, extractorVersion: "2.0.0" } : stage));
    const second = await runMode2Scan({ adapter: adapterFor(), runId: "second3", reuseFromRunId: "base3", stages });
    expect(second.stageRuns[1].reusedFrom).toBeUndefined();
    expect(second.stageRuns[0].reusedFrom).toBe("base3");
  });

  it("DS-04 resumes the same run id without re-executing completed stages", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "resumable" });
    const resumed = await runMode2Scan({ adapter: adapterFor(), runId: "resumable" });
    expect(resumed.incremental.reusedStages).toBe(12);
    expect(resumed.stageRuns.every((record) => record.reusedFrom === "resumable")).toBe(true);
  });

  // DS-10 must be proven by INDEPENDENT recomputation in a second workspace. Running twice in
  // one root reuses the first run via scan/latest.json, so it would pass even if a stage were
  // nondeterministic — the second run would simply copy the first run's records.
  it("DS-10 produces identical output hashes across two independent workspaces", async () => {
    const other = await mkdtemp(path.join(tmpdir(), "govibe-mode2-twin-"));
    try {
      for (const relative of ["package.json", "package-lock.json", "vite.config.ts", "CLAUDE.md", "docs/ADR-001.md", "src/index.ts", "src/helper.ts", "src/index.test.ts"]) {
        const target = path.join(other, relative);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, await readFile(path.join(root, relative), "utf8"), "utf8");
      }
      const first = await runMode2Scan({ adapter: adapterFor(), runId: "twin-a" });
      const second = await runMode2Scan({ adapter: createWorkspaceAdapter({ client: "claude-code", workspaceRoot: other }), runId: "twin-b" });
      expect(second.incremental.reusedStages).toBe(0);
      expect(second.stageRuns.map((record) => record.outputHash)).toEqual(first.stageRuns.map((record) => record.outputHash));
    } finally {
      await rm(other, { recursive: true, force: true });
    }
  });

  it("DS-04 resumes a genuinely interrupted run from its partial records", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "interrupted" });
    // Simulate the interruption: stages 3-12 never finished writing.
    for (let stage = 3; stage <= 12; stage += 1) {
      await rm(path.join(root, ".govibe/mode2/scan/runs/interrupted/stages", `${String(stage).padStart(2, "0")}.json`), { force: true });
      await rm(path.join(root, ".govibe/mode2/scan/runs/interrupted/artifacts", `${String(stage).padStart(2, "0")}.json`), { force: true });
    }
    const resumed = await runMode2Scan({ adapter: adapterFor(), runId: "interrupted" });
    const reused = resumed.stageRuns.filter((record) => record.reusedFrom).map((record) => record.stage);
    expect(reused).toEqual([1, 2]);
    expect(resumed.stageRuns[2].reusedFrom).toBeUndefined();
    expect(resumed.stageRuns[2].status).toBe("complete");
  });

  it("re-executes rather than reusing a record whose artifact is gone", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "artifactless" });
    await rm(path.join(root, ".govibe/mode2/scan/runs/artifactless/artifacts/02.json"), { force: true });
    const second = await runMode2Scan({ adapter: adapterFor(), runId: "recovered", reuseFromRunId: "artifactless" });
    const stage2 = second.stageRuns[1];
    expect(stage2.reusedFrom).toBeUndefined();
    expect(stage2.status).toBe("complete");
    expect(await readFile(path.join(root, ".govibe/mode2/scan/runs/recovered/artifacts/02.json"), "utf8")).toContain("artifact-inventory");
  });

  it("outputRefs dereferences to a real artifact file", async () => {
    const result = await runMode2Scan({ adapter: adapterFor(), runId: "refs" });
    for (const record of result.stageRuns.filter((item) => item.outputRefs.length)) {
      const relative = record.outputRefs[0].replace(/^mode2-artifact:/, "");
      await expect(readFile(path.join(root, ".govibe/mode2", relative), "utf8")).resolves.toBeTruthy();
    }
  });

  // The size+mtime fingerprint is a fast path, not proof. verifyContent must bypass it so a
  // same-length edit that preserves mtime is still detected.
  it("verifyContent re-hashes every file instead of trusting size and mtime", async () => {
    const first = await runMode2Scan({ adapter: adapterFor(), runId: "fp-a" });
    expect(first.incremental.rehashedFiles).toBeGreaterThan(0);
    const second = await runMode2Scan({ adapter: adapterFor(), runId: "fp-b", reuseFromRunId: "fp-a", verifyContent: true });
    expect(second.incremental.rehashedFiles).toBe(first.incremental.rehashedFiles);
    expect(second.incremental.reusedFileHashes).toBe(0);
    expect(second.incremental.verifyContent).toBe(true);
  });

  it("reports status for the latest run", async () => {
    await runMode2Scan({ adapter: adapterFor(), runId: "statused" });
    const status = await getMode2ScanStatus({ workspaceRoot: root });
    expect(status.runId).toBe("statused");
    expect(status.stageRuns).toHaveLength(12);
  });

  it("reports not_started before any scan", async () => {
    const empty = await mkdtemp(path.join(tmpdir(), "govibe-mode2-empty-"));
    try {
      expect((await getMode2ScanStatus({ workspaceRoot: empty })).status).toBe("not_started");
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  });

  it("rejects a run id that could escape the run directory", async () => {
    await expect(runMode2Scan({ adapter: adapterFor(), runId: "../escape" })).rejects.toThrow(/Invalid Mode 2 scan runId/);
  });
});

describe("AC-W3/AC-X3 external workspace ownership", () => {
  it("writes nothing outside .govibe/mode2", async () => {
    const before = (await readdir(root)).sort();
    await runMode2Scan({ adapter: adapterFor(), runId: "isolated" });
    const after = (await readdir(root)).sort();
    expect(after.filter((entry) => entry !== ".govibe")).toEqual(before.filter((entry) => entry !== ".govibe"));
    expect(await readdir(path.join(root, ".govibe"))).toEqual(["mode2"]);
  });

  it("binds an external workspace as metadata-only without materialising vaults", async () => {
    const { binding } = await bindExternalWorkspace({ workspacePath: root, client: "claude-code" });
    expect(binding.workspace.ownership).toBe("external");
    expect(binding.workspace.write_policy).toBe("metadata-only");
    expect(binding.workspace_id).toMatch(/^workspace_/);
    expect(binding.project_id).toMatch(/^project_/);
    const entries = await readdir(root);
    expect(entries).not.toContain(".brain");
    expect(entries).not.toContain(".govibe-knowledge-block");
    expect(entries).not.toContain("local_model");
  });

  it("derives the same identity regardless of which client bound it", async () => {
    const claude = await bindExternalWorkspace({ workspacePath: root, client: "claude-code", persist: false });
    const gemini = await bindExternalWorkspace({ workspacePath: root, client: "gemini-cli", persist: false });
    expect(gemini.binding.workspace_id).toBe(claude.binding.workspace_id);
    expect(gemini.binding.project_id).toBe(claude.binding.project_id);
  });

  it("inspects a workspace it does not own", async () => {
    const inspection = await inspectExternalWorkspace({ workspacePath: root, client: "claude-code" });
    expect(inspection.identity.workspace_mode).toBe("external");
    expect(inspection.capabilities.capabilities.instruction_files).toContain("CLAUDE.md");
    expect(inspection.counts.files).toBeGreaterThan(0);
    expect(inspection.existing_artifacts.some((artifact) => artifact.path === "docs/ADR-001.md")).toBe(true);
  });
});
