// SPEC-Workspace-System §6 RBAC conformance (TASK-PRD-015, AC-08).

import { describe, expect, it } from "vitest";

import { createRbacRegistry, RBAC_OPERATIONS, RBAC_ROLES, SUBJECT_TYPES } from "./index.mjs";

const WS = { workspace_id: "workspace_aaaaaaaaaaaaaaaaaaaaaaaa" };
const PROJECT = { project_id: "project_bbbbbbbbbbbbbbbbbbbbbbbb" };
const OTHER_WS = { workspace_id: "workspace_cccccccccccccccccccccc" };

function fixedClock() {
  let tick = 0;
  return () => `2026-08-09T00:00:${String(tick++).padStart(2, "0")}.000Z`;
}

function registryWithOwner() {
  const registry = createRbacRegistry({ now: fixedClock() });
  registry.grantRole({ subjectId: "employee_boss-01", subjectType: SUBJECT_TYPES.EMPLOYEE, role: RBAC_ROLES.OWNER, scope: WS, actor: "bootstrap" });
  return registry;
}

// §6.2 matrix, transcribed row-for-row from the spec so the sweep below fails on any drift
// between RBAC_OPERATIONS and the published table.
const SPEC_MATRIX = {
  "govibe.workspace.initialize": { owner: true, maintainer: true, operator: false, viewer: false },
  "govibe.workspace.scan.deep": { owner: true, maintainer: true, operator: false, viewer: false },
  "govibe.workspace.scan.l1": { owner: true, maintainer: true, operator: true, viewer: false },
  "govibe.workflow.continue": { owner: true, maintainer: true, operator: true, viewer: false },
  "govibe.plan.create": { owner: true, maintainer: true, operator: true, viewer: false },
  "govibe.workspace.impact": { owner: true, maintainer: true, operator: true, viewer: false },
  "govibe.workspace.validate": { owner: true, maintainer: true, operator: true, viewer: false },
  "govibe.workflow.status": { owner: true, maintainer: true, operator: true, viewer: true },
  "govibe.docs.version": { owner: true, maintainer: true, operator: true, viewer: true },
  "govibe.review.run": { owner: true, maintainer: true, operator: true, viewer: true },
  "govibe.approval.promotion": { owner: true, maintainer: false, operator: false, viewer: false },
  "govibe.approval.doc_signoff": { owner: true, maintainer: false, operator: false, viewer: false },
  "govibe.approval.h4_override": { owner: true, maintainer: false, operator: false, viewer: false },
};

describe("RBAC — §6.1 deny by default", () => {
  it("denies a subject with no covering assignment and audits the denial (AC-08)", () => {
    const registry = createRbacRegistry({ now: fixedClock() });
    const result = registry.decide({ subjectId: "agent-worker", subjectType: SUBJECT_TYPES.AGENT, operation: "govibe.workspace.impact", scope: WS });
    expect(result).toMatchObject({ decision: "deny", reason: "no_covering_assignment" });

    const entry = registry.getAuditLog().find((item) => item.kind === "decision");
    expect(entry).toMatchObject({ subject_id: "agent-worker", subject_type: "agent", scope: WS, operation: "govibe.workspace.impact", decision: "deny", reason: "no_covering_assignment" });
    expect(entry.at).toMatch(/^2026-08-09T/);
  });

  it("denies an unknown operation rather than defaulting open", () => {
    const registry = registryWithOwner();
    const result = registry.decide({ subjectId: "employee_boss-01", subjectType: SUBJECT_TYPES.EMPLOYEE, operation: "govibe.workspace.delete_everything", scope: WS });
    expect(result).toMatchObject({ decision: "deny", reason: "unknown_operation" });
  });

  it("scopes assignments: a workspace grant never covers another workspace", () => {
    const registry = registryWithOwner();
    const result = registry.decide({ subjectId: "employee_boss-01", subjectType: SUBJECT_TYPES.EMPLOYEE, operation: "govibe.workspace.impact", scope: OTHER_WS });
    expect(result).toMatchObject({ decision: "deny", reason: "no_covering_assignment" });
  });

  it("covers workspaces of a project through a project-scoped assignment", () => {
    const registry = createRbacRegistry({ now: fixedClock() });
    registry.grantRole({ subjectId: "employee_lead-01", subjectType: SUBJECT_TYPES.EMPLOYEE, role: RBAC_ROLES.MAINTAINER, scope: PROJECT, actor: "bootstrap" });
    const result = registry.decide({ subjectId: "employee_lead-01", subjectType: SUBJECT_TYPES.EMPLOYEE, operation: "govibe.workspace.initialize", scope: { ...PROJECT, ...WS } });
    expect(result).toMatchObject({ decision: "allow", role: "maintainer" });
  });

  it("stops honoring a revoked assignment", () => {
    const registry = registryWithOwner();
    registry.revokeRole({ subjectId: "employee_boss-01", role: RBAC_ROLES.OWNER, scope: WS, actor: "bootstrap" });
    const result = registry.decide({ subjectId: "employee_boss-01", subjectType: SUBJECT_TYPES.EMPLOYEE, operation: "govibe.workflow.status", scope: WS });
    expect(result).toMatchObject({ decision: "deny", reason: "no_covering_assignment" });
  });
});

describe("RBAC — §6.2 permission matrix sweep", () => {
  it("matches the published matrix exactly for every role and operation", () => {
    expect(Object.keys(SPEC_MATRIX).sort()).toEqual(Object.keys(RBAC_OPERATIONS).sort());

    for (const role of Object.values(RBAC_ROLES)) {
      const registry = createRbacRegistry({ now: fixedClock() });
      const subjectId = `employee_${role}-subj`;
      registry.grantRole({ subjectId, subjectType: SUBJECT_TYPES.EMPLOYEE, role, scope: WS, actor: "bootstrap" });
      for (const [operation, expectations] of Object.entries(SPEC_MATRIX)) {
        const result = registry.decide({ subjectId, subjectType: SUBJECT_TYPES.EMPLOYEE, operation, scope: WS, executorAccessScope: "H4" });
        expect(result.decision, `${role} x ${operation}`).toBe(expectations[role] ? "allow" : "deny");
        if (!expectations[role]) expect(result.reason, `${role} x ${operation}`).toBe("role_not_permitted");
      }
    }
  });
});

describe("RBAC — §6.3 employment-type constraints", () => {
  it("never grants owner to a staff_ subject", () => {
    const registry = registryWithOwner();
    expect(() => registry.grantRole({ subjectId: "staff_bob-2026", subjectType: SUBJECT_TYPES.STAFF, role: RBAC_ROLES.OWNER, scope: WS, actor: "employee_boss-01" })).toThrow(/cannot hold the owner role/);
  });

  it("requires a recorded owner approval to lift staff above operator", () => {
    const registry = registryWithOwner();
    expect(() => registry.grantRole({ subjectId: "staff_bob-2026", subjectType: SUBJECT_TYPES.STAFF, role: RBAC_ROLES.MAINTAINER, scope: WS, actor: "employee_boss-01" })).toThrow(/recorded owner approval/);
    expect(() => registry.grantRole({ subjectId: "staff_bob-2026", subjectType: SUBJECT_TYPES.STAFF, role: RBAC_ROLES.MAINTAINER, scope: WS, actor: "employee_boss-01", approval: { approvedBy: "employee_random-01", approvalRef: "APPROVAL-1" } })).toThrow(/does not hold an active owner role/);

    const assignment = registry.grantRole({ subjectId: "staff_bob-2026", subjectType: SUBJECT_TYPES.STAFF, role: RBAC_ROLES.MAINTAINER, scope: WS, actor: "employee_boss-01", approval: { approvedBy: "employee_boss-01", approvalRef: "APPROVAL-1" } });
    expect(assignment.approval).toEqual({ approved_by: "employee_boss-01", approval_ref: "APPROVAL-1" });
  });

  it("grants staff operator and viewer without special approval", () => {
    const registry = createRbacRegistry({ now: fixedClock() });
    expect(registry.grantRole({ subjectId: "staff_bob-2026", subjectType: SUBJECT_TYPES.STAFF, role: RBAC_ROLES.OPERATOR, scope: WS, actor: "bootstrap" }).role).toBe("operator");
    expect(registry.grantRole({ subjectId: "staff_eve-2026", subjectType: SUBJECT_TYPES.STAFF, role: RBAC_ROLES.VIEWER, scope: WS, actor: "bootstrap" }).role).toBe("viewer");
  });

  it("enforces separation of duties on approval operations", () => {
    const registry = registryWithOwner();
    const denied = registry.decide({ subjectId: "employee_boss-01", subjectType: SUBJECT_TYPES.EMPLOYEE, operation: "govibe.approval.promotion", scope: WS, context: { requestedBy: "employee_boss-01" } });
    expect(denied).toMatchObject({ decision: "deny", reason: "separation_of_duties" });

    const allowed = registry.decide({ subjectId: "employee_boss-01", subjectType: SUBJECT_TYPES.EMPLOYEE, operation: "govibe.approval.promotion", scope: WS, context: { requestedBy: "staff_bob-2026" } });
    expect(allowed).toMatchObject({ decision: "allow", role: "owner" });
  });

  it("rejects subject IDs that cross namespaces", () => {
    const registry = createRbacRegistry({ now: fixedClock() });
    expect(() => registry.grantRole({ subjectId: "staff_bob-2026", subjectType: SUBJECT_TYPES.EMPLOYEE, role: RBAC_ROLES.VIEWER, scope: WS, actor: "bootstrap" })).toThrow(/does not match the employee namespace/);
    expect(() => registry.grantRole({ subjectId: "employee_alice-01", subjectType: SUBJECT_TYPES.AGENT, role: RBAC_ROLES.VIEWER, scope: WS, actor: "bootstrap" })).toThrow(/does not match the agent namespace/);
  });
});

describe("RBAC — §6.1 H-ceiling intersection", () => {
  it("denies when the executor's access scope is below the operation's requirement, regardless of role", () => {
    const registry = registryWithOwner();
    const denied = registry.decide({ subjectId: "employee_boss-01", subjectType: SUBJECT_TYPES.EMPLOYEE, operation: "govibe.workspace.scan.deep", scope: WS, executorAccessScope: "H1" });
    expect(denied).toMatchObject({ decision: "deny", reason: "h_ceiling_exceeded", role: "owner" });

    const allowed = registry.decide({ subjectId: "employee_boss-01", subjectType: SUBJECT_TYPES.EMPLOYEE, operation: "govibe.workspace.scan.deep", scope: WS, executorAccessScope: "H2" });
    expect(allowed).toMatchObject({ decision: "allow" });
  });

  it("denies H0-ceiling executors even H1 operations while status-tier operations still pass", () => {
    const registry = registryWithOwner();
    expect(registry.decide({ subjectId: "employee_boss-01", subjectType: SUBJECT_TYPES.EMPLOYEE, operation: "govibe.workspace.impact", scope: WS, executorAccessScope: "H0" })).toMatchObject({ decision: "deny", reason: "h_ceiling_exceeded" });
    expect(registry.decide({ subjectId: "employee_boss-01", subjectType: SUBJECT_TYPES.EMPLOYEE, operation: "govibe.workflow.status", scope: WS, executorAccessScope: "H0" })).toMatchObject({ decision: "allow" });
  });

  it("rejects unknown access scopes instead of guessing (no H5/H6 tiers)", () => {
    const registry = registryWithOwner();
    expect(() => registry.decide({ subjectId: "employee_boss-01", subjectType: SUBJECT_TYPES.EMPLOYEE, operation: "govibe.workspace.impact", scope: WS, executorAccessScope: "H" + "5" })).toThrow(/Unknown access scope/);
  });
});

describe("RBAC — §6.4 audit and persistence", () => {
  it("records every allow and deny with subject, role, scope, operation, and timestamp", () => {
    const registry = registryWithOwner();
    registry.decide({ subjectId: "employee_boss-01", subjectType: SUBJECT_TYPES.EMPLOYEE, operation: "govibe.workspace.impact", scope: WS });
    registry.decide({ subjectId: "agent-worker", subjectType: SUBJECT_TYPES.AGENT, operation: "govibe.workspace.impact", scope: WS });

    const decisions = registry.getAuditLog().filter((entry) => entry.kind === "decision");
    expect(decisions).toHaveLength(2);
    expect(decisions[0]).toMatchObject({ subject_id: "employee_boss-01", role: "owner", operation: "govibe.workspace.impact", decision: "allow" });
    expect(decisions[1]).toMatchObject({ subject_id: "agent-worker", role: null, operation: "govibe.workspace.impact", decision: "deny" });
    for (const entry of decisions) {
      expect(entry.at).toMatch(/^2026-08-09T/);
      expect(entry.scope).toEqual({ project_id: null, ...WS });
    }
  });

  it("round-trips through exportState and keeps enforcing decisions", () => {
    const registry = registryWithOwner();
    registry.decide({ subjectId: "employee_boss-01", subjectType: SUBJECT_TYPES.EMPLOYEE, operation: "govibe.workflow.status", scope: WS });
    const snapshot = registry.exportState();
    expect(snapshot.schema).toBe("govibe-rbac-registry/v1");

    const restored = createRbacRegistry({ assignments: snapshot.assignments, auditLog: snapshot.auditLog, now: fixedClock() });
    expect(restored.decide({ subjectId: "employee_boss-01", subjectType: SUBJECT_TYPES.EMPLOYEE, operation: "govibe.workspace.initialize", scope: WS })).toMatchObject({ decision: "allow", role: "owner" });
    expect(restored.getAuditLog().length).toBeGreaterThanOrEqual(snapshot.auditLog.length);
  });
});
