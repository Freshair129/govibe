import { afterEach, describe, expect, it } from "vitest";

import { GovibeRuntime } from "./runtime-core.mjs";

const previousEnvSource = process.env.GOVIBE_ROADMAP_SOURCE;

afterEach(() => {
  if (previousEnvSource === undefined) {
    delete process.env.GOVIBE_ROADMAP_SOURCE;
  } else {
    process.env.GOVIBE_ROADMAP_SOURCE = previousEnvSource;
  }
});

describe("GovibeRuntime roadmap source scoring", () => {
  it("discovers masterplan sources while keeping approved sources rankable", async () => {
    delete process.env.GOVIBE_ROADMAP_SOURCE;

    const runtime = new GovibeRuntime();
    await runtime.initialize();
    const sources = await runtime.listRoadmapSources();

    expect(sources.some((source) => source.path === "docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md")).toBe(true);
    expect(sources.some((source) => source.path === "docs/roadmap/ROADMAP-task-scoped-context-injection.md")).toBe(true);
    expect(sources.find((source) => source.active)?.approvalStatus).toBe("approved");
  });

  it("honors GOVIBE_ROADMAP_SOURCE when the selected source is approved", async () => {
    process.env.GOVIBE_ROADMAP_SOURCE = "docs/roadmap/ROADMAP-task-scoped-context-injection.md";

    const runtime = new GovibeRuntime();
    const snapshot = await runtime.initialize();

    expect(snapshot.roadmap?.sourcePath).toBe("docs/roadmap/ROADMAP-task-scoped-context-injection.md");
    expect(snapshot.roadmap?.scoreBreakdown).toContain("env override");
  });
});
