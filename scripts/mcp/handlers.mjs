import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getResourceByUri } from "./registry.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function asTextContent(text) {
  return [{ type: "text", text }];
}

function formatObject(value) {
  return JSON.stringify(value, null, 2);
}

function buildAuditRef(capability) {
  const stamp = new Date().toISOString();
  return `${capability}:${stamp}`;
}

export async function handleToolCall(name, args = {}) {
  switch (name) {
    case "govibe.agent.run":
      return {
        content: asTextContent(
          [
            "GoVibe MCP agent execution scaffold accepted the request.",
            "",
            `actor: ${args.actor ?? "unknown"}`,
            `project: ${args.project ?? "n/a"}`,
            `scope: ${args.scope ?? "n/a"}`,
            `mode: ${args.mode ?? "n/a"}`,
            `executor: ${args.executor ?? "policy-resolved"}`,
            `task: ${args.task ?? "n/a"}`,
            "",
            "Next implementation step: bind this tool to the existing agent registry, prompt builder, and execution router.",
          ].join("\n"),
        ),
        structuredContent: {
          accepted: true,
          capability: name,
          auditRef: buildAuditRef(name),
          request: args,
        },
      };
    case "govibe.docs.resolve":
      return {
        content: asTextContent(
          [
            "GoVibe MCP docs resolution scaffold returned a bounded reference packet.",
            "",
            `actor: ${args.actor ?? "unknown"}`,
            `scope: ${args.scope ?? "n/a"}`,
            `contextTier: ${args.contextTier ?? "n/a"}`,
            `selectors: ${Array.isArray(args.selectors) ? args.selectors.join(", ") : "n/a"}`,
          ].join("\n"),
        ),
        structuredContent: {
          accepted: true,
          capability: name,
          selectors: args.selectors ?? [],
          auditRef: buildAuditRef(name),
        },
      };
    case "govibe.roadmap.load":
      return {
        content: asTextContent(
          [
            "GoVibe MCP roadmap load scaffold returned a placeholder document-driven snapshot.",
            "",
            "Mission Control should consume approved roadmap docs or explicit mission events rather than hardcoded arrays.",
          ].join("\n"),
        ),
        structuredContent: {
          accepted: true,
          capability: name,
          source: args.source ?? "docs/roadmap",
          outputShape: args.outputShape ?? "snapshot",
          auditRef: buildAuditRef(name),
        },
      };
    case "govibe.roadmap.update":
      return {
        content: asTextContent(
          [
            "GoVibe MCP roadmap update scaffold captured the requested mutation shape.",
            "",
            `nodeId: ${args.nodeId ?? "n/a"}`,
            `mutationType: ${args.mutationType ?? "n/a"}`,
            "",
            "Next implementation step: validate workflow transitions and emit normalized mission events.",
          ].join("\n"),
        ),
        structuredContent: {
          accepted: true,
          capability: name,
          nodeId: args.nodeId ?? null,
          mutationType: args.mutationType ?? null,
          payload: args.payload ?? {},
          auditRef: buildAuditRef(name),
        },
      };
    case "govibe.deploy.vercel":
      return {
        content: asTextContent(
          [
            "GoVibe MCP deployment scaffold accepted the Vercel-oriented deployment request.",
            "",
            `environment: ${args.environment ?? "n/a"}`,
            `action: ${args.action ?? "n/a"}`,
            "",
            "Next implementation step: bind this tool to governed Vercel CLI and GitHub deployment adapters.",
          ].join("\n"),
        ),
        structuredContent: {
          accepted: true,
          capability: name,
          environment: args.environment ?? null,
          action: args.action ?? null,
          auditRef: buildAuditRef(name),
        },
      };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function handleResourceRead(uri) {
  const resource = getResourceByUri(uri);
  if (!resource) {
    throw new Error(`Unknown resource: ${uri}`);
  }

  const filePath = path.resolve(workspaceRoot, resource.path);
  const text = await readFile(filePath, "utf8");

  return {
    contents: [
      {
        uri: resource.uri,
        mimeType: resource.mimeType,
        text,
      },
    ],
  };
}

export function describeCapabilitySurface() {
  return formatObject({
    orchestrationModel: "mcp-primary",
    callerSurfaces: ["mission-control-ui", "govibe-cli", "lead-agent", "automation"],
    policyModel: ["rbac", "abac"],
  });
}
