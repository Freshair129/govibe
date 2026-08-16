/**
 * GLS-001 contract-drift guard for the `sessions` slice: the TypeScript
 * `AgentSessionRecord` and the runtime AgentSessionService must emit the same
 * fields, and the client buffer cap must equal the protocol's server-side cap.
 *
 * Compile-time link: `_keyCheck` is typed as
 * `Record<keyof AgentSessionRecord, true>`, so changing the TS type fails
 * type-checking here. The runtime side of the same key list is pinned by
 * scripts/mcp/runtime/agent-session-service.test.mjs ("carries exactly the
 * contract fields"), which asserts the identical sorted key list.
 */

import { describe, expect, it } from "vitest";
import { AGENT_SESSION_BUFFER_CHARS, type AgentSessionRecord } from "./mission";
import { emptyMissionSnapshot } from "./mission/snapshot-reducer";
// @ts-expect-error — .mjs module, no TS declaration
import { createRuntimeSnapshot } from "../scripts/mcp/runtime/snapshot-store.mjs";
import { MISSION_PROTOCOL_LIMITS } from "../packages/mission-protocol/index.js";

const _keyCheck: Record<keyof AgentSessionRecord, true> = {
  id: true,
  agentId: true,
  cwd: true,
  state: true,
  accessScope: true,
  startedAt: true,
  buffer: true,
  exitCode: true,
};
void _keyCheck;

export const AGENT_SESSION_CONTRACT_KEYS = Object.keys(_keyCheck).sort();

describe("agent session contract parity (GLS-001)", () => {
  it("both snapshot factories initialise the sessions slice", () => {
    expect(emptyMissionSnapshot.sessions).toEqual([]);
    expect((createRuntimeSnapshot([]) as { sessions?: unknown[] }).sessions).toEqual([]);
  });

  it("pins the contract key list the runtime test must match", () => {
    expect(AGENT_SESSION_CONTRACT_KEYS).toEqual(["accessScope", "agentId", "buffer", "cwd", "exitCode", "id", "startedAt", "state"]);
  });

  it("client and protocol buffer caps agree", () => {
    expect(AGENT_SESSION_BUFFER_CHARS).toBe(MISSION_PROTOCOL_LIMITS.sessionBufferChars);
  });
});
