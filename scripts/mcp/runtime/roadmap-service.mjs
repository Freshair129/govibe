import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverRoadmapSources, parseRoadmapSource } from "../roadmap-parser.mjs";
import { writeRoadmapMarkdownExport } from "../roadmap-exporter.mjs";
import { resolvePathWithinAnyRoot } from "../path-security.mjs";
import { buildDag } from "../dag.mjs";
import { computeWaves } from "../wave.mjs";
import { compareTemporalOrder, createTemporalVersion, nextVersion } from "../temporal-versioning.mjs";
import { latestTemporalByKey } from "./temporal-overlay-store.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const roadmapDir = path.join(workspaceRoot, "docs", "roadmap");
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

export function scoreApprovedSources(inventory, envPreferredPath) {
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

export class RoadmapService {
  constructor({ snapshotStore, temporalOverlayStore, allowedRoadmapReadRoots, allowedRoadmapWriteRoots }) {
    this.snapshotStore = snapshotStore;
    this.temporalOverlayStore = temporalOverlayStore;
    this.allowedRoadmapReadRoots = allowedRoadmapReadRoots;
    this.allowedRoadmapWriteRoots = allowedRoadmapWriteRoots;
    this.activeRoadmapSource = undefined;
    this.availableSources = [];
  }
  get snapshot() { return this.snapshotStore.getSnapshot(); }
  set snapshot(value) { this.snapshotStore.replace(value); }
  emit(event) { this.snapshotStore.emit(event); }
  appendTerminal(type, text) { this.snapshotStore.appendTerminal(type, text); }

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

}

