import { describe, expect, it } from "vitest";
import { createExecutionBindingService } from "./execution-binding-service.mjs";

function request(overrides = {}) {
  return {
    binding_request_id: "br_1",
    actor_id: "user_1",
    organization_id: "org_1",
    workspace_id: "ws_1",
    project_id: "proj_1",
    task_id: "task_1",
    agent_id: "agent_1",
    run_id: "run_1",
    session_id: "session_1",
    turn_id: "turn_1",
    context: {
      context_id: "ctx_1",
      cache_id: "cache_1",
      context_hash: "hash_1",
      source_manifest_hash: "manifest_1",
      context_profile: "T-ctx",
      tool_contract_hash: "tools_1",
      persisted: true,
    },
    eligible_target: {
      authorized: true,
      actor_id: "user_1",
      workspace_id: "ws_1",
      project_id: "proj_1",
      provider_id: "local",
      entitlement_id: "ent_1",
      executor_class: "local-llm",
      model_id: "qwen",
      state: "active",
    },
    policy_decision_refs: ["policy:entitlement:1"],
    ...overrides,
  };
}

describe("execution binding service", () => {
  it("creates an immutable binding from an authorized target and persisted context", () => {
    const service = createExecutionBindingService({ idFactory: () => "1" });
    const binding = service.createBinding(request());

    expect(binding.binding_id).toBe("bind_1");
    expect(binding.provider_id).toBe("local");
    expect(binding).toMatchObject({
      schema: "govibe-execution-binding/v1",
      actor_id: "user_1",
      principal_id: "user_1",
      workspace_id: "ws_1",
      task_id: "task_1",
      agent_id: "agent_1",
      run_id: "run_1",
      session_id: "session_1",
      turn_id: "turn_1",
      context_id: "ctx_1",
      cache_id: "cache_1",
    });
    expect(binding.context_hash).toBe("hash_1");
    expect(Object.isFrozen(binding)).toBe(true);
    expect(Object.isFrozen(binding.policy_decision_refs)).toBe(true);
  });

  it("rejects a context packet that was not persisted", () => {
    const service = createExecutionBindingService();
    expect(() => service.createBinding(request({ context: { ...request().context, persisted: false } }))).toThrowError(
      expect.objectContaining({ code: "CONTEXT_PACKET_NOT_PERSISTED" }),
    );
  });

  it("preserves an explicit credential handoff mode in the issued binding", () => {
    const service = createExecutionBindingService({ idFactory: () => "derived" });
    const binding = service.createBinding(request({ eligible_target: { ...request().eligible_target, credential_mode: "derived_token" } }));

    expect(binding.credential_mode).toBe("derived_token");
    expect(service.assertUsable(binding.binding_id, { credential_mode: "derived_token" })).toBe(binding);
  });

  it("rejects unsupported credential handoff modes", () => {
    const service = createExecutionBindingService();
    expect(() => service.createBinding(request({ eligible_target: { ...request().eligible_target, credential_mode: "oauth-session" } }))).toThrowError(
      expect.objectContaining({ code: "CREDENTIAL_MODE_INVALID" }),
    );
  });

  it("rejects an unauthorized entitlement target", () => {
    const service = createExecutionBindingService();
    expect(() => service.createBinding(request({ eligible_target: { ...request().eligible_target, authorized: false } }))).toThrowError(
      expect.objectContaining({ code: "ENTITLEMENT_NOT_AUTHORIZED" }),
    );
  });

  it("rejects principal, workspace and project substitution", () => {
    const service = createExecutionBindingService();

    expect(() => service.createBinding(request({ eligible_target: { ...request().eligible_target, actor_id: "user_2" } }))).toThrowError(
      expect.objectContaining({ code: "ENTITLEMENT_PRINCIPAL_MISMATCH" }),
    );
    expect(() => service.createBinding(request({ eligible_target: { ...request().eligible_target, workspace_id: "ws_2" } }))).toThrowError(
      expect.objectContaining({ code: "ENTITLEMENT_WORKSPACE_MISMATCH" }),
    );
    expect(() => service.createBinding(request({ eligible_target: { ...request().eligible_target, project_id: "proj_2" } }))).toThrowError(
      expect.objectContaining({ code: "ENTITLEMENT_PROJECT_MISMATCH" }),
    );
  });

  it("requires policy decision references", () => {
    const service = createExecutionBindingService();
    expect(() => service.createBinding(request({ policy_decision_refs: [] }))).toThrowError(
      expect.objectContaining({ code: "POLICY_DECISION_REQUIRED" }),
    );
  });

  it("validates exact binding scope and revocation", () => {
    const service = createExecutionBindingService({ idFactory: () => "2" });
    const binding = service.createBinding(request());

    expect(service.assertUsable(binding.binding_id, {
      actor_id: "user_1",
      workspace_id: "ws_1",
      run_id: "run_1",
      provider_id: "local",
      entitlement_id: "ent_1",
      context_hash: "hash_1",
    })).toBe(binding);

    expect(() => service.assertUsable(binding.binding_id, { run_id: "run_2" })).toThrowError(
      expect.objectContaining({ code: "EXECUTION_BINDING_SCOPE_MISMATCH" }),
    );

    service.revokeBinding(binding.binding_id);
    expect(() => service.assertUsable(binding.binding_id)).toThrowError(
      expect.objectContaining({ code: "EXECUTION_BINDING_REVOKED" }),
    );
  });

  it("rejects expired bindings", () => {
    let now = new Date("2026-08-03T00:00:00.000Z");
    const service = createExecutionBindingService({ clock: () => now, idFactory: () => "3", defaultTtlMs: 1000 });
    const binding = service.createBinding(request());
    now = new Date("2026-08-03T00:00:02.000Z");

    expect(() => service.assertUsable(binding.binding_id)).toThrowError(
      expect.objectContaining({ code: "EXECUTION_BINDING_EXPIRED" }),
    );
  });
});
