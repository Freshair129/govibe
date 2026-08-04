// AC-06: mirrors scripts/mcp/runtime/dependency-boundaries.test.mjs's
// regex-extraction technique to enforce ADR-027 / SDD §3's layering for the
// modules that exist in this packet:
//   db <- domain <- retrieval, domain <- contracts,
//   {db, domain, retrieval, contracts} <- transport.
//   domain never imports retrieval or contracts.
// retrieval/ and contracts/ are not implemented until later phases, so this
// asserts the rule two ways: (1) those directories must not exist yet in
// this phase, and (2) even if that first assertion is ever loosened, no
// domain/ file may import from them -- this test must fail closed if a
// future edit violates the layering rule without updating this test.
//
// server.mjs (composition root) is intentionally excluded, mirroring how
// runtime-core.mjs/sidecar-server.mjs/govibe-mcp-server.mjs are excluded
// from the original scripts/mcp/runtime/dependency-boundaries.test.mjs.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, "..", "src");

function collectFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else if (entry.name.endsWith(".mjs") && !entry.name.endsWith(".test.mjs")) out.push(full);
  }
  return out;
}

function relativeImportSpecifiers(source) {
  return [...source.matchAll(/from\s+["'](.+?)["']/g)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith("."));
}

function resolveSpecifier(file, specifier) {
  return path.resolve(path.dirname(file), specifier);
}

function isWithin(resolvedPath, dir) {
  const normalizedDir = path.join(dir, path.sep);
  return resolvedPath === dir || (resolvedPath + path.sep).startsWith(normalizedDir);
}

describe("packages/msp-runtime dependency boundaries (AC-06)", () => {
  it("db/ has no internal (relative) imports of other src/ modules", () => {
    const dbDir = path.join(srcRoot, "db");
    for (const file of collectFiles(dbDir)) {
      const specifiers = relativeImportSpecifiers(readFileSync(file, "utf8"));
      expect(specifiers, `${file} must not import any other src/ module`).toEqual([]);
    }
  });

  it("domain/ may only import db/ and other domain/ files -- never retrieval/ or contracts/", () => {
    const domainDir = path.join(srcRoot, "domain");
    const dbDir = path.join(srcRoot, "db");
    for (const file of collectFiles(domainDir)) {
      const specifiers = relativeImportSpecifiers(readFileSync(file, "utf8"));
      for (const specifier of specifiers) {
        const resolved = resolveSpecifier(file, specifier);
        const allowed = isWithin(resolved, dbDir) || isWithin(resolved, domainDir);
        expect(allowed, `${file} imports "${specifier}" -- domain/ may only import db/ or domain/`).toBe(true);
      }
    }
  });

  it("retrieval/ and contracts/ do not exist yet in Phase 0/1 (WP-12 exclusion); fails closed if added without updating this test", () => {
    const retrievalDir = path.join(srcRoot, "retrieval");
    const contractsDir = path.join(srcRoot, "contracts");

    expect(existsSync(retrievalDir), "retrieval/ is a Phase 3 concern and must not exist yet").toBe(false);
    expect(existsSync(contractsDir), "contracts/ is a Phase 2 concern and must not exist yet").toBe(false);

    // Belt-and-braces: even if retrieval/ or contracts/ appear in a future
    // edit without this test being updated, no domain/ file may import them.
    const domainDir = path.join(srcRoot, "domain");
    for (const file of collectFiles(domainDir)) {
      const specifiers = relativeImportSpecifiers(readFileSync(file, "utf8"));
      for (const specifier of specifiers) {
        const resolved = resolveSpecifier(file, specifier);
        expect(isWithin(resolved, retrievalDir), `${file} must never import retrieval/`).toBe(false);
        expect(isWithin(resolved, contractsDir), `${file} must never import contracts/`).toBe(false);
      }
    }
  });

  it("transport/ may import db/ and domain/ (and other transport/ files)", () => {
    const transportDir = path.join(srcRoot, "transport");
    const dbDir = path.join(srcRoot, "db");
    const domainDir = path.join(srcRoot, "domain");
    for (const file of collectFiles(transportDir)) {
      const specifiers = relativeImportSpecifiers(readFileSync(file, "utf8"));
      for (const specifier of specifiers) {
        const resolved = resolveSpecifier(file, specifier);
        const allowed = isWithin(resolved, dbDir) || isWithin(resolved, domainDir) || isWithin(resolved, transportDir);
        expect(allowed, `${file} imports "${specifier}" -- transport/ may only import db/, domain/, or transport/`).toBe(
          true,
        );
      }
    }
  });

  it("server.mjs (composition root) exists and is excluded from this layering test, mirroring runtime-core.mjs/sidecar-server.mjs/govibe-mcp-server.mjs's exclusion", () => {
    const serverFile = path.join(srcRoot, "server.mjs");
    expect(existsSync(serverFile)).toBe(true);
    // No assertion on server.mjs's own imports: as the composition root it is
    // allowed to import every layer (db/, domain/, transport/), exactly like
    // the excluded modules in scripts/mcp/runtime/dependency-boundaries.test.mjs.
  });

  it("contains no import cycles among domain/ modules", () => {
    const domainDir = path.join(srcRoot, "domain");
    const files = collectFiles(domainDir);
    const graph = new Map();
    for (const file of files) {
      const specifiers = relativeImportSpecifiers(readFileSync(file, "utf8")).filter((specifier) =>
        isWithin(resolveSpecifier(file, specifier), domainDir),
      );
      graph.set(
        file,
        specifiers.map((specifier) => resolveSpecifier(file, specifier)),
      );
    }
    const visiting = new Set();
    const visited = new Set();
    function visit(file) {
      if (visiting.has(file)) throw new Error(`domain/ import cycle detected at ${file}`);
      if (visited.has(file)) return;
      visiting.add(file);
      for (const dependency of graph.get(file) ?? []) visit(dependency);
      visiting.delete(file);
      visited.add(file);
    }
    expect(() => {
      for (const file of files) visit(file);
    }).not.toThrow();
  });
});
