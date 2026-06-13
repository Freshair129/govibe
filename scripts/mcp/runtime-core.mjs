import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { discoverRoadmapSources, parseRoadmapSource } from "./roadmap-parser.mjs";
import { writeRoadmapMarkdownExport } from "./roadmap-exporter.mjs";
import { SessionTracker } from "../../packages/govibe-core/bin/session-tracker.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const roadmapDir = path.join(workspaceRoot, "docs", "roadmap");
const launcherScript = path.join(workspaceRoot, "scripts", "agents", "invoke-agent.ps1");

function createEmptySnapshot() {
  return {
    connectionState: "connected",
    updatedAt: new Date().toISOString(),
    metrics: [],
    chart: { labels: [], series: [] },
    reactor: [],
    agents: [],
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

function inferRoadmapSourcePath(explicitSource, sources) {
  if (explicitSource) {
    return path.isAbsolute(explicitSource) ? explicitSource : path.join(workspaceRoot, explicitSource);
  }

  const preferred = process.env.GOVIBE_ROADMAP_SOURCE;
  if (preferred) {
    return path.isAbsolute(preferred) ? preferred : path.join(workspaceRoot, preferred);
  }

  const defaultMarkdown = sources.find((source) => /^ROADMAP-.*\.md$/i.test(source.name));
  if (defaultMarkdown) return defaultMarkdown.path;

  const defaultHtml = sources.find((source) => /^ROADMAP-.*\.html$/i.test(source.name));
  if (defaultHtml) return defaultHtml.path;

  return sources[0]?.path;
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
    this.activeRoadmapSource = undefined;
    this.availableSources = [];
  }

  async initialize() {
    await this.reloadRoadmap();
    this.appendTerminal("sys", `GoVibe runtime initialized. Session ID: ${this.sessionTracker.sessionId}`);
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
    this.availableSources = await discoverRoadmapSources(roadmapDir);
    return this.availableSources.map((source) => ({
      name: source.name,
      path: toRelativePath(source.path),
      sourceType: source.sourceType,
      active: this.activeRoadmapSource === source.path,
    }));
  }

  async reloadRoadmap(explicitSource) {
    const sources = await discoverRoadmapSources(roadmapDir);
    this.availableSources = sources;
    const selectedSource = inferRoadmapSourcePath(explicitSource, sources);
    if (!selectedSource) {
      this.snapshot = { ...this.snapshot, roadmap: undefined, updatedAt: new Date().toISOString() };
      return null;
    }

    const parsed = await parseRoadmapSource(selectedSource);
    this.activeRoadmapSource = selectedSource;
    const overlayNodes = Array.from(this.overlay.nodes.values());
    const overlayAssignments = Array.from(this.overlay.assignments.values());
    const overlayHandoffs = Array.from(this.overlay.handoffs.values());
    const overlayVerifications = Array.from(this.overlay.verifications.values());

    let roadmap = {
      ...parsed,
      sourcePath: toRelativePath(selectedSource),
    };

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
    this.snapshot = { ...this.snapshot, roadmap, updatedAt: new Date().toISOString() };
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

    if (mutationType === "reload") {
      const roadmap = await this.reloadRoadmap(args.payload?.source);
      return {
        capability: "govibe.roadmap.update",
        auditRef: buildAuditRef("govibe.roadmap.update"),
        mutationType,
        roadmap,
      };
    }

    let event;
    if (mutationType === "node.update") {
      const nextNode = {
        ...(this.snapshot.roadmap?.nodes.find((node) => node.id === args.nodeId) ?? { id: args.nodeId, type: "task", title: args.nodeId, state: "planned" }),
        ...args.payload,
        id: args.nodeId,
      };
      this.overlay.nodes.set(args.nodeId, nextNode);
      event = { type: "roadmap.node.update", node: nextNode };
    } else if (mutationType === "assignment") {
      const assignment = {
        taskId: args.nodeId,
        subjectId: args.payload?.subjectId,
        subjectType: args.payload?.subjectType ?? "agent",
        policyModel: args.payload?.policyModel ?? "ABAC",
        assignedAt: args.payload?.assignedAt ?? new Date().toISOString(),
        assignedBy: args.payload?.assignedBy,
      };
      this.overlay.assignments.set(args.nodeId, assignment);
      event = { type: "roadmap.assignment", assignment };
    } else if (mutationType === "handoff") {
      const handoff = {
        taskId: args.nodeId,
        fromId: args.payload?.fromId,
        toId: args.payload?.toId,
        requiredArtifact: args.payload?.requiredArtifact,
        note: args.payload?.note,
        createdAt: args.payload?.createdAt ?? new Date().toISOString(),
        state: args.payload?.state ?? "pending",
      };
      this.overlay.handoffs.set(`${handoff.taskId}:${handoff.fromId}:${handoff.toId}`, handoff);
      event = { type: "roadmap.handoff", handoff };
    } else if (mutationType === "verification") {
      const verification = {
        taskId: args.nodeId,
        qaStatus: args.payload?.qaStatus,
        auditStatus: args.payload?.auditStatus,
        deploymentStatus: args.payload?.deploymentStatus,
        lastUpdatedAt: args.payload?.lastUpdatedAt ?? new Date().toISOString(),
      };
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
      roadmap: this.snapshot.roadmap,
    };
  }

  async exportRoadmapMarkdown(args = {}) {
    const roadmap = args.source
      ? await this.reloadRoadmap(args.source)
      : this.snapshot.roadmap ?? await this.reloadRoadmap();

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
        await this.reloadRoadmap(source);
        this.appendTerminal("sys", `Roadmap source loaded: ${source}`);
        return { ok: true, action: "roadmap.load", source };
      }
      if (/^roadmap\s+reload$/i.test(command.command)) {
        await this.reloadRoadmap();
        this.appendTerminal("sys", "Roadmap source reloaded.");
        return { ok: true, action: "roadmap.reload" };
      }
      this.appendTerminal("sys", `Command acknowledged: ${command.command}`);
      return { ok: true, action: "terminal.command" };
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
