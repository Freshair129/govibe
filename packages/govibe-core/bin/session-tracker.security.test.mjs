// TASK-PRD-028 (AUD-10c): session logs previously persisted full tool call args verbatim
// (e.g. runtime-core.mjs's `sessionTracker.logEvent("agent_run", { args, result })`), so a
// credential-bearing field passed as a tool argument would land in the durable .jsonl log.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { SessionTracker } from "./session-tracker.mjs";

const roots = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

async function tempRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "govibe-session-tracker-"));
  roots.push(root);
  return root;
}

describe("SessionTracker.logEvent redaction (TASK-PRD-028 / AUD-10c)", () => {
  it("redacts credential-shaped fields before persisting an event, at any nesting depth", async () => {
    const tracker = new SessionTracker(await tempRoot());
    await tracker.init();
    await tracker.logEvent("agent_run", {
      args: {
        task: "not a secret",
        connectorConfig: { apiKey: "plaintext-connector-key", nested: { access_token: "nested-secret" } },
        password: "hunter2",
        authorization: "Bearer plaintext-bearer",
      },
      result: { ok: true },
    });

    const logText = await readFile(tracker.logsPath, "utf8");
    for (const secret of ["plaintext-connector-key", "nested-secret", "hunter2", "plaintext-bearer"]) {
      expect(logText).not.toContain(secret);
    }
    expect(logText).toContain("not a secret");
    expect(logText).toContain("[REDACTED]");
  });

  it("keeps the in-memory event mirror redacted too, not just the file", async () => {
    const tracker = new SessionTracker(await tempRoot());
    await tracker.init();
    await tracker.logEvent("agent_run", { args: { token: "plaintext-token" } });
    expect(JSON.stringify(tracker.events)).not.toContain("plaintext-token");
  });
});
