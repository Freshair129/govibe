const HASH = /^[a-f0-9]{64}$/i;
const CANDIDATE_PREFIXES = ["candidate:", "govibe:candidate/"];

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} is required.`);
  return value.trim();
}

function requireCandidateRef(value, label = "candidateRef") {
  const ref = requireString(value, label);
  if (!CANDIDATE_PREFIXES.some((prefix) => ref.startsWith(prefix))) {
    throw new TypeError(`${label} must remain in a candidate namespace.`);
  }
  return ref;
}

function requireCanonicalRef(value, label) {
  const ref = requireString(value, label);
  if (!ref.startsWith("gks:")) throw new Error(`${label} must be a canonical GKS reference.`);
  if (CANDIDATE_PREFIXES.some((prefix) => ref.startsWith(prefix))) throw new Error(`${label} cannot reuse a candidate identifier.`);
  return ref;
}

function requireHash(value, label) {
  if (!HASH.test(value ?? "")) throw new Error(`${label} must be a SHA-256 hash.`);
  return value.toLowerCase();
}

function normalizeMappings(items = []) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("MSP returned no canonical mappings.");
  const seenCandidates = new Set();
  const seenCanonical = new Set();
  return items.map((item, index) => {
    requireObject(item, `mapping[${index}]`);
    const candidateRef = requireCandidateRef(item.candidate_ref ?? item.candidateRef, `mapping[${index}].candidateRef`);
    const canonicalRef = requireCanonicalRef(item.canonical_ref ?? item.canonicalRef, `mapping[${index}].canonicalRef`);
    if (seenCandidates.has(candidateRef)) throw new Error(`Duplicate candidate mapping: ${candidateRef}`);
    if (seenCanonical.has(canonicalRef)) throw new Error(`Duplicate canonical mapping: ${canonicalRef}`);
    seenCandidates.add(candidateRef);
    seenCanonical.add(canonicalRef);
    return {
      candidateRef,
      canonicalRef,
      sourceHash: requireHash(item.source_hash ?? item.sourceHash, `mapping[${index}].sourceHash`),
      version: requireString(item.version, `mapping[${index}].version`),
    };
  });
}

function normalizeRelations(items = [], canonicalRefs) {
  if (!Array.isArray(items)) throw new Error("Canonical relations must be an array.");
  return items.map((item, index) => {
    requireObject(item, `relation[${index}]`);
    const fromRef = requireCanonicalRef(item.from_ref ?? item.fromRef, `relation[${index}].fromRef`);
    const toRef = requireCanonicalRef(item.to_ref ?? item.toRef, `relation[${index}].toRef`);
    if (!canonicalRefs.has(fromRef) || !canonicalRefs.has(toRef)) {
      throw new Error("Canonical relation endpoint is not present in the materialization mapping.");
    }
    return {
      relationRef: requireCanonicalRef(item.relation_ref ?? item.relationRef, `relation[${index}].relationRef`),
      fromRef,
      toRef,
      type: requireString(item.type, `relation[${index}].type`),
      version: requireString(item.version, `relation[${index}].version`),
    };
  });
}

export function validateCanonicalMaterializationRequest(input) {
  requireObject(input, "materialization request");
  if (input.schema_version !== "govibe-canonical-materialization-request/v1") {
    throw new TypeError("Invalid canonical materialization request schema version.");
  }
  requireString(input.actor, "actor");
  requireString(input.run_id, "run_id");
  requireString(input.idempotency_key, "idempotency_key");
  requireHash(input.source_snapshot_hash, "source_snapshot_hash");
  if (!Array.isArray(input.candidates) || input.candidates.length === 0) throw new TypeError("At least one candidate is required.");
  for (const [index, candidate] of input.candidates.entries()) {
    requireObject(candidate, `candidate[${index}]`);
    requireCandidateRef(candidate.candidate_ref, `candidate[${index}].candidate_ref`);
    requireString(candidate.kind, `candidate[${index}].kind`);
    requireHash(candidate.source_hash, `candidate[${index}].source_hash`);
  }
}

export async function materializeCanonicalKnowledge({ mspClient, request }) {
  if (!mspClient || typeof mspClient.call !== "function") throw new Error("MSP parent capability is unavailable.");
  validateCanonicalMaterializationRequest(request);
  const result = await mspClient.call("msp_knowledge_materialize", request);
  requireObject(result, "materialization response");
  if (result.schema_version !== "govibe-canonical-materialization-result/v1") {
    throw new Error("MSP returned an invalid materialization response schema.");
  }
  const mappings = normalizeMappings(result.mappings);
  const requested = new Set(request.candidates.map((item) => item.candidate_ref));
  const returned = new Set(mappings.map((item) => item.candidateRef));
  if (requested.size !== returned.size || [...requested].some((ref) => !returned.has(ref))) {
    throw new Error("MSP materialization response does not cover the complete candidate set.");
  }
  const canonicalRefs = new Set(mappings.map((item) => item.canonicalRef));
  return {
    materializationRef: requireString(result.materialization_ref, "materialization_ref"),
    promotionRef: requireString(result.promotion_ref, "promotion_ref"),
    mappings,
    relations: normalizeRelations(result.relations ?? [], canonicalRefs),
    graphVersion: requireString(result.graph_version, "graph_version"),
    sourceHash: requireHash(result.source_hash, "source_hash"),
    idempotentReplay: result.idempotent_replay === true,
  };
}
