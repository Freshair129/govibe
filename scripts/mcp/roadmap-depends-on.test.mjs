import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderRoadmapMarkdown } from "./roadmap-exporter.mjs";
import { parseRoadmapSource } from "./roadmap-parser.mjs";
import { buildDag } from "./dag.mjs";

// Guards the new dependency edge end-to-end: the exporter must emit a "Depends On" column,
// the parser must read it back into node.dependsOn, and the DAG must form the right ordering.
describe("dependsOn round-trips through export -> parse -> DAG", () => {
  it("preserves the Depends On column and forms a dependency level", async () => {
    const roadmap = {
      sourcePath: "docs/roadmap/ROADMAP-dep.md",
      sourceVersion: "0.1.0",
      approvalStatus: "approved",
      nodes: [
        { id: "RM-DEP", type: "roadmap", title: "Dep Roadmap", state: "planned", progress: 0 },
        { id: "TASK-A", parentId: "RM-DEP", type: "task", title: "Task A", state: "done", progress: 100 },
        {
          id: "TASK-B",
          parentId: "RM-DEP",
          type: "task",
          title: "Task B",
          state: "planned",
          progress: 0,
          dependsOn: ["TASK-A"],
        },
      ],
      assignments: [],
      handoffs: [],
      verifications: [],
    };

    const dir = await mkdtemp(path.join(tmpdir(), "govibe-dep-"));
    const file = path.join(dir, "ROADMAP-dep.md");
    try {
      await writeFile(file, renderRoadmapMarkdown(roadmap, { generatedAt: "2026-06-21T00:00:00.000Z" }), "utf8");

      const parsed = await parseRoadmapSource(file);
      const taskB = parsed.nodes.find((node) => node.id === "TASK-B");
      expect(taskB?.dependsOn).toEqual(["TASK-A"]);

      const dag = buildDag(parsed.nodes, { actionableTypes: new Set(["task"]) });
      // TASK-A is done, so its dependent TASK-B becomes ready, and the edge survives the round-trip.
      expect(dag.ready).toContain("TASK-B");
      expect(dag.edges).toContainEqual({ source: "TASK-A", target: "TASK-B", kind: "depends_on" });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
