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
  return Object.fromEntries(["symbols", "nodes", "edges", "communities", "processes"]
    .filter((key) => Array.isArray(output[key]) && output[key].length > 0)
    .map((key) => [key, output[key]]));
}

export async function runDeepScan({ workspacePath, inventory, mspClient, actor, adapters, runId = randomUUID(), resume = false }) {
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
        const proof = await mspClient.appendProof({
          workspace_root: workspacePath,
          record_id: `proof-${recordId}`,
          run_id: runId,
          provenance: { type: "scan-stage-incomplete", source_ref: "inventory:l1" },
          evidence: [{ ref: "inventory:l1", source_hash: inventoryHash }],
          verification: { verdict: "inconclusive", method: output.method ?? "parser-coverage" },
          actor,
          timestamp: runMeta.createdAt,
          source_hash: inventoryHash,
        });
        const proofRef = proof.proof_ref ?? proof.proofRef;
        if (!proofRef) throw new Error("MSP writer returned no proof reference for incomplete stage.");
        record = { schema: "govibe-stage-run/v1", runId, stage, name: CANONICAL_STAGES[index], status: "incomplete", inputRefs: ["inventory:l1"], outputRefs: [`incomplete:${output.incomplete}`, proofRef], method: output.method ?? "parser-coverage", confidence: 0, exclusions: [], error: output.incomplete };
      } else if (output.notApplicable) {
        const recordId = `${runId}-stage-${String(stage).padStart(2, "0")}`;
        const proof = await mspClient.appendProof({
          workspace_root: workspacePath,
          record_id: `proof-${recordId}`,
          run_id: runId,
          provenance: { type: "scan-stage-exclusion", source_ref: "inventory:l1" },
          evidence: [{ ref: "inventory:l1", source_hash: inventoryHash }],
          verification: { verdict: "pass", method: "inventory-exclusion" },
          actor,
          timestamp: runMeta.createdAt,
          source_hash: inventoryHash,
        });
        const proofRef = proof.proof_ref ?? proof.proofRef;
        if (!proofRef) throw new Error("MSP writer returned no proof reference for exclusion.");
        record = { schema: "govibe-stage-run/v1", runId, stage, name: CANONICAL_STAGES[index], status: "not_applicable", inputRefs: ["inventory:l1"], outputRefs: [`exclusion:${output.notApplicable}`, proofRef], method: "inventory-exclusion", confidence: 1, exclusions: [output.notApplicable] };
      } else {
        const recordId = `${runId}-stage-${String(stage).padStart(2, "0")}`;
        const provenanceProof = await mspClient.appendProof({
          workspace_root: workspacePath,
          record_id: `proof-${recordId}-provenance`,
          run_id: runId,
          provenance: { type: "scan-stage", source_ref: "inventory:l1" },
          evidence: [{ ref: "inventory:l1", source_hash: inventoryHash }],
          verification: { verdict: "pass", method: output.method },
          actor,
          timestamp: runMeta.createdAt,
          source_hash: inventoryHash,
        });
        const provenanceProofRef = provenanceProof.proof_ref ?? provenanceProof.proofRef;
        if (!provenanceProofRef) throw new Error("MSP writer returned no provenance proof reference.");
        const knowledge = await mspClient.writeKnowledge({
          workspace_root: workspacePath,
          record_id: recordId,
          provenance_ref: provenanceProofRef,
          ...knowledgePayload(output),
        });
        const knowledgeRef = knowledge.knowledge_ref ?? knowledge.knowledgeRef;
        const knowledgeHash = knowledge.source_hash ?? knowledge.sourceHash;
        if (!knowledgeRef) throw new Error("GKS writer returned no knowledge reference.");
        if (typeof knowledgeHash !== "string" || !/^[a-f0-9]{64}$/i.test(knowledgeHash)) throw new Error("GKS writer returned no knowledge source hash.");
        const proof = await mspClient.appendProof({
          workspace_root: workspacePath,
          record_id: `proof-${recordId}`,
          run_id: runId,
          provenance: { type: "knowledge-link", source_ref: provenanceProofRef },
          evidence: [{ ref: knowledgeRef, source_hash: knowledgeHash }],
          verification: { verdict: "pass", method: output.method },
          actor,
          timestamp: runMeta.createdAt,
          source_hash: knowledgeHash,
          knowledge_ref: knowledgeRef,
        });
        const proofRef = proof.proof_ref ?? proof.proofRef;
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
