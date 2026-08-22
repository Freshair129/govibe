import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validateDeepScan } from "./graph-validation.mjs";
import { CANONICAL_STAGES, validateStageRun } from "./stage-contract.mjs";
import { mkdirSafe } from "../path-safety.mjs";
import { isScratchCandidate, STAGE_GRAPH_BUDGET } from "./graph-presentation-policy.mjs";

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

// TASK-PRD-007 (D1): deep scan accumulates OBSERVED candidates (CLAUDE.md -- "Deep Scan creates
// observed candidates. It does not create canonical GKS truth.") across all twelve stages into
// one bounded set so Mission Control's graph/symbol views have something to render. This is a
// side accumulation for presentation only -- it never changes what knowledgePayload() submits to
// MSP (called with the stage's full, uncapped `output` regardless of this accumulator).
//
// Each stage's contribution is bounded independently by STAGE_GRAPH_BUDGET
// (graph-presentation-policy.mjs) -- a global first-come cap would let stage 1's file nodes
// exhaust the set before stage 3 (markdown links), stage 5 (symbols), or stage 8 (ORM models)
// ever ran. Scratch paths (SCRATCH_PATH_ROOTS -- .agents/, .claude/, .brain/, state/runs/) are
// excluded from this accumulator too, as a defense-in-depth safety net; since B3 (round 3) they
// are excluded from the scan INVENTORY itself, so no stage can produce a candidate under those
// roots any more -- this check should not trigger on a real scan.
// Mirrors workspace-service.mjs's isOrmModelNode() -- packages/govibe-core must not import from
// scripts/mcp/runtime/ (the wire boundary; see graph-presentation-policy.mjs's own note on this),
// so this is intentionally a small, independent duplicate of the same one-line check, not a
// shared import.
function isOrmModelCandidate(item) {
  return Array.isArray(item?.labels) && item.labels.includes("OrmModel");
}

function createObservedAccumulator() {
  // TASK-PRD-007 (round 4, M3): `totals.ormModelNodes` tracks how many of `totals.nodes` are
  // Stage 8 OrmModel candidates -- the same candidates workspace-service.mjs's mapObservedGraph()
  // projects into `symbols` (in addition to publishing them as ordinary graph nodes) alongside
  // Stage 5's TypeScript symbols. Without this, "published symbols / total symbols" compared
  // published TS-symbols-plus-OrmModel-projections against a denominator (`totals.symbols`) that
  // only ever counted TS symbols -- the exact mismatch that produced a "1996/1981" (numerator
  // exceeding denominator) warning on a real scan of this repo.
  const observed = { nodes: [], edges: [], symbols: [], totals: { nodes: 0, edges: 0, symbols: 0, ormModelNodes: 0 }, truncated: false };
  // Internal bookkeeping for accumulateObserved()'s within-scan dedup/endpoint checks (B5, round
  // 3) -- non-enumerable so it never appears in JSON.stringify/spread/Object.keys of the publicly
  // returned `observed` shape (result.observed, consumed by workspace-service.mjs and tests).
  Object.defineProperty(observed, "knownIds", { value: new Set(), enumerable: false });
  Object.defineProperty(observed, "seenEdgeKeys", { value: new Set(), enumerable: false });
  return observed;
}

// TASK-PRD-007 (B5, round 3): each stage's per-key budget carries forward any UNUSED capacity to
// later stages in canonical order. Only a COMPLETE stage that published fewer candidates than its
// budget can leave anything to carry forward -- a stage that is not_applicable or incomplete never
// calls accumulateObserved() at all (stage 4/COBOL Parse on this repo: always not_applicable, no
// .cbl files -- it contributes nothing to strand OR carry forward; round 3's own comment claiming
// "stage 4 used 0/500" as recovered capacity was wrong, since a stage that never ran cannot have
// "used" any budget). This can only help a LATER stage in canonical order (stage 1 runs first and
// cannot borrow from stages that have not run yet -- see B5's own fix for that: biasing
// inventory.files toward src/packages/scripts/docs so stage 1's OWN budget is spent on the
// project's source first). Each stage still keeps its documented minimum (STAGE_GRAPH_BUDGET[key])
// regardless of carry-in -- this only ever ADDS capacity, so it cannot reintroduce the starvation
// regression the per-stage budget exists to prevent.
function createBudgetLedger() {
  return { nodes: 0, edges: 0, symbols: 0 };
}

function accumulateObserved(observed, output, ledger) {
  // TASK-PRD-007 (B5, round 3): process nodes and symbols before edges. Every edge-producing
  // stage's edges reference a node/symbol id from a stage that has ALREADY run by the time that
  // edge stage runs (stage 3's own markdown nodes, stage 5's own symbols, stage 9's imports
  // referencing stage 1's files, stage 10's inheritance referencing stage 5's symbols) -- so by
  // processing symbols/nodes first, an edge from the SAME stage's own output can already be
  // endpoint-checked against the running `knownIds` set below, not just edges from earlier
  // stages.
  for (const key of ["nodes", "symbols", "edges"]) {
    const items = output[key] ?? [];
    observed.totals[key] += items.length;
    if (key === "nodes") observed.totals.ormModelNodes += items.filter(isOrmModelCandidate).length;
    const budget = STAGE_GRAPH_BUDGET[key] + ledger[key];
    const seenThisStage = new Set();
    let publishedFromThisStage = 0;
    for (const item of items) {
      if (isScratchCandidate(item)) continue; // defense-in-depth; inventory already excludes scratch (B3)
      if (key === "edges") {
        // TASK-PRD-007 (B5, round 3): reject an edge candidate here, not just at final publish
        // time (workspace-service.mjs's endpoint filter) -- stage 5 emits unresolved call
        // candidates with `to: null`, and any edge whose endpoint's OWN stage/quota never
        // published it would just be discarded downstream anyway. Measured: stage 7 alone burned
        // 291 of its 500-edge budget this way. Filtering here means that budget goes to edges
        // that actually survive to publication instead.
        if (item?.from == null || item?.to == null || !observed.knownIds.has(item.from) || !observed.knownIds.has(item.to)) continue;
        const edgeKey = `${item.from}\u0000${item.to}`;
        if (observed.seenEdgeKeys.has(edgeKey) || seenThisStage.has(edgeKey)) continue;
        seenThisStage.add(edgeKey);
      } else if (typeof item?.id === "string") {
        // TASK-PRD-007 (B5, round 3): dedupe by id BEFORE spending a budget slot -- measured:
        // stage 7 (Tools) burned 291 slots on just 39 distinct `tool:` ids because the same tool
        // string recurs in many files. The FINAL published graph was already deduped
        // (workspace-service.mjs's dedupeById/dedupeSymbols); this stops the duplicate from
        // costing a slot in the first place.
        if (observed.knownIds.has(item.id) || seenThisStage.has(item.id)) continue;
        seenThisStage.add(item.id);
      }
      if (publishedFromThisStage >= budget) { observed.truncated = true; continue; }
      observed[key].push(item);
      publishedFromThisStage += 1;
      if (key === "edges") observed.seenEdgeKeys.add(`${item.from}\u0000${item.to}`);
      else if (typeof item?.id === "string") observed.knownIds.add(item.id);
    }
    ledger[key] = Math.max(0, budget - publishedFromThisStage);
  }
}

// TASK-PRD-007 (B7, round 3; deleted round 4, M3): the round-3 replacement --
// `publishedCount / (publishedCount + unresolvedCount)` -- was its own category error, just a
// different one than the `0.8`-for-any-gap value it replaced. `publishedCount` counts
// nodes+edges+symbols (this stage's total OUTPUT VOLUME); `unresolvedCount` counts
// `unresolved_links.length` (a count of a specific FAILURE kind -- e.g. stage 3's unresolved
// wikilink candidates). Those are not the same population, so the ratio is not a real confidence
// value: measured on this repo, stage 3 resolved 2 of 109 wikilink candidates (1.8%) while this
// formula reported 0.977, because its huge unrelated node/heading output volume swamped the
// wikilink failure count in the numerator. Nothing consumes this value once computed --
// `validateDeepScan` (graph-validation.mjs) never reads `confidence`, and
// `recordTerminalEvidence()` below does not forward it to MSP; `RealTimeDashboard.tsx` renders
// only `stage`/`name`/`status` from a stage run. Per TASK-PRD-007 round 4 (M3: "either make
// stageConfidence a real per-unit ratio, or delete it -- do not ship a wrong number that nothing
// consumes"), a real per-unit ratio would need each stage to report its own resolved/attempted
// unit (links for stage 3, heritage clauses for stage 10, ...) through the generic
// `{nodes,edges,symbols,unresolved_links}` output shape, which no stage adapter does today --
// so this is deleted rather than replaced with another number nothing acts on. `confidence: 1`
// for a `complete` stage records only what the stage-run schema requires (a value between 0 and
// 1) and what is actually known to be true: this stage ran to completion and submitted its full
// candidate set to MSP. Coverage gaps are not hidden -- they are the `unresolved_links` findings
// already attached to the stage's MSP evidence batch below, which is where a real per-stage
// coverage assessment belongs.
//
// TASK-PRD-007 (round 5, R6): `confidence` is contract-bound (src/mission/domain.ts's
// MissionScanStage.confidence?: number) and durable (written into every
// state/runs/<runId>/stages/NN.json record). Writing `confidence: 1` unconditionally on a
// `complete` stage that ALSO carries `unresolved_links` (e.g. stage 3 above, 2/109 wikilinks
// resolved) asserts maximal certainty on a record with a documented coverage gap sitting right
// next to it. `confidence` is optional in the contract, so omitting it is contract-legal and
// `validateStageRun` (stage-contract.mjs) already accepts a missing/undefined value (its only
// check is `< 0 || > 1`, both false for undefined). So: `confidence: 1` only when this stage's
// output carries no `unresolved_links`; the field is omitted entirely -- not set to a fabricated
// number -- when it does. This does not touch domain.ts or the stage-run schema.

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
  const observed = createObservedAccumulator();
  const budgetLedger = createBudgetLedger();
  for (let index = 0; index < CANONICAL_STAGES.length; index += 1) {
    const stage = index + 1;
    const recordPath = path.join(runRoot, `${String(stage).padStart(2, "0")}.json`);
    let record;
    try {
      const output = await adapters[index]({ inventory, stageRuns, workspacePath });
      if (output.incomplete) {
        // TASK-PRD-007 (B6, round 3): pass through the coverage findings the adapters already
        // attach to an `incomplete` return (`unresolved_links` -- e.g. stage 5's per-file
        // PARSE_FAILURE/UNSUPPORTED_LANGUAGE entries), not just the single summary message. This
        // is the one case the "findings" redesign existed for -- a stage that parsed nothing --
        // and it was previously the one case MSP learned nothing from.
        const incompleteFindings = [
          { kind: "incomplete", message: output.incomplete },
          ...(output.unresolved_links?.map((item) => ({ kind: "unresolved_link", ...item })) ?? []),
        ];
        const proof = await recordTerminalEvidence({ mspClient, runId, stage, inventoryHash, actor, recordedAt: runMeta.createdAt, verdict: "blocked", method: output.method ?? "parser-coverage", findings: incompleteFindings, kind: "scan-stage-incomplete" });
        record = { schema: "govibe-stage-run/v1", runId, stage, name: CANONICAL_STAGES[index], status: "incomplete", inputRefs: ["inventory:l1"], outputRefs: [`incomplete:${output.incomplete}`, proof.proofRef], method: output.method ?? "parser-coverage", confidence: 0, exclusions: [], error: output.incomplete };
      } else if (output.notApplicable) {
        const proof = await recordTerminalEvidence({ mspClient, runId, stage, inventoryHash, actor, recordedAt: runMeta.createdAt, verdict: "passed", method: "inventory-exclusion", kind: "scan-stage-exclusion" });
        record = { schema: "govibe-stage-run/v1", runId, stage, name: CANONICAL_STAGES[index], status: "not_applicable", inputRefs: ["inventory:l1"], outputRefs: [`exclusion:${output.notApplicable}`, proof.proofRef], method: "inventory-exclusion", confidence: 1, exclusions: [output.notApplicable] };
      } else {
        // TASK-PRD-007 (F7): accumulateObserved() must run ONLY after the stage's candidates have
        // actually been promoted (and its evidence recorded) -- i.e. after everything below that
        // can throw has succeeded. Previously this ran first, so a stage whose promotion later
        // threw was recorded "failed" while its candidates were already sitting in the
        // accumulator that WorkspaceService.scan() publishes regardless of stage status. Keep it
        // last in this branch so a thrown error (caught below, stage marked "failed") never
        // leaves partial candidates behind.
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
        accumulateObserved(observed, output, budgetLedger);
        // TASK-PRD-007 (round 5, R6): omit `confidence` (rather than assert 1) when this
        // stage's own output carries `unresolved_links` -- a durable record must not claim
        // maximal certainty for a stage that documents its own coverage gap in the very same
        // MSP evidence batch recorded above. `confidence` is optional on the contract
        // (src/mission/domain.ts) and `validateStageRun` already accepts it missing.
        const hasUnresolvedLinks = (output.unresolved_links?.length ?? 0) > 0;
        record = { schema: "govibe-stage-run/v1", runId, stage, name: CANONICAL_STAGES[index], status: "complete", inputRefs: ["inventory:l1"], outputRefs: [promoted.knowledgeRef, promoted.promotionRef, provenance.proofRef, proof.proofRef], method: output.method, ...(hasUnresolvedLinks ? {} : { confidence: 1 }), exclusions: [] };
      }
    } catch (error) {
      record = { schema: "govibe-stage-run/v1", runId, stage, name: CANONICAL_STAGES[index], status: "failed", inputRefs: ["inventory:l1"], outputRefs: [], method: "stage-adapter", confidence: 0, exclusions: [], error: error instanceof Error ? error.message : String(error) };
    }
    validateStageRun(record);
    await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`);
    stageRuns.push(record);
  }

  const graphValidation = validateDeepScan(stageRuns);
  return {
    schema: "govibe-scan-result/v1",
    runId,
    level: "L2",
    status: graphValidation.passed ? "complete" : "incomplete",
    sourceSnapshotHash: inventoryHash,
    // TASK-PRD-007 (round 4, M1/M2): carry the inventory's own provenance fields through to the
    // deep-scan result -- previously invisible on the L2 result, in stageRuns, or anywhere else,
    // so a silent inventory-mode downgrade (git-aware -> fallback walk) had no signal at all.
    inventoryMode: inventory.inventoryMode,
    inventoryModeReason: inventory.inventoryModeReason ?? null,
    governingRuleSets: inventory.governingRuleSets,
    workspaceId,
    stageRuns,
    graphValidation,
    observed,
  };
}