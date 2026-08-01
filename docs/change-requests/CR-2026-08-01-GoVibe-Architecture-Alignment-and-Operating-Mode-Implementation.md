---
doc_id: "CR-2026-08-01-GOVIBE-ARCHITECTURE-ALIGNMENT-IMPLEMENTATION"
title: "Change Request: GoVibe Architecture Alignment and Operating Mode Implementation"
status: "candidate"
version: "0.1.1"
updated: "2026-08-01"
owner: "Boss (CEO)"
coordinator: "LYRA"
architect: "ARCHON"
document_owner: "THESEUS"
auditor: "ATHER"
verifier: "GHOST"
source_of_truth: false
type: "change-request"
complexity: "C-3"
access_scope: "H4"
risk: "cross-system"
canonical_governance:
  - "Freshair129/RWANG-PROMAX: skills/rwang/references/EXECUTION-GOVERNANCE.md"
related_docs:
  - "docs/BRD-GoVibe-Platform.md"
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/PRD-GoVibe-MCP-Orchestration.md"
  - "docs/SDD-System-Design.md"
  - "docs/STD-Execution-Governance.md"
  - "docs/architecture/C4-GoVibe-Platform.md"
  - "docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md"
  - "docs/features/agent-team/FEAT-CoDev-Module.md"
  - "docs/features/agent-team/FEAT-CoVibe-Module.md"
  - "docs/change-requests/CR-2026-06-15-CoDev-CoVibe-Positioning-Review.md"
---

# Change Request: GoVibe Architecture Alignment and Operating Mode Implementation

## 1. Purpose

Promote the approved `CoVibe` and `CoDev` terminology into a traceable implementation plan across canonical product documents, software requirements, architecture, runtime policy, Mission Control, and verification.

This CR also reconciles the intended architecture:

```text
GoVibe
  -> MSP
  -> GKS
  -> GenesisBlockDB
```

with:

- human-first document-driven development
- diagram-to-document review gates
- 12-stage code-to-knowledge decomposition
- 7-phase knowledge-to-code assembly
- Genesis Loop as a proposed architecture intermediate representation
- declared-vs-observed conformance

This is a parent orchestration CR. It does not authorize broad code or canonical-document mutation before the required gates pass.

---

## 2. Canonical H-Axis Definition

This CR adopts the RWANG PROMAX canonical Execution Governance Standard.

### 2.1 Binding definition

```text
H = Access Scope
```

`H` is the executor's enforceable tool and permission ceiling. It answers:

> Which capabilities may this executor use while performing this task?

The valid range is:

| Tier | Capability ceiling | Typical scope |
|---|---|---|
| H0 | read one bounded file | subtask / PR |
| H1 | H0 + repository search | task / component |
| H2 | H1 + multi-file write | story / feature |
| H3 | H2 + shell execution | epic / module |
| H4 | H3 + network/full approved toolset | architecture / cross-system / platform |

### 2.2 Default C-to-H mapping

```yaml
complexity_access_mapping:
  C-0: H0
  C-1: H1
  C-2: H2
  C-3: H3
```

`H4` is an upward override that requires approval before implementation. For C-3 work, the owner grants H4.

This CR is therefore:

```text
Complexity: C-3
Access Scope: H4
```

### 2.3 Removed meanings

`H5` and `H6` are invalid as enforcement tiers. They were removed because they granted no capability beyond H4.

`H` must not be used to represent:

- graph distance
- retrieval hops
- retrieval relevance
- context size
- token budget
- task risk
- fan-out or coupling
- organization level
- model intelligence

### 2.4 Separate axes

The following concerns remain separate:

| Axis | Meaning |
|---|---|
| C | process complexity and required workflow |
| H | executor access/tool ceiling |
| W | fan-out, branching width, or coupling |
| Retrieval radius | graph/search distance used to collect candidate context |
| Context budget | maximum context size or token allocation |
| Risk | impact and safety exposure |
| Operating mode | CoVibe or CoDev authority/collaboration model |

No implementation or document may overload one axis to stand in for another.

---

## 3. Canonical Product Decisions

### 3.1 Platform identity

`GoVibe` remains the platform identity.

`CoVibe` and `CoDev` are collaboration modes/modules, not separate product brands and not new top-level PRD systems in this change.

### 3.2 CoVibe

```text
[Human]
   <=GoVibe / CoVibe=>
[Main Agent / Main Agent Team]
   <=support=>
[Support Agent / Support Executor]
```

Meaning:

- intra-owner / solo-owner orchestration
- one primary owner authority boundary
- bounded support execution
- evidence and handoff back to the owner
- governance selected by complexity, access scope, fan-out, and risk
- no bypass of mandatory security, provenance, review, or verification

### 3.3 CoDev

```text
[Human / Team A + Agent Team A]
        <=GoVibe / CoDev=>
[Human / Team B + Agent Team B]
```

Meaning:

- inter-owner / inter-team coordination
- independent human-owned delivery parties remain distinct
- each party may retain its own agent team, workflow, toolchain, and local governance
- GoVibe governs shared planning, dependencies, handoff, evidence, review, and conformance
- swarm-to-swarm interoperability remains a long-term product vision unless implementation evidence proves otherwise

### 3.4 Protocol boundary

```text
MCP = primary tool/context/orchestration interface
A2A = optional agent communication primitive
CoDev = governed inter-owner operating model above protocol primitives
```

CoDev does not replace MCP and does not itself guarantee A2A compliance.

---

## 4. Core Architecture Boundary

Logical agent-facing hierarchy:

```text
GoVibe
  -> MSP
  -> GKS
  -> GenesisBlockDB
```

Required boundary:

- agent-facing session, identity, memory, knowledge, and context access is mediated by MSP
- GKS owns knowledge construction, ontology, atomization, retrieval, projection, and lifecycle
- GenesisBlockDB is the graph/vector/lexical/temporal persistence and query engine
- GoVibe and Mission Control are product/control surfaces, not canonical knowledge stores
- no new agent-facing direct database interface may be introduced

Current implementation evidence must remain honest: intended MSP mediation is not considered implemented until runtime wiring and tests prove it.

---

## 5. Human-First Source Rule

Human-readable SWE documents remain canonical authoring and planning sources where they exist.

GKS must:

- read protected source documents without mutating them by default
- assign stable document identity
- calculate content hashes and versions
- derive physical or virtual knowledge atoms
- preserve provenance
- materialize derived knowledge into the operational graph

Derived atoms, indexes, diagrams, reports, graph exports, and Web layout state must not silently replace protected human-readable source documents.

Required implementation flow:

```text
diagram
  -> draft document
  -> human review
  -> approved document
  -> docs to code
```

Direct diagram-to-production-code generation is outside the approved governance flow unless a separately approved standard changes that rule.

---

## 6. Development Loop

```text
Declared documents and models
  -> GKS atomization
  -> proposed Genesis Loop / architecture IR
  -> 7-phase knowledge-to-code assembly
  -> code and tests
  -> 12-stage code-to-knowledge decomposition
  -> observed model
  -> conformance and feedback
```

The 12-stage and 7-phase models must not use H as graph depth or retrieval radius.

Any graph traversal depth used by decomposition, retrieval, or rendering must have a separately named field such as:

```text
retrieval_radius
max_graph_hops
relation_depth
context_budget
```

---

## 7. Genesis Loop Status

Genesis Loop is currently treated by this CR as a proposed logical architecture source of truth / intermediate representation composed from stable atoms, typed relations, constraints, evidence, and versions.

It is not a new diagram format and need not be one physical Markdown file.

Potential projections include:

- domain-driven
- cluster-driven
- feature-driven
- C4
- workflow
- sequence
- security
- data flow
- roadmap/task
- declared-vs-observed

Rendered views and Web layout state are derived presentation artifacts.

Promotion of Genesis Loop into a canonical platform contract requires architecture review and an ADR if the existing accepted ADR set does not already define the full contract.

---

## 8. Scope

### In scope

1. Audit canonical documents against the decisions in this CR.
2. Produce an evidence-backed authority and gap matrix.
3. Correct invalid H-axis use in affected planning and architecture documents.
4. Refine BRD and PRD wording only where incomplete or contradictory.
5. Add or update SRS requirements for operating modes and cross-layer contracts.
6. Update SDD/C4 only after architecture decisions are recorded.
7. Define bounded implementation work packets.
8. Verify through tests, document validation, repository analysis, and conformance evidence.
9. Update document registry and traceability records.

### Out of scope unless separately approved

- renaming GoVibe
- adding new top-level PRD systems
- replacing MCP
- claiming full A2A compliance
- replacing external coding agents or orchestrators
- requiring humans to author Genesis atoms directly
- treating generated atom files as canonical over protected SWE documents
- rewriting GenesisBlockDB core without a proven interface gap
- using H5/H6 or redefining H as retrieval depth

---

## 9. Required Work Packages

### WP-01 — Canonical document audit

**Owner:** ATHER + THESEUS  
**Review:** ARCHON

Required output:

| Decision | BRD | PRD | SRS | SDD/C4 | FEAT/STD | Code | Status |
|---|---|---|---|---|---|---|---|

Allowed status values:

```text
already-covered
accepted
accepted-with-refinement
conflicts-with-current-spec
requires-ADR
deferred
not-applicable
```

WP-01 must explicitly identify every use of:

```text
H5
H6
H0-H6
context tier
hop-bounded H
H-level retrieval
```

and classify whether each occurrence means access scope, retrieval radius, context budget, or obsolete terminology.

No canonical document or runtime edits are authorized inside WP-01.

### WP-02 — BRD and positioning refinement

Confirm product positioning, operating-mode priority, competitive claims, and proof status.

### WP-03 — PRD and SRS propagation

Add or reconcile requirements for:

- CoVibe and CoDev modes
- authority boundaries
- mode escalation
- evidence-preserving handoff
- MSP mediation
- GKS document lifecycle
- Genesis Loop status
- declared-vs-observed conformance
- C/H/W/retrieval/context/risk axis separation

### WP-04 — Architecture and ADR review

Determine ADR requirements for:

- MSP mandatory mediation
- GKS placement under MSP
- GenesisBlockDB storage/namespace contract
- Genesis Loop architecture IR
- declared-vs-observed dual model
- projection/rendering architecture
- operating-mode policy inheritance
- retrieval-radius naming and removal of H-hop semantics

### WP-05 — MSP, GKS, and GenesisBlockDB contracts

MSP contracts must define session, identity, memory, retrieval planning, context packages, disclosure logs, checkpoints, and promotion.

Retrieval planning must use separately named values and must not use H tiers as graph depth.

GKS contracts must define document identity, hashing/versioning, atom identity, provenance, lifecycle, ontology, projections, and knowledge promotion.

GenesisBlockDB contracts must define namespaces, transactions, temporal semantics, idempotency, snapshots, indexes, audit, and recovery.

### WP-06 — CoVibe implementation

Candidate scope:

- mode selection
- primary owner authority
- bounded support packets
- quota/model-aware routing
- access-scope guardrails
- evidence return
- escalation request to CoDev

### WP-07 — CoDev implementation

Candidate scope:

- party/team registry
- independent owner lanes
- shared roadmap visibility
- dependency coordination
- governed handoff
- review routing
- policy inheritance
- conflict/escalation paths

### WP-08 — Mission Control integration

Candidate surfaces:

- operating mode and authority scope
- `C`, `H`, `W`, risk, retrieval, and context indicators as separate fields
- repository-analysis state
- Genesis Loop projection selector
- declared/observed overlay
- approvals, evidence, and conformance

### WP-09 — Verification

Required evidence includes:

- document validation
- schema validation
- policy/access tests
- mode transition tests
- evidence/handoff tests
- targeted 12-stage rescan
- declared-vs-observed report
- audit trail

### WP-10 — Registry and release

Update document registry, CR ledger, roadmap links, release notes, evidence registry, and GKS materialization state.

---

## 10. Governance Gates

### Gate G1 — Canonical definition

Exit criteria:

- CoVibe and CoDev definitions are traceable
- H is confirmed as Access Scope H0-H4
- all H-hop/context collisions are listed
- architecture assumptions are separated from approved facts

### Gate G2 — Document propagation

Exit criteria:

- BRD -> PRD -> SRS -> SDD/C4 -> FEAT/STD trace is consistent
- invalid H terminology is removed or explicitly marked historical
- required ADRs are approved or deferred

### Gate G3 — Implementation authorization

Exit criteria:

- bounded work packets exist
- affected code paths are identified
- test strategy and rollback exist
- owners and reviewers are assigned

### Gate G4 — Conformance and closure

Exit criteria:

- tests pass
- docs validate
- observed graph is refreshed
- conformance findings are resolved, accepted with expiry, or deferred
- audit evidence is complete

---

## 11. Operating and Governance Matrix

These axes are independent:

```text
Operating Mode: CoVibe | CoDev
Complexity: C-0..C-3
Access Scope: H0..H4
Fan-out: W2 | W3 | W4
Retrieval Radius: separately named measured value
Context Budget: separately named measured value
Risk: repository-defined class
```

Examples:

```text
CoVibe + C-3 + H4
= solo-owner architecture change with full approved tool access

CoDev + C-1 + H1
= small implementation task under multi-owner attribution and audit
```

No implementation may encode:

```text
CoVibe = always light
CoDev = always maximum ceremony
H = graph hops
H = context size
H5/H6 = larger platform scope
```

---

## 12. Initial Decision Request

Approve this CR as the parent `C-3 / H4` change packet and authorize WP-01 only.

All later work packages remain blocked until the canonical audit and Gate G1 review are complete.

---

## Changelog

| Version | Date | Status | Summary | Agent |
|---|---|---|---|---|
| 0.1.1 | 2026-08-01 | candidate | Corrected the H-axis against RWANG PROMAX canonical governance: H is Access Scope H0-H4; removed H5/H6 and separated retrieval radius, context budget, W, risk, and operating mode. | GPT-5.6 Thinking |
| 0.1.0 | 2026-08-01 | candidate | Created parent CR for canonical reconciliation, architecture alignment, operating-mode implementation, and conformance verification. | GPT-5.6 Thinking |
