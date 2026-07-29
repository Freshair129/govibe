export class MspUnavailableError extends Error {
  constructor(message = "MSP transport is unavailable.") {
    super(message);
    this.name = "MspUnavailableError";
  }
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
    return this.appendProof({
      workspace_root: input.workspacePath,
      record_id: input.recordId,
      run_id: input.runId,
      provenance: { type: "workspace-registration", source_ref: `workspace:${input.workspaceId}` },
      evidence: [{ ref: `workspace:${input.workspaceId}`, source_hash: input.sourceHash }],
      verification: { verdict: "pass", method: "govibe-init" },
      actor: input.actor,
      timestamp: input.timestamp,
      source_hash: input.sourceHash,
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
  writeKnowledge(input) { return this.call("msp_knowledge_write", input); }
  appendProof(input) { return this.call("msp_proof_append", input); }
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
