// TASK-PRD-024 (MASTERPLAN-govibe-production-readiness §3.3 AUD-02): the single
// forwarding contract for govibe.workflow.continue.
//
// Two wrapper layers forward the tool surface into govibe-core's
// continueWorkflow: the WP-05 argument-hardening override on the runtime
// singleton and WorkspaceService.continue. They drifted — the hardening layer
// silently dropped contextAuthority, so the governed context branch always
// blocked with missing_runtime_authority. Both layers now build their core
// call through this one function; a field added here reaches the core from
// every surface, and a field dropped here fails the shared regression test.
export function buildContinueForwardingArgs(args, workspacePath, mspClient, trustedWorkspaceHashes = []) {
  return {
    workspacePath,
    mspClient,
    actor: args.actor ?? "unknown",
    executor: args.executor ?? "codex",
    agentId: args.agentId ?? "default-agent",
    contextProfile: args.contextProfile ?? "V-ctx",
    workflowRef: args.workflowRef ?? args.workflowId ?? null,
    parentContextId: args.parentContextId ?? null,
    sessionId: args.sessionId ?? null,
    runId: args.runId,
    turnId: args.turnId,
    trustedWorkspaceHashes,
    contextAuthority: args.contextAuthority,
  };
}
