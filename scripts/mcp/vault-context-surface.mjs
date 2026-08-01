import { govibeRuntime } from "./runtime-core.mjs";
import { toolCatalog } from "./registry.mjs";

const CONTEXT_PROFILES = ["T-ctx", "V-ctx", "W-ctx", "M-ctx"];

function asTextContent(text) {
  return [{ type: "text", text }];
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} is required.`);
  return value.trim();
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value;
}

function requireMsp(runtime) {
  if (!runtime?.mspClient || typeof runtime.mspClient.call !== "function") {
    throw new Error("MSP parent capability is unavailable.");
  }
  return runtime.mspClient;
}

export const vaultContextToolCatalog = [
  {
    name: "govibe.vault.status",
    description: "Read MSP-authoritative vault registration, bindings, mount, and availability status.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        workspaceId: { type: "string" },
        workspacePath: { type: "string" },
        agentId: { type: "string" },
      },
      required: ["actor", "workspaceId"],
    },
  },
  {
    name: "govibe.vault.mount",
    description: "Request an MSP-governed Shared Vault mount into a declared workspace.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        workspaceId: { type: "string" },
        workspacePath: { type: "string" },
        vaultId: { type: "string" },
        mountAlias: { type: "string" },
        accessMode: { type: "string", enum: ["read", "read_write"] },
        reason: { type: "string" },
      },
      required: ["actor", "workspaceId", "workspacePath", "vaultId", "mountAlias", "reason"],
    },
  },
  {
    name: "govibe.context.resolve",
    description: "Resolve an MSP-mediated T/V/W/M context assembly without injecting it into an executor.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        workspaceId: { type: "string" },
        workspacePath: { type: "string" },
        agentId: { type: "string" },
        contextProfile: { type: "string", enum: CONTEXT_PROFILES },
        parentContextId: { type: "string" },
        workflowRef: { type: "string" },
        stateKeys: { type: "array", items: { type: "string" } },
        knowledgeRefs: { type: "array", items: { type: "string" } },
      },
      required: ["actor", "workspaceId", "workspacePath", "agentId", "contextProfile"],
    },
  },
  {
    name: "govibe.context.diff",
    description: "Request an MSP-authoritative diff between two retained context assemblies.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        baseContextId: { type: "string" },
        targetContextId: { type: "string" },
        includePayload: { type: "boolean" },
      },
      required: ["actor", "baseContextId", "targetContextId"],
    },
  },
  {
    name: "govibe.context.audit",
    description: "Audit context lineage, source hashes, policy decisions, and replayability through MSP.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        contextId: { type: "string" },
        cacheId: { type: "string" },
        injectionId: { type: "string" },
      },
      required: ["actor", "contextId"],
    },
  },
  {
    name: "govibe.context.replay",
    description: "Request exact-source context replay verification through MSP.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        contextId: { type: "string" },
        cacheId: { type: "string" },
        runId: { type: "string" },
        turnId: { type: "string" },
      },
      required: ["actor", "contextId"],
    },
  },
  {
    name: "govibe.memory.promote",
    description: "Submit a governed memory-promotion request from Workspace Private memory to Global Private or Shared Vault scope.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        agentId: { type: "string" },
        workspaceId: { type: "string" },
        sourceMemoryRef: { type: "string" },
        targetScope: { type: "string", enum: ["global_private", "shared"] },
        candidate: { type: "object" },
        evidenceRefs: { type: "array", minItems: 1, items: { type: "string" } },
        reason: { type: "string" },
        idempotencyKey: { type: "string" },
      },
      required: ["actor", "agentId", "workspaceId", "sourceMemoryRef", "targetScope", "candidate", "evidenceRefs", "reason", "idempotencyKey"],
    },
  },
];

const commandNames = new Set(vaultContextToolCatalog.map((tool) => tool.name));
for (const tool of vaultContextToolCatalog) {
  if (!toolCatalog.some((existing) => existing.name === tool.name)) toolCatalog.push(tool);
}

export function handlesVaultContextTool(name) {
  return commandNames.has(name);
}

export function createVaultContextToolHandler(runtime) {
  return async function handleVaultContextTool(name, args = {}) {
    if (!handlesVaultContextTool(name)) return null;
    const msp = requireMsp(runtime);
    const actor = requireString(args.actor, "actor");
    let result;

    switch (name) {
      case "govibe.vault.status":
        result = await msp.call("msp_vault_status", {
          actor,
          workspace_id: requireString(args.workspaceId, "workspaceId"),
          workspace_path: args.workspacePath ?? null,
          agent_id: args.agentId ?? null,
        });
        break;
      case "govibe.vault.mount":
        result = await msp.call("msp_vault_mount", {
          actor,
          workspace_id: requireString(args.workspaceId, "workspaceId"),
          workspace_path: requireString(args.workspacePath, "workspacePath"),
          vault_id: requireString(args.vaultId, "vaultId"),
          mount_alias: requireString(args.mountAlias, "mountAlias"),
          access_mode: args.accessMode ?? "read",
          reason: requireString(args.reason, "reason"),
        });
        break;
      case "govibe.context.resolve":
        result = await msp.resolveContext({
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
        result = await msp.call("msp_context_diff", {
          actor,
          base_context_id: requireString(args.baseContextId, "baseContextId"),
          target_context_id: requireString(args.targetContextId, "targetContextId"),
          include_payload: args.includePayload === true,
        });
        break;
      case "govibe.context.audit":
        result = await msp.call("msp_context_audit", {
          actor,
          context_id: requireString(args.contextId, "contextId"),
          cache_id: args.cacheId ?? null,
          injection_id: args.injectionId ?? null,
        });
        break;
      case "govibe.context.replay":
        result = await msp.replayContext({
          actor,
          context_id: requireString(args.contextId, "contextId"),
          cache_id: args.cacheId ?? null,
          run_id: args.runId ?? null,
          turn_id: args.turnId ?? null,
        });
        break;
      case "govibe.memory.promote":
        result = await msp.call("msp_memory_promote", {
          schema_version: "govibe-memory-promotion/v1",
          actor,
          agent_id: requireString(args.agentId, "agentId"),
          workspace_id: requireString(args.workspaceId, "workspaceId"),
          source_memory_ref: requireString(args.sourceMemoryRef, "sourceMemoryRef"),
          target_scope: requireString(args.targetScope, "targetScope"),
          candidate: requireObject(args.candidate, "candidate"),
          evidence_refs: Array.isArray(args.evidenceRefs) && args.evidenceRefs.length > 0 ? args.evidenceRefs : (() => { throw new TypeError("evidenceRefs must contain at least one reference."); })(),
          reason: requireString(args.reason, "reason"),
          idempotency_key: requireString(args.idempotencyKey, "idempotencyKey"),
        });
        break;
      default:
        return null;
    }

    return {
      content: asTextContent(`${name}: completed through MSP.`),
      structuredContent: { capability: name, ...result },
    };
  };
}

export const handleVaultContextTool = createVaultContextToolHandler(govibeRuntime);
