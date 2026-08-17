import { describe, expect, it } from "vitest";
import type { AgentSessionRecord, MissionSnapshot, WorkflowTaskNode } from "../../mission";
import { emptyMissionSnapshot } from "../../mission/snapshot-reducer";
import { deriveCanvasGraph, resolveNodeDetails } from "./canvas-graph";

function roadmapNode(overrides: Partial<WorkflowTaskNode> & { id: string }): WorkflowTaskNode {
  return { type: "task", title: overrides.id, state: "in_progress", ...overrides };
}

function session(overrides: Partial<AgentSessionRecord> & { id: string; agentId: string }): AgentSessionRecord {
  return { cwd: "G:/govibe", state: "running", accessScope: "H2", startedAt: "2026-08-17T00:00:00.000Z", buffer: "", exitCode: null, ...overrides };
}

describe("deriveCanvasGraph", () => {
  it("returns null when neither orchestration waves nor workflow runs carry data", () => {
    expect(deriveCanvasGraph(emptyMissionSnapshot)).toBeNull();
  });

  it("builds nodes and columns from orchestration waves, in wave order", () => {
    const snapshot: MissionSnapshot = {
      ...emptyMissionSnapshot,
      orchestration: {
        updatedAt: "2026-08-17T00:00:00.000Z",
        waves: [
          { id: "wave-0", index: 0, level: 0, status: "complete", concurrency: 1, taskIds: ["T1"], tasks: [{ taskId: "T1", status: "done", attempts: 1 }] },
          { id: "wave-1", index: 1, level: 1, status: "active", concurrency: 2, taskIds: ["T2", "T3"], tasks: [
            { taskId: "T2", status: "running", attempts: 1 },
            { taskId: "T3", status: "blocked", attempts: 0 },
          ] },
        ],
      },
    };
    const graph = deriveCanvasGraph(snapshot)!;
    expect(graph.source).toBe("orchestration");
    expect(graph.nodes).toEqual([
      { id: "T1", status: "done", column: 0, row: 0, groupId: "wave-0", groupLabel: "Wave 0", current: false },
      { id: "T2", status: "running", column: 1, row: 0, groupId: "wave-1", groupLabel: "Wave 1", current: false },
      { id: "T3", status: "blocked", column: 1, row: 1, groupId: "wave-1", groupLabel: "Wave 1", current: false },
    ]);
  });

  it("falls back to workflowRuns only when orchestration has no waves, marking the current task", () => {
    const snapshot: MissionSnapshot = {
      ...emptyMissionSnapshot,
      workflowRuns: [
        { runId: "run-1", status: "running", currentTask: "A2", tasks: [{ id: "A1", status: "done" }, { id: "A2", status: "running" }] },
      ],
    };
    const graph = deriveCanvasGraph(snapshot)!;
    expect(graph.source).toBe("workflowRuns");
    expect(graph.nodes.map((node) => [node.id, node.current])).toEqual([["A1", false], ["A2", true]]);
  });

  it("prefers orchestration over workflowRuns when both carry data", () => {
    const snapshot: MissionSnapshot = {
      ...emptyMissionSnapshot,
      orchestration: { updatedAt: "x", waves: [{ id: "w0", index: 0, level: 0, status: "active", concurrency: 1, taskIds: ["O1"], tasks: [{ taskId: "O1", status: "queued", attempts: 0 }] }] },
      workflowRuns: [{ runId: "run-1", status: "running", currentTask: null, tasks: [{ id: "W1", status: "queued" }] }],
    };
    expect(deriveCanvasGraph(snapshot)!.source).toBe("orchestration");
  });

  it("normalizes an unrecognized workflowRun task status to 'unknown' rather than fabricating meaning", () => {
    const snapshot: MissionSnapshot = {
      ...emptyMissionSnapshot,
      workflowRuns: [{ runId: "run-1", status: "running", currentTask: null, tasks: [{ id: "W1", status: "some-future-status" }] }],
    };
    expect(deriveCanvasGraph(snapshot)!.nodes[0].status).toBe("unknown");
  });

  it("derives an edge only when a real roadmap artifactLink names another node currently on the canvas", () => {
    const snapshot: MissionSnapshot = {
      ...emptyMissionSnapshot,
      orchestration: { updatedAt: "x", waves: [
        { id: "w0", index: 0, level: 0, status: "active", concurrency: 2, taskIds: ["T1", "T2"], tasks: [{ taskId: "T1", status: "done", attempts: 1 }, { taskId: "T2", status: "running", attempts: 1 }] },
      ] },
      roadmap: { sourcePath: "x", sourceType: "event", updatedAt: "x", nodes: [
        roadmapNode({ id: "T2", artifactLinks: ["T1", "TASK-NOT-ON-CANVAS", "-"] }),
      ], assignments: [], handoffs: [], verifications: [] },
    };
    const graph = deriveCanvasGraph(snapshot)!;
    expect(graph.edges).toEqual([{ id: "T1->T2", source: "T1", target: "T2" }]);
  });

  it("never adds a self-referencing edge or a duplicate edge", () => {
    const snapshot: MissionSnapshot = {
      ...emptyMissionSnapshot,
      orchestration: { updatedAt: "x", waves: [
        { id: "w0", index: 0, level: 0, status: "active", concurrency: 2, taskIds: ["T1", "T2"], tasks: [{ taskId: "T1", status: "done", attempts: 1 }, { taskId: "T2", status: "running", attempts: 1 }] },
      ] },
      roadmap: { sourcePath: "x", sourceType: "event", updatedAt: "x", nodes: [
        roadmapNode({ id: "T1", artifactLinks: ["T1"] }),
        roadmapNode({ id: "T2", artifactLinks: ["T1", "T1"] }),
      ], assignments: [], handoffs: [], verifications: [] },
    };
    const graph = deriveCanvasGraph(snapshot)!;
    expect(graph.edges).toEqual([{ id: "T1->T2", source: "T1", target: "T2" }]);
  });
});

describe("resolveNodeDetails", () => {
  it("returns the bare taskId when no roadmap node matches, never inventing a title", () => {
    const details = resolveNodeDetails(emptyMissionSnapshot, "GHOST-1");
    expect(details).toEqual({ taskId: "GHOST-1", evidenceLinks: [] });
  });

  it("resolves title, state, and deduplicated evidence links from the matching roadmap node", () => {
    const snapshot: MissionSnapshot = {
      ...emptyMissionSnapshot,
      roadmap: { sourcePath: "x", sourceType: "event", updatedAt: "x", nodes: [
        roadmapNode({ id: "T1", title: "Implement auth", summary: "OAuth flow", state: "in_progress", assigneeId: "VIBE", assigneeType: "agent", artifactLinks: ["docs/a.md"], reviewLinks: ["docs/a.md"], verificationLinks: ["src/a.test.ts"] }),
      ], assignments: [], handoffs: [], verifications: [] },
    };
    const details = resolveNodeDetails(snapshot, "T1");
    expect(details).toEqual({
      taskId: "T1", title: "Implement auth", summary: "OAuth flow", state: "in_progress",
      assigneeId: "VIBE", assigneeType: "agent",
      evidenceLinks: ["docs/a.md", "src/a.test.ts"],
      agentName: undefined, consoleSessionId: undefined,
    });
  });

  it("resolves the agent's display name when the assignee matches a registered agent", () => {
    const snapshot: MissionSnapshot = {
      ...emptyMissionSnapshot,
      roadmap: { sourcePath: "x", sourceType: "event", updatedAt: "x", nodes: [roadmapNode({ id: "T1", assigneeId: "agent-1" })], assignments: [], handoffs: [], verifications: [] },
      agents: [{ id: "agent-1", name: "Vibe", role: "engineer", model: "x", status: "online", tasks: "0", accuracy: "0", speed: "0" }],
    };
    expect(resolveNodeDetails(snapshot, "T1").agentName).toBe("Vibe");
  });

  it("resolves a console session only on an exact agentId match, preferring a running one", () => {
    const snapshot: MissionSnapshot = {
      ...emptyMissionSnapshot,
      roadmap: { sourcePath: "x", sourceType: "event", updatedAt: "x", nodes: [roadmapNode({ id: "T1", assigneeId: "claude-code" })], assignments: [], handoffs: [], verifications: [] },
      sessions: [
        session({ id: "sess-exited", agentId: "claude-code", state: "exited" }),
        session({ id: "sess-running", agentId: "claude-code", state: "running" }),
      ],
    };
    expect(resolveNodeDetails(snapshot, "T1").consoleSessionId).toBe("sess-running");
  });

  it("leaves consoleSessionId undefined when the assignee namespace does not match any live session's agentId", () => {
    const snapshot: MissionSnapshot = {
      ...emptyMissionSnapshot,
      roadmap: { sourcePath: "x", sourceType: "event", updatedAt: "x", nodes: [roadmapNode({ id: "T1", assigneeId: "VIBE" })], assignments: [], handoffs: [], verifications: [] },
      sessions: [session({ id: "sess-1", agentId: "claude-code" })],
    };
    expect(resolveNodeDetails(snapshot, "T1").consoleSessionId).toBeUndefined();
  });
});
