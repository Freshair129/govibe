/**
 * The Mode 2 stage axis is semantic reconstruction. It is deliberately separate from
 * `scan/stage-contract.mjs`, whose CANONICAL_STAGES describe mechanical extraction and are
 * already referenced by recorded MSP evidence batches. Redefining that list would
 * invalidate recorded evidence, so Mode 2 versions additively instead.
 */
export const MODE2_STAGE_RUN_SCHEMA = "govibe-mode2-stage-run/v1";

export const MODE2_STAGES = [
  "Workspace Discovery",
  "File & Artifact Inventory",
  "Language & Framework Structural Scan",
  "Dependency Graph",
  "Interface & Integration Scan",
  "Data Semantic Scan",
  "Behavioural & Execution Scan",
  "State & Decision Scan",
  "Cross-Cutting Concern Scan",
  "Test / Verification / Evidence Scan",
  "Agentic System Scan",
  "Semantic Reconstruction",
];

/** Stage 11 must never report absence by omission; an agent-free repository still reports. */
export const MODE2_MANDATORY_STAGES = new Set([11]);

export const MODE2_TERMINAL_STATUSES = new Set(["complete", "not_applicable", "incomplete", "failed"]);

export function validateMode2StageRun(record) {
  if (record?.schema !== MODE2_STAGE_RUN_SCHEMA) throw new Error("Invalid Mode 2 stage-run schema.");
  if (!Number.isInteger(record.stage) || record.stage < 1 || record.stage > MODE2_STAGES.length) {
    throw new Error(`Mode 2 stage number out of range: ${record.stage}`);
  }
  if (MODE2_STAGES[record.stage - 1] !== record.name) {
    throw new Error(`Mode 2 stage ${record.stage} is out of canonical order.`);
  }
  if (!MODE2_TERMINAL_STATUSES.has(record.status)) throw new Error(`Invalid Mode 2 stage status: ${record.status}`);
  if (record.status === "not_applicable" && (record.exclusions ?? []).length === 0) {
    throw new Error(`Mode 2 stage ${record.stage} requires exclusion evidence for not_applicable.`);
  }
  if (MODE2_MANDATORY_STAGES.has(record.stage) && record.status === "not_applicable") {
    throw new Error(`Mode 2 stage ${record.stage} is mandatory and cannot be not_applicable.`);
  }
  if (record.status === "incomplete" && !record.error) {
    throw new Error(`Mode 2 stage ${record.stage} requires a reason for incomplete.`);
  }
  if (typeof record.confidence !== "number" || record.confidence < 0 || record.confidence > 1) {
    throw new Error("Mode 2 stage confidence must be between 0 and 1.");
  }
  if (!record.method) throw new Error(`Mode 2 stage ${record.stage} must record its extraction method.`);
  if (!record.extractorVersion) throw new Error(`Mode 2 stage ${record.stage} must record its extractor version.`);
  return record;
}
