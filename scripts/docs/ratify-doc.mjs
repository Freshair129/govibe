// Ratify governed docs: flip lifecycle status consistently in (1) frontmatter,
// (2) the body **Status:** line, and (3) the DOC-VERSION-REGISTRY row — then run
// the docs:validate gate. Operationalizes the "owner ratifies" step of ADR-007
// (deterministic governance; no hand-editing; keeps registry == frontmatter).
//
//   node scripts/docs/ratify-doc.mjs [--status accepted] <file.md> [...]

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const registryPath = resolve(repoRoot, "docs/DOC-VERSION-REGISTRY.md");
const argv = process.argv.slice(2);

let status = "accepted";
const si = argv.indexOf("--status");
if (si >= 0) { status = argv[si + 1]; argv.splice(si, 2); }
const files = argv;
const Cap = status.charAt(0).toUpperCase() + status.slice(1);

if (files.length === 0) {
  console.error("usage: node scripts/docs/ratify-doc.mjs [--status accepted] <file.md> [...]");
  process.exit(1);
}

function fmDocId(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const id = m && m[1].match(/^doc_id:\s*["']?([^"'\r\n]+)/m);
  return id ? id[1].trim() : null;
}

let registry = existsSync(registryPath) ? readFileSync(registryPath, "utf8") : "";
const done = [];

for (const file of files) {
  const abs = resolve(repoRoot, file);
  if (!existsSync(abs)) { console.error(`skip (missing): ${file}`); continue; }
  let c = readFileSync(abs, "utf8");
  const docId = fmDocId(c);
  c = c.replace(/^(status:\s*)["']?[^"'\r\n]+["']?\s*$/m, `$1"${status}"`);          // frontmatter
  c = c.replace(/^\*\*Status:\*\*.*$/m, `**Status:** ${Cap}`);                        // body line
  writeFileSync(abs, c, "utf8");

  if (docId && registry) {                                                            // registry status cell
    registry = registry.split(/\r?\n/).map((line) => {
      if (!line.trim().startsWith("|") || !line.includes(`\`${docId}\``)) return line;
      const cells = line.split("|");          // ['', GROUP, `ID`, `VER`, STATUS, OWNER, `PATH`, '']
      if (cells.length >= 7) cells[4] = ` ${status} `;
      return cells.join("|");
    }).join("\n");
  }
  done.push(docId || file);
}

if (registry) writeFileSync(registryPath, registry, "utf8");

console.log(`ratify → ${status}: ${done.join(", ")}`);
console.log("\nRunning docs:validate gate ...\n");
try {
  execSync("npm run docs:validate", { cwd: repoRoot, stdio: "inherit", shell: true });
} catch {
  console.error("\nFAIL: docs:validate failed after ratify — review the edits.");
  process.exit(1);
}
