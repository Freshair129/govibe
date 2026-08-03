/**
 * POC promotion runner (TDD-POC-CANONICAL-LOOP phase 1).
 *
 * The single write path from observed candidates to canonical state. It builds
 * a materialization request and hands it to the production
 * `materializeCanonicalKnowledge` contract — the runner never mints canonical
 * identity itself and never writes the store without a validated response
 * (CSIR-FR-025).
 */
import { materializeCanonicalKnowledge } from "../canonical-materialization.mjs";
import { extractRoadmapCandidates, sha256, stableStringify } from "./candidate-extractor.mjs";

export const REQUEST_SCHEMA_VERSION = "govibe-canonical-materialization-request/v1";

/** Same content + same candidate set => same key => idempotent replay. */
export function idempotencyKeyFor(sourceHash, candidates) {
  const fingerprint = candidates
    .map((candidate) => `${candidate.candidate_ref}:${candidate.source_hash}`)
    .sort()
    .join("|");
  return sha256(`${sourceHash}|${fingerprint}`);
}

export function buildMaterializationRequest({ extraction, actor, runId }) {
  return {
    schema_version: REQUEST_SCHEMA_VERSION,
    actor,
    run_id: runId,
    idempotency_key: idempotencyKeyFor(extraction.sourceHash, extraction.candidates),
    source_snapshot_hash: extraction.sourceHash,
    source_ref: extraction.sourceRef,
    candidates: extraction.candidates,
  };
}

/**
 * Promote one already-extracted candidate set.
 *
 * @returns {Promise<{revision: string, committed: boolean, decisions: Array, unresolved: Array}>}
 */
export async function promoteCandidates({ extraction, store, mspClient, actor, runId, now = () => new Date().toISOString() }) {
  const request = buildMaterializationRequest({ extraction, actor, runId });
  // Contract gate: throws on schema drift, candidate-ref reuse, duplicate or
  // incomplete mappings, and non-canonical refs.
  const result = await materializeCanonicalKnowledge({ mspClient, request });

  if (result.idempotentReplay) {
    const head = await store.readHead();
    return {
      revision: head.revision,
      committed: false,
      idempotentReplay: true,
      materializationRef: result.materializationRef,
      promotionRef: result.promotionRef,
      decisions: [],
      unresolved: [],
    };
  }

  const record = mspClient.getMaterializationRecord(result.materializationRef);
  const byCanonicalRef = new Map(record.atoms.map((atom) => [atom.canonicalRef, atom]));

  // Cross-check: the atoms the authority reports must line up exactly with the
  // validated mapping. A mismatch is a boundary violation, not a warning.
  for (const mapping of result.mappings) {
    const atom = byCanonicalRef.get(mapping.canonicalRef);
    if (!atom || atom.candidateRef !== mapping.candidateRef) {
      throw new Error(`Materialization record does not match the validated mapping for ${mapping.canonicalRef}.`);
    }
    if (atom.sourceHash !== mapping.sourceHash) {
      throw new Error(`Source hash mismatch for ${mapping.canonicalRef}.`);
    }
  }

  const committedAt = now();
  const revision = await store.commit({
    atoms: record.atoms.map((atom) => ({
      ...atom,
      firstSeenRevision: atom.firstSeenRevision ?? null,
      graphVersion: result.graphVersion,
    })),
    relations: result.relations.map((relation) => ({
      ...relation,
      provenance: record.relationProvenance?.[relation.relationRef] ?? null,
    })),
    promotionRef: result.promotionRef,
    materializationRef: result.materializationRef,
    sourceHash: result.sourceHash,
    actor,
    runId,
    committedAt,
  });

  return {
    revision: revision.revision,
    graphHash: revision.graphHash,
    committed: true,
    idempotentReplay: false,
    materializationRef: result.materializationRef,
    promotionRef: result.promotionRef,
    decisions: record.decisions,
    unresolved: record.unresolved,
  };
}

/** Convenience: extract a Markdown artifact and promote it in one pass. */
export async function promoteRoadmapSource({ sourcePath, text, store, mspClient, actor, runId, now }) {
  const extraction = extractRoadmapCandidates({ sourcePath, text });
  const outcome = await promoteCandidates({ extraction, store, mspClient, actor, runId, now });
  return { ...outcome, extraction };
}

export { stableStringify };
