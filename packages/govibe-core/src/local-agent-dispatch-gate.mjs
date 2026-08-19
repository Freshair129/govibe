// TASK-PRD-035 (CR-2026-08-19 D-01, phase 1): wraps the local agent launcher
// (scripts/agents/invoke-agent.ps1) as a governed dispatch target so that
// govibe.agent.run and StEP pass through the full executor-adapter dispatch
// gate (execution-capability-planner -> execution-router -> execution-binding-service
// -> executor-adapter -> provider-adapter-host) instead of spawning directly.
//
// Scope note: D-03 keeps provider-entitlement-registry.mjs / provider-compatibility-registry.mjs
// DEFERRED as general multi-provider arbitration machinery — no ratification of API-008 happens
// here. This module only *instantiates* those registry factories with a single, hard-coded,
// self-issued entitlement/compatibility record describing the one local launcher target GoVibe
// already runs unconditionally today. There is no external provider, no credential handoff beyond
// `none` (TASK-PRD-028 owns the credential boundary separately), and no cross-principal sharing:
// this is the minimal honest binding the existing governed services require to admit a dispatch,
// not a general entitlement-arbitration system.
//
// Identity/lineage note: a real MSP-issued "continue packet" (govibe.workspace.continue) is the
// authoritative source of contextAuthority/contextLineage when a caller already has one. Today
// govibe.agent.run and StEP callers do not carry one, so runtime-core.mjs synthesizes a minimal,
// self-consistent identity per dispatch (see buildDispatchIdentity in runtime-core.mjs) and this
// gate self-issues `policyDecision: "allow"` for its own pre-existing capability, in place of an
// external MSP round trip. This is a recorded phase-1 limitation, not a claim of MSP mediation.

import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { createProviderCapabilityRegistry, createEntitlementRegistry } from "./provider-entitlement-registry.mjs";
import { createProviderCompatibilityRegistry } from "./provider-compatibility-registry.mjs";
import { createExecutionBindingService } from "./execution-binding-service.mjs";
import { createExecutionCapabilityPlanner } from "./execution-capability-planner.mjs";
import { createExecutionRouter } from "./execution-router.mjs";
import { createSubscriptionCliAdapter } from "./provider-adapters.mjs";
import { createExecutorRegistry } from "./executor-adapter.mjs";
import { createProviderAdapterHost } from "./provider-adapter-host.mjs";

export const LOCAL_AGENT_PROVIDER_ID = "local";
export const LOCAL_AGENT_ADAPTER_ID = "invoke-agent-cli";
export const LOCAL_AGENT_EXECUTOR_CLASS = "agent-cli-launcher";
export const LOCAL_AGENT_MODEL_ID = "invoke-agent-ps1";
export const LOCAL_AGENT_TOOL_CONTRACT_HASH = "govibe-agent-run-launcher/v1";

const ENTITLEMENT_ID = "ent_local_agent_launcher";
const COMPATIBILITY_RECORD_ID = "compat_local_agent_launcher_v1";

export function sha256Hex(content) {
  return createHash("sha256").update(content).digest("hex");
}

function buildCapabilityRegistry(clock) {
  return createProviderCapabilityRegistry([{
    schema: "govibe-provider-capability-descriptor/v1",
    provider_id: LOCAL_AGENT_PROVIDER_ID,
    adapter_id: LOCAL_AGENT_ADAPTER_ID,
    adapter_version: "1.0.0",
    executor_classes: [LOCAL_AGENT_EXECUTOR_CLASS],
    models: [{
      model_id: LOCAL_AGENT_MODEL_ID,
      capabilities: ["agent-dispatch"],
      context_limit_tokens: null,
      supports_tools: false,
      supports_streaming: false,
      supports_reasoning_control: null,
    }],
    entitlement_types: ["local_compute"],
    usage_visibility: "unknown",
    token_usage_reported: false,
    cached_token_usage_reported: false,
    remaining_quota_reported: false,
    rate_limit_detectable: false,
    supports_session_affinity: false,
    supports_prompt_cache_reference: false,
    supports_cancellation: false,
    supports_parallel_runs: true,
    credential_modes: ["none"],
    data_policy_tags: [],
    observed_at: clock().toISOString(),
  }]);
}

function buildEntitlementRegistry(ownerId) {
  return createEntitlementRegistry([{
    schema: "govibe-provider-entitlement/v1",
    entitlement_id: ENTITLEMENT_ID,
    version: "1",
    provider_id: LOCAL_AGENT_PROVIDER_ID,
    entitlement_type: "local_compute",
    owner: { owner_type: "service", owner_id: ownerId },
    share_policy: "owner_only",
    allowed_roles: [],
    allowed_workspaces: [],
    allowed_projects: [],
    data_classifications: [],
    residency_policy: [],
    credential_ref: null,
    executor_classes: [LOCAL_AGENT_EXECUTOR_CLASS],
    model_allowlist: [LOCAL_AGENT_MODEL_ID],
    model_denylist: [],
    concurrency: { max_active: null, max_queued: null },
    session_policy: { cross_run_reuse: false, cross_user_reuse: false, ttl_seconds: null },
    quota_policy_ref: null,
    state: "active",
    valid_from: "2026-08-19T00:00:00.000Z",
    valid_until: null,
  }]);
}

function buildCompatibilityRegistry(launcherHash) {
  return createProviderCompatibilityRegistry([{
    record_id: COMPATIBILITY_RECORD_ID,
    schema_version: "govibe-provider-entitlement-compatibility/v1",
    version: "1.0.0",
    provider: LOCAL_AGENT_PROVIDER_ID,
    product: "govibe-agent-launcher",
    plan: "local-runtime",
    execution_surface: "cli",
    entitlement_type: "local_compute",
    owner_type: "service",
    permitted_user_model: "owner",
    approved_scope: "owner_only",
    automation_allowed: true,
    credential_delegation_allowed: false,
    session_reuse_allowed: false,
    session_isolation_domain: null,
    concurrent_use_allowed: true,
    allowed_principals: [],
    allowed_workspaces: [],
    allowed_organizations: [],
    allowed_adapter_ids: [LOCAL_AGENT_ADAPTER_ID],
    quota_visibility: {},
    cache_visibility: {},
    evidence_refs: ["docs/change-control/change-requests/CR-2026-08-19-Entitlement-Execution-Stack-Disposition.md#4"],
    evidence_hashes: [`sha256:${launcherHash}`],
    reviewer: "CR-2026-08-19-D-01",
    approval_state: "approved_owner_only",
    approved_date: "2026-08-19T00:00:00.000Z",
    expiry_date: "2099-01-01T00:00:00.000Z",
    next_review_date: "2099-01-01T00:00:00.000Z",
    restrictions: [],
    fail_closed_reasons: [],
  }]);
}

/**
 * Builds the governed local-agent dispatch pipeline: capability planner -> router ->
 * binding service -> executor registry -> provider-adapter host, wired around a single
 * subscription-CLI adapter whose `run` invokes the caller-supplied launcher function.
 *
 * @param {object} options
 * @param {string} options.launcherScriptPath - absolute path to invoke-agent.ps1 (hashed once
 *   as the sole context-authority source and the compatibility record's evidence hash).
 * @param {(request: object, context: object) => Promise<object>} options.run - spawns the
 *   launcher; receives the safe (credential-stripped) request and the execution context
 *   (`{ executionBinding, credential, providerSession }`). Must return `{ artifacts: [...] }`.
 * @param {string} [options.organizationId]
 * @param {string} [options.ownerId] - the self-issued entitlement owner / dispatch actor.
 * @param {() => Date} [options.clock]
 * @param {() => string} [options.idFactory]
 */
export function createLocalAgentDispatchGate({
  launcherScriptPath,
  run,
  organizationId = "govibe-local",
  ownerId = "govibe-runtime-service",
  clock = () => new Date(),
  idFactory = randomUUID,
  additionalAdapters = {},
} = {}) {
  if (typeof launcherScriptPath !== "string" || launcherScriptPath.trim() === "") {
    throw new TypeError("createLocalAgentDispatchGate requires launcherScriptPath");
  }
  if (typeof run !== "function") {
    throw new TypeError("createLocalAgentDispatchGate requires a run function");
  }

  const launcherHash = sha256Hex(readFileSync(launcherScriptPath));

  const capabilityRegistry = buildCapabilityRegistry(clock);
  const entitlementRegistry = buildEntitlementRegistry(ownerId);
  const compatibilityRegistry = buildCompatibilityRegistry(launcherHash);

  const bindingService = createExecutionBindingService({ clock, idFactory });
  const planner = createExecutionCapabilityPlanner({ capabilityRegistry, entitlementRegistry, compatibilityRegistry, clock });
  const router = createExecutionRouter({ planner, bindingService, clock, idFactory: () => idFactory() });

  const adapter = createSubscriptionCliAdapter({ providerId: LOCAL_AGENT_PROVIDER_ID, adapterId: LOCAL_AGENT_ADAPTER_ID, run });

  const executorRegistry = createExecutorRegistry(
    { ...additionalAdapters, [LOCAL_AGENT_PROVIDER_ID]: adapter },
    { bindingService, compatibilityRegistry, clock },
  );

  const adapterHost = createProviderAdapterHost({
    executorRegistry,
    capabilityRegistry,
    policyRecords: [{
      schema: "govibe-provider-adapter-policy/v1",
      provider_id: LOCAL_AGENT_PROVIDER_ID,
      adapter_id: LOCAL_AGENT_ADAPTER_ID,
      adapter_version: "1.0.0",
      entitlement_types: ["local_compute"],
      allowed_executor_classes: [LOCAL_AGENT_EXECUTOR_CLASS],
      approval_state: "approved",
      cross_user_session_reuse: false,
      policy_ref: "CR-2026-08-19:D-01:phase-1",
      approved_by: "Boss",
      approved_at: "2026-08-19T00:00:00.000Z",
    }],
    clock,
  });

  function buildPlanningRequest({ requestId, taskId, agentId, workspaceId, projectId }) {
    return {
      request_id: requestId,
      actor_id: ownerId,
      organization_id: organizationId,
      workspace_id: workspaceId,
      project_id: projectId,
      task_id: taskId,
      agent_id: agentId,
      role: "agent",
      executor_class: LOCAL_AGENT_EXECUTOR_CLASS,
      required_capabilities: [],
      required_tools: [],
      data_classification: "internal",
      residency_requirements: [],
      tool_contract_hash: LOCAL_AGENT_TOOL_CONTRACT_HASH,
      allowed_tool_contract_hashes: [LOCAL_AGENT_TOOL_CONTRACT_HASH],
      context_integrity_valid: true,
      automation_requested: true,
    };
  }

  function buildContextAuthority({ taskId, agentId, workspaceId, runId, sessionId, turnId, contextId, cacheId }) {
    return {
      schemaVersion: "govibe-context-authority/v1",
      identity: { taskId, agentId, workspaceId, runId, sessionId, turnId },
      lineage: { contextId, cacheId, parentContextId: null },
      unresolvedAssumptions: [],
      traversal: { relationAllowlist: ["dispatches"], retrievalRadius: 0, inclusions: [], exclusions: [] },
      sources: [{ id: "scripts/agents/invoke-agent.ps1", version: "1", hash: launcherHash }],
      budget: { maxTokens: 1 },
      knowledgeRefs: [],
      requiredReasonRefs: ["change-request:CR-2026-08-19:D-01"],
    };
  }

  /**
   * Issues a fresh binding for the given identity and dispatches through the full gate.
   * `requestArgs` is spread onto the governed request so the adapter's `run` receives the
   * original agent-run arguments (task, agent, scope, mode, executor, ...).
   */
  async function dispatch({ taskId, agentId, workspaceId = "govibe-local-workspace", projectId = null, runId, sessionId, turnId, requestArgs = {} }) {
    if (!runId || !sessionId || !turnId || !taskId || !agentId) {
      throw new TypeError("dispatch requires taskId, agentId, runId, sessionId, and turnId");
    }
    const requestId = `req_${idFactory()}`;
    const contextId = `ctx_${idFactory()}`;
    const cacheId = `cache_${idFactory()}`;

    const planningRequest = buildPlanningRequest({ requestId, taskId, agentId, workspaceId, projectId });
    const bindingRequest = {
      binding_request_id: `br_${idFactory()}`,
      actor_id: ownerId,
      organization_id: organizationId,
      workspace_id: workspaceId,
      project_id: projectId,
      task_id: taskId,
      agent_id: agentId,
      run_id: runId,
      session_id: sessionId,
      turn_id: turnId,
      context: {
        context_id: contextId,
        cache_id: cacheId,
        context_hash: `sha256:${launcherHash}`,
        source_manifest_hash: `sha256:${launcherHash}`,
        context_profile: "T-ctx",
        tool_contract_hash: LOCAL_AGENT_TOOL_CONTRACT_HASH,
        persisted: true,
      },
    };

    const { binding } = router.route({ planning_request: planningRequest, binding_request: bindingRequest });

    const contextAuthority = buildContextAuthority({ taskId, agentId, workspaceId, runId, sessionId, turnId, contextId, cacheId });

    const request = {
      ...requestArgs,
      actor_id: ownerId,
      run_id: runId,
      contextAuthority,
      policyDecision: "allow",
      contextLineage: { runId, sessionId, turnId },
      executionBinding: binding,
    };

    return adapterHost.execute(LOCAL_AGENT_PROVIDER_ID, request);
  }

  return Object.freeze({
    dispatch,
    inspect: adapterHost.inspect,
    launcherHash,
    router,
    bindingService,
    executorRegistry,
    adapterHost,
  });
}
