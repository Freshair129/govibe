// TASK-PRD-035 (CR-2026-08-19 D-01, phase 1): proves the local-agent dispatch gate actually
// gates — a valid dispatch reaches the (mockable) run function, and a dispatch whose bound
// identity does not match the request's context authority is refused by the executor-adapter
// scope-match gate *before* run is ever called. `run` is injected throughout, so this suite
// never launches PowerShell.
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { createLocalAgentDispatchGate, LOCAL_AGENT_PROVIDER_ID } from "./local-agent-dispatch-gate.mjs";

async function fixtureLauncherPath() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "govibe-dispatch-gate-"));
  const launcherScriptPath = path.join(dir, "invoke-agent.ps1");
  await writeFile(launcherScriptPath, "# fixture launcher\n");
  return launcherScriptPath;
}

function identityFor(overrides = {}) {
  return {
    taskId: "task-1",
    agentId: "agent-1",
    workspaceId: "ws-1",
    runId: "run-1",
    sessionId: "session-1",
    turnId: "turn-1",
    requestArgs: { task: "demo task" },
    ...overrides,
  };
}

describe("local agent dispatch gate", () => {
  it("routes a valid dispatch through the full gate and reaches the run function", async () => {
    const launcherScriptPath = await fixtureLauncherPath();
    const run = vi.fn(async (request) => {
      expect(request.task).toBe("demo task");
      // safeRequest() (executor-adapter.mjs) replaces the raw binding with a reduced,
      // credential-free projection before the adapter ever sees it.
      expect(request.executionBinding).not.toHaveProperty("context_hash");
      expect(request.executionBinding.binding_id).toBeTruthy();
      return { artifacts: [{ stdout: "ok", stderr: "", exitCode: 0, ok: true }] };
    });
    const gate = createLocalAgentDispatchGate({ launcherScriptPath, run });

    const result = await gate.dispatch(identityFor());

    expect(run).toHaveBeenCalledOnce();
    expect(result.status).toBe("completed");
    expect(result.candidate.artifacts[0]).toMatchObject({ stdout: "ok", exitCode: 0, ok: true });
  });

  it("issues a fresh, scope-matched binding per dispatch (8-field identity match)", async () => {
    const launcherScriptPath = await fixtureLauncherPath();
    const run = vi.fn(async () => ({ artifacts: [{ stdout: "", stderr: "", exitCode: 0, ok: true }] }));
    const gate = createLocalAgentDispatchGate({ launcherScriptPath, run });

    await gate.dispatch(identityFor({ runId: "run-a", turnId: "turn-a" }));
    await gate.dispatch(identityFor({ runId: "run-b", turnId: "turn-b" }));

    const bindings = gate.bindingService.inspect();
    expect(bindings).toHaveLength(2);
    expect(new Set(bindings.map((binding) => binding.binding_id)).size).toBe(2);
    expect(bindings.map((binding) => binding.run_id).sort()).toEqual(["run-a", "run-b"]);
  });

  it("refuses a scope-mismatched dispatch before it ever reaches run", async () => {
    const launcherScriptPath = await fixtureLauncherPath();
    const run = vi.fn(async () => ({ artifacts: [{ stdout: "should-not-run", stderr: "", exitCode: 0, ok: true }] }));
    const gate = createLocalAgentDispatchGate({ launcherScriptPath, run });

    // Issue a real binding for run-real via the router, exactly as dispatch() would.
    const planningRequest = {
      request_id: "req-mismatch",
      actor_id: "govibe-runtime-service",
      organization_id: "govibe-local",
      workspace_id: "ws-1",
      project_id: null,
      task_id: "task-1",
      agent_id: "agent-1",
      role: "agent",
      executor_class: "agent-cli-launcher",
      required_capabilities: [],
      required_tools: [],
      data_classification: "internal",
      residency_requirements: [],
      tool_contract_hash: "govibe-agent-run-launcher/v1",
      allowed_tool_contract_hashes: ["govibe-agent-run-launcher/v1"],
      context_integrity_valid: true,
      automation_requested: true,
    };
    const bindingRequest = {
      binding_request_id: "br-mismatch",
      actor_id: "govibe-runtime-service",
      organization_id: "govibe-local",
      workspace_id: "ws-1",
      project_id: null,
      task_id: "task-1",
      agent_id: "agent-1",
      run_id: "run-real",
      session_id: "session-1",
      turn_id: "turn-1",
      context: {
        context_id: "ctx-real",
        cache_id: "cache-real",
        context_hash: `sha256:${gate.launcherHash}`,
        source_manifest_hash: `sha256:${gate.launcherHash}`,
        context_profile: "T-ctx",
        tool_contract_hash: "govibe-agent-run-launcher/v1",
        persisted: true,
      },
    };
    const { binding } = gate.router.route({ planning_request: planningRequest, binding_request: bindingRequest });

    // Build a request whose contextAuthority claims a DIFFERENT task than the one the binding
    // was actually issued for (run/session/turn all still agree with the binding) — the
    // caller-controlled scope substitution the 8-field match in executor-adapter.mjs exists to
    // catch. This is the "binding scope does not match the task's context authority" case named
    // by the task container's success criterion.
    const mismatchedRequest = {
      task: "should not run",
      actor_id: "govibe-runtime-service",
      run_id: "run-real",
      policyDecision: "allow",
      contextLineage: { runId: "run-real", sessionId: "session-1", turnId: "turn-1" },
      contextAuthority: {
        schemaVersion: "govibe-context-authority/v1",
        identity: { taskId: "task-SPOOFED", agentId: "agent-1", workspaceId: "ws-1", runId: "run-real", sessionId: "session-1", turnId: "turn-1" },
        lineage: { contextId: "ctx-real", cacheId: "cache-real", parentContextId: null },
        unresolvedAssumptions: [],
        traversal: { relationAllowlist: ["dispatches"], retrievalRadius: 0, inclusions: [], exclusions: [] },
        sources: [{ id: "scripts/agents/invoke-agent.ps1", version: "1", hash: gate.launcherHash }],
        budget: { maxTokens: 1 },
        knowledgeRefs: [],
        requiredReasonRefs: ["change-request:CR-2026-08-19:D-01"],
      },
      executionBinding: binding,
    };

    await expect(gate.executorRegistry.execute(LOCAL_AGENT_PROVIDER_ID, mismatchedRequest)).rejects.toMatchObject({
      code: "EXECUTION_BINDING_SCOPE_MISMATCH",
      details: { field: "task_id" },
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("advertises the local provider as available once wired", async () => {
    const launcherScriptPath = await fixtureLauncherPath();
    const gate = createLocalAgentDispatchGate({ launcherScriptPath, run: vi.fn() });
    const inspected = gate.executorRegistry.inspect();
    const local = inspected.find((entry) => entry.id === LOCAL_AGENT_PROVIDER_ID);
    expect(local).toMatchObject({ available: true });
  });
});
