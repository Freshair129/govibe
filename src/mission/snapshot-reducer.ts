import type { MissionEvent, MissionMemorySnapshot, MissionSnapshot, RoadmapSnapshot } from "./domain";

export const emptyMissionSnapshot: MissionSnapshot = {
  connectionState: "disconnected", metrics: [], chart: { labels: [], series: [] }, reactor: [], agents: [], capabilities: [],
  terminal: [], graph: { nodes: [], edges: [] }, specs: [], symbols: [], campaignLogs: [], roadmapSources: [], workflowRuns: [], providers: [],
  memory: { results: [], selectedEntityId: null, lastQuery: null, lastSearchedAt: null, lastDecayResult: null },
};

export function mergeMissionSnapshot(current: MissionSnapshot, patch: Partial<MissionSnapshot>): MissionSnapshot {
  return {
    ...current, ...patch,
    metrics: patch.metrics ?? current.metrics, chart: patch.chart ?? current.chart, reactor: patch.reactor ?? current.reactor,
    agents: patch.agents ?? current.agents, capabilities: patch.capabilities ?? current.capabilities,
    terminal: patch.terminal ?? current.terminal, graph: patch.graph ?? current.graph, specs: patch.specs ?? current.specs,
    symbols: patch.symbols ?? current.symbols, campaignLogs: patch.campaignLogs ?? current.campaignLogs,
    roadmap: patch.roadmap ?? current.roadmap, roadmapSources: patch.roadmapSources ?? current.roadmapSources,
    workflowRuns: patch.workflowRuns ?? current.workflowRuns, providers: patch.providers ?? current.providers,
    memory: patch.memory ?? current.memory,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };
}

function roadmap(current?: RoadmapSnapshot): RoadmapSnapshot {
  return current ?? { sourcePath: "event://mission-gateway", sourceType: "event", updatedAt: new Date().toISOString(), nodes: [], assignments: [], handoffs: [], verifications: [] };
}

function memory(current?: MissionMemorySnapshot): MissionMemorySnapshot {
  return current ?? { results: [], selectedEntityId: null, lastQuery: null, lastSearchedAt: null, lastDecayResult: null };
}

function upsert<T>(items: T[], next: T, match: (item: T) => boolean): T[] {
  return items.some(match) ? items.map((item) => match(item) ? next : item) : [...items, next];
}

export function reduceMissionEvent(current: MissionSnapshot, event: MissionEvent): MissionSnapshot {
  switch (event.type) {
    case "snapshot": return mergeMissionSnapshot(current, event.snapshot);
    case "terminal.line": return mergeMissionSnapshot(current, { terminal: [...current.terminal, event.line] });
    case "metrics.update": return mergeMissionSnapshot(current, { metrics: event.metrics });
    case "chart.update": return mergeMissionSnapshot(current, { chart: event.chart });
    case "agents.update": return mergeMissionSnapshot(current, { agents: event.agents });
    case "graph.update": return mergeMissionSnapshot(current, { graph: event.graph });
    case "heatmap.update": return mergeMissionSnapshot(current, { heatmap: event.heatmap });
    case "roadmap.snapshot": return mergeMissionSnapshot(current, { roadmap: event.roadmap });
    case "roadmap.node.update": { const value = roadmap(current.roadmap); return mergeMissionSnapshot(current, { roadmap: { ...value, updatedAt: new Date().toISOString(), nodes: upsert(value.nodes, event.node, (item) => item.id === event.node.id) } }); }
    case "roadmap.assignment": { const value = roadmap(current.roadmap); return mergeMissionSnapshot(current, { roadmap: { ...value, updatedAt: new Date().toISOString(), assignments: upsert(value.assignments, event.assignment, (item) => item.taskId === event.assignment.taskId) } }); }
    case "roadmap.handoff": { const value = roadmap(current.roadmap); return mergeMissionSnapshot(current, { roadmap: { ...value, updatedAt: new Date().toISOString(), handoffs: upsert(value.handoffs, event.handoff, (item) => item.taskId === event.handoff.taskId && item.fromId === event.handoff.fromId && item.toId === event.handoff.toId) } }); }
    case "roadmap.verification": { const value = roadmap(current.roadmap); return mergeMissionSnapshot(current, { roadmap: { ...value, updatedAt: new Date().toISOString(), verifications: upsert(value.verifications, event.verification, (item) => item.taskId === event.verification.taskId) } }); }
    case "workflow.run": return mergeMissionSnapshot(current, { workflowRuns: [...(current.workflowRuns ?? []).filter((run) => run.runId !== event.run.runId), event.run] });
    case "memory.search.result": return mergeMissionSnapshot(current, { memory: { ...memory(current.memory), results: event.result.hits, lastQuery: event.result.query, lastSearchedAt: event.result.updatedAt } });
    case "memory.selection": return mergeMissionSnapshot(current, { memory: { ...memory(current.memory), selectedEntityId: event.entityId } });
    case "memory.forgotten": { const value = memory(current.memory); return mergeMissionSnapshot(current, { memory: { ...value, results: value.results.filter((hit) => hit.entity.entityId !== event.entityId) } }); }
    case "memory.decay.result": return mergeMissionSnapshot(current, { memory: { ...memory(current.memory), lastDecayResult: event.result } });
  }
}
