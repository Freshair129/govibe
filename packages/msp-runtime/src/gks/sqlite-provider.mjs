import { createHash, randomUUID } from "node:crypto";

const HASH = /^[a-f0-9]{64}$/i;

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} is required.`);
  return value.trim();
}

function resolveWorkspaceId(candidate) {
  return requireString(candidate.workspace_id ?? candidate.workspaceId ?? candidate.workspace?.id, "workspace_id");
}

function resolveAtomRef(candidate) {
  const value = candidate.atom_ref ?? candidate.atomRef ?? candidate.atom?.ref ?? candidate.atom?.id ?? null;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resolveSourceVersion(candidate) {
  const value = candidate.source_version ?? candidate.sourceVersion ?? candidate.version ?? "1";
  return String(value);
}

function normalizeSourceHashes(sourceHashes) {
  if (!Array.isArray(sourceHashes) || sourceHashes.length === 0) throw new TypeError("sourceHashes must contain at least one authorized SHA-256 digest.");
  const normalized = [...new Set(sourceHashes.map((value) => String(value).replace(/^sha256:/i, "").toLowerCase()))];
  if (normalized.some((value) => !HASH.test(value))) throw new TypeError("sourceHashes must contain only SHA-256 hex digests.");
  return normalized;
}

function candidateLineage(candidateJson, legacyAtomRef) {
  let envelope;
  try { envelope = JSON.parse(candidateJson); } catch { envelope = {}; }
  const payload = envelope?.candidate && typeof envelope.candidate === "object" ? envelope.candidate : {};
  const candidates = [
    ...(Array.isArray(payload.atoms) ? payload.atoms : []),
    ...(Array.isArray(payload.symbols) ? payload.symbols : []),
  ];
  const atomRefs = [...new Set([
    ...(legacyAtomRef ? [legacyAtomRef] : []),
    ...candidates.map((item) => item?.id).filter((value) => typeof value === "string" && value),
  ])];
  const sourceRefs = new Set();
  for (const item of candidates) {
    const direct = item?.path ?? item?.props?.path;
    if (typeof direct === "string" && direct) sourceRefs.add(direct);
    for (const source of Array.isArray(item?.sourceRefs) ? item.sourceRefs : []) {
      if (typeof source?.file === "string" && source.file) sourceRefs.add(source.file);
    }
  }
  return { atomRefs, sourceRefs: [...sourceRefs] };
}

/** Backend-neutral first-slice GKS provider behind the MSP process. */
export function createSqliteGksProvider({ db, clock = () => new Date() }) {
  const selectByIdempotency = db.prepare("SELECT * FROM gks_knowledge WHERE idempotency_key = ?");
  const insertKnowledge = db.prepare(`
    INSERT INTO gks_knowledge (
      knowledge_ref, idempotency_key, workspace_id, run_id, stage,
      source_snapshot_hash, source_version, provenance_ref, atom_ref,
      canonical_hash, candidate_json, created_at
    ) VALUES (
      @knowledge_ref, @idempotency_key, @workspace_id, @run_id, @stage,
      @source_snapshot_hash, @source_version, @provenance_ref, @atom_ref,
      @canonical_hash, @candidate_json, @created_at
    )
  `);
  const insertRetrievalEvidence = db.prepare(`
    INSERT INTO gks_retrieval_evidence (
      retrieval_ref, workspace_id, agent_id, context_id, policy_decision,
      radius, budget, returned_count, query_hash, created_at
    ) VALUES (
      @retrieval_ref, @workspace_id, @agent_id, @context_id, @policy_decision,
      @radius, @budget, @returned_count, @query_hash, @created_at
    )
  `);

  const promoteTx = db.transaction((candidate) => {
    const existing = selectByIdempotency.get(candidate.idempotency_key);
    if (existing) return { knowledge_ref: existing.knowledge_ref, source_hash: existing.source_snapshot_hash, version: existing.source_version };

    const workspaceId = resolveWorkspaceId(candidate);
    const runId = requireString(candidate.run_id, "run_id");
    const idempotencyKey = requireString(candidate.idempotency_key, "idempotency_key");
    const provenanceRef = requireString(candidate.provenance_ref, "provenance_ref");
    if (!Number.isInteger(candidate.stage) || candidate.stage < 1 || candidate.stage > 12) throw new TypeError("stage must be an integer from 1 through 12.");
    if (!HASH.test(candidate.source_snapshot_hash ?? "")) throw new TypeError("source_snapshot_hash must be a SHA-256 hex digest.");

    const candidateJson = stableStringify(candidate);
    const canonicalHash = sha256(candidateJson);
    const knowledgeRef = `gks:knowledge/${canonicalHash}`;
    const sourceVersion = resolveSourceVersion(candidate);
    insertKnowledge.run({
      knowledge_ref: knowledgeRef,
      idempotency_key: idempotencyKey,
      workspace_id: workspaceId,
      run_id: runId,
      stage: candidate.stage,
      source_snapshot_hash: candidate.source_snapshot_hash.toLowerCase(),
      source_version: sourceVersion,
      provenance_ref: provenanceRef,
      atom_ref: resolveAtomRef(candidate),
      canonical_hash: canonicalHash,
      candidate_json: candidateJson,
      created_at: clock().toISOString(),
    });
    return { knowledge_ref: knowledgeRef, source_hash: candidate.source_snapshot_hash.toLowerCase(), version: sourceVersion };
  });

  return {
    promote(candidate) {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) throw new TypeError("Knowledge candidate is required.");
      return promoteTx(candidate);
    },

    retrieve({ workspaceId, agentId, contextId = null, radius, budget, sourceHashes }) {
      const safeWorkspaceId = requireString(workspaceId, "workspaceId");
      const safeAgentId = requireString(agentId, "agentId");
      if (!Number.isInteger(radius) || radius < 0) throw new TypeError("radius must be a non-negative integer.");
      if (!Number.isInteger(budget) || budget < 1) throw new TypeError("budget must be a positive integer.");
      const safeSourceHashes = normalizeSourceHashes(sourceHashes);
      const limit = Math.min(budget, 1000);
      const placeholders = safeSourceHashes.map(() => "?").join(", ");
      const rows = db.prepare(`
        SELECT knowledge_ref, source_snapshot_hash, source_version, provenance_ref,
               atom_ref, canonical_hash, candidate_json, run_id, stage, created_at
        FROM gks_knowledge
        WHERE workspace_id = ?
          AND source_snapshot_hash IN (${placeholders})
        ORDER BY created_at DESC, knowledge_ref ASC
        LIMIT ?
      `).all(safeWorkspaceId, ...safeSourceHashes, limit);
      const items = rows.map((row) => {
        const lineage = candidateLineage(row.candidate_json, row.atom_ref);
        return {
          ref: row.knowledge_ref,
          sourceHash: row.source_snapshot_hash,
          version: row.source_version,
          provenanceRef: row.provenance_ref,
          atomRef: row.atom_ref,
          atomRefs: lineage.atomRefs,
          sourceRefs: lineage.sourceRefs,
          canonicalHash: row.canonical_hash,
          runId: row.run_id,
          stage: row.stage,
        };
      });
      const queryHash = sha256(stableStringify({ workspaceId: safeWorkspaceId, agentId: safeAgentId, radius, budget, sourceHashes: safeSourceHashes }));
      const retrievalRef = `gks:retrieval/${randomUUID()}`;
      insertRetrievalEvidence.run({
        retrieval_ref: retrievalRef,
        workspace_id: safeWorkspaceId,
        agent_id: safeAgentId,
        context_id: contextId,
        policy_decision: "allow",
        radius,
        budget,
        returned_count: items.length,
        query_hash: queryHash,
        created_at: clock().toISOString(),
      });
      return { items, retrieval_ref: retrievalRef, query_hash: queryHash };
    },

    health() {
      db.prepare("SELECT 1 AS ok FROM gks_knowledge LIMIT 1").get();
      return { state: "ready", reason: null, evidence_ref: `msp:health/gks-sqlite/${sha256(String(db.name ?? "msp-db")).slice(0, 16)}` };
    },
  };
}