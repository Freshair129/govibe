import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PmExportService } from "./pm-export-service.mjs";
import { PmAdapterRegistry, PROJECTION_STATES } from "../../../packages/govibe-core/src/pm-adapter/index.mjs";

const NODE = { id: "GLS-005", title: "PmAdapter contract", summary: "s", state: "in_progress", assigneeId: "ARCHON" };

function fakeAdapter() {
  return {
    projectTask: vi.fn(async (taskContainer, config) => ({
      platform: "notion",
      taskId: taskContainer.id,
      externalId: "page-1",
      url: "https://notion.so/page-1",
      backlink: taskContainer.id,
      fieldProjections: [{ field: "title", state: PROJECTION_STATES.FULL, note: config.databaseId }],
    })),
    pullObservedChanges: vi.fn(async () => [{ taskId: "GLS-005", field: "state", externalValue: "Done", externalId: "page-1" }]),
  };
}

function context({ nodes = [NODE] } = {}) {
  const registry = new PmAdapterRegistry();
  registry.register("notion", fakeAdapter());
  const service = new PmExportService({ getSnapshot: () => ({ roadmap: { nodes } }), registry, now: () => "2026-08-17T12:00:00.000Z" });
  return { service, registry };
}

describe("PmExportService.exportTask", () => {
  it("requires taskId and platform", async () => {
    const { service } = context();
    await expect(service.exportTask({ platform: "notion" })).rejects.toThrow(/requires taskId/);
    await expect(service.exportTask({ taskId: "GLS-005" })).rejects.toThrow(/requires platform/);
  });

  it("fails with 'no roadmap node found' when the task isn't in the currently loaded roadmap", async () => {
    const { service } = context({ nodes: [] });
    await expect(service.exportTask({ taskId: "GLS-005", platform: "notion", connectorConfig: { token: "t", databaseId: "d" } }))
      .rejects.toThrow(/no roadmap node found/);
  });

  it("fails closed with pm_connector_unconfigured when no connectorConfig is supplied -- even though the platform IS registered and the task DOES exist", async () => {
    const { service } = context();
    await expect(service.exportTask({ taskId: "GLS-005", platform: "notion" })).rejects.toMatchObject({ code: "pm_connector_unconfigured" });
  });

  it("resolves the real roadmap node and forwards it plus the connectorConfig through the registry, stamping exportedAt", async () => {
    const { service, registry } = context();
    const result = await service.exportTask({ taskId: "GLS-005", platform: "notion", connectorConfig: { token: "t", databaseId: "db-live" } });
    expect(result).toMatchObject({ platform: "notion", taskId: "GLS-005", externalId: "page-1", exportedAt: "2026-08-17T12:00:00.000Z" });
    expect(registry.has("notion")).toBe(true);
  });
});

describe("PmExportService.syncObserved", () => {
  it("requires platform and fails closed without connectorConfig", async () => {
    const { service } = context();
    await expect(service.syncObserved({})).rejects.toThrow(/requires platform/);
    await expect(service.syncObserved({ platform: "notion" })).rejects.toMatchObject({ code: "pm_connector_unconfigured" });
  });

  it("returns observed update candidates, never a canonical mutation -- every candidate carries reviewState 'pending'", async () => {
    const { service } = context();
    const candidates = await service.syncObserved({ platform: "notion", connectorConfig: { token: "t" } });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ kind: "pm_observed_update_candidate", taskId: "GLS-005", field: "state", externalValue: "Done", reviewState: "pending" });
  });
});

// TC-GLS-005 success criterion: "Given no external PM is configured, when the
// same plan is used standalone, then the Roadmap Board provides full PM
// capability with nothing disabled." This is an architectural guarantee, not
// a runtime toggle -- the roadmap engine must have zero import-time coupling
// to the pm-adapter package, so its own mutation/read capability can never be
// gated by whether a PM connector exists.
describe("standalone-PM parity (TC-GLS-005)", () => {
  it("roadmap-service.mjs has no static or dynamic import of the pm-adapter package", () => {
    const roadmapServicePath = fileURLToPath(new URL("./roadmap-service.mjs", import.meta.url));
    const source = readFileSync(roadmapServicePath, "utf8");
    expect(source).not.toMatch(/pm-adapter/);
  });

  it("mission-command-router.mjs has no static or dynamic import of the pm-adapter package -- roadmap mutation commands route independently of PM export", () => {
    const routerPath = fileURLToPath(new URL("./mission-command-router.mjs", import.meta.url));
    const source = readFileSync(routerPath, "utf8");
    expect(source).not.toMatch(/pm-adapter/);
  });
});
