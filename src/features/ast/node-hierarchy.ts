import type { MissionSnapshot } from "../../mission";

// TASK-PRD-007 (F4): snapshot.graph.nodes has no parent/child relation of its own -- Round 1/2's
// "AST Tree" was a flat .map() over heterogeneous node kinds (file/directory/symbol/route/orm/
// markdown-section/cobol/tool), which is neither a tree nor an AST. Every node id published by
// the runtime IS path-shaped though (packages/govibe-core/src/scan/stage-adapters.mjs):
//   file:<path>            directory:<path>        markdown:<path>[:<line>]
//   symbol:<path>:<pos>     route:<path>:<pos>      orm:<path>:<index>
//   cobol:<path>:<name>     tool:<dotted.name>  (not path-shaped -- bucketed separately)
// This derives a genuine directory/file hierarchy from those ids without inventing any
// structure the contract doesn't already carry: directories nest by path segment, and
// file-scoped observations (symbols, routes, ORM models, markdown sections, COBOL programs)
// attach as leaves under the file they were observed in.

export type HierarchyLeaf = { id: string; label: string; kind: string; suffix?: string };

export type HierarchyNode = {
  name: string;
  /** Full slash-joined path from the workspace root; "" only for the synthetic root. */
  path: string;
  kind: "directory" | "file" | "bucket";
  children: HierarchyNode[];
  leaves: HierarchyLeaf[];
  /** Count of every descendant node + leaf under this node (excludes the node itself). */
  totalCount: number;
};

const ROOT_NAME = "workspace";
const TOOL_BUCKET_PATH = "(tool references)";

function parseNodeId(id: string): { kind: string; path: string; suffix?: string } {
  const sep = id.indexOf(":");
  // No `kind:` prefix at all -- none of the contract's known id shapes look like this, so there
  // is no path to recover. Report an empty path rather than treating the whole id as one.
  if (sep === -1) return { kind: "unknown", path: "" };
  const kind = id.slice(0, sep);
  const rest = id.slice(sep + 1);
  if (kind === "tool") return { kind, path: "", suffix: rest };
  const lastColon = rest.lastIndexOf(":");
  if (lastColon === -1) return { kind, path: rest };
  return { kind, path: rest.slice(0, lastColon), suffix: rest.slice(lastColon + 1) };
}

function getOrCreateChild(parent: HierarchyNode, name: string, kind: "directory" | "file"): HierarchyNode {
  let child = parent.children.find((candidate) => candidate.name === name);
  if (!child) {
    child = { name, path: parent.path ? `${parent.path}/${name}` : name, kind, children: [], leaves: [], totalCount: 0 };
    parent.children.push(child);
  } else if (kind === "file") {
    // A later file:/symbol:/etc. observation confirms this path is a file, not a directory.
    child.kind = "file";
  }
  return child;
}

function ensurePath(root: HierarchyNode, path: string, isFile: boolean): HierarchyNode {
  const segments = path.split("/").filter(Boolean);
  let node = root;
  segments.forEach((segment, index) => {
    const last = index === segments.length - 1;
    node = getOrCreateChild(node, segment, last && isFile ? "file" : "directory");
  });
  return node;
}

function computeTotals(node: HierarchyNode): number {
  let total = node.leaves.length;
  for (const child of node.children) total += computeTotals(child) + 1;
  node.totalCount = total;
  return total;
}

/**
 * Builds a directory/file hierarchy strictly from the path segments already encoded in
 * `graph.nodes[].id`. A node with no recoverable path (unknown id shape) is skipped rather
 * than placed under an invented location.
 */
export function buildNodeHierarchy(nodes: MissionSnapshot["graph"]["nodes"]): HierarchyNode {
  const root: HierarchyNode = { name: ROOT_NAME, path: "", kind: "directory", children: [], leaves: [], totalCount: 0 };
  const toolBucket: HierarchyNode = { name: TOOL_BUCKET_PATH, path: TOOL_BUCKET_PATH, kind: "bucket", children: [], leaves: [], totalCount: 0 };

  for (const node of nodes) {
    const parsed = parseNodeId(node.id);
    if (parsed.kind === "tool") {
      toolBucket.leaves.push({ id: node.id, label: node.label, kind: parsed.kind, suffix: parsed.suffix });
      continue;
    }
    if (!parsed.path) continue;
    if (parsed.suffix === undefined) {
      // The node itself IS the file or directory (file:, directory:, or a suffix-less markdown: doc node).
      ensurePath(root, parsed.path, parsed.kind !== "directory");
    } else {
      // The node is a file-scoped observation (symbol/route/orm/markdown-section/cobol item).
      const fileNode = ensurePath(root, parsed.path, true);
      fileNode.leaves.push({ id: node.id, label: node.label, kind: parsed.kind, suffix: parsed.suffix });
    }
  }

  if (toolBucket.leaves.length > 0) root.children.push(toolBucket);
  computeTotals(root);
  return root;
}
