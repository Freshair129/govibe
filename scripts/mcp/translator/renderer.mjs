// Translator-core slice — selector (FR-4 scope) + renderer (FR-4 format).
// render = scope (hop-bounded atom selection) x format (target template ordering + naming).
// Same atoms + different template => format-correct docs in different paradigms.

import { normalizeHeading } from "./atomizer.mjs";

/** Select an atom subtree bounded by hop depth (H0 = the atom only). Omit selectorId => all atoms. */
export function selectScope(atoms, { selectorId = null, hop = 6 } = {}) {
  if (!selectorId) return atoms.slice();
  const childrenOf = new Map();
  for (const a of atoms) {
    if (!childrenOf.has(a.parentId)) childrenOf.set(a.parentId, []);
    childrenOf.get(a.parentId).push(a);
  }
  const root = atoms.find((a) => a.id === selectorId);
  if (!root) return [];
  const picked = [];
  let frontier = [{ atom: root, depth: 0 }];
  const seen = new Set();
  while (frontier.length) {
    const next = [];
    for (const { atom, depth } of frontier) {
      if (seen.has(atom.id)) continue;
      seen.add(atom.id);
      picked.push(atom);
      if (depth < hop) {
        for (const child of childrenOf.get(atom.id) ?? []) next.push({ atom: child, depth: depth + 1 });
      }
    }
    frontier = next;
  }
  return picked.sort((a, b) => a.order - b.order);
}

function applyCase(word, casing) {
  if (casing === "upper") return word.toUpperCase();
  if (casing === "title") return word.replace(/\b\w/g, (c) => c.toUpperCase());
  return word.charAt(0).toUpperCase() + word.slice(1); // sentence
}

function renderHeading(atom, naming, ordinal) {
  const word = atom.heading.replace(/^#{1,6}\s*/, "").replace(/^\d+(?:\.\d+)*[.)]?\s+/, "").replace(/[*_`]/g, "").trim();
  const text = applyCase(word, naming?.case ?? "title");
  const numbered = naming?.numbered ? `${ordinal}. ` : "";
  return `${"#".repeat(atom.level)} ${numbered}${text}`;
}

/**
 * Render selected atoms into the target format template.
 * Atoms are ordered by the template's section order (matched on normalized heading);
 * unmatched atoms keep their source order and are appended.
 */
export function render(atoms, template, { selectorId = null, hop = 6 } = {}) {
  const selected = selectScope(atoms, { selectorId, hop });
  const naming = template?.naming ?? { case: "title", numbered: false };
  const tplOrder = new Map((template?.sections ?? []).map((s, i) => [s.key, i]));
  const ordered = selected.slice().sort((a, b) => {
    const ai = tplOrder.has(normalizeHeading(a.heading)) ? tplOrder.get(normalizeHeading(a.heading)) : Number.MAX_SAFE_INTEGER;
    const bi = tplOrder.has(normalizeHeading(b.heading)) ? tplOrder.get(normalizeHeading(b.heading)) : Number.MAX_SAFE_INTEGER;
    return ai - bi || a.order - b.order;
  });

  const parts = [];
  let ordinal = 0;
  for (const atom of ordered) {
    ordinal += 1;
    parts.push(renderHeading(atom, naming, ordinal));
    if (atom.content) parts.push("", atom.content);
    parts.push("");
  }
  return parts.join("\n").trim() + "\n";
}
