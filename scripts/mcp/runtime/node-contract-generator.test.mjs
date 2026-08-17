import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  NODE_CONTRACT_SCHEMA_VERSION,
  deriveExitGate,
  extractDependencies,
  generateNodeContract,
  generateNodeContractForTask,
  validateNodeContract,
} from "./node-contract-generator.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const glsBacklogPath = path.join(workspaceRoot, "docs", "roadmap", "BACKLOG-govlayer-supervision-surfaces.md");

const FIXED_NOW = () => "2026-08-17T12:00:00.000Z";

function completeTaskContainer(overrides = {}) {
  return {
    task_container_id: "TC-FIX-001",
    task_id: "FIX-001",
    complete: true,
    missingFields: [],
    symbol_links: { code: "src/x.ts", doc: "docs/x.md", test: "src/x.test.ts" },
    definition_of_done: {
      acceptance_criteria: [{ criterion: "Given a, when b, then c", checked: false }],
      success_criteria: [],
      exit_criteria: [],
    },
    ...overrides,
  };
}

describe("extractDependencies", () => {
  const source = `
## Backlog Items

| ID | Parent ID | Type | Title | Priority | Owner | Status | Dependencies | Source Section |
|---|---|---|---|---|---|---|---|---|
| FIX-001 | SPR-01 | task | Something | P0 | VIBE | planned | - | Section 1 |
| FIX-002 | SPR-01 | task | Something else | P1 | VIBE | planned | FIX-001, FIX-003 | Section 2 |
`;

  it("returns an empty array for a task with no declared dependency", () => {
    expect(extractDependencies(source, "FIX-001")).toEqual([]);
  });

  it("splits a comma-separated dependency list", () => {
    expect(extractDependencies(source, "FIX-002")).toEqual(["FIX-001", "FIX-003"]);
  });

  it("returns an empty array for a task_id not present in the table", () => {
    expect(extractDependencies(source, "FIX-999")).toEqual([]);
  });

  it("returns an empty array when the source has no Backlog Items section", () => {
    expect(extractDependencies("# Just a doc\nNo table here.", "FIX-001")).toEqual([]);
  });
});

describe("deriveExitGate", () => {
  it("adds a vitest command when symbol_links.test resolves to a real test file", () => {
    const gate = deriveExitGate(completeTaskContainer());
    expect(gate.commands).toEqual(["npm run lint", "npx vitest run src/x.test.ts"]);
    expect(gate.evidence).toEqual({ passed: false });
  });

  it("falls back to lint alone when the test link is unavailable, never producing an empty gate", () => {
    const gate = deriveExitGate(completeTaskContainer({ symbol_links: { code: "src/x.ts", doc: "docs/x.md", test: "unavailable" } }));
    expect(gate.commands).toEqual(["npm run lint"]);
  });

  it("falls back to lint alone when there is no symbol_links.test at all", () => {
    const gate = deriveExitGate(completeTaskContainer({ symbol_links: {} }));
    expect(gate.commands).toEqual(["npm run lint"]);
  });
});

describe("generateNodeContract", () => {
  it("refuses to generate a contract for an incomplete Task Container", () => {
    expect(() => generateNodeContract({ taskContainer: completeTaskContainer({ complete: false, missingFields: ["auditor"] }) }))
      .toThrow(/incomplete.*auditor/);
  });

  it("refuses to generate a contract with no acceptance/success/exit criteria", () => {
    expect(() => generateNodeContract({ taskContainer: completeTaskContainer({ definition_of_done: {} }) }))
      .toThrow(/declares no acceptance/);
  });

  it("carries every DoD criterion, defaults node_id to task_id, and produces a schema-valid contract", () => {
    const contract = generateNodeContract({ taskContainer: completeTaskContainer(), sourcePath: "docs/roadmap/FIX.md", now: FIXED_NOW });
    expect(contract).toMatchObject({
      schema: NODE_CONTRACT_SCHEMA_VERSION,
      node_id: "FIX-001",
      task_id: "FIX-001",
      source: { path: "docs/roadmap/FIX.md", task_container_id: "TC-FIX-001" },
      generated_at: "2026-08-17T12:00:00.000Z",
      acceptance_criteria: [{ criterion: "Given a, when b, then c", checked: false }],
    });
    expect(validateNodeContract(contract)).toEqual({ valid: true, errors: [] });
  });

  it("starts escalation at T2 when the exit gate is lint-only, and T0 when a real test gate exists", () => {
    const noTest = generateNodeContract({ taskContainer: completeTaskContainer({ symbol_links: { test: "unavailable" } }), now: FIXED_NOW });
    expect(noTest.retry.escalation).toBe("T2");
    const withTest = generateNodeContract({ taskContainer: completeTaskContainer(), now: FIXED_NOW });
    expect(withTest.retry.escalation).toBe("T0");
  });

  it("resolves dependency edges from the raw plan source into inputs", () => {
    const source = [
      "## Backlog Items",
      "",
      "| ID | Parent ID | Type | Title | Priority | Owner | Status | Dependencies | Source Section |",
      "|---|---|---|---|---|---|---|---|---|",
      "| FIX-001 | SPR-01 | task | Something | P0 | VIBE | planned | UP-001, UP-002 | Section 1 |",
    ].join("\n");
    const contract = generateNodeContract({ taskContainer: completeTaskContainer(), sourceText: source, now: FIXED_NOW });
    expect(contract.inputs).toEqual([{ ref: "UP-001", kind: "payload" }, { ref: "UP-002", kind: "payload" }]);
  });

  it("uses a caller-supplied node_id instead of defaulting to task_id", () => {
    const contract = generateNodeContract({ taskContainer: completeTaskContainer(), nodeId: "FIX-001-attempt-2", now: FIXED_NOW });
    expect(contract.node_id).toBe("FIX-001-attempt-2");
    expect(contract.task_id).toBe("FIX-001");
  });
});

describe("validateNodeContract", () => {
  const valid = generateNodeContract({ taskContainer: completeTaskContainer(), sourcePath: "docs/roadmap/FIX.md", now: FIXED_NOW });

  it("accepts a well-formed contract", () => {
    expect(validateNodeContract(valid)).toEqual({ valid: true, errors: [] });
  });

  it("rejects a non-object", () => {
    expect(validateNodeContract(null).valid).toBe(false);
    expect(validateNodeContract("nope").valid).toBe(false);
  });

  it("rejects the wrong schema constant", () => {
    const result = validateNodeContract({ ...valid, schema: "something-else" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((message) => message.includes("schema must equal"))).toBe(true);
  });

  it("rejects an empty exit_gate.commands array", () => {
    const result = validateNodeContract({ ...valid, exit_gate: { ...valid.exit_gate, commands: [] } });
    expect(result.valid).toBe(false);
  });

  it("rejects an invalid retry.escalation tier", () => {
    const result = validateNodeContract({ ...valid, retry: { ...valid.retry, escalation: "T9" } });
    expect(result.valid).toBe(false);
  });

  it("rejects a rework.policy other than the fixed constant", () => {
    const result = validateNodeContract({ ...valid, rework: { policy: "silently-rewrite" } });
    expect(result.valid).toBe(false);
  });

  it("rejects acceptance_criteria entries missing a boolean checked", () => {
    const result = validateNodeContract({ ...valid, acceptance_criteria: [{ criterion: "x" }] });
    expect(result.valid).toBe(false);
  });
});

describe("generateNodeContractForTask (integration, real plan source)", () => {
  it("generates a schema-valid contract for the real GLS-005 Task Container", async () => {
    const contract = await generateNodeContractForTask({ sourcePath: glsBacklogPath, taskId: "GLS-005", now: FIXED_NOW });
    expect(contract.task_id).toBe("GLS-005");
    expect(contract.source.task_container_id).toBe("TC-GLS-005");
    // GLS-005 depends on GLS-004 per the Backlog Items table.
    expect(contract.inputs).toEqual([{ ref: "GLS-004", kind: "payload" }]);
    expect(contract.acceptance_criteria.length).toBeGreaterThan(0);
    const result = validateNodeContract(contract);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("throws a clear error for a task_id that has no Task Container in the source", async () => {
    await expect(generateNodeContractForTask({ sourcePath: glsBacklogPath, taskId: "GLS-999", now: FIXED_NOW }))
      .rejects.toThrow(/No Task Container for task_id "GLS-999"/);
  });
});
