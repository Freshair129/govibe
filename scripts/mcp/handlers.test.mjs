// TASK-PRD-007 (F8): `govibe.workspace.scan`'s MCP tool response must never carry the internal
// Deep Scan `observed` presentation accumulator (packages/govibe-core/src/scan/stage-runner.mjs)
// -- it can hold thousands of full node/edge/symbol objects and is not part of this tool's public
// contract (registry.mjs declares no outputSchema for it, so nothing else strips it). RBAC and
// the real GovibeRuntime singleton are mocked out here so this test isolates handlers.mjs's own
// response-shaping logic from workspace/RBAC/MSP wiring, which is covered elsewhere.
import { describe, expect, it, vi } from "vitest";

vi.mock("./runtime/rbac-enforcement.mjs", () => ({ enforceToolRbac: vi.fn(async () => {}) }));

const observedFixture = {
  nodes: Array.from({ length: 50 }, (_, index) => ({ id: `file:f${index}.ts`, labels: ["File"], props: { path: `f${index}.ts` } })),
  edges: [],
  symbols: [],
  totals: { nodes: 50, edges: 0, symbols: 0 },
  truncated: false,
};

vi.mock("./runtime-core.mjs", () => ({
  govibeRuntime: {
    scanWorkspace: vi.fn(async () => ({
      schema: "govibe-scan-result/v1",
      runId: "handlers-f8",
      level: "L2",
      status: "complete",
      sourceSnapshotHash: "a".repeat(64),
      workspaceId: null,
      stageRuns: [],
      graphValidation: { passed: true, errors: [] },
      observed: observedFixture,
    })),
  },
}));

import { handleToolCall } from "./handlers.mjs";

describe("govibe.workspace.scan MCP tool response", () => {
  it("never includes `observed` in structuredContent -- it stays internal to the runtime", async () => {
    const result = await handleToolCall("govibe.workspace.scan", { actor: "test", workspacePath: "C:/repo", deep: true });

    expect(result.structuredContent).not.toHaveProperty("observed");
    // Sanity: the rest of the scan result still comes through untouched.
    expect(result.structuredContent).toMatchObject({ capability: "govibe.workspace.scan", runId: "handlers-f8", status: "complete", level: "L2" });
    expect(JSON.stringify(result)).not.toContain("f0.ts");
  });
});
