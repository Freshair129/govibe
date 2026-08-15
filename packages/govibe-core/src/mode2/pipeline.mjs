import { randomUUID } from "node:crypto";

import { createMetadataStore, sha256, sha256Json } from "./metadata-store.mjs";
import { createMode2Stages } from "./stages.mjs";
import { MODE2_STAGE_RUN_SCHEMA, MODE2_STAGES, validateMode2StageRun } from "./stage-contract.mjs";

const RUN_SCHEMA = "govibe-mode2-scan-run/v1";
const RESULT_SCHEMA = "govibe-mode2-scan-result/v1";
const FILE_INDEX_SCHEMA = "govibe-mode2-file-index/v1";
const RUN_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

function assertRunId(runId) {
  if (!RUN_ID_PATTERN.test(runId) || runId.includes("..")) throw new Error(`Invalid Mode 2 scan runId: ${runId}`);
  return runId;
}

function stagePath(runId, stage) {
  return `scan/runs/${runId}/stages/${String(stage).padStart(2, "0")}.json`;
}

function artifactPath(runId, stage) {
  return `scan/runs/${runId}/artifacts/${String(stage).padStart(2, "0")}.json`;
}

const UNHASHED_FIELDS = new Set(["workspace_root", "mtimeMs"]);

function normalizeForHash(value) {
  if (Array.isArray(value)) return value.map(normalizeForHash);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !UNHASHED_FIELDS.has(key))
        .map(([key, item]) => [key, normalizeForHash(item)]),
    );
  }
  return value;
}

async function buildFileIndex({ adapter, store, files, verifyContent }) {
  const previous = (await store.readJson("scan/file-index.json")) ?? { entries: {} };
  const entries = {};
  let rehashed = 0;
  let reused = 0;

  for (const file of files) {
    const cached = previous.entries?.[file.path];
    if (!verifyContent && cached && cached.size === file.size && cached.mtimeMs === file.mtimeMs) {
      entries[file.path] = cached;
      reused += 1;
      continue;
    }
    let contentHash;
    try {
      contentHash = sha256(await adapter.read(file.path));
    } catch {
      contentHash = sha256(`unreadable:${file.path}:${file.size}`);
    }
    entries[file.path] = { size: file.size, mtimeMs: file.mtimeMs, sha256: contentHash };
    rehashed += 1;
  }

  const index = { schema: FILE_INDEX_SCHEMA, entries, updatedAt: new Date().toISOString() };
  await store.writeJson("scan/file-index.json", index);
  return { index, rehashed, reused };
}

function stageInputHash({ stage, files, index, treeHash, stageRuns }) {
  const inputs = stage
    .inputs(files)
    .slice()
    .sort()
    .map((filePath) => [filePath, index.entries[filePath]?.sha256 ?? null]);
  const upstream = (stage.dependsOnStages ?? [])
    .map((dependency) => [dependency, stageRuns.find((record) => record.stage === dependency)?.outputHash ?? null])
    .sort(([left], [right]) => left - right);
  return sha256Json({
    stage: stage.stage,
    name: stage.name,
    extractorVersion: stage.extractorVersion,
    treeHash: stage.usesTreeShape ? treeHash : null,
    inputs,
    upstream,
  });
}

function toStageRecord({ runId, stage, outcome, inputHash, startedAt, completedAt, reusedFrom }) {
  const record = {
    schema: MODE2_STAGE_RUN_SCHEMA,
    runId,
    stage: stage.stage,
    name: stage.name,
    status: outcome.status,
    method: outcome.method ?? stage.method,
    extractorVersion: stage.extractorVersion,
    confidence: outcome.confidence ?? 0,
    inputRefs: stage.stage === 1 ? ["workspace:adapter"] : [`mode2-stage:${String(stage.stage - 1).padStart(2, "0")}`],
    outputRefs: outcome.artifact ? [`mode2-artifact:${artifactPath(runId, stage.stage)}`] : [],
    exclusions: outcome.exclusions ?? [],
    unresolved: outcome.unresolved ?? [],
    inputHash,
    outputHash: outcome.artifact ? sha256Json(normalizeForHash(outcome.artifact)) : null,
    startedAt,
    completedAt,
  };
  if (outcome.error) record.error = outcome.error;
  if (reusedFrom) record.reusedFrom = reusedFrom;
  return validateMode2StageRun(record);
}

/**
 * Runs the twelve approved Mode 2 semantic stages against a client-owned workspace.
 *
 * This function deliberately stops after stage 12. F1-F4 finalization/promotion is not part
 * of this executable contract until the governing API/ordering decision is separately
 * approved. No MSP/GKS promotion occurs here.
 */
export async function runMode2Scan({
  adapter,
  runId = randomUUID(),
  stages = createMode2Stages(),
  reuseFromRunId,
  verifyContent = false,
  now = () => new Date().toISOString(),
} = {}) {
  if (!adapter?.identify) throw new Error("A Mode 2 scan requires a WorkspaceAdapter.");
  assertRunId(runId);
  if (reuseFromRunId) assertRunId(reuseFromRunId);

  const identity = adapter.identify();
  const store = createMetadataStore({ workspaceRoot: adapter.getRoot() });
  await store.ensureDirectory(`scan/runs/${runId}/stages`);

  const existingRun = await store.readJson(`scan/runs/${runId}/run.json`);
  if (existingRun && (existingRun.schema !== RUN_SCHEMA || existingRun.runId !== runId)) {
    throw new Error(`Incompatible Mode 2 run metadata: scan/runs/${runId}/run.json`);
  }
  const runMeta = existingRun ?? { schema: RUN_SCHEMA, runId, client: identity.client, createdAt: now() };
  if (!existingRun) await store.writeJson(`scan/runs/${runId}/run.json`, runMeta);

  const { files, directories, exclusions, unreadable = [] } = await adapter.discoverProjectFiles();
  const treeHash = sha256Json(files.map((file) => file.path));
  const { index, rehashed, reused: reusedHashes } = await buildFileIndex({ adapter, store, files, verifyContent });

  const latest = await store.readJson("scan/latest.json");
  const baselineRunId = reuseFromRunId ?? (latest?.runId && latest.runId !== runId ? latest.runId : null);

  const stageRuns = [];
  const artifacts = new Map();
  let reusedStages = 0;

  for (const stage of stages) {
    const inputHash = stageInputHash({ stage, files, index, treeHash, stageRuns });
    const recordPath = stagePath(runId, stage.stage);
    const resumed = await store.readJson(recordPath);
    const baseline = resumed ?? (baselineRunId ? await store.readJson(stagePath(baselineRunId, stage.stage)) : null);

    if (baseline && baseline.inputHash === inputHash && baseline.extractorVersion === stage.extractorVersion) {
      const expectsArtifact = (baseline.outputRefs ?? []).length > 0;
      const artifact = await store.readJson(artifactPath(baseline.runId, stage.stage));
      if (!expectsArtifact || artifact !== null) {
        const record = { ...baseline, runId, reusedFrom: baseline.runId };
        if (artifact !== null) {
          artifacts.set(stage.stage, artifact);
          await store.writeJson(artifactPath(runId, stage.stage), artifact);
        }
        if (expectsArtifact) record.outputRefs = [`mode2-artifact:${artifactPath(runId, stage.stage)}`];
        validateMode2StageRun(record);
        await store.writeJson(recordPath, record);
        stageRuns.push(record);
        reusedStages += 1;
        continue;
      }
    }

    const startedAt = now();
    let outcome;
    try {
      outcome = await stage.run({
        adapter,
        identity,
        files,
        directories,
        exclusions,
        unreadable,
        artifacts,
        stageRecords: stageRuns,
        read: (filePath) => adapter.read(filePath),
      });
    } catch (error) {
      outcome = { status: "failed", confidence: 0, error: error instanceof Error ? error.message : String(error), artifact: null };
    }

    const record = toStageRecord({ runId, stage, outcome, inputHash, startedAt, completedAt: now() });
    if (outcome.artifact) {
      artifacts.set(stage.stage, outcome.artifact);
      await store.writeJson(artifactPath(runId, stage.stage), outcome.artifact);
    }
    await store.writeJson(recordPath, record);
    stageRuns.push(record);
  }

  const status = stageRuns.every((record) => record.status === "complete" || record.status === "not_applicable") ? "complete" : "incomplete";
  const result = {
    schema: RESULT_SCHEMA,
    runId,
    level: "M2",
    status,
    client: identity.client,
    workspace_mode: identity.workspace_mode,
    write_policy: identity.write_policy,
    stageCount: MODE2_STAGES.length,
    stageRuns,
    incremental: {
      reusedStages,
      executedStages: stages.length - reusedStages,
      rehashedFiles: rehashed,
      reusedFileHashes: reusedHashes,
      baselineRunId,
      verifyContent,
    },
    unreadablePaths: unreadable,
    unresolvedCount: stageRuns.reduce((total, record) => total + (record.unresolved?.length ?? 0), 0),
    completedAt: now(),
  };

  await store.writeJson(`scan/runs/${runId}/result.json`, result);
  await store.writeJson("scan/latest.json", { schema: "govibe-mode2-scan-pointer/v1", runId, status, completedAt: result.completedAt });
  return result;
}

export async function getMode2ScanStatus({ workspaceRoot, runId }) {
  const store = createMetadataStore({ workspaceRoot });
  const pointer = await store.readJson("scan/latest.json");
  const target = runId ?? pointer?.runId;
  if (!target) return { schema: RESULT_SCHEMA, status: "not_started", runId: null, stageRuns: [] };
  assertRunId(target);
  const result = await store.readJson(`scan/runs/${target}/result.json`);
  if (result) return result;

  const stageRuns = [];
  for (let stage = 1; stage <= MODE2_STAGES.length; stage += 1) {
    const record = await store.readJson(stagePath(target, stage));
    if (record) stageRuns.push(record);
  }
  return { schema: RESULT_SCHEMA, runId: target, level: "M2", status: stageRuns.length === MODE2_STAGES.length ? "incomplete" : "in_progress", stageRuns };
}
