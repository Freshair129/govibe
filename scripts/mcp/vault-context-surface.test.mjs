import { describe, expect, it } from "vitest";

import { createVaultContextToolHandler } from "./vault-context-surface.mjs";

function contextAuthority() {
  return {
    schemaVersion: "govibe-context-authority/v1",
    identity: { taskId: "TASK-legacy", agentId: "legacy-agent", workspaceId: "workspace-legacy", runId: "run-legacy", sessionId: "session-legacy", turnId: "turn-legacy" },
    sources: [{ id: "API-007", version: "0.1.0", hash: "a".repeat(64) }],
    requiredReasonRefs: ["issue:legacy"],
    traversal: { relationAllowlist: ["implements"], retrievalRadius: 1, inclusions: [], exclusions: [] },
    knowledgeRefs: ["gks:shared/legacy"],
    budget: { maxTokens: 1024, compaction: "bounded" },
    lineage: { contextId: "ctx-legacy", cacheId: "cache-legacy", parentContextId: null },
    unresolvedAssumptions: [],
  };
}

describe("legacy vault context resolve", () => {
  it("forwards only caller-supplied valid authority to MSP", async () => {
    const calls = [];
    const handler = createVaultContextToolHandler({
      mspClient: {
        call: async () => ({}),
        resolveContext: async (input) => {
          calls.push(input);
          return { contextId: "ctx-legacy", cacheId: "cache-legacy" };
        },
      },
    });
    const authority = contextAuthority();

    await handler("govibe.context.resolve", {
      actor: "legacy-agent",
      workspaceId: "workspace-legacy",
      workspacePath: "/workspace/legacy",
      agentId: "legacy-agent",
      contextProfile: "V-ctx",
      contextAuthority: authority,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].contextAuthority).toBe(authority);
    expect(calls[0].knowledgeRefs).toEqual(authority.knowledgeRefs);
  });

  it("fails closed without authority before calling MSP", async () => {
    const calls = [];
    const handler = createVaultContextToolHandler({
      mspClient: {
        call: async () => ({}),
        resolveContext: async (input) => {
          calls.push(input);
          return {};
        },
      },
    });

    await expect(handler("govibe.context.resolve", {
      actor: "legacy-agent",
      workspaceId: "workspace-legacy",
      workspacePath: "/workspace/legacy",
      agentId: "legacy-agent",
      contextProfile: "V-ctx",
    })).rejects.toMatchObject({ code: "missing_runtime_authority" });
    expect(calls).toHaveLength(0);
  });

  it("rejects incomplete caller authority before calling MSP", async () => {
    const calls = [];
    const handler = createVaultContextToolHandler({
      mspClient: {
        call: async () => ({}),
        resolveContext: async (input) => {
          calls.push(input);
          return {};
        },
      },
    });
    const authority = contextAuthority();
    delete authority.identity.sessionId;

    await expect(handler("govibe.context.resolve", {
      actor: "legacy-agent",
      workspaceId: "workspace-legacy",
      workspacePath: "/workspace/legacy",
      agentId: "legacy-agent",
      contextProfile: "V-ctx",
      contextAuthority: authority,
    })).rejects.toMatchObject({ code: "invalid_runtime_authority" });
    expect(calls).toHaveLength(0);
  });

  it("rejects workspace, agent, parent-lineage, and requested-knowledge mismatches before MSP", async () => {
    const calls = [];
    const handler = createVaultContextToolHandler({ mspClient: { call: async () => ({}), resolveContext: async (input) => { calls.push(input); return {}; } } });
    const base = { actor: "legacy-agent", workspaceId: "workspace-legacy", workspacePath: "/workspace/legacy", agentId: "legacy-agent", contextProfile: "V-ctx", contextAuthority: contextAuthority() };

    await expect(handler("govibe.context.resolve", { ...base, workspaceId: "workspace-other" })).rejects.toMatchObject({ code: "authority_identity_mismatch" });
    await expect(handler("govibe.context.resolve", { ...base, agentId: "agent-other" })).rejects.toMatchObject({ code: "authority_identity_mismatch" });
    await expect(handler("govibe.context.resolve", { ...base, parentContextId: "ctx-other" })).rejects.toMatchObject({ code: "authority_lineage_mismatch" });
    await expect(handler("govibe.context.resolve", { ...base, knowledgeRefs: ["gks:scope/other"] })).rejects.toMatchObject({ code: "knowledge_scope_mismatch" });
    expect(calls).toHaveLength(0);
  });

  it("preserves unrestricted and unresolved-assumption authority codes", async () => {
    const handler = createVaultContextToolHandler({ mspClient: { call: async () => ({}), resolveContext: async () => ({}) } });
    const base = { actor: "legacy-agent", workspaceId: "workspace-legacy", workspacePath: "/workspace/legacy", agentId: "legacy-agent", contextProfile: "V-ctx" };
    await expect(handler("govibe.context.resolve", { ...base, contextAuthority: { ...contextAuthority(), traversal: { relationAllowlist: ["*"], retrievalRadius: 1, inclusions: [], exclusions: [] } } })).rejects.toMatchObject({ code: "unrestricted_traversal" });
    await expect(handler("govibe.context.resolve", { ...base, contextAuthority: { ...contextAuthority(), unresolvedAssumptions: ["missing approval"] } })).rejects.toMatchObject({ code: "unresolved_assumption" });
  });
});
