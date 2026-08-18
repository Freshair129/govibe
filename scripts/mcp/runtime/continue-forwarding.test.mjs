// TASK-PRD-024: drift guard for the shared continue forwarding contract.
// The AUD-02 defect was exactly this — a wrapper layer rebuilding the core
// call and silently dropping contextAuthority. Pin the contract.
import { describe, expect, it } from "vitest";

import { buildContinueForwardingArgs } from "./continue-forwarding.mjs";

describe("buildContinueForwardingArgs", () => {
  it("forwards the governed context fields, including contextAuthority", () => {
    const authority = { schemaVersion: "govibe-context-authority/v1" };
    const built = buildContinueForwardingArgs(
      { actor: "a", executor: "codex", agentId: "agent", contextProfile: "W-ctx", workflowId: "wf-1", parentContextId: "ctx-p", sessionId: "s", runId: "r", turnId: "t", contextAuthority: authority },
      "/workspace",
      "msp-client",
      ["hash"],
    );
    expect(built).toEqual({
      workspacePath: "/workspace",
      mspClient: "msp-client",
      actor: "a",
      executor: "codex",
      agentId: "agent",
      contextProfile: "W-ctx",
      workflowRef: "wf-1",
      parentContextId: "ctx-p",
      sessionId: "s",
      runId: "r",
      turnId: "t",
      trustedWorkspaceHashes: ["hash"],
      contextAuthority: authority,
    });
  });

  it("never drops contextAuthority to undefined defaults for the remaining fields", () => {
    const built = buildContinueForwardingArgs({ contextAuthority: { ok: true } }, "/w", null);
    expect(built.contextAuthority).toEqual({ ok: true });
    expect(built.actor).toBe("unknown");
    expect(built.contextProfile).toBe("V-ctx");
    expect(built.trustedWorkspaceHashes).toEqual([]);
  });
});
