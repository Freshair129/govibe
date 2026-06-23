// Translator-core slice — fidelity gate (FR-5, BOTH metrics).
// (a) round-trip structural: re-atomize the rendered doc and compare content-identity keys.
// (b) semantic: an INJECTABLE scorer (default = deterministic lexical overlap baseline; swap an
//     embedding scorer for production). Verdict = pass | flag (human-confirm) | block.
//
// Injectable scorer keeps this unit-testable in CI without live embeddings (mirrors verify-gate.mjs).

import { atomize, normalizeContent } from "./atomizer.mjs";

export const DEFAULT_THRESHOLDS = { PASS: 0.8, FLAG: 0.5, CONF: 0.6 };

function multisetDiff(aKeys, bKeys) {
  const count = new Map();
  for (const k of bKeys) count.set(k, (count.get(k) ?? 0) + 1);
  const missing = [];
  for (const k of aKeys) {
    const c = count.get(k) ?? 0;
    if (c <= 0) missing.push(k);
    else count.set(k, c - 1);
  }
  return missing;
}

/** Round-trip: does the rendered doc still contain every source atom (by content identity)? */
export function roundTrip(sourceAtoms, renderedMarkdown) {
  const reAtoms = atomize(renderedMarkdown).atoms;
  const srcKeys = sourceAtoms.map((a) => a.key);
  const reKeys = reAtoms.map((a) => a.key);
  const lost = multisetDiff(srcKeys, reKeys);
  const added = multisetDiff(reKeys, srcKeys);
  return { ok: lost.length === 0 && added.length === 0, lost, added };
}

function tokenize(text) {
  return new Set(normalizeContent(text).split(/[^a-z0-9]+/).filter((t) => t.length > 1));
}

/** Default semantic scorer: Jaccard token overlap. Deterministic, no embeddings. */
export function lexicalScorer(sourceText, renderedText) {
  const a = tokenize(sourceText);
  const b = tokenize(renderedText);
  if (a.size === 0 && b.size === 0) return { score: 1, confidence: 1 };
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  const score = union === 0 ? 1 : inter / union;
  const coverage = a.size === 0 ? 1 : inter / a.size; // how much of the source is covered
  return { score: Number(score.toFixed(4)), confidence: Number(coverage.toFixed(4)) };
}

/**
 * Evaluate fidelity. Returns { roundTrip, semantic, verdict }.
 * @param {{sourceAtoms, sourceText, rendered, scorer?, thresholds?}} input
 */
export function evaluate({ sourceAtoms, sourceText, rendered, scorer = lexicalScorer, thresholds = DEFAULT_THRESHOLDS }) {
  const rt = roundTrip(sourceAtoms, rendered);
  const sem = scorer(sourceText, rendered);
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };

  let verdict;
  if (rt.lost.length > 0) {
    verdict = "block"; // structural meaning dropped
  } else if (sem.score >= t.PASS && sem.confidence >= t.CONF) {
    verdict = "pass";
  } else if (sem.score >= t.FLAG) {
    verdict = "flag";
  } else {
    verdict = "block";
  }
  // added-only structural delta (verbose target format) never blocks on its own.
  if (verdict === "pass" && rt.added.length > 0) verdict = "flag";

  return { roundTrip: rt, semantic: sem, verdict };
}
