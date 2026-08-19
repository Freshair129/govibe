import { spawn as nodeSpawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolvePathWithinAnyRoot } from "./path-security.mjs";
import { buildAllowlistedChildEnv } from "./runtime/child-env.mjs";
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
  createApprovalRecordStore,
  createGksClientFromEnvironment,
  createLocalAgentDispatchGate,
  createMspClientFromEnvironment,
} from "../../packages/govibe-core/src/index.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const roadmapDir = path.join(workspaceRoot, "docs", "roadmap");
const launcherScript = path.join(workspaceRoot, "scripts", "agents", "invoke-agent.ps1");
const agentRegistryPath = path.join(workspaceRoot, ".agents", "agent-registry.yaml");

// TASK-PRD-031 (AUD-11): the real running server's default durable journal for roadmap
// overlay mutations. Overridable (e.g. by scripts/mcp/smoke-test.mjs's spawned server) so a
// throwaway run does not permanently pollute a developer's real overlay state.
//
// Review-gate finding 031-B: validated the same way configuredPathRoots() validates its own
// env-supplied paths — an absolute path only, with a named error, rather than silently
// resolving a relative override against whatever process.cwd() happens to be at boot.
function defaultTemporalOverlayJournalPath() {
  if (!process.env.GOVIBE_ROADMAP_OVERLAY_JOURNAL) return path.join(workspaceRoot, ".govibe", "roadmap-overlay.jsonl");
  if (!path.isAbsolute(process.env.GOVIBE_ROADMAP_OVERLAY_JOURNAL)) {
    throw new Error("GOVIBE_ROADMAP_OVERLAY_JOURNAL must be an absolute path.");
  }
  return process.env.GOVIBE_ROADMAP_OVERLAY_JOURNAL;
}
function toRelativePath(fullPath) {
  return path.relative(workspaceRoot, fullPath).replaceAll("\\", "/");
}

// TASK-PRD-029 (AUD-08): same opt-in pattern as defaultTemporalOverlayJournalPath — only the
// real singleton below points the approval-record store at a durable file under the repo's
// own `.govibe/`; a bare `new GovibeRuntime()` (unit tests) gets no store at all, which is the
// correct fail-closed default for gated (C-3/H4) actions rather than a throwaway file.
function defaultApprovalRecordPath() {
  if (!process.env.GOVIBE_APPROVAL_RECORD_PATH) return path.join(workspaceRoot, ".govibe", "approvals.jsonl");
  if (!path.isAbsolute(process.env.GOVIBE_APPROVAL_RECORD_PATH)) {
    throw new Error("GOVIBE_APPROVAL_RECORD_PATH must be an absolute path.");
  }
  return process.env.GOVIBE_APPROVAL_RECORD_PATH;
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

// TASK-PRD-035 (CR-2026-08-19 D-01): govibe.agent.run and StEP do not yet carry a live
// MSP-issued continue packet (no contextAuthority/contextLineage arrives on `args` today), so
// this builds the minimal honest per-dispatch identity the governed services require — a
// self-consistent set of ids, not a claim of MSP-mediated context authority. `sessionId` is the
// runtime's own stable per-process session id (real, not synthesized); `runId`/`turnId` are
// fresh per dispatch since there is no lineage to continue from yet.
function buildAgentRunDispatchIdentity(args, sessionId) {
  return {
    taskId: typeof args.task_id === "string" && args.task_id.trim() !== "" ? args.task_id : `adhoc-${randomUUID()}`,
    agentId: typeof args.agent === "string" && args.agent.trim() !== "" ? args.agent : (typeof args.agent_id === "string" && args.agent_id.trim() !== "" ? args.agent_id : "unassigned-agent"),
    workspaceId: typeof args.workspace_id === "string" && args.workspace_id.trim() !== "" ? args.workspace_id : "govibe-local-workspace",
    runId: randomUUID(),
    sessionId,
    turnId: randomUUID(),
  };
}

// Unwraps the governed run result (schema govibe-provider-run-result/v1) produced by
// spawnLauncher()'s output back into the classic {stdout,stderr,exitCode,ok} shape that
// step.mjs and handlers.mjs already depend on. A non-`completed` status means the gate itself
// refused or classified the dispatch as a provider-level failure before/without a usable
// artifact (e.g. governance denial surfaced as a thrown error further up, or a rare adapter
// failure classification) — reported as a failed result rather than fabricating output.
function extractAgentRunResult(dispatchResult) {
  if (dispatchResult.status !== "completed") {
    const failure = dispatchResult.normalized_errors?.[0];
    return formatAgentRunResult("", failure?.message ?? `agent dispatch ${dispatchResult.status}`, 1);
  }
  const artifact = dispatchResult.candidate?.artifacts?.[0] ?? {};
  return formatAgentRunResult(artifact.stdout ?? "", artifact.stderr ?? "", artifact.exitCode ?? 1);
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
    // No journalPath by default (in-memory only, matching pre-TASK-PRD-031 behavior) — only
    // the exported `govibeRuntime` singleton below opts in to a real durable journal.
    this.temporalOverlayStore = new TemporalOverlayStore({ journalPath: options.temporalOverlayJournalPath });
    // TASK-PRD-029 (AUD-08): no store by default (matching the temporal-overlay opt-in
    // pattern above) — only the exported `govibeRuntime` singleton points this at a real file.
    this.approvalRecordStore = options.approvalRecordStore
      ?? (options.approvalRecordPath ? createApprovalRecordStore({ storePath: options.approvalRecordPath }) : undefined);
    this.activeRoadmapSource = undefined;
    this.availableSources = [];
    this.mspClient = options.mspClient ?? createMspClientFromEnvironment();
    this.gksClient = options.gksClient ?? createGksClientFromEnvironment();
    // TASK-PRD-028 (AUD-10a): injectable so security tests can intercept the child's `env`
    // option without actually spawning powershell; the real singleton uses node:child_process.
    this.spawnProcess = options.spawnProcess ?? nodeSpawn;
    // TASK-PRD-035 (CR-2026-08-19 D-01, phase 1): the live agent-run dispatch gate. Wraps the
    // PowerShell launcher as a governed subscription-CLI provider target so govibe.agent.run and
    // StEP (which both call runAgent — see the orchestrationService wiring below) pass through
    // execution-capability-planner -> execution-router -> execution-binding-service ->
    // executor-adapter's scope-match gate instead of spawning directly. `this.executorRegistry`
    // is the SAME registry the gate dispatches through, so snapshot.providers reflects it.
    this.dispatchGate = options.dispatchGate ?? createLocalAgentDispatchGate({
      launcherScriptPath: launcherScript,
      additionalAdapters: options.executorAdapters ?? {},
      run: (request) => this.spawnLauncher(request),
    });
    this.executorRegistry = this.dispatchGate.executorRegistry;
    this.allowedWorkspaceRoots = options.allowedWorkspaceRoots ?? configuredWorkspaceRoots();
    this.allowedRoadmapReadRoots = options.allowedRoadmapReadRoots ?? configuredPathRoots("GOVIBE_ROADMAP_READ_ROOTS", roadmapDir);
    this.allowedRoadmapWriteRoots = options.allowedRoadmapWriteRoots ?? configuredPathRoots("GOVIBE_ROADMAP_WRITE_ROOTS", roadmapDir);
    this.snapshot.providers = this.executorRegistry.inspect();
    this.workspaceService = new WorkspaceService({ workspaceRoot, allowedRoots: this.allowedWorkspaceRoots, snapshotStore: this.snapshotStore, mspClient: this.mspClient, gksClient: this.gksClient });
    this.translatorService = new TranslatorService({ workspaceRoot, allowedRoots: this.allowedWorkspaceRoots, appendTerminal: (type, text) => this.appendTerminal(type, text) });
    this.roadmapService = new RoadmapService({ snapshotStore: this.snapshotStore, temporalOverlayStore: this.temporalOverlayStore, allowedRoadmapReadRoots: this.allowedRoadmapReadRoots, allowedRoadmapWriteRoots: this.allowedRoadmapWriteRoots });
    this.orchestrationService = new OrchestrationService({ workspaceRoot, runAgent: (args) => this.runAgent(args), applyMutation: (args) => this.applyRoadmapMutation(args), appendTerminal: (type, text) => this.appendTerminal(type, text), logEvent: (name, payload) => this.sessionTracker.logEvent(name, payload), emit: (event) => this.emit(event) });
    this.memoryService = new MemoryService({ snapshotStore: this.snapshotStore, mspClient: this.mspClient });
    this.agentSessionService = options.agentSessionService ?? new AgentSessionService({ store: this.snapshotStore, allowedRoots: this.allowedWorkspaceRoots, approvalStore: this.approvalRecordStore });
    this.workflowNodeActionService = options.workflowNodeActionService ?? new WorkflowNodeActionService({ store: this.snapshotStore, applyRoadmapMutation: (args) => this.applyRoadmapMutation(args), getSnapshot: () => this.snapshot, approvalStore: this.approvalRecordStore });
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
    // TASK-PRD-031 (AUD-11): replay the durable roadmap overlay journal BEFORE
    // reloadRoadmap() merges the overlay into the parsed roadmap, so mutations from
    // before a restart are visible in the very first snapshot. A no-op when this
    // instance has no journalPath configured.
    const overlayReplay = await this.temporalOverlayStore.load();
    if (overlayReplay.skipped > 0) {
      this.appendTerminal(
        "warn",
        `Roadmap overlay journal replay skipped ${overlayReplay.skipped} corrupt/truncated line(s) (${overlayReplay.loaded} replayed cleanly).`,
      );
    }
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
      // TASK-PRD-027 (AUD-05): previously honored an absolute path or a `..`-escaping
      // relative selector with no containment. resolvePathWithinAnyRoot rejects both BEFORE
      // any read, reusing the same containment helper and allowed-roots pattern already used
      // for roadmap reads/writes (scripts/mcp/runtime/roadmap-service.mjs).
      const fullPath = await resolvePathWithinAnyRoot(selector, this.allowedWorkspaceRoots, { basePath: workspaceRoot });
      files.push({
        path: toRelativePath(fullPath),
        mimeType: fullPath.endsWith(".html") ? "text/html" : "text/markdown",
        content: await readFile(fullPath, "utf8"),
      });
    }
    return files;
  }

  // The dispatch gate's `run` seam (TASK-PRD-035): spawns scripts/agents/invoke-agent.ps1
  // exactly as runAgent did before the gate was wired in — same args, same allowlisted child
  // env, same failure semantics (only a spawn error rejects; a non-zero exit is a normal
  // completed result). `request` is the executor-adapter's safe (credential-stripped) request,
  // which still carries the original agent-run args (task/agent/scope/mode/executor/...).
  async spawnLauncher(request) {
    const psArgs = [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      launcherScript,
      "-Task",
      request.task ?? "",
      "-OutputFormat",
      request.outputFormat ?? "text",
    ];

    if (request.agent) psArgs.push("-AgentId", request.agent);
    if (request.scope) psArgs.push("-Scope", request.scope);
    if (request.mode) psArgs.push("-Mode", request.mode);
    if (request.executor) psArgs.push("-Executor", request.executor);
    if (request.localModel) psArgs.push("-LocalModel", request.localModel);
    if (request.retryLargerLocalModel) psArgs.push("-RetryLargerLocalModel");
    if (request.asJson) psArgs.push("-AsJson");

    const shell = process.platform === "win32" ? "powershell.exe" : "pwsh";
    const result = await new Promise((resolve, reject) => {
      // TASK-PRD-028 (AUD-10a): an explicit allowlisted env, not the full parent process.env —
      // the spawned agent process never sees GOVIBE_MCP_TOKEN, GOVIBE_MSP_*, or other server secrets.
      const child = this.spawnProcess(shell, psArgs, { cwd: workspaceRoot, env: buildAllowlistedChildEnv() });
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
      child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
      child.on("error", reject);
      child.on("close", (exitCode) => resolve(formatAgentRunResult(stdout, stderr, exitCode ?? 1)));
    });

    // provider-adapters.mjs's baseResult() carries whatever this returns into
    // candidate.artifacts[0]; extractAgentRunResult() below reconstructs the classic
    // {stdout,stderr,exitCode,ok} shape from it after the gate normalizes the run result.
    return { artifacts: [result] };
  }

  async runAgent(args = {}) {
    const identity = buildAgentRunDispatchIdentity(args, this.sessionTracker.sessionId);
    const dispatchResult = await this.dispatchGate.dispatch({
      taskId: identity.taskId,
      agentId: identity.agentId,
      workspaceId: identity.workspaceId,
      runId: identity.runId,
      sessionId: identity.sessionId,
      turnId: identity.turnId,
      requestArgs: args,
    });
    const result = extractAgentRunResult(dispatchResult);

    this.appendTerminal("agent", `Agent run completed for ${args.agent_id ?? "resolved-agent"} (${args.scope ?? "no-scope"}).`);
    await this.sessionTracker.logEvent("agent_run", { args, result });
    return {
      capability: "govibe.agent.run",
      auditRef: buildAuditRef("govibe.agent.run"),
      request: args,
      result,
    };
  }

  // Translator-core compatibility methods delegate to the isolated service.
  async ingestCode(args = {}) {
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

// TASK-PRD-031 (AUD-11): the singleton the real MCP server process runs gets a real durable
// journal by default. Every other `new GovibeRuntime()` call site (unit tests, the
// smoke-test.mjs registry-introspection instance) stays in-memory-only unless it opts in.
export const govibeRuntime = new GovibeRuntime({
  temporalOverlayJournalPath: defaultTemporalOverlayJournalPath(),
  approvalRecordPath: defaultApprovalRecordPath(),
});
