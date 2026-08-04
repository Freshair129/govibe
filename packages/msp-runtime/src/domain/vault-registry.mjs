// domain/vault-registry: lazy, idempotent Shared / Workspace-Private /
// Global-Private vault provisioning and mount tracking (WP-13 Phase 2,
// Bounded Scope item 1). Depends only on db/ (an already-open connection
// passed in by the composition root) and other domain/ modules
// (domain/ids.mjs, domain/errors.mjs) -- never contracts/ or transport/,
// per ADR-027's layering rule.
//
// Id minting reuses domain/ids.mjs's stableId/mintRef, following the same
// stableId(prefix, ...parts) call shape packages/govibe-core/src/vaults.mjs
// uses for its own local preview ids (e.g. stableId("vault", "shared",
// projectId)). The two implementations are not byte-identical: vaults.mjs
// joins hash parts with a NUL separator and uses a two-value vault_type
// (shared/private) plus a separate vault_level, while WP-13's schema (see
// 0002_phase2.sql) collapses type+level into a single three-value
// vault_type enum (shared/workspace_private/global_private) and
// domain/ids.mjs's stableId joins parts with a plain space -- a pre-existing
// mismatch already present in WP-12's domain/ids.mjs (its own header
// comment claims NUL-joining, its implementation does not); that is not
// this packet's file to fix. This module reuses the *mechanism*
// (stableId/mintRef) exactly as instructed; it does not claim byte-for-byte
// id parity with vaults.mjs's preview ids.
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

export class VaultRegistry {
  #db;
  #selectShared;
  #selectWorkspacePrivate;
  #selectGlobalPrivate;
  #selectById;
  #insertVault;
  #backfillProjectId;
  #selectMount;
  #insertMount;

  constructor(db) {
    this.#db = db;
    this.#selectShared = db.prepare("SELECT * FROM vaults WHERE vault_type = 'shared' AND project_id = ?");
    this.#selectWorkspacePrivate = db.prepare("SELECT * FROM vaults WHERE vault_type = 'workspace_private' AND workspace_id = ?");
    this.#selectGlobalPrivate = db.prepare("SELECT * FROM vaults WHERE vault_type = 'global_private' AND agent_id = ?");
    this.#selectById = db.prepare("SELECT * FROM vaults WHERE vault_id = ?");
    this.#insertVault = db.prepare(`
      INSERT INTO vaults (vault_id, vault_type, project_id, workspace_id, agent_id, status, created_at)
      VALUES (@vault_id, @vault_type, @project_id, @workspace_id, @agent_id, 'active', @created_at)
    `);
    this.#backfillProjectId = db.prepare(
      "UPDATE vaults SET project_id = @project_id WHERE vault_id = @vault_id AND project_id IS NULL",
    );
    this.#selectMount = db.prepare("SELECT * FROM vault_mounts WHERE vault_id = ? AND workspace_id = ? AND mount_alias = ?");
    this.#insertMount = db.prepare(`
      INSERT INTO vault_mounts (mount_id, vault_id, workspace_id, mount_alias, access_mode, status, mounted_at)
      VALUES (@mount_id, @vault_id, @workspace_id, @mount_alias, @access_mode, 'mounted', @mounted_at)
    `);
  }

  /**
   * Lazy, idempotent by project_id. Per WP-13 Bounded Scope item 1, a shared
   * vault is provisioned for identity completeness only -- it is never a
   * write target for promotion (msp_memory_promote/msp_knowledge_promote
   * always deny shared-scope writes; see transport/handlers/lifecycle-handlers.mjs).
   */
  provisionSharedVault(projectId) {
    if (!projectId) throw new TypeError("provisionSharedVault requires projectId.");
    const run = this.#db.transaction(() => {
      const existing = this.#selectShared.get(projectId);
      if (existing) return rowToVault(existing);
      const vaultId = stableId("vault", "shared", projectId);
      this.#insertVault.run({
        vault_id: vaultId,
        vault_type: "shared",
        project_id: projectId,
        workspace_id: null,
        agent_id: null,
        created_at: new Date().toISOString(),
      });
      return rowToVault(this.#selectById.get(vaultId));
    });
    return run();
  }

  /**
   * Lazy, idempotent by workspace_id. If the vault already exists without a
   * known project_id and one is supplied now, backfills it (registration
   * can happen after an earlier vault-status-only reference).
   */
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
      const vaultId = stableId("vault", "workspace-private", workspaceId);
      this.#insertVault.run({
        vault_id: vaultId,
        vault_type: "workspace_private",
        project_id: projectId,
        workspace_id: workspaceId,
        agent_id: null,
        created_at: new Date().toISOString(),
      });
      return rowToVault(this.#selectById.get(vaultId));
    });
    return run();
  }

  /** Lazy, idempotent by agent_id. */
  provisionGlobalPrivateVault(agentId) {
    if (!agentId) throw new TypeError("provisionGlobalPrivateVault requires agentId.");
    const run = this.#db.transaction(() => {
      const existing = this.#selectGlobalPrivate.get(agentId);
      if (existing) return rowToVault(existing);
      const vaultId = stableId("vault", "global-private", agentId);
      this.#insertVault.run({
        vault_id: vaultId,
        vault_type: "global_private",
        project_id: null,
        workspace_id: null,
        agent_id: agentId,
        created_at: new Date().toISOString(),
      });
      return rowToVault(this.#selectById.get(vaultId));
    });
    return run();
  }

  /**
   * Status for a workspace_id/agent_id pair: lazily provisions and returns
   * whichever vaults are known for this caller. msp_vault_status carries no
   * project_id, so the shared vault is only surfaced when the workspace's
   * own project_id is already known (e.g. from an earlier
   * msp_workspace_register call) -- it is never speculatively provisioned
   * from a status-only call.
   */
  getVaultStatus({ workspaceId = null, agentId = null } = {}) {
    const vaults = [];
    if (workspaceId) {
      const workspaceVault = this.provisionWorkspacePrivateVault(workspaceId);
      vaults.push(workspaceVault);
      if (workspaceVault.project_id) {
        vaults.push(this.provisionSharedVault(workspaceVault.project_id));
      }
    }
    if (agentId) {
      vaults.push(this.provisionGlobalPrivateVault(agentId));
    }
    return { vaults };
  }

  getVaultById(vaultId) {
    return rowToVault(this.#selectById.get(vaultId));
  }

  /**
   * Idempotent by (vault_id, workspace_id, mount_alias). Rejects an unknown
   * vault_id (fail closed -- a mount must target a vault this registry
   * actually provisioned, never an arbitrary caller-supplied string).
   */
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
    if (!vault) {
      throw new MspRuntimeError(`mountVault: unknown vault_id "${vaultId}".`, "not_found");
    }

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
