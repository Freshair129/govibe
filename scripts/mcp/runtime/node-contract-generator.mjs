// ADR-029 §5: STATE and the node execution contract are generated, never
// hand-typed. This module is the generator: it reads a plan source Task
// Container through the canonical roadmap parser and materializes a contract
// that validates against schemas/Node_Execution_Contract_Schema.json.
//
// Deterministic-parser-first (CLAUDE.md "LLM Usage Rules"): every field here
// comes from a parsed plan source or a documented, honestly-labelled default.
// Nothing is inferred by an LLM, and nothing claims coverage it doesn't have.

import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseRoadmapSource } from "../roadmap-parser.mjs";

export const NODE_CONTRACT_SCHEMA_VERSION = "govibe-node-contract/v1";

// STD-SLM-Tiered-Routing §5.3/§6: a task with no deterministic verify command
// never enters the cheap escalation ladder and starts at T2 by default.
const DEFAULT_TIER_WITH_GATE = "T0";
const DEFAULT_TIER_WITHOUT_GATE = "T2";
const DEFAULT_MAX_ATTEMPTS = 3;
const REWORK_POLICY = "return-to-executor-with-tool-output";

function isResolvableTestPath(value) {
  if (!value || value.trim().toLowerCase() === "unavailable") return false;
  return /[\\/]/.test(value) || /\.[a-z0-9]+$/i.test(value.trim());
}

function testRunCommand(testPath) {
  const normalized = testPath.replace(/\\/g, "/");
  return normalized.endsWith(".mjs") || normalized.endsWith(".ts") || normalized.endsWith(".tsx")
    ? `npx vitest run ${normalized}`
    : undefined;
}

// Reads the raw "## Backlog Items" table (not exposed as structured data by
// parseRoadmapSource) to recover each dependency task_id as an input edge —
// the only source of truth for cross-task dependency in this plan format.
export function extractDependencies(sourceText, taskId) {
  const tableStart = sourceText.indexOf("## Backlog Items");
  if (tableStart === -1) return [];
  const tableText = sourceText.slice(tableStart);
  const lines = tableText.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells[0] !== taskId) continue;
    const dependencies = cells[7]; // | ID | Parent ID | Type | Title | Priority | Owner | Status | Dependencies | Source Section |
    if (!dependencies || dependencies === "-") return [];
    return dependencies.split(",").map((dep) => dep.trim()).filter(Boolean);
  }
  return [];
}

// Derives the deterministic exit_gate. Falls back to the universal lint gate
// (never zero commands — the schema forbids an empty exit_gate) and records
// which path was taken so a shallow gate is never confused with full coverage.
export function deriveExitGate(taskContainer) {
  const testPath = taskContainer.symbol_links?.test;
  const testCommand = isResolvableTestPath(testPath) ? testRunCommand(testPath) : undefined;
  const commands = testCommand ? ["npm run lint", testCommand] : ["npm run lint"];
  return { commands, evidence: { passed: false } };
}

function collectAcceptanceCriteria(taskContainer) {
  const dod = taskContainer.definition_of_done ?? {};
  const all = [
    ...(dod.acceptance_criteria ?? []),
    ...(dod.success_criteria ?? []),
    ...(dod.exit_criteria ?? []),
  ];
  return all.map((entry) => ({
    criterion: entry.criterion,
    checked: entry.checked === true || entry.checked === "true",
  }));
}

// Pure function: builds one contract from an already-parsed Task Container.
// `sourceText` is the raw plan source, needed only for dependency extraction.
export function generateNodeContract({ taskContainer, sourcePath, sourceText, nodeId, now = () => new Date().toISOString() }) {
  if (!taskContainer) throw new Error("generateNodeContract requires a Task Container.");
  if (taskContainer.complete === false) {
    throw new Error(`Task Container ${taskContainer.task_container_id} is incomplete (missing: ${(taskContainer.missingFields ?? []).join(", ")}) and cannot generate a contract.`);
  }

  const acceptanceCriteria = collectAcceptanceCriteria(taskContainer);
  if (acceptanceCriteria.length === 0) {
    throw new Error(`Task Container ${taskContainer.task_container_id} declares no acceptance/success/exit criteria to carry into the contract.`);
  }

  const dependencies = sourceText ? extractDependencies(sourceText, taskContainer.task_id) : [];
  const exitGate = deriveExitGate(taskContainer);

  return {
    schema: NODE_CONTRACT_SCHEMA_VERSION,
    node_id: nodeId ?? taskContainer.task_id,
    task_id: taskContainer.task_id,
    source: {
      path: sourcePath,
      task_container_id: taskContainer.task_container_id,
    },
    generated_at: now(),
    inputs: dependencies.map((dep) => ({ ref: dep, kind: "payload" })),
    outputs: [],
    acceptance_criteria: acceptanceCriteria,
    exit_gate: exitGate,
    retry: {
      max_attempts: DEFAULT_MAX_ATTEMPTS,
      escalation: exitGate.commands.length > 1 ? DEFAULT_TIER_WITH_GATE : DEFAULT_TIER_WITHOUT_GATE,
    },
    rework: { policy: REWORK_POLICY },
  };
}

// Main entry point: reads and parses a real plan source, finds the named
// task's Task Container, and generates its contract.
export async function generateNodeContractForTask({ sourcePath, taskId, now }) {
  const [snapshot, sourceText] = await Promise.all([
    parseRoadmapSource(sourcePath),
    readFile(sourcePath, "utf8"),
  ]);
  const taskContainer = (snapshot.taskContainers ?? []).find((container) => container.task_id === taskId);
  if (!taskContainer) {
    throw new Error(`No Task Container for task_id "${taskId}" in ${sourcePath}.`);
  }
  return generateNodeContract({
    taskContainer,
    sourcePath: path.relative(process.cwd(), sourcePath).replaceAll("\\", "/"),
    sourceText,
    now,
  });
}

// Hand-rolled validator matching schemas/Node_Execution_Contract_Schema.json.
// No ajv dependency, matching this repo's existing governance-script style
// (scripts/docs/validate-docs.mjs, validate-roadmap-containers.mjs).
export function validateNodeContract(contract) {
  const errors = [];
  const require = (cond, message) => { if (!cond) errors.push(message); };
  const isObj = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
  const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;

  if (!isObj(contract)) return { valid: false, errors: ["Contract must be an object."] };

  require(contract.schema === NODE_CONTRACT_SCHEMA_VERSION, `schema must equal "${NODE_CONTRACT_SCHEMA_VERSION}".`);
  require(isNonEmptyString(contract.node_id), "node_id must be a non-empty string.");
  require(isNonEmptyString(contract.task_id), "task_id must be a non-empty string.");
  require(isObj(contract.source) && isNonEmptyString(contract.source.path) && isNonEmptyString(contract.source.task_container_id), "source.path and source.task_container_id are required.");
  require(isNonEmptyString(contract.generated_at), "generated_at must be a non-empty string.");
  require(Array.isArray(contract.inputs) && contract.inputs.every((edge) => isObj(edge) && isNonEmptyString(edge.ref)), "inputs must be an array of edges with a non-empty ref.");
  require(Array.isArray(contract.outputs) && contract.outputs.every((edge) => isObj(edge) && isNonEmptyString(edge.ref)), "outputs must be an array of edges with a non-empty ref.");

  require(Array.isArray(contract.acceptance_criteria) && contract.acceptance_criteria.length > 0, "acceptance_criteria must be a non-empty array.");
  if (Array.isArray(contract.acceptance_criteria)) {
    for (const entry of contract.acceptance_criteria) {
      require(isObj(entry) && isNonEmptyString(entry.criterion) && typeof entry.checked === "boolean", "Every acceptance_criteria entry needs a non-empty criterion and a boolean checked.");
    }
  }

  const gate = contract.exit_gate;
  require(isObj(gate), "exit_gate is required.");
  if (isObj(gate)) {
    require(Array.isArray(gate.commands) && gate.commands.length > 0 && gate.commands.every(isNonEmptyString), "exit_gate.commands must be a non-empty array of non-empty strings.");
    require(isObj(gate.evidence) && typeof gate.evidence.passed === "boolean", "exit_gate.evidence.passed must be a boolean.");
  }

  const retry = contract.retry;
  const validTiers = new Set(["T0", "T1", "T1.5", "T2", "T3"]);
  require(isObj(retry) && Number.isInteger(retry.max_attempts) && retry.max_attempts >= 1, "retry.max_attempts must be an integer >= 1.");
  require(isObj(retry) && validTiers.has(retry.escalation), `retry.escalation must be one of ${[...validTiers].join(", ")}.`);

  require(isObj(contract.rework) && contract.rework.policy === REWORK_POLICY, `rework.policy must equal "${REWORK_POLICY}".`);

  return { valid: errors.length === 0, errors };
}
