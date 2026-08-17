import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import type { AgentSessionAccessScope, AgentSessionRecord, MissionCommand, MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";

// Mirror of the sidecar allowlist for the start form. The sidecar remains the
// authority - an agent outside its allowlist is rejected server-side.
const AGENT_OPTIONS = ["claude-code", "codex"];
const ACCESS_SCOPES: AgentSessionAccessScope[] = ["H0", "H1", "H2", "H3", "H4"];

function SessionTerminal({ session, send }: { session: AgentSessionRecord; send: (command: MissionCommand) => void }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const writtenRef = useRef("");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const terminal = new Terminal({ convertEol: false, scrollback: 2000, fontSize: 13 });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(host);
    terminal.onData((data) => send({ type: "agent.session.input", sessionId: session.id, data }));
    // The addon measures real cell size and derives the geometry, replacing the
    // fixed 120x32 guess; onResize then pushes that geometry to the PTY so both
    // ends agree and the agent repaints at the right width.
    terminal.onResize(({ cols, rows }) => {
      if (session.state === "running") send({ type: "agent.session.resize", sessionId: session.id, cols, rows });
    });
    terminal.focus();
    termRef.current = terminal;
    fitRef.current = fit;
    writtenRef.current = "";

    const applyFit = () => {
      try {
        fit.fit();
      } catch {
        // fit() throws while the host is detached or zero-sized; the observer
        // fires again once layout settles.
      }
    };
    // One deferred fit covers fonts/layout not being settled at open().
    const initialFit = window.setTimeout(applyFit, 0);
    const observer = new ResizeObserver(applyFit);
    observer.observe(host);

    return () => {
      window.clearTimeout(initialFit);
      observer.disconnect();
      terminal.dispose();
      termRef.current = null;
      fitRef.current = null;
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

  const focusTerminal = () => {
    fitRef.current?.fit();
    termRef.current?.focus();
  };

  return (
    <div>
      <div ref={hostRef} style={{ height: 440 }} onClick={focusTerminal} />
      <p style={{ fontSize: 12, opacity: 0.7, margin: "6px 2px 0" }}>
        Power users can type directly into the terminal above; everyone else can use the prompt box below.
      </p>
    </div>
  );
}

function PromptComposer({ session, send }: { session: AgentSessionRecord; send: (command: MissionCommand) => void }) {
  const [prompt, setPrompt] = useState("");

  const submit = () => {
    const text = prompt.trim();
    if (!text || session.state !== "running") return;
    // The sidecar owns delivery: it chunks a payload the TUI would otherwise
    // drop, brackets it as a paste once the session enabled ?2004h, and writes
    // the trailing CR last so it submits instead of inserting a newline.
    send({ type: "agent.session.input", sessionId: session.id, data: `${text}\r` });
    setPrompt("");
  };

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); submit(); }}
      style={{ display: "flex", gap: 8, marginTop: 8 }}
    >
      <input
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder={session.state === "running" ? "Type a prompt for the agent and press Enter..." : "Session has exited - start a new one to talk"}
        disabled={session.state !== "running"}
        style={{ flex: 1 }}
      />
      <button type="submit" disabled={session.state !== "running" || !prompt.trim()}>Send</button>
    </form>
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
          body="The sidecar has not spawned any PTY sessions. Start an allowlisted CLI agent above - the sidecar on 127.0.0.1:4310 must be running."
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
                {session.agentId} Â· {session.accessScope} Â· {session.state}
                {session.state === "exited" && session.exitCode !== null ? ` (${session.exitCode})` : ""}
              </button>
            ))}
          </div>
          <div className="panel" style={{ flex: 1, minWidth: 0, padding: 8 }}>
            {selected ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 12 }}>
                  <span>{selected.agentId} Â· ceiling {selected.accessScope} Â· {selected.cwd}</span>
                  {selected.state === "running" && (
                    <button type="button" onClick={() => send({ type: "agent.session.stop", sessionId: selected.id })}>Stop</button>
                  )}
                </div>
                <SessionTerminal key={selected.id} session={selected} send={send} />
                <PromptComposer key={`composer-${selected.id}`} session={selected} send={send} />
              </>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
