// Translator-core slice — atomizer (FR-1, slice subset = Markdown docs -> GKS atoms).
// Real, deterministic decomposition of a Markdown document into heading-scoped atoms.
// Code-AST atomization (full 12-step) is a later increment; this slice proves the doc path.
//
// An atom's `key` is content-identity (normalized heading word + normalized body), so it is
// STABLE across format changes (numbering/case/order) — which is what makes the round-trip
// fidelity check in fidelity.mjs meaningful.

import { createHash } from "node:crypto";

const HEADING_RE = /^(#{1,6})\s+(.*\S)\s*$/;

/** Strip leading numbering ("1.", "1.2.3"), markdown emphasis, case + whitespace noise. */
export function normalizeHeading(heading) {
  return String(heading ?? "")
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\d+(?:\.\d+)*[.)]?\s+/, "")
    .replace(/[*_`]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Normalize body text for content-identity: collapse whitespace, drop blank lines, lowercase. */
export function normalizeContent(content) {
  return String(content ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function atomKey(heading, content) {
  return createHash("sha1")
    .update(`${normalizeHeading(heading)}${normalizeContent(content)}`)
    .digest("hex")
    .slice(0, 16);
}

function slug(heading) {
  return normalizeHeading(heading).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
}

/**
 * Decompose Markdown into atoms.
 * @returns {{atoms: Array<{id,level,heading,content,order,parentId,key}>}}
 */
export function atomize(markdown) {
  const lines = String(markdown ?? "").split(/\r?\n/);
  const atoms = [];
  const stack = []; // {level, id}
  let current = null;
  let order = 0;
  const idCounts = new Map();

  const flush = () => {
    if (current) {
      current.content = current.bodyLines.join("\n").trim();
      current.key = atomKey(current.heading, current.content);
      delete current.bodyLines;
      atoms.push(current);
    }
  };

  for (const line of lines) {
    const m = line.match(HEADING_RE);
    if (m) {
      flush();
      const level = m[1].length;
      const heading = m[2].trim();
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      const parentId = stack.length ? stack[stack.length - 1].id : null;
      let id = slug(heading);
      const n = (idCounts.get(id) ?? 0) + 1;
      idCounts.set(id, n);
      if (n > 1) id = `${id}-${n}`;
      current = { id, level, heading, content: "", order: order++, parentId, bodyLines: [], key: "" };
      stack.push({ level, id });
    } else if (current) {
      current.bodyLines.push(line);
    }
    // preamble before the first heading is intentionally ignored for the slice
  }
  flush();
  return { atoms };
}
