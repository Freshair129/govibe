import { byCodepoint } from "./stage-shared.mjs";
import { BLOCK_PROFILES, DEFAULT_BLOCK_PROFILE, DIMENSION_PRODUCERS, selectBlockProfile, TOP_DOWN_ONLY_DIMENSIONS } from "./semantic-dimensions.mjs";

/**
 * Semantic coverage engine.
 *
 *     required dimensions − covered dimensions = semantic gaps
 *
 * The rule this file exists to enforce is that **document count is not semantic completeness**.
 * A repository with two hundred documents and no requirement atoms has a `requirement` gap, and
 * a repository with none and clean-parsing code does not get a passing score for it.
 */

const COVERAGE_SCHEMA = "govibe-mode2-semantic-coverage/v1";

/** Default retrieval radius for impact traversal (ADR-028 D6 — proposed, see §D6 note). */
export const DEFAULT_RETRIEVAL_RADIUS = "R3";

export function evaluateCoverage({ ir, profile, agentManifest, documentationRoots = [], governedDocCount = 0, intendedModel = null }) {
  const selection = profile
    ? { profile, reason: "explicitly supplied by the caller" }
    : selectBlockProfile({ agentManifest, documentationRoots, governedDocCount });
  const definition = BLOCK_PROFILES[selection.profile] ?? BLOCK_PROFILES[DEFAULT_BLOCK_PROFILE];

  // A dimension counts as covered when at least one atom OR relation serves it. Counting only
  // atoms was wrong: `dependency` is inherently relational — Stage 4 produces edges, not nodes —
  // so an atom-only count reported it missing on a repository with over a thousand real
  // dependency edges.
  const bottomUp = new Map();
  for (const atom of ir?.atoms ?? []) {
    bottomUp.set(atom.dimension, (bottomUp.get(atom.dimension) ?? 0) + 1);
  }
  const bottomUpRelations = new Map();
  for (const relation of ir?.relations ?? []) {
    bottomUpRelations.set(relation.dimension, (bottomUpRelations.get(relation.dimension) ?? 0) + 1);
  }

  // `provenance` is an *attribute* every atom carries, not a dimension with its own atoms.
  // It is covered when the IR actually populates provenance envelopes, and reported as
  // attribute-satisfied so it is not mistaken for a node-bearing dimension.
  const provenanceSatisfied = (ir?.atoms ?? []).length > 0 && (ir?.atoms ?? []).every((atom) => atom.provenance?.stage !== undefined);
  const topDown = new Map();
  for (const atom of intendedModel?.atoms ?? []) {
    topDown.set(atom.dimension, (topDown.get(atom.dimension) ?? 0) + 1);
  }

  const covered = [];
  const missing = [];
  const detail = [];
  for (const dimension of definition.required) {
    const bottom = bottomUp.get(dimension) ?? 0;
    const bottomRelations = bottomUpRelations.get(dimension) ?? 0;
    const top = topDown.get(dimension) ?? 0;
    const attributeSatisfied = dimension === "provenance" && provenanceSatisfied;
    const isCovered = bottom + bottomRelations + top > 0 || attributeSatisfied;
    (isCovered ? covered : missing).push(dimension);
    detail.push({
      dimension,
      covered: isCovered,
      bottom_up_atoms: bottom,
      bottom_up_relations: bottomRelations,
      top_down_atoms: top,
      satisfied_by: attributeSatisfied ? "atom-attribute" : bottom + top > 0 ? "atoms" : bottomRelations > 0 ? "relations" : null,
      producers: DIMENSION_PRODUCERS[dimension] ?? [],
      // Distinguishing "no producer exists" from "a producer ran and found nothing" is the
      // difference between an actionable gap and a misleading one.
      gap_cause: isCovered
        ? null
        : (DIMENSION_PRODUCERS[dimension] ?? []).length === 0
          ? "no-bottom-up-producer-requires-top-down-artefacts"
          : "producer-ran-and-found-nothing",
    });
  }

  const requiredTopDown = definition.required.filter((dimension) => TOP_DOWN_ONLY_DIMENSIONS.includes(dimension));
  return {
    schema: COVERAGE_SCHEMA,
    block_profile: selection.profile,
    profile_reason: selection.reason,
    profile_description: definition.description,
    required: [...definition.required].sort(byCodepoint),
    covered: covered.sort(byCodepoint),
    missing: missing.sort(byCodepoint),
    coverage_ratio: definition.required.length === 0 ? 1 : Number((covered.length / definition.required.length).toFixed(4)),
    detail: detail.sort((left, right) => byCodepoint(left.dimension, right.dimension)),
    top_down_dependency: {
      required_top_down_dimensions: requiredTopDown.sort(byCodepoint),
      intent_scan_supplied: Boolean(intendedModel),
    },
    // Stated so a reader cannot mistake this for a documentation-volume score.
    claim: "dimension coverage against a block profile; not a document count",
    retrieval_radius: DEFAULT_RETRIEVAL_RADIUS,
  };
}

/**
 * Section-coverage axis — ADR-028 Decision 4. **ADR-028 is `proposed`, not accepted**, so this
 * is a separate exported function contributing an optional second axis. Rejecting D4 is a
 * deletion of this function and its call site, not an unpick of the engine above.
 *
 * The two axes answer different questions and neither subsumes the other:
 *   dimension coverage — does this block cover `verification` at all?
 *   section coverage   — does this SDD have an Error Handling section?
 */
export function evaluateSectionCoverage({ documents = [], checklists }) {
  if (!checklists || !Object.keys(checklists).length) {
    return { schema: "govibe-mode2-section-coverage/v1", governed_by: "ADR-028 D4 (proposed)", applicable: false, reason: "no section checklist configured", results: [] };
  }
  const results = [];
  for (const document of documents) {
    const checklist = checklists[document.doc_type];
    if (!checklist) continue;
    const present = checklist.filter((section) => (document.sections ?? []).some((heading) => heading.toLowerCase().includes(section.toLowerCase())));
    const absent = checklist.filter((section) => !present.includes(section));
    results.push({
      path: document.path,
      doc_type: document.doc_type,
      expected: checklist.length,
      present: present.sort(byCodepoint),
      missing: absent.sort(byCodepoint),
      ratio: checklist.length === 0 ? 1 : Number((present.length / checklist.length).toFixed(4)),
    });
  }
  return {
    schema: "govibe-mode2-section-coverage/v1",
    governed_by: "ADR-028 D4 (proposed)",
    applicable: true,
    results: results.sort((left, right) => byCodepoint(left.path, right.path)),
  };
}
