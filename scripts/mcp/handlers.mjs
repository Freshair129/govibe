import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { govibeRuntime } from "./runtime-core.mjs";
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
    case "govibe.agent.run": {
      const response = await govibeRuntime.runAgent(args);
      return {
        content: asTextContent(
          [
            "GoVibe agent execution completed through the shared launcher runtime.",
            "",
            `actor: ${args.actor ?? "unknown"}`,
            `project: ${args.project ?? "n/a"}`,
            `scope: ${args.scope ?? "n/a"}`,
            `mode: ${args.mode ?? "n/a"}`,
            `executor: ${args.executor ?? "policy-resolved"}`,
            `task: ${args.task ?? "n/a"}`,
            "",
            response.result.stdout || response.result.stderr || "No output returned.",
          ].join("\n"),
        ),
        structuredContent: {
          ...response,
        },
      };
    }
    case "govibe.docs.resolve": {
      const packet = await govibeRuntime.resolveDocs(args.selectors ?? []);
      return {
        content: asTextContent(
          [
            "GoVibe docs resolver returned a bounded packet from approved selectors.",
            "",
            `actor: ${args.actor ?? "unknown"}`,
            `scope: ${args.scope ?? "n/a"}`,
            `contextTier: ${args.contextTier ?? "n/a"}`,
            `selectors: ${Array.isArray(args.selectors) ? args.selectors.join(", ") : "n/a"}`,
          ].join("\n"),
        ),
        structuredContent: {
          capability: name,
          selectors: args.selectors ?? [],
          packet,
          auditRef: buildAuditRef(name),
        },
      };
    }
    case "govibe.roadmap.load": {
      const roadmap = await govibeRuntime.reloadRoadmap(args.source);
      return {
        content: asTextContent(
          [
            "GoVibe roadmap loader returned a live document-driven snapshot.",
            "",
            `source: ${roadmap?.sourcePath ?? "none"}`,
            `nodes: ${roadmap?.nodes.length ?? 0}`,
            `assignments: ${roadmap?.assignments.length ?? 0}`,
          ].join("\n"),
        ),
        structuredContent: {
          capability: name,
          source: roadmap?.sourcePath ?? args.source ?? "docs/roadmap",
          outputShape: args.outputShape ?? "snapshot",
          roadmap,
          auditRef: buildAuditRef(name),
        },
      };
    }
    case "govibe.roadmap.update": {
      const result = await govibeRuntime.applyRoadmapMutation(args);
      return {
        content: asTextContent(
          [
            "GoVibe roadmap mutation applied to the live overlay state.",
            "",
            `nodeId: ${args.nodeId ?? "n/a"}`,
            `mutationType: ${args.mutationType ?? "n/a"}`,
          ].join("\n"),
        ),
        structuredContent: {
          ...result,
        },
      };
    }
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

  if (uri === "govibe://roadmap/sources") {
    return {
      contents: [
        {
          uri: resource.uri,
          mimeType: resource.mimeType,
          text: JSON.stringify(await govibeRuntime.listRoadmapSources(), null, 2),
        },
      ],
    };
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
