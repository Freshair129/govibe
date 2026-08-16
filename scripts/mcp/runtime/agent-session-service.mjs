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

// How much history the server-side screen keeps. A reattaching client restores
// from the serialized screen, so this is the ceiling on what it can scroll back
// through, not a display setting.
export const SCREEN_SCROLLBACK_LINES = 400;

// A headless terminal parses the PTY stream exactly as the browser one does, so
// the serialized result is a real screen state rather than a severed tail of
// escape codes. This is the same pairing VS Code uses to persist terminals.
async function createHeadlessScreen({ cols, rows, scrollback }) {
  const [headless, serialize] = await Promise.all([
    import("@xterm/headless"),
    import("@xterm/addon-serialize"),
  ]);
  const Terminal = headless.Terminal ?? headless.default?.Terminal;
  const SerializeAddon = serialize.SerializeAddon ?? serialize.default?.SerializeAddon;
  const terminal = new Terminal({ cols, rows, scrollback, allowProposedApi: true });
  const serializer = new SerializeAddon();
  terminal.loadAddon(serializer);
  return {
    write: (data, callback) => terminal.write(data, callback),
    resize: (nextCols, nextRows) => terminal.resize(nextCols, nextRows),
    serialize: (options) => serializer.serialize(options),
    dispose: () => terminal.dispose(),
  };
}

const ESC = String.fromCharCode(0x1b);
export const PASTE_START = `${ESC}[200~`;
export const PASTE_END = `${ESC}[201~`;

// Live testing (2026-08-17) showed the Claude Code TUI silently discards a large
// single-chunk PTY write — a 94-char prompt never echoed — while small paced
// writes always land. Every payload is therefore split and drip-fed.
export const PTY_INPUT_CHUNK_CHARS = 32;
export const PTY_INPUT_CHUNK_DELAY_MS = 4;

const TRAILING_SUBMIT = /[\r\n]+$/;
// A private-mode set/reset can carry several parameters at once
// (ESC [ ? 1049 ; 2004 h), so read the whole parameter list.
const PRIVATE_MODE = new RegExp(`${ESC}\\[\\?([0-9;]*)([hl])`, "g");

function hasControlChar(text) {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function splitChunks(text, chunkChars) {
  const chunks = [];
  for (let offset = 0; offset < text.length; offset += chunkChars) {
    chunks.push(text.slice(offset, offset + chunkChars));
  }
  return chunks;
}

// Reads the terminal's own answer to "do you accept pastes?" out of the PTY
// output stream, so markers only ever reach an app that asked for them.
export function detectBracketedPaste(data, current) {
  let enabled = current;
  for (const [, params, action] of data.matchAll(PRIVATE_MODE)) {
    if (params.split(";").includes("2004")) enabled = action === "h";
  }
  return enabled;
}

// Turns one input payload into the ordered writes that reach the PTY: paste
// markers stay whole in their own write, the body is chunked, and a trailing
// CR/LF is kept outside the paste so it still submits instead of inserting a
// newline into the agent's composer.
export function planPtyInput(data, { bracketedPaste = false, chunkChars = PTY_INPUT_CHUNK_CHARS } = {}) {
  const submit = TRAILING_SUBMIT.exec(data)?.[0] ?? "";
  const body = submit ? data.slice(0, -submit.length) : data;
  const preWrapped = body.startsWith(PASTE_START) && body.endsWith(PASTE_END);
  const inner = preWrapped ? body.slice(PASTE_START.length, -PASTE_END.length) : body;
  // Single keystrokes and short typed bursts go through untouched; only payloads
  // too large for one write — programmatic injection — are paste-wrapped.
  const pasteWrapped = preWrapped
    || (bracketedPaste && inner.length > chunkChars && !hasControlChar(inner));

  const chunks = pasteWrapped
    ? [PASTE_START, ...splitChunks(inner, chunkChars), PASTE_END]
    : splitChunks(inner, chunkChars);
  if (submit) chunks.push(submit);
  return { chunks, pasteWrapped };
}

// npm-installed CLIs on Windows are .cmd/.ps1 shims, not .exe — ConPTY cannot
// CreateProcess them directly, so route through cmd.exe. The argument is always
// the fixed allowlist literal, never web input.
export function resolveSpawnCommand(binary, platform = process.platform) {
  return platform === "win32"
    ? { file: "cmd.exe", args: ["/d", "/s", "/c", binary] }
    : { file: binary, args: [] };
}

export class AgentSessionService {
  #store;
  #allowlist;
  #allowedRoots;
  #spawnPty;
  #bufferChars;
  #chunkChars;
  #chunkDelayMs;
  #schedule;
  #createScreen;
  #scrollbackLines;
  #sessions = new Map();

  constructor({
    store,
    allowedRoots,
    allowlist = DEFAULT_AGENT_SESSION_ALLOWLIST,
    spawnPty,
    bufferChars = MISSION_PROTOCOL_LIMITS.sessionBufferChars,
    inputChunkChars = PTY_INPUT_CHUNK_CHARS,
    inputChunkDelayMs = PTY_INPUT_CHUNK_DELAY_MS,
    scheduleWrite = (callback, delayMs) => setTimeout(callback, delayMs),
    createScreen = createHeadlessScreen,
    scrollbackLines = SCREEN_SCROLLBACK_LINES,
  }) {
    this.#store = store;
    this.#allowlist = allowlist;
    this.#allowedRoots = allowedRoots ?? [];
    this.#spawnPty = spawnPty;
    this.#bufferChars = bufferChars;
    this.#chunkChars = inputChunkChars;
    this.#chunkDelayMs = inputChunkDelayMs;
    this.#schedule = scheduleWrite;
    this.#createScreen = createScreen;
    this.#scrollbackLines = scrollbackLines;
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
    const command = resolveSpawnCommand(binary);
    const screen = await this.#createScreen({ cols, rows, scrollback: this.#scrollbackLines });
    const pty = spawnPty(command.file, command.args, { name: "xterm-color", cols, rows, cwd: resolvedCwd, env: process.env });

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
    // pending/draining/bracketedPaste are console-internal; they stay off the
    // record, which is pinned to the wire contract.
    this.#sessions.set(record.id, { record, pty, screen, pending: [], draining: false, bracketedPaste: false });

    pty.onData((data) => this.#appendOutput(record.id, String(data)));
    pty.onExit(({ exitCode }) => {
      record.state = "exited";
      record.exitCode = Number.isInteger(exitCode) ? exitCode : null;
      const entry = this.#sessions.get(record.id);
      if (entry) entry.pending.length = 0;
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
    const { chunks, pasteWrapped } = planPtyInput(data, {
      bracketedPaste: entry.bracketedPaste,
      chunkChars: this.#chunkChars,
    });
    entry.pending.push(...chunks);
    if (!entry.draining) this.#drain(entry);
    return { sessionId, accepted: true, chunks: chunks.length, pasteWrapped };
  }

  stop({ sessionId }) {
    const entry = this.#requireSession(sessionId);
    entry.pending.length = 0;
    if (entry.record.state === "running") entry.pty.kill();
    return { ...entry.record };
  }

  resize({ sessionId, cols, rows }) {
    const entry = this.#requireSession(sessionId);
    if (entry.record.state !== "running") return { sessionId, cols, rows };
    entry.pty.resize(cols, rows);
    // The server screen must track the client's geometry or the serialized
    // restore would rewrap at the wrong width on the next attach.
    entry.screen.resize(cols, rows);
    return { sessionId, cols, rows };
  }

  // Deterministic hook for callers that must observe the serialized screen right
  // after writing to it; xterm parses asynchronously.
  async flushScreen(sessionId) {
    const entry = this.#requireSession(sessionId);
    await new Promise((resolve) => entry.screen.write("", resolve));
    this.#refreshScreen(entry);
    return entry.record.buffer;
  }

  // One write per tick, in submission order across concurrent inputs. A pending
  // timer for an exited session drains to a no-op on its next fire.
  #drain(entry) {
    entry.draining = true;
    const chunk = entry.record.state === "running" ? entry.pending.shift() : undefined;
    if (chunk === undefined) {
      entry.pending.length = 0;
      entry.draining = false;
      return;
    }
    entry.pty.write(chunk);
    this.#schedule(() => this.#drain(entry), this.#chunkDelayMs);
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
    entry.bracketedPaste = detectBracketedPaste(data, entry.bracketedPaste);
    // Attached clients follow the live delta events; the screen is what a client
    // attaching later restores from.
    entry.screen.write(data, () => this.#refreshScreen(entry));
    for (let offset = 0; offset < data.length; offset += OUTPUT_CHUNK_CHARS) {
      this.#store.emit({ type: "agent.session.output", sessionId, data: data.slice(offset, offset + OUTPUT_CHUNK_CHARS) });
    }
  }

  // Replaces the record's buffer with a self-contained restore string. Falling
  // back to the viewport alone keeps an enormous scrollback inside the protocol
  // limit without severing escape sequences, which slicing raw output would.
  #refreshScreen(entry) {
    if (!entry.screen || !this.#sessions.has(entry.record.id)) return;
    let text = entry.screen.serialize({ scrollback: this.#scrollbackLines });
    if (text.length > this.#bufferChars) text = entry.screen.serialize({ scrollback: 0 });
    if (text.length > this.#bufferChars) text = text.slice(-this.#bufferChars);
    if (text === entry.record.buffer) return;
    entry.record.buffer = text;
    this.#store.patch({ sessions: this.listSessions() });
  }

  #publish() {
    const sessions = this.listSessions();
    this.#store.patch({ sessions });
    this.#store.emit({ type: "sessions.update", sessions });
  }
}
