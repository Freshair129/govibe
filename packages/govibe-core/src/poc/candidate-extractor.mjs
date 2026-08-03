/**
 * POC semantic front-end (TDD-POC-CANONICAL-LOOP phase 1).
 *
 * Reads a roadmap/backlog Markdown artifact and emits Candidate Semantic IR.
 * It never assigns canonical identity (CSIR-FR-003) and preserves the exact
 * source locator for every candidate (CSIR-FR-002).
 *
 * Deliberately self-contained: the POC path must not reach into the
 * document-driven roadmap parser, so the graph-to-view criterion stays
 * unambiguous.
 */
import { createHash } from "node:crypto";

export const CANDIDATE_SCHEMA_VERSION = "govibe-candidate-semantic-ir/v1";

const CANDIDATE_NAMESPACE = "candidate:roadmap/";
const NODE_TYPES = new Set(["roadmap", "phase", "sprint", "epic", "task", "sub-task"]);
const WORKFLOW_STATES = new Set(["planned", "in-progress", "blocked", "review", "done"]);

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Stable serialization so hashes do not depend on key insertion order. */
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function splitFrontmatter(text) {
  const match = text.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: text };
  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    frontmatter[field[1]] = field[2].trim().replace(/^["']|["']$/g, "");
  }
  return { frontmatter, body: match[2] };
}

function parseTableAt(lines, startIndex) {
  const rows = [];
  let index = startIndex;
  while (index < lines.length && lines[index].trim().startsWith("|")) {
    rows.push(lines[index]);
    index += 1;
  }
  if (rows.length < 2) return null;
  const headers = rows[0].split("|").slice(1, -1).map((cell) => cell.trim());
  const records = rows.slice(2).map((line, offset) => {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    return {
      __row: offset + 1,
      ...Object.fromEntries(headers.map((header, column) => [header, cells[column] ?? ""])),
    };
  });
  return { records, nextIndex: index };
}

/** Collect every `## Section` that owns a Markdown table. */
function collectSectionTables(body) {
  const lines = body.split(/\r?\n/);
  const tables = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index].match(/^##\s+(.+)$/);
    if (!heading) continue;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (lines[cursor].startsWith("## ")) break;
      if (!lines[cursor].trim().startsWith("|")) continue;
      const parsed = parseTableAt(lines, cursor);
      if (parsed) {
        tables.set(heading[1].trim(), parsed.records);
        index = parsed.nextIndex - 1;
      }
      break;
    }
  }
  return tables;
}

function column(row, aliases) {
  for (const alias of aliases) {
    const key = Object.keys(row).find((candidate) => candidate.toLowerCase() === alias.toLowerCase());
    if (key && row[key]) return row[key];
  }
  return "";
}

function normalizeState(value) {
  const raw = String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (WORKFLOW_STATES.has(raw)) return raw;
  if (["todo", "backlog", "not-started", "draft", "proposed"].includes(raw)) return "planned";
  if (["doing", "wip", "active", "in-flight"].includes(raw)) return "in-progress";
  if (["complete", "completed", "shipped", "approved", "accepted"].includes(raw)) return "done";
  if (["blocked", "on-hold"].includes(raw)) return "blocked";
  if (["in-review", "verifying"].includes(raw)) return "review";
  return "planned";
}

function normalizeType(value, fallback) {
  const raw = String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  return NODE_TYPES.has(raw) ? raw : fallback;
}

function parseProgress(value) {
  const parsed = Number.parseFloat(String(value ?? "").replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function slugify(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "node";
}

/**
 * Logical key = the identity anchor. It is derived from the source artifact and
 * the item's declared ID, never from wording, section position, or template, so
 * a meaning-preserving rewrite keeps the same candidate ref (CSIR-FR-010/011).
 */
function candidateRefFor(sourcePath, logicalId) {
  return `${CANDIDATE_NAMESPACE}${sha256(`${sourcePath}#${logicalId}`).slice(0, 16)}`;
}

function makeCandidate({ sourcePath, logicalId, kind, section, row, payload }) {
  const body = { ...payload, id: logicalId };
  return {
    candidate_ref: candidateRefFor(sourcePath, logicalId),
    kind,
    logical_id: logicalId,
    // Content revision of THIS candidate — changes whenever its payload changes.
    source_hash: sha256(stableStringify(body)),
    source_locator: { path: sourcePath, section, row },
    payload: body,
  };
}

/**
 * @returns {{sourceRef: string, sourceHash: string, title: string,
 *            candidates: Array<object>, schema_version: string}}
 */
export function extractRoadmapCandidates({ sourcePath, text }) {
  if (typeof sourcePath !== "string" || !sourcePath.trim()) throw new TypeError("sourcePath is required.");
  if (typeof text !== "string") throw new TypeError("text is required.");

  const { frontmatter, body } = splitFrontmatter(text);
  const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? sourcePath;
  const rootId = frontmatter.doc_id || frontmatter.id || `RM-${slugify(title)}`;
  const sections = collectSectionTables(body);
  const candidates = [];
  const seen = new Set();

  const push = (candidate) => {
    if (seen.has(candidate.candidate_ref)) return;
    seen.add(candidate.candidate_ref);
    candidates.push(candidate);
  };

  push(makeCandidate({
    sourcePath,
    logicalId: rootId,
    kind: "roadmap",
    section: "Document Root",
    row: 0,
    payload: {
      type: "roadmap",
      title,
      state: normalizeState(frontmatter.status),
      progress: parseProgress(frontmatter.progress) ?? 0,
      docVersion: frontmatter.version,
    },
  }));

  const groups = [
    { names: ["Phases", "MVP Phases"], kind: "phase", idAliases: ["Phase", "ID"], defaultParent: () => rootId },
    { names: ["Sprints", "High-Level Sprint Plan"], kind: "sprint", idAliases: ["Sprint", "ID"], defaultParent: () => rootId },
    { names: ["Backlog Items", "MVP Backlog Seed"], kind: "task", idAliases: ["ID"], defaultParent: () => rootId },
    { names: ["Nodes"], kind: null, idAliases: ["ID"], defaultParent: () => rootId },
  ];

  for (const group of groups) {
    for (const name of group.names) {
      for (const row of sections.get(name) ?? []) {
        const logicalId = column(row, group.idAliases)
          || `${(group.kind ?? "node").toUpperCase()}-${slugify(column(row, ["Goal", "Title"]))}`;
        push(makeCandidate({
          sourcePath,
          logicalId,
          kind: group.kind ?? normalizeType(column(row, ["Type"]), "task"),
          section: name,
          row: row.__row,
          payload: {
            type: group.kind ?? normalizeType(column(row, ["Type"]), "task"),
            parentId: column(row, ["Parent ID", "Parent", "Parent Epic", "Parent Phase", "Parent Sprint"]) || group.defaultParent(),
            title: column(row, ["Title", "Goal"]) || logicalId,
            summary: column(row, ["Summary", "Exit Criteria", "Acceptance", "Required Docs"]) || undefined,
            state: normalizeState(column(row, ["Status", "State"])),
            progress: parseProgress(column(row, ["Progress"])),
            owner: column(row, ["Owner", "Assignee", "Agent Assignment"]) || undefined,
          },
        }));
      }
    }
  }

  // Task-breakdown checklists carry decomposition that never appears in a
  // table. Only real breakdown ids become candidates; prose bullets do not.
  let breakdownParent = null;
  const stack = [];
  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^###\s+([A-Za-z0-9.-]+)\s*:\s*(.+)$/);
    if (heading) {
      breakdownParent = heading[1].trim();
      stack.length = 0;
      continue;
    }
    const item = line.match(/^(\s*)-\s+\[( |x|X)\]\s+([A-Za-z0-9.-]+)\s+(.+)$/);
    if (!item) continue;
    const [, indentText, checkbox, logicalId, itemTitle] = item;
    if (!/^(SUBTASK|MICRO|ATOMIC|S|M|A)-/i.test(logicalId)) continue;

    const indent = indentText.length;
    while (stack.length > 0 && stack.at(-1).indent >= indent) stack.pop();
    const done = checkbox.toLowerCase() === "x";
    push(makeCandidate({
      sourcePath,
      logicalId,
      kind: /^(SUBTASK|S)-/i.test(logicalId) ? "sub-task" : "task",
      section: breakdownParent ?? "Task Breakdown",
      row: 0,
      payload: {
        type: /^(SUBTASK|S)-/i.test(logicalId) ? "sub-task" : "task",
        parentId: stack.at(-1)?.id ?? breakdownParent ?? rootId,
        title: itemTitle.trim(),
        state: done ? "done" : "planned",
        progress: done ? 100 : 0,
      },
    }));
    stack.push({ indent, id: logicalId });
  }

  return {
    schema_version: CANDIDATE_SCHEMA_VERSION,
    sourceRef: sourcePath,
    // Snapshot hash of the whole artifact revision.
    sourceHash: sha256(text),
    title,
    rootId,
    candidates,
  };
}

export { sha256, stableStringify };
