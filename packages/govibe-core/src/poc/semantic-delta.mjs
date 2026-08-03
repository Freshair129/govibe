/**
 * POC reverse path (TDD-POC-CANONICAL-LOOP phase 5).
 *
 * A managed-view edit becomes a semantic delta candidate (CSIR-FR-050), is
 * validated against the view's base revision (CSIR-FR-051), preserves every
 * canonical field outside the declared edit set (CSIR-FR-053), and is applied
 * through the SAME canonicalization and authority path as any other candidate
 * (CSIR-FR-054) — a view edit never becomes canonical on its own (CSIR-FR-055).
 */
import { sha256, stableStringify } from "./candidate-extractor.mjs";
import { promoteCandidates } from "./promotion-runner.mjs";

export const DELTA_SCHEMA_VERSION = "govibe-semantic-delta/v1";

export class StaleDeltaError extends Error {
  constructor(baseRevision, headRevision) {
    super(`Semantic delta is stale: based on ${baseRevision} but head is ${headRevision}.`);
    this.name = "StaleDeltaError";
    this.code = "STALE_SEMANTIC_DELTA";
    this.baseRevision = baseRevision;
    this.headRevision = headRevision;
  }
}

/**
 * @param {{view: object, canonicalRef: string, edits: Record<string, unknown>}} input
 */
export function proposeSemanticDelta({ view, canonicalRef, edits }) {
  if (!view?.manifest?.graphRevision) throw new TypeError("A compiled view with a manifest is required.");
  const node = view.nodes.find((entry) => entry.canonicalRef === canonicalRef);
  if (!node) throw new Error(`Canonical ref is not present in this view: ${canonicalRef}`);
  const editKeys = Object.keys(edits ?? {});
  if (editKeys.length === 0) throw new TypeError("A semantic delta requires at least one edit.");

  return {
    schema_version: DELTA_SCHEMA_VERSION,
    baseRevision: view.manifest.graphRevision,
    baseGraphHash: view.manifest.graphHash,
    viewDefinition: view.manifest.viewDefinition,
    canonicalRef,
    candidateRef: node.provenance.candidateRef,
    editSet: editKeys.sort(),
    edits: { ...edits },
  };
}

/**
 * @returns {Promise<{revision: string, decisions: Array, preservedFields: Array<string>}>}
 */
export async function applySemanticDelta({ store, mspClient, delta, actor, runId, now = () => new Date().toISOString() }) {
  if (delta?.schema_version !== DELTA_SCHEMA_VERSION) throw new TypeError("Invalid semantic delta schema.");

  const head = await store.readHead();
  // CSIR-FR-051/052: an edit computed against an older graph is rejected, not
  // merged blind.
  if (head.revision !== delta.baseRevision) throw new StaleDeltaError(delta.baseRevision, head.revision);

  const atom = head.atoms.find((entry) => entry.canonicalRef === delta.canonicalRef);
  if (!atom) throw new Error(`Canonical atom not found: ${delta.canonicalRef}`);

  const unknownFields = delta.editSet.filter((field) => !(field in atom.payload));
  if (unknownFields.length > 0) {
    throw new Error(`Semantic delta targets unknown canonical fields: ${unknownFields.join(", ")}`);
  }

  // CSIR-FR-053: start from the full canonical payload; only the declared edit
  // set may differ.
  const nextPayload = { ...atom.payload, ...delta.edits };
  const preservedFields = Object.keys(atom.payload).filter((field) => !delta.editSet.includes(field));

  const candidate = {
    candidate_ref: atom.candidateRef,
    kind: atom.kind,
    logical_id: atom.logicalId,
    source_hash: sha256(stableStringify(nextPayload)),
    source_locator: atom.sourceLocator,
    origin: {
      kind: "semantic-delta",
      viewDefinition: delta.viewDefinition,
      baseRevision: delta.baseRevision,
      editSet: delta.editSet,
    },
    payload: nextPayload,
  };

  const extraction = {
    sourceRef: atom.sourceLocator?.path,
    sourceHash: sha256(stableStringify(delta)),
    candidates: [candidate],
  };

  const outcome = await promoteCandidates({ extraction, store, mspClient, actor, runId, now });

  const committed = await store.readHead();
  const updated = committed.atoms.find((entry) => entry.canonicalRef === delta.canonicalRef);
  for (const field of preservedFields) {
    if (stableStringify(updated.payload[field]) !== stableStringify(atom.payload[field])) {
      throw new Error(`Semantic delta mutated a field outside its edit set: ${field}`);
    }
  }

  return { ...outcome, preservedFields, canonicalRef: delta.canonicalRef };
}
