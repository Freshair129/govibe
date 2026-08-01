import path from "node:path";
import { realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  continueWorkflow as continueCore,
  readSkillDefinition,
  workspaceImpact as workspaceImpactCore,
} from "../../packages/govibe-core/src/index.mjs";
import { govibeRuntime } from "./runtime-core.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const skillPath = path.join(repoRoot, ".govibe", "skills", "block-decomposition", "1.0.0", "SKILL.md");

async function resolveBoundedWorkspace(requestedPath, allowedRoots = []) {
  if (typeof requestedPath !== "string" || !requestedPath.trim()) throw new TypeError("workspacePath is required.");
  const target = await realpath(path.resolve(requestedPath));
  const roots = await Promise.all((allowedRoots.length ? allowedRoots : [repoRoot]).map((root) => realpath(path.resolve(root))));
  const allowed = roots.some((root) => {
    const relative = path.relative(root, target);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  });
  if (!allowed) throw new Error("Workspace path is outside configured allowed roots.");
  return target;
}

export function buildContinueForwardingArgs(args, workspacePath, mspClient, trustedWorkspaceHashes = []) {
  return {
    workspacePath,
    mspClient,
    actor: args.actor ?? "unknown",
    executor: args.executor ?? "codex",
    agentId: args.agentId ?? "default-agent",
    contextProfile: args.contextProfile ?? "V-ctx",
    workflowRef: args.workflowRef ?? args.workflowId ?? null,
    parentContextId: args.parentContextId ?? null,
    sessionId: args.sessionId ?? null,
    runId: args.runId,
    turnId: args.turnId,
    trustedWorkspaceHashes,
  };
}

export function buildImpactForwardingArgs(args, workspacePath) {
  return {
    workspacePath,
    paths: args.paths ?? [],
    changeType: args.changeType ?? "semantic_change",
    maxDistance: args.maxDistance ?? 3,
    minimumScore: args.minimumScore ?? 0.2,
  };
}

export function applyRuntimeArgumentHardening(runtime = govibeRuntime) {
  if (runtime.__wp05ArgumentHardeningApplied) return runtime;
  const legacyContinue = runtime.continueWorkflow.bind(runtime);

  runtime.continueWorkflow = async (args = {}) => {
    if (args.runId && args.taskId && args.status) return legacyContinue(args);
    const workspacePath = await resolveBoundedWorkspace(args.workspacePath, runtime.allowedWorkspaceRoots);
    const builtInSkill = await readSkillDefinition(skillPath);
    const result = await continueCore(buildContinueForwardingArgs(args, workspacePath, runtime.mspClient, [builtInSkill.contentHash]));
    runtime.appendTerminal(result.status === "ready" ? "sys" : "warn", `GoVibe continue ${result.status}.`);
    return result;
  };

  runtime.workspaceImpact = async (args = {}) => {
    const workspacePath = await resolveBoundedWorkspace(args.workspacePath, runtime.allowedWorkspaceRoots);
    return workspaceImpactCore(buildImpactForwardingArgs(args, workspacePath));
  };

  runtime.__wp05ArgumentHardeningApplied = true;
  return runtime;
}

applyRuntimeArgumentHardening();
