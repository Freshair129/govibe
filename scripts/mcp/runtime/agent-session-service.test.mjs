import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AgentSessionService,
  DEFAULT_AGENT_SESSION_ALLOWLIST,
  PASTE_END,
  PASTE_START,
  PTY_INPUT_CHUNK_CHARS,
  detectBracketedPaste,
  planPtyInput,
  resolveSpawnCommand,
} from "./agent-session-service.mjs";
import { MISSION_PROTOCOL_LIMITS } from "../../../packages/mission-protocol/index.js";

function fakeStore() {
  return {
    snapshot: {},
    events: [],
    patch(patch) { this.snapshot = { ...this.snapshot, ...patch }; return this.snapshot; },
    emit(event) { this.events.push(event); },
  };
}

function fakePtyFactory() {
  const spawned = [];
  const spawnPty = (binary, args, options) => {
    const pty = {
      binary,
      args,
      options,
      written: [],
      killed: false,
      dataHandler: undefined,
      exitHandler: undefined,
      onData(handler) { this.dataHandler = handler; },
      onExit(handler) { this.exitHandler = handler; },
      write(data) { this.written.push(data); },
      resized: [],
      resize(cols, rows) { this.resized.push([cols, rows]); },
      kill() { this.killed = true; this.exitHandler?.({ exitCode: 0 }); },
    };
    spawned.push(pty);
    return pty;
  };
  return { spawnPty, spawned };
}

// Input chunks are paced through a scheduler; drain them synchronously so
// assertions on `written` see the whole payload without waiting on timers.
function serviceWith(overrides = {}) {
  const store = fakeStore();
  const { spawnPty, spawned } = fakePtyFactory();
  const allowedRoot = mkdtempSync(path.join(tmpdir(), "govibe-session-"));
  const service = new AgentSessionService({
    store,
    allowedRoots: [allowedRoot],
    spawnPty,
    scheduleWrite: (callback) => callback(),
    ...overrides,
  });
  return { service, store, spawned, allowedRoot };
}

const ESC = String.fromCharCode(0x1b);
// What the TUI emits when it turns bracketed paste on, alongside the alternate
// screen buffer it enters at the same time.
const ENABLE_PASTE = `${ESC}[?1049h${ESC}[?2004h`;

describe("AgentSessionService", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("rejects an agent outside the allowlist without spawning", async () => {
    const { service, spawned, allowedRoot } = serviceWith();
    await expect(service.start({ agent: "netcat", cwd: allowedRoot, accessScope: "H2" }))
      .rejects.toThrow(/not in the session allowlist/);
    expect(spawned).toHaveLength(0);
  });

  it("rejects an H4 session without an approval reference", async () => {
    const { service, spawned, allowedRoot } = serviceWith();
    await expect(service.start({ agent: "claude-code", cwd: allowedRoot, accessScope: "H4" }))
      .rejects.toThrow(/owner approval/);
    expect(spawned).toHaveLength(0);
  });

  it("rejects an unknown access scope and a cwd outside the allowed roots", async () => {
    const { service, allowedRoot } = serviceWith();
    await expect(service.start({ agent: "claude-code", cwd: allowedRoot, accessScope: "H9" }))
      .rejects.toThrow(/access scope/);
    await expect(service.start({ agent: "claude-code", cwd: tmpdir(), accessScope: "H2" }))
      .rejects.toThrow(/allowed workspace roots/);
  });

  it("starts an allowlisted session, publishes it, and maps the binary from the allowlist", async () => {
    const { service, store, spawned, allowedRoot } = serviceWith();
    const record = await service.start({ agent: "claude-code", cwd: allowedRoot, accessScope: "H4", approvalRef: "ADR-029-ratification" });
    const expected = resolveSpawnCommand(DEFAULT_AGENT_SESSION_ALLOWLIST["claude-code"]);
    expect(spawned[0].binary).toBe(expected.file);
    expect(spawned[0].args).toEqual(expected.args);
    expect(record.state).toBe("running");
    expect(record.accessScope).toBe("H4");
    expect(store.snapshot.sessions).toHaveLength(1);
    expect(store.events.at(-1)).toMatchObject({ type: "sessions.update" });
  });

  it("carries exactly the contract fields pinned by missionSessionContract.test.ts", async () => {
    const { service, allowedRoot } = serviceWith();
    const record = await service.start({ agent: "claude-code", cwd: allowedRoot, accessScope: "H2" });
    expect(Object.keys(record).sort()).toEqual(["accessScope", "agentId", "buffer", "cwd", "exitCode", "id", "startedAt", "state"]);
  });

  it("streams output events and serializes a restorable screen within the protocol limit", async () => {
    const { service, store, spawned, allowedRoot } = serviceWith();
    const record = await service.start({ agent: "codex", cwd: allowedRoot, accessScope: "H1" });
    spawned[0].dataHandler("hello ");
    spawned[0].dataHandler("world");
    expect(store.events.filter((event) => event.type === "agent.session.output")).toHaveLength(2);

    // The buffer is a screen restore, not a raw tail: the text is present as the
    // terminal laid it out, and a reattaching client can replay it as-is.
    const screen = await service.flushScreen(record.id);
    expect(screen).toContain("hello world");
    expect(store.snapshot.sessions[0].buffer).toBe(screen);

    spawned[0].dataHandler(`${"filler line\r\n".repeat(4000)}tail marker`);
    const capped = await service.flushScreen(record.id);
    expect(capped.length).toBeLessThanOrEqual(MISSION_PROTOCOL_LIMITS.sessionBufferChars);
    // Dropping history to fit must never cost the current screen.
    expect(capped).toContain("tail marker");
    expect(service.listSessions()[0].id).toBe(record.id);
  });

  it("keeps the server screen at the client geometry, and stops once the session exits", async () => {
    const screenResizes = [];
    const { service, spawned, allowedRoot } = serviceWith({
      createScreen: async ({ cols, rows }) => {
        screenResizes.push(["open", cols, rows]);
        return {
          write: (_data, callback) => callback?.(),
          resize: (nextCols, nextRows) => screenResizes.push(["resize", nextCols, nextRows]),
          serialize: () => "",
          dispose: () => screenResizes.push(["dispose"]),
        };
      },
    });
    const record = await service.start({ agent: "claude-code", cwd: allowedRoot, accessScope: "H2" });
    expect(screenResizes).toEqual([["open", 120, 32]]);

    // Geometry must reach the screen as well as the pty, or a serialized restore
    // would rewrap at a width the client no longer uses.
    service.resize({ sessionId: record.id, cols: 40, rows: 10 });
    expect(spawned[0].resized).toEqual([[40, 10]]);
    expect(screenResizes.at(-1)).toEqual(["resize", 40, 10]);

    service.stop({ sessionId: record.id });
    service.resize({ sessionId: record.id, cols: 80, rows: 24 });
    expect(screenResizes.filter(([kind]) => kind === "resize")).toHaveLength(1);
  });

  it("routes input to the pty and refuses input after exit", async () => {
    const { service, spawned, allowedRoot } = serviceWith();
    const record = await service.start({ agent: "claude-code", cwd: allowedRoot, accessScope: "H2" });
    // The submit key is written separately so it lands after the text.
    service.input({ sessionId: record.id, data: "hi\r" });
    expect(spawned[0].written).toEqual(["hi", "\r"]);

    service.stop({ sessionId: record.id });
    expect(spawned[0].killed).toBe(true);
    expect(service.listSessions()[0]).toMatchObject({ state: "exited", exitCode: 0 });
    expect(() => service.input({ sessionId: record.id, data: "late" })).toThrow(/exited/);
  });

  it("resizes a running pty and no-ops after exit", async () => {
    const { service, spawned, allowedRoot } = serviceWith();
    const record = await service.start({ agent: "claude-code", cwd: allowedRoot, accessScope: "H2" });
    service.resize({ sessionId: record.id, cols: 120, rows: 31 });
    expect(spawned[0].resized).toEqual([[120, 31]]);
    service.stop({ sessionId: record.id });
    service.resize({ sessionId: record.id, cols: 120, rows: 32 });
    expect(spawned[0].resized).toEqual([[120, 31]]);
  });

  it("resolves Windows npm shims through cmd.exe and unix binaries directly", () => {
    expect(resolveSpawnCommand("claude", "win32")).toEqual({ file: "cmd.exe", args: ["/d", "/s", "/c", "claude"] });
    expect(resolveSpawnCommand("claude", "linux")).toEqual({ file: "claude", args: [] });
  });

  // Regression guard for the 2026-08-17 live finding: the Claude Code TUI
  // silently dropped a 94-char single-chunk write, so nothing ever echoed.
  it("splits a large injected prompt into small paced chunks the TUI accepts", async () => {
    const { service, spawned, allowedRoot } = serviceWith();
    const record = await service.start({ agent: "claude-code", cwd: allowedRoot, accessScope: "H2" });
    const prompt = "Summarise the repository governance rules and list every unmet readiness gate.";
    expect(prompt.length).toBeGreaterThan(PTY_INPUT_CHUNK_CHARS);

    const result = service.input({ sessionId: record.id, data: `${prompt}\r` });

    expect(spawned[0].written.length).toBeGreaterThan(1);
    expect(spawned[0].written.every((chunk) => chunk.length <= PTY_INPUT_CHUNK_CHARS)).toBe(true);
    expect(spawned[0].written.join("")).toBe(`${prompt}\r`);
    expect(result).toMatchObject({ accepted: true, chunks: spawned[0].written.length, pasteWrapped: false });
  });

  it("wraps an injected prompt in bracketed-paste markers once the TUI enables ?2004h", async () => {
    const { service, spawned, allowedRoot } = serviceWith();
    const record = await service.start({ agent: "claude-code", cwd: allowedRoot, accessScope: "H2" });
    spawned[0].dataHandler(ENABLE_PASTE);
    const prompt = "Summarise the repository governance rules and list every unmet readiness gate.";

    const result = service.input({ sessionId: record.id, data: `${prompt}\r` });

    const written = spawned[0].written;
    expect(result.pasteWrapped).toBe(true);
    // Markers must survive intact in their own writes, and the CR stays outside
    // the paste so it submits instead of inserting a newline.
    expect(written[0]).toBe(PASTE_START);
    expect(written.at(-2)).toBe(PASTE_END);
    expect(written.at(-1)).toBe("\r");
    expect(written.slice(1, -2).join("")).toBe(prompt);
    expect(written.every((chunk) => chunk.length <= PTY_INPUT_CHUNK_CHARS)).toBe(true);
  });

  it("leaves keystrokes untouched and never double-wraps a payload the client already bracketed", async () => {
    const { service, spawned, allowedRoot } = serviceWith();
    const record = await service.start({ agent: "claude-code", cwd: allowedRoot, accessScope: "H2" });
    spawned[0].dataHandler(ENABLE_PASTE);

    service.input({ sessionId: record.id, data: "a" });
    expect(spawned[0].written).toEqual(["a"]);

    const long = "x".repeat(70);
    service.input({ sessionId: record.id, data: `${PASTE_START}${long}${PASTE_END}` });
    expect(spawned[0].written.join("").slice(1)).toBe(`${PASTE_START}${long}${PASTE_END}`);
    expect(spawned[0].written.filter((chunk) => chunk === PASTE_START)).toHaveLength(1);
  });

  it("paces chunks across ticks by default and drops queued chunks when the session stops", async () => {
    vi.useFakeTimers();
    const { service, spawned, allowedRoot } = serviceWith({ scheduleWrite: undefined });
    const record = await service.start({ agent: "claude-code", cwd: allowedRoot, accessScope: "H2" });
    service.input({ sessionId: record.id, data: "y".repeat(200) });

    // A single tight loop of writes is exactly what the TUI dropped, so only the
    // first chunk may go out synchronously.
    expect(spawned[0].written).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(20);
    expect(spawned[0].written.length).toBeGreaterThan(1);

    const midFlight = spawned[0].written.length;
    service.stop({ sessionId: record.id });
    await vi.advanceTimersByTimeAsync(500);
    expect(spawned[0].written).toHaveLength(midFlight);
  });

  it("plans chunks, paste wrapping, and submit keys without a pty", () => {
    expect(planPtyInput("hi", { chunkChars: 4 })).toEqual({ chunks: ["hi"], pasteWrapped: false });
    expect(planPtyInput("\r", { chunkChars: 4 })).toEqual({ chunks: ["\r"], pasteWrapped: false });
    expect(planPtyInput("abcdefgh", { chunkChars: 4 }))
      .toEqual({ chunks: ["abcd", "efgh"], pasteWrapped: false });
    // Without an observed ?2004h the payload is chunked but never wrapped -
    // literal markers would render as garbage in an app that never asked.
    expect(planPtyInput("abcdefgh", { chunkChars: 4 }).pasteWrapped).toBe(false);
    expect(planPtyInput("abcdefgh\n", { bracketedPaste: true, chunkChars: 4 }))
      .toEqual({ chunks: [PASTE_START, "abcd", "efgh", PASTE_END, "\n"], pasteWrapped: true });
    // Control bytes mean this is a key sequence, not text to paste.
    expect(planPtyInput(`${ESC}[A${"z".repeat(10)}`, { bracketedPaste: true, chunkChars: 4 }).pasteWrapped).toBe(false);
  });

  it("tracks bracketed-paste mode from the pty output stream", () => {
    expect(detectBracketedPaste("plain output", false)).toBe(false);
    expect(detectBracketedPaste(ENABLE_PASTE, false)).toBe(true);
    expect(detectBracketedPaste(`${ESC}[?1049;2004h`, false)).toBe(true);
    expect(detectBracketedPaste(`${ESC}[?2004l`, true)).toBe(false);
    expect(detectBracketedPaste(`${ESC}[?1049h`, true)).toBe(true);
  });

  it("throws on unknown session ids", () => {
    const { service } = serviceWith();
    expect(() => service.input({ sessionId: "nope", data: "x" })).toThrow(/Unknown agent session/);
    expect(() => service.stop({ sessionId: "nope" })).toThrow(/Unknown agent session/);
  });
});
