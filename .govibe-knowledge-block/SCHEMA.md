# Knowledge Block Schema and Graph Rules

This directory (`.govibe-knowledge-block`) stores the "Knowledge Atoms" (extracted from human SWE documents) that form the project's knowledge graph.

## File Structure
Each atom must be a Markdown file with YAML frontmatter. The filename should be `<ID>.md`.

### Frontmatter Schema
```yaml
---
id: "[[ATOM_ID]]"       # Unique identifier for this node, e.g. [[ARCH-001]]
type: "architecture"    # Type matches the folder (adr, api, architecture, data-model, etc.)
status: "approved"      # draft, review, approved, deprecated
title: "Title of the atom"
owner: "Owner name/agent"
relations:
  - "[[OTHER_ATOM_ID]]" # Direct links to other knowledge atoms
---
```

## Graph Connections
1. **Wikilinks**: Inline references like `[[ADR-001]]` inside the markdown content are treated as graph edges.
2. **YAML Relations**: Explicit edges defined in the `relations` array in the frontmatter.

## Graph Integrity
- **Orphan Nodes**: An atom is an orphan if it has no incoming links (`relations` or wikilinks from other atoms) AND no outgoing links.
- **Broken Links**: A link to an `[[ATOM_ID]]` that does not exist in the `.govibe-knowledge-block` directory.
- **Semantic Orphans**: (Detected via LLM) Atoms that are technically linked but conceptually isolated or missing crucial dependencies (e.g., an API without a Data Model).

The `scripts/gks-verify.mjs` script performs graph traversal and LLM-assisted semantic integrity checks.
