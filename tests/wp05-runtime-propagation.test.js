import test from "node:test";
import assert from "node:assert/strict";

import {
  buildContinueForwardingArgs,
  buildImpactForwardingArgs,
} from "../scripts/mcp/runtime-argument-hardening.mjs";
import { createTypedVaultContextMsp } from "../scripts/mcp/msp-vault-context-contracts.mjs";

test("continue forwarding preserves lineage and profile arguments", () => {
  const client = {};
  const result = buildContinueForwardingArgs({
    actor: "tester",
    executor: "claude-code",
    agentId: "ather",
    contextProfile: "M-ctx",
    workflowId: "workflow-1",
    parentContextId: "context-0",
    sessionId: "session-1",
    runId: "run-1",
    turnId: "turn-7",
  }, "/workspace", client, ["abc"]);
  assert.equal(result.contextProfile, "M-ctx");
  assert.equal(result.workflowRef, "workflow-1");
  assert.equal(result.parentContextId, "context-0");
  assert.equal(result.sessionId, "session-1");
  assert.equal(result.runId, "run-1");
  assert.equal(result.turnId, "turn-7");
  assert.equal(result.mspClient, client);
});

test("impact forwarding preserves traversal controls", () => {
  assert.deepEqual(buildImpactForwardingArgs({
    paths: ["docs/a.md"],
    changeType: "schema_breaking",
    maxDistance: 6,
    minimumScore: 0.75,
  }, "/workspace"), {
    workspacePath: "/workspace",
    paths: ["docs/a.md"],
    changeType: "schema_breaking",
    maxDistance: 6,
    minimumScore: 0.75,
  });
});

test("typed vault mount validates MSP namespaces", async () => {
  const typed = createTypedVaultContextMsp({
    call: async () => ({
      mount_ref: "msp:vault-mount/mount-1",
      vault_ref: "msp:vault/vault-1",
      policy_decision: "allow",
      mounted: true,
    }),
  });
  const result = await typed.mountVault({
    actor: "tester",
    workspaceId: "workspace-1",
    workspacePath: "/workspace",
    vaultId: "vault-1",
    mountAlias: "shared",
    reason: "test",
  });
  assert.equal(result.mounted, true);
  assert.equal(result.policyDecision, "allow");
});

test("typed context audit rejects malformed parent response", async () => {
  const typed = createTypedVaultContextMsp({
    call: async () => ({ audit_ref: "wrong:audit", context_id: "context-1", replayable: true, hash_valid: true, policy_decision: "allow" }),
  });
  await assert.rejects(() => typed.auditContext({ actor: "tester", contextId: "context-1" }), /namespace/);
});
