import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const runtimeRoot = path.resolve("scripts/mcp/runtime");

async function modules() {
  return (await readdir(runtimeRoot)).filter((name) => name.endsWith(".mjs") && !name.endsWith(".test.mjs"));
}

function imports(source) {
  return [...source.matchAll(/from\s+["'](.+?)["']/g)].map((match) => match[1]);
}

describe("runtime dependency direction", () => {
  it("prevents services from importing composition roots or transports", async () => {
    for (const name of await modules()) {
      const specifiers = imports(await readFile(path.join(runtimeRoot, name), "utf8"));
      expect(specifiers.some((value) => /runtime-core|sidecar-server|govibe-mcp-server/.test(value)), name).toBe(false);
    }
  });

  it("contains no cycles among runtime services", async () => {
    const names = await modules();
    const graph = new Map();
    for (const name of names) {
      const source = await readFile(path.join(runtimeRoot, name), "utf8");
      graph.set(name, imports(source).filter((value) => value.startsWith("./")).map((value) => path.basename(value)));
    }
    const visiting = new Set(); const visited = new Set();
    function visit(name) {
      if (visiting.has(name)) throw new Error(`Runtime service dependency cycle at ${name}`);
      if (visited.has(name)) return;
      visiting.add(name); for (const dependency of graph.get(name) ?? []) visit(dependency); visiting.delete(name); visited.add(name);
    }
    for (const name of names) visit(name);
  });
});
