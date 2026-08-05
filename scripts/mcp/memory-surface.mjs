// scripts/mcp/memory-surface: the govibe.memory.* MCP tool surface (WP-17
// Bounded Scope item 3), dispatched from govibe-mcp-server.mjs alongside the
// existing vault-context surface. Mirrors
// scripts/mcp/vault-context-surface.mjs's shape (tool catalog + handles* +
// createHandler), registering new tool entries into the shared toolCatalog
// exactly the way that file already does.
//
// govibe.memory.promote already exists in scripts/mcp/vault-context-surface.mjs
// (per docs/lld/LLD-GoVibe-MCP-Tools.md SS3.14: "already exists in the
// registry; reused, not duplicated"). This file does not define it, does not
// dispatch it, and does not register a second catalog entry for it.
import { govibeRuntime } from "./runtime-core.mjs";
import { toolCatalog } from "./registry.mjs";

function asTextContent(text) {
  return [{ type: "text", text }];
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} is required.`);
  return value.trim();
}

// docs/lld/LLD-GoVibe-MCP-Tools.md SS3.10-SS3.13 documents these four tools'
// required args with snake_case field names (vault_id, entity_id, dry_run),
// unlike govibe.vault.*/govibe.context.*'s camelCase convention -- this
// surface matches that already-approved LLD contract rather than
// standardizing it to the other surface's style unasked.
export const memoryToolCatalog = [
  {
    name: "govibe.memory.search",
    description: "Resolve a hybrid (FTS + vector, RRF-fused) memory search against the persistent-memory MSP runtime.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        vault_id: { type: "string" },
        query: { type: "string" },
        mode: { type: "string", enum: ["hybrid", "fts", "vector"] },
        limit: { type: "integer", minimum: 1 },
      },
      required: ["actor", "vault_id", "query"],
    },
  },
  {
    name: "govibe.memory.select",
    description: "Record a Mission Control operator's selection of a memory entity for detail viewing. Local snapshot state only; does not call the MSP runtime.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        entity_id: { type: "string" },
      },
      required: ["actor", "entity_id"],
    },
  },
  {
    name: "govibe.memory.forget",
    description: "Soft-delete a memory entity through the persistent-memory MSP runtime (lifecycle_state=forgotten; never a hard delete).",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        entity_id: { type: "string" },
        reason: { type: "string" },
      },
      required: ["actor", "entity_id", "reason"],
    },
  },
  {
    name: "govibe.memory.decay.run",
    description: "Trigger a decay tick against the persistent-memory MSP runtime. Caller/cron-triggered only -- the runtime never self-schedules.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        vault_id: { type: "string" },
        dry_run: { type: "boolean" },
      },
      required: ["actor", "vault_id"],
    },
  },
];

const memoryToolNames = new Set(memoryToolCatalog.map((tool) => tool.name));
for (const tool of memoryToolCatalog) {
  if (!toolCatalog.some((existing) => existing.name === tool.name)) toolCatalog.push(tool);
}

export function handlesMemoryTool(name) {
  return memoryToolNames.has(name);
}

export function createMemoryToolHandler(runtime) {
  return async function handleMemoryTool(name, args = {}) {
    if (!handlesMemoryTool(name)) return null;
    requireString(args.actor, "actor");
    let result;

    switch (name) {
      case "govibe.memory.search":
        result = await runtime.searchMemory({
          vault_id: requireString(args.vault_id, "vault_id"),
          query: requireString(args.query, "query"),
          mode: args.mode,
          limit: args.limit,
        });
        break;
      case "govibe.memory.select":
        result = runtime.selectMemory({ entity_id: requireString(args.entity_id, "entity_id") });
        break;
      case "govibe.memory.forget":
        result = await runtime.forgetMemory({
          entity_id: requireString(args.entity_id, "entity_id"),
          reason: requireString(args.reason, "reason"),
        });
        break;
      case "govibe.memory.decay.run":
        result = await runtime.runMemoryDecay({
          vault_id: requireString(args.vault_id, "vault_id"),
          dry_run: args.dry_run === true,
        });
        break;
      default:
        return null;
    }

    return {
      content: asTextContent(`${name}: completed through the persistent-memory MSP runtime.`),
      structuredContent: { capability: name, ...result },
    };
  };
}

export const handleMemoryTool = createMemoryToolHandler(govibeRuntime);
