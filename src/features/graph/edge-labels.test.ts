import { describe, expect, it } from "vitest";
import type { MissionSnapshot } from "../../mission";
import { resolveEdgeLabels } from "./edge-labels";

type GraphNode = MissionSnapshot["graph"]["nodes"][number];
type GraphEdge = MissionSnapshot["graph"]["edges"][number];

function node(id: string, label: string): GraphNode {
  return { id, label };
}

function edge(source: string, target: string): GraphEdge {
  return { source, target };
}

describe("resolveEdgeLabels", () => {
  it("resolves both endpoints to their node labels when both nodes are present", () => {
    const nodes = [node("markdown:docs/assurance/audit/AUDIT-x.md", "AUDIT-x.md"), node("markdown:docs/adr/ADR-021.md", "ADR-021.md")];
    const edges = [edge("markdown:docs/assurance/audit/AUDIT-x.md", "markdown:docs/adr/ADR-021.md")];

    const [resolved] = resolveEdgeLabels(nodes, edges);
    expect(resolved.sourceLabel).toBe("AUDIT-x.md");
    expect(resolved.targetLabel).toBe("ADR-021.md");
    expect(resolved.sourceResolved).toBe(true);
    expect(resolved.targetResolved).toBe(true);
  });

  it("falls back to the raw id and flags unresolved when an endpoint has no matching node", () => {
    const nodes = [node("symbol:a.ts:1", "fnA")];
    const edges = [edge("symbol:a.ts:1", "symbol:missing.ts:99")];

    const [resolved] = resolveEdgeLabels(nodes, edges);
    expect(resolved.sourceLabel).toBe("fnA");
    expect(resolved.sourceResolved).toBe(true);
    expect(resolved.targetLabel).toBe("symbol:missing.ts:99");
    expect(resolved.targetResolved).toBe(false);
  });

  it("flags both endpoints unresolved when neither node is present", () => {
    const [resolved] = resolveEdgeLabels([], [edge("a", "b")]);
    expect(resolved.sourceLabel).toBe("a");
    expect(resolved.targetLabel).toBe("b");
    expect(resolved.sourceResolved).toBe(false);
    expect(resolved.targetResolved).toBe(false);
  });

  it("returns an empty array for an empty edge list", () => {
    expect(resolveEdgeLabels([node("a", "A")], [])).toEqual([]);
  });

  it("produces a distinct key per edge even when source/target ids repeat", () => {
    const edges = [edge("a", "b"), edge("a", "b")];
    const resolved = resolveEdgeLabels([], edges);
    expect(resolved).toHaveLength(2);
    expect(new Set(resolved.map((r) => r.key)).size).toBe(2);
  });
});
