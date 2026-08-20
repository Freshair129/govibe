import { useState } from "react";
import type { MissionSnapshot } from "../../mission";
import { EmptyState } from "../../shared/EmptyState";
import { ViewHeader } from "../../shared/ViewHeader";
import { buildNodeHierarchy, type HierarchyNode } from "./node-hierarchy";

// TASK-PRD-007 (F1 + F4): this used to be a flat .map() over graph.nodes with every row
// absolutely positioned by array index (`top: 24 + index * 12%`), which visually clips to ~7
// items inside an `overflow: hidden` canvas while thousands more mount invisibly in the DOM.
// It also had no parent/child relation, so calling it a "tree" was false. Fixed by deriving a
// real path hierarchy (node-hierarchy.ts) and rendering it as a genuinely collapsible tree:
// branches start closed, so only the top-level entries mount until a user expands one -- the
// full set stays reachable (no silent truncation) without ever mounting thousands of
// simultaneously-invisible nodes.

function TreeBranch({ node }: { node: HierarchyNode }) {
  const [open, setOpen] = useState(false);
  const hasContent = node.children.length > 0 || node.leaves.length > 0;

  return (
    <li className="tree-item">
      <button type="button" className="tree-toggle" onClick={() => setOpen((v) => !v)} disabled={!hasContent} aria-expanded={open}>
        <span className="tree-caret">{hasContent ? (open ? "▾" : "▸") : "•"}</span>
        <span className="tree-name">{node.name}</span>
        <span className="tree-kind">{node.kind}</span>
        {node.totalCount > 0 ? <span className="tree-count">{node.totalCount.toLocaleString()}</span> : null}
      </button>
      {open ? (
        <ul className="tree-children">
          {node.children.map((child) => (
            <TreeBranch key={child.path || child.name} node={child} />
          ))}
          {node.leaves.map((leaf) => (
            <li className="tree-leaf" key={leaf.id}>
              <span className="tree-leaf-kind">{leaf.kind}</span>
              <span className="tree-leaf-label">{leaf.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function AstTreeView({ snapshot }: { snapshot: MissionSnapshot }) {
  const totalNodes = snapshot.graph.nodes.length;
  const hierarchy = buildNodeHierarchy(snapshot.graph.nodes);

  return (
    <div className="view-stack">
      <ViewHeader
        eyebrow="Deep Scan"
        title="Observed Structure Tree"
        desc={`Path hierarchy derived from ${totalNodes.toLocaleString()} observed graph nodes -- directories and files nest their symbols, routes, and other file-scoped observations as children. Branches start collapsed; expand a row to render its children.`}
      />
      {totalNodes > 0 ? (
        <section className="panel tree-canvas">
          <ul className="tree-root">
            {hierarchy.children.map((child) => (
              <TreeBranch key={child.path || child.name} node={child} />
            ))}
          </ul>
        </section>
      ) : (
        <EmptyState
          title="No observed structure connected"
          body="Publish graph.update events, or run a deep scan, before rendering the observed structure tree."
        />
      )}
    </div>
  );
}
