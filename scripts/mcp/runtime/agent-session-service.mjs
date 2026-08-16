import { existsSync } from "node:fs";
import path from "node:path";

import { MISSION_PROTOCOL_LIMITS } from "../../../packages/mission-protocol/index.js";

// ADR-029 §4: the console spawns only binaries from this explicit allowlist —
// never an arbitrary command received from the web surface.
export const DEFAULT_AGENT_SESSION_ALLOWLIST = Object.freeze({
  "claude-code": "claude",
  "codex": "codex",
});

const ACCESS_SCOPES = new Set(["H0", "H1", "H2", "H3", "H4"]);
const OUTPUT_CHUNK_CHARS = MISSION_PROTOCOL_LIMITS.commandChars;

export class AgentSessionService {
  #store;
  #allowlist;
  #allowedRoots;
  #spawnPty;
  #bufferChars;
  #sessions = new Map();

  constructor({ store, allowedRoots, allowlist = DEFAULT_AGENT_SESSION_ALLOWLIST, spawnPty, bufferChars = MISSION_PROTOCOL_LIMITS.sessionBufferChars }) {
    this.#store = store;
    this.#allowlist = allowlist;
    this.#allowedRoots = allowedRoots ?? [];
    this.#spawnPty = spawnPty;
    this.#bufferChars = bufferChars;
  }

  listSessions() {
    return [...this.#sessions.values()].map((entry) => ({ ...entry.record }));
  }

  async start({ agent, cwd, accessScope, approvalRef, cols = 120, rows = 32 }) {
    const binary = this.#allowlist[agent];
    if (!binary) {
      throw new Error(`Agent "${agent}" is not in the session allowlist (allowed: ${Object.keys(this.#allowlist).join(", ")}).`);
    }
    if (!ACCESS_SCOPES.has(accessScope)) {
      throw new Error(`Unknown access scope "${accessScope}". Sessions declare a ceiling of H0..H4 (ADR-021).`);
    }
    if (accessScope === "H4" && !approvalRef) {
      throw new Error("H4 sessions require a recorded owner approval (approvalRef) before start (ADR-029 §4).");
    }
    const resolvedCwd = path.resolve(cwd);
    if (!this.#cwdAllowed(resolvedCwd)) {
      throw new Error(`Session cwd is outside the allowed workspace roots: ${resolvedCwd}`);
    }
    if (!existsSync(resolvedCwd)) {
      throw new Error(`Session cwd does not exist: ${resolvedCwd}`);
    }

    const spawnPty = this.#spawnPty ?? (await import("@lydell/node-pty")).spawn;
    const pty = spawnPty(binary, [], { name: "xterm-color", cols, rows, cwd: resolvedCwd, env: process.env });

    const record = {
      id: crypto.randomUUID(),
      agentId: agent,
      cwd: resolvedCwd,
      state: "running",
      accessScope,
      startedAt: new Date().toISOString(),
      buffer: "",
      exitCode: null,
    };
    this.#sessions.set(record.id, { record, pty });

    pty.onData((data) => this.#appendOutput(record.id, String(data)));
    pty.onExit(({ exitCode }) => {
      record.state = "exited";
      record.exitCode = Number.isInteger(exitCode) ? exitCode : null;
      this.#publish();
    });

    this.#publish();
    return { ...record };
  }

  input({ sessionId, data }) {
    const entry = this.#requireSession(sessionId);
    if (entry.record.state !== "running") {
      throw new Error(`Session ${sessionId} has exited and no longer accepts input.`);
    }
    entry.pty.write(data);
    return { sessionId, accepted: true };
  }

  stop({ sessionId }) {
    const entry = this.#requireSession(sessionId);
    if (entry.record.state === "running") entry.pty.kill();
    return { ...entry.record };
  }

  #requireSession(sessionId) {
    const entry = this.#sessions.get(sessionId);
    if (!entry) throw new Error(`Unknown agent session: ${sessionId}`);
    return entry;
  }

  #cwdAllowed(resolvedCwd) {
    if (this.#allowedRoots.length === 0) return false;
    return this.#allowedRoots.some((root) => {
      const resolvedRoot = path.resolve(root);
      const relative = path.relative(resolvedRoot, resolvedCwd);
      return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
    });
  }

  #appendOutput(sessionId, data) {
    const entry = this.#sessions.get(sessionId);
    if (!entry) return;
    entry.record.buffer = (entry.record.buffer + data).slice(-this.#bufferChars);
    this.#store.patch({ sessions: this.listSessions() });
    for (let offset = 0; offset < data.length; offset += OUTPUT_CHUNK_CHARS) {
      this.#store.emit({ type: "agent.session.output", sessionId, data: data.slice(offset, offset + OUTPUT_CHUNK_CHARS) });
    }
  }

  #publish() {
    const sessions = this.listSessions();
    this.#store.patch({ sessions });
    this.#store.emit({ type: "sessions.update", sessions });
  }
}
