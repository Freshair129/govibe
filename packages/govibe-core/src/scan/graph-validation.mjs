import { CANONICAL_STAGES } from "./stage-contract.mjs";

export function validateDeepScan(stageRuns) {
  const ordered = stageRuns.length === CANONICAL_STAGES.length
    && stageRuns.every((record, index) => record.stage === index + 1 && record.name === CANONICAL_STAGES[index]);
  const terminal = stageRuns.every((record) => record.status === "complete" || record.status === "not_applicable");
  const referenced = stageRuns.every((record) => record.outputRefs.length > 0);
  const exclusionsProven = stageRuns.every((record) => record.status !== "not_applicable"
    || (record.outputRefs.some((ref) => ref.startsWith("exclusion:"))
      && record.outputRefs.some((ref) => ref.startsWith("msp:proof/"))));
  const passed = ordered && terminal && referenced && exclusionsProven;
  return {
    passed,
    checks: { canonicalOrder: ordered, terminalEvidence: terminal, outputReferences: referenced, exclusionsProven },
    errors: [
      !ordered && "canonical_stage_order_failed",
      !terminal && "incomplete_or_failed_stage",
      !referenced && "missing_output_reference",
      !exclusionsProven && "not_applicable_without_proof",
    ].filter(Boolean),
  };
}
