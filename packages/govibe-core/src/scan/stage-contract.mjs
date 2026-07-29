export const CANONICAL_STAGES = [
  "Scan",
  "Structure",
  "Markdown Parse",
  "COBOL Parse",
  "Symbolic Parse",
  "Routes",
  "Tools",
  "ORM",
  "Cross-File Resolution",
  "MRO",
  "Communities",
  "Processes",
];

export const terminalStageStatuses = new Set(["complete", "not_applicable", "incomplete", "failed"]);

export function validateStageRun(record) {
  if (record.schema !== "govibe-stage-run/v1") throw new Error("Invalid stage-run schema.");
  if (CANONICAL_STAGES[record.stage - 1] !== record.name) throw new Error(`Stage ${record.stage} is out of canonical order.`);
  if (!terminalStageStatuses.has(record.status)) throw new Error(`Invalid stage status: ${record.status}`);
  if (record.status === "not_applicable" && record.exclusions.length === 0) {
    throw new Error(`Stage ${record.stage} requires evidence for not_applicable.`);
  }
  if (record.confidence < 0 || record.confidence > 1) throw new Error("Stage confidence must be between 0 and 1.");
  return record;
}
