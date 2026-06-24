// Deterministic doc scaffolder — the "Template-as-Code" half of ADR-007.
// Generates a canonical doc_id, scaffolds frontmatter + skeleton, and (optionally)
// registers it. No hand-authored IDs.
//
//   node scripts/docs/create-doc.mjs --type adr --slug some-decision --title "..." --owner "Boss (CEO)" [--dir docs/x] [--register] [--dry-run]

import { execSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { allowedDirsFor, isAllowedDir } from "./governance-rules.mjs";

const repoRoot = process.cwd();
const a = process.argv.slice(2);
const opt = (n, d = "") => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : d; };
const flag = (n) => a.includes(`--${n}`);

const type = opt("type").toLowerCase();
const slug = opt("slug");
const title = opt("title");
const owner = opt("owner", "Boss (CEO)");
const dryRun = flag("dry-run");

if (!type || !slug || !title) {
  console.error('usage: create-doc.mjs --type adr --slug my-slug --title "..." --owner "..." [--dir docs/x] [--register] [--dry-run]');
  process.exit(1);
}

const DIRS = {
  adr: "docs/adr", srs: "docs/srs", srd: "docs/srs", sdd: "docs/architecture",
  lld: "docs/lld", prd: "docs", std: "docs", concept: "docs", spec: "docs/specs",
  api: "docs/api", audit: "docs/audit", poc: "docs/audit", runbook: "docs/runbooks",
  rca: "docs/rca", brd: "docs", blueprint: "docs/blueprints", c4: "docs/architecture",
  feat: "docs/features",
};

// Lock-at-create: refuse unknown types and refuse a --dir outside the type's governed homes,
// so a doc can never be scaffolded into the wrong place (the same rule validate enforces).
if (!DIRS[type]) {
  console.error(`refuse: unknown --type "${type}". Known: ${Object.keys(DIRS).sort().join(", ")}.`);
  process.exit(1);
}
const dir = opt("dir", DIRS[type]);
if (allowedDirsFor(type) && !isAllowedDir(type, dir)) {
  const where = type === "feat" ? "docs/features/<area>" : allowedDirsFor(type).join(" or ");
  console.error(`refuse: ${type.toUpperCase()} doc must live in ${where}/, got --dir ${dir}/.`);
  process.exit(1);
}
const TYPE = type.toUpperCase();
const SLUG = slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");

// ADR (and any numbered type) gets the next sequential number.
let num = "";
if (type === "adr") {
  const adrDir = resolve(repoRoot, "docs/adr");
  const nums = existsSync(adrDir)
    ? readdirSync(adrDir).map((f) => (f.match(/^ADR-(\d+)/) || [])[1]).filter(Boolean).map(Number)
    : [];
  num = String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
}
const docId = type === "adr" ? `ADR-${num}-${SLUG}` : `${TYPE}-${SLUG}`;
const fileName = (type === "adr" ? `ADR-${num}-${slug}` : `${TYPE}-${slug}`) + ".md";
const relPath = `${dir}/${fileName}`;
const absPath = resolve(repoRoot, relPath);

const body = `---
doc_id: "${docId}"
title: "${title}"
status: "draft"
version: "0.1.0+draft"
updated: "<set-date>"
owner: "${owner}"
type: ${type}
---

# ${title}

${type === "adr" ? "**Status:** Proposed (owner ratifies → Accepted)\n\n## 1. Context\n\n## 2. Decision\n\n## 3. Consequences\n\n## 4. Related\n" : "## 1. Purpose\n\n## 2. Scope\n\n## 3. Acceptance criteria\n"}
## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | <set-date> | ${owner} | Initial scaffold (docs:create). |
`;

if (dryRun) {
  console.log(`[dry-run] would create:\n  doc_id: ${docId}\n  path:   ${relPath}`);
  process.exit(0);
}
if (existsSync(absPath)) { console.error(`refuse: file exists: ${relPath}`); process.exit(1); }
writeFileSync(absPath, body, "utf8");
console.log(`created: ${relPath}  (doc_id ${docId})`);
console.log("NOTE: replace <set-date> + fill sections, then it is registered below / via `npm run docs:register`.");

if (flag("register")) {
  execSync(`node scripts/docs/register-doc.mjs ${relPath}`, { cwd: repoRoot, stdio: "inherit", shell: true });
}
