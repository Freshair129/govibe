// Standard Execution Packet (StEP) — the shared, repeatable unit of agent work.
//
// One StEP = "run a task through one agent, then verify it against a REAL Definition-of-Done;
// retry-with-escalation on failure; advance the roadmap on pass, or block + raise a human gate."
// This is the atom that makes CoVibe (single lane) and CoDev (lane-tagged + handoff) repeatable
// and loopable. It mirrors the framework's Phase 3.5 micro-task runner (acceptance_tests +
// max_retries) and P6 AUDIT gate (see govibe-cognitive-system-framework memory).
//
// Pure-ish + fully injectable: all side effects (runAgent / verify gate / roadmap mutation /
// terminal / telemetry / git) are passed in via `deps`, so it unit-tests without spawning anything.

const TIER_ORDER = ["tiny", "default", "pro", "retry"];

function tail(text, max = 800) {
  const value = String(text ?? "");
  return value.length > max ? value.slice(-max) : value;
}

// Attempt 2+ escalates the model tier toward "retry" and prefers codex for broader reasoning.
function escalateRoute(route = {}, attempt) {
  if (attempt <= 1) return { ...route };
  const base = TIER_ORDER.indexOf(route.modelTier ?? "default");
  const nextTier = TIER_ORDER[Math.min(TIER_ORDER.length - 1, (base < 0 ? 1 : base) + (attempt - 1))];
  return { ...route, modelTier: nextTier, executor: route.executor ?? "codex" };
}

// artifactRefs = real working-tree delta during the step (git porcelain lines that are new).
function diffFiles(before = [], after = []) {
  const beforeSet = new Set(before);
  return after.filter((line) => !beforeSet.has(line));
}

function finalize(status, ctx) {
  const { step, attempts, artifactRefs, evidence, selfCheck, humanGate, createTemporal, now } = ctx;
  return {
    stepId: step.stepId,
    taskId: step.taskId,
    lane: step.lane,
    status,
    attempts,
    artifactRefs,
    evidence,
    selfCheck,
    ...(humanGate ? { humanGate } : {}),
    auditRef: `govibe.orchestrate.step:${now()}`,
    ...(createTemporal ? createTemporal({}, now()) : {}),
  };
}

/**
 * Execute one StEP.
 * @param {object} step - StepInput (stepId, taskId, lane?, agentId, mode, scope?, task,
 *   executorRoute, definitionOfDone, maxAttempts, budget?, ...).
 * @param {object} deps - injected effects:
 *   runAgent(args)->{result:{stdout,stderr,ok,exitCode}}, runGate(dod)->{verdict,checks},
 *   applyMutation({mutationType,nodeId,payload}), appendTerminal(type,text), logEvent(name,payload),
 *   emit(event), gitStatus()->string[], createTemporal(init,at)->temporalFields, now()->iso.
 * @returns {Promise<object>} StepResult
 */
export async function runStep(step, deps = {}) {
  const {
    runAgent,
    runGate,
    applyMutation,
    appendTerminal,
    logEvent,
    emit,
    gitStatus,
    createTemporal,
    now = () => new Date().toISOString(),
  } = deps;

  const maxAttempts = Math.max(1, step.maxAttempts ?? 1);
  const evidence = [];
  let attempts = 0;
  let lastSelfCheck = { verdict: "fail", checks: [] };
  let feedback = "";

  const beforeFiles = gitStatus ? await gitStatus() : [];
  emit?.({ type: "step.start", stepId: step.stepId, taskId: step.taskId, lane: step.lane });

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    const route = escalateRoute(step.executorRoute, attempt);
    emit?.({ type: "step.attempt", stepId: step.stepId, taskId: step.taskId, attempt });

    const agentRun = await runAgent({
      agent: step.agentId,
      task: feedback ? `${step.task ?? ""}\n\n[Retry feedback]\n${feedback}` : (step.task ?? ""),
      scope: step.scope,
      mode: step.mode,
      executor: route.executor,
      localModel: route.localModel,
      retryLargerLocalModel: attempt > 1,
    });
    const agentResult = agentRun?.result ?? agentRun ?? {};
    const agentOk = agentResult.ok !== false && (agentResult.exitCode ?? 0) === 0;
    evidence.push({
      kind: "agent_stdout",
      ref: `attempt-${attempt}`,
      ok: agentOk,
      detail: tail(agentResult.stdout || agentResult.stderr),
    });

    if (!agentOk) {
      feedback = `Previous executor attempt failed: ${tail(agentResult.stderr || agentResult.stdout, 400)}`;
      continue;
    }

    const selfCheck = await runGate(step.definitionOfDone ?? {});
    lastSelfCheck = selfCheck;
    for (const check of selfCheck.checks ?? []) {
      evidence.push({ kind: "check", ref: check.name, ok: check.ok, detail: tail(check.output, 400) });
    }

    if (selfCheck.verdict === "pass") {
      const afterFiles = gitStatus ? await gitStatus() : [];
      const artifactRefs = diffFiles(beforeFiles, afterFiles);
      if (applyMutation) {
        await applyMutation({ mutationType: "verification", nodeId: step.taskId, payload: { qaStatus: "passed" } });
        await applyMutation({ mutationType: "node.update", nodeId: step.taskId, payload: { state: "done", progress: 100 } });
      }
      const result = finalize("done", { step, attempts, artifactRefs, evidence, selfCheck, createTemporal, now });
      appendTerminal?.("agent", `StEP ${step.stepId} (${step.taskId}) passed DoD on attempt ${attempt}.`);
      logEvent?.("orchestrate_step", { step, result });
      emit?.({ type: "step.gate", stepId: step.stepId, taskId: step.taskId, status: "done" });
      return result;
    }

    // Gate failed — feed the failing checks into the next attempt's prompt.
    const failing = (selfCheck.checks ?? []).filter((check) => !check.ok);
    feedback = `Definition-of-Done failed:\n${failing.map((c) => `- ${c.name}: ${tail(c.output, 200)}`).join("\n")}`;
  }

  // Exhausted attempts — block the task and raise a human gate. DoD is never auto-overridden.
  const afterFiles = gitStatus ? await gitStatus() : [];
  const artifactRefs = diffFiles(beforeFiles, afterFiles);
  if (applyMutation) {
    await applyMutation({ mutationType: "verification", nodeId: step.taskId, payload: { qaStatus: "failed" } });
    await applyMutation({ mutationType: "node.update", nodeId: step.taskId, payload: { state: "blocked" } });
  }
  const humanGate = { required: true, reason: `Definition-of-Done failed after ${attempts} attempt(s).` };
  const result = finalize("blocked", { step, attempts, artifactRefs, evidence, selfCheck: lastSelfCheck, humanGate, createTemporal, now });
  appendTerminal?.("warn", `StEP ${step.stepId} (${step.taskId}) blocked after ${attempts} attempt(s); human gate required.`);
  logEvent?.("orchestrate_step", { step, result });
  emit?.({ type: "step.gate", stepId: step.stepId, taskId: step.taskId, status: "blocked", humanGate });
  return result;
}
