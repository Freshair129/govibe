import { describe, expect, it, vi } from "vitest";

import { GksClient, GksUnavailableError, createUnavailableGksClient } from "./gks-client.mjs";

const HASH = "a".repeat(64);

describe("GksClient", () => {
  it("writes versioned code knowledge through gks_code_upsert", async () => {
    const call = vi.fn(async () => ({ knowledge_ref: "gks:run-1/stage-5", source_hash: HASH }));
    const client = new GksClient(call);
    const input = {
      schema_version: "govibe-knowledge-batch/v1",
      idempotency_key: "run-1-stage-5",
      run_id: "run-1",
      stage: 5,
      source_snapshot_hash: HASH,
      provenance_ref: "msp:proof/run-1-stage-5",
      symbols: [{ name: "run", path: "src/run.ts" }],
      relations: [],
      atoms: [],
      context_snapshots: [],
    };

    await expect(client.upsertCodeKnowledge(input)).resolves.toEqual({
      knowledgeRef: "gks:run-1/stage-5",
      sourceHash: HASH,
    });
    expect(call).toHaveBeenCalledWith("gks_code_upsert", input);
  });

  it("rejects proof payloads at the GKS ownership boundary", async () => {
    const client = new GksClient(vi.fn());
    await expect(client.upsertCodeKnowledge({
      schema_version: "govibe-knowledge-batch/v1",
      idempotency_key: "run-1-stage-5",
      run_id: "run-1",
      stage: 5,
      source_snapshot_hash: HASH,
      provenance_ref: "msp:proof/run-1-stage-5",
      verification: { verdict: "pass" },
    })).rejects.toThrow(/proof fields/i);
  });

  it("fails closed when the GKS transport is unavailable", async () => {
    await expect(createUnavailableGksClient().upsertCodeKnowledge({})).rejects.toBeInstanceOf(GksUnavailableError);
  });
});
