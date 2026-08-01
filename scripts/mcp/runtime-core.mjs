import { spawn } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { discoverRoadmapSources, parseRoadmapSource } from "./roadmap-parser.mjs";
import { writeRoadmapMarkdownExport } from "./roadmap-exporter.mjs";
import { resolvePathWithinAnyRoot } from "./path-security.mjs";
import { parseAgentRegistry } from "./runtime/agent-registry-service.mjs";
import { createRuntimeSnapshot, RuntimeSnapshotStore } from "./runtime/snapshot-store.mjs";
import { latestTemporalByKey, TemporalOverlayStore } from "./runtime/temporal-overlay-store.mjs";
import { buildDag } from "./dag.mjs";
import { computeWaves } from "./wave.mjs";
import { runStep as executeStep } from "./step.mjs";
import { runVerifyGate } from "./verify-gate.mjs";
import { compareTemporalOrder, createTemporalVersion, nextVersion } from "./temporal-versioning.mjs";
import { toolCatalog } from "./registry.mjs";
import { SessionTracker } from "../../packages/govibe-core/bin/session-tracker.mjs";
import { atomize } from "./translator/atomizer.mjs";
import { extractTemplate } from "./translator/format-template.mjs";
import { render as renderFromTemplate, selectScope } from "./translator/renderer.mjs";
import { evaluate as evaluateFidelity } from "./translator/fidelity.mjs";
import { buildRecord as buildProvenance, appendRecord as appendProvenance } from "./translator/provenance.mjs";
import { atomizeCode, CODE_LANGS } from "./translator/code-atomizer.mjs";
import {
  assertPolicyAllows,
  continueWorkflow,
  createPolicyEnvelope,
  createExecutorRegistry,
  createWorkflowPlan,
  createGksClientFromEnvironment,
  createMspClientFromEnvironment,
  initializeWorkspace as prepareWorkspace,
  docsVersion,
  getWorkflowStatus,
  optimizeMeasured,
  readSkillDefinition,
  reviewWorkspace,
  scanWorkspace,
  transitionWorkflow,
  workspaceImpact,
} from "../../packages/govibe-core/src/index.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const roadmapDir = path.join(workspaceRoot, "docs", "roadmap");
const launcherScript = path.join(workspaceRoot, "scripts", "agents", "invoke-agent.ps1");
const agentRegistryPath = path.join(workspaceRoot, ".agents", "agent-registry.yaml");
const actionableRoadmapTypes = new Set(["task", "sub-task", "micro-task", "atomic-task"]);
const planningTypeWeights = {
  roadmap: 40,
  backlog: 30,
  sprint: 20,
  masterplan: 10,
};

function createEmptyOrchestration() {
  return { waves: [], updatedAt: new Date().toISOString() };
}

function gitPorcelain(cwd) {
  return new Promise((resolve) => {
    const child = spawn("git", ["status", "--porcelain"], { cwd });
    let out = "";
    child.stdout.on("data", (chunk) => { out += chunk.toString(); });
    child.on("error", () => resolve([]));
    child.on("close", () => resolve(out.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)));
  });
}

function toMissionScanRun(result) {
  const stageRuns = result.stageRuns?.map((stage) => ({
    stage: stage.stage,
    name: stage.name,
    status: stage.status,
    method: stage.method,
    confidence: stage.confidence,
    outputRefs: stage.outputRefs,
    error: stage.error,
  }));
  return {
    runId: result.runId,
    status: result.status,
    currentTask: result.status === "complete" ? null : stageRuns?.find((stage) => stage.status !== "complete" && stage.status !== "not_applicable")?.name ?? null,
    tasks: stageRuns?.map((stage) => ({ id: `stage-${stage.stage}`, status: stage.status, outputRefs: stage.outputRefs })) ?? [],
    kind: "scan",
    level: result.level,
    stageRuns,
    graphValidation: result.graphValidation ? { passed: result.graphValidation.passed, errors: result.graphValidation.errors } : undefined,
  };
}

function toRelativePath(fullPath) {
  return path.relative(workspaceRoot, fullPath).replaceAll("\\", "/");
}

function upsertByKey(items, nextItem, matcher) {
  const index = items.findIndex(matcher);
  if (index === -1) return [...items, nextItem];
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

function buildAuditRef(capability) {
  return `${capability}:${new Date().toISOString()}`;
}

function keyForHandoff(handoff) {
  return `${handoff.taskId}:${handoff.fromId}:${handoff.toId}`;
}

function ensureTemporalItem(item, fallback = {}) {
  const temporal = createTemporalVersion({
    version: item.version ?? fallback.version,
    validFrom: item.validFrom ?? fallback.validFrom,
    validTo: item.validTo ?? fallback.validTo,
    recordedAt: item.recordedAt ?? fallback.recordedAt,
    supersededAt: item.supersededAt ?? fallback.supersededAt,
  });
  return { ...item, ...temporal };
}

function validateTemporalItem(item, label) {
  const errors = compareTemporalOrder(item);
  if (errors.length > 0) {
    throw new Error(`${label}: ${errors.join(" ")}`);
  }
}

function getActionableDepth(parsed) {
  const taskCount = parsed.nodes.filter((node) => actionableRoadmapTypes.has(node.type)).length;
  if (taskCount > 0) {
    return {
      label: "task-rich",
      priority: 2,
      bonus: 20,
      taskCount,
      sprintCount: parsed.nodes.filter((node) => node.type === "sprint").length,
    };
  }

  const sprintCount = parsed.nodes.filter((node) => node.type === "sprint").length;
  if (sprintCount > 0) {
    return {
      label: "sprint-shaped",
      priority: 1,
      bonus: 10,
      taskCount: 0,
      sprintCount,
    };
  }

  return {
    label: "phase-only",
    priority: 0,
    bonus: 0,
    taskCount: 0,
    sprintCount: 0,
  };
}

function scoreApprovedSources(inventory, envPreferredPath) {
  const approvedItems = inventory.filter((item) => item.approvalStatus?.toLowerCase() === "approved");
  if (approvedItems.length === 0) {
    return inventory.map((item) => ({ ...item, score: undefined, scoreBreakdown: [] }));
  }

  const updatedTimes = approvedItems
    .map((item) => Date.parse(item.updatedAt ?? ""))
    .filter((value) => Number.isFinite(value));
  const newestUpdatedAt = updatedTimes.length > 0 ? Math.max(...updatedTimes) : undefined;
  const oldestUpdatedAt = updatedTimes.length > 0 ? Math.min(...updatedTimes) : undefined;
  const recencyRange = Number.isFinite(newestUpdatedAt) && Number.isFinite(oldestUpdatedAt)
    ? Math.max(1, newestUpdatedAt - oldestUpdatedAt)
    : 1;

  return inventory.map((item) => {
    if (item.approvalStatus?.toLowerCase() !== "approved") {
      return { ...item, score: undefined, scoreBreakdown: [] };
    }

    const planningType = item.planningType ?? "roadmap";
    const typeWeight = planningTypeWeights[planningType] ?? 0;
    const taskDepthScore = Math.min(item.taskCount ?? 0, 20);
    const updatedAtMs = Date.parse(item.updatedAt ?? "");
    const recencyScore = Number.isFinite(updatedAtMs) && Number.isFinite(newestUpdatedAt)
      ? Math.round(((updatedAtMs - oldestUpdatedAt) / recencyRange) * 20)
      : 0;
    const envOverride = envPreferredPath && item.path === envPreferredPath ? 1000 : 0;
    const scoreBreakdown = [
      "approved",
      planningType,
      item.actionableDepthLabel,
    ];
    if (envOverride > 0) scoreBreakdown.push("env override");
    if (recencyScore > 0) scoreBreakdown.push("recent");

    return {
      ...item,
      score: typeWeight + item.actionableDepthBonus + taskDepthScore + recencyScore + envOverride,
      scoreBreakdown,
    };
  });
}

function compareScoredSources(left, right) {
  const leftScore = left.score ?? -Infinity;
  const rightScore = right.score ?? -Infinity;
  if (leftScore !== rightScore) return rightScore - leftScore;
  if ((left.actionableDepthPriority ?? 0) !== (right.actionableDepthPriority ?? 0)) {
    return (right.actionableDepthPriority ?? 0) - (left.actionableDepthPriority ?? 0);
  }
  const leftUpdatedAt = Date.parse(left.updatedAt ?? "");
  const rightUpdatedAt = Date.parse(right.updatedAt ?? "");
  if (Number.isFinite(leftUpdatedAt) && Number.isFinite(rightUpdatedAt) && leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt - leftUpdatedAt;
  }
  return left.relativePath.localeCompare(right.relativePath);
}

async function buildRoadmapSourceInventory(sources) {
  const envPreferred = process.env.GOVIBE_ROADMAP_SOURCE;
  const envPreferredPath = envPreferred
    ? path.isAbsolute(envPreferred) ? envPreferred : path.join(workspaceRoot, envPreferred)
    : undefined;
  const inventory = await Promise.all(sources.map(async (source) => {
    const parsed = await parseRoadmapSource(source.path);
    const depth = getActionableDepth(parsed);
    return {
      path: source.path,
      relativePath: toRelativePath(source.path),
      name: source.name,
      transportType: source.sourceType,
      planningType: parsed.planningType ?? "roadmap",
      title: parsed.title ?? source.name,
      approvalStatus: parsed.approvalStatus ?? "draft",
      updatedAt: parsed.updatedAt,
      actionableDepthLabel: depth.label,
      actionableDepthPriority: depth.priority,
      actionableDepthBonus: depth.bonus,
      taskCount: depth.taskCount,
      sprintCount: depth.sprintCount,
      parsed,
    };
  }));

  return scoreApprovedSources(inventory, envPreferredPath).sort(compareScoredSources);
}

async function inferRoadmapSourcePath(explicitSource, sources, allowedRoots) {
  if (explicitSource) {
    const sourcePath = await resolvePathWithinAnyRoot(explicitSource, allowedRoots, { basePath: workspaceRoot });
    const parsed = await parseRoadmapSource(sourcePath);
    if (parsed.approvalStatus?.toLowerCase() !== "approved") {
      throw new Error(`Roadmap source '${toRelativePath(sourcePath)}' is not approved.`);
    }
    return sourcePath;
  }

  const rankedSources = await buildRoadmapSourceInventory(sources);
  const selectedSource = rankedSources.find((source) => source.approvalStatus?.toLowerCase() === "approved")?.path;
  return selectedSource
    ? resolvePathWithinAnyRoot(selectedSource, allowedRoots, { basePath: workspaceRoot })
    : undefined;
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

async function resolveDeclaredWorkspace(workspacePath, allowedRoots) {
  if (!workspacePath || !path.isAbsolute(workspacePath)) {
    throw new Error("workspacePath must be an absolute caller-declared root.");
  }
  const target = await realpath(path.normalize(workspacePath));
  const roots = await Promise.all(allowedRoots.map((root) => realpath(path.normalize(root))));
  const targetKey = process.platform === "win32" ? target.toLowerCase() : target;
  const allowed = roots.some((root) => {
    const rootKey = process.platform === "win32" ? root.toLowerCase() : root;
    const relative = path.relative(rootKey, targetKey);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  });
  if (!allowed) throw new Error(`workspacePath is outside configured GoVibe roots: ${target}`);
  return target;
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
    this.atomStore = new Map();      // translator-core slice: in-process atom store (ref -> atoms)
    this.templateStore = new Map();  // translator-core slice: in-process format templates
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
    const target = await resolveDeclaredWorkspace(args.workspacePath, this.allowedWorkspaceRoots);
    const builtInSkill = await readSkillDefinition(
      path.join(workspaceRoot, ".govibe", "skills", "block-decomposition", "1.0.0", "SKILL.md"),
    );
    const result = await prepareWorkspace({
      workspacePath: target,
      builtInSkill,
      mspClient: this.mspClient,
      actor: args.actor ?? "unknown",
    });
    this.appendTerminal("sys", `GoVibe workspace prepared at ${target}.`);
    return result;
  }

  async continueWorkflow(args = {}) {
    if (args.runId && args.taskId && args.status) {
      const target = await resolveDeclaredWorkspace(args.workspacePath, this.allowedWorkspaceRoots);
      const event = await transitionWorkflow({ workspacePath: target, runId: args.runId, taskId: args.taskId, status: args.status, idempotencyKey: args.idempotencyKey, verification: args.verification, outputRefs: args.outputRefs });
      const run = await getWorkflowStatus({ workspacePath: target, runId: args.runId });
      this.snapshot = { ...this.snapshot, workflowRuns: [...this.snapshot.workflowRuns.filter((item) => item.runId !== run.runId), run], updatedAt: new Date().toISOString() };
      this.emit({ type: "workflow.run", run });
      return { status: run.status, event, run };
    }
    const builtInSkill = await readSkillDefinition(
      path.join(workspaceRoot, ".govibe", "skills", "block-decomposition", "1.0.0", "SKILL.md"),
    );
    const result = await continueWorkflow({
      workspacePath: await resolveDeclaredWorkspace(args.workspacePath, this.allowedWorkspaceRoots),
      mspClient: this.mspClient,
      actor: args.actor ?? "unknown",
      executor: args.executor ?? "codex",
      trustedWorkspaceHashes: [builtInSkill.contentHash],
    });
    this.appendTerminal(result.status === "ready" ? "sys" : "warn", `GoVibe continue ${result.status}.`);
    return result;
  }

  async createPlan(args = {}) {
    const target = await resolveDeclaredWorkspace(args.workspacePath, this.allowedWorkspaceRoots);
    const result = await createWorkflowPlan({ workspacePath: target, runId: args.runId, tasks: args.tasks, policyEnvelope: createPolicyEnvelope(args.mode ?? "codev", args.actor ?? "unknown") });
    this.snapshot = { ...this.snapshot, workflowRuns: [...this.snapshot.workflowRuns.filter((run) => run.runId !== result.runId), result], updatedAt: new Date().toISOString() };
    this.emit({ type: "workflow.run", run: result });
    return result;
  }

  async workflowStatus(args = {}) {
    const target = await resolveDeclaredWorkspace(args.workspacePath, this.allowedWorkspaceRoots);
    const result = await getWorkflowStatus({ workspacePath: target, runId: args.runId });
    this.snapshot = { ...this.snapshot, workflowRuns: [...this.snapshot.workflowRuns.filter((run) => run.runId !== result.runId), result], updatedAt: new Date().toISOString() };
    return result;
  }

  async workspaceImpact(args = {}) {
    const target = await resolveDeclaredWorkspace(args.workspacePath, this.allowedWorkspaceRoots);
    return workspaceImpact({ workspacePath: target, paths: args.paths ?? [] });
  }

  async docsVersion(args = {}) {
    const target = await resolveDeclaredWorkspace(args.workspacePath, this.allowedWorkspaceRoots);
    return docsVersion({ workspacePath: target, path: args.path });
  }

  async reviewWorkspace(args = {}) {
    const target = await resolveDeclaredWorkspace(args.workspacePath, this.allowedWorkspaceRoots);
    return reviewWorkspace({ workspacePath: target });
  }

  async optimize(args = {}) {
    assertPolicyAllows(createPolicyEnvelope(args.mode ?? "covibe", args.actor ?? "unknown"), "optimize");
    if (args.strategy !== "deduplicate_strings" || !Array.isArray(args.values)) throw new Error("Unsupported optimize strategy.");
    let optimized = [...args.values];
    const result = await optimizeMeasured({ measureBefore: async () => args.values.length, optimize: async () => { optimized = [...new Set(args.values)]; }, measureAfter: async () => optimized.length });
    return { ...result, strategy: args.strategy, output: optimized };
  }

  async scanWorkspace(args = {}) {
    const result = await scanWorkspace({
      workspacePath: await resolveDeclaredWorkspace(args.workspacePath, this.allowedWorkspaceRoots),
      deep: args.deep === true,
      mspClient: this.mspClient,
      gksClient: this.gksClient,
      actor: args.actor ?? "unknown",
      runId: args.runId,
      resume: args.resume === true,
    });
    const run = toMissionScanRun(result);
    this.snapshot = {
      ...this.snapshot,
      workflowRuns: [...this.snapshot.workflowRuns.filter((item) => item.runId !== run.runId), run],
      updatedAt: new Date().toISOString(),
    };
    this.emit({ type: "workflow.run", run });
    this.appendTerminal(result.status === "complete" ? "sys" : "warn", `GoVibe ${result.level} scan ${result.status}.`);
    return result;
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

  async discoverSources() {
    this.availableSources = await buildRoadmapSourceInventory(await discoverRoadmapSources(roadmapDir));
    return this.availableSources.map((source) => ({
      title: source.title,
      path: source.relativePath,
      sourceType: source.planningType,
      transportType: source.transportType,
      approvalStatus: source.approvalStatus,
      updatedAt: source.updatedAt,
      score: source.score,
      scoreBreakdown: source.scoreBreakdown,
      actionableDepth: source.actionableDepthLabel,
      taskCount: source.taskCount,
      sprintCount: source.sprintCount,
      active: this.activeRoadmapSource === source.path,
    }));
  }

  async reloadRoadmap(explicitSource, options = {}) {
    const sources = await discoverRoadmapSources(roadmapDir);
    const selectedSource = await inferRoadmapSourcePath(explicitSource, sources, this.allowedRoadmapReadRoots);
    const rankedSources = await buildRoadmapSourceInventory(sources);
    this.availableSources = rankedSources;
    if (!selectedSource) {
      this.snapshot = {
        ...this.snapshot,
        roadmap: undefined,
        orchestration: createEmptyOrchestration(),
        roadmapSources: rankedSources.map((source) => ({
          title: source.title,
          sourcePath: source.relativePath,
          sourceType: source.planningType,
          transportType: source.transportType,
          approvalStatus: source.approvalStatus,
          updatedAt: source.updatedAt,
          score: source.score,
          scoreBreakdown: source.scoreBreakdown,
          active: false,
        })),
        updatedAt: new Date().toISOString(),
      };
      return null;
    }

    const selectedSourceMeta = rankedSources.find((source) => source.path === selectedSource);
    const parsed = selectedSourceMeta?.parsed ?? await parseRoadmapSource(selectedSource);
    this.activeRoadmapSource = selectedSource;
    const overlayNodes = this.temporalOverlayStore.active("nodes", (node) => node.id, options);
    const overlayAssignments = this.temporalOverlayStore.active("assignments", (assignment) => assignment.taskId, options);
    const overlayHandoffs = this.temporalOverlayStore.active("handoffs", keyForHandoff, options);
    const overlayVerifications = this.temporalOverlayStore.active("verifications", (verification) => verification.taskId, options);

    let roadmap = {
      ...parsed,
      sourcePath: toRelativePath(selectedSource),
      planningType: parsed.planningType ?? selectedSourceMeta?.planningType ?? "roadmap",
      score: selectedSourceMeta?.score,
      scoreBreakdown: selectedSourceMeta?.scoreBreakdown ?? [],
      ...createTemporalVersion({
        version: parsed.sourceVersion,
        validFrom: parsed.validFrom,
        validTo: parsed.validTo,
        recordedAt: parsed.recordedAt,
        supersededAt: parsed.supersededAt,
      }, parsed.updatedAt),
    };

    roadmap.nodes = latestTemporalByKey(
      roadmap.nodes.map((node) => ensureTemporalItem(node, roadmap)),
      (node) => node.id,
      options,
    );
    roadmap.assignments = latestTemporalByKey(
      roadmap.assignments.map((assignment) => ensureTemporalItem(assignment, roadmap)),
      (assignment) => assignment.taskId,
      options,
    );
    roadmap.handoffs = latestTemporalByKey(
      roadmap.handoffs.map((handoff) => ensureTemporalItem(handoff, roadmap)),
      keyForHandoff,
      options,
    );
    roadmap.verifications = latestTemporalByKey(
      roadmap.verifications.map((verification) => ensureTemporalItem(verification, roadmap)),
      (verification) => verification.taskId,
      options,
    );

    for (const node of overlayNodes) {
      roadmap.nodes = upsertByKey(roadmap.nodes, node, (item) => item.id === node.id);
    }
    for (const assignment of overlayAssignments) {
      roadmap.assignments = upsertByKey(roadmap.assignments, assignment, (item) => item.taskId === assignment.taskId);
    }
    for (const handoff of overlayHandoffs) {
      roadmap.handoffs = upsertByKey(
        roadmap.handoffs,
        handoff,
        (item) => item.taskId === handoff.taskId && item.fromId === handoff.fromId && item.toId === handoff.toId,
      );
    }
    for (const verification of overlayVerifications) {
      roadmap.verifications = upsertByKey(roadmap.verifications, verification, (item) => item.taskId === verification.taskId);
    }

    roadmap = {
      ...roadmap,
      dag: buildDag(roadmap.nodes, { actionableTypes: actionableRoadmapTypes }),
      updatedAt: new Date().toISOString(),
    };
    const orchestration = {
      waves: computeWaves(roadmap.dag, { actionableTypes: actionableRoadmapTypes }),
      updatedAt: new Date().toISOString(),
    };
    this.snapshot = {
      ...this.snapshot,
      roadmap,
      orchestration,
      roadmapSources: rankedSources.map((source) => ({
        title: source.title,
        sourcePath: source.relativePath,
        sourceType: source.planningType,
        transportType: source.transportType,
        approvalStatus: source.approvalStatus,
        updatedAt: source.updatedAt,
        score: source.score,
        scoreBreakdown: source.scoreBreakdown,
        active: source.path === selectedSource,
      })),
      updatedAt: new Date().toISOString(),
    };
    this.emit({ type: "roadmap.snapshot", roadmap });
    this.emit({ type: "dag.update", dag: roadmap.dag });
    this.emit({ type: "orchestration.update", orchestration });
    return roadmap;
  }

  async previewMasterPlan(sourcePath) {
    const selectedSource = await resolvePathWithinAnyRoot(sourcePath, this.allowedRoadmapReadRoots, { basePath: workspaceRoot });
    const preview = await parseRoadmapSource(selectedSource);
    if (preview.planningType !== "masterplan") throw new Error("Selected source is not a Master Plan.");
    const masterPlanPreview = { ...preview, sourcePath: toRelativePath(selectedSource) };
    this.snapshot = { ...this.snapshot, masterPlanPreview, updatedAt: new Date().toISOString() };
    this.emit({ type: "snapshot", snapshot: { masterPlanPreview } });
    return masterPlanPreview;
  }

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

  // Translator-core slice (SRS-GoVibe-Translator-Core-Slice / LLD-Translator-Core-Slice).
  ingestCode(args = {}) {
    const startedAt = new Date().toISOString();
    const repo = args.repo ?? args.repoPath ?? "unknown";
    let text = String(args.content ?? "");
    let lang = String(args.lang ?? "").toLowerCase();
    if (!text && args.repoPath) {
      const abs = path.isAbsolute(args.repoPath) ? args.repoPath : path.join(workspaceRoot, args.repoPath);
      if (existsSync(abs)) {
        text = readFileSync(abs, "utf8");
        if (!lang) lang = (args.repoPath.split(".").pop() || "").toLowerCase();
      }
    }
    if (!lang) lang = "md";
    const isCode = CODE_LANGS.has(lang);
    const atoms = isCode
      ? atomizeCode(text, { file: args.repoPath ?? `inline.${lang}`, lang }).atoms
      : atomize(text).atoms;
    const template = isCode ? extractTemplate("", { repo }) : extractTemplate(text, { repo });
    const atomsRef = `atoms:${repo}:${this.atomStore.size + 1}`;
    this.atomStore.set(atomsRef, atoms);
    this.templateStore.set(template.id, template);
    const auditRef = buildAuditRef("govibe.ingest.code");
    appendProvenance(buildProvenance({
      kind: "ingest", auditRef, actor: args.actor, atomsRef, templateRef: template.id,
      startedAt, endedAt: new Date().toISOString(),
    }));
    this.appendTerminal("translator", `Ingested ${atoms.length} atoms from ${repo}.`);
    return {
      capability: "govibe.ingest.code",
      mode: isCode ? "code" : "doc",
      lang,
      atomCount: atoms.length,
      atomsRef,
      templateRef: template.id,
      templateConfidence: template.confidence,
      needsConfirm: template.needsConfirm,
      warnings: atoms.length === 0 ? ["no atoms parsed — provide `content` or a readable repoPath"] : [],
      auditRef,
    };
  }

  renderDocument(args = {}) {
    const startedAt = new Date().toISOString();
    const auditRef = buildAuditRef("govibe.render");
    const all = this.atomStore.get(args.atomsRef);
    if (!all) {
      return { capability: "govibe.render", verdict: "block", document: null, citedAtoms: [], error: `unknown atomsRef: ${args.atomsRef}`, auditRef };
    }
    const template = this.templateStore.get(args.templateRef) ?? extractTemplate("", {});
    const selected = selectScope(all, { selectorId: args.selector ?? null, hop: args.hop ?? 6 });
    const rendered = renderFromTemplate(selected, template, {});
    const sourceText = selected.map((a) => `${"#".repeat(a.level)} ${a.heading}\n${a.content}`).join("\n\n");
    const fidelity = evaluateFidelity({ sourceAtoms: selected, sourceText, rendered });
    const citedAtoms = selected.map((a) => a.id);
    appendProvenance(buildProvenance({
      kind: "render", auditRef, actor: args.actor, atomsRef: args.atomsRef,
      templateRef: args.templateRef ?? null, citedAtoms, fidelity,
      startedAt, endedAt: new Date().toISOString(),
    }));
    this.appendTerminal("translator", `Rendered doc (fidelity: ${fidelity.verdict}).`);
    return {
      capability: "govibe.render",
      verdict: fidelity.verdict,
      document: fidelity.verdict === "block" ? null : rendered,
      citedAtoms,
      fidelity,
      needsConfirm: fidelity.verdict === "flag" ? ["fidelity below pass threshold — human confirm before deliverable"] : [],
      auditRef,
    };
  }

  async runStep(args = {}) {
    const step = {
      stepId: args.stepId ?? `step-${crypto.randomUUID()}`,
      taskId: args.taskId,
      lane: args.lane,
      agentId: args.agentId ?? args.agent_id,
      mode: args.mode ?? "atomic",
      scope: args.scope,
      task: args.task ?? `Execute task ${args.taskId ?? ""}`.trim(),
      executorRoute: {
        executor: args.executor,
        localModel: args.localModel,
        modelTier: args.modelTier,
      },
      contextSelectors: args.contextSelectors ?? [],
      definitionOfDone: args.definitionOfDone ?? { checks: [], requireAll: true },
      maxAttempts: args.maxAttempts ?? 1,
      budget: args.budget,
      complexity: args.complexity,
      contextTier: args.contextTier,
    };

    const result = await executeStep(step, {
      runAgent: (agentArgs) => this.runAgent(agentArgs),
      runGate: (dod) => runVerifyGate(dod, { cwd: workspaceRoot, maxMs: step.budget?.maxMs }),
      applyMutation: (mutation) => this.applyRoadmapMutation(mutation),
      appendTerminal: (type, text) => this.appendTerminal(type, text),
      logEvent: (name, payload) => this.sessionTracker.logEvent(name, payload),
      emit: (event) => this.emit(event),
      gitStatus: () => gitPorcelain(workspaceRoot),
      createTemporal: createTemporalVersion,
      now: () => new Date().toISOString(),
    });

    return {
      capability: "govibe.orchestrate.step",
      auditRef: buildAuditRef("govibe.orchestrate.step"),
      request: args,
      result,
    };
  }

  async applyRoadmapMutation(args = {}) {
    const mutationType = args.mutationType ?? "";
    const temporalOptions = {
      asOfValidAt: args.asOfValidAt,
      asOfRecordedAt: args.asOfRecordedAt,
    };

    if (mutationType === "reload") {
      const roadmap = await this.reloadRoadmap(args.payload?.source, temporalOptions);
      return {
        capability: "govibe.roadmap.update",
        auditRef: buildAuditRef("govibe.roadmap.update"),
        mutationType,
        roadmap,
      };
    }

    let event;
    if (mutationType === "node.update") {
      const history = this.temporalOverlayStore.getHistory("nodes", args.nodeId);
      const now = new Date().toISOString();
      const nextNode = {
        ...(this.snapshot.roadmap?.nodes.find((node) => node.id === args.nodeId) ?? { id: args.nodeId, type: "task", title: args.nodeId, state: "planned" }),
        ...args.payload,
        id: args.nodeId,
        ...createTemporalVersion({
          version: args.payload?.version ?? nextVersion(history),
          validFrom: args.payload?.validFrom,
          validTo: args.payload?.validTo,
          recordedAt: args.payload?.recordedAt,
          supersededAt: args.payload?.supersededAt,
        }, now),
      };
      validateTemporalItem(nextNode, `node ${args.nodeId}`);
      this.temporalOverlayStore.record("nodes", args.nodeId, nextNode);
      event = { type: "roadmap.node.update", node: nextNode };
    } else if (mutationType === "assignment") {
      const history = this.temporalOverlayStore.getHistory("assignments", args.nodeId);
      const now = new Date().toISOString();
      const assignment = {
        taskId: args.nodeId,
        subjectId: args.payload?.subjectId,
        subjectType: args.payload?.subjectType ?? "agent",
        policyModel: args.payload?.policyModel ?? "ABAC",
        assignedAt: args.payload?.assignedAt ?? now,
        assignedBy: args.payload?.assignedBy,
        ...createTemporalVersion({
          version: args.payload?.version ?? nextVersion(history),
          validFrom: args.payload?.validFrom,
          validTo: args.payload?.validTo,
          recordedAt: args.payload?.recordedAt,
          supersededAt: args.payload?.supersededAt,
        }, now),
      };
      validateTemporalItem(assignment, `assignment ${args.nodeId}`);
      this.temporalOverlayStore.record("assignments", args.nodeId, assignment);
      event = { type: "roadmap.assignment", assignment };
    } else if (mutationType === "handoff") {
      const now = new Date().toISOString();
      const handoff = {
        taskId: args.nodeId,
        fromId: args.payload?.fromId,
        toId: args.payload?.toId,
        requiredArtifact: args.payload?.requiredArtifact,
        note: args.payload?.note,
        createdAt: args.payload?.createdAt ?? now,
        state: args.payload?.state ?? "pending",
        ...createTemporalVersion({
          version: args.payload?.version,
          validFrom: args.payload?.validFrom,
          validTo: args.payload?.validTo,
          recordedAt: args.payload?.recordedAt,
          supersededAt: args.payload?.supersededAt,
        }, now),
      };
      const handoffKey = keyForHandoff(handoff);
      const history = this.temporalOverlayStore.getHistory("handoffs", handoffKey);
      handoff.version = handoff.version ?? nextVersion(history);
      validateTemporalItem(handoff, `handoff ${handoffKey}`);
      this.temporalOverlayStore.record("handoffs", handoffKey, handoff);
      event = { type: "roadmap.handoff", handoff };
    } else if (mutationType === "verification") {
      const history = this.temporalOverlayStore.getHistory("verifications", args.nodeId);
      const now = new Date().toISOString();
      const verification = {
        taskId: args.nodeId,
        qaStatus: args.payload?.qaStatus,
        auditStatus: args.payload?.auditStatus,
        deploymentStatus: args.payload?.deploymentStatus,
        lastUpdatedAt: args.payload?.lastUpdatedAt ?? now,
        ...createTemporalVersion({
          version: args.payload?.version ?? nextVersion(history),
          validFrom: args.payload?.validFrom,
          validTo: args.payload?.validTo,
          recordedAt: args.payload?.recordedAt,
          supersededAt: args.payload?.supersededAt,
        }, now),
      };
      validateTemporalItem(verification, `verification ${args.nodeId}`);
      this.temporalOverlayStore.record("verifications", args.nodeId, verification);
      event = { type: "roadmap.verification", verification };
    } else {
      throw new Error(`Unsupported roadmap mutation type: ${mutationType}`);
    }

    this.applyMissionEvent(event);
    this.emit(event);
    return {
      capability: "govibe.roadmap.update",
      auditRef: buildAuditRef("govibe.roadmap.update"),
      mutationType,
      roadmap: await this.reloadRoadmap(undefined, temporalOptions),
      history: {
        nodes: args.nodeId ? this.temporalOverlayStore.getHistory("nodes", args.nodeId) : [],
        assignments: args.nodeId ? this.temporalOverlayStore.getHistory("assignments", args.nodeId) : [],
        verifications: args.nodeId ? this.temporalOverlayStore.getHistory("verifications", args.nodeId) : [],
      },
    };
  }

  async exportRoadmapMarkdown(args = {}) {
    const roadmap = args.source
      ? await this.reloadRoadmap(args.source, args)
      : await this.reloadRoadmap(undefined, args);

    if (!roadmap) {
      throw new Error("No roadmap snapshot is available to export.");
    }

    const result = await writeRoadmapMarkdownExport(roadmap, {
      workspaceRoot,
      roadmapDir,
      allowedOutputRoots: this.allowedRoadmapWriteRoots,
      outputPath: args.outputPath,
      overwrite: args.overwrite === true,
      generatedAt: args.generatedAt,
    });

    this.appendTerminal("sys", `Roadmap exported: ${result.relativeOutputPath}`);
    return {
      capability: "govibe.roadmap.export",
      auditRef: buildAuditRef("govibe.roadmap.export"),
      source: roadmap.sourcePath,
      outputPath: result.relativeOutputPath,
      nodeCount: result.nodeCount,
      taskCount: result.taskCount,
    };
  }

  applyMissionEvent(event) {
    const roadmap = this.snapshot.roadmap ?? {
      sourcePath: "event://runtime-overlay",
      sourceType: "event",
      sourceVersion: "overlay",
      approvalStatus: "overlay",
      updatedAt: new Date().toISOString(),
      nodes: [],
      assignments: [],
      handoffs: [],
      verifications: [],
    };

    if (event.type === "roadmap.node.update") {
      roadmap.nodes = upsertByKey(roadmap.nodes, event.node, (item) => item.id === event.node.id);
    }
    if (event.type === "roadmap.assignment") {
      roadmap.assignments = upsertByKey(roadmap.assignments, event.assignment, (item) => item.taskId === event.assignment.taskId);
    }
    if (event.type === "roadmap.handoff") {
      roadmap.handoffs = upsertByKey(roadmap.handoffs, event.handoff, (item) => item.taskId === event.handoff.taskId && item.fromId === event.handoff.fromId && item.toId === event.handoff.toId);
    }
    if (event.type === "roadmap.verification") {
      roadmap.verifications = upsertByKey(roadmap.verifications, event.verification, (item) => item.taskId === event.verification.taskId);
    }

    roadmap.updatedAt = new Date().toISOString();
    this.snapshot = { ...this.snapshot, roadmap, updatedAt: new Date().toISOString() };
  }

  async handleMissionCommand(command) {
    if (command.type === "terminal.command") {
      this.appendTerminal("user", command.command);
      const roadmapLoadMatch = command.command.match(/^roadmap\s+load\s+(.+)$/i);
      if (roadmapLoadMatch) {
        const source = roadmapLoadMatch[1].trim();
        const roadmap = await this.reloadRoadmap(source);
        this.appendTerminal("sys", `Roadmap source loaded: ${source}`);
        return { ok: true, action: "roadmap.load", source, roadmap, snapshot: this.snapshot };
      }
      if (/^roadmap\s+reload$/i.test(command.command)) {
        const roadmap = await this.reloadRoadmap();
        this.appendTerminal("sys", "Roadmap source reloaded.");
        return { ok: true, action: "roadmap.reload", roadmap, snapshot: this.snapshot };
      }
      this.appendTerminal("sys", `Command acknowledged: ${command.command}`);
      return { ok: true, action: "terminal.command" };
    }

    if (command.type === "roadmap.select") {
      const roadmap = await this.reloadRoadmap(command.sourcePath);
      this.appendTerminal("sys", `Roadmap source selected: ${command.sourcePath}`);
      return { ok: true, action: "roadmap.select", source: command.sourcePath, roadmap, snapshot: this.snapshot };
    }

    if (command.type === "masterplan.preview") {
      const masterPlan = await this.previewMasterPlan(command.sourcePath);
      this.appendTerminal("sys", `Master Plan review loaded: ${command.sourcePath}`);
      return { ok: true, action: "masterplan.preview", masterPlan, snapshot: this.snapshot };
    }

    if (command.type === "workspace.scan") {
      const result = await this.scanWorkspace({
        actor: "mission-control",
        workspacePath: command.workspacePath,
        deep: command.deep,
        runId: command.runId,
      });
      return { ok: true, action: "workspace.scan", result, snapshot: this.snapshot };
    }

    if (command.type === "agent.select") {
      this.appendTerminal("sys", `Agent selected: ${command.agentId}`);
      return { ok: true, action: "agent.select" };
    }
    if (command.type === "reactor.run") {
      this.appendTerminal("sys", `Reactor run requested for profile: ${command.profile}`);
      return { ok: true, action: "reactor.run" };
    }
    if (command.type === "file.save") {
      this.appendTerminal("sys", `File save command received for hash: ${command.hash}`);
      return { ok: true, action: "file.save" };
    }

    return { ok: false, action: "unknown-command" };
  }
}

export const govibeRuntime = new GovibeRuntime();
