import { describe, expect, it } from "vitest";
import type { MissionSnapshot } from "../../mission";
import { selectSchemaSymbols } from "./schema-symbols";

// TASK-PRD-007 defect 1: DatabaseErdView must render only genuine schema entities (Stage 8
// ORM model discoveries), never TypeScript functions/classes/interfaces (Stage 5) dressed up as
// database tables. There is no React-render harness in this repo (no @testing-library/react,
// and vitest.config.ts only collects src/**/*.test.ts, not .tsx) -- so this tests the pure
// filtering logic DatabaseErdView delegates to, following the pattern already used by
// src/features/canvas/canvas-graph.test.ts.
function symbol(overrides: Partial<MissionSnapshot["symbols"][number]> & { name: string; kind: string }): MissionSnapshot["symbols"][number] {
  return { path: "src/example.ts", ...overrides };
}

describe("selectSchemaSymbols", () => {
  it("returns an empty set when symbols contains only non-schema kinds", () => {
    const symbols = [
      symbol({ name: "runDeepScan", kind: "function" }),
      symbol({ name: "WorkspaceService", kind: "class" }),
      symbol({ name: "MissionSnapshot", kind: "interface" }),
    ];
    expect(selectSchemaSymbols(symbols)).toEqual([]);
  });

  it("keeps only orm-model entries when schema-kind symbols are present alongside TypeScript symbols", () => {
    const ormModel = symbol({ name: "User", kind: "orm-model", path: "src/schema/user.ts" });
    const symbols = [
      symbol({ name: "runDeepScan", kind: "function" }),
      ormModel,
      symbol({ name: "WorkspaceService", kind: "class" }),
    ];
    expect(selectSchemaSymbols(symbols)).toEqual([ormModel]);
  });

  it("does not classify TypeScript symbol kinds as schema kinds", () => {
    for (const kind of ["function", "class", "interface", "type", "method"]) {
      expect(selectSchemaSymbols([symbol({ name: "x", kind })])).toEqual([]);
    }
  });
});
