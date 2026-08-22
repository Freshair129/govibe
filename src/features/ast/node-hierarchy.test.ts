import { describe, expect, it } from "vitest";
import type { MissionSnapshot } from "../../mission";
import { buildNodeHierarchy } from "./node-hierarchy";

type GraphNode = MissionSnapshot["graph"]["nodes"][number];

function node(id: string, label = id): GraphNode {
  return { id, label };
}

describe("buildNodeHierarchy", () => {
  it("returns an empty root with no children for an empty node list", () => {
    const root = buildNodeHierarchy([]);
    expect(root.children).toEqual([]);
    expect(root.leaves).toEqual([]);
    expect(root.totalCount).toBe(0);
  });

  it("nests directory and file ids by path segment", () => {
    const root = buildNodeHierarchy([
      node("directory:src/features"),
      node("file:src/features/ast/AstTreeView.tsx", "AstTreeView.tsx"),
    ]);

    const src = root.children.find((c) => c.name === "src");
    expect(src?.kind).toBe("directory");
    const features = src?.children.find((c) => c.name === "features");
    expect(features?.kind).toBe("directory");
    const ast = features?.children.find((c) => c.name === "ast");
    const file = ast?.children.find((c) => c.name === "AstTreeView.tsx");
    expect(file?.kind).toBe("file");
    expect(file?.path).toBe("src/features/ast/AstTreeView.tsx");
  });

  it("attaches a file-scoped symbol as a leaf under its file, not as a sibling path segment", () => {
    const root = buildNodeHierarchy([
      node("symbol:src/mission.ts:3509", "missionGateway"),
    ]);

    const src = root.children.find((c) => c.name === "src");
    const file = src?.children.find((c) => c.name === "mission.ts");
    expect(file?.kind).toBe("file");
    expect(file?.leaves).toEqual([{ id: "symbol:src/mission.ts:3509", label: "missionGateway", kind: "symbol", suffix: "3509" }]);
  });

  it("groups multiple file-scoped kinds (symbol, route, orm) under the same file without duplicating the file node", () => {
    const root = buildNodeHierarchy([
      node("symbol:src/api.ts:10", "handler"),
      node("route:src/api.ts:40", "get"),
      node("orm:src/api.ts:0", "User"),
    ]);

    const src = root.children.find((c) => c.name === "src");
    expect(src?.children).toHaveLength(1);
    const file = src?.children[0];
    expect(file?.name).toBe("api.ts");
    expect(file?.leaves).toHaveLength(3);
    expect(file?.leaves.map((l) => l.kind).sort()).toEqual(["orm", "route", "symbol"]);
  });

  it("buckets tool: nodes separately since their id is not path-shaped", () => {
    const root = buildNodeHierarchy([node("tool:govibe.workspace.impact")]);
    const bucket = root.children.find((c) => c.kind === "bucket");
    expect(bucket).toBeDefined();
    expect(bucket?.leaves).toEqual([{ id: "tool:govibe.workspace.impact", label: "tool:govibe.workspace.impact", kind: "tool", suffix: "govibe.workspace.impact" }]);
  });

  it("skips an id with no recoverable path instead of inventing a location", () => {
    const root = buildNodeHierarchy([node("malformed-id-no-colon")]);
    expect(root.children).toEqual([]);
    expect(root.leaves).toEqual([]);
  });

  it("computes totalCount across nested children and leaves", () => {
    const root = buildNodeHierarchy([
      node("file:a/one.ts", "one.ts"),
      node("symbol:a/one.ts:1", "fnOne"),
      node("symbol:a/one.ts:2", "fnTwo"),
      node("file:a/b/two.ts", "two.ts"),
    ]);

    // a -> one.ts (2 leaves, totalCount=2) and a -> b -> two.ts (0 leaves, totalCount=0)
    // a.totalCount = (one.ts.totalCount=2 + 1) + (b.totalCount=(two.ts.totalCount=0 + 1)=1 + 1) = 3 + 2 = 5
    const a = root.children.find((c) => c.name === "a");
    expect(a?.totalCount).toBe(5);
    expect(root.totalCount).toBe(a!.totalCount + 1);
  });
});
