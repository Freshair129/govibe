import { describe, expect, it } from "vitest";

import { DISPATCHED_STATUSES, EVIDENCE_ARTIFACT_PATTERN, NODE_CONTRACT_GOVERNED_SOURCES } from "./validate-roadmap-containers.mjs";

// Regression guard for a real bug found while building GLS-004: the node-contract
// requirement (ADR-029 §5) initially applied to every roadmap source, which hard-failed
// years of already-approved, already-closed masterplan work (TASK-PRD-001..017) for a rule
// that did not exist when that work closed. The check must stay scoped to the source ADR-029
// actually governs.
describe("node-contract gate scope (regression: must not apply repo-wide)", () => {
  it("governs only the Gov-Layer Supervision Surfaces backlog", () => {
    expect([...NODE_CONTRACT_GOVERNED_SOURCES]).toEqual(["BACKLOG-govlayer-supervision-surfaces.md"]);
  });

  it("does not govern the production-readiness masterplan or any other historical source", () => {
    expect(NODE_CONTRACT_GOVERNED_SOURCES.has("MASTERPLAN-govibe-production-readiness.md")).toBe(false);
    expect(NODE_CONTRACT_GOVERNED_SOURCES.has("BACKLOG-p1-mvp-core.md")).toBe(false);
  });
});

describe("DISPATCHED_STATUSES", () => {
  it("uses normalized WorkflowTaskState values, not raw table tokens", () => {
    // roadmap-parser.mjs's mapWorkflowState() maps the raw "in-progress" table
    // token to "in_progress" and "review" to "qa_review" — the gate must match
    // against those normalized values, not the raw hyphenated text.
    expect(DISPATCHED_STATUSES.has("in_progress")).toBe(true);
    expect(DISPATCHED_STATUSES.has("in-progress")).toBe(false);
    expect(DISPATCHED_STATUSES.has("qa_review")).toBe(true);
    expect(DISPATCHED_STATUSES.has("review")).toBe(false);
    expect(DISPATCHED_STATUSES.has("done")).toBe(true);
    expect(DISPATCHED_STATUSES.has("planned")).toBe(false);
    expect(DISPATCHED_STATUSES.has("blocked")).toBe(false);
  });
});

describe("EVIDENCE_ARTIFACT_PATTERN (Check 5 trigger)", () => {
  it("matches handoffs that reference exit-gate or contract evidence", () => {
    expect(EVIDENCE_ARTIFACT_PATTERN.test("exit gate evidence attached")).toBe(true);
    expect(EVIDENCE_ARTIFACT_PATTERN.test("exit-gate evidence attached")).toBe(true);
    expect(EVIDENCE_ARTIFACT_PATTERN.test("contract evidence for the closed node")).toBe(true);
  });

  it("does not match unrelated required-artifact text, including plain 'contract' or 'gate' alone", () => {
    expect(EVIDENCE_ARTIFACT_PATTERN.test("Impact analysis over the changed MissionSnapshot contract")).toBe(false);
    expect(EVIDENCE_ARTIFACT_PATTERN.test("ADR-029 ratification plus H4 session-authorization decision")).toBe(false);
    expect(EVIDENCE_ARTIFACT_PATTERN.test("gate keeper review")).toBe(false);
  });
});
