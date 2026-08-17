// Roadmap Definition-of-Ready gate.
// Operationalizes .agents/pm/asset/Planning-Decomposition-Standard.md and the A2 Task Container
// contract: a planning source that declares "## Task Containers" must provide a COMPLETE container
// for every actionable backlog task, and every authored symbol_link must resolve to a real file.
// Shift-left: this fails the build instead of letting an incomplete plan promote to the board.
//
// Plan-quality checks (SWE DoR):
//   1. Estimate present   — container must carry a numeric token_telemetry.total_token_usage.
//   2. Dependency resolve — every intra-source dependency id in node.artifactLinks must exist
//                           as a node in the same source (external refs / file paths are skipped).
//   3. Criteria testability (WARNING-ONLY) — acceptance/success/exit criteria that exactly match
//                           a known generic boilerplate set trigger a warning suggesting Given/When/Then.
//   4. Node contract required — ADR-029 §5: a task past "ready" (in-progress/assigned/review/done)
//                           must have a schema-valid .govibe/node-contracts/<task_id>.json. This is
//                           the gate-time analog of "dispatch is refused without a valid contract" —
//                           the only enforcement point that exists before a live dispatcher does.
//   5. Handoff evidence gate — ADR-029 §5: a completed handoff whose Required Artifact references
//                           exit-gate/contract evidence must point at a contract with a recorded pass.
//
// Checks 4-5 apply only to NODE_CONTRACT_GOVERNED_SOURCES: ADR-029 introduced the node-contract
// requirement for the Gov-Layer Supervision Surfaces backlog specifically. Applying it retroactively
// to every historical roadmap source would hard-fail years of already-approved, already-closed work
// for a rule that did not exist when that work closed — scope stays with what the ADR governs.

import { readdir, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseRoadmapSource } from "../mcp/roadmap-parser.mjs";
import { validateNodeContract } from "../mcp/runtime/node-contract-generator.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const roadmapDir = path.join(workspaceRoot, "docs", "roadmap");
const nodeContractsDir = path.join(workspaceRoot, ".govibe", "node-contracts");
const roadmapFilePattern = /^(MASTERPLAN|ROADMAP|BACKLOG|SPRINT)-.+\.(md|html)$/i;
const UNAVAILABLE = "unavailable";
// Normalized WorkflowTaskState values (roadmap-parser.mjs mapWorkflowState output, not the raw
// table text) meaning a task has been dispatched or finished rather than merely queued.
export const DISPATCHED_STATUSES = new Set(["in_progress", "assigned", "qa_review", "audit_review", "done"]);
export const EVIDENCE_ARTIFACT_PATTERN = /exit[ -]?gate|contract evidence/i;
export const NODE_CONTRACT_GOVERNED_SOURCES = new Set(["BACKLOG-govlayer-supervision-surfaces.md"]);

// Generic boilerplate criterion texts (case-insensitive exact match) flagged by the testability check.
const BOILERPLATE_CRITERIA = new Set([
  "spec approved",
  "docs updated",
  "code complete",
  "lints clean",
  "tests passed",
  "regression free",
]);

const errors = [];
const warnings = [];

function isResolvablePath(value) {
  if (!value || value.trim().toLowerCase() === UNAVAILABLE) return false;
  // Treat anything with a path separator or a known file extension as a file reference.
  return /[\\/]/.test(value) || /\.[a-z0-9]+$/i.test(value.trim());
}

// Returns true if a dependency id looks like an external / cross-source reference that should not
// be resolved against this source's node set.  We classify a dep as external when:
//   • it contains a path separator or file extension (doc/file ref)
//   • its id-family prefix (everything before the first "-") does not match any node id prefix
//     in this source — e.g. "IMP-...", "QWEN-LOCAL-..." vs. "TASK-...", "TSK-..." in a TASK source.
// This lets the check catch genuinely broken intra-source deps (like TSK-CVB01P00020 in
// BACKLOG-p1-mvp-core.md) without false-positiving on intentional external references.
function isExternalRef(depId, sourceIdFamilies) {
  if (/[\\/]/.test(depId) || /\.[a-z0-9]+$/i.test(depId.trim())) return true;
  const family = depId.split("-")[0].toUpperCase();
  return !sourceIdFamilies.has(family);
}

// Loads and JSON-parses the generated contract for a task_id from the fixed
// .govibe/node-contracts/ location. Never throws — callers branch on `error`.
function loadNodeContract(taskId) {
  const contractPath = path.join(nodeContractsDir, `${taskId}.json`);
  if (!existsSync(contractPath)) return { contract: null, error: "missing (no .govibe/node-contracts/<task_id>.json)" };
  try {
    return { contract: JSON.parse(readFileSync(contractPath, "utf8")), error: null };
  } catch (error) {
    return { contract: null, error: `not valid JSON (${error.message})` };
  }
}

async function validateSource(fileName) {
  const sourcePath = path.join(roadmapDir, fileName);
  const rel = path.relative(workspaceRoot, sourcePath).replace(/\\/g, "/");
  const text = await readFile(sourcePath, "utf8");
  const declaresContainers = /^##\s+Task Containers\s*$/m.test(text);

  let snapshot;
  try {
    snapshot = await parseRoadmapSource(sourcePath);
  } catch (error) {
    errors.push(`${rel}: failed to parse (${error.message})`);
    return;
  }

  // Only approved sources can reach the board (FEAT-Roadmap-Promotion-Contract), so only they
  // hard-fail. Draft/candidate sources surface the same findings as warnings.
  const enforced = String(snapshot.approvalStatus ?? "").toLowerCase() === "approved";
  const report = (message) => (enforced ? errors : warnings).push(message);

  const nodeById = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const containersById = new Map((snapshot.taskContainers ?? []).map((c) => [c.task_id, c]));

  // Build the set of id-family prefixes present in this source (e.g. {"TASK", "SPRINT", "PHASE"}).
  const sourceIdFamilies = new Set(
    snapshot.nodes.map((node) => (node.id ?? "").split("-")[0].toUpperCase()).filter(Boolean),
  );

  // Actionable backlog tasks = a "task" node whose parent is a sprint (excludes phases, sub/micro/atomic, and checklist noise).
  const backlogTasks = snapshot.nodes.filter(
    (node) => node.type === "task" && nodeById.get(node.parentId)?.type === "sprint",
  );

  if (declaresContainers) {
    for (const task of backlogTasks) {
      const container = containersById.get(task.id);
      if (!container) {
        report(`${rel}: backlog task '${task.id}' is missing its Task Container (## Task Containers).`);
        continue;
      }
      if (container.complete === false) {
        report(`${rel}: Task Container '${task.id}' is incomplete -> missing: ${container.missingFields.join(", ")}`);
      }

      // Check 1 — Estimate present: token_telemetry.total_token_usage must be a finite number.
      const rawEstimate = (container.token_telemetry ?? {}).total_token_usage;
      const estimate = Number(String(rawEstimate ?? "").replace(/[^0-9.-]/g, ""));
      if (!rawEstimate || !Number.isFinite(estimate) || estimate === 0) {
        report(`${rel}: Task Container '${task.id}' is missing a numeric token estimate (token_telemetry.total_token_usage).`);
      }

      // Check 3 — Acceptance-criteria testability (WARNING ONLY — never an error regardless of approval).
      const dod = container.definition_of_done ?? {};
      const allCriteria = [
        ...(dod.acceptance_criteria ?? []),
        ...(dod.success_criteria ?? []),
        ...(dod.exit_criteria ?? []),
      ];
      const boilerplateMatches = allCriteria
        .map((item) => String(item?.criterion ?? "").trim())
        .filter((text) => BOILERPLATE_CRITERIA.has(text.toLowerCase()));
      if (boilerplateMatches.length > 0) {
        warnings.push(
          `${rel}: Task Container '${task.id}' has ${boilerplateMatches.length} generic boilerplate criterion/criteria ` +
          `(${boilerplateMatches.map((t) => `"${t}"`).join(", ")}). ` +
          `Consider replacing with testable Given/When/Then acceptance criteria.`,
        );
      }

      // Check 4 — Node contract required for a dispatched task (ADR-029 §5, scoped to the sources
      // that ADR governs). This is the gate-time enforcement point standing in for a live dispatcher:
      // a task the board shows as in-progress or beyond must carry a schema-valid generated contract,
      // or it is flagged as a defect here — the same signal the Mission Canvas will eventually render
      // inline.
      if (NODE_CONTRACT_GOVERNED_SOURCES.has(fileName) && DISPATCHED_STATUSES.has(task.state)) {
        const { contract, error: contractError } = loadNodeContract(task.id);
        if (contractError) {
          report(`${rel}: backlog task '${task.id}' is ${task.state} but its node execution contract is ${contractError} (ADR-029 §5 requires a schema-valid contract before dispatch).`);
        } else {
          const { valid, errors: schemaErrors } = validateNodeContract(contract);
          if (!valid) {
            report(`${rel}: backlog task '${task.id}' has a node execution contract that fails schema validation: ${schemaErrors.join("; ")}`);
          }
        }
      }
    }

    // Check 5 — Handoff evidence gate (ADR-029 §5, same scope as Check 4). A completed handoff whose
    // Required Artifact references exit-gate/contract evidence must point at a contract that actually
    // recorded a pass — the hook that "blocks the handoff with the missing evidence named".
    if (NODE_CONTRACT_GOVERNED_SOURCES.has(fileName)) {
      for (const handoff of snapshot.handoffs ?? []) {
        const isCompleted = String(handoff.state ?? "").trim().toLowerCase() === "completed";
        if (!isCompleted || !EVIDENCE_ARTIFACT_PATTERN.test(handoff.requiredArtifact ?? "")) continue;
        const { contract, error: contractError } = loadNodeContract(handoff.taskId);
        if (contractError) {
          report(`${rel}: handoff for '${handoff.taskId}' is completed and its Required Artifact references exit-gate evidence, but the node contract is ${contractError}.`);
          continue;
        }
        if (contract.exit_gate?.evidence?.passed !== true) {
          report(`${rel}: handoff for '${handoff.taskId}' is completed and requires exit-gate evidence, but the contract's exit_gate.evidence.passed is not true.`);
        }
      }
    }
  }

  // Check 2 — Dependency resolution: every intra-source dep id in artifactLinks must resolve to a node.
  for (const task of backlogTasks) {
    const deps = (task.artifactLinks ?? []).filter((id) => {
      const trimmed = id.trim();
      return trimmed.length > 0 && trimmed !== "-";
    });
    for (const depId of deps) {
      if (isExternalRef(depId, sourceIdFamilies)) continue;
      if (!nodeById.has(depId)) {
        report(`${rel}: backlog task '${task.id}' has unresolved dependency '${depId}' (not found in this source).`);
      }
    }
  }

  // Symbol-link integrity for every authored container.
  for (const container of snapshot.taskContainers ?? []) {
    if (!containersById.has(container.task_id) || !backlogTasks.some((t) => t.id === container.task_id)) {
      warnings.push(`${rel}: Task Container '${container.task_id}' has no matching backlog task node (orphan container).`);
    }
    const links = container.symbol_links ?? {};
    for (const kind of ["code", "doc", "test"]) {
      const value = links[kind];
      if (!isResolvablePath(value)) continue;
      if (!existsSync(path.join(workspaceRoot, value))) {
        report(`${rel}: Task Container '${container.task_id}' symbol_links.${kind} points to a missing file: ${value}`);
      } else if (kind === "code" && !/^(src|scripts|packages)[\\/]/.test(value)) {
        warnings.push(`${rel}: Task Container '${container.task_id}' symbol_links.code is not under src/scripts/packages: ${value}`);
      }
    }
  }
}

async function main() {
  const entries = await readdir(roadmapDir, { withFileTypes: true });
  const sources = entries.filter((e) => e.isFile() && roadmapFilePattern.test(e.name)).map((e) => e.name).sort();

  for (const fileName of sources) {
    await validateSource(fileName);
  }

  for (const warning of warnings) console.warn(`WARN  ${warning}`);
  for (const error of errors) console.error(`ERROR ${error}`);

  const newChecks = "estimate, dependency-resolve, criteria-testability";
  console.log(
    `\nRoadmap container gate: ${sources.length} sources checked, ${errors.length} error(s), ${warnings.length} warning(s). ` +
    `[plan-quality checks: ${newChecks}]`,
  );
  if (errors.length > 0) {
    console.error("FAIL: incomplete Definition of Ready. Plans must carry complete Task Containers before board promotion.");
    process.exit(1);
  }
  console.log("PASS: all declared Task Containers are complete and link to real artifacts.");
}

// Guarded so importing this module for its exports (e.g. from a test) never
// triggers the CLI scan / process.exit as a side effect of import.
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
