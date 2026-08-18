// TASK-PRD-024 (MASTERPLAN-govibe-production-readiness §3.3 AUD-02):
// live-tool-surface proof that govibe.workflow.continue forwards
// contextAuthority through the hardened wrapper into MSP context resolution.
//
// This test boots the REAL in-repo msp-runtime (same launch contract as
// TASK-PRD-023 / RUNBOOK-Persistent-Memory-Runtime §3-§5) and drives the same
// composition the MCP server runs — runtime singleton + WP-05 argument
// hardening + handlers dispatch — minus the stdio transport. Before the fix,
// the context branch below terminated in status "blocked" /
// missing_runtime_authority regardless of the caller's authority.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const workRoot = path.join(os.tmpdir(), `govibe-continue-live-${randomBytes(6).toString("hex")}`);
const fixtureRoot = path.join(workRoot, "workspace");

let handleToolCall;
let runtimeSingleton;
let authority;
let identity;

beforeAll(async () => {
  await mkdir(path.join(fixtureRoot, "src"), { recursive: true });
  await writeFile(path.join(fixtureRoot, "README.md"), "# Continue Live Fixture\n");
  await writeFile(path.join(fixtureRoot, "package.json"), "{}\n");
  await writeFile(path.join(fixtureRoot, "src", "index.ts"), "export function live(): string { return \"ok\"; }\n");

  // The runtime singleton reads its environment at import time, so the MSP
  // launch contract and the allowed-roots grant must land first.
  process.env.GOVIBE_MSP_COMMAND = process.execPath;
  process.env.GOVIBE_MSP_ARGS = JSON.stringify([path.join(repoRoot, "packages", "msp-runtime", "bin", "msp-runtime.mjs")]);
  process.env.GOVIBE_MSP_CWD = repoRoot;
  process.env.MSP_DB_PATH = path.join(workRoot, "msp.sqlite3");
  process.env.MSP_GKS_PROVIDER = "sqlite";
  process.env.GOVIBE_ALLOWED_WORKSPACE_ROOTS = JSON.stringify([repoRoot, workRoot]);

  const core = await import("../../packages/govibe-core/src/index.mjs");
  const runtimeCore = await import("./runtime-core.mjs");
  await import("./runtime-argument-hardening.mjs");
  const handlers = await import("./handlers.mjs");
  handleToolCall = handlers.handleToolCall;
  runtimeSingleton = runtimeCore.govibeRuntime;

  const builtInSkill = await core.readSkillDefinition(path.join(repoRoot, ".govibe", "skills", "block-decomposition", "1.0.0", "SKILL.md"));
  const initialization = await core.initializeWorkspace({ workspacePath: fixtureRoot, builtInSkill, mspClient: runtimeSingleton.mspClient, actor: "continue-live-test" });
  const state = JSON.parse(await readFile(initialization.statePath, "utf8"));

  identity = { taskId: "TASK-PRD-024-live", agentId: "continue-live-agent", workspaceId: state.workspaceId, runId: "run-continue-live", sessionId: "session-continue-live", turnId: "turn-continue-live" };
  authority = {
    schemaVersion: "govibe-context-authority/v1",
    identity,
    sources: [{ id: "API-005", version: "3.1.0", hash: "a".repeat(64) }],
    requiredReasonRefs: ["task:TASK-PRD-024"],
    traversal: { relationAllowlist: ["implements"], retrievalRadius: 1, inclusions: [], exclusions: [] },
    knowledgeRefs: state.knowledgeRefs,
    budget: { maxTokens: 1024, compaction: "bounded" },
    lineage: { contextId: "ctx-continue-live", cacheId: "cache-continue-live", parentContextId: null },
    unresolvedAssumptions: [],
  };
}, 120000);

afterAll(async () => {
  runtimeSingleton?.mspClient?.callTool?.close?.();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(workRoot, { recursive: true, force: true });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
});

function continueArgs(overrides = {}) {
  return {
    actor: "continue-live-test",
    workspacePath: fixtureRoot,
    executor: "codex",
    agentId: identity.agentId,
    runId: identity.runId,
    sessionId: identity.sessionId,
    turnId: identity.turnId,
    contextAuthority: authority,
    ...overrides,
  };
}

describe("govibe.workflow.continue live surface (TASK-PRD-024)", () => {
  it("forwards contextAuthority through the hardened surface into a ready packet with persisted lineage", async () => {
    const reply = await handleToolCall("govibe.workflow.continue", continueArgs());
    const result = reply.structuredContent ?? reply;
    expect(result.status).toBe("ready");
    expect(result.reason).toBeUndefined();
    expect(result.injectionRef).toMatch(/^msp:context-injection\//);
    expect(result.packet?.lineage?.contextId ?? result.packet?.contextId).toBeTruthy();
    expect(typeof result.cachePath).toBe("string");
    expect(existsSync(result.cachePath)).toBe(true);
  }, 60000);

  it("still fails closed with missing_runtime_authority when the authority is absent", async () => {
    const reply = await handleToolCall("govibe.workflow.continue", continueArgs({ contextAuthority: undefined }));
    const result = reply.structuredContent ?? reply;
    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("missing_runtime_authority");
  }, 60000);
});
