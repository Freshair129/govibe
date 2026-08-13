import path from "node:path";
import { realpath } from "node:fs/promises";

import { createWorkspaceVaultBindings } from "../vaults.mjs";
import { createMetadataStore, MODE2_METADATA_ROOT } from "./metadata-store.mjs";
import { createWorkspaceAdapter, resolveClient } from "./workspace-adapter.mjs";

const BINDING_SCHEMA = "govibe-mode2-workspace-binding/v1";

/**
 * Mode 2 binds an *externally owned* workspace. It is deliberately not a variant of
 * `initializeWorkspace`, which materialises `.brain/`, `.govibe-knowledge-block/`, and
 * `local_model/` into the repository root — behaviour that Mode 2's metadata-only write
 * policy forbids and that existing Mode 1 consumers depend on. The two paths coexist.
 *
 * Identity is derived through the same `createWorkspaceVaultBindings` rules the workspace
 * specification defines, so one repository root resolves to one `workspace_id` regardless of
 * which mode reached it. Mode 2 records the identity; it does not materialise the vaults.
 */
export async function bindExternalWorkspace({
  workspacePath,
  client = "generic",
  agentId = "default-agent",
  globalPrivateVaultId,
  persist = true,
  mspClient = null,
  now = () => new Date().toISOString(),
} = {}) {
  if (!workspacePath) throw new Error("Binding an external workspace requires a workspace path.");
  const root = await realpath(path.resolve(workspacePath));
  const resolvedClient = resolveClient(client);
  const adapter = createWorkspaceAdapter({ client: resolvedClient, workspaceRoot: root });
  const identity = adapter.identify();

  const vaultBindings = createWorkspaceVaultBindings({
    projectName: path.basename(root),
    workspacePath: root,
    agentId,
    globalPrivateVaultId,
  });

  const binding = {
    schema: BINDING_SCHEMA,
    workspace: {
      ownership: "external",
      root,
      client: resolvedClient,
      write_policy: "metadata-only",
    },
    workspace_id: vaultBindings.workspace_id,
    project_id: vaultBindings.project_id,
    project_slug: vaultBindings.primary_shared_vault.slug,
    adapter_id: identity.adapter_id,
    metadata_root: MODE2_METADATA_ROOT,
    disposable: true,
    msp_bound: Boolean(mspClient),
    bound_at: now(),
  };

  if (persist) {
    const store = createMetadataStore({ workspaceRoot: root });
    const existing = await store.readJson("workspace.json");
    if (existing && existing.workspace_id !== binding.workspace_id) {
      throw new Error(`Incompatible existing Mode 2 binding at ${MODE2_METADATA_ROOT}/workspace.json`);
    }
    await store.writeJson("workspace.json", existing ? { ...binding, bound_at: existing.bound_at, rebound_at: binding.bound_at } : binding);
  }

  return { binding, adapter, identity };
}

/**
 * Read-oriented entry surface for `govibe.workspace.inspect`. Returns what GoVibe understands
 * about a workspace it does not own, without scanning it.
 */
export async function inspectExternalWorkspace({ workspacePath, client = "generic", agentId, persist = true, now } = {}) {
  const { binding, adapter, identity } = await bindExternalWorkspace({ workspacePath, client, agentId, persist, now });
  const [capabilities, instructions, agentConfiguration, artifacts, project] = await Promise.all([
    adapter.discoverCapabilities(),
    adapter.discoverInstructions(),
    adapter.discoverAgentConfiguration(),
    adapter.discoverExistingArtifacts(),
    adapter.discoverProjectFiles(),
  ]);

  return {
    schema: "govibe-mode2-workspace-inspection/v1",
    identity,
    binding,
    capabilities,
    instructions,
    agent_configuration: agentConfiguration,
    existing_artifacts: artifacts,
    counts: {
      files: project.files.length,
      directories: project.directories.length,
      agent_configuration_files: agentConfiguration.length,
      existing_artifacts: artifacts.length,
    },
    exclusions: project.exclusions,
  };
}
