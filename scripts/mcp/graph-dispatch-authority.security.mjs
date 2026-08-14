import assert from "node:assert/strict";
import test from "node:test";

import { RuntimeAuthorityError, buildBoundedGraphQuery } from "../../packages/govibe-core/src/authority-enforcement.mjs";
import { createExecutionBindingService } from "../../packages/govibe-core/src/execution-binding-service.mjs";
import { createExecutorRegistry, ExecutionBindingError } from "../../packages/govibe-core/src/executor-adapter.mjs";
import { MspClient } from "../../packages/govibe-core/src/msp-client.mjs";
import { createProviderCompatibilityRegistry } from "../../packages/govibe-core/src/provider-compatibility-registry.mjs";

const hash = "b".repeat(64);

function authority(overrides = {}) {
  return {
    schemaVersion: "govibe-context-authority/v1",
    identity: { taskId: "TASK-54", agentId: "ATHER", workspaceId: "govibe", runId: "run-2", sessionId: "session-2", turnId: "turn-2" },
    sources: [{ id: "API-007", version: "0.1.0", hash }],
    requiredReasonRefs: ["issue:54", "adr:23"],
    traversal: {
      relationAllowlist: ["implements", "derived_from"],
      retrievalRadius: 2,
      inclusions: ["api:007"],
      exclusions: ["marketing:*"],
    },
    knowledgeRefs: ["gks:api/007"],
    budget: { maxTokens: 4096, compaction: "bounded" },
    lineage: { contextId: "ctx-2", cacheId: "cache-2", parentContextId: null },
    unresolvedAssumptions: [],
    ...overrides,
  };
}

// Dispatch verifies a binding against its issuing service, so the fixture uses a
// binding the service actually issued rather than a hand-written literal.
const BINDING_SERVICE = createExecutionBindingService({
  clock: () => new Date("2026-08-03T00:00:00.000Z"),
  idFactory: () => "local-2",
  defaultTtlMs: 60_000,
});

const COMPATIBILITY_REGISTRY = createProviderCompatibilityRegistry([{
  record_id: "local-runtime-owner-host-v1",
  schema_version: "govibe-provider-entitlement-compatibility/v1",
  version: "1.0.0",
  provider: "local",
  product: "govibe-local-runtime",
  plan: "self-hosted",
  execution_surface: "local_runtime",
  entitlement_type: "local_compute",
  owner_type: "user",
  permitted_user_model: "owner",
  approved_scope: "owner_only",
  automation_allowed: false,
  credential_delegation_allowed: false,
  session_reuse_allowed: false,
  session_isolation_domain: null,
  concurrent_use_allowed: false,
  allowed_principals: [],
  allowed_workspaces: [],
  allowed_organizations: [],
  allowed_adapter_ids: ["local"],
  quota_visibility: { request_count: "provider_reported" },
  cache_visibility: { provider_session: "not_applicable" },
  evidence_refs: ["internal:test-local-runtime-policy"],
  evidence_hashes: ["sha256:test-local-runtime-policy"],
  reviewer: "test-reviewer",
  approval_state: "approved_owner_only",
  approved_date: "2026-08-01T00:00:00.000Z",
  expiry_date: "2027-08-01T00:00:00.000Z",
  next_review_date: "2027-02-01T00:00:00.000Z",
  restrictions: [],
  fail_closed_reasons: [],
}]);

const ISSUED_BINDING = BINDING_SERVICE.createBinding({
  binding_request_id: "br-local-2",
  actor_id: "local-agent-2",
  organization_id: "org-local",
  workspace_id: "govibe",
  project_id: "project-local",
  task_id: "TASK-54",
  agent_id: "ATHER",
  run_id: "run-2",
  session_id: "session-2",
  turn_id: "turn-2",
  context: {
    context_id: "ctx-2",
    cache_id: "cache-2",
    context_hash: "hash-local-2",
    source_manifest_hash: "manifest-local-2",
    context_profile: "W-ctx",
    tool_contract_hash: "tools-local-2",
    persisted: true,
  },
  eligible_target: {
    authorized: true,
    actor_id: "local-agent-2",
    workspace_id: "govibe",
    project_id: "project-local",
    provider_id: "local",
    entitlement_id: "entitlement-local-2",
    executor_class: "local-agent",
    model_id: "model-local-2",
    state: "active",
    compatibility: {
      authorized: true,
      record_id: "local-runtime-owner-host-v1",
      record_version: "1.0.0",
      provider: "local",
      product: "govibe-local-runtime",
      plan: "self-hosted",
      execution_surface: "local_runtime",
      entitlement_type: "local_compute",
      owner_id: "local-agent-2",
      requested_scope: "owner_only",
      principal_id: "local-agent-2",
      organization_id: "org-local",
      workspace_id: "govibe",
      adapter_id: "local",
      automation_requested: false,
      session_reuse_requested: false,
      concurrent_use_requested: false,
      credential_delegation_requested: false,
      evidence_valid: true,
      policy_ref: "compatibility:local-runtime-owner-host-v1:1.0.0",
    },
  },
  policy_decision_refs: ["policy:local:2", "compatibility:local-runtime-owner-host-v1:1.0.0"],
});

function governedRegistry(adapter = { execute: async () => ({ ok: true }) }) {
  return createExecutorRegistry({ local: adapter }, {
    bindingService: BINDING_SERVICE,
    compatibilityRegistry: COMPATIBILITY_REGISTRY,
  });
}

function dispatchRequest(overrides = {}) {
  return {
    task: "Implement bounded graph dispatch",
    actor_id: "local-agent-2",
    run_id: "run-2",
    contextAuthority: authority(),
    contextLineage: { runId: "run-2", sessionId: "session-2", turnId: "turn-2" },
    policyDecision: "allow",
    executionBinding: {
      schema: "govibe-execution-binding/v1",
      binding_id: ISSUED_BINDING.binding_id,
      binding_request_id: "br-local-2",
      actor_id: "local-agent-2",
      principal_id: "local-agent-2",
      organization_id: "org-local",
      workspace_id: "govibe",
      project_id: "project-local",
      task_id: "TASK-54",
      agent_id: "ATHER",
      run_id: "run-2",
      session_id: "session-2",
      turn_id: "turn-2",
      context_id: "ctx-2",
      cache_id: "cache-2",
      context_hash: "hash-local-2",
      source_manifest_hash: "manifest-local-2",
      context_profile: "W-ctx",
      tool_contract_hash: "tools-local-2",
      provider_id: "local",
      entitlement_id: "entitlement-local-2",
      executor_class: "local-agent",
      model_id: "model-local-2",
      credential_grant_id: null,
      provider_session_id: null,
      affinity_key: null,
      fallback_policy_id: null,
      quota_snapshot_ref: null,
      policy_decision_refs: ["policy:local:2"],
      state: "active",
      authorized_at: "2026-08-03T00:00:00.000Z",
      expires_at: "2026-08-03T00:01:00.000Z",
      revoked_at: null,
    },
    ...overrides,
  };
}

test("builds a bounded graph query without losing exclusions or source constraints", () => {
  const query = buildBoundedGraphQuery(authority());
  assert.equal(query.schema_version, "govibe-bounded-graph-query/v1");
  assert.deepEqual(query.relation_allowlist, ["implements", "derived_from"]);
  assert.deepEqual(query.exclusions, ["marketing:*"]);
  assert.deepEqual(query.source_constraints, [{ id: "API-007", version: "0.1.0", hash }]);
  assert.equal(query.radius, 2);
});

test("rejects unrestricted graph traversal before MSP transport", () => {
  assert.throws(
    () => buildBoundedGraphQuery(authority({ traversal: { relationAllowlist: ["*"], retrievalRadius: 2, inclusions: [], exclusions: [] } })),
    (error) => error instanceof RuntimeAuthorityError && error.code === "unrestricted_traversal",
  );
});

test("MspClient forwards context authority and bounded graph query intact", async () => {
  const calls = [];
  const client = new MspClient(async (name, input) => {
    calls.push({ name, input });
    return {
      context_id: "ctx-2",
      cache_id: "cache-2",
      policy_decision: "allow",
      sources: authority().sources,
      lineage: { runId: "run-2", sessionId: "session-2", turnId: "turn-2" },
      bounded_graph_query: input.bounded_graph_query,
    };
  });

  const result = await client.resolveContext({
    workspacePath: "/workspace/govibe",
    workspaceId: "govibe",
    agentId: "ATHER",
    contextProfile: "W-ctx",
    contextAuthority: authority(),
    knowledgeRefs: ["gks:api/007"],
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "msp_context_resolve");
  assert.equal(calls[0].input.context_authority.identity.runId, "run-2");
  assert.deepEqual(calls[0].input.bounded_graph_query.exclusions, ["marketing:*"]);
  assert.deepEqual(result.boundedGraphQuery.source_constraints, [{ id: "API-007", version: "0.1.0", hash }]);
});

test("blocks executor dispatch without a governed binding", async () => {
  let executed = false;
  const registry = governedRegistry({ execute: async () => { executed = true; return { ok: true }; } });
  await assert.rejects(
    registry.execute("local", { task: "unsafe" }),
    (error) => error instanceof ExecutionBindingError && error.code === "EXECUTION_BINDING_REQUIRED",
  );
  assert.equal(executed, false);
});

test("blocks executor dispatch when MSP policy is not allow", async () => {
  const registry = governedRegistry();
  await assert.rejects(
    registry.execute("local", dispatchRequest({ policyDecision: "deny" })),
    (error) => error instanceof RuntimeAuthorityError && error.code === "dispatch_denied",
  );
});

test("blocks executor dispatch on lineage mismatch", async () => {
  const registry = governedRegistry();
  await assert.rejects(
    registry.execute("local", dispatchRequest({ contextLineage: { runId: "other", sessionId: "session-2", turnId: "turn-2" } })),
    (error) => error instanceof RuntimeAuthorityError && error.code === "lineage_mismatch",
  );
});

test("dispatches only after bounded authority, allow policy, and lineage validation", async () => {
  const calls = [];
  const registry = governedRegistry({ execute: async (request) => { calls.push(request); return { ok: true }; } });
  const request = dispatchRequest();
  assert.deepEqual(request.executionBinding, {
    schema: "govibe-execution-binding/v1",
    binding_id: ISSUED_BINDING.binding_id,
    binding_request_id: "br-local-2",
    actor_id: "local-agent-2",
    principal_id: "local-agent-2",
    organization_id: "org-local",
    workspace_id: "govibe",
    project_id: "project-local",
    task_id: "TASK-54",
    agent_id: "ATHER",
    run_id: "run-2",
    session_id: "session-2",
    turn_id: "turn-2",
    context_id: "ctx-2",
    cache_id: "cache-2",
    context_hash: "hash-local-2",
    source_manifest_hash: "manifest-local-2",
    context_profile: "W-ctx",
    tool_contract_hash: "tools-local-2",
    provider_id: "local",
    entitlement_id: "entitlement-local-2",
    executor_class: "local-agent",
    model_id: "model-local-2",
    credential_grant_id: null,
    provider_session_id: null,
    affinity_key: null,
    fallback_policy_id: null,
    quota_snapshot_ref: null,
    policy_decision_refs: ["policy:local:2"],
    state: "active",
    authorized_at: "2026-08-03T00:00:00.000Z",
    expires_at: "2026-08-03T00:01:00.000Z",
    revoked_at: null,
  });
  const result = await registry.execute("local", request);
  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 1);
});
