import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const repoRoot = process.cwd();
const docWriterRoot = ".agents/doc_writer";
const templateRoot = ".agents/doc_writer/template";

const requiredTemplates = [
  "PRD-template.md",
  "SRS-template.md",
  "SDD-template.md",
  "C4-template.md",
  "LLD-template.md",
  "FEAT-template.md",
  "API-CONTRACT-template.md",
  "RUNBOOK-template.md",
  "TEST-PLAN-template.md",
  "ADR-template.md",
  "PROJECT-STRUCTURE-template.md",
  "AGENTS-template.md",
  "RCA-template.md",
  "MIGRATION-PLAN-template.md",
  "UI-UX-DESIGN-template.md",
];

const requiredFrontmatter = ["doc_id", "status", "version", "updated"];
const ingestionFrontmatter = ["owner", "source_of_truth"];
const ignoredDirs = new Set([".git", "node_modules", "dist", ".vercel", ".vite", ".turbo"]);
const results = {
  errors: [],
  warnings: [],
  checked: {
    templates: 0,
    markdown: 0,
    docIds: 0,
    pathReferences: 0,
  },
};

function toRepoPath(path) {
  return relative(repoRoot, path).replace(/\\/g, "/");
}

function repoResolve(path) {
  return resolve(repoRoot, path);
}

function addError(file, message) {
  results.errors.push({ file, message });
}

function addWarning(file, message) {
  results.warnings.push({ file, message });
}

function readRepoFile(path) {
  return readFileSync(repoResolve(path), "utf8");
}

function walk(dir, files = []) {
  const absDir = repoResolve(dir);
  if (!existsSync(absDir)) return files;

  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walk(join(dir, entry.name), files);
      }
      continue;
    }

    if (entry.isFile()) {
      files.push(toRepoPath(join(absDir, entry.name)));
    }
  }

  return files;
}

function parseFrontmatter(content) {
  const match = content.replace(/^\uFEFF/, "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    let value = field[2].trim();
    value = value.replace(/^["']|["']$/g, "");
    data[field[1]] = value;
  }

  return data;
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

function collectSectionTables(content) {
  const lines = content.split(/\r?\n/);
  const tables = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index].match(/^##\s+(.+)$/);
    if (!heading) continue;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (lines[cursor].trim().startsWith("|")) {
        const parsed = parseMarkdownTable(lines, cursor);
        if (parsed) {
          tables.set(heading[1].trim(), parsed.rows);
          index = parsed.nextIndex - 1;
        }
        break;
      }
      if (lines[cursor].startsWith("## ")) break;
    }
  }
  return tables;
}

function getColumn(row, aliases) {
  for (const alias of aliases) {
    const key = Object.keys(row).find((candidate) => candidate.trim().toLowerCase() === alias.toLowerCase());
    if (key) return row[key];
  }
  return "";
}

function isActionableType(type) {
  return ["task", "sub-task", "micro-task", "atomic-task"].includes(String(type ?? "").trim().toLowerCase());
}

function checkTemporalOrder(file, row, label) {
  const validFrom = getColumn(row, ["Valid From"]);
  const validTo = getColumn(row, ["Valid To"]);
  const recordedAt = getColumn(row, ["Recorded At"]);
  const supersededAt = getColumn(row, ["Superseded At"]);
  if (validFrom && Number.isNaN(Date.parse(validFrom))) addError(file, `${label}: Valid From is not a valid timestamp.`);
  if (validTo && Number.isNaN(Date.parse(validTo))) addError(file, `${label}: Valid To is not a valid timestamp.`);
  if (recordedAt && Number.isNaN(Date.parse(recordedAt))) addError(file, `${label}: Recorded At is not a valid timestamp.`);
  if (supersededAt && Number.isNaN(Date.parse(supersededAt))) addError(file, `${label}: Superseded At is not a valid timestamp.`);
  if (validFrom && validTo && Date.parse(validFrom) > Date.parse(validTo)) {
    addError(file, `${label}: Valid From must be before or equal to Valid To.`);
  }
  if (recordedAt && supersededAt && Date.parse(recordedAt) > Date.parse(supersededAt)) {
    addError(file, `${label}: Recorded At must be before or equal to Superseded At.`);
  }
}

function hasSection(content, names) {
  return names.some((name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^#{2,6}\\s+(?:\\d+\\.\\s*)?${escaped}\\b`, "im").test(content);
  });
}

function extractBacktickPaths(content) {
  const paths = [];
  const regex = /`([^`]+\.(?:md|yaml|yml|mjs|ts|tsx|json))`/g;
  let match;
  while ((match = regex.exec(content))) {
    paths.push(match[1]);
  }
  return paths;
}

function normalizeTemplatePath(path) {
  if (path.startsWith("template/")) {
    return `${templateRoot}/${path.slice("template/".length)}`;
  }
  return path.replace(/\\/g, "/");
}

function checkTemplateRegistry() {
  const theseusPath = `${docWriterRoot}/THESEUS.md`;
  const theseus = readRepoFile(theseusPath);
  const registryTemplates = extractBacktickPaths(theseus)
    .filter((path) => path.startsWith("template/") || path.startsWith(templateRoot))
    .map(normalizeTemplatePath);

  for (const template of requiredTemplates) {
    const path = `${templateRoot}/${template}`;
    results.checked.templates += 1;
    if (!existsSync(repoResolve(path))) {
      addError(path, "Required template is missing from the canonical template folder.");
    }
  }

  for (const path of registryTemplates) {
    results.checked.templates += 1;
    if (!path.startsWith(`${templateRoot}/`)) {
      addError(theseusPath, `Template registry must point at ${templateRoot}: ${path}`);
      continue;
    }
    if (!existsSync(repoResolve(path))) {
      addError(theseusPath, `Template referenced by THESEUS does not exist: ${path}`);
    }
  }

  if (/`templates\/`/.test(theseus)) {
    addWarning(theseusPath, "Legacy root templates/ is mentioned only as a deprecation note.");
  }
}

function checkDocIds(markdownFiles) {
  const seen = new Map();

  for (const file of markdownFiles) {
    const content = readRepoFile(file);
    const frontmatter = parseFrontmatter(content);
    results.checked.markdown += 1;
    if (!frontmatter?.doc_id) continue;

    results.checked.docIds += 1;
    const duplicate = seen.get(frontmatter.doc_id);
    if (duplicate) {
      addError(file, `Duplicate doc_id "${frontmatter.doc_id}" also appears in ${duplicate}.`);
    } else {
      seen.set(frontmatter.doc_id, file);
    }

    const isSourceOfTruth = frontmatter.source_of_truth === "true";
    const isCanonicalTemplate = file.startsWith(`${templateRoot}/`);
    const isDocsCanonical = file.startsWith("docs/") && !file.startsWith("docs/archive/");
    const mustPassFrontmatter = isSourceOfTruth || isCanonicalTemplate || isDocsCanonical;

    for (const field of requiredFrontmatter) {
      if (!frontmatter[field]) {
        const message = `Missing required frontmatter field: ${field}.`;
        if (mustPassFrontmatter) {
          addError(file, message);
        } else {
          addWarning(file, message);
        }
      }
    }

    if (isSourceOfTruth) {
      for (const field of ingestionFrontmatter) {
        if (!frontmatter[field]) {
          addError(file, `Source-of-truth ingestion doc is missing frontmatter field: ${field}.`);
        }
      }
    }
  }
}

function checkTemplateSections() {
  const feat = readRepoFile(`${templateRoot}/FEAT-template.md`);
  const srs = readRepoFile(`${templateRoot}/SRS-template.md`);
  const rca = readRepoFile(`${templateRoot}/RCA-template.md`);
  const testPlan = readRepoFile(`${templateRoot}/TEST-PLAN-template.md`);

  const checks = [
    [`${templateRoot}/FEAT-template.md`, feat, ["Acceptance Criteria", "Success Criteria", "Definition of Done", "Verification"]],
    [`${templateRoot}/SRS-template.md`, srs, ["Acceptance Criteria", "Success Criteria", "Definition of Done", "Traceability Matrix"]],
    [`${templateRoot}/RCA-template.md`, rca, ["Root Cause", "Why It Escaped", "Prevention"]],
    [`${templateRoot}/TEST-PLAN-template.md`, testPlan, ["Test Cases", "Sign-off"]],
  ];

  for (const [file, content, sections] of checks) {
    for (const section of sections) {
      if (!hasSection(content, [section])) {
        addError(file, `Missing required section: ${section}.`);
      }
    }
  }
}

function checkPathReferences(files) {
  const stalePatterns = [
    {
      regex: /\bPRD-Platform-Overview\.md\b/g,
      replacement: "docs/PRD-GoVibe-Platform-Overview.md",
      allow: /PRD-GoVibe-Platform-Overview\.md/,
    },
    {
      regex: /\bstandards\/Complexity-Based\.md\b|\bstandards\\Complexity-Based\.md\b/g,
      replacement: "docs/STD-Execution-Governance.md",
    },
  ];

  for (const file of files) {
    const content = readRepoFile(file);

    for (const pattern of stalePatterns) {
      if (pattern.regex.test(content) && !pattern.allow?.test(content)) {
        addError(file, `Stale reference found; use ${pattern.replacement}.`);
      }
      pattern.regex.lastIndex = 0;
    }

    if (/`templates\/(?!`)/.test(content) && !/deprecated|deprecation|Legacy root `templates\/`/i.test(content)) {
      addError(file, `Root templates/ is not canonical; use ${templateRoot}/.`);
    }

    const candidatePaths = extractBacktickPaths(content);
    for (const candidate of candidatePaths) {
      const normalized = normalizeTemplatePath(candidate);
      if (!isResolvableReference(normalized)) continue;
      results.checked.pathReferences += 1;
      if (!existsSync(repoResolve(normalized))) {
        const message = `Referenced path does not exist: ${candidate}`;
        if (file.startsWith(".agents/") || file.startsWith("standards/") || file.startsWith("docs/runbooks/")) {
          addError(file, message);
        } else {
          addWarning(file, message);
        }
      }
    }
  }
}

function isResolvableReference(path) {
  if (/^https?:\/\//.test(path)) return false;
  if (path.includes("*")) return false;
  if (path.includes("<") || path.includes(">")) return false;
  if (path.startsWith("@")) return false;
  if (path.startsWith("./") || path.startsWith("../")) return false;
  return /^(docs|standards|\.agents|scripts|src|comp|public|workflows|template)\//.test(path);
}

function checkLegacyDocs(markdownFiles) {
  for (const file of markdownFiles) {
    if (!/^docs\/(features|srs)\//.test(file) || file === "docs/features/README.md") continue;
    const content = readRepoFile(file);
    if (!hasSection(content, ["Acceptance Criteria"])) {
      addWarning(file, "Task-driving doc has no explicit Acceptance Criteria section.");
    }
    if (!hasSection(content, ["Success Criteria"])) {
      addWarning(file, "Task-driving doc has no explicit Success Criteria section.");
    }
    if (!hasSection(content, ["Definition of Done"])) {
      addWarning(file, "Task-driving doc has no explicit Definition of Done section.");
    }
  }
}

function checkRoadmapTemporalIntegrity(markdownFiles) {
  const roadmapFiles = markdownFiles.filter((file) => /^docs\/roadmap\/(ROADMAP|BACKLOG|SPRINT)-.+\.md$/i.test(file));

  for (const file of roadmapFiles) {
    const tables = collectSectionTables(readRepoFile(file));
    const nodes = [];
    const seen = new Set();

    for (const row of tables.get("Phases") ?? []) {
      const id = getColumn(row, ["Phase", "ID"]);
      if (!id) continue;
      nodes.push({ id, parentId: "", type: "phase" });
      checkTemporalOrder(file, row, `node ${id}`);
    }
    for (const row of tables.get("Sprints") ?? []) {
      const id = getColumn(row, ["Sprint", "ID"]);
      if (!id) continue;
      nodes.push({ id, parentId: getColumn(row, ["Parent ID", "Parent Epic", "Parent Phase"]), type: "sprint" });
      checkTemporalOrder(file, row, `node ${id}`);
    }
    for (const row of tables.get("Backlog Items") ?? []) {
      const id = getColumn(row, ["ID"]);
      if (!id) continue;
      nodes.push({ id, parentId: getColumn(row, ["Parent ID", "Parent", "Parent Epic", "Parent Sprint"]), type: getColumn(row, ["Type"]) || "task" });
      checkTemporalOrder(file, row, `node ${id}`);
    }
    for (const row of tables.get("Nodes") ?? []) {
      const id = getColumn(row, ["ID"]);
      if (!id) continue;
      nodes.push({ id, parentId: getColumn(row, ["Parent ID"]), type: getColumn(row, ["Type"]) || "task" });
      checkTemporalOrder(file, row, `node ${id}`);
    }

    for (const node of nodes) {
      if (seen.has(node.id)) addError(file, `Duplicate roadmap node id: ${node.id}.`);
      seen.add(node.id);
    }

    const nodeIds = new Set(nodes.map((node) => node.id));
    for (const node of nodes) {
      if (node.parentId && !nodeIds.has(node.parentId)) {
        addError(file, `Broken parentId for ${node.id}: ${node.parentId}.`);
      }
    }

    const actionableIds = new Set(nodes.filter((node) => isActionableType(node.type)).map((node) => node.id));
    for (const [section, rows] of [
      ["Assignments", tables.get("Assignments") ?? []],
      ["Handoffs", tables.get("Handoffs") ?? []],
      ["Verification", tables.get("Verification") ?? []],
    ]) {
      for (const row of rows) {
        const taskId = getColumn(row, ["Task ID"]);
        if (!taskId) continue;
        if (!actionableIds.has(taskId)) {
          addError(file, `${section} references unknown or non-actionable taskId: ${taskId}.`);
        }
        checkTemporalOrder(file, row, `${section} ${taskId}`);
      }
    }
  }
}

function main() {
  const markdownFiles = [
    ...walk("docs").filter((file) => file.endsWith(".md")),
    ...walk(".agents").filter((file) => file.endsWith(".md")),
    ...walk("standards").filter((file) => file.endsWith(".md")),
  ];

  const referenceFiles = [
    ...markdownFiles,
    ...walk("scripts").filter((file) => /\.(mjs|js|ts|tsx|json)$/.test(file)),
    "package.json",
  ].filter((file) => existsSync(repoResolve(file)) && statSync(repoResolve(file)).isFile());

  checkTemplateRegistry();
  checkDocIds(markdownFiles);
  checkTemplateSections();
  checkPathReferences(referenceFiles);
  checkLegacyDocs(markdownFiles);
  checkRoadmapTemporalIntegrity(markdownFiles);

  printReport();

  if (results.errors.length > 0) {
    process.exitCode = 1;
  }
}

function printReport() {
  console.log("GoVibe documentation validation");
  console.log("--------------------------------");
  console.log(`Templates checked: ${results.checked.templates}`);
  console.log(`Markdown files checked: ${results.checked.markdown}`);
  console.log(`Document IDs checked: ${results.checked.docIds}`);
  console.log(`Path references checked: ${results.checked.pathReferences}`);

  if (results.errors.length > 0) {
    console.log("\nErrors:");
    for (const item of results.errors) {
      console.log(`- ${item.file}: ${item.message}`);
    }
  }

  if (results.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const [message, files] of groupByMessage(results.warnings)) {
      console.log(`- ${message} (${files.length})`);
      for (const file of files.slice(0, 5)) {
        console.log(`  - ${file}`);
      }
      if (files.length > 5) {
        console.log(`  - ...and ${files.length - 5} more`);
      }
    }
  }

  if (results.errors.length === 0) {
    console.log("\nPASS: documentation baseline is valid.");
  } else {
    console.log(`\nFAIL: ${results.errors.length} validation error(s).`);
  }
}

function groupByMessage(items) {
  const grouped = new Map();
  for (const item of items) {
    const files = grouped.get(item.message) ?? [];
    files.push(item.file);
    grouped.set(item.message, files);
  }
  return grouped.entries();
}

main();
