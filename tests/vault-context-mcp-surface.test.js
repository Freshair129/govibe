import test from "node:test";
import assert from "node:assert/strict";

import {
  createVaultContextToolHandler,
  handlesVaultContextTool,
  vaultContextToolCatalog,
} from "../scripts/mcp/vault-context-surface.mjs";

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

test("catalog exposes all seven documented vault/context commands", () => {
  const names = vaultContextToolCatalog.map((tool) => tool.name);
  assert.deepEqual(names, [
    "govibe.vault.status",
    "govibe.vault.mount",
    "govibe.context.resolve",
    "govibe.context.diff",
    "govibe.context.audit",
    "govibe.context.replay",
    "govibe.memory.promote",
  ]);
  for (const name of names) assert.equal(handlesVaultContextTool(name), true);
});

test("context resolve uses the typed MSP client boundary", async () => {
  const { runtime, calls } = createRuntime();
  const handle = createVaultContextToolHandler(runtime);
  const response = await handle("govibe.context.resolve", {
    actor: "tester",
    workspaceId: "workspace-1",
    workspacePath: "/tmp/workspace",
    agentId: "agent-1",
    contextProfile: "V-ctx",
  });
  assert.equal(calls[0].name, "resolveContext");
  assert.equal(calls[0].input.contextProfile, "V-ctx");
  assert.equal(response.structuredContent.capability, "govibe.context.resolve");
});

test("vault mount maps command fields to MSP wire fields", async () => {
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
  assert.equal(calls[0].name, "msp_vault_mount");
  assert.equal(calls[0].input.mount_alias, "shared-design");
  assert.equal(calls[0].input.access_mode, "read");
});

test("memory promotion fails closed without evidence", async () => {
  const { runtime } = createRuntime();
  const handle = createVaultContextToolHandler(runtime);
  await assert.rejects(
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
    /evidenceRefs/,
  );
});

test("surface fails closed when MSP is unavailable", async () => {
  const handle = createVaultContextToolHandler({});
  await assert.rejects(
    handle("govibe.vault.status", { actor: "tester", workspaceId: "workspace-1" }),
    /MSP parent capability is unavailable/,
  );
});
