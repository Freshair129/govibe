// TASK-PRD-027 (AUD-05): govibe.docs.resolve and govibe.ingest.code read arbitrary files off
// disk with NO path containment (an absolute path was honored directly; a `..`-escaping
// relative selector joined straight onto the workspace root) and sat outside the RBAC
// operation matrix entirely (operation_not_governed). Both fixes reuse the SAME containment
// helper already used for roadmap reads/writes (scripts/mcp/path-security.mjs) and the SAME
// enforceToolRbac decision point the rest of the stdio tool surface uses
// (scripts/mcp/handlers.mjs), per scripts/mcp/rbac-enforcement.test.mjs's own style.

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { handleToolCall } from "./handlers.mjs";
import { RBAC_STATE_SCHEMA, RbacDenialError } from "./runtime/rbac-enforcement.mjs";

const roots = [];
async function cleanupRoots() {
  for (const root of roots.splice(0).reverse()) await rm(root, { recursive: true, force: true });
}

const WS_ID = "workspace_aaaaaaaaaaaaaaaaaaaaaaaa";
const PROJECT_ID = "project_bbbbbbbbbbbbbbbbbbbbbbbb";

function ownerAssignment(subjectId) {
  return {
    subject_id: subjectId,
    subject_type: "agent",
    role: "owner",
    scope: { project_id: null, workspace_id: WS_ID },
    status: "active",
    granted_by: "bootstrap",
    granted_at: "2026-08-19T00:00:00.000Z",
    approval: null,
  };
}

async function rbacFixture({ assignments = [] } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "govibe-docs-ingest-rbac-"));
  roots.push(root);
  await mkdir(path.join(root, ".govibe"), { recursive: true });
  await writeFile(path.join(root, ".govibe", "config.json"), JSON.stringify({
    schema: "govibe-workspace-config/v1", workspaceId: WS_ID, projectId: PROJECT_ID, projectSlug: "demo", createdAt: "2026-08-19T00:00:00.000Z",
  }));
  await writeFile(path.join(root, ".govibe", "rbac.json"), JSON.stringify({ schema: RBAC_STATE_SCHEMA, assignments }));
  return root;
}

async function readAuditLines(root) {
  const text = await readFile(path.join(root, ".govibe", "rbac-audit.jsonl"), "utf8");
  return text.trim().split("\n").map((line) => JSON.parse(line));
}

// ── Containment: fail-closed on absolute-path escape and traversal, before any read ──────

test("govibe.docs.resolve rejects an absolute path escaping the workspace root before reading it", async () => {
  const outsideDir = await mkdtemp(path.join(os.tmpdir(), "govibe-docs-escape-"));
  roots.push(outsideDir);
  const secretPath = path.join(outsideDir, "secret.md");
  await writeFile(secretPath, "top secret");

  await assert.rejects(
    () => handleToolCall("govibe.docs.resolve", { actor: "agent-x", selectors: [secretPath] }),
    (error) => /PATH_OUTSIDE_ALLOWED_ROOT|outside configured/i.test(error.message ?? error.code ?? "") || error.code === "PATH_OUTSIDE_ALLOWED_ROOT",
  );
  await cleanupRoots();
});

test("govibe.docs.resolve rejects a traversal selector escaping the workspace root before reading it", async () => {
  await assert.rejects(
    () => handleToolCall("govibe.docs.resolve", { actor: "agent-x", selectors: ["../../../../../../etc/passwd"] }),
    (error) => error.code === "PATH_OUTSIDE_ALLOWED_ROOT" || /PATH_OUTSIDE_ALLOWED_ROOT/.test(error.message ?? ""),
  );
});

test("govibe.docs.resolve still resolves a legitimate contained selector", async () => {
  const result = await handleToolCall("govibe.docs.resolve", { actor: "agent-x", selectors: ["package.json"] });
  assert.match(result.structuredContent.packet[0].content, /"name"/);
});

test("govibe.ingest.code rejects an absolute repoPath escaping the workspace root before reading it", async () => {
  const outsideDir = await mkdtemp(path.join(os.tmpdir(), "govibe-ingest-escape-"));
  roots.push(outsideDir);
  const secretPath = path.join(outsideDir, "secret.md");
  await writeFile(secretPath, "top secret");

  await assert.rejects(
    () => handleToolCall("govibe.ingest.code", { actor: "agent-x", repoPath: secretPath }),
    (error) => error.code === "PATH_OUTSIDE_ALLOWED_ROOT",
  );
  await cleanupRoots();
});

test("govibe.ingest.code rejects a traversal repoPath escaping the workspace root before reading it", async () => {
  await assert.rejects(
    () => handleToolCall("govibe.ingest.code", { actor: "agent-x", repoPath: "../../../../../../etc/passwd" }),
    (error) => error.code === "PATH_OUTSIDE_ALLOWED_ROOT",
  );
});

test("govibe.ingest.code still ingests inline content without touching the filesystem", async () => {
  const result = await handleToolCall("govibe.ingest.code", { actor: "agent-x", content: "# Title\nBody", repo: "fixture" });
  assert.ok(result.structuredContent.atomCount > 0);
});

// ── RBAC: both tools are now in the operation matrix ──────────────────────────────────────

test("govibe.docs.resolve denies an unauthorized actor in an RBAC-enabled workspace, audited", async () => {
  const root = await rbacFixture({ assignments: [] });
  await assert.rejects(
    () => handleToolCall("govibe.docs.resolve", { actor: "intruder", workspacePath: root, selectors: ["package.json"] }),
    RbacDenialError,
  );
  const lines = await readAuditLines(root);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].operation, "govibe.docs.resolve");
  assert.equal(lines[0].decision, "deny");
  await cleanupRoots();
});

test("govibe.docs.resolve allows an authorized actor in an RBAC-enabled workspace, audited", async () => {
  const root = await rbacFixture({ assignments: [ownerAssignment("trusted")] });
  const result = await handleToolCall("govibe.docs.resolve", { actor: "trusted", workspacePath: root, selectors: ["package.json"] });
  assert.ok(result.structuredContent.packet.length === 1);
  const lines = await readAuditLines(root);
  assert.equal(lines[0].decision, "allow");
  await cleanupRoots();
});

test("govibe.ingest.code denies an unauthorized actor in an RBAC-enabled workspace, audited", async () => {
  const root = await rbacFixture({ assignments: [] });
  await assert.rejects(
    () => handleToolCall("govibe.ingest.code", { actor: "intruder", workspacePath: root, content: "# Title\nBody" }),
    RbacDenialError,
  );
  const lines = await readAuditLines(root);
  assert.equal(lines[0].operation, "govibe.ingest.code");
  assert.equal(lines[0].decision, "deny");
  await cleanupRoots();
});

test("govibe.ingest.code allows an authorized actor in an RBAC-enabled workspace, audited", async () => {
  const root = await rbacFixture({ assignments: [ownerAssignment("trusted")] });
  const result = await handleToolCall("govibe.ingest.code", { actor: "trusted", workspacePath: root, content: "# Title\nBody" });
  assert.ok(result.structuredContent.atomCount > 0);
  const lines = await readAuditLines(root);
  assert.equal(lines[0].decision, "allow");
  await cleanupRoots();
});

test("a workspace without .govibe/rbac.json keeps the pre-RBAC posture for both tools", async () => {
  const result = await handleToolCall("govibe.docs.resolve", { actor: "anyone", selectors: ["package.json"] });
  assert.ok(result.structuredContent.packet.length === 1);
});
