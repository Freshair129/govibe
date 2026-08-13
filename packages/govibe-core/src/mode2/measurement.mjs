import { readFile } from "node:fs/promises";
import path from "node:path";

import { evaluateCoverage } from "./coverage.mjs";
import { analyzeGaps } from "./gap-analysis.mjs";
import { runIntentScan } from "./intent-scan.mjs";
import { runMode2Scan } from "./pipeline.mjs";
import { compileRoadmap } from "./roadmap-compiler.mjs";
import { byCodepoint } from "./stage-shared.mjs";
import { createWorkspaceAdapter } from "./workspace-adapter.mjs";

/**
 * Measurement harness (prompt §31 STEP 16): semantic coverage, false relations, unresolved
 * meaning, scan time, and incremental rebuild performance.
 *
 * Correctness is only measurable against declared ground truth, which exists for the authored
 * POC fixtures and not for real repositories. So this harness reports precision and recall
 * **only where ground truth was declared**, and marks them `null` otherwise rather than
 * inventing a denominator. A real repository yields coverage, volume, unresolved, and timing —
 * and admits it cannot yield accuracy.
 */

function score(expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const truePositives = [...actualSet].filter((item) => expectedSet.has(item));
  const falsePositives = [...actualSet].filter((item) => !expectedSet.has(item));
  const falseNegatives = [...expectedSet].filter((item) => !actualSet.has(item));
  return {
    expected: expectedSet.size,
    found: actualSet.size,
    true_positives: truePositives.length,
    false_positives: falsePositives.length,
    false_negatives: falseNegatives.length,
    precision: actualSet.size === 0 ? null : Number((truePositives.length / actualSet.size).toFixed(4)),
    recall: expectedSet.size === 0 ? null : Number((truePositives.length / expectedSet.size).toFixed(4)),
    missed: falseNegatives.sort(byCodepoint).slice(0, 10),
    spurious: falsePositives.sort(byCodepoint).slice(0, 10),
  };
}

async function readArtifact(root, runId, stage) {
  try {
    return JSON.parse(await readFile(path.join(root, ".govibe/mode2/scan/runs", runId, "artifacts", `${String(stage).padStart(2, "0")}.json`), "utf8"));
  } catch {
    return null;
  }
}

/**
 * @param options.groundTruth declared expectations; omit for a real repository
 * @param options.clock injectable so timings are measurable without wall-clock coupling in tests
 */
export async function measureWorkspace({ workspaceRoot, label, client = "generic", groundTruth = null, clock = () => Date.now(), touchFile = null }) {
  const adapter = () => createWorkspaceAdapter({ client, workspaceRoot });

  const coldStart = clock();
  const cold = await runMode2Scan({ adapter: adapter(), runId: "measure-cold" });
  const coldMs = clock() - coldStart;

  const warmStart = clock();
  const warm = await runMode2Scan({ adapter: adapter(), runId: "measure-warm", reuseFromRunId: "measure-cold" });
  const warmMs = clock() - warmStart;

  const { files } = await adapter().discoverProjectFiles();
  const ir = await readArtifact(workspaceRoot, "measure-cold", 12);
  const agentManifest = await readArtifact(workspaceRoot, "measure-cold", 11);
  const verificationModel = await readArtifact(workspaceRoot, "measure-cold", 10);
  const intendedModel = await runIntentScan({ adapter: adapter(), files });
  const coverage = evaluateCoverage({ ir, agentManifest, intendedModel });
  const gaps = analyzeGaps({ ir, intendedModel, coverage, verificationModel, agentManifest, files });
  const roadmap = compileRoadmap({ gapAnalysis: gaps, coverage, ir, intendedModel });

  // Accuracy, only where ground truth was declared.
  let accuracy = null;
  if (groundTruth) {
    const interfaceModel = await readArtifact(workspaceRoot, "measure-cold", 5);
    const structure = await readArtifact(workspaceRoot, "measure-cold", 3);
    const dependencies = await readArtifact(workspaceRoot, "measure-cold", 4);
    const dataModel = await readArtifact(workspaceRoot, "measure-cold", 6);
    const stateModel = await readArtifact(workspaceRoot, "measure-cold", 8);

    accuracy = {
      routes: score(
        groundTruth.routes ?? [],
        (interfaceModel?.interfaces ?? []).filter((item) => item.kind === "rest-route").map((item) => `${item.method} ${item.route}`),
      ),
      modules: score(groundTruth.modules ?? [], (structure?.modules ?? []).map((item) => item.path)),
      import_edges: score(
        (groundTruth.import_edges ?? []).map(([from, to]) => `${from}->${to}`),
        (dependencies?.edges ?? [])
          .filter((edge) => edge.rel === "IMPORTS")
          .map((edge) => `${edge.from.replace("mode2-module:", "")}->${edge.to.replace("mode2-module:", "")}`),
      ),
      requirements: score(groundTruth.requirements ?? [], (intendedModel?.requirement_index ?? []).map((item) => item.id)),
      entities: score(groundTruth.entities ?? [], (dataModel?.entities ?? []).map((item) => item.name)),
      state_shapes: groundTruth.state_shapes
        ? score(groundTruth.state_shapes, (stateModel?.state_shapes ?? []).map((item) => item.name))
        : null,
      agentic_system: {
        expected: groundTruth.agentic_system,
        found: agentManifest?.agentic_system_detected ?? false,
        correct: (agentManifest?.agentic_system_detected ?? false) === groundTruth.agentic_system,
      },
    };
  }

  // Incremental rebuild: touch one file and count how many stages actually re-run.
  let incremental = null;
  if (touchFile) {
    await touchFile();
    const rebuildStart = clock();
    const rebuild = await runMode2Scan({ adapter: adapter(), runId: "measure-rebuild", reuseFromRunId: "measure-cold" });
    incremental = {
      rebuild_ms: clock() - rebuildStart,
      stages_reexecuted: rebuild.incremental.executedStages,
      stages_reused: rebuild.incremental.reusedStages,
      files_rehashed: rebuild.incremental.rehashedFiles,
    };
  }

  const falseRelationRate =
    accuracy?.import_edges?.precision === null || accuracy?.import_edges?.precision === undefined
      ? null
      : Number((1 - accuracy.import_edges.precision).toFixed(4));

  return {
    schema: "govibe-mode2-measurement/v1",
    label,
    file_count: files.length,
    timing: {
      cold_ms: coldMs,
      warm_ms: warmMs,
      warm_speedup: warmMs === 0 ? null : Number((coldMs / warmMs).toFixed(1)),
      // Wall-clock on a shared machine varies by an order of magnitude under load. These are
      // observations of one run, not a benchmark, and must not be published as one.
      caveat: "single observation on a loaded machine; not a benchmark",
    },
    semantic_coverage: {
      block_profile: coverage.block_profile,
      ratio: coverage.coverage_ratio,
      missing: coverage.missing,
    },
    volume: { atoms: ir?.atoms?.length ?? 0, relations: ir?.relations?.length ?? 0 },
    unresolved: {
      total: cold.unresolvedCount,
      per_stage: cold.stageRuns.map((record) => ({ stage: record.stage, count: record.unresolved?.length ?? 0 })).filter((entry) => entry.count > 0),
    },
    finalization: cold.finalization ? { f2_passed: cold.finalization.F2.passed, f4_status: cold.finalization.F4.status } : null,
    gaps: { total: gaps.counts.total, by_severity: gaps.counts.by_severity },
    roadmap: { tasks: roadmap.tasks.length, workstreams: roadmap.workstreams },
    accuracy,
    false_relation_rate: falseRelationRate,
    accuracy_note: accuracy
      ? "measured against declared ground truth"
      : "no ground truth declared for a real repository; accuracy is not measurable and is reported as null rather than estimated",
    incremental,
  };
}
