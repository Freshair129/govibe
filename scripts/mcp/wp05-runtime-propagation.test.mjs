// Moved from tests/wp05-runtime-propagation.test.js (TASK-PRD-018 / AUD-26): the old location
// under tests/ was never collected (vitest.config.ts only collects src/**/*.test.ts,
// scripts/**/*.test.mjs, and packages/**/*.test.mjs) and, even collected, its use of node:test's
// bare `test()`/`assert` (instead of vitest's describe/it/expect) would not register as vitest
// test cases under the vitest runner. Converted to vitest syntax here — same assertions, same
// coverage of runtime-argument-hardening.mjs's forwarding-argument builders and the typed MSP
// vault/context contract wrapper in msp-vault-context-contracts.mjs.
import { describe, expect, it } from "vitest";

import {
  buildContinueForwardingArgs,
  buildImpactForwardingArgs,
} from "./runtime-argument-hardening.mjs";
import { createTypedVaultContextMsp } from "./msp-vault-context-contracts.mjs";

describe("WP-05 runtime argument propagation", () => {
  it("continue forwarding preserves lineage and profile arguments", () => {
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
    expect(result.contextProfile).toBe("M-ctx");
    expect(result.workflowRef).toBe("workflow-1");
    expect(result.parentContextId).toBe("context-0");
    expect(result.sessionId).toBe("session-1");
    expect(result.runId).toBe("run-1");
    expect(result.turnId).toBe("turn-7");
    expect(result.mspClient).toBe(client);
  });

  it("impact forwarding preserves traversal controls", () => {
    expect(buildImpactForwardingArgs({
      paths: ["docs/a.md"],
      changeType: "schema_breaking",
      maxDistance: 6,
      minimumScore: 0.75,
    }, "/workspace")).toEqual({
      workspacePath: "/workspace",
      paths: ["docs/a.md"],
      changeType: "schema_breaking",
      maxDistance: 6,
      minimumScore: 0.75,
    });
  });

  it("typed vault mount validates MSP namespaces", async () => {
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
    expect(result.mounted).toBe(true);
    expect(result.policyDecision).toBe("allow");
  });

  it("typed context audit rejects malformed parent response", async () => {
    const typed = createTypedVaultContextMsp({
      call: async () => ({ audit_ref: "wrong:audit", context_id: "context-1", replayable: true, hash_valid: true, policy_decision: "allow" }),
    });
    await expect(typed.auditContext({ actor: "tester", contextId: "context-1" })).rejects.toThrow(/namespace/);
  });
});
