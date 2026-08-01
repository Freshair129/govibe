import { describe, expect, it, vi } from "vitest";
import { materializeCanonicalKnowledge, validateCanonicalMaterializationRequest } from "../packages/govibe-core/src/canonical-materialization.mjs";

const hash = "a".repeat(64);
const request = {
  schema_version: "govibe-canonical-materialization-request/v1",
  actor: "ather",
  run_id: "run-1",
  idempotency_key: "materialize:run-1",
  source_snapshot_hash: hash,
  candidates: [
    { candidate_ref: "candidate:doc/1", kind: "document", source_hash: hash },
    { candidate_ref: "candidate:symbol/1", kind: "symbol", source_hash: hash },
  ],
};

function validResponse() {
  return {
    schema_version: "govibe-canonical-materialization-result/v1",
    materialization_ref: "msp:materialization/run-1",
    promotion_ref: "msp:promotion/run-1",
    graph_version: "gks-v42",
    source_hash: hash,
    mappings: [
      { candidate_ref: "candidate:doc/1", canonical_ref: "gks:document/alpha", source_hash: hash, version: "1" },
      { candidate_ref: "candidate:symbol/1", canonical_ref: "gks:symbol/beta", source_hash: hash, version: "1" },
    ],
    relations: [
      { relation_ref: "gks:relation/declares-1", from_ref: "gks:document/alpha", to_ref: "gks:symbol/beta", type: "declares", version: "1" },
    ],
  };
}

describe("canonical materialization", () => {
  it("submits through MSP and returns canonical mappings", async () => {
    const call = vi.fn().mockResolvedValue(validResponse());
    const result = await materializeCanonicalKnowledge({ mspClient: { call }, request });
    expect(call).toHaveBeenCalledWith("msp_knowledge_materialize", request);
    expect(result.mappings[0].canonicalRef).toBe("gks:document/alpha");
    expect(result.relations[0].type).toBe("declares");
  });

  it("rejects a canonical ref that reuses a candidate namespace", async () => {
    const response = validResponse();
    response.mappings[0].canonical_ref = "candidate:doc/1";
    await expect(materializeCanonicalKnowledge({ mspClient: { call: vi.fn().mockResolvedValue(response) }, request }))
      .rejects.toThrow(/canonical GKS reference/);
  });

  it("rejects incomplete candidate coverage", async () => {
    const response = validResponse();
    response.mappings.pop();
    await expect(materializeCanonicalKnowledge({ mspClient: { call: vi.fn().mockResolvedValue(response) }, request }))
      .rejects.toThrow(/complete candidate set/);
  });

  it("rejects relations to unmapped canonical endpoints", async () => {
    const response = validResponse();
    response.relations[0].to_ref = "gks:symbol/missing";
    await expect(materializeCanonicalKnowledge({ mspClient: { call: vi.fn().mockResolvedValue(response) }, request }))
      .rejects.toThrow(/endpoint is not present/);
  });

  it("requires candidate namespaces on input", () => {
    expect(() => validateCanonicalMaterializationRequest({
      ...request,
      candidates: [{ candidate_ref: "gks:document/not-a-candidate", kind: "document", source_hash: hash }],
    })).toThrow(/candidate namespace/);
  });
});
