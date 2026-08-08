import { describe, expect, it } from "vitest";

// TASK-PRD-003 success-criterion proof: this test MUST fail so the required
// baseline-check reports failure on a pull request. The PR is closed unmerged
// once the red check is recorded as evidence.
describe("gate-ci failure proof", () => {
  it("deliberately fails to prove the baseline gate blocks a red suite", () => {
    expect(1).toBe(2);
  });
});
