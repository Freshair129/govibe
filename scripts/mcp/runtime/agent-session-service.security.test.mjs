// TASK-PRD-028 (AUD-10a): a spawned PTY agent session must never inherit the sidecar's full
// process.env — server secrets (GOVIBE_MCP_TOKEN, GOVIBE_MSP_*) must be absent from the PTY
// child's environment even when they are set on the parent process.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AgentSessionService } from "./agent-session-service.mjs";

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
      binary, args, options, written: [], killed: false,
      onData() {}, onExit() {}, write() {}, resize() {}, kill() {},
    };
    spawned.push(pty);
    return pty;
  };
  return { spawnPty, spawned };
}

describe("AgentSessionService — child env allowlist (TASK-PRD-028 / AUD-10a)", () => {
  const secretEnvKeys = ["GOVIBE_MCP_TOKEN", "GOVIBE_MSP_TOKEN", "GOVIBE_MSP_API_KEY", "GOVIBE_GKS_TOKEN"];
  const originalValues = {};

  beforeEach(() => {
    for (const key of secretEnvKeys) {
      originalValues[key] = process.env[key];
      process.env[key] = `leaked-${key}`;
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    for (const key of secretEnvKeys) {
      if (originalValues[key] === undefined) delete process.env[key];
      else process.env[key] = originalValues[key];
    }
  });

  it("never passes the parent process.env (or its secrets) to the spawned PTY", async () => {
    const store = fakeStore();
    const { spawnPty, spawned } = fakePtyFactory();
    const allowedRoot = mkdtempSync(path.join(tmpdir(), "govibe-session-env-"));
    const service = new AgentSessionService({ store, allowedRoots: [allowedRoot], spawnPty, scheduleWrite: (cb) => cb() });

    await service.start({ agent: "claude-code", cwd: allowedRoot, accessScope: "H2" });

    expect(spawned).toHaveLength(1);
    const childEnv = spawned[0].options.env;
    expect(childEnv).not.toBe(process.env);
    for (const key of secretEnvKeys) {
      expect(childEnv).not.toHaveProperty(key);
    }
    expect(JSON.stringify(childEnv)).not.toContain("leaked-");
  });
});
