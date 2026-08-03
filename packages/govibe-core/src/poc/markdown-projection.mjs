/**
 * POC Markdown projection back-end (TDD-POC-CANONICAL-LOOP phase 5).
 *
 * Renders a compiled view as a Markdown document. The output is a GENERATED
 * projection, never a canonical source: it declares its graph revision and view
 * manifest, and deleting it must not mutate canonical state (CSIR-FR-043).
 *
 * The emitted `## Nodes` table uses the ingestible roadmap column set, so a
 * generated projection can be fed back through the front-end.
 */
const COLUMNS = ["ID", "Parent ID", "Type", "Title", "State", "Progress", "Owner", "Canonical Ref", "Source Section"];

function cell(value) {
  if (value === undefined || value === null || value === "") return "-";
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/**
 * @param {{manifest: object, nodes: Array, omitted: Array, unresolved: Array,
 *          conflicted: Array}} view
 * @returns {string} deterministic Markdown for a given view payload
 */
export function renderRoadmapMarkdown(view) {
  const { manifest } = view;
  const lines = [
    "---",
    `title: "Projection: ${manifest.viewDefinition}"`,
    `doc_id: "PROJECTION-${manifest.viewDefinition.toUpperCase()}"`,
    'status: "generated"',
    'source_of_truth: false',
    `graph_revision: "${manifest.graphRevision}"`,
    `graph_hash: "${manifest.graphHash}"`,
    `view_definition: "${manifest.viewDefinition}"`,
    `template_version: "${manifest.templateVersion}"`,
    `content_hash: "${manifest.contentHash}"`,
    "---",
    "",
    `# Projection: ${manifest.viewDefinition}`,
    "",
    "> Generated from the canonical semantic graph. Do not edit by hand — edits made here are not canonical.",
    "> Change the graph through a semantic delta, then regenerate this file.",
    "",
    "## Nodes",
    "",
    `| ${COLUMNS.join(" | ")} |`,
    `|${COLUMNS.map(() => "---").join("|")}|`,
  ];

  for (const node of view.nodes) {
    lines.push(`| ${[
      cell(node.id),
      cell(node.parentId),
      cell(node.type),
      cell(node.title),
      cell(node.state),
      cell(node.progress),
      cell(node.assigneeId),
      cell(node.canonicalRef),
      cell(node.provenance?.sourceSection),
    ].join(" | ")} |`);
  }

  // CSIR-FR-045: the projection states what it left out.
  lines.push("", "## Projection Coverage", "");
  lines.push(`- nodes: ${view.nodes.length}`);
  lines.push(`- omitted by view definition: ${view.omitted.length}`);
  lines.push(`- unresolved parents: ${view.unresolved.length}`);
  lines.push(`- conflicted atoms: ${view.conflicted.length}`);

  for (const entry of view.unresolved) {
    lines.push(`  - unresolved parent \`${entry.parentId}\` for \`${entry.canonicalRef}\``);
  }
  for (const entry of view.conflicted) {
    lines.push(`  - conflicted \`${entry.canonicalRef}\`: ${entry.reason}`);
  }

  return lines.join("\n") + "\n";
}
