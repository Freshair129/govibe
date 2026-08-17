import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseAgentRegistry } from "./runtime/agent-registry-service.mjs";
import { createRuntimeSnapshot, RuntimeSnapshotStore } from "./runtime/snapshot-store.mjs";
import { TemporalOverlayStore } from "./runtime/temporal-overlay-store.mjs";
import { MissionCommandRouter } from "./runtime/mission-command-router.mjs";
import { MemoryService } from "./runtime/memory-service.mjs";
import { AgentSessionService } from "./runtime/agent-session-service.mjs";
import { WorkflowNodeActionService } from "./runtime/workflow-node-action-service.mjs";
import { PmExportService } from "./runtime/pm-export-service.mjs";
import { WorkspaceService } from "./runtime/workspace-service.mjs";
import { TranslatorService } from "./runtime/translator-service.mjs";
import { OrchestrationService } from "./runtime/orchestration-service.mjs";
import { RoadmapService } from "./runtime/roadmap-service.mjs";
import { toolCatalog } from "./registry.mjs";
import { SessionTracker } from "../../packages/govibe-core/bin/session-tracker.mjs";
import {
  createExecutorRegistry,
  createGksClientFromEnvironment,
  createMspClientFromEnvironment,
} from "../../packages/govibe-core/src/index.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const roadmapDir = path.join(workspaceRoot, "docs", "roadmap");
const launcherScript = path.join(workspaceRoot, "scripts", "agents", "invoke-agent.ps1");
const agentRegistryPath = path.join(workspaceRoot, ".agents", "agent-registry.yaml");
function toRelativePath(fullPath) {
  return path.relative(workspaceRoot, fullPath).replaceAll("\\", "/");
}

function buildAuditRef(capability) {
  return `${capability}:${new Date().toISOString()}`;
}

function formatAgentRunResult(stdout, stderr, exitCode) {
  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    exitCode,
    ok: exitCode === 0,
  };
}

function configuredWorkspaceRoots() {
  if (!process.env.GOVIBE_ALLOWED_WORKSPACE_ROOTS) return [workspaceRoot];
  const roots = JSON.parse(process.env.GOVIBE_ALLOWED_WORKSPACE_ROOTS);
  if (!Array.isArray(roots) || roots.length === 0 || roots.some((root) => typeof root !== "string" || !path.isAbsolute(root))) {
    throw new Error("GOVIBE_ALLOWED_WORKSPACE_ROOTS must be a non-empty JSON array of absolute paths.");
  }
  return roots;
}

function configuredPathRoots(envName, defaultRoot) {
  if (!process.env[envName]) return [defaultRoot];
  const roots = JSON.parse(process.env[envName]);
  if (!Array.isArray(roots) || roots.length === 0 || roots.some((root) => typeof root !== "string" || !path.isAbsolute(root))) {
    throw new Error(`${envName} must be a non-empty JSON array of absolute paths.`);
  }
  return roots;
}

export class GovibeRuntime {
  constructor(options = {}) {
    this.snapshotStore = new RuntimeSnapshotStore(createRuntimeSnapshot(toolCatalog.map((tool) => ({
      id: tool.name,
      title: tool.name,
      description: tool.description,
      status: "registered",
      sourcePath: "scripts/mcp/registry.mjs",
    }))));
    this.sessionTracker = new SessionTracker(workspaceRoot);
    this.temporalOverlayStore = new TemporalOverlayStore();
    this.activeRoadmapSource = undefined;
    this.availableSources = [];
    this.mspClient = options.mspClient ?? createMspClientFromEnvironment();
    this.gksClient = options.gksClient ?? createGksClientFromEnvironment();
    this.executorRegistry = createExecutorRegistry(options.executorAdapters ?? {});
    this.allowedWorkspaceRoots = options.allowedWorkspaceRoots ?? configuredWorkspaceRoots();
    this.allowedRoadmapReadRoots = options.allowedRoadmapReadRoots ?? configuredPathRoots("GOVIBE_ROADMAP_READ_ROOTS", roadmapDir);
    this.allowedRoadmapWriteRoots = options.allowedRoadmapWriteRoots ?? configuredPathRoots("GOVIBE_ROADMAP_WRITE_ROOTS", roadmapDir);
    this.snapshot.providers = this.executorRegistry.inspect();
    this.workspaceService = new WorkspaceService({ workspaceRoot, allowedRoots: this.allowedWorkspaceRoots, snapshotStore: this.snapshotStore, mspClient: this.mspClient, gksClient: this.gksClient });
    this.translatorService = new TranslatorService({ workspaceRoot, appendTerminal: (type, text) => this.appendTerminal(type, text) });
    this.roadmapService = new RoadmapService({ snapshotStore: this.snapshotStore, temporalOverlayStore: this.temporalOverlayStore, allowedRoadmapReadRoots: this.allowedRoadmapReadRoots, allowedRoadmapWriteRoots: this.allowedRoadmapWriteRoots });
    this.orchestrationService = new OrchestrationService({ workspaceRoot, runAgent: (args) => this.runAgent(args), applyMutation: (args) => this.applyRoadmapMutation(args), appendTerminal: (type, text) => this.appendTerminal(type, text), logEvent: (name, payload) => this.sessionTracker.logEvent(name, payload), emit: (event) => this.emit(event) });
    this.memoryService = new MemoryService({ snapshotStore: this.snapshotStore, mspClient: this.mspClient });
    this.agentSessionService = options.agentSessionService ?? new AgentSessionService({ store: this.snapshotStore, allowedRoots: this.allowedWorkspaceRoots });
    this.workflowNodeActionService = options.workflowNodeActionService ?? new WorkflowNodeActionService({ store: this.snapshotStore, applyRoadmapMutation: (args) => this.applyRoadmapMutation(args), getSnapshot: () => this.snapshot });
    this.pmExportService = options.pmExportService ?? new PmExportService({ getSnapshot: () => this.snapshot });
    this.commandRouter = new MissionCommandRouter(this);
  }

  get snapshot() {
    return this.snapshotStore.getSnapshot();
  }

  set snapshot(value) {
    this.snapshotStore.replace(value);
  }

  async initialize() {
    const registryAgents = parseAgentRegistry(await readFile(agentRegistryPath, "utf8"));
    this.snapshot = { ...this.snapshot, agents: registryAgents, updatedAt: new Date().toISOString() };
    await this.reloadRoadmap();
    this.appendTerminal(
      "sys",
      `GoVibe runtime initialized with ${registryAgents.length} registered agents. Session ID: ${this.sessionTracker.sessionId}`,
    );
    return this.snapshot;
  }

  async initializeWorkspace(args = {}) {
    return this.workspaceService.initialize(args);
  }

  async continueWorkflow(args = {}) {
    return this.workspaceService.continue(args);
  }

  async createPlan(args = {}) {
    return this.workspaceService.createPlan(args);
  }

  async workflowStatus(args = {}) {
    return this.workspaceService.status(args);
  }

  async workspaceImpact(args = {}) {
    return this.workspaceService.impact(args);
  }

  async docsVersion(args = {}) {
    return this.workspaceService.version(args);
  }

  async reviewWorkspace(args = {}) {
    return this.workspaceService.review(args);
  }

  async optimize(args = {}) {
    return this.workspaceService.optimize(args);
  }

  async scanWorkspace(args = {}) {
    return this.workspaceService.scan(args);
  }

  subscribe(listener) {
    return this.snapshotStore.subscribe(listener);
  }

  emit(event) {
    this.snapshotStore.emit(event);
  }

  getSnapshot() {
    return this.snapshot;
  }

  appendTerminal(type, text) {
    this.snapshotStore.appendTerminal(type, text);
  }

  async discoverSources() { return this.roadmapService.discoverSources(); }
  async reloadRoadmap(explicitSource, options = {}) { return this.roadmapService.reloadRoadmap(explicitSource, options); }
  async previewMasterPlan(sourcePath) { return this.roadmapService.previewMasterPlan(sourcePath); }

  async closeSession() {
    return await this.sessionTracker.generateSummary();
  }

  async listRoadmapSources() {
    return this.discoverSources();
  }

  async resolveDocs(selectors = []) {
    const files = [];
    for (const selector of selectors) {
      const fullPath = path.isAbsolute(selector) ? selector : path.join(workspaceRoot, selector);
      files.push({
        path: toRelativePath(fullPath),
        mimeType: fullPath.endsWith(".html") ? "text/html" : "text/markdown",
        content: await readFile(fullPath, "utf8"),
      });
    }
    return files;
  }

  async runAgent(args = {}) {
    const psArgs = [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      launcherScript,
      "-Task",
      args.task ?? "",
      "-OutputFormat",
      args.outputFormat ?? "text",
    ];

    if (args.agent) psArgs.push("-AgentId", args.agent);
    if (args.scope) psArgs.push("-Scope", args.scope);
    if (args.mode) psArgs.push("-Mode", args.mode);
    if (args.executor) psArgs.push("-Executor", args.executor);
    if (args.localModel) psArgs.push("-LocalModel", args.localModel);
    if (args.retryLargerLocalModel) psArgs.push("-RetryLargerLocalModel");
    if (args.asJson) psArgs.push("-AsJson");

    const shell = process.platform === "win32" ? "powershell.exe" : "pwsh";
    const result = await new Promise((resolve, reject) => {
      const child = spawn(shell, psArgs, { cwd: workspaceRoot });
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
      child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
      child.on("error", reject);
      child.on("close", (exitCode) => resolve(formatAgentRunResult(stdout, stderr, exitCode ?? 1)));
    });

    this.appendTerminal("agent", `Agent run completed for ${args.agent_id ?? "resolved-agent"} (${args.scope ?? "no-scope"}).`);
    this.sessionTracker.logEvent("agent_run", { args, result });
    return {
      capability: "govibe.agent.run",
      auditRef: buildAuditRef("govibe.agent.run"),
      request: args,
      result,
    };
    }

  // Translator-core compatibility methods delegate to the isolated service.
  ingestCode(args = {}) {
    return this.translatorService.ingest(args);
  }

  renderDocument(args = {}) {
    return this.translatorService.render(args);
  }

  async runStep(args = {}) {
    return this.orchestrationService.run(args);
  }

  async applyRoadmapMutation(args = {}) { return this.roadmapService.applyRoadmapMutation(args); }
  async exportRoadmapMarkdown(args = {}) { return this.roadmapService.exportRoadmapMarkdown(args); }
  applyMissionEvent(event) { return this.roadmapService.applyMissionEvent(event); }

  async searchMemory(args = {}) { return this.memoryService.search(args); }
  selectMemory(args = {}) { return this.memoryService.select(args); }
  async forgetMemory(args = {}) { return this.memoryService.forget(args); }
  async runMemoryDecay(args = {}) { return this.memoryService.decayRun(args); }

  async startAgentSession(args = {}) { return this.agentSessionService.start(args); }
  inputAgentSession(args = {}) { return this.agentSessionService.input(args); }
  stopAgentSession(args = {}) { return this.agentSessionService.stop(args); }
  resizeAgentSession(args = {}) { return this.agentSessionService.resize(args); }

  async applyWorkflowNodeAction(args = {}) { return this.workflowNodeActionService.apply(args); }

  async exportPmTask(args = {}) { return this.pmExportService.exportTask(args); }
  async syncPmObserved(args = {}) { return this.pmExportService.syncObserved(args); }

  async handleMissionCommand(command) {
    return this.commandRouter.route(command);
  }

  // ── Usage data (token-monitor bridge) ───────────────────────────
  ingestUsageData(payload) {
    const q = payload.quota ?? payload;
    const usage = {
      overview: q.overview ?? {},
      overview_7d: q.overview_7d ?? {},
      models: q.models ?? {},
      models_7d: q.models_7d ?? {},
      code_usage: payload.code_usage ?? {},
      account_id: payload.account_id ?? "unknown",
      last_sync: new Date().toISOString(),
      source: payload.source ?? "unknown",
    };
    this._usageData = usage;
    this._usageHistory ??= [];
    this._usageHistory.push({ ...usage, ingested_at: new Date().toISOString() });
    if (this._usageHistory.length > 2016) this._usageHistory = this._usageHistory.slice(-2016);
    this.snapshotStore.patch({ usage });
    this.emit({ type: "usage.update", usage });
    return { ok: true, stored: true, history_length: this._usageHistory.length };
  }

  getUsageSnapshot() {
    if (this._usageData) return this._usageData;
    return { overview: {}, overview_7d: {}, models: {}, models_7d: {}, code_usage: {}, account_id: "none", last_sync: null, source: "none" };
  }

  getUsageHistory(days = 7) {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    return (this._usageHistory ?? []).filter((h) => h.ingested_at >= cutoff);
  }
}

export const govibeRuntime = new GovibeRuntime();
