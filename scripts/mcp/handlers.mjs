import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

import { govibeRuntime } from "./runtime-core.mjs";
import { getResourceByUri, resolveToolName } from "./registry.mjs";
import { enforceToolRbac } from "./runtime/rbac-enforcement.mjs";

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
  const canonicalName = resolveToolName(name);
  if (canonicalName !== name) {
    const result = await handleToolCall(canonicalName, args);
    return {
      ...result,
      content: asTextContent(`DEPRECATED: ${name} routes to ${canonicalName}.\n\n${result.content?.[0]?.text ?? ""}`),
      structuredContent: { ...result.structuredContent, legacyAlias: name, canonicalName, deprecated: true },
    };
  }
  // SPEC-Workspace-System §6: the RBAC decision point runs before any handler body. Denials
  // throw here, so an unauthorized call produces no tool side effects (TASK-PRD-016).
  await enforceToolRbac(name, args);
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
      const result = await govibeRuntime.initializeWorkspace(args);
      return {
        content: asTextContent(
          [
            "GoVibe workspace initialization completed.",
            "",
            `actor: ${args.actor ?? "unknown"}`,
            "",
            `workspace: ${result.workspacePath}`,
            `warnings: ${result.warnings.length}`,
          ].join("\n"),
        ),
        structuredContent: {
          capability: name,
          success: result.status === "prepared",
          ...result,
          auditRef: buildAuditRef(name),
        },
      };
    }
    case "govibe.workflow.continue": {
      const result = await govibeRuntime.continueWorkflow(args);
      return {
        content: asTextContent(`GoVibe workflow continue: ${result.status}.`),
        structuredContent: { capability: name, ...result, auditRef: buildAuditRef(name) },
      };
    }
    case "govibe.plan.create": {
      const result = await govibeRuntime.createPlan(args);
      return { content: asTextContent(`GoVibe plan created: ${result.runId}.`), structuredContent: { capability: name, ...result, auditRef: buildAuditRef(name) } };
    }
    case "govibe.workflow.status": {
      const result = await govibeRuntime.workflowStatus(args);
      return { content: asTextContent(`GoVibe workflow status: ${result.status}.`), structuredContent: { capability: name, ...result, auditRef: buildAuditRef(name) } };
    }
    case "govibe.workspace.impact": {
      const result = await govibeRuntime.workspaceImpact(args);
      return { content: asTextContent(`GoVibe impact references: ${result.references.length}.`), structuredContent: { capability: name, ...result, auditRef: buildAuditRef(name) } };
    }
    case "govibe.docs.version": {
      const result = await govibeRuntime.docsVersion(args);
      return { content: asTextContent(`GoVibe document version: ${result.version ?? "undeclared"}.`), structuredContent: { capability: name, ...result, auditRef: buildAuditRef(name) } };
    }
    case "govibe.review.run": {
      const result = await govibeRuntime.reviewWorkspace(args);
      return { content: asTextContent(`GoVibe read-only review inspected ${result.filesInspected} files.`), structuredContent: { capability: name, ...result, auditRef: buildAuditRef(name) } };
    }
    case "govibe.optimize.run": {
      const result = await govibeRuntime.optimize(args);
      return { content: asTextContent(`GoVibe optimize delta: ${result.delta}.`), structuredContent: { capability: name, ...result, auditRef: buildAuditRef(name) } };
    }
    case "govibe.workspace.scan": {
      const result = await govibeRuntime.scanWorkspace(args);
      // TASK-PRD-007 (F8): `result.observed` is the internal Deep Scan presentation accumulator
      // (packages/govibe-core/src/scan/stage-runner.mjs) that WorkspaceService.scan() already
      // used to patch snapshot.graph/.symbols -- it can carry thousands of full node/edge/symbol
      // objects (~0.5 MB measured on this repo). It must not ride on the tool's public MCP
      // response, or every deep-scan caller gets that injected into its context. Keep it internal
      // to the runtime; registry.mjs declares no outputSchema for this tool, so nothing else
      // strips it.
      const { observed: _observed, ...publicResult } = result;
      return {
        content: asTextContent(`GoVibe ${result.level} workspace scan: ${result.status}.`),
        structuredContent: { capability: name, ...publicResult, auditRef: buildAuditRef(name) },
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
      const result = await govibeRuntime.ingestCode(args);
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
    case "govibe.pm.export": {
      const result = await govibeRuntime.exportPmTask(args);
      return {
        content: asTextContent(
          [
            "GoVibe PM export projected a canonical task outbound.",
            "",
            `actor: ${args.actor ?? "unknown"}`,
            `taskId: ${args.taskId ?? "n/a"}`,
            `platform: ${args.platform ?? "n/a"}`,
            `externalId: ${result.externalId ?? "n/a"}`,
            `url: ${result.url ?? "n/a"}`,
            `fieldProjections: ${(result.fieldProjections ?? []).map((p) => `${p.field}=${p.state}`).join(", ")}`,
          ].join("\n"),
        ),
        structuredContent: { capability: name, ...result, auditRef: buildAuditRef(name) },
      };
    }
    case "govibe.pm.sync": {
      const candidates = await govibeRuntime.syncPmObserved(args);
      return {
        content: asTextContent(
          [
            "GoVibe PM sync returned observed update candidates for review (canonical state not modified).",
            "",
            `actor: ${args.actor ?? "unknown"}`,
            `platform: ${args.platform ?? "n/a"}`,
            `candidates: ${candidates.length}`,
          ].join("\n"),
        ),
        structuredContent: { capability: name, candidates, auditRef: buildAuditRef(name) },
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
