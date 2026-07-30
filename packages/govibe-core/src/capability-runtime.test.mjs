import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  CANONICAL_STAGES,
  continueWorkflow,
  createDefaultStageAdapters,
  GksClient,
  createUnavailableMspClient,
  definitionHash,
  initializeWorkspace,
  MspClient,
  scanWorkspace,
  validateDeepScan,
} from "./index.mjs";

const roots = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "govibe-runtime-"));
  roots.push(root);
  await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "README.md"), "# Test\n");
  await writeFile(path.join(root, "package.json"), "{}\n");
  await writeFile(path.join(root, "src", "route-tool.ts"), "export function route() {}\n");
  return root;
}

function builtIn() {
  const value = { schema: "govibe-skill-definition/v1", id: "block-decomposition", version: "1.0.0", aliases: ["scan"], inputSchema: {}, outputSchema: {}, permissions: [], stageHooks: [], verificationRequirements: [] };
  return { ...value, contentHash: definitionHash(value) };
}

function mockMsp(options = {}) {
  const calls = [];
  const client = new MspClient(async (name, input) => {
    calls.push({ name, input });
    if (options.fail === name) throw new Error(options.message ?? `${name} unavailable`);
    if (name === "msp_context_resolve") return { global_state_refs: [{ ref: "global:state/policy.json", source_hash: "a".repeat(64) }], workspace_state_refs: [{ ref: "workspace:state/project.json", source_hash: "b".repeat(64) }], knowledge_refs: [], policy_decisions: [{ decision: "allow", ref: "workspace:state/project.json", reason: "project_scope" }] };
    if (name === "msp_evidence_record") return { proof_ref: `msp:proof/${input.idempotency_key}` };
    throw new Error(`Unexpected tool ${name}`);
  });
  return { client, calls };
}

function mockGks() {
  const calls = [];
  const client = new GksClient(async (name, input) => {
    calls.push({ name, input });
    if (name === "gks_code_upsert") return { knowledge_ref: `gks:${input.idempotency_key}`, source_hash: "c".repeat(64) };
    throw new Error(`Unexpected tool ${name}`);
  });
  return { client, calls };
}

describe("GoVibe init and continue", () => {
  it("prepares config and lock without running a scan", async () => {
    const root = await fixture();
    const { client, calls } = mockMsp();
    const result = await initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), mspClient: client, actor: "test" });
    expect(result.status).toBe("prepared");
    expect(result.deepScanRun).toBe(false);
    expect(result.registration.proofRef).toMatch(/^msp:proof\//);
    await expect(access(path.join(root, ".govibe", "runs"))).rejects.toThrow();
  });

  it("rejects semantically incompatible existing workspace state", async () => {
    const root = await fixture();
    const { client } = mockMsp();
    await mkdir(path.join(root, ".govibe"), { recursive: true });
    await writeFile(path.join(root, ".govibe", "config.json"), JSON.stringify({ schema: "govibe-workspace-config/v1", workspaceId: "other", createdAt: new Date().toISOString() }));
    await expect(initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), mspClient: client })).rejects.toThrow(/Incompatible existing state/);
  });

  it("rejects a .govibe junction that escapes the workspace", async () => {
    const root = await fixture();
    const outside = await fixture();
    try {
      await symlink(outside, path.join(root, ".govibe"), "junction");
    } catch (error) {
      if (error?.code === "EPERM") return;
      throw error;
    }
    const { client } = mockMsp();
    await expect(initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), mspClient: client })).rejects.toThrow(/Symbolic link or junction/);
  });

  it("assembles a reference-only packet for non-Claude executors", async () => {
    const root = await fixture();
    const { client } = mockMsp();
    await initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), mspClient: client, actor: "test" });
    const result = await continueWorkflow({ workspacePath: root, mspClient: client, actor: "test", executor: "crewai", globalSkillRoot: path.join(root, "global-skills"), trustedWorkspaceHashes: [builtIn().contentHash] });
    expect(result.status).toBe("ready");
    expect(result.packet.schema).toBe("govibe-context-packet/v2");
    expect(result.packet.globalStateRefs[0].ref).toBe("global:state/policy.json");
    expect(JSON.stringify(result.packet)).not.toContain("private");
  });

  it("blocks on missing state, MSP unavailability, and GKS resolution failure", async () => {
    const root = await fixture();
    expect((await continueWorkflow({ workspacePath: root, mspClient: createUnavailableMspClient() })).reason).toBe("missing_project_state");
    await initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), mspClient: createUnavailableMspClient() });
    expect((await continueWorkflow({ workspacePath: root, mspClient: createUnavailableMspClient(), globalSkillRoot: path.join(root, "none"), trustedWorkspaceHashes: [builtIn().contentHash] })).reason).toBe("msp_unavailable");
    const { client } = mockMsp({ fail: "msp_context_resolve", message: "GKS unavailable" });
    expect((await continueWorkflow({ workspacePath: root, mspClient: client, globalSkillRoot: path.join(root, "none"), trustedWorkspaceHashes: [builtIn().contentHash] })).reason).toBe("gks_unavailable");
  });

  it("blocks when required repository source truth disappears", async () => {
    const root = await fixture();
    const { client } = mockMsp();
    await initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), mspClient: client });
    await rm(path.join(root, "README.md"));
    const result = await continueWorkflow({ workspacePath: root, mspClient: client, globalSkillRoot: path.join(root, "none"), trustedWorkspaceHashes: [builtIn().contentHash] });
    expect(result).toMatchObject({ status: "blocked", reason: "context_resolution_failed" });
  });

  it("whitelists MSP references instead of leaking inline payload", async () => {
    const root = await fixture();
    const base = mockMsp();
    const client = new MspClient(async (name, input) => {
      const result = await base.client.call(name, input);
      if (name === "msp_context_resolve") result.global_state_refs[0].payload = "SECRET";
      return result;
    });
    await initializeWorkspace({ workspacePath: root, builtInSkill: builtIn(), mspClient: client });
    const result = await continueWorkflow({ workspacePath: root, mspClient: client, globalSkillRoot: path.join(root, "none"), trustedWorkspaceHashes: [builtIn().contentHash] });
    expect(JSON.stringify(result)).not.toContain("SECRET");
  });

  it("rejects MSP references from the wrong ownership namespace", async () => {
    const client = new MspClient(async () => ({ global_state_refs: [{ ref: "file:secret", source_hash: "a".repeat(64) }] }));
    await expect(client.resolveContext({ workspacePath: process.cwd() })).rejects.toThrow(/out-of-namespace Global state/);
  });
});

describe("GoVibe scan", () => {
  it("defaults to L1 and runs no writers", async () => {
    const root = await fixture();
    const { client, calls } = mockMsp();
    const result = await scanWorkspace({ workspacePath: root, mspClient: client });
    expect(result).toMatchObject({ level: "L1", status: "complete", deepScanRun: false });
    expect(result.inventory.languages[".ts"]).toBe(1);
    expect(result.inventory.sourceOfTruth).toContain("README.md");
    expect(calls).toEqual([]);
  });

  it("runs all twelve stages, records COBOL N/A, and uses ownership-safe writers", async () => {
    const root = await fixture();
    const { client, calls } = mockMsp();
    const gks = mockGks();
    const result = await scanWorkspace({ workspacePath: root, deep: true, mspClient: client, gksClient: gks.client, actor: "test", runId: "deep-1" });
    expect(result.status).toBe("complete");
    expect(result.stageRuns.map((stage) => stage.name)).toEqual(CANONICAL_STAGES);
    expect(result.stageRuns[3]).toMatchObject({ status: "not_applicable", exclusions: ["inventory_contains_no_cobol"] });
    expect(result.stageRuns[3].outputRefs.some((ref) => ref.startsWith("msp:proof/"))).toBe(true);
    expect(gks.calls.filter((call) => call.name === "gks_code_upsert").every((call) => !("evidence" in call.input))).toBe(true);
    expect(calls.filter((call) => call.name === "msp_evidence_record").every((call) => !("symbols" in call.input))).toBe(true);
    expect(gks.calls.filter((call) => call.name === "gks_code_upsert").every((call) => call.input.provenance_ref.startsWith("msp:proof/"))).toBe(true);
    expect(calls.filter((call) => call.name === "msp_evidence_record" && call.input.knowledge_ref).every((call) => call.input.stage_evidence[0].ref.startsWith("gks:") && call.input.stage_evidence[0].source_hash === "c".repeat(64))).toBe(true);
  });

  it("rejects false completion after parser failure and resumes persisted stages", async () => {
    const root = await fixture();
    const { client, calls } = mockMsp();
    const gks = mockGks();
    const adapters = createDefaultStageAdapters();
    adapters[2] = async () => { throw new Error("parser failed"); };
    const failed = await scanWorkspace({ workspacePath: root, deep: true, mspClient: client, gksClient: gks.client, actor: "test", adapters, runId: "resume-1" });
    expect(failed.status).toBe("incomplete");
    expect(failed.stageRuns).toHaveLength(12);
    expect(failed.stageRuns[2].status).toBe("failed");

    const resumed = await scanWorkspace({ workspacePath: root, deep: true, mspClient: client, gksClient: gks.client, actor: "test", runId: "resume-1", resume: true });
    expect(resumed.status).toBe("complete");
    expect(resumed.stageRuns).toHaveLength(12);
    expect(new Set(calls.filter((call) => call.name === "msp_evidence_record").map((call) => call.input.recorded_at)).size).toBe(1);
    expect(gks.calls.filter((call) => call.name === "gks_code_upsert").length).toBeGreaterThan(0);
  });

  it("builds deterministic communities and fails graph validation for missing stages", async () => {
    const root = await fixture();
    const first = mockMsp();
    const second = mockMsp();
    const firstGks = mockGks();
    const secondGks = mockGks();
    await scanWorkspace({ workspacePath: root, deep: true, mspClient: first.client, gksClient: firstGks.client, actor: "test", runId: "community-1" });
    await scanWorkspace({ workspacePath: root, deep: true, mspClient: second.client, gksClient: secondGks.client, actor: "test", runId: "community-2" });
    const communities = (calls) => calls.find((call) => call.name === "gks_code_upsert" && call.input.context_snapshots?.length)?.input.context_snapshots;
    expect(communities(firstGks.calls)).toEqual(communities(secondGks.calls));
    expect(validateDeepScan([]).passed).toBe(false);
    const forged = CANONICAL_STAGES.map((name, index) => ({ schema: "govibe-stage-run/v1", runId: "forged", stage: index + 1, name, status: "not_applicable", inputRefs: [], outputRefs: ["exclusion:forged"], method: "forged", confidence: 1, exclusions: ["forged"] }));
    expect(validateDeepScan(forged).passed).toBe(false);
  });

  it("rejects runId path traversal before creating evidence", async () => {
    const root = await fixture();
    const { client } = mockMsp();
    await expect(scanWorkspace({ workspacePath: root, deep: true, mspClient: client, runId: "../../../escape" })).rejects.toThrow(/Invalid scan runId/);
  });
});
