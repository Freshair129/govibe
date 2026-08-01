import { access, readFile, realpath, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

import { installSkillDefinition } from "./skill-registry.mjs";
import { mkdirSafe } from "./path-safety.mjs";
import { createWorkspaceVaultBindings } from "./vaults.mjs";

async function writeJsonIfMissing(filePath, value) {
  await mkdirSafe(path.dirname(path.dirname(filePath)), path.dirname(filePath));
  try {
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existing = JSON.parse(await readFile(filePath, "utf8"));
    if (existing.schema !== value.schema) throw new Error(`Incompatible existing state: ${filePath}`);
  }
}

async function detectSourceRef(root) {
  for (const candidate of ["README.md", "docs/README.md", "package.json"]) {
    try {
      await access(path.join(root, candidate));
      return { path: candidate.replaceAll("\\", "/"), kind: "other", required: true };
    } catch {}
  }
  return undefined;
}

export async function initializeWorkspace({ workspacePath, builtInSkill, mspClient, actor = "unknown", agentId = "default-agent", globalPrivateVaultId }) {
  if (!mspClient?.registerWorkspace) throw new Error("Workspace initialization requires the MSP parent boundary.");
  const root = await realpath(path.resolve(workspacePath));
  const vaultBindings = createWorkspaceVaultBindings({ projectName: path.basename(root), workspacePath: root, agentId, globalPrivateVaultId });
  const govibeDir = path.join(root, ".govibe");
  const sharedBrainDir = path.join(root, vaultBindings.primary_shared_vault.materialization_path);
  const privateBrainDir = path.join(root, vaultBindings.workspace_private_vaults[0].materialization_path);
  await Promise.all([mkdirSafe(root, govibeDir), mkdirSafe(root, sharedBrainDir), mkdirSafe(root, privateBrainDir)]);

  const installed = await installSkillDefinition(builtInSkill, path.join(govibeDir, "skills"));
  const sourceRef = await detectSourceRef(root);
  const configPath = path.join(govibeDir, "config.json");
  const lockPath = path.join(govibeDir, "skill-lock.json");
  const statePath = path.join(govibeDir, "project-state.json");
  const vaultsPath = path.join(govibeDir, "vaults.json");
  const sharedManifestPath = path.join(sharedBrainDir, "manifest.json");
  const privateManifestPath = path.join(privateBrainDir, "manifest.json");
  const createdAt = new Date().toISOString();

  await writeJsonIfMissing(configPath, { schema: "govibe-workspace-config/v1", workspaceId: vaultBindings.workspace_id, projectId: vaultBindings.project_id, projectSlug: vaultBindings.primary_shared_vault.slug, createdAt });
  await writeJsonIfMissing(lockPath, { schema: "govibe-skill-lock/v1", skills: [{ id: installed.definition.id, version: installed.definition.version, contentHash: installed.definition.contentHash }] });
  await writeJsonIfMissing(statePath, { schema: "govibe-project-state/v1", workspaceId: vaultBindings.workspace_id, projectId: vaultBindings.project_id, objective: "Continue governed work in this workspace.", moduleScope: "workspace", constraints: ["Respect repository source of truth and workspace policy."], sourceRefs: sourceRef ? [sourceRef] : [], fileRefs: [], verificationExpectations: [], criticalKnownIssues: [], stateKeys: [], knowledgeRefs: [], vaultRefs: [vaultBindings.primary_shared_vault.vault_id, vaultBindings.workspace_private_vaults[0].vault_id, vaultBindings.global_private_vault.vault_id] });
  await writeJsonIfMissing(vaultsPath, vaultBindings);
  await writeJsonIfMissing(sharedManifestPath, { schema: "govibe-vault-materialization/v1", ...vaultBindings.primary_shared_vault });
  await writeJsonIfMissing(privateManifestPath, { schema: "govibe-vault-materialization/v1", ...vaultBindings.workspace_private_vaults[0] });

  const [config, lock, state, persistedVaults] = await Promise.all([configPath, lockPath, statePath, vaultsPath].map(async (filePath) => JSON.parse(await readFile(filePath, "utf8"))));
  if (config.workspaceId !== vaultBindings.workspace_id || config.projectId !== vaultBindings.project_id || !config.createdAt) throw new Error(`Incompatible existing state: ${configPath}`);
  const pin = lock.skills?.find((item) => item.id === installed.definition.id && item.version === installed.definition.version);
  if (lock.schema !== "govibe-skill-lock/v1" || lock.skills?.length !== 1 || pin?.contentHash !== installed.definition.contentHash) throw new Error(`Incompatible existing state: ${lockPath}`);
  if (state.workspaceId !== vaultBindings.workspace_id || state.projectId !== vaultBindings.project_id) throw new Error(`Incompatible existing state: ${statePath}`);
  if (persistedVaults.workspace_id !== vaultBindings.workspace_id || persistedVaults.project_id !== vaultBindings.project_id) throw new Error(`Incompatible existing state: ${vaultsPath}`);

  const sourceHash = createHash("sha256").update(JSON.stringify({ workspaceId: config.workspaceId, projectId: config.projectId, workspacePath: root, vaultBindings: persistedVaults })).digest("hex");
  const registration = await mspClient.registerWorkspace({ actor, workspaceId: config.workspaceId, projectId: config.projectId, workspacePath: root, vaultBindings: persistedVaults, recordId: `workspace-${sourceHash.slice(0, 24)}`, runId: `workspace-init-${sourceHash.slice(0, 24)}`, timestamp: config.createdAt, sourceHash });

  return { status: "registered", workspacePath: root, configPath, lockPath, statePath, vaultsPath, sharedManifestPath, privateManifestPath, vaultBindings: persistedVaults, skillRef: installed.definition, registration, warnings: [], deepScanRun: false };
}
