import { enforceToolRbac } from "./rbac-enforcement.mjs";

// TASK-PRD-026 (AUD-04): the sidecar has no per-user login today — every caller shares one
// bearer token (sidecar-server.mjs). Falling back to this label rather than pretending to be
// a trusted system identity ("mission-control") keeps attribution honest until a real
// per-request principal exists; a command that DOES carry `actor` (client-declared) is
// attributed to that value instead, which also gives TASK-PRD-029's approvalRef verification
// something real to check scope against.
const UNATTRIBUTED_SIDECAR_ACTOR = "sidecar-shared-token";

function resolveSidecarActor(candidate) {
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : UNATTRIBUTED_SIDECAR_ACTOR;
}

export class MissionCommandRouter {
  constructor(services) { this.services = services; }

  async route(command) {
    const service = this.services;
    if (command.type === "terminal.command") {
      service.appendTerminal("user", command.command);
      const load = command.command.match(/^roadmap\s+load\s+(.+)$/i);
      if (load) {
        const source = load[1].trim();
        const roadmap = await service.reloadRoadmap(source);
        service.appendTerminal("sys", `Roadmap source loaded: ${source}`);
        return { ok: true, action: "roadmap.load", source, roadmap, snapshot: service.getSnapshot() };
      }
      if (/^roadmap\s+reload$/i.test(command.command)) {
        const roadmap = await service.reloadRoadmap();
        service.appendTerminal("sys", "Roadmap source reloaded.");
        return { ok: true, action: "roadmap.reload", roadmap, snapshot: service.getSnapshot() };
      }
      service.appendTerminal("sys", `Command acknowledged: ${command.command}`);
      return { ok: true, action: "terminal.command" };
    }
    if (command.type === "roadmap.select") {
      const roadmap = await service.reloadRoadmap(command.sourcePath);
      service.appendTerminal("sys", `Roadmap source selected: ${command.sourcePath}`);
      return { ok: true, action: "roadmap.select", source: command.sourcePath, roadmap, snapshot: service.getSnapshot() };
    }
    if (command.type === "masterplan.preview") {
      const masterPlan = await service.previewMasterPlan(command.sourcePath);
      service.appendTerminal("sys", `Master Plan review loaded: ${command.sourcePath}`);
      return { ok: true, action: "masterplan.preview", masterPlan, snapshot: service.getSnapshot() };
    }
    if (command.type === "workspace.scan") {
      // TASK-PRD-026 (AUD-04): route through the SAME enforceToolRbac decision point the
      // stdio tool surface uses (scripts/mcp/handlers.mjs) before any scan side effect. A
      // workspace without .govibe/rbac.json stays in the pre-RBAC posture (enforceToolRbac
      // no-ops); an RBAC-enabled workspace denies an unauthorized actor here exactly as it
      // would on stdio, with the same audited decision.
      const actor = resolveSidecarActor(command.actor);
      await enforceToolRbac("govibe.workspace.scan", { workspacePath: command.workspacePath, deep: command.deep, actor, requestedBy: actor });
      const scanResult = await service.scanWorkspace({ actor, workspacePath: command.workspacePath, deep: command.deep, runId: command.runId });
      // TASK-PRD-007 (B9, round 3): F8 (handlers.mjs) stripped `observed` -- the internal Deep
      // Scan presentation accumulator, up to ~0.5 MB measured on this repo -- from the stdio MCP
      // tool response only. This sidecar path (POST /mission/commands, the transport Mission
      // Control actually uses) still returned it, duplicating the same data the snapshot already
      // carries post-mapping; sidecar-server.mjs's command dedup LRU then cached and re-served it
      // on replay. Strip it here too, on the SAME field, for the SAME reason.
      const { observed: _observed, ...result } = scanResult;
      return { ok: true, action: "workspace.scan", result, snapshot: service.getSnapshot() };
    }
    if (command.type === "agent.select") {
      service.appendTerminal("sys", `Agent selected: ${command.agentId}`);
      return { ok: true, action: "agent.select" };
    }
    if (command.type === "reactor.run") {
      // TASK-PRD-020 (AUD-07): no benchmark execution engine is wired to this command --
      // acknowledge it honestly as a no-op rather than implying a run started.
      service.appendTerminal(
        "sys",
        `Reactor run acknowledged for profile: ${command.profile} -- no backend benchmark runner is implemented; this is a no-op.`,
      );
      return { ok: true, action: "reactor.run" };
    }
    if (command.type === "file.save") {
      service.appendTerminal("sys", `File save command received for hash: ${command.hash}`);
      return { ok: true, action: "file.save" };
    }
    if (command.type === "memory.search") {
      const result = await service.searchMemory({ vault_id: command.vaultId, query: command.query, mode: command.mode, limit: command.limit });
      service.appendTerminal("sys", `Memory search: "${command.query}" (${result.hits.length} hit${result.hits.length === 1 ? "" : "s"}).`);
      return { ok: true, action: "memory.search", result, snapshot: service.getSnapshot() };
    }
    if (command.type === "memory.select") {
      const result = service.selectMemory({ entity_id: command.entityId });
      return { ok: true, action: "memory.select", result, snapshot: service.getSnapshot() };
    }
    if (command.type === "memory.forget") {
      const result = await service.forgetMemory({ entity_id: command.entityId, reason: command.reason });
      service.appendTerminal("sys", `Memory forgotten: ${command.entityId}.`);
      return { ok: true, action: "memory.forget", result, snapshot: service.getSnapshot() };
    }
    if (command.type === "agent.session.start") {
      // TASK-PRD-029 (AUD-08): the same honest-attribution pattern TASK-PRD-026 established
      // for workspace.scan — a client-declared actor is used when present, otherwise the
      // sidecar's shared-token posture is named rather than assumed.
      const actor = resolveSidecarActor(command.actor);
      const session = await service.startAgentSession({ agent: command.agent, cwd: command.cwd, accessScope: command.accessScope, approvalRef: command.approvalRef, actor, cols: command.cols, rows: command.rows });
      const approvalNote = session.approvalApprover ? ` — approval ${command.approvalRef} verified (approver: ${session.approvalApprover})` : "";
      service.appendTerminal("sys", `Agent session started: ${command.agent} (${session.accessScope}) in ${session.cwd} by ${actor}${approvalNote}`);
      return { ok: true, action: "agent.session.start", session, snapshot: service.getSnapshot() };
    }
    if (command.type === "agent.session.input") {
      const result = service.inputAgentSession({ sessionId: command.sessionId, data: command.data });
      return { ok: true, action: "agent.session.input", result };
    }
    if (command.type === "agent.session.resize") {
      const result = service.resizeAgentSession({ sessionId: command.sessionId, cols: command.cols, rows: command.rows });
      return { ok: true, action: "agent.session.resize", result };
    }
    if (command.type === "agent.session.stop") {
      const session = service.stopAgentSession({ sessionId: command.sessionId });
      service.appendTerminal("sys", `Agent session stop requested: ${command.sessionId}`);
      return { ok: true, action: "agent.session.stop", session, snapshot: service.getSnapshot() };
    }
    if (command.type === "workflow.node.action") {
      const result = await service.applyWorkflowNodeAction({ taskId: command.taskId, action: command.action, actor: command.actor, assigneeId: command.assigneeId, approvalRef: command.approvalRef });
      service.appendTerminal("sys", `Workflow node action "${command.action}" applied to ${command.taskId} by ${command.actor}.`);
      return { ok: true, action: "workflow.node.action", result, snapshot: service.getSnapshot() };
    }
    if (command.type === "memory.decay.run") {
      const result = await service.runMemoryDecay({ vault_id: command.vaultId, dry_run: command.dryRun });
      service.appendTerminal("sys", `Memory decay tick (${command.dryRun ? "dry run" : "applied"}): ${result.evaluated} evaluated, ${result.transitioned.length} transitioned.`);
      return { ok: true, action: "memory.decay.run", result, snapshot: service.getSnapshot() };
    }
    return { ok: false, action: "unknown-command" };
  }
}
