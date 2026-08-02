import assert from "node:assert/strict";
import test from "node:test";

import { ContextAuthorityError, validateContextAuthorityRequest } from "./context-authority-contract.mjs";
import { createVaultContextToolHandlerV2, vaultContextToolCatalog } from "./vault-context-surface-v2.mjs";

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
    exclusions: ["marketing:*"] ,
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

test("publishes the authority fields in the MCP resolve schema", () => {
  const tool = vaultContextToolCatalog.find((item) => item.name === "govibe.context.resolve");
  assert.ok(tool.inputSchema.required.includes("requiredReasonRefs"));
  assert.ok(tool.inputSchema.required.includes("sources"));
  assert.equal(tool.inputSchema.properties.retrievalRadius.maximum, 6);
});

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

test("valid bounded context passes through the MSP resolver and validates lineage", async () => {
  const calls = [];
  const handler = createVaultContextToolHandlerV2({
    mspClient: {
      call: async () => ({}),
      resolveContext: async (input) => {
        calls.push(input);
        return {
          contextId: "ctx-1",
          cacheId: "cache-1",
          policyDecision: "allow",
          sources: [{ id: "API-007", version: "0.1.0", hash }],
          lineage: { runId: "run-1", sessionId: "session-1", turnId: "turn-1" },
        };
      },
    },
  });

  const result = await handler("govibe.context.resolve", validArgs());
  assert.equal(calls.length, 1);
  assert.equal(calls[0].contextAuthority.schemaVersion, "govibe-context-authority/v1");
  assert.deepEqual(calls[0].contextAuthority.traversal.exclusions, ["marketing:*"]);
  assert.equal(result.structuredContent.policyDecision, "allow");
  assert.equal(result.structuredContent.lineage.turnId, "turn-1");
});

test("rejects MSP responses that change source lineage", async () => {
  const handler = createVaultContextToolHandlerV2({
    mspClient: {
      call: async () => ({}),
      resolveContext: async () => ({
        contextId: "ctx-1",
        cacheId: "cache-1",
        policyDecision: "allow",
        sources: [{ id: "API-007", version: "0.1.0", hash: "b".repeat(64) }],
      }),
    },
  });
  await assert.rejects(handler("govibe.context.resolve", validArgs()), (error) => error.code === "source_lineage_mismatch");
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
      candidate: { title: "candidate" },
      evidenceRefs: [],
      reason: "promote",
      idempotencyKey: "promotion-1",
    }),
    /evidenceRefs must contain at least one reference/,
  );
});

test("external provider output cannot assign a canonical GKS identity", async () => {
  const calls = [];
  const handler = createVaultContextToolHandlerV2({
    mspClient: { call: async (...args) => { calls.push(args); return {}; } },
  });
  await assert.rejects(
    handler("govibe.memory.promote", {
      actor: "boss",
      agentId: "ATHER",
      workspaceId: "govibe",
      sourceMemoryRef: "provider:output/1",
      targetScope: "shared",
      candidate: { canonicalId: "gks:forbidden" },
      evidenceRefs: ["evidence:1"],
      reason: "promote",
      idempotencyKey: "promotion-2",
    }),
    (error) => error.code === "provider_canonical_identity_forbidden",
  );
  assert.equal(calls.length, 0);
});
