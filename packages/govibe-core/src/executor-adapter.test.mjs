import { describe, expect, it, vi } from "vitest";
import { createCredentialVault } from "./credential-vault.mjs";
import { createExecutionBindingService } from "./execution-binding-service.mjs";
import { createExecutorRegistry } from "./executor-adapter.mjs";
import { createProviderSessionRegistry } from "./provider-session-registry.mjs";

function contextAuthority() {
  return {
    schemaVersion: "govibe-context-authority/v1",
    identity: {
      taskId: "task-1",
      agentId: "agent-1",
      workspaceId: "ws-1",
      runId: "run-1",
      sessionId: "session-1",
      turnId: "turn-1",
    },
    lineage: { contextId: "context-1", cacheId: "cache-1" },
    unresolvedAssumptions: [],
    traversal: {
      relationAllowlist: ["contains"],
      retrievalRadius: 1,
      inclusions: [],
      exclusions: [],
    },
    sources: [{
      id: "doc-1",
      version: "1",
      hash: "a".repeat(64),
    }],
    budget: { maxTokens: 512 },
    knowledgeRefs: ["gks:doc-1"],
    requiredReasonRefs: ["policy:reason:1"],
  };
}

function governedRequest(overrides = {}) {
  return {
    actor_id: "user-1",
    run_id: "run-1",
    contextAuthority: contextAuthority(),
    policyDecision: "allow",
    contextLineage: { runId: "run-1", sessionId: "session-1", turnId: "turn-1" },
    executionBinding: {
      binding_id: "binding-1",
      provider_id: "codex",
      entitlement_id: "ent-1",
      principal_id: "user-1",
      run_id: "run-1",
      credential_grant_id: null,
      provider_session_id: null,
    },
    ...overrides,
  };
}

function bindingRequest() {
  return {
    binding_request_id: "br-service",
    actor_id: "user-1",
    organization_id: "org-1",
    workspace_id: "ws-1",
    project_id: "project-1",
    task_id: "task-1",
    agent_id: "agent-1",
    run_id: "run-1",
    session_id: "session-1",
    turn_id: "turn-1",
    context: {
      context_id: "context-1",
      cache_id: "cache-1",
      context_hash: "hash-1",
      source_manifest_hash: "manifest-1",
      context_profile: "T-ctx",
      tool_contract_hash: "tools-1",
      persisted: true,
    },
    eligible_target: {
      authorized: true,
      actor_id: "user-1",
      workspace_id: "ws-1",
      project_id: "project-1",
      provider_id: "codex",
      entitlement_id: "ent-1",
      executor_class: "external-agent",
      model_id: "model-1",
      state: "active",
    },
    policy_decision_refs: ["policy:entitlement:1"],
  };
}

function serviceBinding() {
  return createExecutionBindingService({ idFactory: () => "service" }).createBinding(bindingRequest());
}

describe("executor adapter governed handoff", () => {
  it("fails closed when no execution binding exists", async () => {
    const registry = createExecutorRegistry({ codex: { execute: vi.fn() } });
    await expect(registry.execute("codex", governedRequest({ executionBinding: undefined })))
      .rejects.toMatchObject({ code: "EXECUTION_BINDING_REQUIRED" });
  });

  it("rejects provider-string substitution", async () => {
    const registry = createExecutorRegistry({ local: { execute: vi.fn() } });
    await expect(registry.execute("local", governedRequest()))
      .rejects.toMatchObject({ code: "EXECUTION_BINDING_PROVIDER_MISMATCH" });
  });

  it("passes credential only through the protected adapter channel", async () => {
    const vault = createCredentialVault({ idFactory: () => "fixed" });
    vault.registerCredential({
      credential_ref: "cred-1",
      entitlement_id: "ent-1",
      owner_id: "user-1",
      provider_id: "codex",
      secret: "top-secret",
    });
    const grant = vault.issueGrant({
      credential_ref: "cred-1",
      entitlement_id: "ent-1",
      principal_id: "user-1",
      run_id: "run-1",
      binding_id: "binding-1",
      provider_id: "codex",
    });

    const execute = vi.fn(async (request, runtime) => ({
      requestHasSecret: JSON.stringify(request).includes("top-secret"),
      bindingHasGrant: "credential_grant_id" in request.executionBinding,
      credential: new TextDecoder().decode(runtime.credential),
    }));
    const registry = createExecutorRegistry({ codex: { execute } }, { credentialVault: vault });
    const request = governedRequest({
      secret: "must-not-pass",
      executionBinding: { ...governedRequest().executionBinding, credential_grant_id: grant.grant_id },
    });

    await expect(registry.execute("codex", request)).resolves.toEqual({
      requestHasSecret: false,
      bindingHasGrant: false,
      credential: "top-secret",
    });
  });

  it("validates an isolated provider session before dispatch", async () => {
    const sessions = createProviderSessionRegistry({ idFactory: () => "session" });
    const session = sessions.createSession({
      principal_id: "user-1",
      entitlement_id: "ent-1",
      provider_id: "codex",
      run_id: "run-1",
      binding_id: "binding-1",
      external_session_id: "external-secret-session",
    });
    const execute = vi.fn(async (_request, runtime) => runtime.providerSession.session_id);
    const registry = createExecutorRegistry({ codex: { execute } }, { sessionRegistry: sessions });

    const request = governedRequest({
      executionBinding: { ...governedRequest().executionBinding, provider_session_id: session.session_id },
    });
    await expect(registry.execute("codex", request)).resolves.toBe(session.session_id);
  });

  it("rejects cross-principal binding reuse", async () => {
    const registry = createExecutorRegistry({ codex: { execute: vi.fn() } });
    await expect(registry.execute("codex", governedRequest({ actor_id: "user-2" })))
      .rejects.toMatchObject({ code: "EXECUTION_BINDING_PRINCIPAL_MISMATCH" });
  });

  it("accepts matching binding-service identity output and rejects identity substitution", async () => {
    const binding = serviceBinding();
    const execute = vi.fn(async (_request, runtime) => runtime.executionBinding.principal_id);
    const registry = createExecutorRegistry({ codex: { execute } });

    await expect(registry.execute("codex", governedRequest({ executionBinding: binding }))).resolves.toBe("user-1");
    await expect(registry.execute("codex", governedRequest({ executionBinding: { ...binding, actor_id: "user-2" } })))
      .rejects.toMatchObject({ code: "EXECUTION_BINDING_IDENTITY_MISMATCH" });
    await expect(registry.execute("codex", governedRequest({ executionBinding: { ...binding, principal_id: "user-2" } })))
      .rejects.toMatchObject({ code: "EXECUTION_BINDING_IDENTITY_MISMATCH" });
    await expect(registry.execute("codex", governedRequest({ actor_id: "user-2", executionBinding: binding })))
      .rejects.toMatchObject({ code: "EXECUTION_BINDING_PRINCIPAL_MISMATCH" });
  });

  it("rejects a v1 binding without its authoritative actor identity", async () => {
    const { actor_id, ...binding } = serviceBinding();
    const registry = createExecutorRegistry({ codex: { execute: vi.fn() } });

    await expect(registry.execute("codex", governedRequest({ executionBinding: binding })))
      .rejects.toMatchObject({ code: "EXECUTION_BINDING_INVALID" });
  });

  it.each([
    ["workspace_id", "ws-2"],
    ["task_id", "task-2"],
    ["agent_id", "agent-2"],
    ["run_id", "run-2"],
    ["session_id", "session-2"],
    ["turn_id", "turn-2"],
    ["context_id", "context-2"],
    ["cache_id", "cache-2"],
  ])("rejects v1 cross-scope reuse through %s substitution", async (field, value) => {
    const binding = { ...serviceBinding(), [field]: value };
    const registry = createExecutorRegistry({ codex: { execute: vi.fn() } });

    await expect(registry.execute("codex", governedRequest({ executionBinding: binding })))
      .rejects.toMatchObject({ code: "EXECUTION_BINDING_SCOPE_MISMATCH", details: { field } });
  });

  it("allows only principal-only schema-less legacy bindings", async () => {
    const execute = vi.fn(async (_request, runtime) => runtime.executionBinding.principal_id);
    const registry = createExecutorRegistry({ codex: { execute } });
    const legacy = governedRequest().executionBinding;

    await expect(registry.execute("codex", governedRequest({ executionBinding: legacy }))).resolves.toBe("user-1");
    await expect(registry.execute("codex", governedRequest({ executionBinding: { ...legacy, actor_id: "user-1" } })))
      .rejects.toMatchObject({ code: "EXECUTION_BINDING_LEGACY_INVALID" });
    await expect(registry.execute("codex", governedRequest({ executionBinding: { ...legacy, schema: null } })))
      .rejects.toMatchObject({ code: "EXECUTION_BINDING_SCHEMA_UNSUPPORTED" });
    await expect(registry.execute("codex", governedRequest({ executionBinding: { ...legacy, schema: undefined } })))
      .rejects.toMatchObject({ code: "EXECUTION_BINDING_SCHEMA_UNSUPPORTED" });
  });
});
