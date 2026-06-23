// Translator-core slice — format-template extractor (FR-2, HYBRID curation).
// Scans a doc's heading structure into a reusable format template. High-confidence sections
// are auto-accepted; low-confidence ones are flagged for human confirm (the hybrid decision).

import { atomize, normalizeHeading } from "./atomizer.mjs";

const CONFIDENCE_THRESHOLD = 0.6; // sections below this -> needsConfirm

function detectNaming(headings) {
  const sample = headings.filter(Boolean);
  const numbered = sample.filter((h) => /^\s*\d+(?:\.\d+)*[.)]?\s+/.test(h.replace(/^#{1,6}\s*/, ""))).length;
  const words = sample.map((h) => h.replace(/^#{1,6}\s*/, "").replace(/^\d+(?:\.\d+)*[.)]?\s+/, "").trim());
  const upper = words.filter((w) => w && w === w.toUpperCase() && /[A-Z]/.test(w)).length;
  const title = words.filter((w) => /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(w)).length;
  return {
    numbered: sample.length > 0 && numbered / sample.length >= 0.5,
    case: upper / Math.max(1, words.length) >= 0.5 ? "upper" : title / Math.max(1, words.length) >= 0.5 ? "title" : "sentence",
  };
}

function detectParadigm(headings) {
  const joined = headings.join(" ").toLowerCase();
  const feat = (joined.match(/feature|feat\b/g) || []).length;
  const sys = (joined.match(/system|module|service/g) || []).length;
  if (feat > sys) return "feature-base";
  if (sys > feat) return "system-base";
  return "other";
}

/** Per-section confidence: clear, reasonably-long headings are confident; tiny/ambiguous ones are not. */
function sectionConfidence(heading) {
  const norm = normalizeHeading(heading);
  if (norm.length < 3) return 0.3;
  if (/^(misc|other|notes?|tbd|todo)$/.test(norm)) return 0.4;
  return 1.0;
}

/**
 * Extract a format template from a Markdown document.
 * @returns {{id,repo,paradigm,naming,sections,confidence,needsConfirm}}
 */
export function extractTemplate(markdown, { repo = "unknown" } = {}) {
  const { atoms } = atomize(markdown);
  const headings = atoms.map((a) => a.heading);
  const sections = atoms.map((a) => ({
    key: normalizeHeading(a.heading),
    heading: a.heading,
    level: a.level,
    order: a.order,
    confidence: sectionConfidence(a.heading),
  }));
  const needsConfirm = sections.filter((s) => s.confidence < CONFIDENCE_THRESHOLD).map((s) => s.heading);
  const confidence = sections.length
    ? sections.reduce((sum, s) => sum + s.confidence, 0) / sections.length
    : 0;
  return {
    id: `tpl:${repo}`,
    repo,
    paradigm: detectParadigm(headings),
    naming: detectNaming(headings),
    sections,
    confidence: Number(confidence.toFixed(3)),
    needsConfirm,
  };
}

export { CONFIDENCE_THRESHOLD };
