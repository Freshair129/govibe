import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import type { AgentSessionAccessScope, AgentSessionRecord, MissionCommand, MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

// Mirror of the sidecar allowlist for the start form. The sidecar remains the
// authority — an agent outside its allowlist is rejected server-side.
const AGENT_OPTIONS = ["claude-code", "codex"];
const ACCESS_SCOPES: AgentSessionAccessScope[] = ["H0", "H1", "H2", "H3", "H4"];

function SessionTerminal({ session, send }: { session: AgentSessionRecord; send: (command: MissionCommand) => void }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const writtenRef = useRef("");

  useEffect(() => {
    if (!hostRef.current) return;
    // Dimensions must match the sidecar's PTY default (120x32) or full-screen
    // TUIs render misaligned.
    const terminal = new Terminal({ cols: 120, rows: 32, convertEol: false, scrollback: 2000, fontSize: 13 });
    terminal.open(hostRef.current);
    terminal.onData((data) => send({ type: "agent.session.input", sessionId: session.id, data }));
    terminal.focus();
    termRef.current = terminal;
    writtenRef.current = "";
    return () => {
      terminal.dispose();
      termRef.current = null;
    };
    // The terminal is bound to one session for its lifetime; input routing and
    // buffer replay both key off session.id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  useEffect(() => {
    const terminal = termRef.current;
    if (!terminal) return;
    const written = writtenRef.current;
    if (session.buffer.length >= written.length && session.buffer.startsWith(written)) {
      const delta = session.buffer.slice(written.length);
      if (delta) terminal.write(delta);
    } else {
      terminal.reset();
      terminal.write(session.buffer);
    }
    writtenRef.current = session.buffer;
  }, [session.buffer, session.id]);

  return (
    <div>
      <div ref={hostRef} style={{ height: 440 }} onClick={() => termRef.current?.focus()} />
      <p style={{ fontSize: 12, opacity: 0.7, margin: "6px 2px 0" }}>
        The terminal itself is the input — click inside it and type exactly as you would in the agent&apos;s own CLI. Keystrokes go straight to the PTY.
      </p>
    </div>
  );
}

export function AgentConsoleView({ snapshot, send }: { snapshot: MissionSnapshot; send: (command: MissionCommand) => void }) {
  const sessions = snapshot.sessions ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [agent, setAgent] = useState(AGENT_OPTIONS[0]);
  const [cwd, setCwd] = useState("");
  const [accessScope, setAccessScope] = useState<AgentSessionAccessScope>("H2");
  const [approvalRef, setApprovalRef] = useState("");

  const selected = sessions.find((session) => session.id === selectedId) ?? sessions[0];

  const startSession = () => {
    if (!cwd.trim()) return;
    send({
      type: "agent.session.start",
      agent,
      cwd: cwd.trim(),
      accessScope,
      ...(accessScope === "H4" && approvalRef.trim() ? { approvalRef: approvalRef.trim() } : {}),
    });
  };

  return (
    <div className="view-stack">
      <ViewHeader
        eyebrow="Supervision"
        title="Agent Console"
        desc="Run an allowlisted CLI agent in a real PTY inside a client-owned workspace. The executor's own auth, hooks, and MCP config apply unchanged (ADR-029)."
      />
      <section className="panel" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: 12 }}>
        <select value={agent} onChange={(event) => setAgent(event.target.value)}>
          {AGENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <input
          value={cwd}
          onChange={(event) => setCwd(event.target.value)}
          placeholder="Workspace path (client-owned)"
          style={{ flex: "1 1 240px" }}
        />
        <select value={accessScope} onChange={(event) => setAccessScope(event.target.value as AgentSessionAccessScope)}>
          {ACCESS_SCOPES.map((scope) => <option key={scope} value={scope}>{scope}</option>)}
        </select>
        {accessScope === "H4" && (
          <input
            value={approvalRef}
            onChange={(event) => setApprovalRef(event.target.value)}
            placeholder="Owner approval ref (required for H4)"
            style={{ flex: "1 1 200px" }}
          />
        )}
        <button type="button" onClick={startSession} disabled={!cwd.trim()}>Start session</button>
      </section>
      {sessions.length === 0 ? (
        <EmptyState
          title="No agent sessions"
          body="The sidecar has not spawned any PTY sessions. Start an allowlisted CLI agent above — the sidecar on 127.0.0.1:4310 must be running."
        />
      ) : (
        <section style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
          <div className="panel" style={{ flex: "0 0 240px", padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {sessions.map((session) => (
              <button
                type="button"
                key={session.id}
                onClick={() => setSelectedId(session.id)}
                style={{ textAlign: "left", opacity: session.state === "exited" ? 0.6 : 1, fontWeight: selected?.id === session.id ? 600 : 400 }}
              >
                {session.agentId} · {session.accessScope} · {session.state}
                {session.state === "exited" && session.exitCode !== null ? ` (${session.exitCode})` : ""}
              </button>
            ))}
          </div>
          <div className="panel" style={{ flex: 1, minWidth: 0, padding: 8 }}>
            {selected ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 12 }}>
                  <span>{selected.agentId} · ceiling {selected.accessScope} · {selected.cwd}</span>
                  {selected.state === "running" && (
                    <button type="button" onClick={() => send({ type: "agent.session.stop", sessionId: selected.id })}>Stop</button>
                  )}
                </div>
                <SessionTerminal key={selected.id} session={selected} send={send} />
              </>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
