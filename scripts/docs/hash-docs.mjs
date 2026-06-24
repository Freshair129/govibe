// docs:hash — establish/refresh content identity for governed docs (ADR-021 / FEAT-Doc-Content-Integrity).
// Mints an immutable `uid` (once) and sets `content_hash` (atom-merkle of the current body) on every
// governed docs/** doc. Run intentionally: this is the lockfile-refresh tool (the drift GATE lives in
// validate). Default dry-run; --apply writes.
//
//   node scripts/docs/hash-docs.mjs [--apply]

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { GOVERNED_DOC_PREFIX, isExemptDocPath } from "./governance-rules.mjs";
import { docContentHash, setContentHashField, ensureUidField } from "./content-hash.mjs";

const repoRoot = process.cwd();
const apply = process.argv.includes("--apply");

function toRepo(p) { return relative(repoRoot, p).replace(/\\/g, "/"); }

function walk(dir, out = []) {
  const abs = resolve(repoRoot, dir);
  if (!existsSync(abs)) return out;
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    if (e.isDirectory()) { walk(join(dir, e.name), out); continue; }
    if (e.name.endsWith(".md")) out.push(toRepo(join(abs, e.name)));
  }
  return out;
}

function hasDocId(content) {
  const m = content.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? /^doc_id:\s*\S/m.test(m[1]) : false;
}

function main() {
  const files = walk("docs").filter(
    (f) => !isExemptDocPath(f) && GOVERNED_DOC_PREFIX.test(f.split("/").pop()),
  );
  let mintedUid = 0, setHash = 0, changed = 0;
  for (const file of files) {
    const content = readRepoFileSafe(file);
    if (!content || !hasDocId(content)) continue;
    const hadUid = /^uid:/m.test(content);
    let next = ensureUidField(content);
    const hash = docContentHash(next);
    next = setContentHashField(next, hash);
    if (next === content) continue;
    changed += 1;
    if (!hadUid) mintedUid += 1;
    setHash += 1;
    if (apply) writeFileSync(resolve(repoRoot, file), next, "utf8");
  }
  console.log(`${apply ? "[apply]" : "[dry-run]"} governed docs: ${files.length} | changed: ${changed} | uid minted: ${mintedUid} | content_hash set/updated: ${setHash}`);
  if (!apply && changed) console.log("re-run with --apply to write.");
}

function readRepoFileSafe(file) {
  try { return readFileSync(resolve(repoRoot, file), "utf8"); } catch { return null; }
}

main();
