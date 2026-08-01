import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const EXCLUDED_DIRECTORIES = new Set([".git", "node_modules", "dist", ".vite", ".vercel", ".turbo", "coverage"]);
const INDEXED_EXTENSIONS = /\.(md|mdx|mjs|cjs|js|jsx|ts|tsx|json|yaml|yml)$/i;
const RELATION_WEIGHTS = Object.freeze({
  implements: 1,
  defines: 1,
  imports: 0.95,
  calls: 0.9,
  validates: 0.88,
  governed_by: 0.86,
  renders: 0.78,
  references: 0.62,
  wikilink: 0.6,
  crosslink: 0.58,
  related_to: 0.3,
});
const CHANGE_WEIGHTS = Object.freeze({
  editorial: 0.45,
  schema_additive: 0.8,
  schema_breaking: 1,
  semantic_change: 0.9,
  authority_boundary_change: 1,
  runtime_behavior_change: 0.95,
});

function normalizeRepoPath(value) {
  return String(value ?? "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .split(/[?#]/)[0];
}

function stableId(prefix, value) {
  const digest = createHash("sha256").update(value).digest("hex").slice(0, 24);
  return `${prefix}_${digest}`;
}

async function listFiles(root) {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(fullPath);
      else if (entry.isFile() && INDEXED_EXTENSIONS.test(entry.name)) files.push(fullPath);
    }
  }
  await walk(root);
  return files;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*["']?([^"']+?)["']?\s*$/);
    if (field) result[field[1]] = field[2].trim();
  }
  return result;
}

function resolveRelativeSource(sourcePath, specifier, knownPaths) {
  if (!specifier.startsWith(".")) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), specifier));
  const candidates = [
    base,
    `${base}.mjs`, `${base}.cjs`, `${base}.js`, `${base}.jsx`, `${base}.ts`, `${base}.tsx`, `${base}.json`,
    `${base}/index.mjs`, `${base}/index.cjs`, `${base}/index.js`, `${base}/index.ts`, `${base}/index.tsx`,
  ];
  return candidates.find((candidate) => knownPaths.has(candidate)) ?? null;
}

function addEdge(edges, seen, edge) {
  if (!edge.from || !edge.to || edge.from === edge.to) return;
  const key = `${edge.from}\u0000${edge.to}\u0000${edge.relation}`;
  if (seen.has(key)) return;
  seen.add(key);
  edges.push({
    id: stableId("link", key),
    confidence: 1,
    provenance: [],
    ...edge,
  });
}

function targetFromLabel(label, sourcePath, indexes) {
  const clean = normalizeRepoPath(label.trim());
  if (!clean) return null;
  if (indexes.byPath.has(clean)) return clean;
  const relative = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), clean));
  if (indexes.byPath.has(relative)) return relative;
  if (indexes.byDocId.has(clean)) return indexes.byDocId.get(clean);
  if (indexes.byBasename.has(clean)) return indexes.byBasename.get(clean);
  if (indexes.byBasename.has(path.posix.basename(clean))) return indexes.byBasename.get(path.posix.basename(clean));
  return null;
}

function inferRelation(sourcePath, targetPath, textAround = "") {
  const source = sourcePath.toLowerCase();
  const target = targetPath.toLowerCase();
  const around = textAround.toLowerCase();
  if (/(^|\/)(?:tests?|specs?)(\/|$)|\.(?:test|spec)\./.test(source)) return "validates";
  if (/schema/.test(target) && /api|contract|packet|record/.test(around)) return "defines";
  if (/adr|std-/.test(target)) return "governed_by";
  if (/blueprint|api-/.test(target) && /src\//.test(source)) return "implements";
  if (/ui|component|view/.test(source)) return "renders";
  return "references";
}

function importSpecifiers(text) {
  const specifiers = [];
  const patterns = [
    /\bimport\s+(?:[^"'\n;]+?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bexport\s+[^"'\n;]+?\s+from\s+["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) specifiers.push({ value: match[1], offset: match.index });
  }
  return specifiers;
}

export async function buildLinkGraph(workspacePath) {
  const root = path.resolve(workspacePath);
  const fullPaths = await listFiles(root);
  const documents = [];
  for (const fullPath of fullPaths) {
    const relativePath = normalizeRepoPath(path.relative(root, fullPath));
    const text = await readFile(fullPath, "utf8").catch(() => "");
    documents.push({ path: relativePath, text, frontmatter: parseFrontmatter(text) });
  }

  const byPath = new Set(documents.map((item) => item.path));
  const byDocId = new Map();
  const basenameCandidates = new Map();
  for (const document of documents) {
    if (document.frontmatter.doc_id) byDocId.set(document.frontmatter.doc_id, document.path);
    const basename = path.posix.basename(document.path);
    const existing = basenameCandidates.get(basename);
    basenameCandidates.set(basename, existing === undefined ? document.path : null);
  }
  const byBasename = new Map([...basenameCandidates].filter(([, value]) => value));
  const indexes = { byPath, byDocId, byBasename };
  const edges = [];
  const unresolved = [];
  const seen = new Set();

  for (const document of documents) {
    const source = document.path;
    const text = document.text;

    for (const match of text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
      const target = targetFromLabel(match[1], source, indexes);
      if (target) addEdge(edges, seen, { from: source, to: target, relation: "wikilink", provenance: [{ path: source, offset: match.index }] });
      else unresolved.push({ source, label: match[1], relation: "wikilink", reason: "target_not_resolved" });
    }

    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      if (/^(?:https?:|mailto:|#)/i.test(match[1])) continue;
      const target = targetFromLabel(match[1], source, indexes);
      if (target) addEdge(edges, seen, { from: source, to: target, relation: inferRelation(source, target, match[0]), provenance: [{ path: source, offset: match.index }] });
      else unresolved.push({ source, label: match[1], relation: "references", reason: "target_not_resolved" });
    }

    for (const match of text.matchAll(/`([^`\n]+\.(?:md|mdx|mjs|cjs|js|jsx|ts|tsx|json|yaml|yml))`/gi)) {
      const target = targetFromLabel(match[1], source, indexes);
      if (target) addEdge(edges, seen, { from: source, to: target, relation: inferRelation(source, target, match[0]), provenance: [{ path: source, offset: match.index }] });
    }

    for (const specifier of importSpecifiers(text)) {
      const target = resolveRelativeSource(source, specifier.value, byPath);
      if (target) {
        const relation = inferRelation(source, target, "import") === "validates" ? "validates" : "imports";
        addEdge(edges, seen, { from: source, to: target, relation, provenance: [{ path: source, offset: specifier.offset }] });
      }
    }

    const relatedDocsBlock = text.match(/related_docs:\s*\n((?:\s+-\s+[^\n]+\n?)+)/);
    if (relatedDocsBlock) {
      for (const item of relatedDocsBlock[1].matchAll(/-\s+["']?([^"'\n]+?)["']?\s*$/gm)) {
        const target = targetFromLabel(item[1], source, indexes);
        if (target) addEdge(edges, seen, { from: source, to: target, relation: inferRelation(source, target, "related_docs"), provenance: [{ path: source }] });
        else unresolved.push({ source, label: item[1], relation: "references", reason: "related_doc_not_resolved" });
      }
    }
  }

  const incoming = new Map();
  const outgoing = new Map();
  for (const edge of edges) {
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    incoming.get(edge.to).push(edge);
    outgoing.get(edge.from).push(edge);
  }

  return {
    schema: "govibe-link-graph/v1",
    nodes: documents.map((document) => ({ id: `file:${document.path}`, path: document.path, doc_id: document.frontmatter.doc_id ?? null })),
    edges,
    backlinks: Object.fromEntries([...incoming].map(([target, targetEdges]) => [target, targetEdges.map((edge) => ({ source: edge.from, relation: edge.relation, link_id: edge.id }))])),
    unresolved,
    incoming,
    outgoing,
  };
}

function normalizeSeeds(paths, graph) {
  const seeds = [];
  const unresolvedSeeds = [];
  const seen = new Set();
  for (const raw of paths ?? []) {
    const normalized = normalizeRepoPath(raw);
    const candidates = [normalized, ...graph.nodes.filter((node) => node.doc_id === raw || path.posix.basename(node.path) === normalized).map((node) => node.path)];
    let resolved = false;
    for (const candidate of candidates) {
      if (!graph.nodes.some((node) => node.path === candidate) || seen.has(candidate)) continue;
      seen.add(candidate);
      seeds.push(candidate);
      resolved = true;
    }
    if (!resolved) unresolvedSeeds.push({ source: null, label: raw, relation: "change_seed", reason: "seed_not_resolved" });
  }
  return { seeds, unresolvedSeeds };
}

export async function calculateWorkspaceImpact({
  workspacePath,
  paths = [],
  changeType = "semantic_change",
  maxDistance = 3,
  minimumScore = 0.2,
} = {}) {
  const graph = await buildLinkGraph(workspacePath);
  const { seeds, unresolvedSeeds } = normalizeSeeds(paths, graph);
  const changeWeight = CHANGE_WEIGHTS[changeType] ?? CHANGE_WEIGHTS.semantic_change;
  const affected = new Map();
  const queue = seeds.map((seed) => ({ path: seed, distance: 0, chain: [] }));
  const bestTraversal = new Map(seeds.map((seed) => [seed, 1]));

  while (queue.length) {
    const current = queue.shift();
    if (current.distance >= maxDistance) continue;
    for (const edge of graph.incoming.get(current.path) ?? []) {
      const relationWeight = RELATION_WEIGHTS[edge.relation] ?? RELATION_WEIGHTS.related_to;
      const distance = current.distance + 1;
      const distanceDecay = distance === 1 ? 1 : distance === 2 ? 0.7 : 0.45 ** (distance - 2);
      const score = Math.min(1, relationWeight * distanceDecay * changeWeight * edge.confidence);
      if (score < minimumScore) continue;
      const chain = [{ source: edge.from, target: edge.to, relation: edge.relation, link_id: edge.id }, ...current.chain];
      const existing = affected.get(edge.from);
      if (!existing || score > existing.impact_score) {
        affected.set(edge.from, {
          id: `file:${edge.from}`,
          path: edge.from,
          distance,
          impact_score: Number(score.toFixed(4)),
          relations: [...new Set(chain.map((item) => item.relation))],
          reason: `${edge.from} ${edge.relation} ${edge.to}; the changed dependency is ${distance} backlink hop${distance === 1 ? "" : "s"} away.`,
          required_action: score >= 0.8 ? "must_update" : score >= 0.5 ? "review_and_update" : "review",
          chain,
        });
      }
      if ((bestTraversal.get(edge.from) ?? 0) < score) {
        bestTraversal.set(edge.from, score);
        queue.push({ path: edge.from, distance, chain });
      }
    }
  }

  for (const seed of seeds) affected.delete(seed);
  const affectedList = [...affected.values()].sort((a, b) => b.impact_score - a.impact_score || a.distance - b.distance || a.path.localeCompare(b.path));
  return {
    schema: "govibe-impact/v2",
    change_id: stableId("change", JSON.stringify({ seeds, changeType, maxDistance })),
    change_type: changeType,
    seeds: seeds.map((seed) => ({ id: `file:${seed}`, path: seed })),
    affected: affectedList,
    references: affectedList.map((item) => item.path),
    unresolved: [...unresolvedSeeds, ...graph.unresolved],
    graph_summary: { nodes: graph.nodes.length, links: graph.edges.length, backlinks: Object.keys(graph.backlinks).length },
    policy: { max_distance: maxDistance, minimum_score: minimumScore },
  };
}
