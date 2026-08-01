import { createContextLineage, validateContextProfile } from "./context-lineage.mjs";

export function buildContextPacket({ projectState, skill, context, contextProfile = "T-ctx", parentContextId = null, kvId = null, mContextInitial = false }) {
  if (!projectState?.workspaceId || !projectState?.objective) throw new Error("Project state is missing workspaceId or objective.");
  if (!Array.isArray(projectState.sourceRefs) || !projectState.sourceRefs.some((ref) => ref.required)) throw new Error("Project state has no required source of truth.");

  validateContextProfile(contextProfile);
  const sources = {
    globalPrivateVaultRefs: context.globalPrivateVaultRefs ?? context.globalStateRefs ?? [],
    workspacePrivateVaultRefs: context.workspacePrivateVaultRefs ?? context.workspaceStateRefs ?? [],
    sharedVaultRefs: context.sharedVaultRefs ?? context.knowledgeRefs ?? [],
    workflowRef: context.workflowRef ?? null,
    taskEventRefs: context.taskEventRefs ?? [],
    systemRefs: context.systemRefs ?? [],
    diffRef: context.diffRef ?? null,
  };

  if (contextProfile === "T-ctx" && (sources.globalPrivateVaultRefs.length || sources.workspacePrivateVaultRefs.length)) {
    throw new Error("T-ctx cannot implicitly load private vault history.");
  }
  if (contextProfile === "W-ctx" && typeof sources.workflowRef !== "string") throw new Error("W-ctx requires exactly one active workflow reference.");
  if (contextProfile === "M-ctx" && !mContextInitial && !parentContextId) throw new Error("M-ctx after its first turn requires parentContextId.");
  if (kvId !== null && (typeof kvId !== "string" || !kvId)) throw new Error("kvId must be null or a runtime-issued identifier.");

  const lineage = createContextLineage({
    profile: contextProfile,
    sources,
    policy: {
      decisions: context.policyDecisions ?? [],
      budget: context.contextBudget ?? null,
      orderingVersion: context.orderingVersion ?? "context-order/v1",
    },
    parentContextId,
    kvId,
  });

  return {
    schema: "govibe-context-packet/v2",
    status: "ready",
    taskId: projectState.taskId ?? `continue:${projectState.workspaceId}`,
    projectId: projectState.projectId ?? null,
    workspaceId: projectState.workspaceId,
    moduleScope: projectState.moduleScope ?? "workspace",
    objective: projectState.objective,
    constraints: projectState.constraints ?? [],
    sourceRefs: projectState.sourceRefs,
    fileRefs: projectState.fileRefs ?? [],
    verificationExpectations: projectState.verificationExpectations ?? [],
    criticalKnownIssues: projectState.criticalKnownIssues ?? [],
    skillRef: { id: skill.id, version: skill.version, contentHash: skill.contentHash },
    contextProfile,
    contextId: lineage.contextId,
    cacheId: lineage.cacheId,
    kvId: lineage.kvId,
    parentContextId: lineage.parentContextId,
    sourceManifestHash: lineage.sourceManifestHash,
    contextHash: lineage.contextHash,
    globalStateRefs: sources.globalPrivateVaultRefs,
    workspaceStateRefs: sources.workspacePrivateVaultRefs,
    knowledgeRefs: sources.sharedVaultRefs,
    workflowRef: sources.workflowRef,
    taskEventRefs: sources.taskEventRefs,
    systemRefs: sources.systemRefs,
    diffRef: sources.diffRef,
    policyDecisions: context.policyDecisions ?? [],
  };
}
