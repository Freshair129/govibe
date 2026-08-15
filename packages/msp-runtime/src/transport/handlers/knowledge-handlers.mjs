import { createHash } from "node:crypto";

import { ValidationError } from "../../contracts/errors.mjs";

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new ValidationError(`${label} is required.`);
  return value.trim();
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeHash(value) {
  return String(value ?? "").replace(/^sha256:/i, "").toLowerCase();
}

function requireAuthority(args) {
  const authority = args.context_authority;
  if (!authority || typeof authority !== "object" || Array.isArray(authority)) throw new ValidationError("context_authority is required for GKS retrieval.", "knowledge_scope_denied");
  if (authority.schemaVersion !== "govibe-context-authority/v1") throw new ValidationError("Unsupported context authority schema.", "knowledge_scope_denied");

  const identity = authority.identity;
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) throw new ValidationError("context_authority.identity is required.", "knowledge_scope_denied");
  const workspaceId = requireString(identity.workspaceId, "context_authority.identity.workspaceId");
  const agentId = requireString(identity.agentId, "context_authority.identity.agentId");
  if (workspaceId !== requireString(args.workspace_id, "workspace_id")) throw new ValidationError("knowledge_scope_denied: workspace_id does not match context authority.", "knowledge_scope_denied");
  if (agentId !== requireString(args.agent_id, "agent_id")) throw new ValidationError("knowledge_scope_denied: agent_id does not match context authority.", "knowledge_scope_denied");

  const bounded = args.bounded_graph_query;
  if (!bounded || bounded.schema_version !== "govibe-bounded-graph-query/v1") throw new ValidationError("A validated bounded_graph_query is required.", "knowledge_scope_denied");
  const radius = Number(bounded.radius);
  if (!Number.isInteger(radius) || radius < 0 || radius > 6) throw new ValidationError("knowledge_scope_denied: retrieval radius must be an integer from 0 to 6.", "knowledge_scope_denied");
  if (!Array.isArray(bounded.relation_allowlist) || bounded.relation_allowlist.length === 0 || bounded.relation_allowlist.includes("*") || bounded.relation_allowlist.includes("unrestricted")) throw new ValidationError("knowledge_scope_denied: unrestricted traversal is prohibited.", "knowledge_scope_denied");
  const maxTokens = Number(bounded.budget?.maxTokens);
  if (!Number.isInteger(maxTokens) || maxTokens <= 0) throw new ValidationError("knowledge_scope_denied: a positive retrieval budget is required.", "knowledge_scope_denied");
  if (!Array.isArray(bounded.source_constraints) || bounded.source_constraints.length === 0) throw new ValidationError("knowledge_scope_denied: source constraints are required before retrieval.", "knowledge_scope_denied");

  const sources = Array.isArray(authority.sources) ? authority.sources : [];
  const approvedSourceHashes = new Set(bounded.source_constraints.map((source) => normalizeHash(source.hash)).filter(Boolean));
  if (approvedSourceHashes.size === 0 || sources.some((source) => !approvedSourceHashes.has(normalizeHash(source.hash)))) throw new ValidationError("knowledge_scope_denied: source constraints do not match context authority.", "knowledge_scope_denied");

  const budget = Math.max(1, Math.min(100, Math.floor(maxTokens / 256) || 1));
  return { authority, bounded, workspaceId, agentId, radius, budget, sourceHashes: [...approvedSourceHashes] };
}

export function createKnowledgeHandlers({ gksProvider, journal }) {
  if (!gksProvider || typeof gksProvider.promote !== "function" || typeof gksProvider.retrieve !== "function") throw new TypeError("createKnowledgeHandlers requires a GKS provider.");

  return {
    async msp_knowledge_promote(args = {}) {
      const result = await gksProvider.promote(args);
      const promotionRef = `msp:promotion/${sha256(requireString(args.idempotency_key, "idempotency_key"))}`;
      journal.append({
        actor: typeof args.actor === "string" && args.actor.trim() ? args.actor.trim() : args.run_id ?? "system",
        toolName: "msp_knowledge_promote",
        ref: promotionRef,
        workspaceId: args.workspace_id ?? args.workspaceId ?? args.workspace?.id ?? null,
        payload: { idempotency_key: args.idempotency_key, knowledge_ref: result.knowledge_ref, source_hash: result.source_hash, version: result.version },
        policyDecision: "allow",
      });
      return { ...result, promotion_ref: promotionRef };
    },

    async resolveKnowledgeContext(args = {}) {
      const policy = requireAuthority(args);
      const result = await gksProvider.retrieve({
        workspaceId: policy.workspaceId,
        agentId: policy.agentId,
        contextId: policy.authority.lineage?.contextId ?? null,
        radius: policy.radius,
        budget: policy.budget,
        sourceHashes: policy.sourceHashes,
      });

      const policyRef = `msp:policy/${sha256(`${policy.workspaceId}:${policy.agentId}:${result.query_hash}`)}`;
      journal.append({
        actor: policy.agentId,
        toolName: "msp_context_resolve:gks",
        ref: result.retrieval_ref,
        workspaceId: policy.workspaceId,
        payload: { retrieval_ref: result.retrieval_ref, radius: policy.radius, budget: policy.budget, returned_count: result.items.length, query_hash: result.query_hash },
        policyDecision: "allow",
      });

      return {
        shared_vault_refs: result.items.map((item) => ({ ref: item.ref, source_hash: item.sourceHash, version: item.version })),
        sources: policy.authority.sources,
        lineage: {
          runId: policy.authority.identity.runId,
          sessionId: policy.authority.identity.sessionId,
          turnId: policy.authority.identity.turnId,
          contextId: policy.authority.lineage?.contextId ?? null,
          retrievalRef: result.retrieval_ref,
        },
        approved_budget: { maxTokens: policy.bounded.budget.maxTokens, maxItems: policy.budget, retrievalRadius: policy.radius },
        retrieval_evidence_ref: result.retrieval_ref,
        provenance: result.items.map((item) => ({
          knowledgeRef: item.ref,
          sourceHash: item.sourceHash,
          version: item.version,
          provenanceRef: item.provenanceRef,
          atomRef: item.atomRef,
          atomRefs: item.atomRefs ?? [],
          sourceRefs: item.sourceRefs ?? [],
          runId: item.runId,
          stage: item.stage,
        })),
        policy_decisions: [{ decision: "allow", ref: policyRef, reason: "MSP-authorized bounded GKS retrieval." }],
        bounded_graph_query: policy.bounded,
      };
    },
  };
}