import { realpath } from "node:fs/promises";
import path from "node:path";
import {
  assertPolicyAllows, continueWorkflow, createPolicyEnvelope, createWorkflowPlan, docsVersion, getWorkflowStatus,
  initializeWorkspace, optimizeMeasured, readSkillDefinition, reviewWorkspace, scanWorkspace, transitionWorkflow, workspaceImpact,
} from "../../../packages/govibe-core/src/index.mjs";

async function resolveWorkspace(workspacePath, allowedRoots) {
  if (!workspacePath || !path.isAbsolute(workspacePath)) throw new Error("workspacePath must be an absolute caller-declared root.");
  const target = await realpath(path.normalize(workspacePath));
  const roots = await Promise.all(allowedRoots.map((root) => realpath(path.normalize(root))));
  const targetKey = process.platform === "win32" ? target.toLowerCase() : target;
  const allowed = roots.some((root) => { const rootKey = process.platform === "win32" ? root.toLowerCase() : root; const relative = path.relative(rootKey, targetKey); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); });
  if (!allowed) throw new Error("workspacePath is outside configured GoVibe roots.");
  return target;
}

function missionRun(result) {
  const stageRuns = result.stageRuns?.map((stage) => ({ stage: stage.stage, name: stage.name, status: stage.status, method: stage.method, confidence: stage.confidence, outputRefs: stage.outputRefs, error: stage.error }));
  return { runId: result.runId, status: result.status, currentTask: result.status === "complete" ? null : stageRuns?.find((stage) => stage.status !== "complete" && stage.status !== "not_applicable")?.name ?? null, tasks: stageRuns?.map((stage) => ({ id: `stage-${stage.stage}`, status: stage.status, outputRefs: stage.outputRefs })) ?? [], kind: "scan", level: result.level, stageRuns, graphValidation: result.graphValidation ? { passed: result.graphValidation.passed, errors: result.graphValidation.errors } : undefined };
}

export class WorkspaceService {
  constructor(options) { Object.assign(this, options); }
  async target(value) { return resolveWorkspace(value, this.allowedRoots); }
  publishRun(run) { const snapshot = this.snapshotStore.getSnapshot(); this.snapshotStore.patch({ workflowRuns: [...snapshot.workflowRuns.filter((item) => item.runId !== run.runId), run] }); this.snapshotStore.emit({ type: "workflow.run", run }); }
  async initialize(args = {}) {
    const target = await this.target(args.workspacePath);
    const builtInSkill = await readSkillDefinition(path.join(this.workspaceRoot, ".govibe", "skills", "block-decomposition", "1.0.0", "SKILL.md"));
    const result = await initializeWorkspace({ workspacePath: target, builtInSkill, mspClient: this.mspClient, actor: args.actor ?? "unknown" });
    this.snapshotStore.appendTerminal("sys", "GoVibe workspace prepared.");
    return result;
  }
  async continue(args = {}) {
    const target = await this.target(args.workspacePath);
    if (args.runId && args.taskId && args.status) {
      const event = await transitionWorkflow({ workspacePath: target, runId: args.runId, taskId: args.taskId, status: args.status, idempotencyKey: args.idempotencyKey, verification: args.verification, outputRefs: args.outputRefs });
      const run = await getWorkflowStatus({ workspacePath: target, runId: args.runId }); this.publishRun(run); return { status: run.status, event, run };
    }
    const builtInSkill = await readSkillDefinition(path.join(this.workspaceRoot, ".govibe", "skills", "block-decomposition", "1.0.0", "SKILL.md"));
    const result = await continueWorkflow({ workspacePath: target, mspClient: this.mspClient, actor: args.actor ?? "unknown", executor: args.executor ?? "codex", trustedWorkspaceHashes: [builtInSkill.contentHash] });
    this.snapshotStore.appendTerminal(result.status === "ready" ? "sys" : "warn", `GoVibe continue ${result.status}.`); return result;
  }
  async createPlan(args = {}) { const result = await createWorkflowPlan({ workspacePath: await this.target(args.workspacePath), runId: args.runId, tasks: args.tasks, policyEnvelope: createPolicyEnvelope(args.mode ?? "codev", args.actor ?? "unknown") }); this.publishRun(result); return result; }
  async status(args = {}) { const result = await getWorkflowStatus({ workspacePath: await this.target(args.workspacePath), runId: args.runId }); const snapshot = this.snapshotStore.getSnapshot(); this.snapshotStore.patch({ workflowRuns: [...snapshot.workflowRuns.filter((run) => run.runId !== result.runId), result] }); return result; }
  async impact(args = {}) { return workspaceImpact({ workspacePath: await this.target(args.workspacePath), paths: args.paths ?? [] }); }
  async version(args = {}) { return docsVersion({ workspacePath: await this.target(args.workspacePath), path: args.path }); }
  async review(args = {}) { return reviewWorkspace({ workspacePath: await this.target(args.workspacePath) }); }
  async optimize(args = {}) { assertPolicyAllows(createPolicyEnvelope(args.mode ?? "covibe", args.actor ?? "unknown"), "optimize"); if (args.strategy !== "deduplicate_strings" || !Array.isArray(args.values)) throw new Error("Unsupported optimize strategy."); let output = [...args.values]; const result = await optimizeMeasured({ measureBefore: async () => args.values.length, optimize: async () => { output = [...new Set(args.values)]; }, measureAfter: async () => output.length }); return { ...result, strategy: args.strategy, output }; }
  async scan(args = {}) { const result = await scanWorkspace({ workspacePath: await this.target(args.workspacePath), deep: args.deep === true, mspClient: this.mspClient, gksClient: this.gksClient, actor: args.actor ?? "unknown", runId: args.runId, resume: args.resume === true }); const run = missionRun(result); this.publishRun(run); this.snapshotStore.appendTerminal(result.status === "complete" ? "sys" : "warn", `GoVibe ${result.level} scan ${result.status}.`); return result; }
}
