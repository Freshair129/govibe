import type { MissionSnapshot } from "../../mission";

// A8 Mission Canvas: derives a node graph strictly from live snapshot data.
// No structure is invented — a node exists only because a real orchestration
// task or workflow-run task exists, and an edge exists only because a real
// roadmap.nodes artifactLink names another node currently on the canvas.

export type CanvasNodeStatus = "queued" | "running" | "verifying" | "done" | "failed" | "blocked" | "unknown";

export type CanvasGraphNode = {
  id: string;
  status: CanvasNodeStatus;
  column: number;
  row: number;
  groupId: string;
  groupLabel: string;
  current: boolean;
};

export type CanvasGraphEdge = { id: string; source: string; target: string };

export type CanvasGraph = {
  source: "orchestration" | "workflowRuns";
  nodes: CanvasGraphNode[];
  edges: CanvasGraphEdge[];
};

const ORCHESTRATION_STATUSES = new Set<CanvasNodeStatus>(["queued", "running", "verifying", "done", "failed", "blocked"]);

function normalizeStatus(value: string | undefined): CanvasNodeStatus {
  return value && ORCHESTRATION_STATUSES.has(value as CanvasNodeStatus) ? (value as CanvasNodeStatus) : "unknown";
}

function deriveEdges(nodes: CanvasGraphNode[], snapshot: MissionSnapshot): CanvasGraphEdge[] {
  const ids = new Set(nodes.map((node) => node.id));
  const roadmapById = new Map((snapshot.roadmap?.nodes ?? []).map((node) => [node.id, node]));
  const edges: CanvasGraphEdge[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    const links = roadmapById.get(node.id)?.artifactLinks ?? [];
    for (const link of links) {
      const source = link.trim();
      if (!source || source === "-" || !ids.has(source) || source === node.id) continue;
      const edgeId = `${source}->${node.id}`;
      if (seen.has(edgeId)) continue;
      seen.add(edgeId);
      edges.push({ id: edgeId, source, target: node.id });
    }
  }
  return edges;
}

function fromOrchestration(snapshot: MissionSnapshot): CanvasGraph | null {
  const waves = snapshot.orchestration?.waves ?? [];
  if (waves.length === 0) return null;

  const nodes: CanvasGraphNode[] = [];
  waves.forEach((wave, column) => {
    wave.tasks.forEach((task, row) => {
      nodes.push({
        id: task.taskId,
        status: normalizeStatus(task.status),
        column,
        row,
        groupId: wave.id,
        groupLabel: `Wave ${wave.index}`,
        current: false,
      });
    });
  });
  if (nodes.length === 0) return null;

  return { source: "orchestration", nodes, edges: deriveEdges(nodes, snapshot) };
}

function fromWorkflowRuns(snapshot: MissionSnapshot): CanvasGraph | null {
  const runs = snapshot.workflowRuns ?? [];
  if (runs.length === 0) return null;

  const nodes: CanvasGraphNode[] = [];
  runs.forEach((run, column) => {
    run.tasks.forEach((task, row) => {
      nodes.push({
        id: task.id,
        status: normalizeStatus(task.status),
        column,
        row,
        groupId: run.runId,
        groupLabel: run.runId,
        current: run.currentTask === task.id,
      });
    });
  });
  if (nodes.length === 0) return null;

  return { source: "workflowRuns", nodes, edges: deriveEdges(nodes, snapshot) };
}

// Orchestration is the live execution-state source; workflowRuns is the
// fallback when no wave-based run is active.
export function deriveCanvasGraph(snapshot: MissionSnapshot): CanvasGraph | null {
  return fromOrchestration(snapshot) ?? fromWorkflowRuns(snapshot);
}

export type CanvasNodeDetails = {
  taskId: string;
  title?: string;
  summary?: string;
  state?: string;
  assigneeId?: string;
  assigneeType?: string;
  evidenceLinks: string[];
  agentName?: string;
  consoleSessionId?: string;
  complexity?: string;
  requiresApproval: boolean;
};

// Mirrors the sidecar's accessScopeGateFor (scripts/mcp/runtime/workflow-node-action-service.mjs)
// so the Canvas can show the gate before a command round-trip. The server
// remains the enforcing authority regardless of what this returns.
export function requiresApprovalGate(complexity: string | undefined): boolean {
  return complexity === "C-3";
}

// Resolves everything the inspector shows for a selected node, strictly from
// data already in the snapshot — never invented to fill a gap.
export function resolveNodeDetails(snapshot: MissionSnapshot, taskId: string): CanvasNodeDetails {
  const roadmapNode = (snapshot.roadmap?.nodes ?? []).find((node) => node.id === taskId);
  const complexity = (snapshot.roadmap?.taskContainers ?? []).find((container) => container.task_id === taskId)?.complexity;
  const evidenceLinks = [
    ...(roadmapNode?.artifactLinks ?? []),
    ...(roadmapNode?.reviewLinks ?? []),
    ...(roadmapNode?.verificationLinks ?? []),
  ].filter((link, index, all) => link && all.indexOf(link) === index);

  const assigneeId = roadmapNode?.assigneeId;
  const agentName = assigneeId ? (snapshot.agents ?? []).find((agent) => agent.id === assigneeId)?.name : undefined;
  // Roadmap assignees are agent-registry personas (e.g. "VIBE"); A9 sessions
  // key off the harness that was launched (e.g. "claude-code"). These are
  // different namespaces today, so this only resolves when they genuinely
  // match — no fuzzy mapping invented to make the affordance appear more often.
  const consoleSession = assigneeId
    ? (snapshot.sessions ?? []).find((session) => session.agentId === assigneeId && session.state === "running")
      ?? (snapshot.sessions ?? []).find((session) => session.agentId === assigneeId)
    : undefined;

  return {
    taskId,
    title: roadmapNode?.title,
    summary: roadmapNode?.summary,
    state: roadmapNode?.state,
    assigneeId,
    assigneeType: roadmapNode?.assigneeType,
    evidenceLinks,
    agentName,
    consoleSessionId: consoleSession?.id,
    complexity,
    requiresApproval: requiresApprovalGate(complexity),
  };
}
