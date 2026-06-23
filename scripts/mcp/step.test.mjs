import { describe, expect, it, vi } from "vitest";

import { runStep } from "./step.mjs";
import { runVerifyGate } from "./verify-gate.mjs";

// All side effects are injected fakes — no agent spawns, no real npm checks.
function makeDeps(overrides = {}) {
  const mutations = [];
  const events = [];
  return {
    mutations,
    events,
    deps: {
      runAgent: overrides.runAgent ?? (async () => ({ result: { ok: true, exitCode: 0, stdout: "ok" } })),
      runGate: overrides.runGate ?? (async () => ({ verdict: "pass", checks: [{ name: "lint", ok: true, output: "" }] })),
      applyMutation: async (mutation) => { mutations.push(mutation); },
      appendTerminal: () => {},
      logEvent: () => {},
      emit: (event) => { events.push(event); },
      gitStatus: async () => [],
      createTemporal: () => ({ version: "1" }),
      now: () => "2026-06-21T00:00:00.000Z",
    },
  };
}

const baseStep = {
  stepId: "s1",
  taskId: "TASK-A",
  agentId: "vibe",
  mode: "atomic",
  task: "do it",
  executorRoute: {},
  definitionOfDone: { checks: ["lint"], requireAll: true },
  maxAttempts: 2,
};

describe("runStep", () => {
  it("passes on attempt 1 and advances the task to done", async () => {
    const { deps, mutations } = makeDeps();
    const result = await runStep(baseStep, deps);
    expect(result.status).toBe("done");
    expect(result.attempts).toBe(1);
    expect(result.selfCheck.verdict).toBe("pass");
    expect(mutations).toEqual([
      { mutationType: "verification", nodeId: "TASK-A", payload: { qaStatus: "passed" } },
      { mutationType: "node.update", nodeId: "TASK-A", payload: { state: "done", progress: 100 } },
    ]);
  });

  it("retries after a gate failure, then passes on attempt 2", async () => {
    let call = 0;
    const runGate = async () => {
      call += 1;
      return call === 1
        ? { verdict: "fail", checks: [{ name: "lint", ok: false, output: "tsc error" }] }
        : { verdict: "pass", checks: [{ name: "lint", ok: true, output: "" }] };
    };
    const { deps } = makeDeps({ runGate });
    const result = await runStep(baseStep, deps);
    expect(result.status).toBe("done");
    expect(result.attempts).toBe(2);
  });

  it("blocks and raises a human gate after exhausting attempts (DoD never auto-overridden)", async () => {
    const runGate = async () => ({ verdict: "fail", checks: [{ name: "lint", ok: false, output: "still broken" }] });
    const { deps, mutations, events } = makeDeps({ runGate });
    const result = await runStep(baseStep, deps);
    expect(result.status).toBe("blocked");
    expect(result.attempts).toBe(2);
    expect(result.humanGate).toMatchObject({ required: true });
    expect(mutations).toContainEqual({ mutationType: "node.update", nodeId: "TASK-A", payload: { state: "blocked" } });
    expect(events.some((event) => event.type === "step.gate" && event.status === "blocked")).toBe(true);
  });

  it("retries on agent failure and does not run the gate for the failed attempt", async () => {
    let agentCall = 0;
    const runAgent = async () => {
      agentCall += 1;
      return agentCall === 1
        ? { result: { ok: false, exitCode: 1, stderr: "executor crashed" } }
        : { result: { ok: true, exitCode: 0, stdout: "ok" } };
    };
    const gate = vi.fn(async () => ({ verdict: "pass", checks: [] }));
    const { deps } = makeDeps({ runAgent, runGate: gate });
    const result = await runStep(baseStep, deps);
    expect(result.status).toBe("done");
    expect(result.attempts).toBe(2);
    expect(gate).toHaveBeenCalledTimes(1); // gate runs only on the successful agent attempt
  });
});

describe("runVerifyGate", () => {
  const fakeChecks = {
    lint: { name: "lint", ok: true, output: "" },
    test: { name: "test", ok: false, output: "1 failed" },
  };
  const runCheck = async (name) => fakeChecks[name] ?? { name, ok: false, output: "unknown" };

  it("requireAll true: fails when any check fails", async () => {
    const result = await runVerifyGate({ checks: ["lint", "test"], requireAll: true }, { runCheck });
    expect(result.verdict).toBe("fail");
  });

  it("requireAll false: passes when any check passes", async () => {
    const result = await runVerifyGate({ checks: ["lint", "test"], requireAll: false }, { runCheck });
    expect(result.verdict).toBe("pass");
  });

  it("treats an empty Definition-of-Done as a flagged vacuous pass", async () => {
    const result = await runVerifyGate({ checks: [] }, { runCheck });
    expect(result.verdict).toBe("pass");
    expect(result.empty).toBe(true);
  });
});
