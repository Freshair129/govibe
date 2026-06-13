export const serverInfo = {
  name: "govibe-mcp",
  version: "0.1.0",
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
        scope: { type: "string" },
        task: { type: "string" },
        mode: { type: "string", enum: ["doc", "plan", "audit", "atomic"] },
        executor: { type: "string" },
      },
      required: ["actor", "task"],
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
        contextTier: { type: "string" },
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
        mutationType: { type: "string" },
        payload: { type: "object" },
      },
      required: ["actor", "nodeId", "mutationType"],
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
];

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
    name: "Runbook GoVibe Multi-Agent",
    description: "Canonical multi-agent workflow runbook.",
    mimeType: "text/markdown",
    path: "docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md",
  },
];

export function getToolByName(name) {
  return toolCatalog.find((tool) => tool.name === name) ?? null;
}

export function getResourceByUri(uri) {
  return resourceCatalog.find((resource) => resource.uri === uri) ?? null;
}
