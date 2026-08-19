import { spawn } from "node:child_process";
import { runStep as executeStep } from "../step.mjs";
import { runVerifyGate } from "../verify-gate.mjs";
import { createTemporalVersion } from "../temporal-versioning.mjs";
import { buildAllowlistedChildEnv } from "./child-env.mjs";

// TASK-PRD-028 (AUD-10a) review-gate hardening: an explicit allowlisted env, not the full
// parent process.env, for defense-in-depth parity with the other two spawn sites (agent-session
// PTY spawn, runAgent's launcher spawn) even though `git status` runs no user-controlled code.
function gitStatus(cwd) { return new Promise((resolve) => { const child = spawn("git", ["status", "--porcelain"], { cwd, env: buildAllowlistedChildEnv() }); let output = ""; child.stdout.on("data", (chunk) => { output += chunk.toString(); }); child.on("error", () => resolve([])); child.on("close", () => resolve(output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))); }); }
const auditRef = (capability) => `${capability}:${new Date().toISOString()}`;

export class OrchestrationService {
  constructor(options) { Object.assign(this, options); }
  async run(args = {}) {
    const step = { stepId: args.stepId ?? `step-${crypto.randomUUID()}`, taskId: args.taskId, lane: args.lane, agentId: args.agentId ?? args.agent_id, mode: args.mode ?? "atomic", scope: args.scope, task: args.task ?? `Execute task ${args.taskId ?? ""}`.trim(), executorRoute: { executor: args.executor, localModel: args.localModel, modelTier: args.modelTier }, contextSelectors: args.contextSelectors ?? [], definitionOfDone: args.definitionOfDone ?? { checks: [], requireAll: true }, maxAttempts: args.maxAttempts ?? 1, budget: args.budget, complexity: args.complexity, contextTier: args.contextTier };
    const result = await executeStep(step, {
      runAgent: this.runAgent, runGate: (dod) => runVerifyGate(dod, { cwd: this.workspaceRoot, maxMs: step.budget?.maxMs }),
      applyMutation: this.applyMutation, appendTerminal: this.appendTerminal, logEvent: this.logEvent, emit: this.emit,
      gitStatus: () => gitStatus(this.workspaceRoot), createTemporal: createTemporalVersion, now: () => new Date().toISOString(),
    });
    return { capability: "govibe.orchestrate.step", auditRef: auditRef("govibe.orchestrate.step"), request: args, result };
  }
}
