import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createMetadataStore, MetadataWritePolicyError } from "./metadata-store.mjs";
import { createWorkspaceAdapter, resolveClient } from "./workspace-adapter.mjs";

let root;

async function write(relativePath, content) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "govibe-mode2-adapter-"));
  await write("package.json", JSON.stringify({ name: "fixture", dependencies: { react: "^18.0.0" } }));
  await write("README.md", "# fixture\n");
  await write("CLAUDE.md", "# claude instructions\n");
  await write("src/index.ts", "export const value = 1;\n");
  await write("node_modules/junk/index.js", "module.exports = 1;\n");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("WA-04 unknown clients resolve to the generic adapter", () => {
  it("never rejects an unrecognised client", () => {
    expect(resolveClient("some-future-agent")).toBe("generic");
    expect(resolveClient(undefined)).toBe("generic");
    expect(resolveClient("CLAUDE-CODE")).toBe("claude-code");
  });
});

describe("WA-02 adapters cannot escape the workspace root", () => {
  it("rejects parent traversal and absolute paths", async () => {
    const adapter = createWorkspaceAdapter({ workspaceRoot: root });
    await expect(adapter.read("../outside.txt")).rejects.toThrow(/escapes its root/);
    await expect(adapter.read("/etc/passwd")).rejects.toThrow(/must be relative/);
    await expect(adapter.stat("src/../../outside.txt")).rejects.toThrow(/escapes its root/);
  });
});

describe("WA-03/WA-05 provider neutrality and determinism", () => {
  it("produces byte-identical inventories across every client adapter", async () => {
    const inventories = await Promise.all(
      ["generic", "claude-code", "gemini-cli", "codex"].map(async (client) => {
        const adapter = createWorkspaceAdapter({ client, workspaceRoot: root });
        return JSON.stringify(await adapter.discoverProjectFiles());
      }),
    );
    expect(new Set(inventories).size).toBe(1);
  });

  it("excludes vendored trees from discovery", async () => {
    const adapter = createWorkspaceAdapter({ workspaceRoot: root });
    const { files } = await adapter.discoverProjectFiles();
    expect(files.some((file) => file.path.startsWith("node_modules/"))).toBe(false);
    expect(files.map((file) => file.path)).toEqual([...files.map((file) => file.path)].sort());
  });
});

describe("WA-06 absence is recorded as evidence", () => {
  it("reports missing well-known instruction files rather than omitting them", async () => {
    const adapter = createWorkspaceAdapter({ client: "gemini-cli", workspaceRoot: root });
    const instructions = await adapter.discoverInstructions();
    const gemini = instructions.find((source) => source.path === "GEMINI.md");
    expect(gemini).toBeDefined();
    expect(gemini.exists).toBe(false);
    expect(gemini.sha256).toBeNull();
  });

  it("hashes instruction files that do exist", async () => {
    const adapter = createWorkspaceAdapter({ client: "claude-code", workspaceRoot: root });
    const instructions = await adapter.discoverInstructions();
    const claude = instructions.find((source) => source.path === "CLAUDE.md");
    expect(claude.exists).toBe(true);
    expect(claude.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("adapter search is bounded", () => {
  it("enforces max_results", async () => {
    await write("src/many.ts", Array.from({ length: 50 }, (_, index) => `const marker${index} = 1;`).join("\n"));
    const adapter = createWorkspaceAdapter({ workspaceRoot: root });
    const results = await adapter.search({ pattern: "marker", maxResults: 5 });
    expect(results).toHaveLength(5);
  });

  it("honours the glob filter", async () => {
    const adapter = createWorkspaceAdapter({ workspaceRoot: root });
    const results = await adapter.search({ pattern: "export", glob: "src/**/*.ts" });
    expect(results.every((result) => result.path.startsWith("src/"))).toBe(true);
  });
});

describe("DS-09/WA-01 the metadata store is the only write surface", () => {
  it("refuses every target outside the metadata root", async () => {
    const store = createMetadataStore({ workspaceRoot: root });
    await expect(store.writeJson("../escape.json", {})).rejects.toThrow(MetadataWritePolicyError);
    await expect(store.writeJson("/absolute.json", {})).rejects.toThrow(MetadataWritePolicyError);
    await expect(store.writeJson("scan/../../escape.json", {})).rejects.toThrow(MetadataWritePolicyError);
  });

  it("confines writes to .govibe/mode2", async () => {
    const store = createMetadataStore({ workspaceRoot: root });
    const written = await store.writeJson("scan/example.json", { ok: true });
    expect(path.relative(root, written).replaceAll("\\", "/")).toBe(".govibe/mode2/scan/example.json");
    expect(await store.readJson("scan/example.json")).toEqual({ ok: true });
  });

  it("returns null for a missing file instead of throwing", async () => {
    const store = createMetadataStore({ workspaceRoot: root });
    expect(await store.readJson("scan/absent.json")).toBeNull();
  });

  // `path.isAbsolute` is false for the Windows drive-relative form `C:foo`, and on NTFS such
  // a path writes an alternate data stream rather than the file it appears to name.
  it("rejects drive-relative paths and any colon-bearing segment", async () => {
    const store = createMetadataStore({ workspaceRoot: root });
    await expect(store.writeJson("C:foo", {})).rejects.toThrow(MetadataWritePolicyError);
    await expect(store.writeJson("scan/C:evil", {})).rejects.toThrow(/colon/);
    await expect(store.writeJson("scan/stream:ads", {})).rejects.toThrow(MetadataWritePolicyError);
  });
});

describe("adapters report what they could not read", () => {
  it("records an unreadable directory instead of dropping the subtree", async () => {
    const adapter = createWorkspaceAdapter({ workspaceRoot: root });
    const discovery = await adapter.discoverProjectFiles();
    expect(Array.isArray(discovery.unreadable)).toBe(true);
  });

  it("branches on an error code, not on message text", async () => {
    const adapter = createWorkspaceAdapter({ workspaceRoot: root });
    await expect(adapter.read("../outside.txt")).rejects.toMatchObject({ name: "PathBoundaryError", reason: "escapes_root" });
    await expect(adapter.read("/etc/passwd")).rejects.toMatchObject({ name: "PathBoundaryError", reason: "not_relative" });
  });
});
