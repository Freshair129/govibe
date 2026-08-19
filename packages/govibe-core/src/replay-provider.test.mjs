// Moved from tests/wp09-production-replay-kv.test.js (TASK-PRD-018 / AUD-26): the old location
// under tests/ was not collected by any runner (vitest.config.ts only collects src/**/*.test.ts,
// scripts/**/*.test.mjs, and packages/**/*.test.mjs). The replay-provider module it covers is
// still live and otherwise untested, so this is still-valuable coverage moved into a collected
// location rather than deleted. TASK-PRD-036 (planned) covers pinning replay-provider with a
// contract test for the replay-consumption path this file does not exercise; this file is the
// pre-existing restart/tamper coverage, not a duplicate of that future work.
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createFileReplayProvider, loadReplayBundle, persistReplayBundle, restoreReplayContext } from "./replay-provider.mjs";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function fixture() {
  return {
    packet: {
      contextId: "ctx_001",
      cacheId: "cache_001",
      contextHash: HASH_A,
      sourceManifestHash: HASH_B,
    },
    injectionRecord: { injection_id: "inject_001" },
  };
}

describe("WP-09 production replay provider", () => {
  it("survives provider recreation and restores KV payload", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-replay-"));
    const first = createFileReplayProvider({ rootPath: root });
    const { packet, injectionRecord } = fixture();
    const bundle = await persistReplayBundle({
      provider: first,
      packet,
      injectionRecord,
      model: "model-v1",
      toolContractHash: HASH_A,
      kvPayload: { layers: [1, 2, 3] },
    });

    const restarted = createFileReplayProvider({ rootPath: root });
    const restored = await restoreReplayContext({
      provider: restarted,
      replayId: bundle.replay_id,
      expected: { contextHash: HASH_A, sourceManifestHash: HASH_B, model: "model-v1", toolContractHash: HASH_A },
      inject: async (input) => input,
    });

    expect(restored.restored).toBe(true);
    expect(restored.result.kvPayload).toEqual({ layers: [1, 2, 3] });
  });

  it("rejects replay under a different model or tool contract", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-replay-"));
    const provider = createFileReplayProvider({ rootPath: root });
    const { packet, injectionRecord } = fixture();
    const bundle = await persistReplayBundle({ provider, packet, injectionRecord, model: "model-v1", toolContractHash: HASH_A });

    await expect(loadReplayBundle({ provider, replayId: bundle.replay_id, expected: { model: "model-v2" } })).rejects.toThrow("model mismatch");
    await expect(loadReplayBundle({ provider, replayId: bundle.replay_id, expected: { toolContractHash: HASH_B } })).rejects.toThrow("tool contract mismatch");
  });

  it("detects persisted bundle tampering", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-replay-"));
    const provider = createFileReplayProvider({ rootPath: root });
    const { packet, injectionRecord } = fixture();
    const bundle = await persistReplayBundle({ provider, packet, injectionRecord, model: "model-v1", toolContractHash: HASH_A });
    const target = path.join(root, `${bundle.replay_id}.json`);
    const value = JSON.parse(await readFile(target, "utf8"));
    value.model = "tampered";
    await writeFile(target, JSON.stringify(value));

    await expect(loadReplayBundle({ provider, replayId: bundle.replay_id })).rejects.toThrow("integrity check failed");
  });
});
