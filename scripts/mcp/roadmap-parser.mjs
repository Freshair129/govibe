import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse as parseHtml } from "node-html-parser";

import { createTemporalVersion, readTemporalColumns } from "./temporal-versioning.mjs";

const roadmapFilePattern = /^(MASTERPLAN|ROADMAP|BACKLOG|SPRINT)-.+\.(md|html)$/i;

function getPlanningTypeFromPath(sourcePath) {
  const basename = path.basename(sourcePath);
  if (/^MASTERPLAN-/i.test(basename)) return "masterplan";
  if (/^ROADMAP-/i.test(basename)) return "roadmap";
  if (/^BACKLOG-/i.test(basename)) return "backlog";
  if (/^SPRINT-/i.test(basename)) return "sprint";
  return "roadmap";
}

function parseFrontmatter(text) {
  if (!text.startsWith("---")) {
    return { data: {}, body: text };
  }

  const end = text.indexOf("\n---", 3);
  if (end === -1) {
    return { data: {}, body: text };
  }

  const raw = text.slice(3, end).trim();
  const body = text.slice(end + 4).trimStart();
  const data = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    data[key] = value.replace(/^["']|["']$/g, "").trim();
  }

  return { data, body };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapNodeType(value, fallback = "task") {
  const normalized = String(value ?? "").trim().toLowerCase();
  switch (normalized) {
    case "roadmap":
    case "phase":
    case "epic":
    case "sprint":
    case "task":
      return normalized;
    case "sub-task":
    case "subtask":
      return "sub-task";
    case "micro-task":
    case "microtask":
      return "micro-task";
    case "atomic-task":
    case "atomictask":
      return "atomic-task";
    default:
      return fallback;
  }
}

function mapWorkflowState(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  switch (normalized) {
    case "done":
    case "completed":
      return "done";
    case "blocked":
      return "blocked";
    case "in-progress":
    case "in progress":
    case "active":
      return "in_progress";
    case "review":
    case "qa review":
    case "qa_review":
      return "qa_review";
    case "audit review":
    case "audit_review":
      return "audit_review";
    case "assigned":
      return "assigned";
    case "ready":
      return "ready_for_assignment";
    case "planned":
      return "planned";
    default:
      return "planned";
  }
}

function parseNumber(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDelimitedList(value) {
  return String(value ?? "")
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getColumn(row, aliases) {
  for (const alias of aliases) {
    const key = Object.keys(row).find((candidate) => candidate.trim().toLowerCase() === alias.toLowerCase());
    if (key) return row[key];
  }
  return "";
}

function parseMarkdownTable(lines, startIndex) {
  const tableLines = [];
  let index = startIndex;
  while (index < lines.length && lines[index].trim().startsWith("|")) {
    tableLines.push(lines[index]);
    index += 1;
  }

  if (tableLines.length < 2) return null;

  const headers = tableLines[0].split("|").slice(1, -1).map((cell) => cell.trim());
  const rows = tableLines.slice(2).map((line) => {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    return Object.fromEntries(headers.map((header, columnIndex) => [header, cells[columnIndex] ?? ""]));
  });

  return { rows, nextIndex: index };
}

function collectSectionTables(body) {
  const lines = body.split(/\r?\n/);
  const sections = new Map();

  for (let index = 0; index < lines.length; index += 1) {
    const headingMatch = lines[index].match(/^##\s+(.+)$/);
    if (!headingMatch) continue;

    const sectionName = headingMatch[1].trim();
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (lines[cursor].trim().startsWith("|")) {
        const parsed = parseMarkdownTable(lines, cursor);
        if (parsed) {
          sections.set(sectionName, parsed.rows);
          index = parsed.nextIndex - 1;
        }
        break;
      }
      if (lines[cursor].startsWith("## ")) break;
    }
  }

  return sections;
}

function parseChecklistNodes(body, sourcePath, parsedAt) {
  const lines = body.split(/\r?\n/);
  const nodes = [];
  const stack = [];
  let currentParentId = null;

  for (const line of lines) {
    const headingMatch = line.match(/^###\s+([A-Za-z0-9.-]+)\s*:\s*(.+)$/);
    if (headingMatch) {
      currentParentId = headingMatch[1].trim();
      stack.length = 0;
      continue;
    }

    const checklistMatch = line.match(/^(\s*)-\s+\[( |x|X)\]\s+([A-Za-z0-9.-]+)\s+(.+)$/);
    if (!checklistMatch) continue;

    const indent = checklistMatch[1].length;
    const checked = checklistMatch[2].toLowerCase() === "x";
    const id = checklistMatch[3].trim();
    const title = checklistMatch[4].trim();

    // Only real breakdown ids are task nodes; this skips prose checklist bullets
    // (e.g. acceptance-criteria lines) that the regex would otherwise capture as tasks.
    if (!/^(SUBTASK|MICRO|ATOMIC|S|M|A)-/i.test(id)) continue;

    while (stack.length > 0 && stack.at(-1).indent >= indent) {
      stack.pop();
    }

    const parentId = stack.at(-1)?.id ?? currentParentId ?? undefined;
    nodes.push({
      id,
      parentId,
      type: mapNodeType(
        id.startsWith("ATOMIC-") ? "atomic-task"
          : id.startsWith("MICRO-") ? "micro-task"
            : id.startsWith("SUBTASK-") ? "sub-task"
              : "task",
      ),
      title,
      state: checked ? "done" : "planned",
      progress: checked ? 100 : 0,
      sourcePath,
      sourceSection: currentParentId ?? "Task Breakdown",
      ...createTemporalVersion({}, parsedAt),
    });
    stack.push({ indent, id });
  }

  return nodes;
}

function stripScalar(value) {
  const trimmed = String(value ?? "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

// Minimal YAML-subset parser for the authored Task Container blocks
// (maps, nested maps, and lists of {criterion, checked}). Not a general YAML engine.
function parseYamlBlock(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "" && !line.trim().startsWith("#"));
  let pos = 0;
  const indentOf = (line) => line.match(/^ */)[0].length;

  function parseBlock(minIndent) {
    const isList = lines[pos] && lines[pos].trim().startsWith("- ");
    const result = isList ? [] : {};

    while (pos < lines.length) {
      const line = lines[pos];
      const indent = indentOf(line);
      if (indent < minIndent) break;
      const trimmed = line.trim();

      if (trimmed.startsWith("- ")) {
        const itemContent = trimmed.slice(2);
        const colon = itemContent.indexOf(":");
        if (colon !== -1) {
          const obj = {};
          obj[itemContent.slice(0, colon).trim()] = stripScalar(itemContent.slice(colon + 1));
          pos += 1;
          const itemIndent = indent + 2;
          while (pos < lines.length && indentOf(lines[pos]) >= itemIndent && !lines[pos].trim().startsWith("- ")) {
            const sub = lines[pos].trim();
            const subColon = sub.indexOf(":");
            obj[sub.slice(0, subColon).trim()] = stripScalar(sub.slice(subColon + 1));
            pos += 1;
          }
          result.push(obj);
        } else {
          result.push(stripScalar(itemContent));
          pos += 1;
        }
        continue;
      }

      const colon = trimmed.indexOf(":");
      const key = trimmed.slice(0, colon).trim();
      const value = trimmed.slice(colon + 1).trim();
      if (value === "") {
        pos += 1;
        if (pos < lines.length && indentOf(lines[pos]) > indent) {
          result[key] = parseBlock(indentOf(lines[pos]));
        } else {
          result[key] = null;
        }
      } else {
        result[key] = stripScalar(value);
        pos += 1;
      }
    }
    return result;
  }

  return parseBlock(0);
}

const REQUIRED_CONTAINER_FIELDS = [
  "task_container_id", "task_id", "title", "requirement_type", "complexity", "status",
  "version", "pic", "executor", "approver", "auditor", "symbol_links",
  "definition_of_done", "changelog", "created_at", "token_telemetry", "ui_state",
];

function isPresent(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return String(value).trim() !== "";
}

// Contract enforcement: a container that is structurally incomplete is rejected,
// never rendered with fabricated values. Authored "unavailable" scalars count as present.
function validateTaskContainer(container) {
  const missingFields = [];
  for (const field of REQUIRED_CONTAINER_FIELDS) {
    if (!isPresent(container[field])) missingFields.push(field);
  }
  const symbolLinks = container.symbol_links ?? {};
  for (const key of ["code", "doc", "test"]) {
    if (!isPresent(symbolLinks[key])) missingFields.push(`symbol_links.${key}`);
  }
  const dod = container.definition_of_done ?? {};
  for (const key of ["acceptance_criteria", "success_criteria", "exit_criteria"]) {
    if (!Array.isArray(dod[key]) || dod[key].length === 0) missingFields.push(`definition_of_done.${key}`);
  }
  if (!isPresent((container.token_telemetry ?? {}).total_token_usage)) {
    missingFields.push("token_telemetry.total_token_usage");
  }
  return { complete: missingFields.length === 0, missingFields };
}

function extractTaskContainers(body) {
  const headingIndex = body.search(/^##\s+Task Containers\s*$/m);
  if (headingIndex === -1) return [];
  const rest = body.slice(headingIndex + 1);
  const nextHeading = rest.search(/^##\s+/m);
  const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
  const blocks = [...section.matchAll(/```ya?ml\s*\n([\s\S]*?)```/g)].map((match) => match[1]);

  return blocks.map((block) => {
    const parsed = parseYamlBlock(block);
    const { complete, missingFields } = validateTaskContainer(parsed);
    return { ...parsed, complete, missingFields };
  });
}

function buildMarkdownSnapshot(text, sourcePath) {
  const parsedAt = new Date().toISOString();
  const { data, body } = parseFrontmatter(text);
  const titleMatch = body.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? path.basename(sourcePath);
  const planningType = getPlanningTypeFromPath(sourcePath);
  const roadmapId = data.id ?? `RM-${slugify(title)}`;
  const sections = collectSectionTables(body);

  const nodes = [{
    id: roadmapId,
    type: "roadmap",
    title,
    state: mapWorkflowState(data.status),
    progress: parseNumber(data.progress) ?? 0,
    sourcePath,
    sourceSection: "Document Root",
    ...createTemporalVersion({
      version: data.version,
      validFrom: data.valid_from,
      validTo: data.valid_to,
      recordedAt: data.recorded_at,
      supersededAt: data.superseded_at,
    }, parsedAt),
  }];

  for (const row of [...(sections.get("Phases") ?? []), ...(sections.get("MVP Phases") ?? [])]) {
    const id = getColumn(row, ["Phase", "ID"]) || `PHASE-${slugify(getColumn(row, ["Goal", "Title"]) || "phase")}`;
    nodes.push({
      id,
      parentId: roadmapId,
      type: "phase",
      title: getColumn(row, ["Goal", "Title"]) || id,
      summary: getColumn(row, ["Exit Criteria", "Required Docs"]),
      state: mapWorkflowState(getColumn(row, ["Status"])),
      progress: parseNumber(getColumn(row, ["Progress"])),
      sourcePath,
      sourceSection: "Phases",
      ...readTemporalColumns((aliases) => getColumn(row, aliases), parsedAt),
    });
  }

  for (const row of [...(sections.get("Sprints") ?? []), ...(sections.get("High-Level Sprint Plan") ?? [])]) {
    const id = getColumn(row, ["Sprint", "ID"]) || `SPRINT-${slugify(getColumn(row, ["Goal", "Title"]) || "sprint")}`;
    nodes.push({
      id,
      parentId: getColumn(row, ["Parent ID", "Parent Epic", "Parent Phase"]) || nodes.find((node) => node.type === "phase")?.id || roadmapId,
      type: "sprint",
      title: getColumn(row, ["Goal", "Title"]) || id,
      summary: getColumn(row, ["Exit Criteria"]),
      state: mapWorkflowState(getColumn(row, ["Status"])),
      progress: parseNumber(getColumn(row, ["Progress"])),
      sourcePath,
      sourceSection: "Sprints",
      ...readTemporalColumns((aliases) => getColumn(row, aliases), parsedAt),
    });
  }

  for (const row of [...(sections.get("Backlog Items") ?? []), ...(sections.get("MVP Backlog Seed") ?? [])]) {
    const id = getColumn(row, ["ID"]) || `TASK-${slugify(getColumn(row, ["Title"]) || "task")}`;
    nodes.push({
      id,
      parentId: getColumn(row, ["Parent ID", "Parent", "Parent Epic", "Parent Sprint"]) || nodes.find((node) => node.type === "sprint")?.id || roadmapId,
      type: mapNodeType(getColumn(row, ["Type"]), "task"),
      title: getColumn(row, ["Title"]) || id,
      summary: getColumn(row, ["Acceptance", "Source Section"]),
      state: mapWorkflowState(getColumn(row, ["Status"])),
      progress: parseNumber(getColumn(row, ["Progress"])),
      assigneeId: getColumn(row, ["Owner", "Agent Assignment"]),
      sourcePath,
      sourceSection: getColumn(row, ["Source Section"]) || "Backlog Items",
      tags: parseDelimitedList(getColumn(row, ["PRD System", "Priority"])),
      artifactLinks: parseDelimitedList(getColumn(row, ["Dependencies"])),
      ...readTemporalColumns((aliases) => getColumn(row, aliases), parsedAt),
    });
  }

  for (const row of sections.get("Nodes") ?? []) {
    nodes.push({
      id: getColumn(row, ["ID"]),
      parentId: getColumn(row, ["Parent ID"]) || undefined,
      type: mapNodeType(getColumn(row, ["Type"])),
      title: getColumn(row, ["Title"]),
      summary: getColumn(row, ["Summary"]) || undefined,
      state: mapWorkflowState(getColumn(row, ["State", "Status"])),
      progress: parseNumber(getColumn(row, ["Progress"])),
      assigneeId: getColumn(row, ["Assignee", "Owner"]) || undefined,
      sourcePath,
      sourceSection: getColumn(row, ["Source Section"]) || "Nodes",
      tags: parseDelimitedList(getColumn(row, ["Tags"])),
      artifactLinks: parseDelimitedList(getColumn(row, ["Artifacts"])),
      ...readTemporalColumns((aliases) => getColumn(row, aliases), parsedAt),
    });
  }

  for (const node of parseChecklistNodes(body, sourcePath, parsedAt)) {
    if (!nodes.some((existing) => existing.id === node.id)) {
      nodes.push(node);
    }
  }

  const assignments = (sections.get("Assignments") ?? []).map((row) => ({
    taskId: getColumn(row, ["Task ID"]),
    subjectId: getColumn(row, ["Subject ID", "Assignee"]),
    subjectType: getColumn(row, ["Subject Type"]) || "agent",
    policyModel: getColumn(row, ["Policy Model"]) || "ABAC",
    assignedAt: getColumn(row, ["Assigned At"]) || new Date().toISOString(),
    assignedBy: getColumn(row, ["Assigned By"]) || undefined,
    ...readTemporalColumns((aliases) => getColumn(row, aliases), parsedAt),
  }));

  const handoffs = (sections.get("Handoffs") ?? []).map((row) => ({
    taskId: getColumn(row, ["Task ID"]),
    fromId: getColumn(row, ["From ID"]),
    toId: getColumn(row, ["To ID"]),
    requiredArtifact: getColumn(row, ["Required Artifact"]) || undefined,
    note: getColumn(row, ["Note"]) || undefined,
    createdAt: getColumn(row, ["Created At"]) || new Date().toISOString(),
    state: getColumn(row, ["State"]) || "pending",
    ...readTemporalColumns((aliases) => getColumn(row, aliases), parsedAt),
  }));

  const verifications = (sections.get("Verification") ?? []).map((row) => ({
    taskId: getColumn(row, ["Task ID"]),
    qaStatus: getColumn(row, ["QA Status"]) || undefined,
    auditStatus: getColumn(row, ["Audit Status"]) || undefined,
    deploymentStatus: getColumn(row, ["Deployment Status"]) || undefined,
    lastUpdatedAt: getColumn(row, ["Updated At"]) || undefined,
    ...readTemporalColumns((aliases) => getColumn(row, aliases), parsedAt),
  }));

  return {
    sourcePath,
    sourceType: "markdown",
    planningType,
    title,
    sourceVersion: data.version ?? "0.1.0",
    approvalStatus: data.status ?? "draft",
    updatedAt: data.updated ?? parsedAt,
    nodes,
    assignments,
    handoffs,
    verifications,
    taskContainers: extractTaskContainers(body),
  };
}

function buildHtmlSnapshot(text, sourcePath) {
  const parsedAt = new Date().toISOString();
  const root = parseHtml(text);
  const contractRoot = root.querySelector("[data-govibe-roadmap]");
  if (!contractRoot) {
    throw new Error(`HTML roadmap source '${sourcePath}' is missing [data-govibe-roadmap].`);
  }

  const planningType = getPlanningTypeFromPath(sourcePath);
  const title = contractRoot.getAttribute("data-title") ?? path.basename(sourcePath);
  const roadmapId = contractRoot.getAttribute("data-id") ?? `RM-${slugify(title)}`;
  const nodes = [{
    id: roadmapId,
    type: "roadmap",
    title,
    state: mapWorkflowState(contractRoot.getAttribute("data-status")),
    progress: parseNumber(contractRoot.getAttribute("data-progress")) ?? 0,
    sourcePath,
    sourceSection: "Document Root",
    ...createTemporalVersion({
      version: contractRoot.getAttribute("data-node-version") ?? contractRoot.getAttribute("data-version"),
      validFrom: contractRoot.getAttribute("data-valid-from"),
      validTo: contractRoot.getAttribute("data-valid-to"),
      recordedAt: contractRoot.getAttribute("data-recorded-at"),
      supersededAt: contractRoot.getAttribute("data-superseded-at"),
    }, parsedAt),
  }];

  for (const element of contractRoot.querySelectorAll("[data-roadmap-node]")) {
    nodes.push({
      id: element.getAttribute("data-id"),
      parentId: element.getAttribute("data-parent-id") || undefined,
      type: mapNodeType(element.getAttribute("data-type")),
      title: element.getAttribute("data-title") ?? element.text.trim(),
      summary: element.querySelector("[data-summary]")?.text.trim() || undefined,
      state: mapWorkflowState(element.getAttribute("data-state")),
      progress: parseNumber(element.getAttribute("data-progress")),
      assigneeId: element.getAttribute("data-assignee") || undefined,
      sourcePath,
      sourceSection: element.getAttribute("data-source-section") || "HTML Contract",
      tags: parseDelimitedList(element.getAttribute("data-tags")),
      artifactLinks: parseDelimitedList(element.getAttribute("data-artifacts")),
      ...createTemporalVersion({
        version: element.getAttribute("data-version"),
        validFrom: element.getAttribute("data-valid-from"),
        validTo: element.getAttribute("data-valid-to"),
        recordedAt: element.getAttribute("data-recorded-at"),
        supersededAt: element.getAttribute("data-superseded-at"),
      }, parsedAt),
    });
  }

  const assignments = contractRoot.querySelectorAll("[data-roadmap-assignment]").map((element) => ({
    taskId: element.getAttribute("data-task-id"),
    subjectId: element.getAttribute("data-subject-id"),
    subjectType: element.getAttribute("data-subject-type") || "agent",
    policyModel: element.getAttribute("data-policy-model") || "ABAC",
    assignedAt: element.getAttribute("data-assigned-at") || new Date().toISOString(),
    assignedBy: element.getAttribute("data-assigned-by") || undefined,
    ...createTemporalVersion({
      version: element.getAttribute("data-version"),
      validFrom: element.getAttribute("data-valid-from"),
      validTo: element.getAttribute("data-valid-to"),
      recordedAt: element.getAttribute("data-recorded-at"),
      supersededAt: element.getAttribute("data-superseded-at"),
    }, parsedAt),
  }));

  const handoffs = contractRoot.querySelectorAll("[data-roadmap-handoff]").map((element) => ({
    taskId: element.getAttribute("data-task-id"),
    fromId: element.getAttribute("data-from-id"),
    toId: element.getAttribute("data-to-id"),
    requiredArtifact: element.getAttribute("data-required-artifact") || undefined,
    note: element.getAttribute("data-note") || undefined,
    createdAt: element.getAttribute("data-created-at") || new Date().toISOString(),
    state: element.getAttribute("data-state") || "pending",
    ...createTemporalVersion({
      version: element.getAttribute("data-version"),
      validFrom: element.getAttribute("data-valid-from"),
      validTo: element.getAttribute("data-valid-to"),
      recordedAt: element.getAttribute("data-recorded-at"),
      supersededAt: element.getAttribute("data-superseded-at"),
    }, parsedAt),
  }));

  const verifications = contractRoot.querySelectorAll("[data-roadmap-verification]").map((element) => ({
    taskId: element.getAttribute("data-task-id"),
    qaStatus: element.getAttribute("data-qa-status") || undefined,
    auditStatus: element.getAttribute("data-audit-status") || undefined,
    deploymentStatus: element.getAttribute("data-deployment-status") || undefined,
    lastUpdatedAt: element.getAttribute("data-updated-at") || undefined,
    ...createTemporalVersion({
      version: element.getAttribute("data-version"),
      validFrom: element.getAttribute("data-valid-from"),
      validTo: element.getAttribute("data-valid-to"),
      recordedAt: element.getAttribute("data-recorded-at"),
      supersededAt: element.getAttribute("data-superseded-at"),
    }, parsedAt),
  }));

  return {
    sourcePath,
    sourceType: "html",
    planningType,
    title,
    sourceVersion: contractRoot.getAttribute("data-version") ?? "0.1.0",
    approvalStatus: contractRoot.getAttribute("data-status") ?? "draft",
    updatedAt: contractRoot.getAttribute("data-updated") ?? parsedAt,
    nodes,
    assignments,
    handoffs,
    verifications,
    taskContainers: [],
  };
}

export async function discoverRoadmapSources(roadmapDir) {
  const entries = await readdir(roadmapDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && roadmapFilePattern.test(entry.name))
    .map((entry) => {
      const fullPath = path.join(roadmapDir, entry.name);
      const ext = path.extname(entry.name).toLowerCase();
      return {
        path: fullPath,
        name: entry.name,
        sourceType: ext === ".html" ? "html" : "markdown",
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function parseRoadmapSource(sourcePath) {
  const text = await readFile(sourcePath, "utf8");
  const ext = path.extname(sourcePath).toLowerCase();
  return ext === ".html"
    ? buildHtmlSnapshot(text, sourcePath)
    : buildMarkdownSnapshot(text, sourcePath);
}
