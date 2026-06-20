import type { RoadmapSnapshot } from "./mission";

type RoadmapExportFormat = "json" | "yaml" | "md";

type RoadmapStats = {
  totalFeatures: number;
  readyFeatures: number;
  backlogTasks: number;
  progress: number;
  label: string;
};

function buildRoadmapExportPayload(snapshot: RoadmapSnapshot, stats: RoadmapStats) {
  return {
    title: "GoVibe Development Roadmap",
    exportedAt: new Date().toISOString(),
    sourcePath: snapshot.sourcePath,
    sourceType: snapshot.sourceType,
    sourceVersion: snapshot.sourceVersion ?? "unavailable",
    approvalStatus: snapshot.approvalStatus ?? "unavailable",
    updatedAt: snapshot.updatedAt,
    stats: {
      totalFeatures: stats.totalFeatures,
      readyFeatures: stats.readyFeatures,
      backlogTasks: stats.backlogTasks,
      progress: stats.progress,
      label: stats.label,
    },
    nodes: snapshot.nodes.map((node) => ({
      id: node.id,
      parentId: node.parentId ?? null,
      type: node.type,
      title: node.title,
      summary: node.summary ?? null,
      state: node.state,
      progress: node.progress ?? null,
      sourcePath: node.sourcePath ?? null,
      sourceSection: node.sourceSection ?? null,
    })),
  };
}

function toRoadmapYaml(value: unknown, depth = 0): string {
  const indent = "  ".repeat(depth);

  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value.map((item) => {
      const serialized = toRoadmapYaml(item, depth + 1);
      return serialized.includes("\n")
        ? `${indent}-\n${serialized}`
        : `${indent}- ${serialized}`;
    }).join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    return entries.map(([key, item]) => {
      const serialized = toRoadmapYaml(item, depth + 1);
      return serialized.includes("\n")
        ? `${indent}${key}:\n${serialized}`
        : `${indent}${key}: ${serialized}`;
    }).join("\n");
  }

  return JSON.stringify(String(value));
}

function serializeRoadmapExport(snapshot: RoadmapSnapshot, stats: RoadmapStats, format: RoadmapExportFormat) {
  const payload = buildRoadmapExportPayload(snapshot, stats);

  if (format === "json") {
    return JSON.stringify(payload, null, 2);
  }

  if (format === "yaml") {
    return toRoadmapYaml(payload);
  }

  const lines = [
    "# GoVibe Development Roadmap",
    "",
    `- Exported At: ${payload.exportedAt}`,
    `- Source: ${payload.sourcePath}`,
    `- Approval Status: ${payload.approvalStatus}`,
    `- Progress: ${payload.stats.label}`,
    "",
    "## Summary",
    "",
    `- Feature ทั้งหมด: ${payload.stats.totalFeatures}`,
    `- พร้อมใช้งาน / IMP แล้ว: ${payload.stats.readyFeatures}`,
    `- Task ใน Backlog: ${payload.stats.backlogTasks}`,
    "",
    "## Nodes",
    "",
    ...payload.nodes.map((node) => [
      `### ${node.title}`,
      "",
      `- ID: ${node.id}`,
      `- Type: ${node.type}`,
      `- State: ${node.state}`,
      `- Progress: ${node.progress ?? "unavailable"}`,
      `- Parent ID: ${node.parentId ?? "root"}`,
      `- Source Section: ${node.sourceSection ?? "unavailable"}`,
      `- Source Path: ${node.sourcePath ?? payload.sourcePath}`,
      node.summary ? `- Summary: ${node.summary}` : "- Summary: unavailable",
      "",
    ].join("\n")),
  ];

  return lines.join("\n");
}

export function downloadRoadmapExport(snapshot: RoadmapSnapshot, stats: RoadmapStats, format: RoadmapExportFormat) {
  const extension = format === "md" ? "md" : format;
  const mimeType = format === "json"
    ? "application/json"
    : format === "yaml"
      ? "text/yaml"
      : "text/markdown";
  const content = serializeRoadmapExport(snapshot, stats, format);
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `govibe-roadmap-export.${extension}`;
  anchor.click();
  URL.revokeObjectURL(url);
}
