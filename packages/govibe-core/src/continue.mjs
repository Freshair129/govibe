import os from "node:os";
import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

import { buildContextPacket } from "./context-packet.mjs";
import { persistContextInjection } from "./context-store.mjs";
import { RuntimeAuthorityError, validateContextAuthorityCorrelation } from "./authority-enforcement.mjs";
import { loadGlobalTrustPolicy, loadSkillLock, resolveSkill } from "./skill-registry.mjs";

async function validateRepositoryRefs(projectState, workspacePath) {
  async function validate(ref, label) {
    if (typeof ref.path !== "string" || path.isAbsolute(ref.path)) throw new Error(`${label} path must be workspace-relative.`);
    const target = await realpath(path.resolve(workspacePath, ref.path));
    const relative = path.relative(workspacePath, target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`${label} path escapes the workspace.`);
    const content = await readFile(target);
    return { ...ref, path: relative.replaceAll("\\", "/"), sourceHash: createHash("sha256").update(content).digest("hex") };
  }

  const sourceRefs = [];
  for (const ref of projectState.sourceRefs ?? []) sourceRefs.push(await validate(ref, "Source reference"));
  const fileRefs = [];
  for (const ref of projectState.fileRefs ?? []) {
    try { fileRefs.push(await validate(ref, "File reference")); }
    catch (error) { if (ref.required) throw error; }
  }
  return { ...projectState, sourceRefs, fileRefs };
}

export async function continueWorkflow({
  workspacePath,
  mspClient,
  actor = "unknown",
  executor = "codex",
  agentId,
  contextProfile = "V-ctx",
  workflowRef = null,
  parentContextId,
  runId,
  turnId,
  sessionId,
  globalSkillRoot,
  trustedWorkspaceHashes = [],
  contextAuthority,
}) {
  const root = path.resolve(workspacePath);
  let projectState;
  try {
    projectState = JSON.parse(await readFile(path.join(root, ".govibe", "project-state.json"), "utf8"));
  } catch (error) {
    return { status: "blocked", reason: "missing_project_state", error: error instanceof Error ? error.message : String(error) };
  }

  try {
    const globalGovibeRoot = path.dirname(globalSkillRoot ?? path.join(os.homedir(), ".govibe", "skills"));
    const [config, lock, trustPolicy] = await Promise.all([
      readFile(path.join(root, ".govibe", "config.json"), "utf8").then(JSON.parse),
      loadSkillLock(root),
      loadGlobalTrustPolicy(globalGovibeRoot),
    ]);
    if (config.schema !== "govibe-workspace-config/v1") throw new Error("Invalid workspace config schema.");
    const pin = lock.skills[0];
    if (!pin) throw new Error("Skill lock contains no pinned skill.");
    const skill = await resolveSkill({ workspacePath: root, globalRoot: globalSkillRoot ?? path.join(os.homedir(), ".govibe", "skills"), ...pin, trustWorkspaceSkills: trustPolicy.trustWorkspaceSkills, trustedWorkspaceHashes: [...trustPolicy.trustedWorkspaceHashes, ...trustedWorkspaceHashes] });
    projectState = await validateRepositoryRefs(projectState, root);
    const governed = validateContextAuthorityCorrelation(contextAuthority, { workspaceId: projectState.workspaceId, agentId, runId, sessionId, turnId, parentContextId, knowledgeRefs: projectState.knowledgeRefs });
    const context = await mspClient.resolveContext({ actor, executor, agentId: governed.identity.agentId, contextProfile, parentContextId: governed.lineage.parentContextId, workflowRef, mode: "codev", workspaceId: governed.identity.workspaceId, workspacePath: root, stateKeys: projectState.stateKeys, knowledgeRefs: governed.contextAuthority.knowledgeRefs, contextAuthority: governed.contextAuthority });
    const packet = buildContextPacket({ projectState, skill, context, contextProfile, parentContextId: governed.lineage.parentContextId });
    const persisted = await persistContextInjection({ workspacePath: root, packet, agentId: governed.identity.agentId, runId: governed.identity.runId, turnId: governed.identity.turnId, sessionId: governed.identity.sessionId, diffRef: context.diffRef ?? null });
    const registered = await mspClient.recordContextInjection(persisted.record);
    return { status: "ready", packet, injectionRef: registered.injectionRef, cachePath: persisted.cachePath };
  } catch (error) {
    if (error instanceof RuntimeAuthorityError) return { status: "blocked", reason: error.code, error: error.message, authorityError: error.toJSON?.() ?? { code: error.code, message: error.message } };
    const message = error instanceof Error ? error.message : String(error);
    const reason = /MSP|transport|parent/i.test(message) ? "msp_unavailable" : "context_resolution_failed";
    return { status: "blocked", reason, error: message };
  }
}
