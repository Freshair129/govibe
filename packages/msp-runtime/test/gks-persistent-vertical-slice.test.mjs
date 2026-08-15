import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";

import { afterEach, describe, expect, it } from "vitest";

import { createServer } from "../src/server.mjs";

const cleanups = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()();
});

function openServer(dbPath, options = {}) {
  return createServer({
    dbPath,
    gksProviderMode: "sqlite",
    input: new PassThrough(),
    output: new PassThrough(),
    ...options,
  });
}

function authority({ workspaceId = "workspace-fixture", agentId = "agent-fixture", sourceHash }) {
  return {
    schemaVersion: "govibe-context-authority/v1",
    identity: {
      taskId: "task-74",
      agentId,
      workspaceId,
      runId: "run-retrieve",
      sessionId: "session-retrieve",
      turnId: "turn-retrieve",
    },
    lineage: {
      contextId: "msp:context/authority-fixture",
      cacheId: "cache-authority-fixture",
      parentContextId: null,
    },
    sources: [{ id: "docs/fixture.md", version: "1", hash: sourceHash }],
    budget: { maxTokens: 4096 },
  };
}

function boundedGraphQuery(sourceHash) {
  return {
    schema_version: "govibe-bounded-graph-query/v1",
    seeds: [],
    required_reason_refs: ["msp:proof/reason-fixture"],
    relation_allowlist: ["defines", "references"],
    radius: 2,
    inclusions: [],
    exclusions: [],
    source_constraints: [{ id: "docs/fixture.md", version: "1", hash: sourceHash }],
    budget: { maxTokens: 4096 },
  };
}

describe("#74 persistent GKS vertical slice", () => {
  it("promotes canonical knowledge, closes the runtime, reopens it, and retrieves provenance", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "govibe-gks-74-"));
    cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
    const dbPath = path.join(directory, "msp.sqlite3");
    const sourceHash = "a".repeat(64);

    const first = openServer(dbPath);
    const health = (await first.toolRegistry.dispatch("msp_health", {})).structuredContent;
    expect(health).toMatchObject({
      health_state: "ready",
      components: { gks: { state: "ready" }, storage: { state: "ready" } },
    });

    const proof = (await first.toolRegistry.dispatch("msp_evidence_record", {
      schema_version: "govibe-proof-batch/v1",
      idempotency_key: "proof-74",
      run_id: "run-promote",
      stage: 4,
      source_snapshot_hash: sourceHash,
      verification: { verdict: "passed" },
    })).structuredContent;

    const promoted = (await first.toolRegistry.dispatch("msp_knowledge_promote", {
      schema_version: "govibe-knowledge-candidate/v1",
      idempotency_key: "candidate-74",
      workspace_id: "workspace-fixture",
      run_id: "run-promote",
      stage: 4,
      source_snapshot_hash: sourceHash,
      source_version: "1",
      provenance_ref: proof.proof_ref,
      atom_ref: "atom:fixture/readme-heading",
      atom: { kind: "heading", text: "Persistent fixture knowledge" },
    })).structuredContent;

    expect(promoted.knowledge_ref).toMatch(/^gks:knowledge\/[a-f0-9]{64}$/);
    expect(promoted.source_hash).toBe(sourceHash);
    expect(promoted.promotion_ref).toMatch(/^msp:promotion\//);

    first.close();

    const second = openServer(dbPath);
    cleanups.push(() => second.close());
    const resolved = (await second.toolRegistry.dispatch("msp_context_resolve", {
      workspace_root: directory,
      workspace_id: "workspace-fixture",
      agent_id: "agent-fixture",
      context_profile: "T-ctx",
      knowledge_refs: [],
      state_keys: [],
      context_authority: authority({ sourceHash }),
      bounded_graph_query: boundedGraphQuery(sourceHash),
    })).structuredContent;

    expect(resolved.context_id).toMatch(/^msp:context\//);
    expect(resolved.shared_vault_refs).toContainEqual({
      ref: promoted.knowledge_ref,
      source_hash: sourceHash,
      version: "1",
    });
    expect(resolved.approved_budget).toMatchObject({ maxTokens: 4096, retrievalRadius: 2 });
    expect(resolved.retrieval_evidence_ref).toMatch(/^gks:retrieval\//);
    expect(resolved.provenance).toContainEqual(expect.objectContaining({
      knowledgeRef: promoted.knowledge_ref,
      sourceHash,
      provenanceRef: proof.proof_ref,
      atomRef: "atom:fixture/readme-heading",
      runId: "run-promote",
      stage: 4,
    }));
    expect(resolved.lineage).toMatchObject({
      runId: "run-retrieve",
      sessionId: "session-retrieve",
      turnId: "turn-retrieve",
    });
  });

  it("rejects an authority/workspace mismatch before GKS retrieval evidence is written", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "govibe-gks-74-deny-"));
    cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
    const instance = openServer(path.join(directory, "msp.sqlite3"));
    cleanups.push(() => instance.close());
    const sourceHash = "b".repeat(64);

    await expect(instance.toolRegistry.dispatch("msp_context_resolve", {
      workspace_root: directory,
      workspace_id: "workspace-requested",
      agent_id: "agent-fixture",
      context_authority: authority({ workspaceId: "workspace-authorized", sourceHash }),
      bounded_graph_query: boundedGraphQuery(sourceHash),
    })).rejects.toThrow(/workspace_id does not match context authority/i);

    const evidenceCount = instance.db.prepare("SELECT COUNT(*) AS count FROM gks_retrieval_evidence").get().count;
    expect(evidenceCount).toBe(0);
  });

  it("keeps the previous fail-closed behavior when no provider is explicitly configured", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "govibe-gks-74-default-"));
    cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
    const instance = createServer({
      dbPath: path.join(directory, "msp.sqlite3"),
      input: new PassThrough(),
      output: new PassThrough(),
    });
    cleanups.push(() => instance.close());

    await expect(instance.toolRegistry.dispatch("msp_knowledge_promote", {
      schema_version: "govibe-knowledge-candidate/v1",
      idempotency_key: "candidate-default",
      workspace_id: "workspace-fixture",
      run_id: "run-default",
      stage: 4,
      source_snapshot_hash: "c".repeat(64),
      provenance_ref: "msp:proof/default",
    })).rejects.toThrow(/gks_provider_unconfigured/i);
  });
});
