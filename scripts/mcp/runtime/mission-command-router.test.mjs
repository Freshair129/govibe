import { describe, expect, it, vi } from "vitest";
import { MissionCommandRouter } from "./mission-command-router.mjs";

function services() {
  return {
    appendTerminal: vi.fn(), getSnapshot: vi.fn(() => ({ connectionState: "connected" })),
    reloadRoadmap: vi.fn(async (source) => ({ source })), previewMasterPlan: vi.fn(async (source) => ({ source })),
    scanWorkspace: vi.fn(async () => ({ status: "complete" })),
  };
}

describe("mission command router", () => {
  it.each([
    [{ type: "terminal.command", command: "status" }, "terminal.command"],
    [{ type: "terminal.command", command: "roadmap reload" }, "roadmap.reload"],
    [{ type: "terminal.command", command: "roadmap load docs/roadmap/a.md" }, "roadmap.load"],
    [{ type: "roadmap.select", sourcePath: "docs/roadmap/a.md" }, "roadmap.select"],
    [{ type: "masterplan.preview", sourcePath: "docs/roadmap/m.md" }, "masterplan.preview"],
    [{ type: "workspace.scan", workspacePath: "C:/repo", deep: true }, "workspace.scan"],
    [{ type: "agent.select", agentId: "a" }, "agent.select"],
    [{ type: "reactor.run", profile: "safe" }, "reactor.run"],
    [{ type: "file.save", hash: "h", data: [], meta: {} }, "file.save"],
  ])("routes %s without domain implementation", async (command, action) => {
    expect(await new MissionCommandRouter(services()).route(command)).toMatchObject({ ok: true, action });
  });

  // TASK-PRD-007 (B9, round 3): F8 (handlers.mjs) stripped `observed` from the stdio MCP tool
  // response only -- this sidecar-facing router path (POST /mission/commands, the transport
  // Mission Control actually uses, and what sidecar-server.mjs's command dedup LRU caches and
  // re-serves on replay) still carried it. `result` must never expose it, even though the
  // underlying WorkspaceService.scan() result does.
  it("workspace.scan never exposes `observed` in the routed result -- the sidecar-facing path F8 (handlers.mjs) did not cover", async () => {
    const observedFixture = {
      nodes: [{ id: "file:big.ts", labels: ["File"], props: { path: "big.ts" } }],
      edges: [], symbols: [], totals: { nodes: 1, edges: 0, symbols: 0 }, truncated: false,
    };
    const service = { ...services(), scanWorkspace: vi.fn(async () => ({ status: "complete", runId: "r1", observed: observedFixture })) };

    const response = await new MissionCommandRouter(service).route({ type: "workspace.scan", workspacePath: "C:/repo", deep: true });

    expect(response.result).not.toHaveProperty("observed");
    expect(response.result).toMatchObject({ status: "complete", runId: "r1" });
    expect(JSON.stringify(response)).not.toContain("big.ts");
  });
});
