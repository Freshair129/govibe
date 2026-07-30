export class MspUnavailableError extends Error {
  constructor(message = "MSP transport is unavailable.") {
    super(message);
    this.name = "MspUnavailableError";
  }
}

const HASH = /^[a-f0-9]{64}$/i;
const KNOWLEDGE_FIELDS = ["atoms", "symbols", "relations", "nodes", "edges", "communities", "processes", "context_snapshots"];

function validateProofBatch(input) {
  if (!input || typeof input !== "object") throw new TypeError("Proof batch is required.");
  if (KNOWLEDGE_FIELDS.some((field) => field in input)) throw new TypeError("MSP proof batches cannot contain knowledge fields.");
  if (input.schema_version !== "govibe-proof-batch/v1") throw new TypeError("Invalid proof batch schema version.");
  if (typeof input.idempotency_key !== "string" || !input.idempotency_key) throw new TypeError("Proof batch idempotency key is required.");
  if (typeof input.run_id !== "string" || !input.run_id) throw new TypeError("Proof batch run ID is required.");
  if (!Number.isInteger(input.stage) || input.stage < 0 || input.stage > 12) throw new TypeError("Proof batch stage must be 0-12.");
  if (!HASH.test(input.source_snapshot_hash ?? "")) throw new TypeError("Proof batch source snapshot hash is invalid.");
  if (!["actual", "blocked", "failed", "passed"].includes(input.verification?.verdict)) throw new TypeError("Invalid verification verdict.");
}

export class MspClient {
  constructor(callTool) {
    this.callTool = callTool;
  }

  async call(name, input) {
    if (typeof this.callTool !== "function") throw new MspUnavailableError();
    return this.callTool(name, input);
  }

  registerWorkspace(input) {
    return this.recordEvidence({
      schema_version: "govibe-proof-batch/v1",
      idempotency_key: input.recordId,
      run_id: input.runId,
      stage: 0,
      source_snapshot_hash: input.sourceHash,
      findings: [],
      stage_evidence: [{ ref: `workspace:${input.workspaceId}`, source_hash: input.sourceHash, kind: "workspace-registration" }],
      verification: { verdict: "passed", method: "govibe-init" },
      artifact_lineage: [],
      actor: input.actor,
      recorded_at: input.timestamp,
    });
  }
  async resolveContext(input) {
    const result = await this.call("msp_context_resolve", {
      workspace_root: input.workspacePath,
      mode: input.mode ?? "codev",
      state_keys: input.stateKeys,
      knowledge_refs: input.knowledgeRefs,
    });
    const normalizeRefs = (refs, label, prefix) => (refs ?? []).map((item) => {
      const ref = item?.ref;
      const sourceHash = item?.sourceHash ?? item?.source_hash;
      if (typeof ref !== "string" || !ref || typeof sourceHash !== "string" || !/^[a-f0-9]{64}$/i.test(sourceHash)) {
        throw new Error(`MSP returned an invalid ${label} reference.`);
      }
      if (!ref.startsWith(prefix)) throw new Error(`MSP returned an out-of-namespace ${label} reference.`);
      return { ref, sourceHash: sourceHash.toLowerCase() };
    });
    const policyDecisions = (result.policyDecisions ?? result.policy_decisions ?? []).map((item) => {
      if (!["allow", "deny", "shadow"].includes(item?.decision) || typeof item?.ref !== "string" || typeof item?.reason !== "string") {
        throw new Error("MSP returned an invalid policy decision.");
      }
      return { decision: item.decision, ref: item.ref, reason: item.reason };
    });
    return {
      globalStateRefs: normalizeRefs(result.globalStateRefs ?? result.global_state_refs, "Global state", "global:state/"),
      workspaceStateRefs: normalizeRefs(result.workspaceStateRefs ?? result.workspace_state_refs, "Workspace state", "workspace:state/"),
      knowledgeRefs: normalizeRefs(result.knowledgeRefs ?? result.knowledge_refs, "knowledge", "gks:"),
      policyDecisions,
      diagnostics: result.diagnostics ?? [],
    };
  }
  async recordEvidence(input) {
    if (typeof this.callTool !== "function") throw new MspUnavailableError();
    validateProofBatch(input);
    const result = await this.call("msp_evidence_record", input);
    const proofRef = result?.proof_ref ?? result?.proofRef;
    if (typeof proofRef !== "string" || !proofRef.startsWith("msp:proof/")) throw new Error("MSP returned an invalid proof reference.");
    return { proofRef };
  }
}

export function createUnavailableMspClient() {
  return new MspClient(undefined);
}

export function createMspClientFromEnvironment(env = process.env) {
  if (!env.GOVIBE_MSP_COMMAND) return createUnavailableMspClient();
  let args = [];
  if (env.GOVIBE_MSP_ARGS) {
    args = JSON.parse(env.GOVIBE_MSP_ARGS);
    if (!Array.isArray(args) || args.some((item) => typeof item !== "string")) {
      throw new Error("GOVIBE_MSP_ARGS must be a JSON array of strings.");
    }
  }
  return new MspClient(createMspStdioCaller({
    command: env.GOVIBE_MSP_COMMAND,
    args,
    cwd: env.GOVIBE_MSP_CWD,
    env,
  }));
}
import { createMspStdioCaller } from "./msp-stdio-transport.mjs";
