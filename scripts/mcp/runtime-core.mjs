import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { discoverRoadmapSources, parseRoadmapSource } from "./roadmap-parser.mjs";
import { writeRoadmapMarkdownExport } from "./roadmap-exporter.mjs";
import { compareTemporalOrder, createTemporalVersion, isTemporalVisible, nextVersion } from "./temporal-versioning.mjs";
import { toolCatalog } from "./registry.mjs";
import { SessionTracker } from "../../packages/govibe-core/bin/session-tracker.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const roadmapDir = path.join(workspaceRoot, "docs", "roadmap");
const launcherScript = path.join(workspaceRoot, "scripts", "agents", "invoke-agent.ps1");
const agentRegistryPath = path.join(workspaceRoot, ".agents", "agent-registry.yaml");
const agentAccents = ["#10b981", "#6366f1", "#22d3ee", "#f472b6", "#f59e0b", "#a78bfa"];
const actionableRoadmapTypes = new Set(["task", "sub-task", "micro-task", "atomic-task"]);
const planningTypeWeights = {
  roadmap: 40,
  backlog: 30,
  sprint: 20,
  masterplan: 10,
};

function createEmptySnapshot() {
  return {
    connectionState: "connected",
    updatedAt: new Date().toISOString(),
    metrics: [],
    chart: { labels: [], series: [] },
    reactor: [],
    agents: [],
    capabilities: toolCatalog.map((tool) => ({
      id: tool.name,
      title: tool.name,
      description: tool.description,
      status: "registered",
      sourcePath: "scripts/mcp/registry.mjs",
    })),
    terminal: [],
    graph: { nodes: [], edges: [] },
    specs: [],
    symbols: [],
    campaignLogs: [],
  };
}

function createTerminalLine(type, text) {
  return {
    id: crypto.randomUUID(),
    type,
    text,
    time: new Date().toLocaleTimeString("en-US", { hour12: false }),
  };
}

function unquoteYamlScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseAgentRegistry(text) {
  const agents = [];
  let inAgents = false;
  let current;
  let listTarget;

  for (const rawLine of text.replace(/\r\n/g, "\n").split("\n")) {
    if (rawLine === "agents:") {
      inAgents = true;
      continue;
    }
    if (!inAgents) continue;
    if (rawLine === "scopes:") break;

    const agentMatch = rawLine.match(/^  ([a-z0-9_-]+):\s*$/i);
    if (agentMatch) {
      current = {
        id: agentMatch[1],
        responsibility: [],
        sourceRefs: [],
        authority: { can: [], cannot: [] },
      };
      agents.push(current);
      listTarget = undefined;
      continue;
    }
    if (!current) continue;

    const scalarMatch = rawLine.match(/^    (label|role|job_title_equivalent|domain|cluster):\s*(.+)$/);
    if (scalarMatch) {
      current[scalarMatch[1]] = unquoteYamlScalar(scalarMatch[2]);
      listTarget = undefined;
      continue;
    }
    if (/^    responsibility:\s*$/.test(rawLine)) {
      listTarget = current.responsibility;
      continue;
    }
    if (/^    source_refs:\s*$/.test(rawLine)) {
      listTarget = current.sourceRefs;
      continue;
    }
    const authorityMatch = rawLine.match(/^      (can|cannot):\s*$/);
    if (authorityMatch) {
      listTarget = current.authority[authorityMatch[1]];
      continue;
    }
    const listItemMatch = rawLine.match(/^ {6,8}-\s+(.+)$/);
    if (listItemMatch && listTarget) {
      listTarget.push(unquoteYamlScalar(listItemMatch[1]));
      continue;
    }
    if (/^    [a-z0-9_-]+:/i.test(rawLine)) {
      listTarget = undefined;
    }
  }

  return agents.map((agent, index) => ({
    id: agent.id,
    name: agent.label ?? agent.id.toUpperCase(),
    role: agent.role ?? "Unspecified",
    model: "Registry-defined",
    status: "registered",
    tasks: "unavailable",
    accuracy: "unavailable",
    speed: "unavailable",
    accent: agentAccents[index % agentAccents.length],
    fleet: {
      fleetRole: agent.role,
      jobTitleEquivalent: agent.job_title_equivalent,
      domain: agent.domain,
      cluster: agent.cluster,
      responsibility: agent.responsibility,
      authority: agent.authority,
      sourceRefs: agent.sourceRefs,
      approvalGate: "Registry metadata only; execution requires assignment and approval.",
      scopeBoundary: "Defined by agent-registry.yaml execution policy.",
      scopeStatus: "ready_for_assignment",
    },
  }));
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

function activeTemporalRecords(records, options = {}) {
  return records.filter((record) => isTemporalVisible(record, options));
}

function latestByKey(records, keySelector, options = {}) {
  const selected = new Map();
  for (const record of activeTemporalRecords(records, options)) {
    const key = keySelector(record);
    const existing = selected.get(key);
    if (!existing || Date.parse(record.recordedAt ?? "") >= Date.parse(existing.recordedAt ?? "")) {
      selected.set(key, record);
    }
  }
  return Array.from(selected.values());
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

async function inferRoadmapSourcePath(explicitSource, sources) {
  if (explicitSource) {
    const sourcePath = path.isAbsolute(explicitSource) ? explicitSource : path.join(workspaceRoot, explicitSource);
    const parsed = await parseRoadmapSource(sourcePath);
    if (parsed.approvalStatus?.toLowerCase() !== "approved") {
      throw new Error(`Roadmap source '${toRelativePath(sourcePath)}' is not approved.`);
    }
    return sourcePath;
  }

  const rankedSources = await buildRoadmapSourceInventory(sources);
  return rankedSources.find((source) => source.approvalStatus?.toLowerCase() === "approved")?.path;
}

function formatAgentRunResult(stdout, stderr, exitCode) {
  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    exitCode,
    ok: exitCode === 0,
  };
}

export class GovibeRuntime {
  constructor() {
    this.snapshot = createEmptySnapshot();
    this.sessionTracker = new SessionTracker(workspaceRoot);
    this.listeners = new Set();
    this.overlay = {
      nodes: new Map(),
      assignments: new Map(),
      handoffs: new Map(),
      verifications: new Map(),
    };
    this.temporalHistory = {
      nodes: new Map(),
      assignments: new Map(),
      handoffs: new Map(),
      verifications: new Map(),
    };
    this.activeRoadmapSource = undefined;
    this.availableSources = [];
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

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  getSnapshot() {
    return this.snapshot;
  }

  appendTerminal(type, text) {
    const line = createTerminalLine(type, text);
    this.snapshot = {
      ...this.snapshot,
      terminal: [...this.snapshot.terminal.slice(-199), line],
      updatedAt: new Date().toISOString(),
    };
    this.emit({ type: "terminal.line", line });
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
    const selectedSource = await inferRoadmapSourcePath(explicitSource, sources);
    const rankedSources = await buildRoadmapSourceInventory(sources);
    this.availableSources = rankedSources;
    if (!selectedSource) {
      this.snapshot = {
        ...this.snapshot,
        roadmap: undefined,
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
    const overlayNodes = latestByKey(
      Array.from(this.temporalHistory.nodes.values()).flat(),
      (node) => node.id,
      options,
    );
    const overlayAssignments = latestByKey(
      Array.from(this.temporalHistory.assignments.values()).flat(),
      (assignment) => assignment.taskId,
      options,
    );
    const overlayHandoffs = latestByKey(
      Array.from(this.temporalHistory.handoffs.values()).flat(),
      keyForHandoff,
      options,
    );
    const overlayVerifications = latestByKey(
      Array.from(this.temporalHistory.verifications.values()).flat(),
      (verification) => verification.taskId,
      options,
    );

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

    roadmap.nodes = latestByKey(
      roadmap.nodes.map((node) => ensureTemporalItem(node, roadmap)),
      (node) => node.id,
      options,
    );
    roadmap.assignments = latestByKey(
      roadmap.assignments.map((assignment) => ensureTemporalItem(assignment, roadmap)),
      (assignment) => assignment.taskId,
      options,
    );
    roadmap.handoffs = latestByKey(
      roadmap.handoffs.map((handoff) => ensureTemporalItem(handoff, roadmap)),
      keyForHandoff,
      options,
    );
    roadmap.verifications = latestByKey(
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

    roadmap = { ...roadmap, updatedAt: new Date().toISOString() };
    this.snapshot = {
      ...this.snapshot,
      roadmap,
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
    return roadmap;
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

    if (args.agent) psArgs.push("-Agent", args.agent);
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
      const history = this.temporalHistory.nodes.get(args.nodeId) ?? [];
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
      this.temporalHistory.nodes.set(args.nodeId, [
        ...history.map((record) => record.supersededAt ? record : { ...record, supersededAt: nextNode.recordedAt }),
        nextNode,
      ]);
      this.overlay.nodes.set(args.nodeId, nextNode);
      event = { type: "roadmap.node.update", node: nextNode };
    } else if (mutationType === "assignment") {
      const history = this.temporalHistory.assignments.get(args.nodeId) ?? [];
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
      this.temporalHistory.assignments.set(args.nodeId, [
        ...history.map((record) => record.supersededAt ? record : { ...record, supersededAt: assignment.recordedAt }),
        assignment,
      ]);
      this.overlay.assignments.set(args.nodeId, assignment);
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
      const history = this.temporalHistory.handoffs.get(handoffKey) ?? [];
      handoff.version = handoff.version ?? nextVersion(history);
      validateTemporalItem(handoff, `handoff ${handoffKey}`);
      this.temporalHistory.handoffs.set(handoffKey, [
        ...history.map((record) => record.supersededAt ? record : { ...record, supersededAt: handoff.recordedAt }),
        handoff,
      ]);
      this.overlay.handoffs.set(handoffKey, handoff);
      event = { type: "roadmap.handoff", handoff };
    } else if (mutationType === "verification") {
      const history = this.temporalHistory.verifications.get(args.nodeId) ?? [];
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
      this.temporalHistory.verifications.set(args.nodeId, [
        ...history.map((record) => record.supersededAt ? record : { ...record, supersededAt: verification.recordedAt }),
        verification,
      ]);
      this.overlay.verifications.set(args.nodeId, verification);
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
        nodes: args.nodeId ? this.temporalHistory.nodes.get(args.nodeId) ?? [] : [],
        assignments: args.nodeId ? this.temporalHistory.assignments.get(args.nodeId) ?? [] : [],
        verifications: args.nodeId ? this.temporalHistory.verifications.get(args.nodeId) ?? [] : [],
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

    const outputPath = args.outputPath
      ? path.resolve(workspaceRoot, args.outputPath)
      : undefined;
    const result = await writeRoadmapMarkdownExport(roadmap, {
      workspaceRoot,
      roadmapDir,
      outputPath,
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
