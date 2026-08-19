import { describe, expect, it } from "vitest";
import { runVerifyGate } from "./verify-gate.mjs";

describe("runVerifyGate — TASK-PRD-030 (AUD-06) vacuous DoD fail-closed", () => {
  it("does not verdict 'pass' for an empty checks array by default", async () => {
    const result = await runVerifyGate({ checks: [] });
    expect(result.verdict).toBe("vacuous");
    expect(result.verdict).not.toBe("pass");
    expect(result.empty).toBe(true);
    expect(result.allowEmptyDefinitionOfDone).toBe(false);
  });

  it("does not verdict 'pass' when checks is omitted entirely (silent default stays vacuous)", async () => {
    const result = await runVerifyGate({});
    expect(result.verdict).toBe("vacuous");
  });

  it("only verdicts 'pass' on an empty DoD when allowEmptyDefinitionOfDone is explicitly true", async () => {
    const result = await runVerifyGate({ checks: [], allowEmptyDefinitionOfDone: true });
    expect(result.verdict).toBe("pass");
    expect(result.allowEmptyDefinitionOfDone).toBe(true);
  });

  it("still evaluates real declared checks against injected runCheck (unaffected by the empty-DoD guard)", async () => {
    const runCheck = async (name) => ({ name, ok: name === "lint", output: "" });
    const passing = await runVerifyGate({ checks: ["lint"] }, { runCheck });
    expect(passing.verdict).toBe("pass");
    const failing = await runVerifyGate({ checks: ["lint", "build"] }, { runCheck });
    expect(failing.verdict).toBe("fail");
  });
});
