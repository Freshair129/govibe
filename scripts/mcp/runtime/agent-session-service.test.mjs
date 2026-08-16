import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { AgentSessionService, DEFAULT_AGENT_SESSION_ALLOWLIST, resolveSpawnCommand } from "./agent-session-service.mjs";
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
      kill() { this.killed = true; this.exitHandler?.({ exitCode: 0 }); },
    };
    spawned.push(pty);
    return pty;
  };
  return { spawnPty, spawned };
}

function serviceWith(overrides = {}) {
  const store = fakeStore();
  const { spawnPty, spawned } = fakePtyFactory();
  const allowedRoot = mkdtempSync(path.join(tmpdir(), "govibe-session-"));
  const service = new AgentSessionService({ store, allowedRoots: [allowedRoot], spawnPty, ...overrides });
  return { service, store, spawned, allowedRoot };
}

describe("AgentSessionService", () => {
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

  it("streams output events and caps the session buffer at the protocol limit", async () => {
    const { service, store, spawned, allowedRoot } = serviceWith();
    const record = await service.start({ agent: "codex", cwd: allowedRoot, accessScope: "H1" });
    spawned[0].dataHandler("hello ");
    spawned[0].dataHandler("world");
    expect(store.events.filter((event) => event.type === "agent.session.output")).toHaveLength(2);
    expect(store.snapshot.sessions[0].buffer).toBe("hello world");

    spawned[0].dataHandler("x".repeat(MISSION_PROTOCOL_LIMITS.sessionBufferChars + 500));
    expect(store.snapshot.sessions[0].buffer).toHaveLength(MISSION_PROTOCOL_LIMITS.sessionBufferChars);
    expect(service.listSessions()[0].id).toBe(record.id);
  });

  it("routes input to the pty and refuses input after exit", async () => {
    const { service, spawned, allowedRoot } = serviceWith();
    const record = await service.start({ agent: "claude-code", cwd: allowedRoot, accessScope: "H2" });
    service.input({ sessionId: record.id, data: "hi\r" });
    expect(spawned[0].written).toEqual(["hi\r"]);

    service.stop({ sessionId: record.id });
    expect(spawned[0].killed).toBe(true);
    expect(service.listSessions()[0]).toMatchObject({ state: "exited", exitCode: 0 });
    expect(() => service.input({ sessionId: record.id, data: "late" })).toThrow(/exited/);
  });

  it("resolves Windows npm shims through cmd.exe and unix binaries directly", () => {
    expect(resolveSpawnCommand("claude", "win32")).toEqual({ file: "cmd.exe", args: ["/d", "/s", "/c", "claude"] });
    expect(resolveSpawnCommand("claude", "linux")).toEqual({ file: "claude", args: [] });
  });

  it("throws on unknown session ids", () => {
    const { service } = serviceWith();
    expect(() => service.input({ sessionId: "nope", data: "x" })).toThrow(/Unknown agent session/);
    expect(() => service.stop({ sessionId: "nope" })).toThrow(/Unknown agent session/);
  });
});
