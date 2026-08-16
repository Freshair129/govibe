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
      const result = await service.scanWorkspace({ actor: "mission-control", workspacePath: command.workspacePath, deep: command.deep, runId: command.runId });
      return { ok: true, action: "workspace.scan", result, snapshot: service.getSnapshot() };
    }
    if (command.type === "agent.select") {
      service.appendTerminal("sys", `Agent selected: ${command.agentId}`);
      return { ok: true, action: "agent.select" };
    }
    if (command.type === "reactor.run") {
      service.appendTerminal("sys", `Reactor run requested for profile: ${command.profile}`);
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
      const session = await service.startAgentSession({ agent: command.agent, cwd: command.cwd, accessScope: command.accessScope, approvalRef: command.approvalRef, cols: command.cols, rows: command.rows });
      service.appendTerminal("sys", `Agent session started: ${command.agent} (${session.accessScope}) in ${session.cwd}`);
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
    if (command.type === "memory.decay.run") {
      const result = await service.runMemoryDecay({ vault_id: command.vaultId, dry_run: command.dryRun });
      service.appendTerminal("sys", `Memory decay tick (${command.dryRun ? "dry run" : "applied"}): ${result.evaluated} evaluated, ${result.transitioned.length} transitioned.`);
      return { ok: true, action: "memory.decay.run", result, snapshot: service.getSnapshot() };
    }
    return { ok: false, action: "unknown-command" };
  }
}
