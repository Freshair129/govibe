import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { MspClient } from "../src/msp-client.mjs";
import { createMspStdioCaller } from "../src/msp-stdio-transport.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(here, "fixtures", "reference-msp-server.mjs");
const openCalls = [];

function contextAuthority(overrides = {}) {
  return {
    schemaVersion: "govibe-context-authority/v1",
    identity: { taskId: "TASK-live", agentId: "agent-reference", workspaceId: "workspace-reference", runId: "run-live", sessionId: "session-live", turnId: "turn-live" },
    sources: [{ id: "API-007", version: "0.1.0", hash: "a".repeat(64) }],
    requiredReasonRefs: ["issue:live"],
    traversal: { relationAllowlist: ["implements"], retrievalRadius: 1, inclusions: [], exclusions: [] },
    knowledgeRefs: ["gks:shared/reference"],
    budget: { maxTokens: 1024, compaction: "bounded" },
    lineage: { contextId: "ctx-live", cacheId: "cache-live", parentContextId: null },
    unresolvedAssumptions: [],
    ...overrides,
  };
}

function liveClient(mode = "normal", timeoutMs = 1500) {
  const call = createMspStdioCaller({
    command: process.execPath,
    args: [fixture],
    timeoutMs,
    env: { ...process.env, MSP_FIXTURE_MODE: mode },
  });
  openCalls.push(call);
  return { call, client: new MspClient(call) };
}

afterEach(() => {
  while (openCalls.length) openCalls.pop().close();
});

describe("MSP live stdio contract", () => {
  it("resolves governed context through a spawned JSON-RPC server", async () => {
    const { client } = liveClient();
    const result = await client.resolveContext({
      workspacePath: process.cwd(),
      workspaceId: "workspace-reference",
      agentId: "agent-reference",
      contextProfile: "V-ctx",
      workflowRef: "msp:workflow/reference",
      contextAuthority: contextAuthority(),
    });

    expect(result.sharedVaultRefs[0].ref).toBe("gks:shared/reference");
    expect(result.policyDecisions[0].decision).toBe("allow");
    expect(result.diffRef).toBe("msp:diff/reference");
  });

  it("rejects a live wrong-namespace response", async () => {
    const { client } = liveClient("wrong-namespace");
    await expect(client.resolveContext({
      workspacePath: process.cwd(),
      workspaceId: "workspace-reference",
      agentId: "agent-reference",
      contextProfile: "T-ctx",
      contextAuthority: contextAuthority(),
    })).rejects.toThrow(/out-of-namespace shared vault/i);
  });

  it("surfaces a parent JSON-RPC error", async () => {
    const { call } = liveClient("parent-error");
    await expect(call("msp_vault_status", { workspace_id: "workspace-reference" }))
      .rejects.toThrow(/parent denied/i);
  });

  it("rejects malformed JSON and cleans up the child", async () => {
    const { call } = liveClient("malformed");
    await expect(call("msp_vault_status", { workspace_id: "workspace-reference" }))
      .rejects.toThrow(/malformed JSON/i);
  });

  it("times out deterministically", async () => {
    const { call } = liveClient("hang", 50);
    await expect(call("msp_vault_status", { workspace_id: "workspace-reference" }))
      .rejects.toThrow(/timed out after 50ms/i);
  });

  it("returns the same promotion reference for an idempotent retry", async () => {
    const { call } = liveClient();
    const input = {
      idempotency_key: "promotion-reference-1",
      target_scope: "shared",
      evidence_refs: ["msp:proof/reference"],
    };
    const first = await call("msp_memory_promote", input);
    const second = await call("msp_memory_promote", input);

    expect(second.promotion_ref).toBe(first.promotion_ref);
    expect(second.target_ref).toBe(first.target_ref);
  });
});
