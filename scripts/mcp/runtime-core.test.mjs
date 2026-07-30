import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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

  it("discovers masterplan sources while keeping approved sources rankable", async () => {
    delete process.env.GOVIBE_ROADMAP_SOURCE;

    const runtime = new GovibeRuntime();
    await runtime.initialize();
    const sources = await runtime.listRoadmapSources();

    expect(sources.some((source) => source.path === "docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md")).toBe(true);
    expect(sources.some((source) => source.path === "docs/roadmap/ROADMAP-task-scoped-context-injection.md")).toBe(true);
    expect(sources.find((source) => source.active)?.approvalStatus).toBe("approved");
  });

  it("honors GOVIBE_ROADMAP_SOURCE when the selected source is approved", async () => {
    process.env.GOVIBE_ROADMAP_SOURCE = "docs/roadmap/ROADMAP-task-scoped-context-injection.md";

    const runtime = new GovibeRuntime();
    const snapshot = await runtime.initialize();

    expect(snapshot.roadmap?.sourcePath).toBe("docs/roadmap/ROADMAP-task-scoped-context-injection.md");
    expect(snapshot.roadmap?.scoreBreakdown).toContain("env override");
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

  it("loads an unapproved Master Plan as review-only state", async () => {
    const runtime = new GovibeRuntime({ mspClient: mspClient(), gksClient: gksClient() });
    const response = await runtime.handleMissionCommand({ type: "masterplan.preview", sourcePath: "docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md" });

    expect(response).toMatchObject({ ok: true, action: "masterplan.preview" });
    expect(runtime.getSnapshot().masterPlanPreview).toMatchObject({
      sourcePath: "docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md",
      approvalStatus: "draft",
      planningType: "masterplan",
    });
    expect(runtime.getSnapshot().masterPlanPreview.nodes.filter((node) => node.type === "phase")).toHaveLength(5);
    expect(runtime.getSnapshot().roadmap).toBeUndefined();
  });
});
