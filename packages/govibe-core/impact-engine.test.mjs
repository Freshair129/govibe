import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildLinkGraph, calculateWorkspaceImpact } from "./src/impact/impact-engine.mjs";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "govibe-impact-"));
  await mkdir(path.join(root, "docs", "api"), { recursive: true });
  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "tests"), { recursive: true });
  await writeFile(path.join(root, "docs", "ARCH.md"), "---\ndoc_id: ARCH-ROOT\n---\n# Architecture\n");
  await writeFile(path.join(root, "docs", "api", "API.md"), "---\ndoc_id: API-ROOT\nrelated_docs:\n  - \"docs/ARCH.md\"\n---\n# API\nSee [[ARCH-ROOT]].\n");
  await writeFile(path.join(root, "src", "runtime.mjs"), "import contract from '../docs/api/API.md';\nexport default contract;\n");
  await writeFile(path.join(root, "tests", "runtime.test.js"), "import '../src/runtime.mjs';\n");
  return root;
}

describe("impact engine", () => {
  it("materializes backlinks for wikilinks, related docs, and imports", async () => {
    const root = await fixture();
    const graph = await buildLinkGraph(root);
    expect(graph.backlinks["docs/ARCH.md"].some((item) => item.source === "docs/api/API.md")).toBe(true);
    expect(graph.backlinks["docs/api/API.md"].some((item) => item.source === "src/runtime.mjs" && item.relation === "imports")).toBe(true);
  });

  it("traverses direct and transitive reverse dependencies with explanations", async () => {
    const root = await fixture();
    const result = await calculateWorkspaceImpact({
      workspacePath: root,
      paths: ["docs/ARCH.md"],
      changeType: "authority_boundary_change",
      maxDistance: 3,
      minimumScore: 0.1,
    });
    const api = result.affected.find((item) => item.path === "docs/api/API.md");
    const runtime = result.affected.find((item) => item.path === "src/runtime.mjs");
    const test = result.affected.find((item) => item.path === "tests/runtime.test.js");
    expect(api.distance).toBe(1);
    expect(runtime.distance).toBe(2);
    expect(test.distance).toBe(3);
    expect(runtime.reason).toContain("imports");
    expect(result.references).toContain("src/runtime.mjs");
  });

  it("handles cycles without duplicate impact records", async () => {
    const root = await fixture();
    await writeFile(path.join(root, "docs", "ARCH.md"), "# Architecture\n[API](api/API.md)\n");
    const result = await calculateWorkspaceImpact({ workspacePath: root, paths: ["docs/ARCH.md"], maxDistance: 8, minimumScore: 0.01 });
    expect(new Set(result.affected.map((item) => item.path)).size).toBe(result.affected.length);
  });
});
