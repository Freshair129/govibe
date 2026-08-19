// TASK-PRD-028 (AUD-10a / AUD-10c): the agent-launcher child process must never inherit the
// full parent process.env (server secrets included), and the session log persisted for the
// run must never carry a credential-shaped argument in the clear.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GovibeRuntime } from "./runtime-core.mjs";

const secretEnvKeys = ["GOVIBE_MCP_TOKEN", "GOVIBE_MSP_TOKEN", "GOVIBE_MSP_API_KEY"];
const originalValues = {};

beforeEach(() => {
  for (const key of secretEnvKeys) {
    originalValues[key] = process.env[key];
    process.env[key] = `leaked-${key}`;
  }
});

afterEach(() => {
  for (const key of secretEnvKeys) {
    if (originalValues[key] === undefined) delete process.env[key];
    else process.env[key] = originalValues[key];
  }
});

function fakeSpawnFactory() {
  const calls = [];
  const spawnProcess = (command, args, options) => {
    calls.push({ command, args, options });
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    queueMicrotask(() => child.emit("close", 0));
    return child;
  };
  return { spawnProcess, calls };
}

describe("GovibeRuntime.runAgent — child env allowlist and log redaction (TASK-PRD-028)", () => {
  it("spawns the agent launcher with an allowlisted env, never the full parent process.env", async () => {
    const { spawnProcess, calls } = fakeSpawnFactory();
    const runtime = new GovibeRuntime({ spawnProcess });

    await runtime.runAgent({ agent: "claude-code", task: "demo task", scope: "H1" });

    expect(calls).toHaveLength(1);
    const childEnv = calls[0].options.env;
    expect(childEnv).not.toBe(process.env);
    for (const key of secretEnvKeys) expect(childEnv).not.toHaveProperty(key);
    expect(JSON.stringify(childEnv)).not.toContain("leaked-");
  });

  it("redacts credential-shaped run args before they are persisted to the session log", async () => {
    const { spawnProcess } = fakeSpawnFactory();
    const runtime = new GovibeRuntime({ spawnProcess });
    // SessionTracker's constructor kicks off its own log-file init fire-and-forget; wait for
    // it (idempotent) so this test's assertions aren't racing that unrelated startup write.
    await runtime.sessionTracker.init();

    await runtime.runAgent({
      agent: "claude-code",
      task: "demo task",
      scope: "H1",
      connectorConfig: { apiKey: "plaintext-connector-secret", accountId: "not-a-secret" },
    });
    await runtime.sessionTracker.generateSummary();

    const logText = await readFile(runtime.sessionTracker.logsPath, "utf8");
    expect(logText).not.toContain("plaintext-connector-secret");
    expect(logText).toContain("not-a-secret");
    expect(logText).toContain("[REDACTED]");
  });
});
