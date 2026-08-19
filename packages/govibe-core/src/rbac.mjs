// RBAC core per docs/specs/SPEC-Workspace-System.md §6 (TASK-PRD-015).
// subject (employee_id | staff_id | agent_id) -> scoped role assignment -> role -> operations.
// Deny by default; every allow AND deny decision is audited (§6.4). RBAC never raises the H
// ceiling: the effective permission is the intersection of the role grant and the executor's
// access scope (§6.1); required scopes per operation come from the §7 governance table.

export const RBAC_ROLES = Object.freeze({ OWNER: "owner", MAINTAINER: "maintainer", OPERATOR: "operator", VIEWER: "viewer" });
export const SUBJECT_TYPES = Object.freeze({ EMPLOYEE: "employee", STAFF: "staff", AGENT: "agent" });

const SUBJECT_ID_PATTERNS = Object.freeze({
  [SUBJECT_TYPES.EMPLOYEE]: /^employee_[a-z0-9][a-z0-9-]{3,31}$/,
  [SUBJECT_TYPES.STAFF]: /^staff_[a-z0-9][a-z0-9-]{3,31}$/,
  // Agent namespace per vaults.mjs, minus the personnel prefixes (§3.3 rule 4).
  [SUBJECT_TYPES.AGENT]: /^(?!employee_|staff_)[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/,
});

// §6.2 permission matrix, encoded row-for-row. The approval row expands to its three named
// operations; both scan variants are distinct operations because their role sets differ.
export const RBAC_OPERATIONS = Object.freeze({
  "govibe.workspace.initialize": { roles: ["owner", "maintainer"], required_access_scope: "H1" },
  "govibe.workspace.scan.deep": { roles: ["owner", "maintainer"], required_access_scope: "H2" },
  "govibe.workspace.scan.l1": { roles: ["owner", "maintainer", "operator"], required_access_scope: "H1" },
  "govibe.workflow.continue": { roles: ["owner", "maintainer", "operator"], required_access_scope: "H0" },
  "govibe.plan.create": { roles: ["owner", "maintainer", "operator"], required_access_scope: "H0" },
  "govibe.workspace.impact": { roles: ["owner", "maintainer", "operator"], required_access_scope: "H1" },
  "govibe.workspace.validate": { roles: ["owner", "maintainer", "operator"], required_access_scope: "H1" },
  "govibe.workflow.status": { roles: ["owner", "maintainer", "operator", "viewer"], required_access_scope: "H0" },
  "govibe.docs.version": { roles: ["owner", "maintainer", "operator", "viewer"], required_access_scope: "H0" },
  "govibe.review.run": { roles: ["owner", "maintainer", "operator", "viewer"], required_access_scope: "H0" },
  // TASK-PRD-027 (AUD-05): both tools read arbitrary-selector file content off disk and were
  // outside this matrix entirely (operation_not_governed) even though scripts/mcp/path-security.mjs
  // now contains the read. docs.resolve is read-only like docs.version/review.run, so it keeps
  // viewer; ingest.code additionally creates atom/knowledge candidates for MSP promotion, which
  // this repo treats as a mutating operation (same shape as workspace.scan L1), so it excludes viewer.
  "govibe.docs.resolve": { roles: ["owner", "maintainer", "operator", "viewer"], required_access_scope: "H1" },
  "govibe.ingest.code": { roles: ["owner", "maintainer", "operator"], required_access_scope: "H1" },
  "govibe.approval.promotion": { roles: ["owner"], required_access_scope: "H0", approval: true },
  "govibe.approval.doc_signoff": { roles: ["owner"], required_access_scope: "H0", approval: true },
  "govibe.approval.h4_override": { roles: ["owner"], required_access_scope: "H0", approval: true },
});

const ACCESS_SCOPES = Object.freeze(["H0", "H1", "H2", "H3", "H4"]);

function accessScopeRank(value) {
  const rank = ACCESS_SCOPES.indexOf(value);
  if (rank === -1) throw new Error(`Unknown access scope: ${value}`);
  return rank;
}

export function validateRbacSubject(subjectType, subjectId) {
  const pattern = SUBJECT_ID_PATTERNS[subjectType];
  if (!pattern) throw new Error(`Unknown subject_type: ${subjectType}`);
  if (!pattern.test(String(subjectId ?? ""))) {
    throw new Error(`Subject ID does not match the ${subjectType} namespace: ${subjectId}`);
  }
  return subjectId;
}

function normalizeScope(scope) {
  const projectId = scope?.project_id ?? null;
  const workspaceId = scope?.workspace_id ?? null;
  if (!projectId && !workspaceId) throw new Error("RBAC scope requires a project_id or workspace_id.");
  return { project_id: projectId, workspace_id: workspaceId };
}

function requireActor(actor) {
  const value = String(actor ?? "").trim();
  if (!value) throw new Error("RBAC operations require an actor.");
  return value;
}

export function createRbacRegistry({ assignments = [], auditLog = [], now = () => new Date().toISOString() } = {}) {
  const grants = assignments.map((assignment) => ({ ...assignment }));
  const audit = auditLog.map((entry) => ({ ...entry }));

  function activeGrantsFor(subjectId) {
    return grants.filter((grant) => grant.subject_id === subjectId && grant.status === "active");
  }

  // A grant covers a request when its single scope value matches: a project-scoped assignment
  // covers every request in that project; a workspace-scoped assignment covers only that
  // workspace. There are no global implicit grants (§6.1).
  function covers(grant, scope) {
    if (grant.scope.project_id) return grant.scope.project_id === scope.project_id;
    return grant.scope.workspace_id === scope.workspace_id;
  }

  function hasOwnerInScope(subjectId, scope) {
    return activeGrantsFor(subjectId).some((grant) => grant.role === RBAC_ROLES.OWNER && covers(grant, scope));
  }

  function appendAudit(entry) {
    audit.push({ at: now(), ...entry });
  }

  function grantRole({ subjectId, subjectType, role, scope, actor, approval }) {
    const safeActor = requireActor(actor);
    validateRbacSubject(subjectType, subjectId);
    if (!Object.values(RBAC_ROLES).includes(role)) throw new Error(`Unknown role: ${role}`);
    const safeScope = normalizeScope(scope);

    if (subjectType === SUBJECT_TYPES.STAFF) {
      // §6.3: contract staff never hold owner; their ceiling is maintainer, and each grant
      // above operator requires an explicit recorded approval by an owner in the same scope.
      if (role === RBAC_ROLES.OWNER) throw new Error("Contract staff (staff_) cannot hold the owner role.");
      if (role === RBAC_ROLES.MAINTAINER) {
        if (!approval?.approvedBy || !approval?.approvalRef) {
          throw new Error("Granting contract staff above operator requires a recorded owner approval (approvedBy, approvalRef).");
        }
        if (!hasOwnerInScope(approval.approvedBy, safeScope)) {
          throw new Error(`Approver ${approval.approvedBy} does not hold an active owner role in the target scope.`);
        }
      }
    }

    const assignment = {
      subject_id: subjectId,
      subject_type: subjectType,
      role,
      scope: safeScope,
      status: "active",
      granted_by: safeActor,
      granted_at: now(),
      approval: approval ? { approved_by: approval.approvedBy, approval_ref: approval.approvalRef } : null,
    };
    grants.push(assignment);
    appendAudit({ kind: "grant", subject_id: subjectId, subject_type: subjectType, role, scope: safeScope, actor: safeActor, decision: "recorded", reason: "role_granted" });
    return { ...assignment };
  }

  function revokeRole({ subjectId, role, scope, actor }) {
    const safeActor = requireActor(actor);
    const safeScope = normalizeScope(scope);
    const assignment = grants.find((grant) => grant.subject_id === subjectId && grant.role === role && grant.status === "active" && covers(grant, safeScope));
    if (!assignment) throw new Error(`No active ${role} assignment for ${subjectId} in the target scope.`);
    assignment.status = "revoked";
    assignment.revoked_by = safeActor;
    assignment.revoked_at = now();
    appendAudit({ kind: "revoke", subject_id: subjectId, subject_type: assignment.subject_type, role, scope: safeScope, actor: safeActor, decision: "recorded", reason: "role_revoked" });
    return { ...assignment };
  }

  // §6.4: every allow and deny is recorded with subject, role, scope, operation, timestamp.
  function decide({ subjectId, subjectType, operation, scope, executorAccessScope = "H4", context = {} }) {
    validateRbacSubject(subjectType, subjectId);
    const safeScope = normalizeScope(scope);

    function record(decision, reason, role = null) {
      appendAudit({ kind: "decision", subject_id: subjectId, subject_type: subjectType, role, scope: safeScope, operation, decision, reason });
      return { decision, reason, role, subject_id: subjectId, operation, scope: safeScope };
    }

    const spec = RBAC_OPERATIONS[operation];
    if (!spec) return record("deny", "unknown_operation");

    const covering = activeGrantsFor(subjectId).filter((grant) => covers(grant, safeScope));
    if (covering.length === 0) return record("deny", "no_covering_assignment");

    const permitting = covering.find((grant) => spec.roles.includes(grant.role));
    if (!permitting) return record("deny", "role_not_permitted", covering[0].role);

    // §6.1 intersection: a role grant cannot authorize a call above the executor's H ceiling.
    if (accessScopeRank(executorAccessScope) < accessScopeRank(spec.required_access_scope)) {
      return record("deny", "h_ceiling_exceeded", permitting.role);
    }

    // §6.3 separation of duties: the subject who executed a promotion or sign-off request
    // cannot be the subject who approves it.
    if (spec.approval && context.requestedBy === subjectId) {
      return record("deny", "separation_of_duties", permitting.role);
    }

    return record("allow", "role_permits", permitting.role);
  }

  function getAuditLog() {
    return audit.map((entry) => ({ ...entry }));
  }

  function exportState() {
    return {
      schema: "govibe-rbac-registry/v1",
      assignments: grants.map((grant) => ({ ...grant })),
      auditLog: audit.map((entry) => ({ ...entry })),
    };
  }

  return { grantRole, revokeRole, decide, getAuditLog, exportState };
}
