// AC-06 (WP-12) / AC-07 (WP-13): mirrors
// scripts/mcp/runtime/dependency-boundaries.test.mjs's regex-extraction
// technique to enforce ADR-027 / SDD §3's layering for the modules that
// exist in this packet:
//   db <- domain <- retrieval, domain <- contracts,
//   {db, domain, retrieval, contracts} <- transport.
//   domain never imports retrieval or contracts.
// WP-13 Phase 2 adds contracts/: it may import domain/ids.mjs,
// domain/errors.mjs, or other contracts/ files ONLY -- never
// domain/entity-store.mjs or domain/vault-registry.mjs directly (those are
// called from transport/handlers/*, contracts/ only shapes/validates
// responses). retrieval/ remains a Phase 3 concern and must not exist yet;
// this test asserts that two ways: (1) retrieval/ must not exist yet in
// this phase, and (2) even if that first assertion is ever loosened, no
// domain/ or contracts/ file may import from it -- this test must fail
// closed if a future edit violates the layering rule without updating this
// test.
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

  it("retrieval/ does not exist yet (Phase 3 exclusion); fails closed if added without updating this test", () => {
    const retrievalDir = path.join(srcRoot, "retrieval");

    expect(existsSync(retrievalDir), "retrieval/ is a Phase 3 concern and must not exist yet").toBe(false);

    // Belt-and-braces: even if retrieval/ appears in a future edit without
    // this test being updated, no domain/ or contracts/ file may import it.
    const domainDir = path.join(srcRoot, "domain");
    const contractsDir = path.join(srcRoot, "contracts");
    for (const file of [...collectFiles(domainDir), ...collectFiles(contractsDir)]) {
      const specifiers = relativeImportSpecifiers(readFileSync(file, "utf8"));
      for (const specifier of specifiers) {
        const resolved = resolveSpecifier(file, specifier);
        expect(isWithin(resolved, retrievalDir), `${file} must never import retrieval/`).toBe(false);
      }
    }
  });

  // WP-13 AC-07 / Bounded Scope item 7: contracts/ may import
  // domain/ids.mjs and domain/errors.mjs ONLY -- never
  // domain/entity-store.mjs or domain/vault-registry.mjs directly (those
  // are called from transport/handlers/*; contracts/ only shapes/validates
  // responses), and never transport/ or retrieval/. Imports of other
  // contracts/ files are allowed.
  it("contracts/ may only import domain/ids.mjs, domain/errors.mjs, or other contracts/ files", () => {
    const contractsDir = path.join(srcRoot, "contracts");
    const domainDir = path.join(srcRoot, "domain");
    const allowedDomainFiles = new Set([path.join(domainDir, "ids.mjs"), path.join(domainDir, "errors.mjs")]);

    for (const file of collectFiles(contractsDir)) {
      const specifiers = relativeImportSpecifiers(readFileSync(file, "utf8"));
      for (const specifier of specifiers) {
        const resolved = resolveSpecifier(file, specifier);
        const allowed = isWithin(resolved, contractsDir) || allowedDomainFiles.has(resolved);
        expect(
          allowed,
          `${file} imports "${specifier}" -- contracts/ may only import domain/ids.mjs, domain/errors.mjs, or other contracts/ files`,
        ).toBe(true);
        if (isWithin(resolved, domainDir)) {
          expect(allowedDomainFiles.has(resolved), `${file} imports "${specifier}" -- contracts/ must never import domain/entity-store.mjs or domain/vault-registry.mjs directly`).toBe(true);
        }
      }
    }
  });

  it("transport/ may import db/, domain/, contracts/ (and other transport/ files)", () => {
    const transportDir = path.join(srcRoot, "transport");
    const dbDir = path.join(srcRoot, "db");
    const domainDir = path.join(srcRoot, "domain");
    const contractsDir = path.join(srcRoot, "contracts");
    for (const file of collectFiles(transportDir)) {
      const specifiers = relativeImportSpecifiers(readFileSync(file, "utf8"));
      for (const specifier of specifiers) {
        const resolved = resolveSpecifier(file, specifier);
        const allowed =
          isWithin(resolved, dbDir) ||
          isWithin(resolved, domainDir) ||
          isWithin(resolved, contractsDir) ||
          isWithin(resolved, transportDir);
        expect(
          allowed,
          `${file} imports "${specifier}" -- transport/ may only import db/, domain/, contracts/, or transport/`,
        ).toBe(true);
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

  it("contains no import cycles among contracts/ modules", () => {
    const contractsDir = path.join(srcRoot, "contracts");
    const files = collectFiles(contractsDir);
    const graph = new Map();
    for (const file of files) {
      const specifiers = relativeImportSpecifiers(readFileSync(file, "utf8")).filter((specifier) =>
        isWithin(resolveSpecifier(file, specifier), contractsDir),
      );
      graph.set(
        file,
        specifiers.map((specifier) => resolveSpecifier(file, specifier)),
      );
    }
    const visiting = new Set();
    const visited = new Set();
    function visit(file) {
      if (visiting.has(file)) throw new Error(`contracts/ import cycle detected at ${file}`);
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
