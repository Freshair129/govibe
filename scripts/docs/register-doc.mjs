// Deterministic doc registrar — operationalizes ADR-007 (Deterministic Governance).
// Appends canonical docs to docs/DOC-VERSION-REGISTRY.md from their own frontmatter,
// idempotently, then runs docs:validate as the governance gate. NO hand-editing.
//
//   node scripts/docs/register-doc.mjs <file.md> [<file2.md> ...]
//
// Rules:
//  - doc_id is read from frontmatter (the file is the source of truth); it must be
//    canonical UPPER `TYPE-SLUG` (ADR keeps `ADR-NNN-slug`). Non-canonical → rejected.
//  - A row is appended under "## 8. Auto-Registered" (created if missing) so the
//    hand-curated sections (2-7) are never disturbed. The validator still governs it.
//  - Duplicate doc_id anywhere in the registry → skipped (idempotent).

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

const repoRoot = process.cwd();
const registryPath = resolve(repoRoot, "docs/DOC-VERSION-REGISTRY.md");
const AUTO_HEADING = "## 8. Auto-Registered (script: docs:register)";
const TABLE_HEADER = "| Group | Doc ID | Version | Status | Owner | Path |\n|---|---|---|---|---|---|";
const CANONICAL_ID = /^[A-Z][A-Z0-9]*(?:-{1,2}[A-Za-z0-9]+)+$/; // UPPER TYPE prefix; slug may be mixed-case or use `--` (ADR-012-lower / CONCEPT--X / PRD-UPPER all ok)

function parseFrontmatter(content) {
  const m = content.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const f = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!f) continue;
    data[f[1]] = f[2].trim().replace(/^["']|["']$/g, "");
  }
  return data;
}

function repoPath(p) {
  return relative(repoRoot, resolve(repoRoot, p)).replace(/\\/g, "/");
}

function rowFor(fm, path) {
  const group = String(fm.type || path.split("/").pop().split("-")[0]).toUpperCase();
  return `| ${group} | \`${fm.doc_id}\` | \`${fm.version || "n/a"}\` | ${fm.status || "draft"} | ${fm.owner || "-"} | \`${path}\` |`;
}

function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("usage: node scripts/docs/register-doc.mjs <file.md> [...]");
    process.exit(1);
  }
  if (!existsSync(registryPath)) {
    console.error(`Registry not found: ${registryPath}`);
    process.exit(1);
  }

  let registry = readFileSync(registryPath, "utf8");
  const added = [];
  const skipped = [];
  const rejected = [];

  for (const file of files) {
    const abs = resolve(repoRoot, file);
    if (!existsSync(abs) || !statSync(abs).isFile()) { rejected.push(`${file}: not a file`); continue; }
    const fm = parseFrontmatter(readFileSync(abs, "utf8"));
    if (!fm?.doc_id) { rejected.push(`${file}: missing frontmatter doc_id`); continue; }
    if (!CANONICAL_ID.test(fm.doc_id)) { rejected.push(`${file}: non-canonical doc_id "${fm.doc_id}" (need UPPER TYPE-SLUG)`); continue; }
    const path = repoPath(file);
    // idempotent: skip if the doc_id is already anywhere in the registry
    if (new RegExp(`\\\`${fm.doc_id}\\\``).test(registry) || registry.includes(fm.doc_id)) {
      skipped.push(fm.doc_id);
      continue;
    }
    // ensure the auto section + table exist
    if (!registry.includes(AUTO_HEADING)) {
      const anchor = registry.lastIndexOf("\n## Changelog");
      const block = `\n${AUTO_HEADING}\n\nDocs registered deterministically by \`npm run docs:register\` (ADR-007). Re-file into curated sections in a later sweep.\n\n${TABLE_HEADER}\n`;
      registry = anchor >= 0
        ? registry.slice(0, anchor) + block + registry.slice(anchor)
        : registry + block;
    }
    // append the row right after the auto-section table header
    const headerIdx = registry.indexOf(TABLE_HEADER, registry.indexOf(AUTO_HEADING));
    const insertAt = headerIdx + TABLE_HEADER.length;
    registry = registry.slice(0, insertAt) + "\n" + rowFor(fm, path) + registry.slice(insertAt);
    added.push(fm.doc_id);
  }

  writeFileSync(registryPath, registry, "utf8");

  console.log("docs:register");
  console.log("-------------");
  console.log(`added:    ${added.length}${added.length ? " — " + added.join(", ") : ""}`);
  console.log(`skipped:  ${skipped.length}${skipped.length ? " (already present) — " + skipped.join(", ") : ""}`);
  if (rejected.length) console.log(`rejected: ${rejected.length}\n  - ${rejected.join("\n  - ")}`);
  if (added.length) console.log("\nNOTE: bump DOC-VERSION-REGISTRY frontmatter version + add a changelog row (governance hygiene).");

  // governance gate
  console.log("\nRunning docs:validate gate ...\n");
  try {
    execSync("npm run docs:validate", { cwd: repoRoot, stdio: "inherit", shell: true });
  } catch {
    console.error("\nFAIL: docs:validate failed after registration — review the registry edit.");
    process.exit(1);
  }
  if (rejected.length) process.exit(1);
}

main();
