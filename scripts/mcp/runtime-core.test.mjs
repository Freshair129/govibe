import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { GksClient, MspClient } from "../../packages/govibe-core/src/index.mjs";
import { GovibeRuntime } from "./runtime-core.mjs";

const previousEnvSource = process.env.GOVIBE_ROADMAP_SOURCE;
const roots = [];
afterEach(async () => {
  if (previousEnvSource === undefined) {
    delete process.env.GOVIBE_ROADMAP_SOURCE;
  } else {
    process.env.GOVIBE_ROADMAP_SOURCE = previousEnvSource;
  }
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function workspaceFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "govibe-mission-scan-"));
  roots.push(root);
  await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "README.md"), "# Scan fixture\n");
  await writeFile(path.join(root, "package.json"), JSON.stringify({ scripts: { test: "vitest" } }));
  await writeFile(path.join(root, "src", "entry.ts"), "export function scanFixture() { return 'ok'; }\n");
  return root;
}

function mspClient() {
  return new MspClient(async (name, input) => {
    if (name === "msp_evidence_record") return { proof_ref: `msp:proof/${input.idempotency_key}` };
    throw new Error(`Unexpected MCP tool: ${name}`);
  });
}

function gksClient() {
  return new GksClient(async (name, input) => {
    if (name === "gks_code_upsert") return { knowledge_ref: `gks:knowledge/${input.idempotency_key}`, source_hash: "a".repeat(64) };
    throw new Error(`Unexpected MCP tool: ${name}`);
  });
}

describe("GovibeRuntime roadmap source scoring", () => {
  it("rejects ambiguous relative roots for workspace capabilities", async () => {
    const runtime = new GovibeRuntime();
    await expect(runtime.initializeWorkspace({ actor: "test", workspacePath: "../other" })).rejects.toThrow(/absolute caller-declared root/);
  });

  it("rejects an absolute workspace outside configured server roots", async () => {
    const runtime = new GovibeRuntime({ allowedWorkspaceRoots: [process.cwd()] });
    await expect(runtime.initializeWorkspace({ actor: "test", workspacePath: path.parse(process.cwd()).root })).rejects.toThrow(/outside configured GoVibe roots/);
  });

  it("discovers and activates an approved Master Plan through the roadmap source gate", async () => {
    delete process.env.GOVIBE_ROADMAP_SOURCE;

    const runtime = new GovibeRuntime();
    await runtime.initialize();
    const sources = await runtime.listRoadmapSources();

    expect(sources.some((source) => source.path === "docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md")).toBe(true);
    expect(sources.some((source) => source.path === "docs/roadmap/ROADMAP-task-scoped-context-injection.md")).toBe(true);
    const response = await runtime.handleMissionCommand({ type: "roadmap.select", sourcePath: "docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md" });

    expect(response).toMatchObject({ ok: true, action: "roadmap.select" });
    expect(runtime.getSnapshot().roadmap).toMatchObject({
      sourcePath: "docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md",
      planningType: "masterplan",
      approvalStatus: "approved",
    });
    expect(runtime.getSnapshot().roadmap?.nodes.filter((node) => node.type === "phase")).toHaveLength(5);
  });

  it("honors GOVIBE_ROADMAP_SOURCE when the selected source is approved", async () => {
    process.env.GOVIBE_ROADMAP_SOURCE = "docs/roadmap/ROADMAP-task-scoped-context-injection.md";

    const runtime = new GovibeRuntime();
    const snapshot = await runtime.initialize();

    expect(snapshot.roadmap?.sourcePath).toBe("docs/roadmap/ROADMAP-task-scoped-context-injection.md");
    expect(snapshot.roadmap?.scoreBreakdown).toContain("env override");
  });

  it("rejects roadmap traversal, absolute escapes, and missing files with distinct bounded errors", async () => {
    const runtime = new GovibeRuntime();
    await expect(runtime.reloadRoadmap("../package.json")).rejects.toMatchObject({
      code: "PATH_OUTSIDE_ALLOWED_ROOT",
      message: "Requested path is outside configured allowed roots.",
    });
    await expect(runtime.reloadRoadmap(path.join(process.cwd(), "package.json"))).rejects.toMatchObject({ code: "PATH_OUTSIDE_ALLOWED_ROOT" });
    await expect(runtime.reloadRoadmap("docs/roadmap/ROADMAP-does-not-exist.md")).rejects.toMatchObject({
      code: "PATH_NOT_FOUND",
      message: "Requested path does not exist within an allowed root.",
    });
  });

  it("applies the same containment to Master Plan preview and export", async () => {
    const exportRoot = await mkdtemp(path.join(os.tmpdir(), "govibe-roadmap-export-"));
    roots.push(exportRoot);
    const runtime = new GovibeRuntime({ allowedRoadmapWriteRoots: [exportRoot] });
    await expect(runtime.previewMasterPlan(path.join(process.cwd(), "package.json"))).rejects.toMatchObject({ code: "PATH_OUTSIDE_ALLOWED_ROOT" });
    await runtime.initialize();
    await expect(runtime.exportRoadmapMarkdown({ outputPath: path.join(process.cwd(), "escape.md") })).rejects.toMatchObject({ code: "PATH_OUTSIDE_ALLOWED_ROOT" });
    const outputPath = path.join(exportRoot, "approved-export.md");
    await expect(runtime.exportRoadmapMarkdown({ outputPath })).resolves.toMatchObject({ outputPath: expect.stringContaining("approved-export.md") });
  });
});

describe("Mission Control workspace scan command", () => {
  it("publishes the canonical twelve-stage result into the mission snapshot", async () => {
    const workspacePath = await workspaceFixture();
    const runtime = new GovibeRuntime({ allowedWorkspaceRoots: [workspacePath], mspClient: mspClient(), gksClient: gksClient() });
    const events = [];
    runtime.subscribe((event) => events.push(event));

    const response = await runtime.handleMissionCommand({ type: "workspace.scan", workspacePath, deep: true, runId: "mission-scan-1" });
    const run = runtime.getSnapshot().workflowRuns.find((item) => item.runId === "mission-scan-1");

    expect(response).toMatchObject({ ok: true, action: "workspace.scan" });
    expect(run).toMatchObject({ kind: "scan", level: "L2" });
    expect(run.stageRuns).toHaveLength(12);
    expect(run.stageRuns.map((stage) => stage.stage)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(events.some((event) => event.type === "workflow.run" && event.run.runId === "mission-scan-1")).toBe(true);
  });

  it("loads an approved Master Plan as review-only state without changing the active source", async () => {
    const runtime = new GovibeRuntime({ mspClient: mspClient(), gksClient: gksClient() });
    const response = await runtime.handleMissionCommand({ type: "masterplan.preview", sourcePath: "docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md" });

    expect(response).toMatchObject({ ok: true, action: "masterplan.preview" });
    expect(runtime.getSnapshot().masterPlanPreview).toMatchObject({
      sourcePath: "docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md",
      approvalStatus: "approved",
      planningType: "masterplan",
    });
    expect(runtime.getSnapshot().masterPlanPreview.nodes.filter((node) => node.type === "phase")).toHaveLength(5);
    expect(runtime.getSnapshot().roadmap).toBeUndefined();
  });
});

// TASK-PRD-031 (AUD-11): runtime roadmap mutations used to live only in an in-memory overlay
// and evaporate on MCP server restart. This is the restart regression guard — it recreates a
// second runtime from the same durable journal and asserts the mutation survives.
describe("GovibeRuntime — roadmap overlay durability across restart (TASK-PRD-031)", () => {
  it("does not persist mutations when no temporalOverlayJournalPath is configured (pre-existing bare-constructor behavior)", async () => {
    const runtime = new GovibeRuntime();
    await runtime.initialize();
    await runtime.applyRoadmapMutation({
      actor: "test",
      nodeId: "NO-JOURNAL-NODE",
      mutationType: "assignment",
      payload: { subjectId: "agent-x", assignedBy: "test" },
    });
    const second = new GovibeRuntime();
    await second.initialize();
    expect(second.snapshot.roadmap?.assignments?.find((item) => item.taskId === "NO-JOURNAL-NODE")).toBeUndefined();
  });

  it("restores a roadmap mutation from the same durable journal after simulating a restart", async () => {
    const journalDir = await mkdtemp(path.join(os.tmpdir(), "govibe-overlay-restart-"));
    roots.push(journalDir);
    const journalPath = path.join(journalDir, "roadmap-overlay.jsonl");

    const first = new GovibeRuntime({ temporalOverlayJournalPath: journalPath });
    await first.initialize();
    await first.applyRoadmapMutation({
      actor: "test",
      nodeId: "RESTART-TEST-NODE",
      mutationType: "assignment",
      payload: { subjectId: "agent-restart-test", assignedBy: "test" },
    });
    const beforeRestart = first.snapshot.roadmap?.assignments?.find((item) => item.taskId === "RESTART-TEST-NODE");
    expect(beforeRestart?.subjectId).toBe("agent-restart-test");

    // Simulate a process restart: a brand-new runtime instance pointed at the same journal.
    const second = new GovibeRuntime({ temporalOverlayJournalPath: journalPath });
    await second.initialize();
    const afterRestart = second.snapshot.roadmap?.assignments?.find((item) => item.taskId === "RESTART-TEST-NODE");
    expect(afterRestart?.subjectId).toBe("agent-restart-test");
  });

  it("boots cleanly and reports a bounded skip count when the journal's trailing line is corrupt/truncated", async () => {
    const journalDir = await mkdtemp(path.join(os.tmpdir(), "govibe-overlay-corrupt-"));
    roots.push(journalDir);
    const journalPath = path.join(journalDir, "roadmap-overlay.jsonl");

    const first = new GovibeRuntime({ temporalOverlayJournalPath: journalPath });
    await first.initialize();
    await first.applyRoadmapMutation({
      actor: "test",
      nodeId: "CORRUPT-JOURNAL-NODE",
      mutationType: "assignment",
      payload: { subjectId: "agent-y", assignedBy: "test" },
    });
    // Simulate a crash mid-append: a truncated JSON line with no trailing newline.
    await writeFile(journalPath, `${await readFile(journalPath, "utf8")}{"kind":"nodes","key":"trun`, "utf8");

    const second = new GovibeRuntime({ temporalOverlayJournalPath: journalPath });
    await expect(second.initialize()).resolves.toBeDefined();
    expect(second.snapshot.roadmap?.assignments?.find((item) => item.taskId === "CORRUPT-JOURNAL-NODE")?.subjectId).toBe("agent-y");
    expect(second.snapshot.terminal.some((line) => line.type === "warn" && /skipped 1 corrupt/i.test(line.text))).toBe(true);
  });
});
