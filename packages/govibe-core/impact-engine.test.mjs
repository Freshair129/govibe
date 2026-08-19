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

describe("impact engine analysis boundary", () => {
  it("indexes the whole workspace when nothing is excluded", async () => {
    const root = await fixture();
    const result = await calculateWorkspaceImpact({ workspacePath: root, paths: ["docs/ARCH.md"] });
    expect(result.boundary.excluded).toEqual([]);
  });

  // `git worktree add` writes a `.git` FILE (a gitdir pointer), not a directory, so the walker's
  // `.git` directory-name exclusion never fires for one and it would otherwise index a complete
  // second copy of the tree as if those files governed this workspace.
  it("excludes a nested git worktree whose .git marker is a file", async () => {
    const root = await fixture();
    const nested = path.join(root, "worktrees", "feature-branch");
    await mkdir(path.join(nested, "docs"), { recursive: true });
    await writeFile(path.join(nested, ".git"), "gitdir: ../../.git/worktrees/feature-branch\n");
    await writeFile(path.join(nested, "docs", "ARCH.md"), "---\ndoc_id: ARCH-ROOT-COPY\n---\n# Architecture copy\n");
    await writeFile(path.join(nested, "docs", "API.md"), "---\ndoc_id: API-COPY\n---\nSee [[ARCH-ROOT-COPY]].\n");

    const graph = await buildLinkGraph(root);
    expect(graph.nodes.some((node) => node.path.startsWith("worktrees/"))).toBe(false);
    expect(graph.excluded).toContainEqual({ path: "worktrees/feature-branch", reason: "nested_git_checkout" });
  });

  it("excludes a nested checkout whose .git marker is a directory", async () => {
    const root = await fixture();
    const nested = path.join(root, "vendor", "submodule");
    await mkdir(path.join(nested, ".git"), { recursive: true });
    await writeFile(path.join(nested, "README.md"), "# vendored\n");

    const graph = await buildLinkGraph(root);
    expect(graph.nodes.some((node) => node.path.startsWith("vendor/"))).toBe(false);
    expect(graph.excluded).toContainEqual({ path: "vendor/submodule", reason: "nested_git_checkout" });
  });

  it("excludes scratch directories at the workspace root and reports each one", async () => {
    const root = await fixture();
    for (const scratch of [".agents", ".brain", ".claude", "benchmark_results", "ref", "state"]) {
      await mkdir(path.join(root, scratch), { recursive: true });
      await writeFile(path.join(root, scratch, "NOTE.md"), "---\ndoc_id: SCRATCH\n---\n# scratch\n");
    }

    const graph = await buildLinkGraph(root);
    expect(graph.nodes.some((node) => node.path.includes("NOTE.md"))).toBe(false);
    expect(graph.excluded.map((item) => item.path)).toEqual([".agents", ".brain", ".claude", "benchmark_results", "ref", "state"]);
    expect(new Set(graph.excluded.map((item) => item.reason))).toEqual(new Set(["scratch_directory"]));
  });

  // The scratch names are matched against immediate children of the workspace root only. A source
  // directory that merely shares a name with one of them is governed workspace code and must stay
  // in the graph.
  it("keeps a nested directory that only shares a scratch name", async () => {
    const root = await fixture();
    await mkdir(path.join(root, "src", "state"), { recursive: true });
    await writeFile(path.join(root, "src", "state", "store.mjs"), "import '../runtime.mjs';\n");

    const graph = await buildLinkGraph(root);
    expect(graph.nodes.some((node) => node.path === "src/state/store.mjs")).toBe(true);
    expect(graph.excluded).toEqual([]);
  });

  it("reports the boundary through calculateWorkspaceImpact so a caller can see what was left out", async () => {
    const root = await fixture();
    await mkdir(path.join(root, "state"), { recursive: true });
    await writeFile(path.join(root, "state", "run.md"), "---\ndoc_id: RUN\n---\n[[ARCH-ROOT]]\n");

    const result = await calculateWorkspaceImpact({ workspacePath: root, paths: ["docs/ARCH.md"], minimumScore: 0.01 });
    expect(result.boundary.excluded).toContainEqual({ path: "state", reason: "scratch_directory" });
    expect(result.affected.some((item) => item.path.startsWith("state/"))).toBe(false);
  });
});
