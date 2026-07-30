import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validateDeepScan } from "./graph-validation.mjs";
import { CANONICAL_STAGES, validateStageRun } from "./stage-contract.mjs";
import { mkdirSafe } from "../path-safety.mjs";

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function knowledgePayload(output) {
  return {
    atoms: output.nodes ?? [],
    symbols: output.symbols ?? [],
    relations: output.edges ?? [],
    context_snapshots: [
      ...(output.communities?.length ? [{ kind: "communities", value: output.communities }] : []),
      ...(output.processes?.length ? [{ kind: "processes", value: output.processes }] : []),
    ],
  };
}

export async function runDeepScan({ workspacePath, inventory, mspClient, gksClient, actor, adapters, runId = randomUUID(), resume = false }) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(runId) || runId.includes("..")) {
    throw new Error(`Invalid scan runId: ${runId}`);
  }
  const runDirectory = path.join(workspacePath, ".govibe", "runs", runId);
  const runRoot = path.join(runDirectory, "stages");
  await mkdirSafe(workspacePath, runRoot);
  const runMetaPath = path.join(runDirectory, "run.json");
  let runMeta;
  try {
    runMeta = JSON.parse(await readFile(runMetaPath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    runMeta = { schema: "govibe-scan-run/v1", runId, createdAt: new Date().toISOString() };
    await writeFile(runMetaPath, `${JSON.stringify(runMeta, null, 2)}\n`, { flag: "wx" });
  }
  if (runMeta.schema !== "govibe-scan-run/v1" || runMeta.runId !== runId || !runMeta.createdAt) {
    throw new Error(`Invalid scan run metadata: ${runMetaPath}`);
  }
  const inventoryHash = hash(inventory);
  const stageRuns = [];

  for (let index = 0; index < CANONICAL_STAGES.length; index += 1) {
    const stage = index + 1;
    const recordPath = path.join(runRoot, `${String(stage).padStart(2, "0")}.json`);
    // Resume replays deterministic writes through MSP/GKS instead of trusting local records.

    let record;
    try {
      const output = await adapters[index]({ inventory, stageRuns, workspacePath });
      if (output.incomplete) {
        const recordId = `${runId}-stage-${String(stage).padStart(2, "0")}`;
        const proof = await mspClient.recordEvidence({
          schema_version: "govibe-proof-batch/v1",
          idempotency_key: `proof-${recordId}`,
          run_id: runId,
          stage,
          source_snapshot_hash: inventoryHash,
          findings: [{ kind: "incomplete", message: output.incomplete }],
          stage_evidence: [{ ref: "inventory:l1", source_hash: inventoryHash, kind: "scan-stage-incomplete" }],
          verification: { verdict: "blocked", method: output.method ?? "parser-coverage" },
          artifact_lineage: [],
          actor,
          recorded_at: runMeta.createdAt,
        });
        const proofRef = proof.proofRef;
        if (!proofRef) throw new Error("MSP writer returned no proof reference for incomplete stage.");
        record = { schema: "govibe-stage-run/v1", runId, stage, name: CANONICAL_STAGES[index], status: "incomplete", inputRefs: ["inventory:l1"], outputRefs: [`incomplete:${output.incomplete}`, proofRef], method: output.method ?? "parser-coverage", confidence: 0, exclusions: [], error: output.incomplete };
      } else if (output.notApplicable) {
        const recordId = `${runId}-stage-${String(stage).padStart(2, "0")}`;
        const proof = await mspClient.recordEvidence({
          schema_version: "govibe-proof-batch/v1",
          idempotency_key: `proof-${recordId}`,
          run_id: runId,
          stage,
          source_snapshot_hash: inventoryHash,
          findings: [],
          stage_evidence: [{ ref: "inventory:l1", source_hash: inventoryHash, kind: "scan-stage-exclusion" }],
          verification: { verdict: "passed", method: "inventory-exclusion" },
          artifact_lineage: [],
          actor,
          recorded_at: runMeta.createdAt,
        });
        const proofRef = proof.proofRef;
        if (!proofRef) throw new Error("MSP writer returned no proof reference for exclusion.");
        record = { schema: "govibe-stage-run/v1", runId, stage, name: CANONICAL_STAGES[index], status: "not_applicable", inputRefs: ["inventory:l1"], outputRefs: [`exclusion:${output.notApplicable}`, proofRef], method: "inventory-exclusion", confidence: 1, exclusions: [output.notApplicable] };
      } else {
        const recordId = `${runId}-stage-${String(stage).padStart(2, "0")}`;
        const provenanceProof = await mspClient.recordEvidence({
          schema_version: "govibe-proof-batch/v1",
          idempotency_key: `proof-${recordId}-provenance`,
          run_id: runId,
          stage,
          source_snapshot_hash: inventoryHash,
          findings: [],
          stage_evidence: [{ ref: "inventory:l1", source_hash: inventoryHash, kind: "scan-stage" }],
          verification: { verdict: "passed", method: output.method },
          artifact_lineage: [],
          actor,
          recorded_at: runMeta.createdAt,
        });
        const provenanceProofRef = provenanceProof.proofRef;
        if (!provenanceProofRef) throw new Error("MSP writer returned no provenance proof reference.");
        const knowledge = await gksClient.upsertCodeKnowledge({
          schema_version: "govibe-knowledge-batch/v1",
          idempotency_key: recordId,
          run_id: runId,
          stage,
          source_snapshot_hash: inventoryHash,
          provenance_ref: provenanceProofRef,
          ...knowledgePayload(output),
        });
        const knowledgeRef = knowledge.knowledgeRef;
        const knowledgeHash = knowledge.sourceHash;
        if (!knowledgeRef) throw new Error("GKS writer returned no knowledge reference.");
        if (typeof knowledgeHash !== "string" || !/^[a-f0-9]{64}$/i.test(knowledgeHash)) throw new Error("GKS writer returned no knowledge source hash.");
        const proof = await mspClient.recordEvidence({
          schema_version: "govibe-proof-batch/v1",
          idempotency_key: `proof-${recordId}`,
          run_id: runId,
          stage,
          source_snapshot_hash: knowledgeHash,
          findings: [],
          stage_evidence: [{ ref: knowledgeRef, source_hash: knowledgeHash, kind: "knowledge-link", provenance_ref: provenanceProofRef }],
          verification: { verdict: "passed", method: output.method },
          artifact_lineage: [],
          actor,
          recorded_at: runMeta.createdAt,
          knowledge_ref: knowledgeRef,
        });
        const proofRef = proof.proofRef;
        if (!proofRef) throw new Error("MSP writer returned no proof reference.");
        record = { schema: "govibe-stage-run/v1", runId, stage, name: CANONICAL_STAGES[index], status: "complete", inputRefs: ["inventory:l1"], outputRefs: [knowledgeRef, provenanceProofRef, proofRef], method: output.method, confidence: 1, exclusions: [] };
      }
    } catch (error) {
      record = { schema: "govibe-stage-run/v1", runId, stage, name: CANONICAL_STAGES[index], status: "failed", inputRefs: ["inventory:l1"], outputRefs: [], method: "stage-adapter", confidence: 0, exclusions: [], error: error instanceof Error ? error.message : String(error) };
    }
    validateStageRun(record);
    await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`);
    stageRuns.push(record);
  }

  const graphValidation = validateDeepScan(stageRuns);
  return { schema: "govibe-scan-result/v1", runId, level: "L2", status: graphValidation.passed ? "complete" : "incomplete", stageRuns, graphValidation };
}
