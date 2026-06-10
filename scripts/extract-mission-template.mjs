import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(repoRoot, "GoVibe-Mission-Control-template.html");
const outRoot = join(repoRoot, "comp", "mission-control-template");
const source = readFileSync(sourcePath, "utf8");

const ensureDir = (path) => mkdir(path, { recursive: true });

const writeModule = async (relativePath, content) => {
  const target = join(outRoot, relativePath);
  await ensureDir(dirname(target));
  await writeFile(target, content.trimEnd() + "\n", "utf8");
  return {
    path: relativePath.replaceAll("\\", "/"),
    bytes: Buffer.byteLength(content, "utf8"),
    lines: content.split(/\r?\n/).length,
  };
};

const findTagBlock = (tagName, fromIndex = 0, attributes = "") => {
  const openPattern = new RegExp(`<${tagName}${attributes}[^>]*>`, "i");
  const openMatch = openPattern.exec(source.slice(fromIndex));
  if (!openMatch) throw new Error(`Missing <${tagName}> after index ${fromIndex}`);
  const start = fromIndex + openMatch.index;
  const innerStart = start + openMatch[0].length;
  const closePattern = new RegExp(`</${tagName}>`, "i");
  const closeMatch = closePattern.exec(source.slice(innerStart));
  if (!closeMatch) throw new Error(`Missing </${tagName}> after index ${innerStart}`);
  const innerEnd = innerStart + closeMatch.index;
  const end = innerEnd + closeMatch[0].length;
  return {
    start,
    end,
    openTag: openMatch[0],
    closeTag: closeMatch[0],
    content: source.slice(innerStart, innerEnd),
    outer: source.slice(start, end),
  };
};

const lineNumberAt = (index) => source.slice(0, index).split(/\r?\n/).length;

const viewMarkers = [
  { id: "A1", file: "views/A/A1-dashboard.html", marker: "<!-- [A1] Dashboard View -->" },
  { id: "A2", file: "views/A/A2-roadmap-tracker.html", marker: "<!-- [A2] Roadmap Tracker View (Detailed accordion checklist) -->" },
  { id: "A3", file: "views/A/A3-plugins.html", marker: "<!-- [A3] Plugins View -->" },
  { id: "A4", file: "views/A/A4-brain-settings.html", marker: "<!-- [A4] Brain Settings View -->" },
  { id: "A5", file: "views/A/A5-agent-management-carousel.html", marker: "<!-- [A5] Agent Management Carousel -->" },
  { id: "B1", file: "views/B/B1-ast-explorer.html", marker: "<!-- [B1] AST Explorer -->" },
  { id: "B2", file: "views/B/B2-business-specifications.html", marker: "<!-- [B2] Business Specifications -->" },
  { id: "B3", file: "views/B/B3-graph-studio.html", marker: "<!-- [B3] Graph Studio -->" },
  { id: "B4", file: "views/B/B4-call-graph-visualizer.html", marker: "<!-- [B4] Call Graph Visualizer (Cytoscape.js) -->" },
  { id: "C1", file: "views/C/C1-symbol-explorer.html", marker: "<!-- [C1] Symbol Explorer -->" },
  { id: "C2", file: "views/C/C2-intelligence-zoo.html", marker: "<!-- [C2] Intelligence Zoo -->" },
  { id: "C3", file: "views/C/C3-srs-g-debugger.html", marker: "<!-- [C3] SRS-G Debugger / query test input -->" },
  { id: "C4", file: "views/C/C4-database-erd-schema.html", marker: "<!-- [C4] Database ERD Schema -->" },
  { id: "C5", file: "views/C/C5-hnsw-vector-space-map.html", marker: "<!-- [C5] HNSW Vector Space Map -->" },
  { id: "D1", file: "views/D/D1-reactor-run-trigger.html", marker: "<!-- [D1] Reactor Run Trigger -->" },
  { id: "D2", file: "views/D/D2-cyber-reactor-heatmap.html", marker: "<!-- [D2] Cyber Reactor Heatmap View -->" },
  { id: "D3", file: "views/D/D3-eabs-campaign-logs.html", marker: "<!-- [D3] EABS-01 Campaign Logs -->" },
];

const markerPositions = viewMarkers.map((view) => {
  const start = source.indexOf(view.marker);
  if (start === -1) throw new Error(`Missing view marker: ${view.marker}`);
  return { ...view, start };
});

const scriptIntegrationsStart = source.indexOf("    <!-- Script integrations -->");
if (scriptIntegrationsStart === -1) throw new Error("Missing script integrations marker");
const finalRuntimeStart = source.indexOf("<script>", scriptIntegrationsStart);
if (finalRuntimeStart === -1) throw new Error("Missing final runtime script");
const finalRuntimeEnd = source.indexOf("    </script>", finalRuntimeStart);
if (finalRuntimeEnd === -1) throw new Error("Missing final runtime script end");

const modules = [];

const consolePatch = findTagBlock("script", 0);
modules.push(await writeModule("scripts/00-console-warn-filter.js", consolePatch.content));

const tailwindConfigStart = source.indexOf("    <script>", consolePatch.end);
const tailwindConfig = findTagBlock("script", tailwindConfigStart);
modules.push(await writeModule("config/tailwind.config.inline.js", tailwindConfig.content));

const styleBlock = findTagBlock("style");
modules.push(await writeModule("styles/template.css", styleBlock.content));

const firstViewStart = markerPositions[0].start;
modules.push(await writeModule("layout/body-before-views.html", source.slice(source.indexOf("<body"), firstViewStart)));

const afterViewsMatch = /\r?\n\s*<\/div>\r?\n\s*<\/main>/.exec(source.slice(markerPositions.at(-1).start, scriptIntegrationsStart));
if (!afterViewsMatch) throw new Error("Cannot find shell closing block after views");
const afterViewsStart = markerPositions.at(-1).start + afterViewsMatch.index;

for (const [index, view] of markerPositions.entries()) {
  const next = markerPositions[index + 1]?.start ?? afterViewsStart;
  if (next === -1) throw new Error(`Cannot find end for view ${view.id}`);
  const content = source.slice(view.start, next);
  modules.push(await writeModule(view.file, content));
  view.lineStart = lineNumberAt(view.start);
  view.lineEnd = lineNumberAt(next);
}

modules.push(await writeModule("layout/body-after-views-before-runtime.html", source.slice(afterViewsStart, finalRuntimeStart)));

const runtimeOpen = findTagBlock("script", scriptIntegrationsStart);
const runtimeInnerStart = runtimeOpen.start + runtimeOpen.openTag.length;
const runtimeInnerEnd = finalRuntimeEnd;
modules.push(await writeModule("scripts/mission-control.runtime.js", source.slice(runtimeInnerStart, runtimeInnerEnd)));

const readme = `# Mission Control Template Modules

Generated from \`${basename(sourcePath)}\` by \`scripts/extract-mission-template.mjs\`.

This folder is an extraction of the original single-file template. The intent is modular ownership while preserving the original code blocks as source material.

## Layout

- \`layout/body-before-views.html\`: body shell before the view blocks.
- \`views/A-D/*.html\`: extracted view blocks, one file per module ID.
- \`layout/body-after-views-before-runtime.html\`: shell after views, before runtime.
- \`styles/template.css\`: original inline CSS.
- \`scripts/mission-control.runtime.js\`: original final runtime script.
- \`config/tailwind.config.inline.js\`: original inline Tailwind config.
- \`scripts/00-console-warn-filter.js\`: original early console warning filter.

## Rule

Do not manually rewrite these modules when the goal is parity with the template. Update \`${basename(sourcePath)}\` or the extractor, then rerun:

\`\`\`powershell
node scripts/extract-mission-template.mjs
\`\`\`
`;
modules.push(await writeModule("README.md", readme));

const manifest = {
  generatedAt: new Date().toISOString(),
  source: basename(sourcePath),
  sourceBytes: Buffer.byteLength(source, "utf8"),
  outputRoot: "comp/mission-control-template",
  views: markerPositions.map(({ id, file, marker, lineStart, lineEnd }) => ({ id, file, marker, lineStart, lineEnd })),
  modules,
};
modules.push(await writeModule("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`));

console.log(`Extracted ${modules.length} modules to ${outRoot}`);
