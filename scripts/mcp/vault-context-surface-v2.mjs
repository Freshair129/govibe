import { govibeRuntime } from "./runtime-core.mjs";
import { validateContextAuthorityRequest, validateContextAuthorityResponse } from "./context-authority-contract.mjs";
import { createTypedVaultContextMsp } from "./msp-vault-context-contracts.mjs";
import { handlesVaultContextTool, vaultContextToolCatalog } from "./vault-context-surface.mjs";

const resolveTool = vaultContextToolCatalog.find((tool) => tool.name === "govibe.context.resolve");
if (resolveTool) {
  Object.assign(resolveTool.inputSchema.properties, {
    taskId: { type: "string" },
    runId: { type: "string" },
    sessionId: { type: "string" },
    turnId: { type: "string" },
    sources: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: { id: { type: "string" }, version: { type: "string" }, hash: { type: "string" } },
        required: ["id", "version", "hash"],
      },
    },
    requiredReasonRefs: { type: "array", minItems: 1, items: { type: "string" } },
    relationAllowlist: { type: "array", minItems: 1, items: { type: "string" } },
    retrievalRadius: { type: "integer", minimum: 0, maximum: 6 },
    inclusions: { type: "array", items: { type: "string" } },
    exclusions: { type: "array", items: { type: "string" } },
    unresolvedAssumptions: { type: "array", items: { type: "string" } },
    budget: {
      type: "object",
      properties: { maxTokens: { type: "integer", minimum: 1 }, compaction: { type: "string" } },
      required: ["maxTokens"],
    },
    lineage: {
      type: "object",
      properties: { contextId: { type: "string" }, cacheId: { type: "string" }, parentContextId: { type: "string" } },
      required: ["contextId", "cacheId"],
    },
  });
  resolveTool.inputSchema.required = [
    "actor", "workspaceId", "workspacePath", "agentId", "contextProfile",
    "taskId", "runId", "sessionId", "turnId", "sources", "requiredReasonRefs",
    "relationAllowlist", "retrievalRadius", "budget", "lineage",
  ];
}

export { handlesVaultContextTool, vaultContextToolCatalog };

function asTextContent(text) {
  return [{ type: "text", text }];
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} is required.`);
  return value.trim();
}

export function createVaultContextToolHandlerV2(runtime) {
  return async function handleVaultContextToolV2(name, args = {}) {
    if (!handlesVaultContextTool(name)) return null;
    const actor = requireString(args.actor, "actor");
    const typed = createTypedVaultContextMsp(runtime?.mspClient);
    let result;

    switch (name) {
      case "govibe.vault.status":
        result = await typed.getVaultStatus({ ...args, actor });
        break;
      case "govibe.vault.mount":
        result = await typed.mountVault({ ...args, actor });
        break;
      case "govibe.context.resolve": {
        if (typeof runtime?.mspClient?.resolveContext !== "function") throw new Error("MSP context resolve capability is unavailable.");
        const contextAuthority = validateContextAuthorityRequest({ ...args, actor });
        const rawResult = await runtime.mspClient.resolveContext({
          actor,
          workspaceId: contextAuthority.identity.workspaceId,
          workspacePath: requireString(args.workspacePath, "workspacePath"),
          agentId: contextAuthority.identity.agentId,
          contextProfile: requireString(args.contextProfile, "contextProfile"),
          parentContextId: contextAuthority.lineage.parentContextId,
          workflowRef: args.workflowRef ?? null,
          stateKeys: args.stateKeys ?? [],
          knowledgeRefs: contextAuthority.knowledgeRefs,
          contextAuthority,
          mode: args.mode ?? "codev",
        });
        result = validateContextAuthorityResponse(rawResult, contextAuthority);
        break;
      }
      case "govibe.context.diff":
        result = await typed.diffContext({ ...args, actor });
        break;
      case "govibe.context.audit":
        result = await typed.auditContext({ ...args, actor });
        break;
      case "govibe.context.replay":
        if (typeof runtime?.mspClient?.replayContext !== "function") throw new Error("MSP context replay capability is unavailable.");
        result = await runtime.mspClient.replayContext({
          actor,
          context_id: requireString(args.contextId, "contextId"),
          cache_id: args.cacheId ?? null,
          run_id: args.runId ?? null,
          turn_id: args.turnId ?? null,
        });
        break;
      case "govibe.memory.promote":
        result = await typed.promoteMemory({ ...args, actor });
        break;
      default:
        return null;
    }

    return {
      content: asTextContent(`${name}: completed through typed MSP contract.`),
      structuredContent: { capability: name, ...result },
    };
  };
}

export const handleVaultContextTool = createVaultContextToolHandlerV2(govibeRuntime);
