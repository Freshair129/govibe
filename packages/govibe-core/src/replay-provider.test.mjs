// Moved from tests/wp09-production-replay-kv.test.js (TASK-PRD-018 / AUD-26): the old location
// under tests/ was not collected by any runner (vitest.config.ts only collects src/**/*.test.ts,
// scripts/**/*.test.mjs, and packages/**/*.test.mjs). The replay-provider module it covers is
// still live and otherwise untested, so this is still-valuable coverage moved into a collected
// location rather than deleted.
//
// TASK-PRD-036 (CR-2026-08-19 D-04, AUD-21): replay-provider.mjs was the audit's only
// zero-consumer-zero-test module. D-04 approved pinning it with a contract test now while
// consumption stays deferred (recorded in docs/change-control/TODO-Execution-Binding-Lifecycle.md).
// The tests below extend the pre-existing restart/tamper coverage above with the two mismatch
// cases loadReplayBundle() checks but this file did not yet exercise (context_hash,
// source_manifest_hash), plus a test pinning API-006's "Replay" contract (docs/api/API-006-
// Vault-Context-and-Replay-Contracts.md §Replay): context reproducibility, execution
// reproducibility, and output identity must be reported as three DISTINCT booleans, never
// conflated. Note the three claims are *computed* by msp-client.mjs's replayContext() /
// msp-runtime's msp_context_replay handler (already covered by
// packages/msp-runtime/test/context-replay.test.mjs) — replay-provider.mjs's own contract is the
// bundle-persistence layer beneath that, so what this file pins is that restoreReplayContext()
// passes its caller's claims through opaquely, without replay-provider.mjs itself fabricating,
// merging, or dropping any of the three.
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

  it("detects persisted bundle tampering (bundle-hash integrity)", async () => {
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

  // TASK-PRD-036 (D-04): the two loadReplayBundle() silent-substitution checks the tests above
  // did not yet cover — context_hash and source_manifest_hash each refuse a mismatch.
  it("rejects replay under a different context hash or source manifest hash", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-replay-"));
    const provider = createFileReplayProvider({ rootPath: root });
    const { packet, injectionRecord } = fixture();
    const bundle = await persistReplayBundle({ provider, packet, injectionRecord, model: "model-v1", toolContractHash: HASH_A });

    await expect(loadReplayBundle({ provider, replayId: bundle.replay_id, expected: { contextHash: HASH_B } }))
      .rejects.toThrow("context hash mismatch");
    await expect(loadReplayBundle({ provider, replayId: bundle.replay_id, expected: { sourceManifestHash: HASH_A } }))
      .rejects.toThrow("source manifest mismatch");
  });

  // TASK-PRD-036 (D-04): API-006 "Replay" contract — context reproducibility, execution
  // reproducibility, and output identity are reported separately and must never be conflated.
  // replay-provider.mjs does not itself compute these (msp-client.mjs / msp-runtime's
  // msp_context_replay handler do, and are already tested for that computation); this pins that
  // restoreReplayContext() carries whatever its caller's inject() reports through opaquely, as
  // three independent booleans, rather than deriving or collapsing one from another.
  it("passes the three distinct replay claims through restoreReplayContext without conflating them", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "govibe-replay-"));
    const provider = createFileReplayProvider({ rootPath: root });
    const { packet, injectionRecord } = fixture();
    const bundle = await persistReplayBundle({ provider, packet, injectionRecord, model: "model-v1", toolContractHash: HASH_A });

    const restored = await restoreReplayContext({
      provider,
      replayId: bundle.replay_id,
      inject: async () => ({
        contextReproducible: true,
        executionReproducible: false,
        outputIdentical: false,
      }),
    });

    expect(restored.result.contextReproducible).toBe(true);
    expect(restored.result.executionReproducible).toBe(false);
    expect(restored.result.outputIdentical).toBe(false);
    // The point of the contract: reproducible context never implies reproducible execution or
    // identical output — a real cache hit with no execution authority is exactly this shape.
    expect(restored.result.executionReproducible).not.toBe(restored.result.contextReproducible);
    expect(restored.result.outputIdentical).not.toBe(restored.result.contextReproducible);
  });
});
