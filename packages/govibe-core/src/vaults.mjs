import { createHash } from "node:crypto";
import path from "node:path";

export const VAULT_TYPES = Object.freeze({ SHARED: "shared", PRIVATE: "private" });
export const VAULT_LEVELS = Object.freeze({ PROJECT: "project", WORKSPACE: "workspace", GLOBAL: "global" });

export function slugifyProjectName(value) {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("Project name cannot produce an empty vault slug.");
  return slug;
}

export function normalizeAgentId(value) {
  const agentId = String(value ?? "").trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(agentId) || agentId.includes("..")) {
    throw new Error("Agent ID must be a safe stable identifier.");
  }
  // SPEC-Workspace-System §3.3 rule 4: employee_/staff_ identify humans and MUST NOT appear in
  // vault binding records; agent_id is the software-agent namespace.
  if (/^(employee|staff)_/i.test(agentId)) {
    throw new Error("Personnel IDs (employee_/staff_) cannot be used as agent identifiers.");
  }
  return agentId;
}

function stableId(prefix, ...parts) {
  const digest = createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 24);
  return `${prefix}_${digest}`;
}

export function createWorkspaceVaultBindings({ projectName, workspacePath, agentId = "default-agent", globalPrivateVaultId }) {
  const projectSlug = slugifyProjectName(projectName);
  const safeAgentId = normalizeAgentId(agentId);
  const projectId = stableId("project", projectSlug);
  const workspaceId = stableId("workspace", projectId, path.resolve(workspacePath));
  const sharedVaultId = stableId("vault", "shared", projectId);
  const workspacePrivateVaultId = stableId("vault", "private", safeAgentId, workspaceId);
  const resolvedGlobalPrivateVaultId = globalPrivateVaultId ?? stableId("vault", "private", "global", safeAgentId);

  return {
    schema: "govibe-workspace-vault-bindings/v1",
    project_id: projectId,
    workspace_id: workspaceId,
    primary_shared_vault: {
      vault_id: sharedVaultId,
      slug: projectSlug,
      vault_type: VAULT_TYPES.SHARED,
      vault_level: VAULT_LEVELS.PROJECT,
      role: "project_source_of_truth",
      project_id: projectId,
      workspace_id: null,
      agent_id: null,
      mode: "read_write",
      status: "active",
      materialization_path: `.brain/${projectSlug}`,
    },
    workspace_private_vaults: [{
      vault_id: workspacePrivateVaultId,
      slug: safeAgentId,
      vault_type: VAULT_TYPES.PRIVATE,
      vault_level: VAULT_LEVELS.WORKSPACE,
      role: "episodic_memory",
      project_id: projectId,
      workspace_id: workspaceId,
      agent_id: safeAgentId,
      mode: "read_write",
      status: "active",
      materialization_path: `.brain/private/${safeAgentId}`,
    }],
    global_private_vault: {
      vault_id: resolvedGlobalPrivateVaultId,
      slug: safeAgentId,
      vault_type: VAULT_TYPES.PRIVATE,
      vault_level: VAULT_LEVELS.GLOBAL,
      role: "compressed_durable_memory",
      project_id: null,
      workspace_id: null,
      agent_id: safeAgentId,
      mode: "read_write",
      status: "active",
      materialization_path: null,
    },
    mounted_shared_vaults: [],
  };
}
