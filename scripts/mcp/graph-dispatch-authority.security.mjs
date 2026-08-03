import assert from "node:assert/strict";
import test from "node:test";

import { RuntimeAuthorityError, buildBoundedGraphQuery } from "../../packages/govibe-core/src/authority-enforcement.mjs";
import { createExecutionBindingService } from "../../packages/govibe-core/src/execution-binding-service.mjs";
import { createExecutorRegistry } from "../../packages/govibe-core/src/executor-adapter.mjs";
import { MspClient } from "../../packages/govibe-core/src/msp-client.mjs";

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
  },
  policy_decision_refs: ["policy:local:2"],
});

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

test("blocks executor dispatch without validated authority", async () => {
  let executed = false;
  const registry = createExecutorRegistry({ local: { execute: async () => { executed = true; return { ok: true }; } } });
  await assert.rejects(
    registry.execute("local", { task: "unsafe" }),
    (error) => error instanceof RuntimeAuthorityError && error.code === "missing_runtime_authority",
  );
  assert.equal(executed, false);
});

test("blocks executor dispatch when MSP policy is not allow", async () => {
  const registry = createExecutorRegistry({ local: { execute: async () => ({ ok: true }) } });
  await assert.rejects(
    registry.execute("local", dispatchRequest({ policyDecision: "deny" })),
    (error) => error instanceof RuntimeAuthorityError && error.code === "dispatch_denied",
  );
});

test("blocks executor dispatch on lineage mismatch", async () => {
  const registry = createExecutorRegistry({ local: { execute: async () => ({ ok: true }) } });
  await assert.rejects(
    registry.execute("local", dispatchRequest({ contextLineage: { runId: "other", sessionId: "session-2", turnId: "turn-2" } })),
    (error) => error instanceof RuntimeAuthorityError && error.code === "lineage_mismatch",
  );
});

test("dispatches only after bounded authority, allow policy, and lineage validation", async () => {
  const calls = [];
  const registry = createExecutorRegistry({ local: { execute: async (request) => { calls.push(request); return { ok: true }; } } }, { bindingService: BINDING_SERVICE });
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
