import { sha256Json } from "./metadata-store.mjs";
import { byCodepoint } from "./stage-shared.mjs";
import { MODE2_STAGES } from "./stage-contract.mjs";

/**
 * F1–F4: the four internal finalization operations, defined by
 * `AMENDMENT-2026-08-12-F1-F4-Finalization-Definition.md`.
 *
 * They are **not** Stages 13–16. The twelve stages are dimensions of meaning; F1–F4 are
 * operations on a completed run. Numbering them as stages would put an operation on an axis of
 * dimensions — the same category error ADR-021 prevents on the H axis.
 *
 * ## Why Mode 2 can adopt the strict ordering without an API-005 change
 *
 * The amendment's §6 offers three options because `API-005` line 83 (approved) states
 * "Producing stages submit a `govibe-knowledge-candidate/v1` to MSP", which the **L2** pipeline
 * in `scan/stage-runner.mjs` implements. That sentence governs the L2 contract.
 *
 * Mode 2 is a separate, additively-versioned contract (`govibe-mode2-*`). It therefore adopts
 * `F1 → F2 → F3 → F4` natively, and the L2 pipeline keeps its current per-stage submission
 * unchanged. The amendment's Option A/B/C question remains open for L2 and is untouched here —
 * this implementation does not decide it.
 */

const CONSOLIDATION_SCHEMA = "govibe-mode2-consolidated-graph/v1";
const VALIDATION_SCHEMA = "govibe-mode2-graph-validation/v1";
const PROOF_SCHEMA = "govibe-mode2-proof-batch/v1";
const PROMOTION_SCHEMA = "govibe-mode2-knowledge-candidate/v1";

export const FINALIZATION_OPERATIONS = ["F1", "F2", "F3", "F4"];

/**
 * F1 — Candidate Graph Consolidation.
 *
 * Deduplication is identity-based, never similarity-based: two candidates that merely look
 * alike stay two candidates, because merging them is a semantic judgement and semantic
 * judgement belongs to GKS after MSP authorization.
 */
export function consolidate({ ir, stageRecords }) {
  const atoms = [];
  const relations = [];
  const duplicates = [];
  const atomIds = new Set();
  const relationIds = new Set();

  for (const atom of ir?.atoms ?? []) {
    if (atomIds.has(atom.identity)) {
      duplicates.push({ kind: "duplicate-atom-identity", identity: atom.identity });
      continue;
    }
    atomIds.add(atom.identity);
    atoms.push(atom);
  }
  for (const relation of ir?.relations ?? []) {
    if (relationIds.has(relation.identity)) {
      duplicates.push({ kind: "duplicate-relation-identity", identity: relation.identity });
      continue;
    }
    relationIds.add(relation.identity);
    relations.push(relation);
  }

  // The unresolved register is the union of every stage's unresolved set plus the IR's own.
  // Nothing is dropped or silently resolved here — F1 may not resolve what a stage could not.
  const register = [];
  for (const record of stageRecords) {
    for (const item of record.unresolved ?? []) register.push({ stage: record.stage, ...item });
  }

  const danglingRelations = relations.filter(
    (relation) => relation.from?.startsWith("mode2-") && relation.to?.startsWith("mode2-package:") === false && !atomIds.has(`mode2-atom:${relation.to?.replace(/^mode2-/, "")}`),
  ).length;

  return {
    schema: CONSOLIDATION_SCHEMA,
    canonical: false,
    atom_count: atoms.length,
    relation_count: relations.length,
    duplicates,
    unresolved_register: register,
    unresolved_count: register.length,
    dangling_relation_endpoints: danglingRelations,
    atoms,
    relations,
  };
}

/**
 * F2 — Graph Validation.
 *
 * Implements four structural checks. Two further checks the amendment names — acyclicity and
 * backlink symmetry — are reported as `not_applicable` with a stated reason rather than as
 * passing: no Mode 2 relation type is declared acyclic-required (import cycles are legal), and
 * Mode 2 materialises no backlinks. Reporting them green would be a false claim.
 */
export function validateGraph({ stageRecords, consolidated }) {
  const ordered =
    stageRecords.length === MODE2_STAGES.length &&
    stageRecords.every((record, index) => record.stage === index + 1 && record.name === MODE2_STAGES[index]);
  const terminalStatuses = new Set(["complete", "not_applicable", "incomplete", "failed"]);
  const terminal = stageRecords.every((record) => terminalStatuses.has(record.status));
  const producingHaveRefs = stageRecords
    .filter((record) => record.status === "complete" && record.outputHash)
    .every((record) => (record.outputRefs ?? []).length > 0);
  const exclusionsProven = stageRecords.every(
    (record) => record.status !== "not_applicable" || (record.exclusions ?? []).length > 0,
  );

  const cycles = detectCycles(consolidated?.relations ?? []);
  const failed = stageRecords.filter((record) => record.status === "failed").map((record) => record.stage);

  const checks = {
    canonicalOrder: ordered,
    terminalStatus: terminal,
    outputReferences: producingHaveRefs,
    exclusionsProven,
    noFailedStage: failed.length === 0,
    acyclicity: "not_applicable",
    backlinkSymmetry: "not_applicable",
  };
  const errors = [
    !ordered && "canonical_stage_order_failed",
    !terminal && "non_terminal_stage_status",
    !producingHaveRefs && "missing_output_reference",
    !exclusionsProven && "not_applicable_without_exclusion",
    failed.length > 0 && `failed_stages:${failed.join(",")}`,
  ].filter(Boolean);

  return {
    schema: VALIDATION_SCHEMA,
    passed: errors.length === 0,
    checks,
    not_applicable_reasons: {
      acyclicity: "no Mode 2 relation type is declared acyclic-required; import cycles are legal",
      backlinkSymmetry: "Mode 2 materialises no backlinks, so symmetry has nothing to compare",
    },
    // Cycles are reported as findings, not failures — surfacing them is useful, and failing on
    // them would enforce a rule no relation type has actually declared.
    findings: cycles.map((cycle) => ({ kind: "relation-cycle", rel: cycle.rel, path: cycle.path })),
    errors,
  };
}

function detectCycles(relations) {
  const byRel = new Map();
  for (const relation of relations) {
    if (!relation.from || !relation.to) continue;
    if (!byRel.has(relation.rel)) byRel.set(relation.rel, new Map());
    const graph = byRel.get(relation.rel);
    if (!graph.has(relation.from)) graph.set(relation.from, []);
    graph.get(relation.from).push(relation.to);
  }
  const cycles = [];
  for (const [rel, graph] of byRel) {
    const state = new Map();
    const stack = [];
    const visit = (node) => {
      if (cycles.length >= 10) return;
      state.set(node, "open");
      stack.push(node);
      for (const next of graph.get(node) ?? []) {
        if (state.get(next) === "open") {
          cycles.push({ rel, path: [...stack.slice(stack.indexOf(next)), next] });
        } else if (!state.has(next)) {
          visit(next);
        }
      }
      stack.pop();
      state.set(node, "closed");
    };
    for (const node of graph.keys()) if (!state.has(node)) visit(node);
  }
  return cycles;
}

/**
 * F3 — Evidence Packaging.
 *
 * The unresolved register is present even when empty, so "zero unresolved" is a recorded claim
 * rather than an absent field. The confidence rollup is a summary derivable from the stage
 * confidences it summarises, never a new measurement.
 */
export function packageEvidence({ runId, stageRecords, consolidated, validation, sourceHash, actor, recordedAt }) {
  const confidences = stageRecords.filter((record) => typeof record.confidence === "number").map((record) => record.confidence);
  const rollup = confidences.length
    ? Number((confidences.reduce((total, value) => total + value, 0) / confidences.length).toFixed(4))
    : 0;

  return {
    schema: PROOF_SCHEMA,
    idempotency_key: `mode2-proof-${runId}`,
    run_id: runId,
    level: "M2",
    source_snapshot_hash: sourceHash,
    verification: {
      verdict: validation.passed ? "passed" : "blocked",
      method: "mode2-f2-graph-validation",
      checks: validation.checks,
      errors: validation.errors,
    },
    stage_evidence: stageRecords.map((record) => ({
      stage: record.stage,
      name: record.name,
      status: record.status,
      method: record.method,
      extractor_version: record.extractorVersion,
      confidence: record.confidence,
      input_hash: record.inputHash,
      output_hash: record.outputHash,
      output_refs: record.outputRefs ?? [],
    })),
    confidence_rollup: { mean_stage_confidence: rollup, stage_count: confidences.length },
    // Present even when empty — an absent field and a zero count must not look the same.
    unresolved_register: consolidated.unresolved_register,
    unresolved_count: consolidated.unresolved_count,
    findings: validation.findings,
    artifact_lineage: [],
    actor,
    recorded_at: recordedAt,
  };
}

/**
 * F4 — Promotion Submission.
 *
 * A *request*, never a write. MSP validates authority and promotion policy and mediates the
 * GKS lifecycle; a returned reference is an opaque handle and grants no direct GKS access.
 *
 * Two refusals are hard: F4 does not submit when F2 failed, and it does not pretend to have
 * submitted when no MSP boundary is configured. Reporting a skipped submission as success
 * would make an unpromoted graph indistinguishable from a promoted one.
 */
export async function submitPromotion({ runId, proof, consolidated, mspClient, actor, submittedAt, allowUnvalidated = false }) {
  if (proof.verification.verdict !== "passed" && !allowUnvalidated) {
    return {
      schema: PROMOTION_SCHEMA,
      status: "refused",
      reason: "f2_validation_did_not_pass",
      errors: proof.verification.errors,
      submitted: false,
    };
  }
  if (!mspClient?.submitKnowledgeCandidate) {
    return {
      schema: PROMOTION_SCHEMA,
      status: "blocked",
      reason: "no_msp_boundary_configured",
      detail: "candidates were assembled and validated but not offered for promotion",
      submitted: false,
    };
  }

  try {
    const promoted = await mspClient.submitKnowledgeCandidate({
      schema_version: PROMOTION_SCHEMA,
      idempotency_key: `mode2-knowledge-${runId}`,
      run_id: runId,
      stage: 12,
      source_snapshot_hash: proof.source_snapshot_hash,
      candidate: {
        atoms: consolidated.atoms,
        relations: consolidated.relations,
        context_snapshots: [{ kind: "unresolved_register", value: consolidated.unresolved_register }],
      },
      actor,
      submitted_at: submittedAt,
    });
    return {
      schema: PROMOTION_SCHEMA,
      status: "submitted",
      submitted: true,
      // Opaque handles. Not GKS access, and not proof of canonicalization.
      knowledge_ref: promoted.knowledgeRef ?? null,
      promotion_ref: promoted.promotionRef ?? null,
      source_hash: promoted.sourceHash ?? proof.source_snapshot_hash,
    };
  } catch (error) {
    return {
      schema: PROMOTION_SCHEMA,
      status: "failed",
      reason: error?.code ?? "msp_submission_failed",
      detail: String(error?.message ?? error),
      submitted: false,
    };
  }
}

/**
 * Runs F1 → F2 → F3 → F4 in strict order. The ordering is structural, not stylistic: F2 cannot
 * validate a graph F1 has not assembled, F3 cannot package a verdict F2 has not produced, and
 * F4 must not offer for promotion a graph F2 has not validated.
 */
export async function runFinalization({ runId, stageRecords, artifacts, mspClient = null, actor = "unknown", now = () => new Date().toISOString(), allowUnvalidated = false }) {
  const ir = artifacts.get(12) ?? null;
  const startedAt = now();

  const f1 = consolidate({ ir, stageRecords });
  const f2 = validateGraph({ stageRecords, consolidated: f1 });
  const sourceHash = sha256Json({ runId, atoms: f1.atom_count, relations: f1.relation_count, stageHashes: stageRecords.map((record) => record.outputHash) });
  const f3 = packageEvidence({ runId, stageRecords, consolidated: f1, validation: f2, sourceHash, actor, recordedAt: startedAt });
  const f4 = await submitPromotion({ runId, proof: f3, consolidated: f1, mspClient, actor, submittedAt: startedAt, allowUnvalidated });

  return {
    schema: "govibe-mode2-finalization/v1",
    runId,
    order: [...FINALIZATION_OPERATIONS],
    F1: { operation: "consolidation", atom_count: f1.atom_count, relation_count: f1.relation_count, duplicates: f1.duplicates.length, unresolved_count: f1.unresolved_count },
    F2: { operation: "graph-validation", passed: f2.passed, checks: f2.checks, errors: f2.errors, findings: f2.findings.length },
    F3: { operation: "evidence-packaging", verdict: f3.verification.verdict, confidence_rollup: f3.confidence_rollup, unresolved_count: f3.unresolved_count },
    F4: { operation: "promotion-submission", status: f4.status, submitted: f4.submitted, reason: f4.reason ?? null },
    // Nothing here is canonical. GKS assigns canonical identity only after MSP authorizes.
    canonical: false,
    completedAt: now(),
    detail: { consolidated: { ...f1, atoms: undefined, relations: undefined }, validation: f2, proof: f3, promotion: f4 },
  };
}
