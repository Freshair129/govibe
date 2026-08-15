import { performance } from "node:perf_hooks";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MspClient } from "../../src/msp-client.mjs";
import { createMspStdioCaller } from "../../src/msp-stdio-transport.mjs";
import { scanWorkspace } from "../../src/scan/scan.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
const runtimeBin = path.join(repoRoot, "packages", "msp-runtime", "bin", "msp-runtime.mjs");
const [phase, workspacePath, dbPath, workspaceId, sourceHash] = process.argv.slice(2);
const provider = process.env.TEST_GKS_PROVIDER ?? "sqlite";

const caller = createMspStdioCaller({
  command: process.execPath,
  args: [runtimeBin],
  timeoutMs: 5_000,
  env: { ...process.env, MSP_DB_PATH: dbPath, MSP_GKS_PROVIDER: provider },
});
const client = new MspClient(caller);

function authority({ requestedWorkspaceId = workspaceId, radius = 2, turn = "turn-retrieve" } = {}) {
  return {
    schemaVersion: "govibe-context-authority/v1",
    identity: {
      taskId: "issue-77-e2e",
      agentId: "agent-e2e",
      workspaceId: requestedWorkspaceId,
      runId: "run-retrieve",
      sessionId: "session-retrieve",
      turnId: turn,
    },
    lineage: { contextId: `msp:context/issue-77-${turn}`, cacheId: `cache-issue-77-${turn}`, parentContextId: null },
    sources: [{ id: "scan:fixture", version: "fixture-v1", hash: sourceHash }],
    requiredReasonRefs: ["issue:77"],
    traversal: { relationAllowlist: ["REFERENCES", "CALLS", "IMPORTS", "CONTAINS"], retrievalRadius: radius, inclusions: [], exclusions: [] },
    knowledgeRefs: [],
    budget: { maxTokens: 32_768, compaction: "bounded" },
    unresolvedAssumptions: [],
  };
}

async function main() {
  const health = await client.probeHealth();
  if (phase === "scan") {
    const result = await scanWorkspace({ workspacePath, deep: true, mspClient: client, actor: "issue-77-e2e", runId: "issue-77-scan" });
    return { phase, health, result };
  }
  if (phase === "retrieve") {
    const context = await client.resolveContext({ workspacePath, workspaceId, agentId: "agent-e2e", contextProfile: "T-ctx", contextAuthority: authority() });
    return { phase, health, context };
  }
  if (phase === "benchmark") {
    const samples = [];
    let lastContext = null;
    for (let index = 0; index < 20; index += 1) {
      const started = performance.now();
      lastContext = await client.resolveContext({
        workspacePath,
        workspaceId,
        agentId: "agent-e2e",
        contextProfile: "T-ctx",
        contextAuthority: authority({ turn: `turn-benchmark-${index}` }),
      });
      samples.push(performance.now() - started);
    }
    const ordered = [...samples].sort((a, b) => a - b);
    const p95 = ordered[Math.max(0, Math.ceil(ordered.length * 0.95) - 1)];
    return { phase, health, sampleCount: samples.length, p95Ms: p95, maxMs: ordered.at(-1), retrievedItems: lastContext?.sharedVaultRefs?.length ?? 0 };
  }
  if (phase === "deny-workspace") {
    try {
      await client.resolveContext({
        workspacePath,
        workspaceId: "workspace-not-authorized",
        agentId: "agent-e2e",
        contextProfile: "T-ctx",
        contextAuthority: authority(),
      });
      return { phase, health, unexpectedSuccess: true };
    } catch (error) {
      return { phase, health, unexpectedSuccess: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  if (phase === "deny-radius") {
    try {
      await client.resolveContext({ workspacePath, workspaceId, agentId: "agent-e2e", contextProfile: "T-ctx", contextAuthority: authority({ radius: 99 }) });
      return { phase, health, unexpectedSuccess: true };
    } catch (error) {
      return { phase, health, unexpectedSuccess: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  if (phase === "unavailable") {
    const proof = await client.recordEvidence({
      schema_version: "govibe-proof-batch/v1",
      idempotency_key: "issue-77-unavailable-proof",
      run_id: "issue-77-unavailable",
      stage: 3,
      source_snapshot_hash: sourceHash,
      verification: { verdict: "passed", method: "e2e-unavailable-check" },
    });
    try {
      await client.submitKnowledgeCandidate({
        schema_version: "govibe-knowledge-candidate/v1",
        idempotency_key: "issue-77-unavailable-candidate",
        workspace_id: workspaceId,
        run_id: "issue-77-unavailable",
        stage: 3,
        source_snapshot_hash: sourceHash,
        provenance_ref: proof.proofRef,
        candidate: { atoms: [{ id: "atom:unavailable" }] },
      });
      return { phase, health, unexpectedSuccess: true };
    } catch (error) {
      return { phase, health, unexpectedSuccess: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  throw new Error(`Unknown worker phase: ${phase}`);
}

try {
  const result = await main();
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  caller.close();
}