import { createHash } from "node:crypto";
import path from "node:path";

export const VAULT_TYPES = Object.freeze({ SHARED: "shared", PRIVATE: "private" });
export const VAULT_LEVELS = Object.freeze({ PROJECT: "project", WORKSPACE: "workspace", GLOBAL: "global" });
export const VAULT_VISIBILITY = Object.freeze({
  PRINCIPAL_PRIVATE: "principal_private",
  TENANT_PRIVATE: "tenant_private",
  BUSINESS_SHARED: "business_shared",
  PROJECT_SHARED: "project_shared",
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

function normalizeScopeId(value, fieldName) {
  if (value == null || value === "") return null;
  const normalized = String(value).trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,255}$/.test(normalized) || normalized.includes("..")) {
    throw new Error(`${fieldName} must be a safe stable identifier.`);
  }
  return normalized;
}

function stableId(prefix, ...parts) {
  const digest = createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 24);
  return `${prefix}_${digest}`;
}

/**
 * Create the canonical three-vault binding set for a workspace.
 *
 * Backward compatibility: when tenant/principal dimensions are absent, ids are
 * minted exactly as v1 did. In multi-tenant mode Workspace Private is scoped by
 * Tenant × Principal × Agent × Workspace, while Global Private can be tenant-
 * agent or principal-specific without inventing a fourth vault type.
 */
export function createWorkspaceVaultBindings({
  projectName,
  workspacePath,
  agentId = "default-agent",
  globalPrivateVaultId,
  tenantId = null,
  businessId = null,
  principalId = null,
  globalPrivateScope = null,
  policyVersion = "1",
}) {
  const projectSlug = slugifyProjectName(projectName);
  const safeAgentId = normalizeAgentId(agentId);
  const safeTenantId = normalizeScopeId(tenantId, "tenantId");
  const safeBusinessId = normalizeScopeId(businessId, "businessId");
  const safePrincipalId = normalizeScopeId(principalId, "principalId");

  if (safePrincipalId && !safeTenantId) {
    throw new Error("principalId requires tenantId for multi-tenant vault isolation.");
  }
  if (safePrincipalId === safeAgentId) {
    throw new Error("principalId must not substitute for agentId.");
  }

  const projectId = stableId("project", projectSlug);
  const workspaceId = stableId("workspace", projectId, path.resolve(workspacePath));
  const sharedVaultId = safeTenantId || safeBusinessId
    ? stableId("vault", "shared", projectId, safeTenantId ?? "", safeBusinessId ?? "")
    : stableId("vault", "shared", projectId);

  const workspacePrivateVaultId = safeTenantId || safePrincipalId
    ? stableId("vault", "private", safeAgentId, workspaceId, safeTenantId ?? "", safePrincipalId ?? "")
    : stableId("vault", "private", safeAgentId, workspaceId);

  const resolvedGlobalScope = globalPrivateScope ?? (safePrincipalId ? "principal" : safeTenantId ? "tenant" : "legacy");
  if (!["legacy", "tenant", "principal"].includes(resolvedGlobalScope)) {
    throw new Error('globalPrivateScope must be "legacy", "tenant", or "principal".');
  }
  if (resolvedGlobalScope !== "legacy" && !safeTenantId) {
    throw new Error(`${resolvedGlobalScope} Global Private scope requires tenantId.`);
  }
  if (resolvedGlobalScope === "principal" && !safePrincipalId) {
    throw new Error("principal Global Private scope requires principalId.");
  }

  const computedGlobalPrivateVaultId = resolvedGlobalScope === "principal"
    ? stableId("vault", "private", "global", safeAgentId, safeTenantId, safePrincipalId)
    : resolvedGlobalScope === "tenant"
      ? stableId("vault", "private", "global", safeAgentId, safeTenantId)
      : stableId("vault", "private", "global", safeAgentId);
  const resolvedGlobalPrivateVaultId = globalPrivateVaultId ?? computedGlobalPrivateVaultId;

  return {
    schema: "govibe-workspace-vault-bindings/v1",
    project_id: projectId,
    workspace_id: workspaceId,
    tenant_id: safeTenantId,
    business_id: safeBusinessId,
    principal_id: safePrincipalId,
    policy_version: String(policyVersion),
    primary_shared_vault: {
      vault_id: sharedVaultId,
      slug: projectSlug,
      vault_type: VAULT_TYPES.SHARED,
      vault_level: VAULT_LEVELS.PROJECT,
      role: safeBusinessId ? "business_source_of_truth" : "project_source_of_truth",
      project_id: projectId,
      workspace_id: null,
      agent_id: null,
      tenant_id: safeTenantId,
      business_id: safeBusinessId,
      principal_id: null,
      visibility: safeBusinessId ? VAULT_VISIBILITY.BUSINESS_SHARED : VAULT_VISIBILITY.PROJECT_SHARED,
      policy_version: String(policyVersion),
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
      tenant_id: safeTenantId,
      business_id: safeBusinessId,
      principal_id: safePrincipalId,
      visibility: safePrincipalId ? VAULT_VISIBILITY.PRINCIPAL_PRIVATE : VAULT_VISIBILITY.TENANT_PRIVATE,
      policy_version: String(policyVersion),
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
      tenant_id: resolvedGlobalScope === "legacy" ? null : safeTenantId,
      business_id: safeBusinessId,
      principal_id: resolvedGlobalScope === "principal" ? safePrincipalId : null,
      visibility: resolvedGlobalScope === "principal"
        ? VAULT_VISIBILITY.PRINCIPAL_PRIVATE
        : VAULT_VISIBILITY.TENANT_PRIVATE,
      policy_version: String(policyVersion),
      mode: "read_write",
      status: "active",
      materialization_path: null,
    },
    mounted_shared_vaults: [],
  };
}
