/**
 * POC projection back-end (TDD-POC-CANONICAL-LOOP phase 3).
 *
 * Compiles destination views from a declared canonical graph revision
 * (CSIR-FR-040). The ONLY input is the canonical store — this module must never
 * read a source document or reach into the document-driven roadmap parser.
 *
 * Every view carries the manifest required by CSIR-FR-041 and keeps the
 * canonical refs needed for reverse mapping (CSIR-FR-042).
 */
import { sha256, stableStringify } from "./candidate-extractor.mjs";

export const VIEW_SCHEMA_VERSION = "govibe-view-manifest/v1";
export const TEMPLATE_VERSION = "roadmap-board/1.0.0";

/** Declared, named projections over the same graph. */
export const VIEW_DEFINITIONS = {
  "roadmap-board": {
    id: "roadmap-board",
    description: "Full roadmap hierarchy for the Mission Control A2 board.",
    includeKinds: null,
  },
  backlog: {
    id: "backlog",
    description: "Actionable backlog items only.",
    includeKinds: ["task", "sub-task", "epic"],
  },
};

const TYPE_RANK = { roadmap: 0, phase: 1, sprint: 2, epic: 3, task: 4, "sub-task": 5 };

function toViewNode(atom, parentCanonicalRef) {
  const payload = atom.payload ?? {};
  return {
    canonicalRef: atom.canonicalRef,
    parentCanonicalRef: parentCanonicalRef ?? undefined,
    id: atom.logicalId,
    parentId: payload.parentId,
    type: payload.type ?? atom.kind,
    title: payload.title,
    summary: payload.summary,
    state: payload.state,
    progress: payload.progress,
    assigneeId: payload.owner,
    conflicted: atom.conflicted === true ? true : undefined,
    provenance: {
      candidateRef: atom.candidateRef,
      sourcePath: atom.sourceLocator?.path,
      sourceSection: atom.sourceLocator?.section,
      sourceRow: atom.sourceLocator?.row,
      sourceHash: atom.sourceHash,
      assertionCount: atom.sourceAssertions?.length ?? 0,
    },
  };
}

/** Deterministic hierarchical order: depth-first, siblings by canonical ref. */
function orderNodes(nodes) {
  const byParent = new Map();
  for (const node of nodes) {
    const key = node.parentCanonicalRef ?? "__root__";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(node);
  }
  for (const bucket of byParent.values()) {
    bucket.sort((left, right) => {
      const rank = (TYPE_RANK[left.type] ?? 99) - (TYPE_RANK[right.type] ?? 99);
      if (rank !== 0) return rank;
      // Logical id keeps sibling order meaningful; canonical ref is the
      // tie-breaker that guarantees a total, content-independent ordering.
      const byId = String(left.id ?? "").localeCompare(String(right.id ?? ""));
      return byId !== 0 ? byId : left.canonicalRef.localeCompare(right.canonicalRef);
    });
  }
  const ordered = [];
  const seen = new Set();
  const walk = (key) => {
    for (const node of byParent.get(key) ?? []) {
      if (seen.has(node.canonicalRef)) continue;
      seen.add(node.canonicalRef);
      ordered.push(node);
      walk(node.canonicalRef);
    }
  };
  walk("__root__");
  // Orphans (parent filtered out of this view) still surface, never vanish.
  for (const node of nodes) {
    if (!seen.has(node.canonicalRef)) {
      seen.add(node.canonicalRef);
      ordered.push(node);
    }
  }
  return ordered;
}

/**
 * @param {{store: object, revision?: string, viewDefinition?: string,
 *          now?: () => string}} options
 * @returns {Promise<{manifest: object, nodes: Array, omitted: Array, unresolved: Array}>}
 */
export async function compileRoadmapView({
  store,
  revision,
  viewDefinition = "roadmap-board",
  now = () => new Date().toISOString(),
}) {
  const definition = VIEW_DEFINITIONS[viewDefinition];
  if (!definition) throw new Error(`Unknown view definition: ${viewDefinition}`);

  const graph = revision ? await store.readRevision(revision) : await store.readHead();
  if (graph.empty) throw new Error("Cannot compile a view from an empty canonical graph.");

  const parentOf = new Map();
  for (const relation of graph.relations) {
    if (relation.type === "contains") parentOf.set(relation.toRef, relation.fromRef);
  }

  const included = graph.atoms.filter((atom) => {
    if (!definition.includeKinds) return true;
    return definition.includeKinds.includes(atom.payload?.type ?? atom.kind);
  });
  const includedRefs = new Set(included.map((atom) => atom.canonicalRef));

  const nodes = orderNodes(included.map((atom) => {
    const parent = parentOf.get(atom.canonicalRef);
    return toViewNode(atom, includedRefs.has(parent) ? parent : undefined);
  }));

  // CSIR-FR-045: what this view does NOT show must be visible, not silent.
  const omitted = graph.atoms
    .filter((atom) => !includedRefs.has(atom.canonicalRef))
    .map((atom) => ({ canonicalRef: atom.canonicalRef, kind: atom.payload?.type ?? atom.kind, reason: "view-definition-filter" }))
    .sort((left, right) => left.canonicalRef.localeCompare(right.canonicalRef));

  const unresolved = included
    .filter((atom) => atom.payload?.parentId && !parentOf.has(atom.canonicalRef))
    .map((atom) => ({ canonicalRef: atom.canonicalRef, parentId: atom.payload.parentId, reason: "unresolved-parent" }))
    .sort((left, right) => left.canonicalRef.localeCompare(right.canonicalRef));

  const conflicted = included
    .filter((atom) => atom.conflicted)
    .map((atom) => ({ canonicalRef: atom.canonicalRef, reason: "contradictory-source-assertions" }));

  const payload = { nodes, omitted, unresolved, conflicted };
  return {
    manifest: {
      schema_version: VIEW_SCHEMA_VERSION,
      graphRevision: graph.revision,
      graphHash: graph.graphHash,
      viewDefinition: definition.id,
      templateVersion: TEMPLATE_VERSION,
      generatedAt: now(),
      nodeCount: nodes.length,
      // Identifies the projected content independently of generation time, so
      // determinism can be asserted without freezing the clock.
      contentHash: sha256(stableStringify(payload)),
    },
    ...payload,
  };
}
