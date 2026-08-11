---
title: "Mode 2 Deliverable 2: Agent-Native Workspace Integration Architecture"
doc_id: "MODE2-ARCHITECTURE"
status: "draft"
version: "0.1.0"
updated: "2026-08-11"
owner: "Boss (CEO)"
source_of_truth: false
access_scope: "H3"
complexity: "C-3"
related_docs:
  - "docs/mode2/CURRENT-AS-BUILT.md"
  - "docs/mode2/WORKSPACE-ADAPTER-CONTRACT.md"
  - "docs/mode2/DEEP-SCAN-12-STAGE-SPEC.md"
  - "docs/mode2/IMPLEMENTATION-ROADMAP.md"
  - "docs/specs/SPEC-Workspace-System.md"
  - "docs/STD-Execution-Governance.md"
---

# Mode 2 Deliverable 2: Agent-Native Workspace Integration Architecture

## 1. Product Position

GoVibe Mode 2 is a **Semantic Development Control Plane**. It is not a coding agent, not an
IDE, not a Git client, and not a replacement for Claude Code, Gemini CLI, Codex, or RWANG.

The external agent keeps its workspace, tools, governor, memory, runtime, and execution
flow. GoVibe makes that agent more effective by handing it better-structured meaning.

```text
Claude Code / Gemini CLI / Codex / RWANG   =  Executor + native workspace
GoVibe                                     =  Semantic + coordination layer
MSP                                        =  Context / promotion authority
GKS                                        =  Canonical semantic authority
```

## 2. The Binding Principle

```text
WORKSPACE OWNERSHIP = CLIENT
```

Phase 1 integrates with the agent's workspace. It does not own the agent's workspace.

### 2.1 Two workspace modes, one identity model

| | Mode 1 (existing) | Mode 2 (this document) |
|---|---|---|
| Entry | `govibe.workspace.initialize` | `govibe.workspace.inspect` |
| Ownership | `govibe` | `external` |
| Write policy | `managed` | `metadata-only` |
| Creates | `.govibe/`, `.brain/`, `.govibe-knowledge-block/`, `local_model/` | `.govibe/mode2/` only |
| Implementation | `packages/govibe-core/src/workspace.mjs` | `packages/govibe-core/src/mode2/` |
| Compatibility | Unchanged. Mode 2 adds; it does not modify. | — |

Both modes derive identity through `createWorkspaceVaultBindings`
(`docs/specs/SPEC-Workspace-System.md` §3.1). The same repository root therefore yields the
same `workspace_id` in either mode.

### 2.2 The metadata-only write policy

Mode 2 may write **only** beneath `<workspace_root>/.govibe/mode2/`. Every byte written
there is disposable and rebuildable from the source tree. Nothing under that path is
canonical knowledge.

Enforcement is not advisory. A single choke point,
`packages/govibe-core/src/mode2/metadata-store.mjs`, is the only module in the Mode 2
package permitted to write, and it rejects any target outside the metadata root using the
existing `assertNoLinksWithin` guard from `packages/govibe-core/src/path-safety.mjs`.

Mode 2 MUST NOT: copy or move the repository, create a second source tree, manage Git
branches or IDE state, manage client-agent memory, or replace `AGENTS.md` / `CLAUDE.md` /
`GEMINI.md` / any external governor.

## 3. Layering

```text
Claude Code │ Gemini CLI │ Codex │ Generic Client │ CI │ Mission Control │ CLI
                              │
                              ▼
                      GoVibe MCP tool surface        provider-neutral
                              │
                              ▼
                      WorkspaceAdapter               client-specific behaviour lives here
                              │
                              ▼
                      Deep Scan Pipeline (12 semantic stages)
                              │
                              ▼
                      Candidate Semantic IR
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        Coverage Engine   View Router   Roadmap Compiler
```

**Provider neutrality is a hard rule.** No layer below `WorkspaceAdapter` may branch on
client identity. The following is forbidden anywhere in core:

```text
if (client === "claude-code") { ... }
```

Client differences are expressed as adapter-supplied *data* — a `CapabilityManifest`, a list
of `InstructionSource`s, workspace conventions — never as core control flow.

## 4. SOURCE / SEMANTIC MODEL / VIEW / EXECUTION

The system keeps four things distinct and never collapses them:

| Concept | Definition | Authority |
|---|---|---|
| **SOURCE** | Code, docs, tests, schemas, diagrams, agent configs, Git, runtime config | The repository |
| **SEMANTIC MODEL** | Candidate atoms + relations reconstructed from SOURCE | Candidate only; GKS holds canonical |
| **VIEW** | A projection of the semantic model (C4, ERD, Sequence, …) | Never canonical |
| **EXECUTION** | Work performed by the external agent | The external agent |

A diagram is a projection. A document is a projection. Neither is a separate truth. Views
MUST carry back-references to the semantic entities that generated them so that no
generated artifact becomes an independent truth island.

## 5. Semantic Unit Hierarchy

```text
ATOM  →  GENESIS LOOP  →  GENESIS BLOCK  →  GENESIS GRAPH
```

| Unit | Definition | Phase 1 obligation |
|---|---|---|
| Atom | Smallest independently identifiable useful semantic assertion | Contract defined and emitted |
| Genesis Loop | Coherent composition of atoms and relations for one semantic dimension | Contract defined; grouping is provisional |
| Genesis Block | Bounded semantic unit composed of multiple Loops; must reach the dimension coverage its Block Profile requires | Coverage evaluated (Phase 1 tranche 4) |
| Genesis Graph | Relations between Blocks and external semantic entities | Contract shape only; no ontology in Phase 1 |

Phase 1 does **not** build a universal ontology. It defines contracts that let these
concepts evolve without a breaking migration. `docs/architecture/SDD-Genesis-Block.md` and
`docs/specs/SPEC-Genesis-Block.md` remain the canonical owners of Genesis semantics; this
document does not redefine them.

## 6. Candidate Semantic IR

Every node the pipeline emits retains, without exception:

```text
type              what kind of semantic thing this is
identity          pipeline-local stable id — never a GKS canonical id
source            file path
source_span       line/character range
provenance        stage number, extractor name, extractor version
confidence        0..1
scope             workspace-relative scope
inferred          true if produced by LLM inference, false if deterministic
explicit          true if literally stated in source
relations         outbound candidate relations
unresolved        semantics the extractor could not resolve
```

**No scanner may mint canonical GKS identities.** Promotion to canonical truth flows only
through MSP, exactly as the existing `scan/stage-runner.mjs` already does.

## 7. Extraction Order

Deterministic evidence always outranks inference:

```text
1  deterministic parser
2  repository metadata
3  static analysis
4  structured extraction
5  graph traversal
6  LLM inference          ← last resort only
```

Every LLM inference MUST record `confidence`, `source_evidence`, and `inferred: true`.

**The LLM must not invent missing WHY.** Meaning that is absent from the source becomes
`UNRESOLVED`. This is the `PRODUCT.md` live-data-only rule applied to semantics: an honest
gap, never a plausible fabrication.

## 8. Semantic Conservation

Every transformation reports its fidelity:

```text
EXACT           meaning fully preserved
EQUIVALENT      different representation, same meaning
APPROXIMATE     meaning preserved within a stated tolerance
PARTIAL         some meaning carried, some dropped — dropped set enumerated
UNRESOLVED      meaning could not be determined
UNPROJECTABLE   meaning exists but this projection cannot express it
```

A transformation may never silently claim a complete conversion.

## 9. WHAT-IS versus WHAT-SHOULD-BE

```text
Bottom-Up (code)          Top-Down (intent docs)
   WHAT IS         ↕         WHAT SHOULD BE
```

The comparator emits **candidates with evidence**, never automatic fixes. Detected classes:
missing implementation, undocumented implementation, stale documentation, architecture
drift, missing tests, orphan tests, missing requirement, unimplemented requirement, API
drift, schema drift, security drift, agent-governor drift, roadmap drift, and unknown
semantic gaps.

## 10. Agentic Capability Negotiation

Mode 2 reads an external agent's governance system to *understand* it, never to replace it.
Each capability is classified:

```text
NATIVE      the external system already provides it
PLATFORM    GoVibe provides it
HYBRID      both contribute
MISSING     neither provides it — becomes a roadmap candidate
```

GoVibe MUST NOT require a GoVibe-native equivalent where the external system already
supplies the capability.

## 11. Governance Axes for Mode 2 Work Items

Per `docs/STD-Execution-Governance.md` §12.1 and `docs/adr/ADR-021-H-Axis-Access-Scope-Semantic-Separation.md`, every work item
the roadmap compiler emits carries:

| Axis | Meaning | Values |
|---|---|---|
| `C` | process complexity | `C-0..C-3` |
| `H` | executor Access Scope | `H0..H4` (default from `C`) |
| `R` | retrieval radius | `R0..R6` / `max_hops` |
| `D` | compaction depth | repository `D` scale |
| `W` | fan-out width | `W2..W4` |
| `context_budget` | token allowance | numeric |
| Risk | operational/security impact | repository risk class |

Mode 2 never emits `H` as complexity, hops, budget, or risk. See
`docs/mode2/CURRENT-AS-BUILT.md` §7 for the resolution of the implementation prompt's
`H0–H5` proposal.

## 12. Phase 1 Non-Goals

Not built in Phase 1: a GoVibe-owned IDE, Git client, branch manager, or coding agent; full
workspace lifecycle ownership; a universal agent governor; a universal ontology; any
canonical GKS write that bypasses MSP; an organisation-wide RBAC/ABAC redesign; cloud
workspace hosting.

## 13. Changelog

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1.0 | 2026-08-11 | Initial Mode 2 Phase 1 architecture. | Claude Code |
