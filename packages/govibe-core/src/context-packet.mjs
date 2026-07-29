export function buildContextPacket({ projectState, skill, context }) {
  if (!projectState?.workspaceId || !projectState?.objective) {
    throw new Error("Project state is missing workspaceId or objective.");
  }
  if (!Array.isArray(projectState.sourceRefs) || !projectState.sourceRefs.some((ref) => ref.required)) {
    throw new Error("Project state has no required source of truth.");
  }
  return {
    schema: "govibe-context-packet/v2",
    status: "ready",
    taskId: projectState.taskId ?? `continue:${projectState.workspaceId}`,
    workspaceId: projectState.workspaceId,
    moduleScope: projectState.moduleScope ?? "workspace",
    objective: projectState.objective,
    constraints: projectState.constraints ?? [],
    sourceRefs: projectState.sourceRefs,
    fileRefs: projectState.fileRefs ?? [],
    verificationExpectations: projectState.verificationExpectations ?? [],
    criticalKnownIssues: projectState.criticalKnownIssues ?? [],
    skillRef: { id: skill.id, version: skill.version, contentHash: skill.contentHash },
    globalStateRefs: context.globalStateRefs ?? [],
    workspaceStateRefs: context.workspaceStateRefs ?? [],
    knowledgeRefs: context.knowledgeRefs ?? [],
    policyDecisions: context.policyDecisions ?? [],
  };
}
