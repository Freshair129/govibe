import { describe, expect, it, vi } from "vitest";
import { runStep } from "./step.mjs";

function baseStep(overrides = {}) {
  return {
    stepId: "step-1",
    taskId: "TASK-VACUOUS",
    agentId: "agent-1",
    mode: "atomic",
    task: "Do the thing",
    executorRoute: {},
    contextSelectors: [],
    definitionOfDone: { checks: [] },
    maxAttempts: 1,
    ...overrides,
  };
}

function passingAgentRun() {
  return { result: { ok: true, exitCode: 0, stdout: "done" } };
}

describe("runStep — TASK-PRD-030 (AUD-06) false-success regression", () => {
  // Former false-success path #1: scripts/mcp/verify-gate.mjs — an empty
  // Definition-of-Done used to verdict "pass" unconditionally, so a StEP with
  // zero declared checks was marked done on executor exit-code alone. If the
  // fail-closed guard in runVerifyGate/runStep is ever removed or weakened,
  // this test starts marking the task "done", not "blocked", and fails.
  it("refuses to mark a task done when the Definition-of-Done declares zero checks", async () => {
    const runAgent = vi.fn(async () => passingAgentRun());
    const applyMutation = vi.fn(async () => ({}));
    const runGate = vi.fn(async (dod) => ({
      verdict: (dod.checks ?? []).length === 0 ? "vacuous" : "pass",
      checks: [],
      empty: (dod.checks ?? []).length === 0,
    }));

    const result = await runStep(baseStep(), {
      runAgent,
      runGate,
      applyMutation,
      gitStatus: async () => [],
      now: () => "2026-08-19T00:00:00.000Z",
    });

    expect(result.status).toBe("blocked");
    expect(result.humanGate?.required).toBe(true);
    expect(result.humanGate?.reason).toMatch(/vacuous/i);

    // The task must never be pushed to "done" via the vacuous DoD path.
    const nodeUpdateCalls = applyMutation.mock.calls
      .map(([args]) => args)
      .filter((args) => args.mutationType === "node.update");
    expect(nodeUpdateCalls).toHaveLength(1);
    expect(nodeUpdateCalls[0].payload.state).not.toBe("done");
    expect(nodeUpdateCalls[0].payload.state).toBe("blocked");

    // Only one attempt: a vacuous DoD is not something a retry can fix, so the
    // step must not burn further agent invocations trying.
    expect(runAgent).toHaveBeenCalledTimes(1);
  });

  it("marks a task done when an explicit allowEmptyDefinitionOfDone override is honored by the gate", async () => {
    const runAgent = vi.fn(async () => passingAgentRun());
    const applyMutation = vi.fn(async () => ({}));
    const appendTerminal = vi.fn();
    const emit = vi.fn();
    // Simulates a gate that honors the deliberate, explicit override — the
    // override must be visible in the declared DoD, not a silent default.
    const runGate = vi.fn(async (dod) => ({
      verdict: dod.allowEmptyDefinitionOfDone === true ? "pass" : "vacuous",
      checks: [],
      empty: true,
      allowEmptyDefinitionOfDone: dod.allowEmptyDefinitionOfDone === true,
    }));

    const result = await runStep(
      baseStep({ definitionOfDone: { checks: [], allowEmptyDefinitionOfDone: true } }),
      { runAgent, runGate, applyMutation, appendTerminal, emit, gitStatus: async () => [], now: () => "2026-08-19T00:00:00.000Z" },
    );

    expect(result.status).toBe("done");
    const nodeUpdateCalls = applyMutation.mock.calls.map(([args]) => args).filter((args) => args.mutationType === "node.update");
    expect(nodeUpdateCalls[0].payload.state).toBe("done");

    // Review-gate finding 030-D: the override must be distinguishable at both governance
    // surfaces — a warn terminal line naming it, and a marker on the emitted step.gate event
    // (visible to a listener that only watches step.gate, not the full result/selfCheck).
    const warnLines = appendTerminal.mock.calls.filter(([type]) => type === "warn");
    expect(warnLines.some(([, text]) => /allowEmptyDefinitionOfDone override/i.test(text))).toBe(true);
    const gateEvent = emit.mock.calls.map(([event]) => event).find((event) => event.type === "step.gate");
    expect(gateEvent).toMatchObject({ status: "done", emptyDefinitionOfDoneOverride: true });
  });

  it("does not mark a real-checks pass with the empty-DoD override warning or marker", async () => {
    const runAgent = vi.fn(async () => passingAgentRun());
    const applyMutation = vi.fn(async () => ({}));
    const appendTerminal = vi.fn();
    const emit = vi.fn();
    const runGate = vi.fn(async () => ({
      verdict: "pass",
      checks: [{ name: "lint", ok: true, output: "" }],
      empty: false,
      allowEmptyDefinitionOfDone: false,
    }));

    const result = await runStep(
      baseStep({ definitionOfDone: { checks: ["lint"] } }),
      { runAgent, runGate, applyMutation, appendTerminal, emit, gitStatus: async () => [], now: () => "2026-08-19T00:00:00.000Z" },
    );

    expect(result.status).toBe("done");
    expect(appendTerminal.mock.calls.some(([type]) => type === "warn")).toBe(false);
    const gateEvent = emit.mock.calls.map(([event]) => event).find((event) => event.type === "step.gate");
    expect(gateEvent).toEqual({ type: "step.gate", stepId: "step-1", taskId: "TASK-VACUOUS", status: "done" });
    expect(gateEvent).not.toHaveProperty("emptyDefinitionOfDoneOverride");
  });
});
