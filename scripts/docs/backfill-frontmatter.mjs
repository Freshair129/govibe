// Deterministic frontmatter backfill — brings legacy canonical docs under governance
// WITHOUT hand-authored identity. The "no agent hallucination" rule of ADR-007 applied
// to the existing corpus: doc_id is derived from the filename (same rule as docs:create),
// status/version are set to the conservative governed floor (draft / 0.1.0+draft) so the
// migration never over-claims approval — promote later via docs:ratify.
//
//   node scripts/docs/backfill-frontmatter.mjs --updated 2026-06-24 [--apply]
//
// Default is a dry-run (prints the plan). --apply writes. Idempotent: any doc that already
// has a frontmatter doc_id is left untouched.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, basename } from "node:path";

import { PREFIX_TYPE, GOVERNED_DOC_PREFIX as GOVERNED_PREFIX } from "./governance-rules.mjs";

const repoRoot = process.cwd();
const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const updated = (() => { const i = argv.indexOf("--updated"); return i >= 0 ? argv[i + 1] : "<set-date>"; })();

// Governed canonical doc roots scanned for legacy docs needing frontmatter.
const GOVERNED_DIRS = [
  "docs", "docs/adr", "docs/srs", "docs/architecture", "docs/lld", "docs/api",
  "docs/rca", "docs/runbooks", "docs/blueprints", "docs/specs", "docs/audit",
];
const FEATURE_ROOT = "docs/features";

function toRepoPath(p) { return relative(repoRoot, p).replace(/\\/g, "/"); }

function listGovernedDocs() {
  const out = [];
  const seen = new Set();
  const add = (dir, recurse) => {
    const abs = resolve(repoRoot, dir);
    if (!existsSync(abs)) return;
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      if (e.isDirectory()) { if (recurse) add(join(dir, e.name), true); continue; }
      if (!e.name.endsWith(".md")) continue;
      if (!GOVERNED_PREFIX.test(e.name)) continue;
      const p = toRepoPath(join(abs, e.name));
      if (/\/(archive|change-requests)\//.test(p)) continue;
      if (!seen.has(p)) { seen.add(p); out.push(p); }
    }
  };
  for (const d of GOVERNED_DIRS) add(d, false);
  add(FEATURE_ROOT, true);
  return out.sort();
}

function hasFrontmatterDocId(content) {
  const m = content.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? /^doc_id:\s*\S/m.test(m[1]) : false;
}

function deriveDocId(file) {
  const name = basename(file, ".md");
  // TYPE prefix uppercased; rest uppercased; non-alnum runs -> single dash; keep `--` of CONCEPT.
  return name.toUpperCase().replace(/[^A-Z0-9]+/g, (m) => (m.includes("-") ? m.replace(/[^-]/g, "").slice(0, 2) || "-" : "-")).replace(/^-|-$/g, "");
}

function deriveType(file) {
  const prefix = (basename(file).match(/^([A-Za-z]+)/) || [])[1]?.toUpperCase();
  return PREFIX_TYPE[prefix] || "doc";
}

function firstHeading(content) {
  const m = content.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].replace(/"/g, "'") : null;
}

function inlineField(content, labels) {
  for (const label of labels) {
    const re = new RegExp(`^\\*\\*${label}:\\*\\*\\s*\`?([^\`\\n]+?)\`?\\s*$`, "im");
    const m = content.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

function hasChangelogSection(content) {
  return /^#{1,6}\s+(?:\d+\.\s*)?Changelog\b/im.test(content);
}

function frontmatterOwner(content) {
  const m = content.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const o = m && m[1].match(/^owner:\s*["']?([^"'\r\n]+)/m);
  return o ? o[1].trim() : "GoVibe";
}

function appendChangelog(content, owner) {
  return content.replace(/\s*$/, "\n") +
    `\n## Changelog\n\n| Version | Date | Owner | Summary |\n|---|---|---|---|\n| ${updated} | ${updated} | ${owner} | Added governance Changelog section (docs:backfill). |\n`;
}

function backfill(file) {
  const abs = resolve(repoRoot, file);
  let content = readFileSync(abs, "utf8");
  if (hasFrontmatterDocId(content)) {
    // Already has identity — only ensure a Changelog section exists.
    if (hasChangelogSection(content)) return { file, action: "skip (already governed)" };
    const next = appendChangelog(content, frontmatterOwner(content));
    if (apply) writeFileSync(abs, next, "utf8");
    return { file, action: apply ? "changelog added" : "would add changelog", docId: "(existing)", type: "-", owner: frontmatterOwner(content), changelog: "added" };
  }

  const docId = deriveDocId(file);
  const type = deriveType(file);
  const title = firstHeading(content) || basename(file, ".md");
  const owner = inlineField(content, ["Owner", "Author", "Approved By"]) || "GoVibe";
  const hasChangelog = /^#{1,6}\s+(?:\d+\.\s*)?Changelog\b/im.test(content);

  const fm = [
    "---",
    `doc_id: "${docId}"`,
    `title: "${title}"`,
    `status: "draft"`,
    `version: "0.1.0+draft"`,
    `updated: "${updated}"`,
    `owner: "${owner}"`,
    `type: ${type}`,
    "---",
    "",
  ].join("\n");

  let body = content.replace(/^﻿/, "");
  // Strip any pre-existing frontmatter block without a doc_id (rare) before prepending ours.
  body = body.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  let next = fm + body.replace(/^\n+/, "\n");
  if (!hasChangelog) {
    next = next.replace(/\s*$/, "\n");
    next += `\n## Changelog\n\n| Version | Date | Owner | Summary |\n|---|---|---|---|\n| 0.1.0+draft | ${updated} | ${owner} | Brought under document governance (docs:backfill): frontmatter + changelog. |\n`;
  }

  if (apply) writeFileSync(abs, next, "utf8");
  return { file, action: apply ? "backfilled" : "would backfill", docId, type, owner, changelog: hasChangelog ? "kept" : "added" };
}

function main() {
  const docs = listGovernedDocs();
  const plan = docs.map(backfill);
  const changed = plan.filter((p) => p.action.includes("backfill"));
  const skipped = plan.filter((p) => p.action.startsWith("skip"));

  for (const p of changed) {
    console.log(`${apply ? "[apply]" : "[dry-run]"} ${p.file}`);
    console.log(`         doc_id=${p.docId}  type=${p.type}  owner=${p.owner}  changelog=${p.changelog}`);
  }
  console.log(`\n${apply ? "backfilled" : "would backfill"}: ${changed.length}   already-governed: ${skipped.length}`);
  if (!apply && changed.length) console.log("re-run with --apply to write.");
}

main();
