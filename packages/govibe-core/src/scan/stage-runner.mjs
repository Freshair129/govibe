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
      ...(output.unresolved_links?.length ? [{ kind: "unresolved_links", value: output.unresolved_links }] : []),
    ],
  };
}

async function recordTerminalEvidence({ mspClient, runId, stage, inventoryHash, actor, recordedAt, verdict, method, findings = [], kind }) {
  return mspClient.recordEvidence({
    schema_version: "govibe-proof-batch/v1",
    idempotency_key: `proof-${runId}-stage-${String(stage).padStart(2, "0")}-${kind}`,
    run_id: runId,
    stage,
    source_snapshot_hash: inventoryHash,
    findings,
    stage_evidence: [{ ref: "inventory:l1", source_hash: inventoryHash, kind }],
    verification: { verdict, method },
    artifact_lineage: [],
    actor,
    recorded_at: recordedAt,
  });
}

export async function runDeepScan({ workspacePath, workspaceId = null, inventory, mspClient, actor, adapters, runId = randomUUID(), resume = false }) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(runId) || runId.includes("..")) throw new Error(`Invalid scan runId: ${runId}`);
  if (!mspClient?.submitKnowledgeCandidate) throw new Error("Deep scan requires an MSP client with parent-mediated knowledge promotion.");

  const runDirectory = path.join(workspacePath, "state", "runs", runId);
  const runRoot = path.join(runDirectory, "stages");
  await mkdirSafe(workspacePath, runRoot);
  const runMetaPath = path.join(runDirectory, "run.json");
  let runMeta;
  try {
    runMeta = JSON.parse(await readFile(runMetaPath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    runMeta = { schema: "govibe-scan-run/v1", runId, createdAt: new Date().toISOString(), resumeRequested: Boolean(resume) };
    await writeFile(runMetaPath, `${JSON.stringify(runMeta, null, 2)}\n`, { flag: "wx" });
  }
  if (runMeta.schema !== "govibe-scan-run/v1" || runMeta.runId !== runId || !runMeta.createdAt) throw new Error(`Invalid scan run metadata: ${runMetaPath}`);

  const inventoryHash = hash(inventory);
  const stageRuns = [];
  for (let index = 0; index < CANONICAL_STAGES.length; index += 1) {
    const stage = index + 1;
    const recordPath = path.join(runRoot, `${String(stage).padStart(2, "0")}.json`);
    let record;
    try {
      const output = await adapters[index]({ inventory, stageRuns, workspacePath });
      if (output.incomplete) {
        const proof = await recordTerminalEvidence({ mspClient, runId, stage, inventoryHash, actor, recordedAt: runMeta.createdAt, verdict: "blocked", method: output.method ?? "parser-coverage", findings: [{ kind: "incomplete", message: output.incomplete }], kind: "scan-stage-incomplete" });
        record = { schema: "govibe-stage-run/v1", runId, stage, name: CANONICAL_STAGES[index], status: "incomplete", inputRefs: ["inventory:l1"], outputRefs: [`incomplete:${output.incomplete}`, proof.proofRef], method: output.method ?? "parser-coverage", confidence: 0, exclusions: [], error: output.incomplete };
      } else if (output.notApplicable) {
        const proof = await recordTerminalEvidence({ mspClient, runId, stage, inventoryHash, actor, recordedAt: runMeta.createdAt, verdict: "passed", method: "inventory-exclusion", kind: "scan-stage-exclusion" });
        record = { schema: "govibe-stage-run/v1", runId, stage, name: CANONICAL_STAGES[index], status: "not_applicable", inputRefs: ["inventory:l1"], outputRefs: [`exclusion:${output.notApplicable}`, proof.proofRef], method: "inventory-exclusion", confidence: 1, exclusions: [output.notApplicable] };
      } else {
        const recordId = `${runId}-stage-${String(stage).padStart(2, "0")}`;
        const provenance = await recordTerminalEvidence({ mspClient, runId, stage, inventoryHash, actor, recordedAt: runMeta.createdAt, verdict: "passed", method: output.method, findings: output.unresolved_links?.map((item) => ({ kind: "unresolved_link", ...item })) ?? [], kind: "scan-stage-provenance" });
        const promoted = await mspClient.submitKnowledgeCandidate({
          schema_version: "govibe-knowledge-candidate/v1",
          idempotency_key: recordId,
          workspace_id: workspaceId ?? undefined,
          source_version: runMeta.createdAt,
          run_id: runId,
          stage,
          source_snapshot_hash: inventoryHash,
          provenance_ref: provenance.proofRef,
          candidate: knowledgePayload(output),
          actor,
          submitted_at: runMeta.createdAt,
        });
        const proof = await mspClient.recordEvidence({
          schema_version: "govibe-proof-batch/v1",
          idempotency_key: `proof-${recordId}`,
          run_id: runId,
          stage,
          source_snapshot_hash: promoted.sourceHash,
          findings: output.unresolved_links?.map((item) => ({ kind: "unresolved_link", ...item })) ?? [],
          stage_evidence: [{ ref: promoted.knowledgeRef, source_hash: promoted.sourceHash, kind: "knowledge-link", provenance_ref: provenance.proofRef, promotion_ref: promoted.promotionRef }],
          verification: { verdict: "passed", method: output.method },
          artifact_lineage: [],
          actor,
          recorded_at: runMeta.createdAt,
          knowledge_ref: promoted.knowledgeRef,
        });
        record = { schema: "govibe-stage-run/v1", runId, stage, name: CANONICAL_STAGES[index], status: "complete", inputRefs: ["inventory:l1"], outputRefs: [promoted.knowledgeRef, promoted.promotionRef, provenance.proofRef, proof.proofRef], method: output.method, confidence: output.unresolved_links?.length ? 0.8 : 1, exclusions: [] };
      }
    } catch (error) {
      record = { schema: "govibe-stage-run/v1", runId, stage, name: CANONICAL_STAGES[index], status: "failed", inputRefs: ["inventory:l1"], outputRefs: [], method: "stage-adapter", confidence: 0, exclusions: [], error: error instanceof Error ? error.message : String(error) };
    }
    validateStageRun(record);
    await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`);
    stageRuns.push(record);
  }

  const graphValidation = validateDeepScan(stageRuns);
  return { schema: "govibe-scan-result/v1", runId, level: "L2", status: graphValidation.passed ? "complete" : "incomplete", sourceSnapshotHash: inventoryHash, workspaceId, stageRuns, graphValidation };
}