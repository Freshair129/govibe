// Deterministic version-bump propagation — the last manual governance step made mechanical.
// Bumping a doc's version touches FOUR places that must stay consistent (frontmatter, the doc's
// changelog, the registry row, and — since the registry file changes — the registry's own
// version + changelog). Doing that by hand is the exact drift/hallucination surface this closes.
//
//   node scripts/docs/bump-doc.mjs <file.md> --summary "..." [--patch|--minor|--major] [--updated 2026-06-24] [--dry-run]
//
// Default bump level is patch. The pre-release/edition suffix (e.g. +draft) is preserved.

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { docContentHash, setContentHashField, ensureUidField } from "./content-hash.mjs";
import { resolve, relative } from "node:path";

const repoRoot = process.cwd();
const REGISTRY = "docs/DOC-VERSION-REGISTRY.md";
const a = process.argv.slice(2);
const opt = (n, d = "") => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : d; };
const flag = (n) => a.includes(`--${n}`);

const file = a.find((x) => x.endsWith(".md") && !x.startsWith("--"));
const summary = opt("summary");
const updated = opt("updated", "<set-date>");
const level = flag("major") ? "major" : flag("minor") ? "minor" : "patch";
const dryRun = flag("dry-run");

if (!file || !summary) {
  console.error('usage: bump-doc.mjs <file.md> --summary "..." [--patch|--minor|--major] [--updated DATE] [--dry-run]');
  process.exit(1);
}
const relFile = relative(repoRoot, resolve(repoRoot, file)).replace(/\\/g, "/");
if (!existsSync(resolve(repoRoot, relFile))) { console.error(`refuse: file not found: ${relFile}`); process.exit(1); }

function parseFm(content) {
  const m = content.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const f = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (f) data[f[1]] = f[2].trim().replace(/^["']|["']$/g, "");
  }
  return data;
}

function bumpVersion(version, lvl) {
  const m = String(version).match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!m) throw new Error(`non-canonical version "${version}" — cannot bump.`);
  let [, maj, min, pat, suffix] = m;
  maj = +maj; min = +min; pat = +pat;
  if (lvl === "major") { maj += 1; min = 0; pat = 0; }
  else if (lvl === "minor") { min += 1; pat = 0; }
  else { pat += 1; }
  return `${maj}.${min}.${pat}${suffix}`;
}

// Replace the `version:` frontmatter field and `updated:` field.
function setFrontmatterVersion(content, nextVersion) {
  let next = content.replace(/^(version:\s*)["']?[^"'\r\n]+["']?/m, `$1"${nextVersion}"`);
  if (updated !== "<set-date>") next = next.replace(/^(updated:\s*)["']?[^"'\r\n]+["']?/m, `$1"${updated}"`);
  return next;
}

// Insert a new row directly under the `## Changelog` table header separator.
function insertChangelogRow(content, row) {
  const lines = content.split(/\r?\n/);
  let i = lines.findIndex((l) => /^#{1,6}\s+(?:\d+\.\s*)?Changelog\b/i.test(l));
  if (i === -1) throw new Error("no Changelog section found.");
  for (; i < lines.length; i += 1) {
    if (/^\|\s*-{2,}/.test(lines[i].replace(/\s/g, "").replace(/\|/g, "|"))) { // separator row
      lines.splice(i + 1, 0, row);
      return lines.join("\n");
    }
    if (/^\|.*\|.*\|.*\|/.test(lines[i]) && /---/.test(lines[i])) { lines.splice(i + 1, 0, row); return lines.join("\n"); }
  }
  throw new Error("Changelog table separator not found.");
}

// Set the Version cell of the registry row whose Path cell points at `path`.
function setRegistryRowVersion(registry, path, nextVersion) {
  const lines = registry.split(/\r?\n/);
  let hit = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].trim().startsWith("|")) continue;
    const cells = lines[i].split("|");
    // cells: ["", Group, DocID, Version, Status, Owner, Path, ""]
    if (cells.length >= 8 && cells[6].includes("`" + path + "`")) {
      cells[3] = ` \`${nextVersion}\` `;
      lines[i] = cells.join("|");
      hit = true;
      break;
    }
  }
  return { registry: lines.join("\n"), hit };
}

function main() {
  const target = resolve(repoRoot, relFile);
  let content = readFileSync(target, "utf8");
  const fm = parseFm(content);
  if (!fm?.version) { console.error(`refuse: ${relFile} has no frontmatter version.`); process.exit(1); }
  const owner = fm.owner || "GoVibe";
  const nextVersion = bumpVersion(fm.version, level);

  const plan = [`${relFile}: ${fm.version} -> ${nextVersion} (${level})`];

  // 1+2. doc frontmatter + doc changelog row.
  content = setFrontmatterVersion(content, nextVersion);
  content = insertChangelogRow(content, `| ${nextVersion} | ${updated} | ${owner} | ${summary} |`);

  // ADR-021: version and content identity move together. Recompute content_hash from the bumped
  // body (clears any drift) and ensure an immutable uid exists. The registry file itself is not a
  // content-addressed doc, so skip it there.
  if (relFile !== REGISTRY) {
    content = ensureUidField(content);
    content = setContentHashField(content, docContentHash(content));
    plan.push(`${relFile}: content_hash recomputed`);
  }

  // 3. registry row for the doc.
  let registry = readFileSync(resolve(repoRoot, REGISTRY), "utf8");
  const isRegistry = relFile === REGISTRY;
  if (!isRegistry) {
    const r = setRegistryRowVersion(registry, relFile, nextVersion);
    if (!r.hit) { console.error(`refuse: ${relFile} is not registered (run docs:register first).`); process.exit(1); }
    registry = r.registry;
    plan.push(`${REGISTRY}: row[${relFile}] -> ${nextVersion}`);
  }

  // 4. registry's own version + self-row + registry changelog (it just changed).
  const regFm = parseFm(registry);
  const regNext = bumpVersion(regFm.version, "patch");
  registry = setFrontmatterVersion(registry, regNext);
  registry = setRegistryRowVersion(registry, REGISTRY, regNext).registry;
  registry = insertChangelogRow(registry, `| ${regNext} | ${updated} | ${owner} | Synced ${fm.doc_id || relFile} to ${nextVersion}. |`);
  plan.push(`${REGISTRY}: self ${regFm.version} -> ${regNext}`);

  if (dryRun) {
    console.log("[dry-run] planned changes:");
    for (const p of plan) console.log("  - " + p);
    console.log("re-run without --dry-run to apply.");
    return;
  }

  if (isRegistry) {
    writeFileSync(resolve(repoRoot, REGISTRY), registry, "utf8");
  } else {
    writeFileSync(target, content, "utf8");
    writeFileSync(resolve(repoRoot, REGISTRY), registry, "utf8");
  }
  for (const p of plan) console.log("bumped: " + p);
  console.log("\nRunning docs:validate gate ...");
  execSync("npm run --silent docs:validate", { cwd: repoRoot, stdio: "inherit", shell: true });
}

main();
