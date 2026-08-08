// RBAC tool-surface enforcement per SPEC-Workspace-System §6 (TASK-PRD-016).
// handleToolCall runs this decision point BEFORE any handler body. Enforcement activates per
// workspace: a workspace that materializes `.govibe/rbac.json` gets deny-by-default decisions
// from the govibe-core RBAC registry; a workspace without it keeps the pre-RBAC posture
// (H ceiling, repository policy, human gates) exactly as the spec's §6 status note records.
// Every enforced decision — allow and deny — is appended to `.govibe/rbac-audit.jsonl` (§6.4).

import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";

import { createRbacRegistry } from "../../../packages/govibe-core/src/index.mjs";

export const RBAC_STATE_SCHEMA = "govibe-rbac-state/v1";

export class RbacDenialError extends Error {
  constructor(operation, subjectId, reason) {
    super(`RBAC denied ${operation} for ${subjectId}: ${reason}`);
    this.name = "RbacDenialError";
    this.code = "rbac_denied";
    this.operation = operation;
    this.subjectId = subjectId;
    this.reason = reason;
  }
}

// Tool name -> §6.2 operation id. The scan tool splits by its `deep` flag because the two
// variants carry different role sets and access-scope requirements.
const DIRECT_OPERATIONS = new Set([
  "govibe.workspace.initialize",
  "govibe.workspace.impact",
  "govibe.workspace.validate",
  "govibe.workflow.continue",
  "govibe.plan.create",
  "govibe.workflow.status",
  "govibe.docs.version",
  "govibe.review.run",
]);

export function resolveRbacOperation(toolName, args = {}) {
  if (toolName === "govibe.workspace.scan") {
    return args.deep === true ? "govibe.workspace.scan.deep" : "govibe.workspace.scan.l1";
  }
  return DIRECT_OPERATIONS.has(toolName) ? toolName : null;
}

// Namespace classification at the attribution boundary. Personnel employment semantics still
// come from `employment_type` on the personnel record (§3.3 rule 5) — this only routes an
// incoming actor string to its ID namespace for assignment lookup.
export function classifySubjectType(subjectId) {
  const value = String(subjectId ?? "");
  if (value.startsWith("employee_")) return "employee";
  if (value.startsWith("staff_")) return "staff";
  return "agent";
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function appendAuditLine(auditPath, entry) {
  await appendFile(auditPath, `${JSON.stringify(entry)}\n`, "utf8");
}

// Core decision path shared by tool dispatch and (future) approval endpoints. Returns the
// decision descriptor for allows and non-enforced calls; throws RbacDenialError on deny.
export async function authorizeOperation({ workspacePath, operation, actor, context = {}, now = () => new Date().toISOString() }) {
  if (!workspacePath) return { enforced: false, reason: "no_workspace_scope" };
  const govibeDir = path.join(workspacePath, ".govibe");
  const state = await readJsonIfExists(path.join(govibeDir, "rbac.json"));
  if (!state) return { enforced: false, reason: "rbac_not_configured" };
  if (state.schema !== RBAC_STATE_SCHEMA) {
    throw new Error(`Incompatible existing state: ${path.join(govibeDir, "rbac.json")}`);
  }

  const auditPath = path.join(govibeDir, "rbac-audit.jsonl");
  const subjectId = String(actor ?? "").trim();
  const subjectType = classifySubjectType(subjectId);

  const config = await readJsonIfExists(path.join(govibeDir, "config.json"));
  if (!config?.workspaceId) {
    await appendAuditLine(auditPath, { at: now(), subject_id: subjectId, subject_type: subjectType, operation, scope: null, decision: "deny", reason: "workspace_not_initialized" });
    throw new RbacDenialError(operation, subjectId, "workspace_not_initialized");
  }
  const scope = { workspace_id: config.workspaceId, project_id: config.projectId ?? null };

  let result;
  try {
    const registry = createRbacRegistry({ assignments: state.assignments ?? [], now });
    result = registry.decide({
      subjectId,
      subjectType,
      operation,
      scope,
      executorAccessScope: state.executor_access_scope ?? "H4",
      context,
    });
  } catch (error) {
    // Malformed subjects (or state) fail closed, and the denial is still recorded.
    await appendAuditLine(auditPath, { at: now(), subject_id: subjectId, subject_type: subjectType, operation, scope, decision: "deny", reason: "invalid_subject", detail: error.message });
    throw new RbacDenialError(operation, subjectId, "invalid_subject");
  }

  await appendAuditLine(auditPath, { at: now(), subject_id: subjectId, subject_type: subjectType, role: result.role, operation, scope, decision: result.decision, reason: result.reason });
  if (result.decision !== "allow") {
    throw new RbacDenialError(operation, subjectId, result.reason);
  }
  return { enforced: true, ...result };
}

// The dispatch guard: no-op for tools outside the §6.2 matrix or calls without a workspace
// scope; otherwise the full decision path above.
export async function enforceToolRbac(toolName, args = {}) {
  const operation = resolveRbacOperation(toolName, args);
  if (!operation) return { enforced: false, reason: "operation_not_governed" };
  return authorizeOperation({ workspacePath: args.workspacePath, operation, actor: args.actor, context: { requestedBy: args.requestedBy } });
}
