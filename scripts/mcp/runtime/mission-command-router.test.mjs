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
});
