// Single source of truth for document-governance placement rules.
//
// Imported by validate-docs (lock-at-gate), create-doc (lock-at-create), and
// backfill-frontmatter (migration) so the "where may a doc live" rule is defined ONCE and
// the prevent/detect gates can never drift apart. Add a doc type here and every gate learns it.

// Doc-type prefix -> frontmatter `type` value.
export const PREFIX_TYPE = {
  PRD: "prd", STD: "std", BRD: "brd", SDD: "sdd", C4: "c4", SRS: "srs", LLD: "lld",
  API: "api", ADR: "adr", RCA: "rca", RUNBOOK: "runbook", BLUEPRINT: "blueprint",
  FEAT: "feature", CONCEPT: "concept", DESIGN: "design", AUDIT: "audit", POC: "poc",
  MASTERPLAN: "masterplan", ROADMAP: "roadmap", BACKLOG: "backlog", SPRINT: "sprint",
  IMP: "imp", MSP: "architecture", UGB: "concept",
};

// Doc-type prefix -> allowed directories (first entry is the canonical/default home).
// FEAT is special-cased: it may live in any docs/features/<area>/ subdirectory.
export const LOCATION_RULES = {
  PRD: ["docs"], STD: ["docs"], BRD: ["docs"], CONCEPT: ["docs"], UGB: ["docs"],
  SDD: ["docs", "docs/architecture"], C4: ["docs/architecture"], MSP: ["docs/architecture"],
  BLUEPRINT: ["docs/architecture", "docs/blueprints"],
  SRS: ["docs/srs"], LLD: ["docs/lld"], API: ["docs/api"], ADR: ["docs/adr"],
  RCA: ["docs/rca"], RUNBOOK: ["docs/runbooks"], AUDIT: ["docs/audit"], POC: ["docs/audit"],
  FEAT: ["docs/features"], DESIGN: ["docs/design"],
  MASTERPLAN: ["docs/roadmap"], ROADMAP: ["docs/roadmap"], BACKLOG: ["docs/roadmap"],
  SPRINT: ["docs/roadmap"], IMP: ["docs/roadmap"],
};

// A filename is governed if it carries a known doc-type prefix delimited by `-`, `--`, or `.md`
// (so IMP matches IMP-… but not IMPACT-…).
export const GOVERNED_DOC_PREFIX = new RegExp(
  `^(${Object.keys(PREFIX_TYPE).join("|")})(?:--?[A-Za-z0-9][-A-Za-z0-9]*)?\\.md$`,
  "i",
);

// docs/archive and docs/change-requests are review artifacts, exempt from governance gates.
export function isExemptDocPath(file) {
  return !/^docs\//.test(file) || /^docs\/(archive|change-requests)\//.test(file);
}

export function prefixOf(fileOrName) {
  const name = fileOrName.split("/").pop();
  return (name.match(/^([A-Za-z]+)/) || [])[1]?.toUpperCase() ?? "";
}

// Allowed dirs for a `--type`/prefix token (case-insensitive). null = type not placement-governed.
export function allowedDirsFor(typeOrPrefix) {
  return LOCATION_RULES[String(typeOrPrefix).toUpperCase()] ?? null;
}

// Is `dir` an allowed home for `prefix`? Handles the FEAT subdirectory rule.
export function isAllowedDir(prefix, dir) {
  const P = String(prefix).toUpperCase();
  if (P === "FEAT") return dir === "docs/features" || dir.startsWith("docs/features/");
  const allowed = LOCATION_RULES[P];
  return allowed ? allowed.includes(dir) : true; // unknown prefix => not location-governed
}
