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

  // WP-15 Bounded Scope item 8: retrieval/ now exists (FTS5 + vector + RRF
  // fusion + the retrieval-service façade). It may import db/ and domain/
  // (mirroring transport/'s own allowed set minus contracts/ -- retrieval/
  // has no need to shape/validate wire requests, that stays contracts/'s
  // job) but never contracts/ or transport/. domain/ must still never
  // import retrieval/ -- the belt-and-braces half of this test (previously
  // the only half, when retrieval/ didn't exist yet) stays in force so this
  // fails closed if a future edit violates the layering rule without
  // updating this test.
  it("retrieval/ may only import db/ and domain/ -- never contracts/ or transport/; domain/ never imports retrieval/", () => {
    const retrievalDir = path.join(srcRoot, "retrieval");
    const dbDir = path.join(srcRoot, "db");
    const domainDir = path.join(srcRoot, "domain");
    const contractsDir = path.join(srcRoot, "contracts");
    const transportDir = path.join(srcRoot, "transport");

    expect(existsSync(retrievalDir), "retrieval/ is a WP-15 (Phase 3) concern and must exist now").toBe(true);

    for (const file of collectFiles(retrievalDir)) {
      const specifiers = relativeImportSpecifiers(readFileSync(file, "utf8"));
      for (const specifier of specifiers) {
        const resolved = resolveSpecifier(file, specifier);
        const allowed = isWithin(resolved, dbDir) || isWithin(resolved, domainDir) || isWithin(resolved, retrievalDir);
        expect(allowed, `${file} imports "${specifier}" -- retrieval/ may only import db/, domain/, or retrieval/`).toBe(true);
        expect(isWithin(resolved, contractsDir), `${file} must never import contracts/`).toBe(false);
        expect(isWithin(resolved, transportDir), `${file} must never import transport/`).toBe(false);
      }
    }

    // Belt-and-braces: no domain/ or contracts/ file may import retrieval/,
    // regardless of the above -- this is the invariant that must fail
    // closed even if retrieval/'s own rules above are ever loosened.
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

  // WP-14 AC-06: contracts/vault-scope-guard.mjs backs the new
  // vault_scope_denied enforcement (AC-04). Per WP-14 Bounded Scope item 4's
  // layering decision, contracts/ stays decoupled from
  // domain/vault-registry.mjs -- the actual mount-ownership lookup runs in
  // transport/handlers/vault-handlers.mjs (which is unrestricted in what it
  // may import from domain/), and only the resulting plain boolean crosses
  // into contracts/vault-scope-guard.mjs's assertVaultScope(). The generic
  // "contracts/ may only import domain/ids.mjs, domain/errors.mjs, or other
  // contracts/ files" test above already enforces this for every file under
  // contracts/, including this new one; this test adds an explicit,
  // named assertion so a future edit that widens contracts/'s allowed-
  // imports set (rather than relying solely on the generic sweep) is still
  // caught with a specific, readable failure message.
  it("contracts/vault-scope-guard.mjs exists and does not import domain/vault-registry.mjs directly (WP-14 AC-04/AC-06)", () => {
    const guardFile = path.join(srcRoot, "contracts", "vault-scope-guard.mjs");
    expect(existsSync(guardFile), "contracts/vault-scope-guard.mjs must exist (WP-14 Bounded Scope item 4)").toBe(true);
    const specifiers = relativeImportSpecifiers(readFileSync(guardFile, "utf8"));
    const vaultRegistryFile = path.join(srcRoot, "domain", "vault-registry.mjs");
    for (const specifier of specifiers) {
      const resolved = resolveSpecifier(guardFile, specifier);
      expect(
        resolved,
        "contracts/vault-scope-guard.mjs must never import domain/vault-registry.mjs directly -- it receives the mount-ownership boolean as a plain argument from transport/handlers/*.mjs instead",
      ).not.toBe(vaultRegistryFile);
    }
  });

  // WP-15 Bounded Scope item 8: transport/handlers/memory-handlers.mjs is
  // the first transport/ file to import retrieval/ (retrieval-service.mjs
  // for msp_memory_search, vector.mjs's vectorToBlob for embedding-on-write)
  // -- ADR-027's layering rule already permits this ("{db, domain,
  // retrieval, contracts} <- transport"), this test just widens its allowed
  // set to match.
  it("transport/ may import db/, domain/, retrieval/, contracts/ (and other transport/ files)", () => {
    const transportDir = path.join(srcRoot, "transport");
    const dbDir = path.join(srcRoot, "db");
    const domainDir = path.join(srcRoot, "domain");
    const retrievalDir = path.join(srcRoot, "retrieval");
    const contractsDir = path.join(srcRoot, "contracts");
    for (const file of collectFiles(transportDir)) {
      const specifiers = relativeImportSpecifiers(readFileSync(file, "utf8"));
      for (const specifier of specifiers) {
        const resolved = resolveSpecifier(file, specifier);
        const allowed =
          isWithin(resolved, dbDir) ||
          isWithin(resolved, domainDir) ||
          isWithin(resolved, retrievalDir) ||
          isWithin(resolved, contractsDir) ||
          isWithin(resolved, transportDir);
        expect(
          allowed,
          `${file} imports "${specifier}" -- transport/ may only import db/, domain/, retrieval/, contracts/, or transport/`,
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
