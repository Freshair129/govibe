import path from "node:path";

import { byCodepoint, sortById } from "./stage-shared.mjs";

/**
 * Top-down intent scan (architecture §9). A separate pass, not a stage: the twelve stages
 * reconstruct WHAT IS from code; this pass reconstructs WHAT SHOULD BE from intent artefacts.
 *
 * It supplies the seven dimensions no bottom-up stage can produce — intent, requirement,
 * rationale, domain, deployment, authority, change — and it is what finally resolves the
 * `@req` / `@spec` targets Stage 10 records as UNRESOLVED.
 *
 * The binding constraint: **the scanner must not invent missing WHY.** A document with no
 * stated rationale yields no rationale atom. Absent meaning becomes UNRESOLVED, never a
 * plausible summary.
 */

const INTENT_SCHEMA = "govibe-mode2-intended-semantic-model/v1";

/** Document classes and the dimensions each is entitled to supply. */
const DOC_TYPES = [
  { type: "BRD", pattern: /(^|\/)BRD[-_]/i, dimensions: ["intent", "domain"] },
  { type: "PRD", pattern: /(^|\/)PRD[-_]/i, dimensions: ["intent", "requirement", "domain"] },
  { type: "SRS", pattern: /(^|\/)SRS[-_]|(^|\/)srs\//i, dimensions: ["requirement"] },
  { type: "SDD", pattern: /(^|\/)SDD[-_]/i, dimensions: ["rationale", "deployment"] },
  { type: "ADR", pattern: /(^|\/)ADR[-_]|(^|\/)adr\//i, dimensions: ["rationale", "authority"] },
  { type: "RFC", pattern: /(^|\/)RFC[-_]/i, dimensions: ["rationale"] },
  { type: "STD", pattern: /(^|\/)STD[-_]/i, dimensions: ["authority"] },
  { type: "SPEC", pattern: /(^|\/)SPEC[-_]|(^|\/)specs?\//i, dimensions: ["requirement"] },
  { type: "FEAT", pattern: /(^|\/)FEAT[-_]/i, dimensions: ["requirement", "intent"] },
  { type: "ROADMAP", pattern: /(^|\/)(ROADMAP|MASTERPLAN|BACKLOG|SPRINT)[-_]/i, dimensions: ["change"] },
  { type: "CR", pattern: /(^|\/)(CR|AMENDMENT|WP)[-_]/i, dimensions: ["change", "authority"] },
  { type: "RUNBOOK", pattern: /(^|\/)RUNBOOK[-_]/i, dimensions: ["deployment"] },
  { type: "README", pattern: /(^|\/)README\.md$/i, dimensions: ["intent"] },
];

const REQUIREMENT_ID = /\b((?:FR|NFR|SEC|DR|IR|BR|AC)-\d{1,4})\b/g;
const DECISION_ID = /\b(ADR-\d{1,4})\b/g;
const ACCEPTANCE_LINE = /^\s*[-*|]?\s*(AC-\d{1,4})\s*[:|]\s*(.+)$/;

function classifyDocument(filePath) {
  return DOC_TYPES.find((entry) => entry.pattern.test(filePath)) ?? null;
}

function parseFrontmatter(text) {
  const match = text.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    data[field[1]] = field[2].trim().replace(/^["']|["']$/g, "");
  }
  return data;
}

function headings(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.match(/^#{1,6}\s+(.+)$/))
    .filter(Boolean)
    .map((match) => match[1].trim());
}

/**
 * Workspace paths a document names, in backticks or as a relative Markdown link. These are what
 * the gap comparator checks for staleness — a document pointing at a file that no longer exists
 * is drift the repository can prove, rather than drift it has to be told about.
 */
function pathReferences(text, documentPath) {
  const raw = new Set();
  for (const match of text.matchAll(/`([^`\s]+\.(?:md|mjs|cjs|ts|tsx|js|jsx|json|ya?ml|sql|prisma))`/g)) raw.add(match[1]);
  for (const match of text.matchAll(/\]\((?!https?:|mailto:|#)([^)\s]+\.[a-z]{2,5})\)/gi)) raw.add(match[1].split("#")[0]);

  const directory = path.posix.dirname(documentPath);
  const resolved = new Set();
  for (const candidate of raw) {
    // A glob is a pattern, not a path. `docs/**/SDD-*.md` names a family of documents and can
    // never be checked for existence.
    if (/[*?]/.test(candidate)) continue;
    // A placeholder is a template slot, not a path: `<scope>/AGENTS.md`, `{name}.md`.
    if (/[<>{}]/.test(candidate)) continue;
    if (candidate.startsWith("/")) continue;
    // Relative references resolve against the document's own directory. Treating them as
    // repository-root-relative was the single largest false-positive source.
    const target = candidate.startsWith(".")
      ? path.posix.normalize(path.posix.join(directory, candidate))
      : candidate;
    if (target.startsWith("..")) continue;
    resolved.add(target);
  }
  return [...resolved].sort(byCodepoint);
}

/**
 * @param options.documentationRoots roots to scan; defaults to conventional documentation homes
 */
export async function runIntentScan({ adapter, files, documentationRoots = ["docs", "doc", "documentation"], now = () => new Date().toISOString() }) {
  const candidates = files.filter(
    (file) =>
      /\.mdx?$/i.test(file.path) &&
      (documentationRoots.some((root) => file.path.startsWith(`${root}/`)) || /^[A-Z][A-Z0-9_-]*\.md$/.test(path.posix.basename(file.path))),
  );

  const documents = [];
  const atoms = [];
  const unresolved = [];
  const requirementIndex = new Map();
  const decisionIndex = new Map();

  for (const file of candidates) {
    const classification = classifyDocument(file.path);
    let text;
    try {
      text = await adapter.read(file.path);
    } catch (error) {
      unresolved.push({ kind: "unreadable-intent-document", path: file.path, reason: String(error?.message ?? error) });
      continue;
    }
    const frontmatter = parseFrontmatter(text);
    const sections = headings(text);
    const docType = classification?.type ?? "UNCLASSIFIED";
    documents.push({
      path: file.path,
      doc_type: docType,
      doc_id: frontmatter?.doc_id ?? null,
      status: frontmatter?.status ?? null,
      version: frontmatter?.version ?? null,
      governed: Boolean(frontmatter?.doc_id),
      sections,
      path_references: pathReferences(text, file.path),
    });

    if (!classification) {
      unresolved.push({ kind: "unclassified-intent-document", path: file.path });
      continue;
    }

    // Requirement identifiers are extracted, not invented. The identifier is the atom; the
    // requirement's *meaning* is not summarised, because summarising an unstated intent is
    // exactly the fabrication the architecture forbids.
    for (const match of text.matchAll(REQUIREMENT_ID)) {
      const identifier = match[1];
      if (!requirementIndex.has(identifier)) requirementIndex.set(identifier, { id: identifier, declared_in: [] });
      requirementIndex.get(identifier).declared_in.push(file.path);
    }
    for (const match of text.matchAll(DECISION_ID)) {
      const identifier = match[1];
      if (!decisionIndex.has(identifier)) decisionIndex.set(identifier, { id: identifier, declared_in: [] });
      decisionIndex.get(identifier).declared_in.push(file.path);
    }

    const acceptance = text
      .split(/\r?\n/)
      .map((line) => line.match(ACCEPTANCE_LINE))
      .filter(Boolean)
      .map((match) => ({ id: match[1], statement: match[2].trim().slice(0, 240) }));

    for (const dimension of classification.dimensions) {
      atoms.push({
        identity: `mode2-intent-atom:${dimension}:${file.path}`,
        type: `intent-document:${docType}`,
        dimension,
        source: file.path,
        provenance: { pass: "top-down-intent-scan", extractor: "document-classification", extractor_version: "1.0.0" },
        // The document's existence and class are explicit facts. Its content is not summarised.
        explicit: true,
        inferred: false,
        confidence: 1,
        canonical: false,
        properties: { doc_id: frontmatter?.doc_id ?? null, status: frontmatter?.status ?? null, section_count: sections.length, acceptance_criteria: acceptance.length },
      });
    }

    if (classification.dimensions.includes("rationale") && !sections.some((heading) => /context|rationale|consequence|decision|why/i.test(heading))) {
      unresolved.push({
        kind: "rationale-not-stated",
        path: file.path,
        detail: "document class is entitled to supply rationale but states none; WHY is not inferred",
      });
    }
  }

  if (!candidates.length) {
    unresolved.push({ kind: "no-intent-artefacts-found", detail: `searched roots ${documentationRoots.join(", ")} and root-level uppercase Markdown` });
  }

  const requirements = [...requirementIndex.values()].map((entry) => ({ ...entry, declared_in: [...new Set(entry.declared_in)].sort(byCodepoint) }));
  const decisions = [...decisionIndex.values()].map((entry) => ({ ...entry, declared_in: [...new Set(entry.declared_in)].sort(byCodepoint) }));

  return {
    schema: INTENT_SCHEMA,
    canonical: false,
    scanned_at: now(),
    document_count: documents.length,
    governed_document_count: documents.filter((document) => document.governed).length,
    documents: documents.sort((left, right) => byCodepoint(left.path, right.path)),
    doc_type_counts: Object.fromEntries(
      [...new Set(documents.map((document) => document.doc_type))].sort(byCodepoint).map((type) => [type, documents.filter((document) => document.doc_type === type).length]),
    ),
    requirement_index: requirements.sort((left, right) => byCodepoint(left.id, right.id)),
    decision_index: decisions.sort((left, right) => byCodepoint(left.id, right.id)),
    atoms: sortById(atoms.map((atom) => ({ ...atom, id: atom.identity }))).map(({ id, ...atom }) => atom),
    unresolved,
  };
}

/**
 * Resolves the annotation targets Stage 10 parked as UNRESOLVED against the intent model's
 * requirement and decision indexes.
 *
 * Governed by ADR-028 Decision 1 (`proposed`). A target that still does not resolve stays
 * unresolved — this closes the loop where the index can, and admits the gap where it cannot.
 */
export function resolveAnnotationTargets({ verificationModel, intendedModel }) {
  const requirements = new Set((intendedModel?.requirement_index ?? []).map((entry) => entry.id));
  const decisions = new Set((intendedModel?.decision_index ?? []).map((entry) => entry.id));
  const resolved = [];
  const stillUnresolved = [];

  for (const item of verificationModel?.unresolvedAnnotationTargets ?? []) {
    const target = item.target;
    const index = requirements.has(target) ? "requirement" : decisions.has(target) ? "decision" : null;
    if (!index) {
      stillUnresolved.push({ ...item, reason: "target absent from the intent model's indexes" });
      continue;
    }
    resolved.push({
      identity: `mode2-relation:annotation:${item.tag}:${item.path}:${item.line}`,
      rel: item.tag === "req" ? "IMPLEMENTS" : "FOLLOWS",
      from: `mode2-module:${item.path}`,
      to: `mode2-intent:${index}:${target}`,
      explicit: true,
      inferred: false,
      confidence: 1,
      canonical: false,
      governed_by: "ADR-028 D1 (proposed)",
    });
  }
  return { resolved: sortById(resolved.map((item) => ({ ...item, id: item.identity }))).map(({ id, ...item }) => item), unresolved: stillUnresolved };
}
