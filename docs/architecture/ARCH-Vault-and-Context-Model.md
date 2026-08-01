---
title: "Architecture: Vault, Context, Link, and Impact Model"
doc_id: "ARCH-VAULT-CONTEXT-MODEL"
status: "approved"
version: "1.0.1"
updated: "2026-08-01"
owner: "Boss / ATHER"
source_of_truth: true
related_docs:
  - "docs/alignment/ALIGNMENT-01-System-Authority-and-Command-Boundary.md"
  - "docs/alignment/ALIGNMENT-04-12-Stage-Decomposition-Contract.md"
  - "docs/alignment/ALIGNMENT-06-Context-Vault-and-Memory-Assembly.md"
  - "docs/alignment/ALIGNMENT-12-Mission-Control-Context-and-Impact-Surface.md"
---

# Vault model

## Shared Vault

A Shared Vault is the governed project source of truth available to authorized agent teams. Its content includes approved requirements, architecture, decisions, contracts, validated observations, and promoted team knowledge.

The project slug is used for the materialized folder name. For project `govibe`, the primary shared-vault materialization is `.brain/govibe/`, not `.brain/govibe-knowledge-block/`.

## Workspace Private Vault

A Workspace Private Vault belongs to one agent in one current workspace. It is the primary store for detailed episodic and experiential memory, task continuity, state snapshots, hypotheses, mistakes, and recovery patterns. It is not project source of truth. `V-space` means the current workspace; it is not a separate memory tier.

## Global Private Vault

A Global Private Vault belongs to one agent across workspaces. It receives compressed, generalized, privacy-safe durable memory promoted from Workspace Private Vaults. Raw workspace episodes are not copied wholesale into the global vault.

```text
Workspace Private Vault
  -> reflect / deduplicate / redact / compress
  -> Global Private Vault
```

A separate promotion path moves validated project truth into the Shared Vault:

```text
Workspace Private Vault
  -> knowledge candidate
  -> MSP validation and approval
  -> Shared Vault
```

# Identity and registry

Every vault has an immutable `vault_id`. Records bind vaults to the relevant `project_id`, `workspace_id`, and `agent_id`.

- Shared project vault: requires `project_id`; `agent_id` is absent.
- Workspace private vault: requires `agent_id`, `project_id`, and `workspace_id`.
- Global private vault: requires `agent_id`; project/workspace bindings are absent or contextual.

The Vault Registry is parent-owned by MSP because it spans project knowledge, agent identity, disclosure, and private memory. GoVibe uses MSP-facing contracts only. MSP mediates access to GKS; GoVibe must not call GKS or GenesisBlockDB directly.

# Local materialization

```text
<workspace>/.govibe/
  config.json
  project-state.json
  skill-lock.json
  vaults.json
  contexts/<cache-id>.json
  context-injections/<injection-id>.json

<workspace>/.brain/
  <project-slug>/          # primary Shared Vault materialization
  private/<agent-id>/      # optional Workspace Private Vault materialization
  <mounted-project-slug>/  # mounted Shared Vault from another project
```

Local `.brain` content is a materialization or governed source artifact. Canonical identity and lifecycle are resolved by registry references and version/hash metadata, never by folder name alone.

# Context assembly profiles

## T-ctx

Loads system context plus one event or task context. It is normally used for workers and headless agents.

## V-ctx

Loads the agent Global Private Vault and current Workspace Private Vault. It is the standard memory profile for ordinary stateful GoVibe agents.

## W-ctx

Loads V-ctx plus exactly one active multi-agent workflow. It is normally used for orchestrators, lead agents, and final gates.

## M-ctx

Synchronizes and loads Global Private and current Workspace Private context, checks diffs every turn, and produces real-time shared context. It is normally used for review gates and audit agents.

Context profile is independent from execution governance. `T/V/W/M-ctx` do not determine H access scope, R retrieval radius, D resolution depth, W fan-out, budget, or risk.

# Context lineage

Every injected context must be auditable:

- `context_id`: logical context assembly identity.
- `cache_id`: materialized/serialized context snapshot identity.
- `kv_id`: optional model-runtime KV cache identity issued after ingestion.

```text
Vault/source versions
  -> context assembly
  -> context_id
  -> materialized packet
  -> cache_id
  -> agent injection
  -> optional kv_id
  -> turn result
```

Replay must preserve exact source versions and hashes. It must not silently substitute current vault versions. M-ctx forms an append-only `parent_context_id` chain with a per-turn diff reference.

# Knowledge construction and link ownership

The twelve-stage Deep Scan is the decomposition and discovery engine. It reads user documents and code, creates document/atom/symbol/link candidates, and records evidence and provenance. These outputs are observed candidates, not canonical GKS records.

MSP is the mandatory parent boundary. It authorizes ingestion and promotion, records audit evidence, enforces cross-vault disclosure, and mediates every canonical knowledge write.

GKS owns canonical knowledge lifecycle. It assigns canonical `document_id`, `document_version_id`, `atom_id`, `symbol_id`, `entity_id`, and `relation_id`; resolves duplicate or ambiguous targets; versions relations; and materializes accepted knowledge through GenesisBlockDB.

GenesisBlockDB persists and indexes canonical records. It does not decide semantic identity or relation meaning.

```text
User document/code
  -> GoVibe Deep Scan Stage 1-12
  -> document/atom/symbol/link candidates
  -> MSP authorization and promotion gate
  -> GKS canonicalization and versioning
  -> GenesisBlockDB persistence/indexes
```

## Link classes

- **Wikilink:** explicit document or concept reference such as `[[ADR-022]]`.
- **Crosslink:** relation across artifact or memory domains, such as episode to atom, document to workflow, or evidence to decision.
- **Symbol link:** code relation such as import, definition/reference, call, route-handler, ORM-table, or inheritance.
- **Backlink:** reverse projection of any observed or canonical forward relation. A backlink is not a second semantic truth; it is an incoming-edge index used for navigation and impact traversal.

```text
A --references--> B
B backlinks = incoming(A --references--> B)
```

Deep Scan owns link discovery and candidate construction. GKS owns canonical semantic resolution. MSP owns permission and cross-boundary mediation. GoVibe may materialize a local observed-link index for immediate impact analysis, but it must preserve candidate status and provenance.

# Impact analysis

Impact analysis starts from one or more changed artifacts or semantic identities and traverses backlinks to find direct and transitive dependents.

```text
changed seed
  <- direct backlinks
  <- transitive backlinks
  <- implementation callers
  <- validators/tests
  <- UI and operational surfaces
```

Every impact result must include:

- the changed seeds;
- the affected artifact path or canonical identity;
- the relation chain that caused the impact;
- graph distance;
- impact score and confidence;
- required action (`must_update`, `review_and_update`, or `review`);
- unresolved links that prevent a complete answer.

Impact score combines relation weight, graph-distance decay, change-type severity, and evidence confidence. `implements`, `defines`, `imports`, `calls`, and `validates` carry stronger propagation than broad `related_to` references.

The runtime must not claim completeness when unresolved links or missing graph coverage exist. Text search may be retained only as a low-confidence discovery fallback, never as the canonical impact algorithm.

# Alignment conformance

The registered `ALIGNMENT-01`, `ALIGNMENT-04`, `ALIGNMENT-06`, and `ALIGNMENT-12` files are non-SOT conformance mappings. They map command authority, twelve-stage decomposition, context/vault assembly, and Mission Control presentation back to this architecture and its canonical API/ADR/Blueprint owners.

When an alignment document conflicts with this architecture or another canonical owner, the canonical document wins and the alignment mapping must be revised. The alignment files remain registered so backlink and impact analysis can discover every conformance dependency.

# Invariants

1. Private experience is not Shared Vault truth.
2. GoVibe and agents may create candidates but may not assign canonical GKS identities.
3. All canonical knowledge writes pass through MSP.
4. Backlinks are reverse projections of forward links and preserve source relation identity.
5. Impact traversal is cycle-safe, distance-bounded, explainable, and confidence-bearing.
6. Every injected context is replayable from exact retained source versions or explicitly marked non-replayable.
7. Alignment mappings are traceability artifacts and never override canonical owners.

# Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 1.0.1 | 2026-08-01 | Boss / ATHER | Linked registered ALIGNMENT-01/04/06/12 conformance mappings and made canonical-precedence and backlink traceability explicit. |
| 1.0.0 | 2026-08-01 | Boss / ATHER | Approved vault/context model; added Deep Scan candidate ownership, GKS canonicalization, wikilink/crosslink/symbol-link/backlink taxonomy, and explainable reverse-dependency impact analysis. |
| 0.1.0 | 2026-08-01 | Boss / ATHER | Initial vault and context architecture proposal. |
