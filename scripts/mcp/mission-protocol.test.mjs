import test from "node:test";
import assert from "node:assert/strict";

import { validateMissionCommand } from "./mission-protocol.mjs";

test("accepts valid workspace scan command", () => {
  assert.deepEqual(validateMissionCommand({
    type: "workspace.scan",
    workspacePath: "/tmp/workspace",
    deep: true,
    runId: "run-1",
  }), {
    type: "workspace.scan",
    workspacePath: "/tmp/workspace",
    deep: true,
    runId: "run-1",
  });
});

test("rejects unknown command type", () => {
  assert.throws(() => validateMissionCommand({ type: "system.destroy" }), /Unsupported mission command type/);
});

test("rejects wrong field types", () => {
  assert.throws(() => validateMissionCommand({ type: "workspace.scan", workspacePath: "/tmp", deep: "yes" }), /deep must be a boolean/);
});

test("rejects unknown fields", () => {
  assert.throws(() => validateMissionCommand({ type: "agent.select", agentId: "agent-1", admin: true }), /Unknown mission command field/);
});

test("rejects oversized file payload", () => {
  assert.throws(() => validateMissionCommand({
    type: "file.save",
    hash: "abc",
    data: new Array(1_000_001).fill(0),
    meta: {},
  }), /no larger than/);
});

test("rejects non-byte file values", () => {
  assert.throws(() => validateMissionCommand({ type: "file.save", hash: "abc", data: [0, 256], meta: {} }), /byte array/);
});
