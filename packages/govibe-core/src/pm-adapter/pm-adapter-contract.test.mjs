import { describe, expect, it } from "vitest";
import {
  PROJECTION_STATES,
  isProjectionState,
  PmConnectorUnconfiguredError,
  PmAdapterRegistry,
  observedCandidateFromExternalChange,
} from "./pm-adapter-contract.mjs";

function fakeAdapter({ projectTask, pullObservedChanges } = {}) {
  return {
    projectTask: projectTask ?? (async (taskContainer) => ({
      platform: "fake",
      taskId: taskContainer.id,
      externalId: "fake-1",
      url: "https://fake.example/fake-1",
      backlink: taskContainer.id,
      fieldProjections: [{ field: "title", state: PROJECTION_STATES.FULL, note: "Name" }],
    })),
    pullObservedChanges: pullObservedChanges ?? (async () => []),
  };
}

describe("isProjectionState", () => {
  it("accepts exactly the four documented states", () => {
    expect(isProjectionState("FULL")).toBe(true);
    expect(isProjectionState("APPROXIMATE")).toBe(true);
    expect(isProjectionState("PARTIAL")).toBe(true);
    expect(isProjectionState("UNPROJECTABLE")).toBe(true);
    expect(isProjectionState("full")).toBe(false);
    expect(isProjectionState("MADE_UP")).toBe(false);
  });
});

describe("PmConnectorUnconfiguredError", () => {
  it("carries a stable .code and the platform, mirroring GksProviderUnconfiguredError's fail-closed shape", () => {
    const error = new PmConnectorUnconfiguredError("notion");
    expect(error.code).toBe("pm_connector_unconfigured");
    expect(error.platform).toBe("notion");
    expect(error.name).toBe("PmConnectorUnconfiguredError");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("PmAdapterRegistry", () => {
  it("register() rejects a non-string platform key and an adapter missing projectTask", () => {
    const registry = new PmAdapterRegistry();
    expect(() => registry.register("", fakeAdapter())).toThrow(/non-empty string/);
    expect(() => registry.register("acme", {})).toThrow(/must implement projectTask/);
  });

  it("exportTask() fails closed with pm_connector_unconfigured for an unregistered platform", async () => {
    const registry = new PmAdapterRegistry();
    await expect(registry.exportTask("ghost", { id: "T1" }, { token: "x" })).rejects.toMatchObject({
      code: "pm_connector_unconfigured",
      platform: "ghost",
    });
  });

  it("exportTask() fails closed with pm_connector_unconfigured when no config is supplied, even for a registered platform", async () => {
    const registry = new PmAdapterRegistry();
    registry.register("acme", fakeAdapter());
    await expect(registry.exportTask("acme", { id: "T1" }, undefined)).rejects.toMatchObject({
      code: "pm_connector_unconfigured",
    });
    await expect(registry.exportTask("acme", { id: "T1" }, "not-an-object")).rejects.toMatchObject({
      code: "pm_connector_unconfigured",
    });
  });

  it("exportTask() dispatches generically -- registering a THIRD, never-before-seen platform requires zero changes to exportTask() or any caller (TC-GLS-005 success criterion)", async () => {
    const registry = new PmAdapterRegistry();
    let receivedTaskId = null;
    registry.register("acme-tracker", fakeAdapter({
      projectTask: async (taskContainer, config) => {
        receivedTaskId = taskContainer.id;
        return {
          platform: "acme-tracker",
          taskId: taskContainer.id,
          externalId: `acme-${config.workspace}-1`,
          url: null,
          backlink: taskContainer.id,
          fieldProjections: [{ field: "title", state: PROJECTION_STATES.FULL, note: "name" }],
        };
      },
    }));

    const result = await registry.exportTask("acme-tracker", { id: "T-99", title: "Ship it" }, { workspace: "team-a" });
    expect(receivedTaskId).toBe("T-99");
    expect(result.externalId).toBe("acme-team-a-1");
    expect(registry.platforms()).toContain("acme-tracker");
  });

  it("exportTask() rejects an adapter result carrying an invalid projection state, rather than passing it through", async () => {
    const registry = new PmAdapterRegistry();
    registry.register("broken", fakeAdapter({
      projectTask: async (taskContainer) => ({
        platform: "broken", taskId: taskContainer.id, externalId: "x", url: null, backlink: taskContainer.id,
        fieldProjections: [{ field: "title", state: "MOSTLY_FINE" }],
      }),
    }));
    await expect(registry.exportTask("broken", { id: "T1" }, { token: "x" })).rejects.toThrow(/invalid projection state/);
  });

  it("pullObserved() fails closed for an unregistered platform, missing config, and an adapter lacking pullObservedChanges", async () => {
    const registry = new PmAdapterRegistry();
    registry.register("no-pull", { projectTask: async () => ({}) });
    registry.register("acme", fakeAdapter());

    await expect(registry.pullObserved("ghost", { token: "x" })).rejects.toMatchObject({ code: "pm_connector_unconfigured" });
    await expect(registry.pullObserved("acme", undefined)).rejects.toMatchObject({ code: "pm_connector_unconfigured" });
    await expect(registry.pullObserved("no-pull", { token: "x" })).rejects.toThrow(/must implement pullObservedChanges/);
  });

  it("pullObserved() forwards to a registered adapter's pullObservedChanges", async () => {
    const registry = new PmAdapterRegistry();
    registry.register("acme", fakeAdapter({ pullObservedChanges: async (config) => [{ taskId: "T1", field: "state", externalValue: "Done", config }] }));
    const changes = await registry.pullObserved("acme", { token: "x" });
    expect(changes).toHaveLength(1);
    expect(changes[0].taskId).toBe("T1");
  });
});

describe("observedCandidateFromExternalChange", () => {
  it("requires platform, taskId, and field", () => {
    expect(() => observedCandidateFromExternalChange({ taskId: "T1", field: "state" })).toThrow(/requires platform/);
    expect(() => observedCandidateFromExternalChange({ platform: "notion", field: "state" })).toThrow(/requires platform/);
    expect(() => observedCandidateFromExternalChange({ platform: "notion", taskId: "T1" })).toThrow(/requires platform/);
  });

  it("produces a reviewable candidate, never a canonical mutation shape -- reviewState is always 'pending'", () => {
    const candidate = observedCandidateFromExternalChange({
      platform: "notion", externalId: "page-1", taskId: "T1", field: "state", externalValue: "Done", observedAt: "2026-08-17T00:00:00.000Z",
    });
    expect(candidate).toEqual({
      kind: "pm_observed_update_candidate",
      platform: "notion",
      externalId: "page-1",
      taskId: "T1",
      field: "state",
      externalValue: "Done",
      observedAt: "2026-08-17T00:00:00.000Z",
      reviewState: "pending",
    });
  });

  it("defaults externalId to null and observedAt to now when omitted", () => {
    const candidate = observedCandidateFromExternalChange({ platform: "jira", taskId: "T1", field: "state", externalValue: "Done" });
    expect(candidate.externalId).toBeNull();
    expect(typeof candidate.observedAt).toBe("string");
    expect(new Date(candidate.observedAt).toString()).not.toBe("Invalid Date");
  });
});
