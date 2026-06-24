// Deterministic crosslink derivation — adds `related_docs` ONLY from references that already
// exist in a doc's body. It never invents a relationship: a link appears in frontmatter only
// because the prose already names that doc's id. This keeps traceability honest (no hallucinated
// links) while connecting the islands the backfill left behind.
//
//   node scripts/docs/derive-crosslinks.mjs [--apply]
//
// Default dry-run. Idempotent: existing related_docs entries are preserved and de-duplicated.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { GOVERNED_DOC_PREFIX, isExemptDocPath } from "./governance-rules.mjs";

const repoRoot = process.cwd();
const REGISTRY = "docs/DOC-VERSION-REGISTRY.md";
const apply = process.argv.includes("--apply");

function toRepo(p) { return relative(repoRoot, p).replace(/\\/g, "/"); }
function read(p) { return readFileSync(resolve(repoRoot, p), "utf8"); }

function walk(dir, out = []) {
  const abs = resolve(repoRoot, dir);
  if (!existsSync(abs)) return out;
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    if (e.isDirectory()) { walk(join(dir, e.name), out); continue; }
    if (e.name.endsWith(".md")) out.push(toRepo(join(abs, e.name)));
  }
  return out;
}

// Build a token -> path index from the registry: every doc's doc_id, plus the short numbered
// form (ADR-007, API-001, POC-5) for numbered types.
function buildIndex() {
  const tokenToPath = new Map();
  const pathToId = new Map();
  const lines = read(REGISTRY).split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|");
    if (cells.length < 8) continue;
    const docId = cells[2].replace(/`/g, "").trim();
    const path = cells[6].replace(/`/g, "").trim();
    if (!docId || !path || !path.endsWith(".md")) continue;
    pathToId.set(path, docId);
    tokenToPath.set(docId.toUpperCase(), path);
    const num = docId.match(/^(ADR|API|POC|IMP)-(\d+)/i);
    if (num) tokenToPath.set(`${num[1].toUpperCase()}-${num[2]}`, path);
  }
  return { tokenToPath, pathToId };
}

// Body minus frontmatter, fenced code, and the Changelog section (so we only mine real prose refs).
function prose(content) {
  let body = content.replace(/^﻿/, "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  body = body.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
  body = body.replace(/^#{1,6}\s+(?:\d+\.\s*)?Changelog\b[\s\S]*$/im, "");
  return body;
}

// A YAML list item is `- value` (dash + at least one space). The closing `---` fence is three
// dashes with no space, so `-[ \t]+` deliberately never matches it.
const LIST_BLOCK = /^related_docs:[ \t]*\r?\n(?:[ \t]*-[ \t]+.*\r?\n?)*/m;

function existingRelated(content) {
  const m = content.match(LIST_BLOCK);
  if (!m) return [];
  return [...m[0].matchAll(/-[ \t]+["']?([^"'\r\n]+)["']?/g)].map((x) => x[1].trim());
}

function setRelated(content, list) {
  const block = "related_docs:\n" + list.map((p) => `  - "${p}"`).join("\n") + "\n";
  if (LIST_BLOCK.test(content)) {
    return content.replace(LIST_BLOCK, block);
  }
  // insert before the closing frontmatter fence
  return content.replace(/^(---\r?\n[\s\S]*?)(\r?\n---)/, (mm, fm, end) => `${fm}\n${block.trimEnd()}${end}`);
}

function main() {
  const { tokenToPath } = buildIndex();
  const TOKEN_RE = /\b([A-Z]{2,}[A-Za-z0-9]*(?:--?[A-Za-z0-9]+)+|(?:ADR|API|POC|IMP)-\d+)\b/g;
  const files = walk("docs").filter((f) => !isExemptDocPath(f) && GOVERNED_DOC_PREFIX.test(f.split("/").pop()));

  let changed = 0, linksAdded = 0;
  for (const file of files) {
    const content = read(file);
    const found = new Set();
    for (const m of prose(content).matchAll(TOKEN_RE)) {
      const target = tokenToPath.get(m[1].toUpperCase());
      if (target && target !== file) found.add(target);
    }
    if (found.size === 0) continue;
    const existing = existingRelated(content);
    const merged = [...new Set([...existing, ...found])].sort();
    const newOnes = merged.filter((p) => !existing.includes(p));
    if (newOnes.length === 0) continue;

    changed += 1; linksAdded += newOnes.length;
    console.log(`${apply ? "[apply]" : "[dry-run]"} ${file}  +${newOnes.length}: ${newOnes.join(", ")}`);
    if (apply) writeFileSync(resolve(repoRoot, file), setRelated(content, merged), "utf8");
  }
  console.log(`\n${apply ? "linked" : "would link"}: ${linksAdded} crosslink(s) across ${changed} doc(s).`);
  if (!apply && changed) console.log("re-run with --apply to write.");
}

main();
