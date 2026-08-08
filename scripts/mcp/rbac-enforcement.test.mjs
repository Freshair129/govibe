// SPEC-Workspace-System §6 tool-surface enforcement (TASK-PRD-016).

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { handleToolCall } from "./handlers.mjs";
import { authorizeOperation, classifySubjectType, enforceToolRbac, RBAC_STATE_SCHEMA, RbacDenialError, resolveRbacOperation } from "./runtime/rbac-enforcement.mjs";

const roots = [];
afterEach(async () => {
  for (const root of roots.splice(0).reverse()) {
    await rm(root, { recursive: true, force: true });
  }
});

const WS_ID = "workspace_aaaaaaaaaaaaaaaaaaaaaaaa";
const PROJECT_ID = "project_bbbbbbbbbbbbbbbbbbbbbbbb";

function ownerAssignment(subjectId = "employee_boss-01", role = "owner") {
  return {
    subject_id: subjectId,
    subject_type: classifySubjectType(subjectId),
    role,
    scope: { project_id: null, workspace_id: WS_ID },
    status: "active",
    granted_by: "bootstrap",
    granted_at: "2026-08-09T00:00:00.000Z",
    approval: null,
  };
}

async function workspaceFixture({ rbac, initialized = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "govibe-rbac-enforce-"));
  roots.push(root);
  await mkdir(path.join(root, ".govibe"), { recursive: true });
  if (initialized) {
    await writeFile(path.join(root, ".govibe", "config.json"), JSON.stringify({ schema: "govibe-workspace-config/v1", workspaceId: WS_ID, projectId: PROJECT_ID, projectSlug: "demo", createdAt: "2026-08-09T00:00:00.000Z" }));
  }
  if (rbac) {
    await writeFile(path.join(root, ".govibe", "rbac.json"), JSON.stringify(rbac));
  }
  return root;
}

async function readAuditLines(root) {
  const text = await readFile(path.join(root, ".govibe", "rbac-audit.jsonl"), "utf8");
  return text.trim().split("\n").map((line) => JSON.parse(line));
}

describe("RBAC enforcement — operation mapping", () => {
  it("maps the scan tool by its deep flag and passes through matrix tools", () => {
    expect(resolveRbacOperation("govibe.workspace.scan", { deep: true })).toBe("govibe.workspace.scan.deep");
    expect(resolveRbacOperation("govibe.workspace.scan", {})).toBe("govibe.workspace.scan.l1");
    expect(resolveRbacOperation("govibe.workspace.initialize", {})).toBe("govibe.workspace.initialize");
    expect(resolveRbacOperation("govibe.review.run", {})).toBe("govibe.review.run");
    expect(resolveRbacOperation("govibe.roadmap.load", {})).toBeNull();
  });
});

describe("RBAC enforcement — activation boundary", () => {
  it("does not enforce tools outside the matrix or calls without a workspace scope", async () => {
    expect(await enforceToolRbac("govibe.roadmap.load", {})).toMatchObject({ enforced: false, reason: "operation_not_governed" });
    expect(await enforceToolRbac("govibe.workspace.impact", { actor: "agent-x" })).toMatchObject({ enforced: false, reason: "no_workspace_scope" });
  });

  it("keeps the pre-RBAC posture for a workspace without rbac.json", async () => {
    const root = await workspaceFixture({ rbac: null });
    expect(await enforceToolRbac("govibe.workspace.impact", { actor: "agent-x", workspacePath: root })).toMatchObject({ enforced: false, reason: "rbac_not_configured" });
  });

  it("hard-fails on an rbac.json with an unknown schema instead of guessing (§10)", async () => {
    const root = await workspaceFixture({ rbac: { schema: "govibe-rbac-state/v0", assignments: [] } });
    await expect(enforceToolRbac("govibe.workspace.impact", { actor: "agent-x", workspacePath: root })).rejects.toThrow(/Incompatible existing state/);
  });
});

describe("RBAC enforcement — deny by default on the tool surface (AC-08)", () => {
  it("denies an unassigned subject before the handler body and audits the denial", async () => {
    const root = await workspaceFixture({ rbac: { schema: RBAC_STATE_SCHEMA, assignments: [] } });
    // Through the real dispatch: the RBAC denial must surface, not a runtime error — proof
    // that the decision point runs before the handler body touches the workspace.
    await expect(handleToolCall("govibe.workspace.impact", { actor: "agent-x", workspacePath: root, paths: ["README.md"] })).rejects.toThrow(RbacDenialError);

    const lines = await readAuditLines(root);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ subject_id: "agent-x", subject_type: "agent", operation: "govibe.workspace.impact", decision: "deny", reason: "no_covering_assignment", scope: { workspace_id: WS_ID, project_id: PROJECT_ID } });
    expect(lines[0].at).toMatch(/^\d{4}-/);
  });

  it("lets an authorized subject through the RBAC gate into the handler body", async () => {
    const root = await workspaceFixture({ rbac: { schema: RBAC_STATE_SCHEMA, assignments: [ownerAssignment()] } });
    // The temp workspace is outside the runtime's allowed roots, so the handler body itself
    // rejects — asserting on THAT error proves the allow decision fell through the gate.
    await expect(handleToolCall("govibe.workspace.impact", { actor: "employee_boss-01", workspacePath: root, paths: ["README.md"] })).rejects.toThrow(/outside configured GoVibe roots/);

    const lines = await readAuditLines(root);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ subject_id: "employee_boss-01", role: "owner", decision: "allow", reason: "role_permits" });
  });

  it("denies a role below the operation's matrix row (viewer cannot run impact)", async () => {
    const root = await workspaceFixture({ rbac: { schema: RBAC_STATE_SCHEMA, assignments: [ownerAssignment("staff_view-2026", "viewer")] } });
    await expect(handleToolCall("govibe.workspace.impact", { actor: "staff_view-2026", workspacePath: root, paths: ["README.md"] })).rejects.toThrow(/role_not_permitted/);
  });

  it("applies the H-ceiling intersection from the workspace RBAC state", async () => {
    const root = await workspaceFixture({ rbac: { schema: RBAC_STATE_SCHEMA, assignments: [ownerAssignment()], executor_access_scope: "H1" } });
    await expect(handleToolCall("govibe.workspace.scan", { actor: "employee_boss-01", workspacePath: root, deep: true })).rejects.toThrow(/h_ceiling_exceeded/);

    const lines = await readAuditLines(root);
    expect(lines[0]).toMatchObject({ operation: "govibe.workspace.scan.deep", decision: "deny", reason: "h_ceiling_exceeded" });
  });

  it("fails closed and audits when the actor is not a safe subject identifier", async () => {
    const root = await workspaceFixture({ rbac: { schema: RBAC_STATE_SCHEMA, assignments: [] } });
    await expect(enforceToolRbac("govibe.workspace.impact", { actor: "not a safe id!", workspacePath: root })).rejects.toThrow(/invalid_subject/);
    const lines = await readAuditLines(root);
    expect(lines[0]).toMatchObject({ decision: "deny", reason: "invalid_subject" });
  });

  it("denies when rbac.json exists but the workspace was never initialized", async () => {
    const root = await workspaceFixture({ rbac: { schema: RBAC_STATE_SCHEMA, assignments: [ownerAssignment()] }, initialized: false });
    await expect(enforceToolRbac("govibe.workspace.impact", { actor: "employee_boss-01", workspacePath: root })).rejects.toThrow(/workspace_not_initialized/);
  });
});

describe("RBAC enforcement — separation of duties (§6.3)", () => {
  it("rejects an approval by the subject who executed the request and records the denial", async () => {
    const root = await workspaceFixture({ rbac: { schema: RBAC_STATE_SCHEMA, assignments: [ownerAssignment()] } });
    await expect(authorizeOperation({ workspacePath: root, operation: "govibe.approval.promotion", actor: "employee_boss-01", context: { requestedBy: "employee_boss-01" } })).rejects.toThrow(/separation_of_duties/);

    const approved = await authorizeOperation({ workspacePath: root, operation: "govibe.approval.promotion", actor: "employee_boss-01", context: { requestedBy: "staff_bob-2026" } });
    expect(approved).toMatchObject({ enforced: true, decision: "allow" });

    const lines = await readAuditLines(root);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ operation: "govibe.approval.promotion", decision: "deny", reason: "separation_of_duties" });
    expect(lines[1]).toMatchObject({ operation: "govibe.approval.promotion", decision: "allow" });
  });
});
