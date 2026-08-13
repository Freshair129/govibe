import { describe, expect, it, vi } from "vitest";
import { createCredentialVault } from "./credential-vault.mjs";
import { createExecutionBindingService } from "./execution-binding-service.mjs";
import { createExecutorRegistry } from "./executor-adapter.mjs";
import { createProviderCompatibilityRegistry } from "./provider-compatibility-registry.mjs";
import { createProviderSessionRegistry } from "./provider-session-registry.mjs";

const COMPAT_POLICY_REF = "compatibility:compat-codex-owner-v1:1.0.0";

function compatibilityRecord() {
  return {
    record_id: "compat-codex-owner-v1",
    schema_version: "govibe-provider-entitlement-compatibility/v1",
    version: "1.0.0",
    provider: "codex",
    product: "codex-test-product",
    plan: "test-plan",
    execution_surface: "cli",
    entitlement_type: "api",
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
    allowed_adapter_ids: ["adapter-codex"],
    quota_visibility: { request_quota: "unknown" },
    cache_visibility: { provider_session: "unknown" },
    evidence_refs: ["internal:test-codex-policy"],
    evidence_hashes: ["sha256:test-codex-policy-v1"],
    reviewer: "executor-test",
    approval_state: "approved_owner_only",
    approved_date: "2026-08-01T00:00:00.000Z",
    expiry_date: "2027-08-01T00:00:00.000Z",
    next_review_date: "2027-02-01T00:00:00.000Z",
    restrictions: [],
    fail_closed_reasons: [],
  };
}

function compatibilityProof() {
  return {
    authorized: true,
    record_id: "compat-codex-owner-v1",
    record_version: "1.0.0",
    provider: "codex",
    product: "codex-test-product",
    plan: "test-plan",
    execution_surface: "cli",
    entitlement_type: "api",
    owner_id: "user-1",
    requested_scope: "owner_only",
    principal_id: "user-1",
    organization_id: "org-1",
    workspace_id: "ws-1",
    adapter_id: "adapter-codex",
    automation_requested: false,
    session_reuse_requested: false,
    concurrent_use_requested: false,
    credential_delegation_requested: false,
    evidence_valid: true,
    policy_ref: COMPAT_POLICY_REF,
  };
}

function contextAuthority() {
  return {
    schemaVersion: "govibe-context-authority/v1",
    identity: { taskId: "task-1", agentId: "agent-1", workspaceId: "ws-1", runId: "run-1", sessionId: "session-1", turnId: "turn-1" },
    lineage: { contextId: "context-1", cacheId: "cache-1" },
    unresolvedAssumptions: [],
    traversal: { relationAllowlist: ["contains"], retrievalRadius: 1, inclusions: [], exclusions: [] },
    sources: [{ id: "doc-1", version: "1", hash: "a".repeat(64) }],
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
      schema: "govibe-execution-binding/v1",
      binding_id: ISSUED_BINDING.binding_id,
      binding_request_id: "br-1",
      actor_id: "user-1",
      principal_id: "user-1",
      organization_id: "org-1",
      workspace_id: "ws-1",
      project_id: "project-1",
      task_id: "task-1",
      agent_id: "agent-1",
      run_id: "run-1",
      session_id: "session-1",
      turn_id: "turn-1",
      context_id: "context-1",
      cache_id: "cache-1",
      context_hash: "hash-1",
      source_manifest_hash: "manifest-1",
      context_profile: "T-ctx",
      tool_contract_hash: "tools-1",
      provider_id: "codex",
      entitlement_id: "ent-1",
      executor_class: "external-agent",
      model_id: "model-1",
      credential_grant_id: null,
      provider_session_id: null,
      affinity_key: null,
      fallback_policy_id: null,
      quota_snapshot_ref: null,
      policy_decision_refs: ["policy:entitlement:1", COMPAT_POLICY_REF],
      state: "active",
      authorized_at: "2026-08-03T00:00:00.000Z",
      expires_at: "2026-08-03T00:01:00.000Z",
      revoked_at: null,
    },
    ...overrides,
  };
}

function bindingWithout(field) {
  const { [field]: _removed, ...binding } = governedRequest().executionBinding;
  return binding;
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
      context_id: "context-1", cache_id: "cache-1", context_hash: "hash-1", source_manifest_hash: "manifest-1",
      context_profile: "T-ctx", tool_contract_hash: "tools-1", persisted: true,
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
      compatibility: compatibilityProof(),
    },
    policy_decision_refs: ["policy:entitlement:1", COMPAT_POLICY_REF],
  };
}

const COMPATIBILITY_REGISTRY = createProviderCompatibilityRegistry([compatibilityRecord()]);
const BINDING_SERVICE = createExecutionBindingService({ idFactory: () => "service" });
const ISSUED_BINDING = BINDING_SERVICE.createBinding(bindingRequest());

function serviceBinding() { return ISSUED_BINDING; }
function governedRegistry(adapters, options = {}) {
  return createExecutorRegistry(adapters, {
    bindingService: BINDING_SERVICE,
    compatibilityRegistry: COMPATIBILITY_REGISTRY,
    ...options,
  });
}

describe("executor adapter governed handoff", () => {
  it("uses a complete v1 binding for normal governed dispatch", () => {
    expect(governedRequest().executionBinding).toMatchObject({
      schema: "govibe-execution-binding/v1", actor_id: "user-1", principal_id: "user-1", workspace_id: "ws-1",
      task_id: "task-1", agent_id: "agent-1", run_id: "run-1", session_id: "session-1", turn_id: "turn-1",
      context_id: "context-1", cache_id: "cache-1",
    });
  });

  it("fails closed when no execution binding exists", async () => {
    const registry = createExecutorRegistry({ codex: { execute: vi.fn() } });
    await expect(registry.execute("codex", governedRequest({ executionBinding: undefined }))).rejects.toMatchObject({ code: "EXECUTION_BINDING_REQUIRED" });
  });

  it("rejects provider-string substitution", async () => {
    const registry = createExecutorRegistry({ local: { execute: vi.fn() } });
    await expect(registry.execute("local", governedRequest())).rejects.toMatchObject({ code: "EXECUTION_BINDING_PROVIDER_MISMATCH" });
  });

  it("passes credential only through the protected adapter channel", async () => {
    const vault = createCredentialVault({ idFactory: () => "fixed" });
    vault.registerCredential({ credential_ref: "cred-1", entitlement_id: "ent-1", owner_id: "user-1", provider_id: "codex", secret: "fixture-value" });
    const grant = vault.issueGrant({ credential_ref: "cred-1", entitlement_id: "ent-1", principal_id: "user-1", run_id: "run-1", binding_id: ISSUED_BINDING.binding_id, provider_id: "codex" });
    const execute = vi.fn(async (request, runtime) => ({
      requestHasSecret: JSON.stringify(request).includes("fixture-value"),
      bindingHasGrant: "credential_grant_id" in request.executionBinding,
      credential: new TextDecoder().decode(runtime.credential),
    }));
    const registry = governedRegistry({ codex: { execute } }, { credentialVault: vault });
    const request = governedRequest({ secret: "must-not-pass", executionBinding: { ...governedRequest().executionBinding, credential_grant_id: grant.grant_id } });
    await expect(registry.execute("codex", request)).resolves.toEqual({ requestHasSecret: false, bindingHasGrant: false, credential: "fixture-value" });
  });

  it("passes only a binding-scoped derived handoff to the adapter", async () => {
    const bindingService = createExecutionBindingService({ idFactory: () => "derived" });
    const binding = bindingService.createBinding({
      ...bindingRequest(),
      binding_request_id: "br-derived",
      eligible_target: { ...bindingRequest().eligible_target, credential_mode: "derived_token" },
    });
    const vault = createCredentialVault({ idFactory: () => "derived-grant" });
    vault.registerCredential({ credential_ref: "cred-derived", entitlement_id: "ent-1", owner_id: "user-1", provider_id: "codex", secret: "fixture-value" });
    const grant = vault.issueGrant({
      credential_ref: "cred-derived", entitlement_id: "ent-1", principal_id: "user-1", run_id: "run-1",
      binding_id: binding.binding_id, provider_id: "codex", adapter_id: "adapter-codex",
    });
    const deriveCredential = vi.fn(async (bytes, derivationRequest) => {
      expect(new TextDecoder().decode(bytes)).toBe("fixture-value");
      expect(derivationRequest).toMatchObject({
        schema: "govibe-credential-derivation-request/v1",
        provider_id: "codex",
        adapter_id: "adapter-codex",
        binding_id: binding.binding_id,
      });
      return { token: "derived-fixture-token", token_type: "opaque" };
    });
    const execute = vi.fn(async (safeRequest, runtime) => {
      expect(JSON.stringify(safeRequest)).not.toContain("fixture-value");
      expect(JSON.stringify(safeRequest)).not.toContain("derived-fixture-token");
      expect(runtime.credential).toMatchObject({
        schema: "govibe-credential-handoff/v1",
        mode: "derived_token",
        provider_id: "codex",
        adapter_id: "adapter-codex",
        binding_id: binding.binding_id,
        token: "derived-fixture-token",
      });
      return runtime.credential.token;
    });
    const registry = createExecutorRegistry({
      codex: {
        provider_id: "codex",
        adapter_id: "adapter-codex",
        credential_modes: ["derived_token"],
        deriveCredential,
        execute,
      },
    }, { bindingService, compatibilityRegistry: COMPATIBILITY_REGISTRY, credentialVault: vault });

    await expect(registry.execute("codex", governedRequest({
      executionBinding: { ...binding, credential_grant_id: grant.grant_id },
    }))).resolves.toBe("derived-fixture-token");
    expect(deriveCredential).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledOnce();
  });

  it("fails closed when derived mode has no adapter deriver", async () => {
    const bindingService = createExecutionBindingService({ idFactory: () => "missing-deriver" });
    const binding = bindingService.createBinding({
      ...bindingRequest(),
      binding_request_id: "br-missing-deriver",
      eligible_target: { ...bindingRequest().eligible_target, credential_mode: "derived_token" },
    });
    const vault = createCredentialVault({ idFactory: () => "missing-deriver-grant" });
    vault.registerCredential({ credential_ref: "cred-derived", entitlement_id: "ent-1", owner_id: "user-1", provider_id: "codex", secret: "fixture-value" });
    const grant = vault.issueGrant({
      credential_ref: "cred-derived", entitlement_id: "ent-1", principal_id: "user-1", run_id: "run-1",
      binding_id: binding.binding_id, provider_id: "codex", adapter_id: "adapter-codex",
    });
    const execute = vi.fn();
    const registry = createExecutorRegistry({
      codex: { provider_id: "codex", adapter_id: "adapter-codex", credential_modes: ["derived_token"], execute },
    }, { bindingService, compatibilityRegistry: COMPATIBILITY_REGISTRY, credentialVault: vault });

    await expect(registry.execute("codex", governedRequest({
      executionBinding: { ...binding, credential_grant_id: grant.grant_id },
    }))).rejects.toMatchObject({ code: "CREDENTIAL_DERIVER_REQUIRED" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not downgrade a derived-only adapter to the legacy raw-secret path", async () => {
    const vault = createCredentialVault({ idFactory: () => "legacy-derived" });
    vault.registerCredential({ credential_ref: "cred-derived", entitlement_id: "ent-1", owner_id: "user-1", provider_id: "codex", secret: "fixture-value" });
    const grant = vault.issueGrant({
      credential_ref: "cred-derived", entitlement_id: "ent-1", principal_id: "user-1", run_id: "run-1",
      binding_id: ISSUED_BINDING.binding_id, provider_id: "codex",
    });
    const execute = vi.fn();
    const registry = governedRegistry({
      codex: {
        provider_id: "codex", adapter_id: "adapter-codex", credential_modes: ["derived_token"],
        deriveCredential: vi.fn(async () => ({ token: "derived" })), execute,
      },
    }, { credentialVault: vault });

    await expect(registry.execute("codex", governedRequest({
      executionBinding: { ...governedRequest().executionBinding, credential_grant_id: grant.grant_id },
    }))).rejects.toMatchObject({ code: "CREDENTIAL_MODE_UNSUPPORTED" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("fails closed when a derived mode returns the raw secret", async () => {
    const bindingService = createExecutionBindingService({ idFactory: () => "raw-derived" });
    const binding = bindingService.createBinding({
      ...bindingRequest(),
      binding_request_id: "br-raw-derived",
      eligible_target: { ...bindingRequest().eligible_target, credential_mode: "derived_token" },
    });
    const vault = createCredentialVault({ idFactory: () => "raw-derived-grant" });
    vault.registerCredential({ credential_ref: "cred-derived", entitlement_id: "ent-1", owner_id: "user-1", provider_id: "codex", secret: "fixture-value" });
    const grant = vault.issueGrant({
      credential_ref: "cred-derived", entitlement_id: "ent-1", principal_id: "user-1", run_id: "run-1",
      binding_id: binding.binding_id, provider_id: "codex", adapter_id: "adapter-codex",
    });
    const execute = vi.fn();
    const registry = createExecutorRegistry({
      codex: {
        provider_id: "codex", adapter_id: "adapter-codex", credential_modes: ["derived_token"],
        deriveCredential: vi.fn(async (bytes) => new TextDecoder().decode(bytes)), execute,
      },
    }, { bindingService, compatibilityRegistry: COMPATIBILITY_REGISTRY, credentialVault: vault });

    await expect(registry.execute("codex", governedRequest({
      executionBinding: { ...binding, credential_grant_id: grant.grant_id },
    }))).rejects.toMatchObject({ code: "CREDENTIAL_DERIVATION_RAW_SECRET_REUSED" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects a caller credential-mode substitution against the issued binding", async () => {
    const bindingService = createExecutionBindingService({ idFactory: () => "mode-mismatch" });
    const binding = bindingService.createBinding({
      ...bindingRequest(),
      binding_request_id: "br-mode-mismatch",
      eligible_target: { ...bindingRequest().eligible_target, credential_mode: "derived_token" },
    });
    const execute = vi.fn();
    const registry = createExecutorRegistry({ codex: { provider_id: "codex", adapter_id: "adapter-codex", execute } }, {
      bindingService, compatibilityRegistry: COMPATIBILITY_REGISTRY,
    });

    await expect(registry.execute("codex", governedRequest({
      executionBinding: { ...binding, credential_mode: "raw_secret" },
    }))).rejects.toMatchObject({ code: "EXECUTION_BINDING_SCOPE_MISMATCH" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("validates an isolated provider session before dispatch", async () => {
    const sessions = createProviderSessionRegistry({ idFactory: () => "session" });
    const session = sessions.createSession({ principal_id: "user-1", entitlement_id: "ent-1", provider_id: "codex", run_id: "run-1", binding_id: ISSUED_BINDING.binding_id, external_session_id: "external-session" });
    const execute = vi.fn(async (_request, runtime) => runtime.providerSession.session_id);
    const registry = governedRegistry({ codex: { execute } }, { sessionRegistry: sessions });
    await expect(registry.execute("codex", governedRequest({ executionBinding: { ...governedRequest().executionBinding, provider_session_id: session.session_id } }))).resolves.toBe(session.session_id);
  });

  it("rejects cross-principal binding reuse", async () => {
    const registry = createExecutorRegistry({ codex: { execute: vi.fn() } });
    await expect(registry.execute("codex", governedRequest({ actor_id: "user-2" }))).rejects.toMatchObject({ code: "EXECUTION_BINDING_PRINCIPAL_MISMATCH" });
  });

  it("accepts matching binding-service identity output and rejects identity substitution", async () => {
    const binding = serviceBinding();
    const execute = vi.fn(async (_request, runtime) => runtime.executionBinding.principal_id);
    const registry = governedRegistry({ codex: { execute } });
    await expect(registry.execute("codex", governedRequest({ executionBinding: binding }))).resolves.toBe("user-1");
    await expect(registry.execute("codex", governedRequest({ executionBinding: { ...binding, actor_id: "user-2" } }))).rejects.toMatchObject({ code: "EXECUTION_BINDING_IDENTITY_MISMATCH" });
    await expect(registry.execute("codex", governedRequest({ executionBinding: { ...binding, principal_id: "user-2" } }))).rejects.toMatchObject({ code: "EXECUTION_BINDING_IDENTITY_MISMATCH" });
    await expect(registry.execute("codex", governedRequest({ actor_id: "user-2", executionBinding: binding }))).rejects.toMatchObject({ code: "EXECUTION_BINDING_PRINCIPAL_MISMATCH" });
  });

  it("rejects a v1 binding without its authoritative actor identity", async () => {
    const { actor_id, ...binding } = serviceBinding();
    const registry = createExecutorRegistry({ codex: { execute: vi.fn() } });
    await expect(registry.execute("codex", governedRequest({ executionBinding: binding }))).rejects.toMatchObject({ code: "EXECUTION_BINDING_INVALID" });
  });

  it.each([
    ["workspace_id", "ws-2"], ["task_id", "task-2"], ["agent_id", "agent-2"], ["run_id", "run-2"],
    ["session_id", "session-2"], ["turn_id", "turn-2"], ["context_id", "context-2"], ["cache_id", "cache-2"],
  ])("rejects v1 cross-scope reuse through %s substitution", async (field, value) => {
    const binding = { ...serviceBinding(), [field]: value };
    const registry = createExecutorRegistry({ codex: { execute: vi.fn() } });
    await expect(registry.execute("codex", governedRequest({ executionBinding: binding }))).rejects.toMatchObject({ code: "EXECUTION_BINDING_SCOPE_MISMATCH", details: { field } });
  });

  it.each([
    ["has no schema", bindingWithout("schema"), "EXECUTION_BINDING_SCHEMA_UNSUPPORTED"],
    ["has an unsupported schema", { ...governedRequest().executionBinding, schema: "govibe-execution-binding/v0" }, "EXECUTION_BINDING_SCHEMA_UNSUPPORTED"],
    ["is incomplete v1", bindingWithout("session_id"), "EXECUTION_BINDING_INVALID"],
  ])("rejects a binding that %s before adapter execution", async (_scenario, binding, code) => {
    const execute = vi.fn();
    const registry = createExecutorRegistry({ codex: { execute } });
    await expect(registry.execute("codex", governedRequest({ executionBinding: binding }))).rejects.toMatchObject({ code });
    expect(execute).not.toHaveBeenCalled();
  });

  it("selects the bound adapter when two adapters share one provider", async () => {
    const record = {
      ...compatibilityRecord(),
      record_id: "compat-shared-owner-v1",
      provider: "shared",
      product: "shared-test-product",
      allowed_adapter_ids: ["adapter-shared-b"],
      evidence_refs: ["internal:test-shared-policy"],
      evidence_hashes: ["sha256:test-shared-policy-v1"],
    };
    const proof = {
      ...compatibilityProof(),
      record_id: record.record_id,
      provider: "shared",
      product: record.product,
      adapter_id: "adapter-shared-b",
      policy_ref: "compatibility:compat-shared-owner-v1:1.0.0",
    };
    const compatibilityRegistry = createProviderCompatibilityRegistry([record]);
    const bindingService = createExecutionBindingService({ idFactory: () => "shared" });
    const binding = bindingService.createBinding({
      binding_request_id: "br-shared",
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
        context_id: "context-1", cache_id: "cache-1", context_hash: "hash-1", source_manifest_hash: "manifest-1",
        context_profile: "T-ctx", tool_contract_hash: "tools-1", persisted: true,
      },
      eligible_target: {
        authorized: true,
        actor_id: "user-1",
        workspace_id: "ws-1",
        project_id: "project-1",
        provider_id: "shared",
        adapter_id: "adapter-shared-b",
        entitlement_id: "ent-shared",
        executor_class: "external-agent",
        model_id: "model-shared",
        state: "active",
        compatibility: proof,
      },
      policy_decision_refs: ["policy:entitlement:shared", proof.policy_ref],
    });
    const first = vi.fn(async () => "adapter-a");
    const second = vi.fn(async () => "adapter-b");
    const registry = createExecutorRegistry({
      "adapter-shared-a": { provider_id: "shared", adapter_id: "adapter-shared-a", execute: first },
      "adapter-shared-b": { provider_id: "shared", adapter_id: "adapter-shared-b", execute: second },
    }, { bindingService, compatibilityRegistry });

    await expect(registry.execute("shared", governedRequest({ executionBinding: binding }))).resolves.toBe("adapter-b");
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it("fails closed when the bound adapter belongs to another provider", async () => {
    const bindingService = createExecutionBindingService({ idFactory: () => "mismatch" });
    const binding = bindingService.createBinding({
      ...bindingRequest(),
      binding_request_id: "br-mismatch",
      eligible_target: {
        ...bindingRequest().eligible_target,
        adapter_id: "adapter-other",
        compatibility: { ...compatibilityProof(), adapter_id: "adapter-other" },
      },
      policy_decision_refs: ["policy:entitlement:1", COMPAT_POLICY_REF],
    });
    const compatibilityRegistry = createProviderCompatibilityRegistry([{
      ...compatibilityRecord(),
      allowed_adapter_ids: ["adapter-other"],
    }]);
    const execute = vi.fn(async () => "wrong");
    const registry = createExecutorRegistry({
      "adapter-other": { provider_id: "other", adapter_id: "adapter-other", execute },
    }, { bindingService, compatibilityRegistry });

    await expect(registry.execute("codex", governedRequest({ executionBinding: binding }))).rejects.toMatchObject({
      code: "ADAPTER_PROVIDER_MISMATCH",
    });
    expect(execute).not.toHaveBeenCalled();
  });
});
