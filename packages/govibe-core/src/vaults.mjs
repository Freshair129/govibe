import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

export const VAULT_TYPES = Object.freeze({
  SHARED: "shared",
  PRIVATE: "private",
});

export const VAULT_LEVELS = Object.freeze({
  PROJECT: "project",
  WORKSPACE: "workspace",
  GLOBAL: "global",
});

export function slugifyProjectName(value) {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("Project name cannot produce an empty vault slug.");
  return slug;
}

function stableId(prefix, ...parts) {
  const digest = createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 24);
  return `${prefix}_${digest}`;
}

export function createWorkspaceVaultBindings({ projectName, workspacePath, agentId = "default-agent", globalPrivateVaultId }) {
  const projectSlug = slugifyProjectName(projectName);
  const projectId = stableId("project", projectSlug);
  const workspaceId = stableId("workspace", projectId, path.resolve(workspacePath));
  const sharedVaultId = stableId("vault", "shared", projectId);
  const workspacePrivateVaultId = stableId("vault", "private", agentId, workspaceId);

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
      materialization_path: `.brain/${projectSlug}`,
    },
    workspace_private_vaults: [{
      vault_id: workspacePrivateVaultId,
      slug: agentId,
      vault_type: VAULT_TYPES.PRIVATE,
      vault_level: VAULT_LEVELS.WORKSPACE,
      role: "episodic_memory",
      project_id: projectId,
      workspace_id: workspaceId,
      agent_id: agentId,
      mode: "read_write",
      materialization_path: `.brain/private/${agentId}`,
    }],
    global_private_vault: {
      vault_id: globalPrivateVaultId ?? `vault_global_${randomUUID()}`,
      vault_type: VAULT_TYPES.PRIVATE,
      vault_level: VAULT_LEVELS.GLOBAL,
      role: "compressed_durable_memory",
      project_id: null,
      workspace_id: null,
      agent_id: agentId,
      mode: "read_write",
      materialization_path: null,
    },
    mounted_shared_vaults: [],
  };
}
