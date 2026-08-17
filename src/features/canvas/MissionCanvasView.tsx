import { useMemo, useState } from "react";
import { Background, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { MissionCommand, MissionSnapshot, ViewId } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";
import { deriveCanvasGraph, resolveNodeDetails, type CanvasNodeStatus } from "./canvas-graph";

const COLUMN_WIDTH = 200;
const ROW_HEIGHT = 84;

const STATUS_COLOR: Record<CanvasNodeStatus, string> = {
  queued: "#64748b",
  running: "#10b981",
  verifying: "#6366f1",
  done: "#22c55e",
  failed: "#ef4444",
  blocked: "#f59e0b",
  unknown: "#94a3b8",
};

function CanvasNode({ data }: NodeProps<Node<{ label: string; status: CanvasNodeStatus; current: boolean }>>) {
  const color = STATUS_COLOR[data.status];
  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: `1.5px solid ${color}`,
        borderStyle: data.current ? "solid" : "solid",
        boxShadow: data.current ? `0 0 0 2px ${color}55` : undefined,
        background: "var(--panel)",
        color: "var(--text)",
        fontSize: 12,
        minWidth: 140,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div style={{ fontWeight: 600 }}>{data.label}</div>
      <div style={{ color, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{data.status}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}

const nodeTypes = { canvasNode: CanvasNode };

function NodeActions({ taskId, requiresApproval, send }: { taskId: string; requiresApproval: boolean; send: (command: MissionCommand) => void }) {
  const [actor, setActor] = useState("Boss");
  const [assigneeId, setAssigneeId] = useState("");
  const [approvalRef, setApprovalRef] = useState("");

  const blocked = requiresApproval && !approvalRef.trim();
  const base = { taskId, actor: actor.trim() || "Boss", ...(requiresApproval && approvalRef.trim() ? { approvalRef: approvalRef.trim() } : {}) };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>Governed actions</div>
      <input value={actor} onChange={(event) => setActor(event.target.value)} placeholder="Actor" style={{ fontSize: 12 }} />
      {requiresApproval && (
        <input
          value={approvalRef}
          onChange={(event) => setApprovalRef(event.target.value)}
          placeholder="Owner approval ref (C-3 gate)"
          style={{ fontSize: 12 }}
        />
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          disabled={blocked}
          title={blocked ? "This task is C-3: an owner approval ref is required (ADR-021)." : undefined}
          onClick={() => send({ type: "workflow.node.action", action: "approve", ...base })}
        >
          Approve
        </button>
        <button
          type="button"
          disabled={blocked}
          title={blocked ? "This task is C-3: an owner approval ref is required (ADR-021)." : undefined}
          onClick={() => send({ type: "workflow.node.action", action: "rerun", ...base })}
        >
          Rerun
        </button>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} placeholder="Assignee agent ID" style={{ flex: 1, fontSize: 12 }} />
        <button
          type="button"
          disabled={blocked || !assigneeId.trim()}
          title={blocked ? "This task is C-3: an owner approval ref is required (ADR-021)." : undefined}
          onClick={() => send({ type: "workflow.node.action", action: "assign", assigneeId: assigneeId.trim(), ...base })}
        >
          Assign
        </button>
      </div>
    </div>
  );
}

export function MissionCanvasView({ snapshot, send, onNavigate }: { snapshot: MissionSnapshot; send: (command: MissionCommand) => void; onNavigate: (view: ViewId) => void }) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const graph = useMemo(() => deriveCanvasGraph(snapshot), [snapshot]);

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!graph) return { flowNodes: [] as Node[], flowEdges: [] as Edge[] };
    const nodes: Node[] = graph.nodes.map((node) => ({
      id: node.id,
      type: "canvasNode",
      position: { x: node.column * COLUMN_WIDTH, y: node.row * ROW_HEIGHT },
      data: { label: node.id, status: node.status, current: node.current },
    }));
    const edges: Edge[] = graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: false,
      style: { stroke: "var(--border)" },
    }));
    return { flowNodes: nodes, flowEdges: edges };
  }, [graph]);

  const details = selectedTaskId ? resolveNodeDetails(snapshot, selectedTaskId) : null;

  return (
    <div className="view-stack">
      <ViewHeader
        eyebrow="Supervision"
        title="Mission Canvas"
        desc="A governed view of live execution — every node is a real orchestration or workflow-run task. GoVibe renders and governs this graph; it does not run it (ADR-029)."
      />
      {!graph ? (
        <EmptyState
          title="No orchestration or workflow-run data"
          body="Publish an orchestration.update or workflow.run event to populate the canvas. No placeholder graph is shown in its place."
        />
      ) : (
        <section style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
          <div className="panel" style={{ flex: 1, minWidth: 0, height: 480, padding: 0 }}>
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              onNodeClick={(_event, node) => setSelectedTaskId(node.id)}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background />
            </ReactFlow>
          </div>
          <div className="panel" style={{ flex: "0 0 280px", padding: 16 }}>
            {!details ? (
              <p style={{ fontSize: 13, opacity: 0.7 }}>Select a node to inspect its Task ID, assignee, and evidence.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>Task ID</div>
                  <div style={{ fontWeight: 600 }}>{details.taskId}</div>
                </div>
                {details.title && (
                  <div>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>Title</div>
                    <div>{details.title}</div>
                  </div>
                )}
                {details.state && (
                  <div>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>State</div>
                    <div>{details.state}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>Assignee</div>
                  <div>{details.agentName ?? details.assigneeId ?? "Unassigned"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6 }}>Evidence</div>
                  {details.evidenceLinks.length === 0 ? (
                    <div style={{ opacity: 0.6 }}>None recorded</div>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {details.evidenceLinks.map((link) => <li key={link}>{link}</li>)}
                    </ul>
                  )}
                </div>
                {details.consoleSessionId ? (
                  <button type="button" onClick={() => onNavigate("A9")}>Open console</button>
                ) : (
                  <p style={{ fontSize: 11, opacity: 0.6, margin: 0 }}>No live console session for this assignee.</p>
                )}
                <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "4px 0" }} />
                <NodeActions taskId={details.taskId} requiresApproval={details.requiresApproval} send={send} />
              </div>
            )}
          </div>
        </section>
      )}
      {(snapshot.auditLog?.length ?? 0) > 0 && (
        <section className="panel" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.6, marginBottom: 8 }}>Audit trail</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, maxHeight: 160, overflowY: "auto" }}>
            {[...(snapshot.auditLog ?? [])].reverse().map((entry) => (
              <div key={entry.id}>
                <span style={{ opacity: 0.6 }}>{entry.at}</span> — <strong>{entry.actor}</strong> {entry.action} <strong>{entry.taskId}</strong>
                {entry.approvalRef && <span style={{ opacity: 0.6 }}> ({entry.approvalRef})</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
