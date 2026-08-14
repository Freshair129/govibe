// transport/handlers/vault-handlers: workspace/vault registration, status,
// mounting, and Issue #136 authorized vault-set resolution.
import { workspaceRef, vaultRegistryRef } from "../../contracts/refs.mjs";
import { ValidationError } from "../../contracts/errors.mjs";
import { assertVaultScope } from "../../contracts/vault-scope-guard.mjs";

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${label} is required.`);
  }
  return value.trim();
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readContext(args) {
  const source = args.access_context && typeof args.access_context === "object" ? args.access_context : args;
  return {
    tenantId: requireString(source.tenantId ?? source.tenant_id, "tenant_id"),
    businessId: optionalString(source.businessId ?? source.business_id),
    principalId: requireString(source.principalId ?? source.principal_id, "principal_id"),
    agentId: requireString(source.agentId ?? source.agent_id, "agent_id"),
    instanceId: optionalString(source.instanceId ?? source.instance_id),
    projectId: requireString(source.projectId ?? source.project_id, "project_id"),
    workspaceId: requireString(source.workspaceId ?? source.workspace_id, "workspace_id"),
    threadId: optionalString(source.threadId ?? source.thread_id),
    sessionId: optionalString(source.sessionId ?? source.session_id),
    policyVersion: String(source.policyVersion ?? source.policy_version ?? "1"),
  };
}

function readAuthorization(args) {
  const source = args.authorization && typeof args.authorization === "object" ? args.authorization : {};
  return {
    // Multi-tenant resolution is intentionally fail-closed: the identity /
    // policy layer must affirm current membership on every turn. Omission is
    // not interpreted as authorization.
    membershipActive: source.membershipActive ?? source.membership_active ?? false,
    allowed: source.allowed ?? true,
    allowGlobalPrivate: source.allowGlobalPrivate ?? source.allow_global_private ?? true,
    allowTenantGlobalPrivate: source.allowTenantGlobalPrivate ?? source.allow_tenant_global_private ?? true,
    allowShared: source.allowShared ?? source.allow_shared ?? true,
    read: source.read ?? true,
    writePrivate: source.writePrivate ?? source.write_private ?? true,
    writeShared: source.writeShared ?? source.write_shared ?? false,
  };
}

export function createVaultHandlers({ vaultRegistry, journal }) {
  return {
    async msp_workspace_register(args = {}) {
      const actor = requireString(args.actor, "actor");
      const workspaceId = requireString(args.workspace_id, "workspace_id");
      requireString(args.workspace_path, "workspace_path");
      const projectId = optionalString(args.project_id);

      vaultRegistry.provisionWorkspacePrivateVault(workspaceId, { projectId });
      if (projectId) vaultRegistry.provisionSharedVault(projectId);

      const workspace_ref = workspaceRef(workspaceId);
      const registry_ref = vaultRegistryRef(workspaceId);
      journal.append({
        actor,
        toolName: "msp_workspace_register",
        ref: workspace_ref,
        workspaceId,
        payload: {
          workspace_id: workspaceId,
          project_id: projectId,
          idempotency_key: args.idempotency_key ?? null,
          run_id: args.run_id ?? null,
        },
        policyDecision: "allow",
      });
      return { workspace_ref, registry_ref };
    },

    async msp_vault_status(args = {}) {
      const actor = requireString(args.actor, "actor");
      const workspaceId = optionalString(args.workspace_id);
      const agentId = optionalString(args.agent_id);
      const { vaults } = vaultRegistry.getVaultStatus({ workspaceId, agentId });
      const workspace_ref = workspaceId ? workspaceRef(workspaceId) : null;
      const registry_ref = workspaceId ? vaultRegistryRef(workspaceId) : null;

      journal.append({
        actor,
        toolName: "msp_vault_status",
        ref: workspace_ref,
        workspaceId,
        payload: { workspace_id: workspaceId, agent_id: agentId, vault_count: vaults.length },
        policyDecision: "allow",
      });

      return {
        workspace_ref,
        registry_ref,
        vaults: vaults.map((vault) => ({
          vault_id: vault.vault_id,
          vault_ref: vault.vault_ref,
          vault_type: vault.vault_type,
          project_id: vault.project_id,
          workspace_id: vault.workspace_id,
          agent_id: vault.agent_id,
          tenant_id: vault.tenant_id,
          business_id: vault.business_id,
          principal_id: vault.principal_id,
          visibility: vault.visibility,
          policy_version: vault.policy_version,
          status: vault.status,
        })),
        policy_decision: "allow",
        diagnostics: [],
      };
    },

    /**
     * Issue #136 public runtime contract. Application Identity/Policy supplies
     * current authorization facts on every call; MSP resolves and enforces the
     * canonical vault bindings. thread/session/instance are provenance only and
     * never participate in vault ownership ids.
     */
    async msp_vault_resolve(args = {}) {
      const actor = requireString(args.actor, "actor");
      const context = readContext(args);
      const authorization = readAuthorization(args);
      const resolved = vaultRegistry.resolveAuthorizedVaultSet(context, authorization);

      journal.append({
        actor,
        toolName: "msp_vault_resolve",
        ref: workspaceRef(context.workspaceId),
        workspaceId: context.workspaceId,
        payload: {
          tenant_id: context.tenantId,
          business_id: context.businessId,
          principal_id: context.principalId,
          agent_id: context.agentId,
          project_id: context.projectId,
          thread_id: context.threadId,
          session_id: context.sessionId,
          instance_id: context.instanceId,
          policy_version: context.policyVersion,
          resolved_vault_count:
            1 + resolved.globalPrivateVaultIds.length + resolved.sharedVaultIds.length,
        },
        policyDecision: "allow",
      });

      return resolved;
    },

    async msp_vault_mount(args = {}) {
      const actor = requireString(args.actor, "actor");
      const workspaceId = requireString(args.workspace_id, "workspace_id");
      requireString(args.workspace_path, "workspace_path");
      const vaultId = requireString(args.vault_id, "vault_id");
      const mountAlias = requireString(args.mount_alias, "mount_alias");
      const accessMode = args.access_mode ?? "read";
      const reason = requireString(args.reason, "reason");

      const knownVault = vaultRegistry.getVaultById(vaultId);
      if (knownVault) {
        assertVaultScope(
          vaultRegistry.isVaultAccessibleTo(vaultId, {
            workspaceId,
            agentId: optionalString(args.agent_id),
            tenantId: optionalString(args.tenant_id),
            businessId: optionalString(args.business_id),
            principalId: optionalString(args.principal_id),
            // Legacy msp_vault_mount has no membership field, so keep its
            // existing behavior. Scoped vaults still fail closed because the
            // required tenant/principal/agent dimensions must match first.
            membershipActive: args.membership_active ?? true,
          }),
          `vault_scope_denied: vault_id "${vaultId}" is outside the caller's current authorized scope.`,
        );
      }

      const { mount, vault } = vaultRegistry.mountVault({ vaultId, workspaceId, mountAlias, accessMode });
      journal.append({
        actor,
        toolName: "msp_vault_mount",
        ref: mount.mount_ref,
        workspaceId,
        payload: { vault_id: vaultId, mount_alias: mountAlias, access_mode: accessMode, reason },
        policyDecision: "allow",
      });
      return {
        mount_ref: mount.mount_ref,
        vault_ref: vault.vault_ref,
        policy_decision: "allow",
        mounted: true,
      };
    },
  };
}
