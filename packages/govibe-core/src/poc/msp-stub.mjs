/**
 * POC MSP authority stub (TDD-POC-CANONICAL-LOOP).
 *
 * Stands in for the MSP promotion boundary plus GKS identity assignment. It is
 * a STUB in deployment terms only: every response must satisfy the production
 * `canonical-materialization` validator, and no caller may reach the store
 * without passing through here (CSIR-FR-025).
 *
 * Identity rules implemented:
 *   - canonical refs are minted deterministically from the candidate ref, so a
 *     re-promotion of the same logical item reuses its identity (CSIR-FR-011/021)
 *   - every decision is recorded as reuse | create | conflict | human_review
 *     with contributing evidence (CSIR-FR-013/014)
 *   - contradictory assertions from different sources create an explicit
 *     conflict record and BOTH assertions are preserved (CSIR-FR-022/023)
 */
import { sha256, stableStringify } from "./candidate-extractor.mjs";

export const MATERIALIZE_CAPABILITY = "msp_knowledge_materialize";
const RESULT_SCHEMA = "govibe-canonical-materialization-result/v1";

function canonicalAtomRef(candidateRef) {
  return `gks:atom/${sha256(candidateRef).slice(0, 16)}`;
}

function canonicalRelationRef(fromRef, toRef, type) {
  return `gks:relation/${sha256(`${fromRef}|${type}|${toRef}`).slice(0, 16)}`;
}

/**
 * @param {{store: object, graphVersionPrefix?: string}} options
 */
export function createMspStub({ store, now = () => new Date().toISOString() }) {
  if (!store || typeof store.readHead !== "function") throw new TypeError("MSP stub requires a canonical store.");
  const decisions = [];
  const replays = new Map();
  // Authority-owned state that the wire contract deliberately does not carry.
  // Callers read it back through this same MSP boundary, never around it.
  const records = new Map();

  async function materialize(request) {
    if (replays.has(request.idempotency_key)) {
      return { ...replays.get(request.idempotency_key), idempotent_replay: true };
    }

    const head = await store.readHead();
    const existingByCandidate = new Map(head.atoms.map((atom) => [atom.candidateRef, atom]));
    const batchDecisions = [];
    const atoms = [];
    const mappings = [];

    for (const candidate of request.candidates) {
      const canonicalRef = canonicalAtomRef(candidate.candidate_ref);
      const prior = existingByCandidate.get(candidate.candidate_ref);
      const assertion = {
        sourceRef: candidate.source_locator?.path ?? request.source_ref,
        sourceHash: candidate.source_hash,
        locator: candidate.source_locator,
        payload: candidate.payload,
        // Records HOW this assertion arrived (file ingestion vs a view edit) so
        // a reverse delta stays auditable without being mistaken for an
        // independent contradicting source.
        origin: candidate.origin ?? { kind: "source-artifact" },
        recordedAt: now(),
      };

      let decision = prior ? "reuse" : "create";
      let conflict = null;
      const assertions = prior ? [...prior.sourceAssertions] : [];

      if (prior) {
        const contradicting = assertions.find((entry) => entry.sourceRef !== assertion.sourceRef
          && stableStringify(entry.payload) !== stableStringify(assertion.payload));
        if (contradicting) {
          decision = "conflict";
          conflict = {
            canonicalRef,
            reason: "contradictory-source-assertions",
            sources: [contradicting.sourceRef, assertion.sourceRef],
          };
        }
      }
      // Same source re-asserting: supersede that source's prior assertion,
      // never drop assertions owned by other sources.
      const preserved = assertions.filter((entry) => entry.sourceRef !== assertion.sourceRef);

      atoms.push({
        canonicalRef,
        candidateRef: candidate.candidate_ref,
        kind: candidate.kind,
        logicalId: candidate.logical_id,
        payload: candidate.payload,
        sourceHash: candidate.source_hash,
        sourceLocator: candidate.source_locator,
        sourceAssertions: [...preserved, assertion],
        conflicted: Boolean(conflict),
        firstSeenRevision: prior?.firstSeenRevision ?? null,
      });

      mappings.push({
        candidate_ref: candidate.candidate_ref,
        canonical_ref: canonicalRef,
        source_hash: candidate.source_hash,
        version: request.graph_version_hint ?? "1",
      });

      batchDecisions.push({
        candidateRef: candidate.candidate_ref,
        canonicalRef,
        decision,
        evidence: {
          priorCanonicalIdentity: Boolean(prior),
          logicalId: candidate.logical_id,
          payloadChanged: prior ? prior.sourceHash !== candidate.source_hash : null,
        },
        conflict,
      });
    }

    // Relations are assigned by the authority, not proposed by the front-end
    // (CSIR-FR-030/031). Only intra-batch endpoints can be emitted; anything
    // else is reported as unresolved rather than invented.
    const byLogicalId = new Map(request.candidates.map((candidate, index) => [candidate.logical_id, mappings[index].canonical_ref]));
    const relations = [];
    const unresolved = [];
    for (const [index, candidate] of request.candidates.entries()) {
      const parentId = candidate.payload?.parentId;
      if (!parentId) continue;
      const toRef = mappings[index].canonical_ref;
      const fromRef = byLogicalId.get(parentId);
      if (!fromRef || fromRef === toRef) {
        unresolved.push({ canonicalRef: toRef, parentId, reason: fromRef ? "self-reference" : "parent-not-in-scope" });
        continue;
      }
      relations.push({
        relation_ref: canonicalRelationRef(fromRef, toRef, "contains"),
        from_ref: fromRef,
        to_ref: toRef,
        type: "contains",
        version: "1",
        provenance: { derivedFrom: candidate.candidate_ref, rule: "declared-parent-id" },
      });
    }

    const result = {
      schema_version: RESULT_SCHEMA,
      materialization_ref: `gks:materialization/${sha256(request.idempotency_key).slice(0, 16)}`,
      promotion_ref: `msp:promotion/${sha256(`${request.run_id}|${request.idempotency_key}`).slice(0, 16)}`,
      mappings,
      relations,
      graph_version: String(head.sequence + 1),
      source_hash: request.source_snapshot_hash,
      idempotent_replay: false,
    };

    decisions.push(...batchDecisions);
    replays.set(request.idempotency_key, result);
    records.set(result.materialization_ref, {
      atoms,
      decisions: batchDecisions,
      unresolved,
      relationProvenance: Object.fromEntries(relations.map((relation) => [relation.relation_ref, relation.provenance])),
    });
    return result;
  }

  return {
    async call(capability, request) {
      if (capability !== MATERIALIZE_CAPABILITY) {
        throw new Error(`MSP stub does not expose capability: ${capability}`);
      }
      return materialize(request);
    },
    /**
     * Read back the authority-owned outcome of one materialization. This is an
     * MSP-mediated read, not a store bypass: the caller still cannot write
     * canonical state without a validated materialization.
     */
    getMaterializationRecord(materializationRef) {
      const record = records.get(materializationRef);
      if (!record) throw new Error(`Unknown materialization: ${materializationRef}`);
      return record;
    },
    /** Audit surface: every identity decision this authority has taken. */
    listDecisions() {
      return decisions.map((entry) => ({ ...entry }));
    },
  };
}
