import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

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
      // Map agent_id to the agent field expected by the runtime
      const payload = { ...args, agent: args.agent_id };
      const response = await govibeRuntime.runAgent(payload);
      return {
        content: asTextContent(
          [
            "GoVibe agent execution completed through the shared launcher runtime.",
            "",
            `actor: ${args.actor ?? "unknown"}`,
            `project: ${args.project ?? "n/a"}`,
            `agent_id: ${args.agent_id ?? "n/a"}`,
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
    case "govibe.orchestrate.step": {
      const response = await govibeRuntime.runStep(args);
      return {
        content: asTextContent(
          [
            "GoVibe StEP executed with a real Definition-of-Done verification gate.",
            "",
            `actor: ${args.actor ?? "unknown"}`,
            `taskId: ${args.taskId ?? "n/a"}`,
            `agentId: ${args.agentId ?? "n/a"}`,
            `status: ${response.result.status}`,
            `attempts: ${response.result.attempts}`,
            `selfCheck: ${response.result.selfCheck?.verdict ?? "n/a"}`,
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
      const roadmap = await govibeRuntime.reloadRoadmap(args.source, args);
      const snapshot = govibeRuntime.getSnapshot();
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
          availableSources: snapshot.roadmapSources ?? [],
          activeSourcePath: snapshot.roadmap?.sourcePath ?? null,
          activeSourceScore: snapshot.roadmap?.score ?? null,
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
    case "govibe.roadmap.export": {
      const result = await govibeRuntime.exportRoadmapMarkdown(args);
      return {
        content: asTextContent(
          [
            "GoVibe roadmap snapshot exported to a Markdown artifact.",
            "",
            `source: ${result.source ?? "n/a"}`,
            `outputPath: ${result.outputPath}`,
            `tasks: ${result.taskCount}`,
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
    case "govibe.workspace.initialize": {
      const { stdout, stderr } = await execAsync("node scripts/agents/govibe-init.mjs", { cwd: workspaceRoot });
      return {
        content: asTextContent(
          [
            "GoVibe workspace initialization completed.",
            "",
            `actor: ${args.actor ?? "unknown"}`,
            "",
            stdout || stderr || "No output returned.",
          ].join("\n"),
        ),
        structuredContent: {
          capability: name,
          success: true,
          auditRef: buildAuditRef(name),
        },
      };
    }
    case "govibe.workspace.validate": {
      const { stdout, stderr } = await execAsync("node packages/govibe-core/bin/validate.mjs", { cwd: workspaceRoot });
      return {
        content: asTextContent(
          [
            "GoVibe workspace validation completed.",
            "",
            `actor: ${args.actor ?? "unknown"}`,
            "",
            stdout || stderr || "No output returned.",
          ].join("\n"),
        ),
        structuredContent: {
          capability: name,
          success: true,
          auditRef: buildAuditRef(name),
        },
      };
    }
    case "govibe.ingest.code": {
      const result = govibeRuntime.ingestCode(args);
      return {
        content: asTextContent(
          [
            "GoVibe translator ingested a document into GKS atoms.",
            "",
            `actor: ${args.actor ?? "unknown"}`,
            `atoms: ${result.atomCount}`,
            `atomsRef: ${result.atomsRef}`,
            `templateRef: ${result.templateRef}`,
            `templateConfidence: ${result.templateConfidence}`,
            result.needsConfirm?.length ? `needsConfirm: ${result.needsConfirm.join(", ")}` : "",
          ].filter(Boolean).join("\n"),
        ),
        structuredContent: { ...result },
      };
    }
    case "govibe.render": {
      const result = govibeRuntime.renderDocument(args);
      return {
        content: asTextContent(
          [
            "GoVibe translator rendered a document through the fidelity gate.",
            "",
            `actor: ${args.actor ?? "unknown"}`,
            `verdict: ${result.verdict}`,
            result.error ? `error: ${result.error}` : "",
            "",
            result.document ?? "(blocked — no document emitted)",
          ].filter(Boolean).join("\n"),
        ),
        structuredContent: { ...result },
      };
    }
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
