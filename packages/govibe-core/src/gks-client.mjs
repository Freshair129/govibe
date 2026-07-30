import { createMspStdioCaller } from "./msp-stdio-transport.mjs";

const HASH = /^[a-f0-9]{64}$/i;
const PROOF_FIELDS = ["evidence", "findings", "verification", "artifact_lineage", "stage_evidence"];

export class GksUnavailableError extends Error {
  constructor(message = "GKS transport is unavailable.") {
    super(message);
    this.name = "GksUnavailableError";
    this.code = "GKS_UNAVAILABLE";
  }
}

function validateBatch(input) {
  if (!input || typeof input !== "object") throw new TypeError("Knowledge batch is required.");
  if (PROOF_FIELDS.some((field) => field in input)) throw new TypeError("GKS knowledge batches cannot contain proof fields.");
  if (input.schema_version !== "govibe-knowledge-batch/v1") throw new TypeError("Invalid knowledge batch schema version.");
  if (typeof input.idempotency_key !== "string" || !input.idempotency_key) throw new TypeError("Knowledge batch idempotency key is required.");
  if (typeof input.run_id !== "string" || !input.run_id) throw new TypeError("Knowledge batch run ID is required.");
  if (!Number.isInteger(input.stage) || input.stage < 1 || input.stage > 12) throw new TypeError("Knowledge batch stage must be 1-12.");
  if (!HASH.test(input.source_snapshot_hash ?? "")) throw new TypeError("Knowledge batch source snapshot hash is invalid.");
  if (typeof input.provenance_ref !== "string" || !input.provenance_ref.startsWith("msp:")) throw new TypeError("Knowledge batch provenance_ref is invalid.");
}

export class GksClient {
  constructor(callTool) {
    this.callTool = callTool;
  }

  async upsertCodeKnowledge(input) {
    if (typeof this.callTool !== "function") throw new GksUnavailableError();
    validateBatch(input);
    const result = await this.callTool("gks_code_upsert", input);
    const knowledgeRef = result?.knowledge_ref ?? result?.knowledgeRef;
    const sourceHash = result?.source_hash ?? result?.sourceHash;
    if (typeof knowledgeRef !== "string" || !knowledgeRef.startsWith("gks:")) throw new Error("GKS returned an invalid knowledge reference.");
    if (typeof sourceHash !== "string" || !HASH.test(sourceHash)) throw new Error("GKS returned an invalid source hash.");
    return { knowledgeRef, sourceHash: sourceHash.toLowerCase() };
  }
}

export function createUnavailableGksClient() {
  return new GksClient(undefined);
}

export function createGksClientFromEnvironment(env = process.env) {
  if (!env.GOVIBE_GKS_COMMAND) return createUnavailableGksClient();
  const args = env.GOVIBE_GKS_ARGS ? JSON.parse(env.GOVIBE_GKS_ARGS) : [];
  if (!Array.isArray(args) || args.some((item) => typeof item !== "string")) throw new Error("GOVIBE_GKS_ARGS must be a JSON array of strings.");
  return new GksClient(createMspStdioCaller({ command: env.GOVIBE_GKS_COMMAND, args, cwd: env.GOVIBE_GKS_CWD, env }));
}
