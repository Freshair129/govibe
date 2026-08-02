import assert from "node:assert/strict";
import test from "node:test";

import { ContextAuthorityError, validateContextAuthorityRequest } from "./context-authority-contract.mjs";
import { createVaultContextToolHandlerV2 } from "./vault-context-surface-v2.mjs";

const hash = "a".repeat(64);

function validArgs(overrides = {}) {
  return {
    actor: "boss",
    taskId: "TASK-54",
    agentId: "ATHER",
    workspaceId: "govibe",
    workspacePath: "/workspace/govibe",
    runId: "run-1",
    sessionId: "session-1",
    turnId: "turn-1",
    contextProfile: "W-ctx",
    requiredReasonRefs: ["issue:54", "adr:23"],
    relationAllowlist: ["implements", "derived_from", "verified_by"],
    retrievalRadius: 2,
    inclusions: ["api:007"],
    exclusions: ["marketing:*"],
    unresolvedAssumptions: [],
    sources: [{ id: "API-007", version: "0.1.0", hash }],
    budget: { maxTokens: 4096, compaction: "bounded" },
    lineage: { contextId: "ctx-1", cacheId: "cache-1", parentContextId: null },
    knowledgeRefs: ["gks:api/007"],
    ...overrides,
  };
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => error instanceof ContextAuthorityError && error.code === code);
}

test("fails closed when a required reason relation is missing", () => {
  expectCode(() => validateContextAuthorityRequest(validArgs({ requiredReasonRefs: [] })), "invalid_authority_field");
});

test("rejects unrestricted graph traversal", () => {
  expectCode(() => validateContextAuthorityRequest(validArgs({ relationAllowlist: ["*"] })), "unrestricted_traversal");
});

test("blocks dispatch when assumptions are unresolved", () => {
  expectCode(() => validateContextAuthorityRequest(validArgs({ unresolvedAssumptions: ["tax behavior not approved"] })), "unresolved_assumption");
});

test("retains explicit exclusions and source lineage", () => {
  const contract = validateContextAuthorityRequest(validArgs());
  assert.deepEqual(contract.traversal.exclusions, ["marketing:*"]);
  assert.deepEqual(contract.sources, [{ id: "API-007", version: "0.1.0", hash }]);
  assert.equal(contract.lineage.cacheId, "cache-1");
});

test("valid bounded context passes through the MSP resolver", async () => {
  const calls = [];
  const handler = createVaultContextToolHandlerV2({
    mspClient: {
      call: async () => ({}),
      resolveContext: async (input) => {
        calls.push(input);
        return { contextId: "ctx-1", cacheId: "cache-1", policyDecision: "allow" };
      },
    },
  });

  const result = await handler("govibe.context.resolve", validArgs());
  assert.equal(calls.length, 1);
  assert.equal(calls[0].contextAuthority.schemaVersion, "govibe-context-authority/v1");
  assert.deepEqual(calls[0].contextAuthority.traversal.exclusions, ["marketing:*"]);
  assert.equal(result.structuredContent.policyDecision, "allow");
});

test("external provider output cannot be promoted without candidate evidence", async () => {
  const handler = createVaultContextToolHandlerV2({
    mspClient: { call: async () => ({}) },
  });
  await assert.rejects(
    handler("govibe.memory.promote", {
      actor: "boss",
      agentId: "ATHER",
      workspaceId: "govibe",
      sourceMemoryRef: "provider:output/1",
      targetScope: "shared",
      candidate: { canonicalId: "gks:forbidden" },
      evidenceRefs: [],
      reason: "promote",
      idempotencyKey: "promotion-1",
    }),
    /evidenceRefs must contain at least one reference/,
  );
});
