// domain/vault-registry: canonical Shared / Workspace-Private / Global-Private
// registry and authorization authority. Issue #136 extends binding identity
// with optional tenant/principal dimensions without adding a vault tier.
import { MspRuntimeError } from "./errors.mjs";
import { mintRef, stableId } from "./ids.mjs";

function rowToVault(row) {
  if (!row) return null;
  return {
    vault_id: row.vault_id,
    vault_ref: mintRef("vault", row.vault_id),
    vault_type: row.vault_type,
    project_id: row.project_id,
    workspace_id: row.workspace_id,
    agent_id: row.agent_id,
    role: row.role ?? null,
    tenant_id: row.tenant_id ?? null,
    business_id: row.business_id ?? null,
    principal_id: row.principal_id ?? null,
    visibility: row.visibility ?? null,
    policy_version: row.policy_version ?? null,
    status: row.status,
    created_at: row.created_at,
  };
}

function rowToMount(row) {
  if (!row) return null;
  return {
    mount_id: row.mount_id,
    mount_ref: mintRef("vault-mount", row.mount_id),
    vault_id: row.vault_id,
    vault_ref: mintRef("vault", row.vault_id),
    workspace_id: row.workspace_id,
    mount_alias: row.mount_alias,
    access_mode: row.access_mode,
    status: row.status,
    mounted_at: row.mounted_at,
  };
}

function assertPrincipalAgentSeparation(agentId, principalId) {
  if (principalId && principalId === agentId) {
    throw new MspRuntimeError("principal_id must never substitute for agent_id.", "invalid_request");
  }
}

export class VaultRegistry {
  #db;
  #selectShared;
  #selectWorkspacePrivate;
  #selectGlobalPrivate;
  #selectById;
  #insertVault;
  #backfillProjectId;
  #selectMount;
  #selectAnyMount;
  #insertMount;

  constructor(db) {
    this.#db = db;
    this.#selectShared = db.prepare("SELECT * FROM vaults WHERE vault_type = 'shared' AND project_id = ? AND tenant_id IS NULL AND business_id IS NULL LIMIT 1");
    this.#selectWorkspacePrivate = db.prepare("SELECT * FROM vaults WHERE vault_type = 'workspace_private' AND workspace_id = ? AND tenant_id IS NULL AND principal_id IS NULL LIMIT 1");
    this.#selectGlobalPrivate = db.prepare("SELECT * FROM vaults WHERE vault_type = 'global_private' AND agent_id = ? AND tenant_id IS NULL AND principal_id IS NULL LIMIT 1");
    this.#selectById = db.prepare("SELECT * FROM vaults WHERE vault_id = ?");
    this.#insertVault = db.prepare(`
      INSERT INTO vaults (
        vault_id, vault_type, project_id, workspace_id, agent_id, role, status, created_at,
        tenant_id, business_id, principal_id, visibility, policy_version
      ) VALUES (
        @vault_id, @vault_type, @project_id, @workspace_id, @agent_id, @role, 'active', @created_at,
        @tenant_id, @business_id, @principal_id, @visibility, @policy_version
      )
    `);
    this.#backfillProjectId = db.prepare(
      "UPDATE vaults SET project_id = @project_id WHERE vault_id = @vault_id AND project_id IS NULL",
    );
    this.#selectMount = db.prepare("SELECT * FROM vault_mounts WHERE vault_id = ? AND workspace_id = ? AND mount_alias = ?");
    this.#selectAnyMount = db.prepare(
      "SELECT 1 FROM vault_mounts WHERE vault_id = ? AND workspace_id = ? AND status = 'mounted' LIMIT 1",
    );
    this.#insertMount = db.prepare(`
      INSERT INTO vault_mounts (mount_id, vault_id, workspace_id, mount_alias, access_mode, status, mounted_at)
      VALUES (@mount_id, @vault_id, @workspace_id, @mount_alias, @access_mode, 'mounted', @mounted_at)
    `);
  }

  #insertAndRead(values) {
    this.#insertVault.run({
      tenant_id: null,
      business_id: null,
      principal_id: null,
      visibility: null,
      policy_version: null,
      ...values,
      created_at: new Date().toISOString(),
    });
    return rowToVault(this.#selectById.get(values.vault_id));
  }

  provisionSharedVault(projectId) {
    if (!projectId) throw new TypeError("provisionSharedVault requires projectId.");
    const run = this.#db.transaction(() => {
      const existing = this.#selectShared.get(projectId);
      if (existing) return rowToVault(existing);
      return this.#insertAndRead({
        vault_id: stableId("vault", "shared", projectId),
        vault_type: "shared",
        project_id: projectId,
        workspace_id: null,
        agent_id: null,
        role: null,
        visibility: "project_shared",
        policy_version: "1",
      });
    });
    return run();
  }

  provisionWorkspacePrivateVault(workspaceId, { projectId = null } = {}) {
    if (!workspaceId) throw new TypeError("provisionWorkspacePrivateVault requires workspaceId.");
    const run = this.#db.transaction(() => {
      const existing = this.#selectWorkspacePrivate.get(workspaceId);
      if (existing) {
        if (projectId && !existing.project_id) {
          this.#backfillProjectId.run({ vault_id: existing.vault_id, project_id: projectId });
          return rowToVault(this.#selectById.get(existing.vault_id));
        }
        return rowToVault(existing);
      }
      return this.#insertAndRead({
        vault_id: stableId("vault", "workspace-private", workspaceId),
        vault_type: "workspace_private",
        project_id: projectId,
        workspace_id: workspaceId,
        agent_id: null,
        role: null,
        visibility: "tenant_private",
        policy_version: "1",
      });
    });
    return run();
  }

  provisionGlobalPrivateVault(agentId, { role = null } = {}) {
    if (!agentId) throw new TypeError("provisionGlobalPrivateVault requires agentId.");
    const run = this.#db.transaction(() => {
      const existing = this.#selectGlobalPrivate.get(agentId);
      if (existing) return rowToVault(existing);
      return this.#insertAndRead({
        vault_id: stableId("vault", "global-private", agentId),
        vault_type: "global_private",
        project_id: null,
        workspace_id: null,
        agent_id: agentId,
        role: role ?? agentId,
        visibility: "tenant_private",
        policy_version: "1",
      });
    });
    return run();
  }

  /** Principal-scoped Workspace Private identity: Tenant × Principal × Agent × Workspace. */
  provisionScopedWorkspacePrivateVault({ workspaceId, projectId = null, agentId, tenantId, businessId = null, principalId, policyVersion = "1" }) {
    if (!workspaceId || !agentId || !tenantId || !principalId) {
      throw new TypeError("Scoped Workspace Private requires workspaceId, agentId, tenantId, and principalId.");
    }
    assertPrincipalAgentSeparation(agentId, principalId);
    const vaultId = stableId("vault", "workspace-private", agentId, workspaceId, tenantId, principalId);
    const existing = this.#selectById.get(vaultId);
    if (existing) return rowToVault(existing);
    return this.#insertAndRead({
      vault_id: vaultId,
      vault_type: "workspace_private",
      project_id: projectId,
      workspace_id: workspaceId,
      agent_id: agentId,
      role: "episodic_memory",
      tenant_id: tenantId,
      business_id: businessId,
      principal_id: principalId,
      visibility: "principal_private",
      policy_version: String(policyVersion),
    });
  }

  /** Global Private remains private/global; only its binding key changes. */
  provisionScopedGlobalPrivateVault({ agentId, tenantId, principalId = null, businessId = null, role = null, policyVersion = "1" }) {
    if (!agentId || !tenantId) throw new TypeError("Scoped Global Private requires agentId and tenantId.");
    assertPrincipalAgentSeparation(agentId, principalId);
    const vaultId = principalId
      ? stableId("vault", "global-private", agentId, tenantId, principalId)
      : stableId("vault", "global-private", agentId, tenantId);
    const existing = this.#selectById.get(vaultId);
    if (existing) return rowToVault(existing);
    return this.#insertAndRead({
      vault_id: vaultId,
      vault_type: "global_private",
      project_id: null,
      workspace_id: null,
      agent_id: agentId,
      role: role ?? agentId,
      tenant_id: tenantId,
      business_id: businessId,
      principal_id: principalId,
      visibility: principalId ? "principal_private" : "tenant_private",
      policy_version: String(policyVersion),
    });
  }

  provisionScopedSharedVault({ projectId, tenantId = null, businessId = null, policyVersion = "1" }) {
    if (!projectId) throw new TypeError("Scoped Shared requires projectId.");
    const vaultId = tenantId || businessId
      ? stableId("vault", "shared", projectId, tenantId ?? "", businessId ?? "")
      : stableId("vault", "shared", projectId);
    const existing = this.#selectById.get(vaultId);
    if (existing) return rowToVault(existing);
    return this.#insertAndRead({
      vault_id: vaultId,
      vault_type: "shared",
      project_id: projectId,
      workspace_id: null,
      agent_id: null,
      role: businessId ? "business_source_of_truth" : "project_source_of_truth",
      tenant_id: tenantId,
      business_id: businessId,
      principal_id: null,
      visibility: businessId ? "business_shared" : "project_shared",
      policy_version: String(policyVersion),
    });
  }

  /**
   * Resolve an authorized vault set per turn. Authorization facts are inputs
   * from the application identity/policy layer; they are never cached here.
   */
  resolveAuthorizedVaultSet(context, authorization = {}) {
    const {
      tenantId, businessId = null, principalId, agentId, projectId, workspaceId,
      policyVersion = "1",
    } = context ?? {};
    if (!tenantId || !principalId || !agentId || !projectId || !workspaceId) {
      throw new MspRuntimeError(
        "Multi-tenant vault resolution requires tenantId, principalId, agentId, projectId, and workspaceId.",
        "invalid_request",
      );
    }
    assertPrincipalAgentSeparation(agentId, principalId);
    if (authorization.membershipActive === false || authorization.allowed === false) {
      throw new MspRuntimeError("Vault access denied by current membership/policy facts.", "vault_scope_denied");
    }

    const workspacePrivate = this.provisionScopedWorkspacePrivateVault({
      workspaceId, projectId, agentId, tenantId, businessId, principalId, policyVersion,
    });
    const globalPrincipal = this.provisionScopedGlobalPrivateVault({
      agentId, tenantId, businessId, principalId, policyVersion,
    });
    const globalTenant = this.provisionScopedGlobalPrivateVault({
      agentId, tenantId, businessId, principalId: null, policyVersion,
    });
    const shared = this.provisionScopedSharedVault({ projectId, tenantId, businessId, policyVersion });

    const allowGlobal = authorization.allowGlobalPrivate !== false;
    const allowTenantGlobal = authorization.allowTenantGlobalPrivate !== false;
    const allowShared = authorization.allowShared !== false;
    return {
      workspacePrivateVaultId: workspacePrivate.vault_id,
      globalPrivateVaultIds: allowGlobal
        ? [globalPrincipal.vault_id, ...(allowTenantGlobal ? [globalTenant.vault_id] : [])]
        : [],
      sharedVaultIds: allowShared ? [shared.vault_id] : [],
      permissions: {
        read: authorization.read !== false,
        writePrivate: authorization.writePrivate !== false,
        writeShared: authorization.writeShared === true,
        policyVersion: String(policyVersion),
      },
    };
  }

  getVaultStatus({ workspaceId = null, agentId = null } = {}) {
    const vaults = [];
    if (workspaceId) {
      const workspaceVault = this.provisionWorkspacePrivateVault(workspaceId);
      vaults.push(workspaceVault);
      if (workspaceVault.project_id) vaults.push(this.provisionSharedVault(workspaceVault.project_id));
    }
    if (agentId) vaults.push(this.provisionGlobalPrivateVault(agentId));
    return { vaults };
  }

  getVaultById(vaultId) {
    return rowToVault(this.#selectById.get(vaultId));
  }

  isVaultAccessibleTo(vaultId, { workspaceId = null, agentId = null, tenantId = null, businessId = null, principalId = null } = {}) {
    const vault = this.#selectById.get(vaultId);
    if (!vault || vault.status === "revoked" || vault.status === "archived") return false;

    // A mount never widens tenant/principal scope. First prove the binding scope.
    if (vault.tenant_id && vault.tenant_id !== tenantId) return false;
    if (vault.principal_id && vault.principal_id !== principalId) return false;
    if (vault.business_id && businessId && vault.business_id !== businessId) return false;

    if (workspaceId && this.#selectAnyMount.get(vaultId, workspaceId)) return true;

    if (vault.vault_type === "workspace_private") {
      if (!workspaceId || vault.workspace_id !== workspaceId) return false;
      if (vault.agent_id && vault.agent_id !== agentId) return false;
      return true;
    }
    if (vault.vault_type === "global_private") {
      return Boolean(agentId) && vault.agent_id === agentId;
    }
    if (vault.vault_type === "shared") {
      if (vault.principal_id) return false;
      if (vault.project_id == null) return false;
      if (tenantId && vault.tenant_id && vault.tenant_id !== tenantId) return false;
      return Boolean(workspaceId);
    }
    return false;
  }

  mountVault({ vaultId, workspaceId, mountAlias, accessMode }) {
    if (!vaultId) throw new TypeError("mountVault requires vaultId.");
    if (!workspaceId) throw new TypeError("mountVault requires workspaceId.");
    if (!mountAlias) throw new TypeError("mountVault requires mountAlias.");
    if (!["read", "read_write"].includes(accessMode)) {
      throw new MspRuntimeError(
        `mountVault requires accessMode "read" or "read_write", got "${accessMode}".`,
        "invalid_request",
      );
    }
    const vault = this.getVaultById(vaultId);
    if (!vault) throw new MspRuntimeError(`mountVault: unknown vault_id "${vaultId}".`, "not_found");

    const run = this.#db.transaction(() => {
      const existing = this.#selectMount.get(vaultId, workspaceId, mountAlias);
      if (existing) return rowToMount(existing);
      const mountId = stableId("vault-mount", vaultId, workspaceId, mountAlias);
      this.#insertMount.run({
        mount_id: mountId,
        vault_id: vaultId,
        workspace_id: workspaceId,
        mount_alias: mountAlias,
        access_mode: accessMode,
        mounted_at: new Date().toISOString(),
      });
      return rowToMount(this.#selectMount.get(vaultId, workspaceId, mountAlias));
    });
    return { mount: run(), vault };
  }
}
