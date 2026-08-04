// transport/handlers/lifecycle-handlers: msp_evidence_record,
// msp_knowledge_promote (fail-closed stub), msp_memory_promote (WP-13
// Bounded Scope item 6).
import { proofRef, memoryPromotionRef } from "../../contracts/refs.mjs";
import { rejectCanonicalCandidate, requireNoGksRefs } from "../../contracts/namespace-guard.mjs";
import { GksProviderUnconfiguredError, ValidationError } from "../../contracts/errors.mjs";

const HASH = /^[a-f0-9]{64}$/i;
// Mirrors packages/govibe-core/src/msp-client.mjs's KNOWLEDGE_FIELDS
// exactly: a proof batch must not smuggle in knowledge-shaped content.
const KNOWLEDGE_FIELDS = ["atoms", "symbols", "relations", "nodes", "edges", "communities", "processes", "context_snapshots"];

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new ValidationError(`${label} is required.`);
  return value.trim();
}

function resolveActor(args) {
  if (typeof args.actor === "string" && args.actor.trim()) return args.actor.trim();
  if (typeof args.run_id === "string" && args.run_id.trim()) return args.run_id.trim();
  return "system";
}

// Re-validates the exact shape validateProofBatch in
// packages/govibe-core/src/msp-client.mjs already enforces client-side --
// defense in depth, not trust in the caller (WP-13 Bounded Scope item 3):
// schema_version, idempotency_key, run_id, stage 0-12, source_snapshot_hash
// (64-hex), verification.verdict in actual/blocked/failed/passed, and no
// KNOWLEDGE_FIELDS present anywhere in the batch.
function validateProofBatch(input) {
  if (!input || typeof input !== "object") throw new ValidationError("Proof batch is required.");
  if (KNOWLEDGE_FIELDS.some((field) => field in input)) {
    throw new ValidationError("MSP proof batches cannot contain knowledge fields.");
  }
  if (input.schema_version !== "govibe-proof-batch/v1") throw new ValidationError("Invalid proof batch schema version.");
  requireString(input.idempotency_key, "idempotency_key");
  requireString(input.run_id, "run_id");
  if (!Number.isInteger(input.stage) || input.stage < 0 || input.stage > 12) {
    throw new ValidationError("Proof batch stage must be 0-12.");
  }
  if (!HASH.test(input.source_snapshot_hash ?? "")) throw new ValidationError("Proof batch source snapshot hash is invalid.");
  if (!["actual", "blocked", "failed", "passed"].includes(input.verification?.verdict)) {
    throw new ValidationError("Invalid verification verdict.");
  }
}

export function createLifecycleHandlers({ db, entityStore, vaultRegistry, journal }) {
  const selectPromotion = db.prepare("SELECT * FROM promotions WHERE idempotency_key = ?");
  const insertPromotion = db.prepare(`
    INSERT INTO promotions (promotion_ref, idempotency_key, source_memory_ref, target_scope, target_ref, policy_decision, source_hash, recorded_at)
    VALUES (@promotion_ref, @idempotency_key, @source_memory_ref, @target_scope, @target_ref, @policy_decision, @source_hash, @recorded_at)
  `);

  // AC-04: the whole idempotency-check-then-write path runs inside one
  // db.transaction() (better-sqlite3 nests entity-store's own internal
  // transaction() call as a SAVEPOINT) so a retry with the same
  // idempotency_key can never observe or create a duplicate entity, even
  // under pipelined concurrent calls.
  const runGlobalPrivatePromotion = db.transaction(({ actor, agentId, idempotencyKey, sourceMemoryRef, targetScope, candidate, evidenceRefs, reason }) => {
    const existing = selectPromotion.get(idempotencyKey);
    if (existing) {
      return {
        promotion_ref: existing.promotion_ref,
        target_ref: existing.target_ref,
        policy_decision: existing.policy_decision,
        source_hash: existing.source_hash,
      };
    }

    vaultRegistry.provisionGlobalPrivateVault(agentId);

    const { entity } = entityStore.upsert({
      category: "memory-promotion",
      key: idempotencyKey,
      bodyJson: { candidate, sourceMemoryRef, evidenceRefs, reason },
      actor,
      reason: "memory_promote:global_private",
    });

    const promotion_ref = memoryPromotionRef(idempotencyKey);
    insertPromotion.run({
      promotion_ref,
      idempotency_key: idempotencyKey,
      source_memory_ref: sourceMemoryRef,
      target_scope: targetScope,
      target_ref: entity.entity_id,
      policy_decision: "allow",
      source_hash: entity.source_hash,
      recorded_at: new Date().toISOString(),
    });

    return { promotion_ref, target_ref: entity.entity_id, policy_decision: "allow", source_hash: entity.source_hash };
  });

  return {
    // Request fields as built by recordEvidence in msp-client.mjs: whatever
    // shape validateProofBatch accepts, forwarded verbatim.
    async msp_evidence_record(args = {}) {
      validateProofBatch(args);
      const actor = resolveActor(args);
      const ref = proofRef(args.idempotency_key);

      journal.append({
        actor,
        toolName: "msp_evidence_record",
        ref,
        workspaceId: args.workspace_id ?? null,
        payload: {
          idempotency_key: args.idempotency_key,
          run_id: args.run_id,
          stage: args.stage,
          verdict: args.verification?.verdict,
        },
        policyDecision: "allow",
      });

      return { proof_ref: ref };
    },

    // Fail-closed stub (WP-13 Bounded Scope item 6, AC-03): no GKS provider
    // exists in v1 (ADR-027). This always throws, regardless of how
    // well-formed the candidate is -- the transport layer
    // (stdio-jsonrpc-server.mjs) catches any handler throw and wraps it as
    // {isError:true, ...}, which is exactly the tool-call-error envelope
    // msp-client.mjs's call() surfaces as a rejected promise
    // (submitKnowledgeCandidate never sees a fabricated gks:-namespaced
    // success).
    async msp_knowledge_promote(args = {}) {
      journal.append({
        actor: resolveActor(args),
        toolName: "msp_knowledge_promote",
        ref: null,
        workspaceId: args.workspace_id ?? null,
        payload: { idempotency_key: args.idempotency_key ?? null, denied: true },
        policyDecision: "deny",
        reason: "gks_provider_unconfigured",
      });
      throw new GksProviderUnconfiguredError(
        "msp_knowledge_promote is a fail-closed stub: gks_provider_unconfigured (no GKS provider exists in v1, per ADR-027).",
      );
    },

    // Request fields as built by promoteMemory in
    // msp-vault-context-contracts.mjs: schema_version, actor, agent_id,
    // workspace_id, source_memory_ref, target_scope, candidate,
    // evidence_refs, reason, idempotency_key.
    async msp_memory_promote(args = {}) {
      const actor = requireString(args.actor, "actor");
      const agentId = requireString(args.agent_id, "agent_id");
      const workspaceId = requireString(args.workspace_id, "workspace_id");
      const sourceMemoryRef = requireString(args.source_memory_ref, "source_memory_ref");
      const targetScope = requireString(args.target_scope, "target_scope");
      const idempotencyKey = requireString(args.idempotency_key, "idempotency_key");
      const reason = requireString(args.reason, "reason");
      if (!Array.isArray(args.evidence_refs) || args.evidence_refs.length === 0) {
        throw new ValidationError("evidence_refs must contain at least one reference.");
      }
      // AC-06 defense in depth: reject a canonical-identity candidate or a
      // gks:-namespaced evidence/source ref server-side, independent of the
      // GoVibe-side rejectCanonicalCandidate guard that already runs before
      // this request is ever sent.
      requireNoGksRefs(args.evidence_refs, "evidence_refs");
      requireNoGksRefs([sourceMemoryRef], "source_memory_ref");
      const candidate = rejectCanonicalCandidate(args.candidate ?? {});

      if (targetScope === "shared") {
        journal.append({
          actor,
          toolName: "msp_memory_promote",
          ref: null,
          workspaceId,
          payload: { idempotency_key: idempotencyKey, target_scope: targetScope, denied: true },
          policyDecision: "deny",
          reason: "gks_provider_unconfigured",
        });
        throw new GksProviderUnconfiguredError(
          "msp_memory_promote(target_scope=shared) is a fail-closed stub: gks_provider_unconfigured (no GKS provider exists in v1, per ADR-027).",
        );
      }

      if (targetScope !== "global_private") {
        throw new ValidationError(
          `Unsupported target_scope "${targetScope}"; only "global_private" and "shared" are recognized.`,
        );
      }

      const result = runGlobalPrivatePromotion({
        actor,
        agentId,
        idempotencyKey,
        sourceMemoryRef,
        targetScope,
        candidate,
        evidenceRefs: args.evidence_refs,
        reason,
      });

      journal.append({
        actor,
        toolName: "msp_memory_promote",
        ref: result.promotion_ref,
        workspaceId,
        payload: { idempotency_key: idempotencyKey, target_scope: targetScope, target_ref: result.target_ref },
        policyDecision: "allow",
      });

      return result;
    },
  };
}
