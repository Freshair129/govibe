import { govibeRuntime } from "./runtime-core.mjs";
import { createTypedVaultContextMsp } from "./msp-vault-context-contracts.mjs";
import { handlesVaultContextTool, vaultContextToolCatalog } from "./vault-context-surface.mjs";

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
      case "govibe.context.resolve":
        if (typeof runtime?.mspClient?.resolveContext !== "function") throw new Error("MSP context resolve capability is unavailable.");
        result = await runtime.mspClient.resolveContext({
          actor,
          workspaceId: requireString(args.workspaceId, "workspaceId"),
          workspacePath: requireString(args.workspacePath, "workspacePath"),
          agentId: requireString(args.agentId, "agentId"),
          contextProfile: requireString(args.contextProfile, "contextProfile"),
          parentContextId: args.parentContextId ?? null,
          workflowRef: args.workflowRef ?? null,
          stateKeys: args.stateKeys ?? [],
          knowledgeRefs: args.knowledgeRefs ?? [],
          mode: "codev",
        });
        break;
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
