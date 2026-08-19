// Moved from tests/vault-context-mcp-surface.test.js (TASK-PRD-018 / AUD-26): the old location
// under tests/ was never collected (vitest.config.ts only collects src/**/*.test.ts,
// scripts/**/*.test.mjs, and packages/**/*.test.mjs) and, even collected, its use of node:test's
// bare `test()`/`assert` (instead of vitest's describe/it/expect) would not register as vitest
// test cases under the vitest runner. Converted to vitest syntax here — same assertions, same
// coverage of the tool catalog, MSP field mapping, and fail-closed behavior in
// vault-context-surface.mjs — which is distinct from the contextAuthority-forwarding coverage in
// the pre-existing collected vault-context-surface.test.mjs (that file only exercises
// govibe.context.resolve; this one exercises the catalog, govibe.vault.mount, govibe.memory.promote,
// and the MSP-unavailable fail-closed path).
import { describe, expect, it } from "vitest";

import {
  createVaultContextToolHandler,
  handlesVaultContextTool,
  vaultContextToolCatalog,
} from "./vault-context-surface.mjs";

// Matches the shape validateContextAuthorityCorrelation requires (see the sibling collected
// vault-context-surface.test.mjs, which pins the authority-forwarding contract itself). This
// test only needs a VALID authority so it can exercise the MSP client boundary underneath it —
// the fail-closed/rejection paths for a missing or malformed authority are already covered there.
function contextAuthority() {
  return {
    schemaVersion: "govibe-context-authority/v1",
    identity: { taskId: "TASK-moved", agentId: "agent-1", workspaceId: "workspace-1", runId: "run-moved", sessionId: "session-moved", turnId: "turn-moved" },
    sources: [{ id: "API-007", version: "0.1.0", hash: "a".repeat(64) }],
    requiredReasonRefs: ["issue:moved"],
    traversal: { relationAllowlist: ["implements"], retrievalRadius: 1, inclusions: [], exclusions: [] },
    knowledgeRefs: ["gks:shared/moved"],
    budget: { maxTokens: 1024, compaction: "bounded" },
    lineage: { contextId: "ctx-moved", cacheId: "cache-moved", parentContextId: null },
    unresolvedAssumptions: [],
  };
}

function createRuntime() {
  const calls = [];
  const mspClient = {
    async call(name, input) {
      calls.push({ name, input });
      return { status: "ok", parentTool: name };
    },
    async resolveContext(input) {
      calls.push({ name: "resolveContext", input });
      return { sharedVaultRefs: [], policyDecisions: [] };
    },
    async replayContext(input) {
      calls.push({ name: "replayContext", input });
      return { replayRef: "msp:replay/test", contextReproducible: true };
    },
  };
  return { runtime: { mspClient }, calls };
}

describe("vault/context MCP surface", () => {
  it("catalog exposes all seven documented vault/context commands", () => {
    const names = vaultContextToolCatalog.map((tool) => tool.name);
    expect(names).toEqual([
      "govibe.vault.status",
      "govibe.vault.mount",
      "govibe.context.resolve",
      "govibe.context.diff",
      "govibe.context.audit",
      "govibe.context.replay",
      "govibe.memory.promote",
    ]);
    for (const name of names) expect(handlesVaultContextTool(name)).toBe(true);
  });

  it("context resolve uses the typed MSP client boundary", async () => {
    const { runtime, calls } = createRuntime();
    const handle = createVaultContextToolHandler(runtime);
    const response = await handle("govibe.context.resolve", {
      actor: "tester",
      workspaceId: "workspace-1",
      workspacePath: "/tmp/workspace",
      agentId: "agent-1",
      contextProfile: "V-ctx",
      contextAuthority: contextAuthority(),
    });
    expect(calls[0].name).toBe("resolveContext");
    expect(calls[0].input.contextProfile).toBe("V-ctx");
    expect(response.structuredContent.capability).toBe("govibe.context.resolve");
  });

  it("vault mount maps command fields to MSP wire fields", async () => {
    const { runtime, calls } = createRuntime();
    const handle = createVaultContextToolHandler(runtime);
    await handle("govibe.vault.mount", {
      actor: "tester",
      workspaceId: "workspace-1",
      workspacePath: "/tmp/workspace",
      vaultId: "vault-shared-1",
      mountAlias: "shared-design",
      reason: "Review architecture",
    });
    expect(calls[0].name).toBe("msp_vault_mount");
    expect(calls[0].input.mount_alias).toBe("shared-design");
    expect(calls[0].input.access_mode).toBe("read");
  });

  it("memory promotion fails closed without evidence", async () => {
    const { runtime } = createRuntime();
    const handle = createVaultContextToolHandler(runtime);
    await expect(
      handle("govibe.memory.promote", {
        actor: "tester",
        agentId: "agent-1",
        workspaceId: "workspace-1",
        sourceMemoryRef: "msp:memory/episode-1",
        targetScope: "global_private",
        candidate: { summary: "durable lesson" },
        evidenceRefs: [],
        reason: "Repeated pattern",
        idempotencyKey: "promote-1",
      }),
    ).rejects.toThrow(/evidenceRefs/);
  });

  it("surface fails closed when MSP is unavailable", async () => {
    const handle = createVaultContextToolHandler({});
    await expect(
      handle("govibe.vault.status", { actor: "tester", workspaceId: "workspace-1" }),
    ).rejects.toThrow(/MSP parent capability is unavailable/);
  });
});
