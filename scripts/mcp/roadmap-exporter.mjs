import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { temporalColumns } from "./temporal-versioning.mjs";

function slugify(value) {
  return String(value ?? "roadmap")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "roadmap";
}

function escapeCell(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

function stateForMarkdown(value) {
  return String(value ?? "planned").replaceAll("_", "-");
}

function progressForMarkdown(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? String(numberValue) : "0";
}

function temporalCells(item) {
  return [
    item.version ?? "",
    item.validFrom ?? "",
    item.validTo ?? "",
    item.recordedAt ?? "",
    item.supersededAt ?? "",
  ];
}

function row(cells) {
  return `| ${cells.map(escapeCell).join(" | ")} |`;
}

function table(headers, rows) {
  return [
    row(headers),
    row(headers.map(() => "---")),
    ...rows.map(row),
  ].join("\n");
}

function sortByTypeOrder(nodes) {
  const order = new Map([
    ["roadmap", 0],
    ["phase", 1],
    ["epic", 2],
    ["sprint", 3],
    ["task", 4],
  ]);
  return [...nodes].sort((left, right) => {
    const leftOrder = order.get(left.type) ?? 99;
    const rightOrder = order.get(right.type) ?? 99;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(left.id).localeCompare(String(right.id));
  });
}

function buildOutputPath(roadmap, roadmapDir, outputPath) {
  if (outputPath) {
    return path.isAbsolute(outputPath) ? outputPath : path.resolve(outputPath);
  }

  const root = roadmap.nodes.find((node) => node.type === "roadmap");
  const sourceBase = path.basename(roadmap.sourcePath ?? root?.id ?? "roadmap", path.extname(roadmap.sourcePath ?? ""));
  return path.join(roadmapDir, `ROADMAP-${slugify(sourceBase)}-export.md`);
}

function assertRoadmapOutputPath(outputPath, roadmapDir) {
  const relative = path.relative(roadmapDir, outputPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Roadmap export output must stay under docs/roadmap: ${outputPath}`);
  }
  if (path.extname(outputPath).toLowerCase() !== ".md") {
    throw new Error("Roadmap export output must be a .md file.");
  }
}

export function renderRoadmapMarkdown(roadmap, options = {}) {
  const sortedNodes = sortByTypeOrder(roadmap.nodes ?? []);
  const root = sortedNodes.find((node) => node.type === "roadmap") ?? {
    id: "RM-exported-roadmap",
    title: "Exported Roadmap",
    state: "draft",
    progress: 0,
  };
  const phases = sortedNodes.filter((node) => node.type === "phase");
  const sprints = sortedNodes.filter((node) => node.type === "sprint");
  const tasks = sortedNodes.filter((node) => node.type === "task");
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  const lines = [
    "---",
    `id: ${escapeCell(root.id)}`,
    `version: ${escapeCell(roadmap.sourceVersion ?? "0.1.0")}`,
    `status: ${escapeCell(roadmap.approvalStatus ?? stateForMarkdown(root.state))}`,
    "---",
    "",
    `# ${escapeCell(root.title)}`,
    "",
    `**Source PRD:** ${escapeCell(options.sourcePrd ?? "docs/PRD-GoVibe-Platform-Overview.md")}`,
    `**Owner:** ${escapeCell(options.owner ?? "LYRA")}`,
    `**Roadmap Source Path:** ${escapeCell(options.relativeOutputPath ?? "docs/roadmap/ROADMAP-export.md")}`,
    "**Mission Control Render:** A2 Roadmap Board reads document-derived RoadmapSnapshot.",
    `**Exported From:** ${escapeCell(roadmap.sourcePath ?? "runtime snapshot")}`,
    `**Generated At:** ${escapeCell(generatedAt)}`,
    "",
    "## Product Goal",
    "",
    escapeCell(options.productGoal ?? "Exported roadmap snapshot."),
    "",
    "## Phases",
    table(
      ["Phase", "Goal", "PRD Systems", "Required Docs", "Exit Criteria", "Status", "Progress", ...temporalColumns],
      phases.map((node) => [
        node.id,
        node.title,
        node.tags?.join("; ") ?? "",
        node.artifactLinks?.join("; ") ?? "",
        node.summary ?? "",
        stateForMarkdown(node.state),
        progressForMarkdown(node.progress),
        ...temporalCells(node),
      ]),
    ),
    "",
    "## Sprints",
    table(
      ["Sprint", "Parent ID", "Goal", "Task Count", "Exit Criteria", "Status", "Progress", ...temporalColumns],
      sprints.map((node) => [
        node.id,
        node.parentId ?? "",
        node.title,
        tasks.filter((task) => task.parentId === node.id).length,
        node.summary ?? "",
        stateForMarkdown(node.state),
        progressForMarkdown(node.progress),
        ...temporalCells(node),
      ]),
    ),
    "",
    "## Backlog Items",
    table(
      ["ID", "Parent ID", "Type", "Title", "PRD System", "Priority", "Owner", "Source Section", "Dependencies", "Acceptance", "Status", "Progress", ...temporalColumns],
      tasks.map((node) => [
        node.id,
        node.parentId ?? "",
        node.type,
        node.title,
        node.tags?.[0] ?? "",
        node.tags?.[1] ?? "",
        node.assigneeId ?? "",
        node.sourceSection ?? "Backlog Items",
        node.artifactLinks?.join("; ") ?? "",
        node.summary ?? "",
        stateForMarkdown(node.state),
        progressForMarkdown(node.progress),
        ...temporalCells(node),
      ]),
    ),
    "",
    "## Assignments",
    table(
      ["Task ID", "Subject ID", "Subject Type", "Policy Model", "Assigned At", "Assigned By", ...temporalColumns],
      (roadmap.assignments ?? []).map((assignment) => [
        assignment.taskId,
        assignment.subjectId,
        assignment.subjectType,
        assignment.policyModel,
        assignment.assignedAt,
        assignment.assignedBy ?? "",
        ...temporalCells(assignment),
      ]),
    ),
    "",
    "## Handoffs",
    table(
      ["Task ID", "From ID", "To ID", "Required Artifact", "Note", "Created At", "State", ...temporalColumns],
      (roadmap.handoffs ?? []).map((handoff) => [
        handoff.taskId,
        handoff.fromId,
        handoff.toId,
        handoff.requiredArtifact ?? "",
        handoff.note ?? "",
        handoff.createdAt,
        handoff.state,
        ...temporalCells(handoff),
      ]),
    ),
    "",
    "## Verification",
    table(
      ["Task ID", "QA Status", "Audit Status", "Deployment Status", "Updated At", ...temporalColumns],
      (roadmap.verifications ?? []).map((verification) => [
        verification.taskId,
        verification.qaStatus ?? "",
        verification.auditStatus ?? "",
        verification.deploymentStatus ?? "",
        verification.lastUpdatedAt ?? "",
        ...temporalCells(verification),
      ]),
    ),
    "",
    "## UI Traceability",
    table(
      ["Roadmap Item ID", "Source Section", "A2 Render Surface", "Progress Source", "Evidence Link"],
      tasks.map((node) => [
        node.id,
        node.sourceSection ?? "Backlog Items",
        "A2 Roadmap Board",
        node.sourcePath ?? roadmap.sourcePath ?? "",
        node.verificationLinks?.join("; ") ?? "",
      ]),
    ),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

export async function writeRoadmapMarkdownExport(roadmap, options = {}) {
  const outputPath = buildOutputPath(roadmap, options.roadmapDir, options.outputPath);
  assertRoadmapOutputPath(outputPath, options.roadmapDir);
  const relativeOutputPath = path.relative(options.workspaceRoot, outputPath).replaceAll("\\", "/");
  const markdown = renderRoadmapMarkdown(roadmap, { ...options, relativeOutputPath });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, { encoding: "utf8", flag: options.overwrite ? "w" : "wx" });
  return {
    outputPath,
    relativeOutputPath,
    markdown,
    nodeCount: roadmap.nodes?.length ?? 0,
    taskCount: roadmap.nodes?.filter((node) => node.type === "task").length ?? 0,
  };
}
