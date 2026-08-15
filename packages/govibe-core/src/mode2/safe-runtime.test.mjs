import path from "node:path";
import { describe, expect, it } from "vitest";

import { createMetadataStore, MetadataWritePolicyError, MODE2_METADATA_ROOT } from "./metadata-store.mjs";
import { MODE2_STAGES, MODE2_STAGE_RUN_SCHEMA, validateMode2StageRun } from "./stage-contract.mjs";
import { createMode2Stages } from "./stages.mjs";
import { resolveClient, WORKSPACE_CLIENTS } from "./workspace-adapter.mjs";

describe("Mode 2 governance-safe runtime foundation", () => {
  it("keeps the semantic stage axis additive and exactly twelve stages", () => {
    expect(MODE2_STAGES).toHaveLength(12);
    const stages = createMode2Stages();
    expect(stages).toHaveLength(12);
    expect(stages.map((stage) => stage.name)).toEqual(MODE2_STAGES);
    expect(stages.map((stage) => stage.stage)).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
  });

  it("validates stage records without introducing a finalization stage", () => {
    const record = {
      schema: MODE2_STAGE_RUN_SCHEMA,
      runId: "fixture",
      stage: 12,
      name: MODE2_STAGES[11],
      status: "complete",
      method: "deterministic-static-analysis",
      extractorVersion: "test/v1",
      confidence: 1,
      exclusions: [],
      unresolved: [],
    };
    expect(validateMode2StageRun(record)).toBe(record);
    expect(() => validateMode2StageRun({ ...record, stage: 13, name: "Finalization" })).toThrow(/out of range/i);
  });

  it("defaults unknown clients to the generic adapter profile", () => {
    expect(resolveClient("not-a-real-client")).toBe("generic");
    expect(WORKSPACE_CLIENTS.generic).toBeDefined();
  });

  it("keeps every write target under the disposable Mode 2 metadata root", () => {
    const root = path.resolve("/tmp/govibe-mode2-safe-runtime");
    const store = createMetadataStore({ workspaceRoot: root });
    expect(store.metadataRootRelative).toBe(MODE2_METADATA_ROOT);
    expect(store.resolve("scan/latest.json")).toBe(path.join(root, ".govibe", "mode2", "scan", "latest.json"));
    expect(() => store.resolve("../escape.json")).toThrow(MetadataWritePolicyError);
    expect(() => store.resolve("C:escape.json")).toThrow(MetadataWritePolicyError);
    expect(() => store.resolve("/absolute.json")).toThrow(MetadataWritePolicyError);
  });
});
