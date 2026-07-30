import { describe, expect, it, vi } from "vitest";

import { MspClient } from "./msp-client.mjs";

const HASH = "b".repeat(64);

function proof(overrides = {}) {
  return {
    schema_version: "govibe-proof-batch/v1",
    idempotency_key: "proof-run-1-stage-5",
    run_id: "run-1",
    stage: 5,
    source_snapshot_hash: HASH,
    findings: [],
    stage_evidence: [{ ref: "inventory:l1", source_hash: HASH }],
    verification: { verdict: "passed", method: "tree-sitter" },
    artifact_lineage: [],
    ...overrides,
  };
}

describe("MSP evidence boundary", () => {
  it("records proof through msp_evidence_record", async () => {
    const call = vi.fn(async () => ({ proof_ref: "msp:proof/run-1-stage-5" }));
    const client = new MspClient(call);
    await expect(client.recordEvidence(proof())).resolves.toEqual({ proofRef: "msp:proof/run-1-stage-5" });
    expect(call).toHaveBeenCalledWith("msp_evidence_record", proof());
  });

  it("rejects GKS knowledge fields", async () => {
    const client = new MspClient(vi.fn());
    await expect(client.recordEvidence(proof({ symbols: [{ name: "unsafe" }] }))).rejects.toThrow(/knowledge fields/i);
  });

  it("rejects inferred verification states", async () => {
    const client = new MspClient(vi.fn());
    await expect(client.recordEvidence(proof({ verification: { verdict: "inferred", method: "guess" } }))).rejects.toThrow(/verification verdict/i);
  });
});
