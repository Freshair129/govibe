export const serverInfo = {
  name: "govibe-mcp",
  version: "0.2.0",
};

export const toolCatalog = [
  {
    name: "govibe.agent.run",
    description: "Run a governed GoVibe agent execution request.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        project: { type: "string" },
        agent_id: { type: "string" },
        scope: { type: "string" },
        task: { type: "string" },
        mode: { type: "string", enum: ["doc", "plan", "audit", "atomic"] },
        executor: { type: "string" },
      },
      required: ["actor", "task", "agent_id"],
    },
  },
  {
    name: "govibe.orchestrate.step",
    description: "Run one Standard Execution Packet (StEP): execute a task via an agent, verify it against a real Definition-of-Done gate, then advance or block the workflow.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        taskId: { type: "string" },
        agentId: { type: "string" },
        mode: { type: "string", enum: ["doc", "plan", "audit", "atomic"] },
        scope: { type: "string" },
        task: { type: "string" },
        lane: { type: "string" },
        executor: { type: "string" },
        localModel: { type: "string" },
        modelTier: { type: "string", enum: ["tiny", "default", "pro", "retry"] },
        contextSelectors: { type: "array", items: { type: "string" } },
        definitionOfDone: { type: "object" },
        maxAttempts: { type: "number" },
        budget: { type: "object" },
        complexity: { type: "string" },
        contextProfile: { type: "string", enum: ["T-ctx", "V-ctx", "W-ctx", "M-ctx"] },
      },
      required: ["actor", "taskId", "agentId"],
    },
  },
  {
    name: "govibe.docs.resolve",
    description: "Resolve approved GoVibe documents or bounded context packets.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        selectors: { type: "array", items: { type: "string" } },
        scope: { type: "string" },
        contextProfile: { type: "string", enum: ["T-ctx", "V-ctx", "W-ctx", "M-ctx"] },
      },
      required: ["actor", "selectors"],
    },
  },
  {
    name: "govibe.roadmap.load",
    description: "Load document-driven roadmap or backlog state.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        project: { type: "string" },
        source: { type: "string" },
        outputShape: { type: "string" },
        asOfValidAt: { type: "string" },
        asOfRecordedAt: { type: "string" },
      },
      required: ["actor"],
    },
  },
  {
    name: "govibe.roadmap.update",
    description: "Update roadmap progress, assignment, handoff, or verification state.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        project: { type: "string" },
        nodeId: { type: "string" },
        mutationType: { type: "string", enum: ["node.update", "assignment", "handoff", "verification", "reload"] },
        payload: { type: "object" },
        asOfValidAt: { type: "string" },
        asOfRecordedAt: { type: "string" },
      },
      required: ["actor", "nodeId", "mutationType"],
    },
  },
  {
    name: "govibe.roadmap.export",
    description: "Export the live roadmap snapshot to a task-level Markdown artifact under docs/roadmap.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        project: { type: "string" },
        source: { type: "string" },
        outputPath: { type: "string" },
        overwrite: { type: "boolean" },
        asOfValidAt: { type: "string" },
        asOfRecordedAt: { type: "string" },
      },
      required: ["actor"],
    },
  },
  {
    name: "govibe.deploy.vercel",
    description: "Trigger or inspect a Vercel-oriented deployment operation.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        project: { type: "string" },
        environment: { type: "string" },
        action: { type: "string" },
      },
      required: ["actor", "action"],
    },
  },
  {
    name: "govibe.workspace.initialize",
    description: "Prepare workspace vault bindings, .govibe state, the built-in scan skill, and MSP registration without scanning.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        workspacePath: { type: "string" },
        agentId: { type: "string" },
        globalPrivateVaultId: { type: "string" },
      },
      required: ["actor", "workspacePath"],
    },
  },
  {
    name: "govibe.workflow.continue",
    description: "Resolve pinned skill and MSP-mediated vault/context references into an executor-neutral replayable context packet.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        workspacePath: { type: "string" },
        executor: { type: "string", enum: ["claude-code", "codex", "crewai"] },
        agentId: { type: "string" },
        contextProfile: { type: "string", enum: ["T-ctx", "V-ctx", "W-ctx", "M-ctx"] },
        workflowId: { type: "string" },
        parentContextId: { type: "string" },
        sessionId: { type: "string" },
        runId: { type: "string" },
        turnId: { type: "string" },
      },
      required: ["actor", "workspacePath"],
    },
  },
  {
    name: "govibe.plan.create",
    description: "Create a durable dependency-validated workflow plan under workspace state.",
    inputSchema: { type: "object", properties: { actor: { type: "string" }, workspacePath: { type: "string" }, runId: { type: "string" }, tasks: { type: "array", items: { type: "object" } }, mode: { type: "string", enum: ["covibe", "codev"] } }, required: ["actor", "workspacePath", "tasks"] },
  },
  {
    name: "govibe.workflow.status",
    description: "Read the canonical GoVibe run snapshot without contacting an executor.",
    inputSchema: { type: "object", properties: { actor: { type: "string" }, workspacePath: { type: "string" }, runId: { type: "string" } }, required: ["actor", "workspacePath", "runId"] },
  },
  {
    name: "govibe.workspace.impact",
    description: "Traverse observed backlinks to explain direct and transitive impact from changed workspace artifacts.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        workspacePath: { type: "string" },
        paths: { type: "array", minItems: 1, items: { type: "string" } },
        changeType: { type: "string", enum: ["editorial", "schema_additive", "schema_breaking", "semantic_change", "authority_boundary_change", "runtime_behavior_change"], default: "semantic_change" },
        maxDistance: { type: "integer", minimum: 1, maximum: 8, default: 3 },
        minimumScore: { type: "number", minimum: 0, maximum: 1, default: 0.2 },
      },
      required: ["actor", "workspacePath", "paths"],
    },
  },
  {
    name: "govibe.docs.version",
    description: "Read the declared version of a workspace document.",
    inputSchema: { type: "object", properties: { actor: { type: "string" }, workspacePath: { type: "string" }, path: { type: "string" } }, required: ["actor", "workspacePath", "path"] },
  },
  {
    name: "govibe.review.run",
    description: "Run a read-only bounded workspace review.",
    inputSchema: { type: "object", properties: { actor: { type: "string" }, workspacePath: { type: "string" } }, required: ["actor", "workspacePath"] },
  },
  {
    name: "govibe.optimize.run",
    description: "Apply a deterministic optimization and return before/after measurements.",
    inputSchema: { type: "object", properties: { actor: { type: "string" }, mode: { type: "string", enum: ["covibe", "codev"] }, values: { type: "array", items: { type: "string" } }, strategy: { type: "string", enum: ["deduplicate_strings"] } }, required: ["actor", "values", "strategy"] },
  },
  {
    name: "govibe.workspace.scan",
    description: "Run an L1 inventory or canonical twelve-stage Deep Scan and submit knowledge/link candidates through MSP promotion.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        workspacePath: { type: "string" },
        deep: { type: "boolean" },
        runId: { type: "string" },
        resume: { type: "boolean" },
      },
      required: ["actor", "workspacePath"],
    },
  },
  {
    name: "govibe.workspace.validate",
    description: "Validate the current workspace against STD-Execution-Governance standards.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
      },
      required: ["actor"],
    },
  },
  {
    name: "govibe.doc.create",
    description: "Create a new GoVibe documentation file from a template.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string" },
        slug: { type: "string" },
        title: { type: "string" },
        owner: { type: "string" },
        complexity: { type: "string", enum: ["low", "medium", "high"] },
      },
      required: ["type", "slug", "title", "owner", "complexity"],
    },
  },
  {
    name: "govibe.ingest.code",
    description: "Create document/code atom candidates and submit governed knowledge promotion through MSP.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        repo: { type: "string" },
        repoPath: { type: "string" },
        content: { type: "string" },
        scope: { type: "string" },
      },
      required: ["actor"],
    },
  },
  {
    name: "govibe.render",
    description: "Render a document from governed knowledge references into a target template, gated by round-trip and semantic fidelity checks.",
    inputSchema: {
      type: "object",
      properties: {
        actor: { type: "string" },
        atomsRef: { type: "string" },
        templateRef: { type: "string" },
        selector: { type: "string" },
        hop: { type: "number" },
      },
      required: ["actor", "atomsRef"],
    },
  },
];

export const legacyAliasCatalog = [
  ["GoVibe:init", "govibe.workspace.initialize"],
  ["GoVibe:scan", "govibe.workspace.scan"],
  ["GoVibe:plan", "govibe.plan.create"],
  ["GoVibe:continue", "govibe.workflow.continue"],
  ["GoVibe:status", "govibe.workflow.status"],
  ["GoVibe:impact", "govibe.workspace.impact"],
  ["GoVibe:version", "govibe.docs.version"],
  ["RWANG:init", "govibe.workspace.initialize"],
  ["RWANG:scan", "govibe.workspace.scan"],
  ["RWANG:plan", "govibe.plan.create"],
  ["RWANG:continue", "govibe.workflow.continue"],
  ["RWANG:status", "govibe.workflow.status"],
  ["RWANG:impact", "govibe.workspace.impact"],
  ["RWANG:version", "govibe.docs.version"],
].map(([name, canonicalName]) => ({
  name,
  canonicalName,
  deprecated: true,
  description: `Deprecated compatibility alias for ${canonicalName}.`,
  inputSchema: toolCatalog.find((tool) => tool.name === canonicalName).inputSchema,
}));

toolCatalog.push(...legacyAliasCatalog);

export function resolveToolName(name) {
  return legacyAliasCatalog.find((tool) => tool.name === name)?.canonicalName ?? name;
}

export const resourceCatalog = [
  {
    uri: "govibe://docs/prd/platform-overview",
    name: "PRD GoVibe Platform Overview",
    description: "Primary product SSOT for the GoVibe platform.",
    mimeType: "text/markdown",
    path: "docs/PRD-GoVibe-Platform-Overview.md",
  },
  {
    uri: "govibe://docs/prd/mcp-orchestration",
    name: "PRD GoVibe MCP Orchestration",
    description: "Subsystem PRD for MCP as the primary orchestration interface.",
    mimeType: "text/markdown",
    path: "docs/PRD-GoVibe-MCP-Orchestration.md",
  },
  {
    uri: "govibe://docs/runbook/multi-agent",
    name: "GoVibe Multi-Agent Operational Guidance (Draft, Non-SOT)",
    description: "Draft, non-SOT multi-agent operational guidance. Canonical execution-governance authority: docs/STD-Execution-Governance.md.",
    mimeType: "text/markdown",
    path: "docs/operations/runbooks/RUNBOOK-GoVibe-Multi-Agent.md",
  },
  {
    uri: "govibe://roadmap/sources",
    name: "GoVibe Roadmap Sources",
    description: "Available roadmap source files under docs/roadmap.",
    mimeType: "application/json",
    path: "docs/roadmap",
  },
];

export function getToolByName(name) {
  return toolCatalog.find((tool) => tool.name === name) ?? null;
}

export function getResourceByUri(uri) {
  return resourceCatalog.find((resource) => resource.uri === uri) ?? null;
}
