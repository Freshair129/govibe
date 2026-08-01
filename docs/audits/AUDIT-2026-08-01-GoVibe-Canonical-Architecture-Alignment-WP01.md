---
doc_id: "AUDIT-2026-08-01-GOVIBE-CANONICAL-ARCHITECTURE-ALIGNMENT-WP01"
title: "Audit: GoVibe Canonical Architecture Alignment — WP-01"
status: "review"
version: "0.1.0"
updated: "2026-08-01"
owner: "ATHER"
prepared_by: "ChatGPT / GPT-5.6 Thinking"
parent_cr: "CR-2026-08-01-GOVIBE-ARCHITECTURE-ALIGNMENT-IMPLEMENTATION"
work_packet: "WP-01-CANONICAL-DOCUMENT-AUDIT"
complexity: "C-3"
access_scope: "H4"
risk: "HIGH"
source_of_truth: false
type: "audit"
---

# Audit: GoVibe Canonical Architecture Alignment — WP-01

## 1. Executive Verdict

The repository already contains authoritative definitions for the core product positioning and the two collaboration modes:

- `CoVibe` is the intra-owner / solo-owner orchestration mode.
- `CoDev` is the inter-owner / inter-team coordination mode.
- GoVibe remains the platform identity.
- MCP remains the primary orchestration interface.
- GKS is the internal semantic pivot/interlingua.
- Human-readable SWE documents remain the canonical authoring source where they exist.
- 12-step code-to-knowledge decomposition and 7-phase generation/assembly are already accepted architectural directions.

The new alignment discussion is therefore **not a clean-sheet architecture proposal**. Most of its product-level premises already exist in the BRD, PRD, accepted ADR-backed C4 direction, and approved CoVibe/CoDev feature documents.

However, the audit found material drift and ambiguity across the canonical stack:

1. The parent CR declared `H5`, but the stable Execution Governance Standard removed `H5/H6`; platform-level work is `C-3` at `H4` with approval.
2. The current C4 document still uses `H0-H6` and includes stale MCP tool domains that the approved MCP SRS says do not exist.
3. The architecture documents agree that GoVibe should consume MSP/GKS rather than bypass them, but the integration is explicitly not yet wired.
4. The general SDD describes direct UI/core persistence to GenesisBlockDB, which is too broad and conflicts with the more specific MSP/GKS integration boundary unless interpreted as internal runtime persistence only.
5. The repository defines Diagram-to-Doc, not direct Diagram-to-Code. Any Architecture IR or semantic editing model is a refinement that requires an ADR and explicit SRS/SDD contracts.
6. Genesis Loop as a canonical multi-view Architecture IR is not established as a current approved platform contract in the reviewed source set. It remains a proposed refinement unless another approved authority document is produced.
7. RBAC/ABAC is an approved requirement but is explicitly not enforced in the current MCP runtime.
8. CoVibe/CoDev terminology is approved, but no reviewed SRS defines mode selection, escalation, transition preservation, or runtime state.
9. Declared-vs-observed conformance is strongly implied by traceability/drift requirements but lacks one canonical cross-system state model in the reviewed source set.

**Gate recommendation:** `G1 = CONDITIONAL PASS` for the already approved CoVibe/CoDev terminology and existing four-layer direction; `G1 = HOLD` for Architecture IR, mode-transition runtime semantics, MSP mandatory mediation as a fully implemented guarantee, and declared-vs-observed state contracts until ADR/SRS work is approved.

---

## 2. Audit Rules

This report distinguishes five evidence classes:

| Class | Meaning |
|---|---|
| `SOURCE FACT` | Directly stated in a reviewed source-of-truth or approved document. |
| `CODE/AS-BUILT CLAIM` | A document explicitly reports current runtime behavior and names implementation evidence. This audit did not independently execute the code. |
| `INFERENCE` | Reasoned conclusion from multiple sources; not directly stated as one canonical rule. |
| `RECOMMENDATION` | Proposed follow-up; not current truth. |
| `UNVERIFIED` | Discussed alignment or capability not established by the reviewed authority set. |

The audit does not silently reconcile contradictions. Every contradiction remains visible with a recommended authority decision.

---

## 3. Reviewed Authority Set

### 3.1 Business and product

- `docs/BRD-GoVibe-Platform.md`
- `docs/PRD-GoVibe-Platform-Overview.md`
- `docs/PRD-GoVibe-MCP-Orchestration.md`

### 3.2 Requirements and governance

- `docs/srs/SRS-GoVibe-MCP-Server.md`
- `docs/STD-Execution-Governance.md`

### 3.3 Architecture

- `docs/SDD-System-Design.md`
- `docs/architecture/C4-GoVibe-Platform.md`
- `docs/architecture/SDD-GoVibe-MSP-GKS-Integration.md`

### 3.4 Collaboration mode authorities

- `docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md`
- `docs/features/agent-team/FEAT-CoDev-Module.md`
- `docs/features/agent-team/FEAT-CoVibe-Module.md`
- `docs/change-requests/CR-2026-06-15-CoDev-CoVibe-Positioning-Review.md`

### 3.5 Parent change control

- `docs/change-requests/CR-2026-08-01-GoVibe-Architecture-Alignment-and-Operating-Mode-Implementation.md`
- `docs/change-requests/work-packets/WP-01-Canonical-Document-Audit.md`

### 3.6 Scope limitation

This pass reviewed the mandatory high-authority set and the approved MCP SRS. It did not enumerate every file below `docs/srs/**`, every ADR, every feature folder, or execute repository code. Missing lower-level evidence is recorded as a follow-up requirement rather than guessed.

---

## 4. Authority Map

## 4.1 Product identity and business positioning

| Question | Primary authority | Supporting authority | Audit reading |
|---|---|---|---|
| What is GoVibe? | `BRD-GoVibe-Platform` | `PRD-GoVibe-Platform-Overview` | Governance + interoperability/translation layer for multi-agent software delivery; not a coding-agent, orchestrator, memory, or database competitor. |
| What is the moat? | BRD | PRD | Governance-over-codegen, provenance, translation, and cross-team coordination; infrastructure layers are enabling capabilities. |
| What is the primary market? | BRD | PRD | AI-enabled teams/organizations needing governance; solo/small-team is secondary/adoption lane. |
| Is GKS user vocabulary? | BRD/PRD | ADR-017 references | No. GKS is internal interlingua; users retain local conventions. |

## 4.2 Collaboration modes

| Question | Primary authority | Supporting authority | Audit reading |
|---|---|---|---|
| CoVibe definition | Approved terminology FEAT | Approved CoVibe module FEAT; PRD §2.3 | Intra-owner / solo-owner orchestration with one primary owner or lead agent and bounded support agents/executors. |
| CoDev definition | Approved terminology FEAT | Approved CoDev module FEAT; BRD vision; PRD §2.3 | Inter-owner / inter-team coordination across distinct human-owned delivery parties and their agent teams. |
| Are they new top-level systems? | Terminology FEAT / PRD | CoVibe/CoDev module FEATs | No. They are modes/modules over `SYSTEM-05`, supported by `SYSTEM-06`, `SYSTEM-09`, `SYSTEM-10`. |
| Is CoDev identical to A2A? | Terminology FEAT | BRD vision | No. A2A is not guaranteed by the terminology; swarm-to-swarm is the long-term product vision and can ride MCP/A2A. |

## 4.3 Governance and process

| Question | Primary authority | Supporting authority | Audit reading |
|---|---|---|---|
| Complexity process | External canonical RWANG standard mirrored by `STD-Execution-Governance` | PRD | `C-0..C-3`; choose minimum safe process. |
| Access scope | Stable mirrored STD | PRD/C4 are stale in places | `H0..H4`; H5/H6 removed. H is capability/access ceiling, not retrieval hops. |
| Fan-out | Stable mirrored STD | PRD | W2/W3/W4 controls breadth/coupling. |
| Human authoring source | Stable mirrored STD | PRD; SDD | Human-readable SWE docs are canonical; atoms are derived. |
| Diagram workflow | Stable mirrored STD | PRD; SDD; C4 | Diagram -> draft document -> human review -> approved document -> docs-to-code. |

## 4.4 Runtime and integration

| Question | Primary authority | Supporting authority | Audit reading |
|---|---|---|---|
| Orchestration interface | Approved MCP SRS | MCP PRD; ADR-002 reference | MCP is primary. UI/CLI are callers and must not own orchestration rules. |
| Current policy enforcement | Approved MCP SRS | MCP PRD | Planned, not currently enforced. `actor` exists but no deny path is wired. |
| GoVibe/MSP/GKS/DB stack | Accepted ADR-backed C4 direction plus integration SDD | BRD | GoVibe -> MSP -> GKS -> backend; integration SDD says intended but not yet wired. |
| GenesisBlockDB role | Integration SDD / SDD | BRD | Graph/vector/governance/bitemporal backend; described as swappable in integration/C4 docs, native/direct in general SDD. Requires reconciliation. |

---

## 5. Alignment Gap Matrix

Status vocabulary follows the parent CR.

| Alignment decision | BRD | PRD | SRS | SDD/C4 | FEAT/STD | Code/as-built evidence | Status |
|---|---|---|---|---|---|---|---|
| GoVibe combines document-driven development with model/diagram workflow and code feedback | Covered at business level | Docs-to-Code + Diagram-to-Doc covered | MCP SRS supports doc resolution; no complete lifecycle SRS reviewed | SDD/C4 cover Docs-to-Code and Diagram-to-Doc | STD defines gates | Partial claims only | `accepted-with-refinement` |
| GoVibe -> MSP -> GKS -> GenesisBlockDB hierarchy | Covered in solution diagram | MemoryOS/GKS direction covered | No reviewed cross-layer SRS | C4/Integration SDD state hierarchy | Not primary FEAT topic | Integration SDD says not yet wired | `accepted-with-refinement` |
| Agent must access memory/knowledge through MSP | Implied | Implied by stack | No reviewed MSP access SRS | Integration SDD states MSP gate; current MCP has zero `msp_*` tools | Not established in reviewed FEAT/STD | Explicitly not wired | `requires-ADR` |
| Source docs remain protected and human-first | Explicit | Explicit | MCP docs.resolve uses approved docs | SDD explicit | STD explicit | Not independently verified | `already-covered` |
| Stable document ID + content hash + atom-level versioning | Partial provenance intent | Atom extraction mentioned | Not in reviewed MCP SRS | C4 mentions DocumentVersionResolver; detailed lifecycle absent | Not in reviewed set | Unverified | `accepted-with-refinement` |
| 12-stage code-to-knowledge decomposition | Explicit 12-step | Referenced | No decomposition SRS reviewed | C4 accepted direction | Not in reviewed STD | Unverified in this pass | `already-covered` at architecture intent; implementation `unverified` |
| 7-phase knowledge-to-code assembly | Explicit 7-phase bottom-up | Product loops are Docs-to-Code and Diagram-to-Doc | No 7-phase SRS reviewed | C4 calls MCP-out 7-phase generation | STD defines gates but not the seven phases | Unverified | `accepted-with-refinement` |
| Genesis Loop as canonical Architecture IR and multi-view SOT | Not established in reviewed BRD | Not established in reviewed PRD | No reviewed SRS | Not established in reviewed SDD/C4 | Not established in reviewed FEAT/STD | Unverified | `requires-ADR` |
| Diagram edit -> semantic model delta -> code | BRD supports translator concept, not this contract | PRD says Diagram-to-Doc | No requirement reviewed | SDD/C4 require Diagram-to-Doc, human review first | STD requires Diagram-to-Doc | Unverified | `conflicts-with-current-spec` if implemented as direct path; otherwise `requires-ADR` |
| Declared and observed models stay separate | Drift/provenance problem stated | Drift detection intended | No cross-system conformance SRS reviewed | Traceability components imply separation | STD says source wins over derived atom | Unverified | `accepted-with-refinement` |
| GenesisBlockDB namespaces for GKS/MSP/GoVibe/evidence | Not specified | Not specified | Not in reviewed SRS | Not specified in reviewed SDDs | Not specified | Unverified | `requires-ADR` |
| CoVibe = intra-owner bounded support | Supported as secondary lane | Explicit | No mode SRS reviewed | Not a new C4 system | Approved FEATs | Unverified | `already-covered`; runtime `accepted-with-refinement` |
| CoDev = inter-owner/inter-team | Core business direction | Explicit | No mode SRS reviewed | Existing system ownership retained | Approved FEATs | Unverified | `already-covered`; runtime `accepted-with-refinement` |
| CoVibe may use lighter process | Minimum safe governance supports it | Compatible | No mode matrix requirement | Compatible | STD governs by C/H/W, not mode | Unverified | `accepted-with-refinement` |
| CoDev always uses maximum governance | Not stated | Not stated | Not stated | Not stated | Contradicted by complexity-based standard | N/A | `conflicts-with-current-spec` |
| H0-H5 context expansion | Not authoritative | PRD contains H0-H6 references | Not in MCP SRS as graph-hop contract | C4 contains H0-H6 | Stable STD removed H5/H6 and separates access scope from retrieval radius | Unverified | `conflicts-with-current-spec` |
| Mission Control is control plane, not rules/SOT owner | Covered | Explicit | FR-008 | SDD/C4 support | Compatible | MCP runtime claims shared surface | `already-covered` |

---

## 6. Contradiction Register

## C-001 — Parent CR uses invalid H5 access scope

**Severity:** HIGH  
**Sources:**

- Parent CR frontmatter: `context_tier: H5`
- `STD-Execution-Governance` v2.3.1+ga: H5/H6 removed; platform-level work is C-3 at H4.

**Finding:** The parent CR uses obsolete governance vocabulary. The stable standard explicitly states that H is access/capability scope, not retrieval hops, and only H0-H4 exist.

**Recommendation:** Amend the parent CR to `access_scope: H4`. If a separate retrieval radius is needed, define it under the hierarchy-compaction/retrieval standard rather than reusing H.

**Gate impact:** Must be corrected before G1 approval.

---

## C-002 — C4 remains on H0-H6 and mixes access scope with graph hops

**Severity:** HIGH  
**Sources:**

- C4 `GenesisKnowledgeSystem` responsibilities use H0-H6 and reserve H6 for full-network traversal.
- Stable Execution Governance says H0-H4 only and explicitly delegates hop/radius semantics elsewhere.

**Finding:** C4 is stale against the stable governance standard.

**Recommendation:** Update C4 only after an ADR/authority check confirms the retrieval-radius vocabulary. Do not simply rename H6 to H4; access permission and graph radius are different axes.

---

## C-003 — C4 MCP tool registry is stale against approved SRS

**Severity:** MEDIUM  
**Sources:**

- C4 lists `ProgressTools` and `AuditTools` under MCP ToolRegistry.
- Approved MCP SRS says no standalone `govibe.progress.*` or `govibe.audit.*` domains exist; progress/audit are fields and snapshot metadata.

**Finding:** The architecture view overstates the live capability surface.

**Recommendation:** Mark those C4 components as planned or replace them with response/snapshot audit metadata consistent with the SRS and LLD.

---

## C-004 — General SDD implies direct UI/core persistence to GenesisBlockDB

**Severity:** HIGH  
**Sources:**

- `SDD-System-Design` data flow: UI -> IPC -> core store -> GenesisBlockDB persistence.
- Integration SDD: GoVibe consumes MSP; MSP is gate to GKS; GKS drives GenesisBlockDB.

**Finding:** The general SDD can be read as permitting GoVibe/core to write directly to the backend, bypassing MSP/GKS semantic boundaries.

**Recommendation:** Clarify data classes:

```text
UI operational state -> governed application/runtime service -> permitted store
Agent session/memory/context -> MSP
Canonical knowledge/atoms -> GKS
Backend persistence -> GenesisBlockDB driver
```

Do not assert that all Zustand/core state is canonical knowledge.

---

## C-005 — Backend swappability vs native GenesisBlockDB coupling

**Severity:** MEDIUM  
**Sources:**

- C4 and integration SDD describe Obsidian/GenesisBlockDB or backend as swappable.
- General SDD says platform shifted to GenesisBlockDB-backed GoVibe-native runtime.
- BRD calls GenesisBlockDB performance infrastructure and a storage driver.

**Finding:** The product boundary is mostly consistent, but implementation language is ambiguous between default-native backend and contractually swappable backend.

**Recommendation:** Canonical wording:

> GenesisBlockDB is the default/native full-eco backend behind a storage-driver contract. Swappability is an architectural boundary, not proof that alternate drivers currently have parity.

Require an as-built adapter matrix before claiming practical swappability.

---

## C-006 — Diagram-to-Code framing conflicts with approved Diagram-to-Doc gate

**Severity:** HIGH  
**Sources:**

- Stable STD: diagram -> draft doc -> human review -> approved doc -> docs-to-code.
- PRD/SDD/C4 repeat Diagram-to-Doc.
- Proposed alignment introduced semantic diagram edits and model-to-code assembly.

**Finding:** Direct Diagram-to-Code is not the approved current process. A semantic Architecture IR may later enable model-driven authoring, but it cannot bypass reviewed human-readable documents under current governance.

**Recommendation:** Preserve:

```text
Diagram/model edit
-> semantic draft/change proposal
-> reviewed human-readable document or approved canonical model revision
-> docs-to-code
```

Any exception requires ADR + SRS + approval-policy change.

---

## C-007 — MSP mandatory mediation is intended, not implemented

**Severity:** HIGH  
**Sources:**

- Integration SDD: GoVibe must consume MSP; current server has ten `govibe.*` tools and zero `msp_*`; wiring is intended.
- MCP SRS: current policy enforcement is also not wired.

**Finding:** Architecture intent must not be presented as current enforcement.

**Recommendation:** All docs/UI labels must distinguish:

```text
approved architecture
planned integration
implemented capability
enforced runtime guarantee
```

A future implementation packet must include negative tests proving that direct bypass is denied.

---

## C-008 — MemoryOS/MSP naming collision

**Severity:** MEDIUM  
**Sources:**

- PRD/C4 use “MSP (Memory OS / passport)” and “MemoryOS V3 / GenesisBlockDB” inconsistently.
- Integration SDD §2a says MemoryOS V3 is umbrella; MSP is passport/management; GenesisBlockDB is backend.

**Finding:** Canonical naming exists in the integration SDD but has not propagated consistently.

**Recommendation:** Propagate §2a naming after G1 approval.

---

## C-009 — Approved RBAC/ABAC requirement vs no enforcement

**Severity:** CRITICAL for governance claims  
**Sources:**

- MCP SRS FR-005 is MUST.
- The same SRS explicitly says enforcement is planned and no deny path exists.
- MCP PRD repeats the honest current state.

**Finding:** Product governance claims must not imply live access enforcement.

**Recommendation:** Treat policy enforcement as a release-blocking implementation gap for any production claim of governed tool execution.

---

## 7. Coverage Findings by Proposed Alignment Area

## 7.1 Development paradigm

**Source-derived:** Human-first Docs-to-Code and Diagram-to-Doc are strongly established. Code-to-knowledge decomposition is established at architecture direction level.

**Refinement:** “Bidirectional knowledge-driven development” is a useful umbrella description, but it must preserve the reviewed-document gate and must not imply automatic round-trip model mutation.

**Status:** `accepted-with-refinement`.

---

## 7.2 System hierarchy and access boundary

**Source-derived:** The accepted direction is GoVibe -> MSP -> GKS -> backend.

**Implementation observation from source docs:** Integration is not wired; current MCP has no `msp_*` surface.

**Status:** Architecture direction `accepted`; runtime guarantee `unverified/not implemented`.

---

## 7.3 GKS document/atom lifecycle

**Source-derived:** Human docs are canonical; atoms are derived; approved docs are resolved through governed context; document version resolution is part of C4 design.

**Not established in reviewed source set:** precise stable Document ID algorithm, content canonicalization/hash rules, atom-level diff, split/merge identity, temporal atom supersession.

**Status:** `accepted-with-refinement`; requires a dedicated GKS SRS/SDD or approved existing authority.

---

## 7.4 12-stage decomposition

**Source-derived:** Universal code-in and 12-step decomposition are accepted direction.

**Not verified:** exact stage contract, typed artifacts, wave DAG, F1-F4 finalization, incremental invalidation, current implementation coverage.

**Status:** Direction `already-covered`; detailed contract `requires evidence/spec review`.

---

## 7.5 Genesis Loop Architecture IR

**Unverified:** The reviewed sources do not establish Genesis Loop as the platform canonical Architecture IR or multi-view SOT.

**Recommendation:** Do not propagate into BRD/PRD as current capability. Open ADR to define:

- relationship to human-readable canonical docs
- logical vs physical SOT
- atom/relation schema
- importer/projector/renderer boundaries
- view-state separation
- declared/observed graph relationship
- edit and approval semantics

**Status:** `requires-ADR`.

---

## 7.6 Seven-phase assembly

**Source-derived:** BRD/C4 refer to 7-phase bottom-up / MCP-out generation.

**Not established in reviewed source set:** the proposed canonical phase names and complete phase transition/artifact contract.

**Status:** `accepted-with-refinement`; locate and review the authoritative seven-phase spec before propagation.

---

## 7.7 MSP session/memory/context contract

**Source-derived:** MSP handles sessions, episodic memory, retrieval, validation and gates GKS; context packets exist as intended contracts.

**Not verified:** proposed exact memory taxonomy, context-package schema, branching/merge semantics, H-based graph expansion, disclosure logs, promotion state machine.

**Status:** `requires-ADR` or existing MSP v2 authority review.

---

## 7.8 GenesisBlockDB storage/namespace contract

**Source-derived:** Backend provides graph/vector/governance/bitemporal capabilities and is used through a driver.

**Not established:** namespace model proposed by alignment, transaction bundle semantics, index lifecycle and isolation boundaries.

**Status:** `requires-ADR` plus backend interface evidence.

---

## 7.9 Atom taxonomy and relation ontology

**Source-derived:** Atom families are named throughout PRD/SDD/C4.

**Not established:** one approved validation ontology for all atom and edge types.

**Status:** `accepted-with-refinement`; locate GKS taxonomy authority before creating a duplicate.

---

## 7.10 Projection/rendering/Web editing

**Source-derived:** Mission Control visualizes derived knowledge; diagrams are inputs; Web must not own business rules.

**Not established:** semantic editing transaction, round-trip fidelity, projector contracts, Architecture IR views.

**Status:** `requires-ADR`.

---

## 7.11 Declared-vs-observed conformance

**Source-derived:** Doc/code drift, traceability and tension detection are product requirements/positioning.

**Not established:** one canonical status model (`matched`, `drifted`, etc.), confidence/severity rules, waiver lifecycle.

**Status:** `accepted-with-refinement`; SRS required.

---

## 7.12 Mission Control integration

**Source-derived:** Mission Control is a visual control plane; MCP/application rules remain outside UI; live state and evidence are required.

**Not established:** all proposed new workspaces and view numbering.

**Status:** Boundary `already-covered`; specific UI changes `deferred to design/implementation packet`.

---

## 7.13 CoVibe/CoDev operating modes

**Source-derived:** Canonical definitions and module boundaries are approved.

**Missing runtime requirements:**

- mode identity/state
- classifier/selection
- escalation/de-escalation
- preserved IDs/evidence during transition
- policy matrix across mode × complexity × access × W × risk
- UI exposure
- test requirements

**Status:** Terminology `already-covered`; runtime behavior `accepted-with-refinement`.

---

## 8. Implementation-Evidence Map

This table records only evidence explicitly described by reviewed documents. It is not an independent code execution result.

| Capability | Document-reported state | Evidence named by source | Audit classification |
|---|---|---|---|
| MCP stdio + HTTP/WS sidecar | Shipped | `scripts/mcp/sidecar-server.mjs`; endpoints in SRS | `CODE/AS-BUILT CLAIM` |
| Ten `govibe.*` tools | Shipped | `scripts/mcp/registry.mjs`; PRD/SRS/LLD mapping | `CODE/AS-BUILT CLAIM` |
| `govibe.orchestrate.step` | Shipped | PRD capability description | `CODE/AS-BUILT CLAIM` |
| Deployment adapter | Scaffold only | `handlers.mjs` acknowledgement behavior | `CODE/AS-BUILT CLAIM` |
| RBAC/ABAC enforcement | Not implemented | SRS says no deny path | `CODE/AS-BUILT CLAIM` |
| MSP client / `msp_*` tools | Not wired | Integration SDD says zero current tools | `CODE/AS-BUILT CLAIM` |
| `query_genesis_graph` tool #11 | Planned | Integration SDD plan | `SOURCE FACT: planned` |
| CoVibe runtime mode | No implementation evidence reviewed | FEAT defines module behavior | `UNVERIFIED` |
| CoDev runtime mode | No implementation evidence reviewed | FEAT defines module behavior | `UNVERIFIED` |
| Genesis Loop Architecture IR | No approved implementation evidence reviewed | Alignment discussion only | `UNVERIFIED` |
| Declared/observed conformance engine | Product direction, no reviewed executable contract | BRD/traceability direction | `UNVERIFIED` |

---

## 9. ADR Recommendations

## ADR-R1 — H-axis and retrieval-radius separation

**Required:** Yes  
**Reason:** Stable governance removed H5/H6 and defines H as access scope, while C4 and alignment discussions use H as graph radius.

Decision must define separate terms for:

- executor capability/access ceiling
- graph traversal radius
- context/token budget
- fan-out/coupling

---

## ADR-R2 — MSP mandatory mediation boundary

**Required:** Yes, unless an accepted ADR already fully specifies it.

Must define:

- agent-facing APIs
- prohibited bypass paths
- GoVibe application-service access
- MSP internal direct storage access
- GKS canonical knowledge writes
- enforcement and negative tests

---

## ADR-R3 — Genesis Loop Architecture IR

**Required:** Yes.

Must decide whether Genesis Loop is:

- a derived composition over human-canonical docs
- a canonical semantic model with governed write-back
- an export/view artifact
- or some combination with explicit authority order

No PRD/SRS propagation should occur before this decision.

---

## ADR-R4 — Declared/observed dual-model conformance

**Required:** Recommended.

Must define:

- identities and mapping
- conformance states
- evidence and confidence
- temporal semantics
- waiver/expiry
- completion-blocking policy

---

## ADR-R5 — GenesisBlockDB driver and namespace boundary

**Required:** Recommended.

Must reconcile native default vs swappable driver and define isolation between MSP state, GKS knowledge, GoVibe operational state and evidence.

---

## ADR-R6 — Semantic diagram/model editing

**Required:** Only if product wants more than current Diagram-to-Doc.

Must preserve human review/canonical-source rules and explicitly prohibit direct production mutation from presentation-only edits.

---

## 10. Propagation Plan

## Phase P0 — Correct control metadata

1. Amend parent CR from H5 to H4.
2. Record that H is access scope, not graph radius.
3. Keep WP-01 report at `review` until G1.

## Phase P1 — Approved terminology cleanup

Safe after G1:

- propagate integration SDD naming: MemoryOS V3 umbrella; MSP passport/management; GKS knowledge; GenesisBlockDB backend
- align CoVibe/CoDev wording without changing top-level system map
- mark implementation state honestly

## Phase P2 — Requirements gaps

Create or update SRS requirements for:

- mode state and transitions
- MSP mediation and negative access rules
- document identity/version lifecycle
- conformance states and evidence
- policy enforcement rollout

Use actual repository requirement-ID registries; do not paste provisional IDs blindly.

## Phase P3 — Architecture decisions

Approve ADR-R1 through ADR-R5 as applicable, then update:

- C4
- general SDD
- integration SDD
- relevant feature SDDs/LLDs

## Phase P4 — Bounded implementation packets

Only after G2/G3:

- MSP integration
- RBAC/ABAC enforcement
- mode runtime behavior
- conformance engine
- Mission Control views
- Genesis Loop/IR only if ADR-approved

## Phase P5 — Verification

- docs validation
- source registry validation
- architecture consistency check
- unit/integration/security tests
- 12-stage rescan where implemented
- declared/observed report
- Gate G4 evidence

---

## 11. Gate G1 Decision Matrix

| Decision | Audit recommendation |
|---|---|
| Keep GoVibe platform identity | APPROVE |
| Keep CoVibe/CoDev as SYSTEM-05 modes/modules | APPROVE |
| CoVibe canonical definition | APPROVE |
| CoDev canonical definition | APPROVE |
| MCP remains primary orchestration interface | APPROVE |
| Human-readable SWE docs remain canonical authoring sources | APPROVE |
| 12-step code-in direction | APPROVE AS ARCHITECTURE DIRECTION; require implementation evidence |
| 7-phase generation direction | APPROVE AS DIRECTION; require authoritative phase spec |
| GoVibe -> MSP -> GKS -> GenesisBlockDB | APPROVE AS TARGET ARCHITECTURE; do not claim fully wired |
| Parent CR H5 | REJECT; change to H4 |
| H-level as graph-hop radius | REJECT; separate vocabulary required |
| Genesis Loop as canonical Architecture IR | HOLD; ADR required |
| Direct Diagram-to-Code | REJECT under current standard |
| Semantic model editing with reviewed canonical update | HOLD; ADR/SRS required |
| Declared/observed conformance model | APPROVE CONCEPT; require SRS/ADR |
| CoVibe always light / CoDev always heavy | REJECT |
| RBAC/ABAC as currently enforced | REJECT claim; requirement exists but implementation is planned |

---

## 12. Required Actions Before G1 Closure

1. Correct parent CR access scope from H5 to H4.
2. Confirm external canonical governance mirror is the authority and record sync process.
3. Locate and review authoritative:
   - MSP architecture v2/v3
   - GKS document/atom lifecycle spec
   - 12-stage decomposition spec
   - 7-phase generation spec
   - Genesis Loop spec
   - GKS taxonomy/ontology spec
4. Decide whether Genesis Loop Architecture IR is an approved target, a derived representation, or a research proposal.
5. Decide whether a dedicated operating-mode SRS is required or requirements belong under SYSTEM-05 SRS documents.
6. Record ADR queue and owners.
7. Do not authorize runtime edits until G2 and G3.

---

## 13. Final Audit Opinion

The repository is more aligned than the recent discussion initially assumed. CoVibe, CoDev, governance-over-codegen, GKS interlingua, the four-layer stack, human-first documents, 12-step decomposition and 7-phase generation are not newly invented concepts. They already exist in the product and architecture corpus.

The actual problem is **propagation maturity and implementation truthfulness**:

- some approved decisions have not propagated to C4/SDD terminology,
- some architecture intentions are not wired,
- some requirements are approved but unenforced,
- and several proposed refinements are being described with the confidence of existing standards even though they still require ADR/SRS authority.

The correct next move is not to rewrite the platform. It is to repair authority ordering, remove stale H-scale semantics, define missing contracts, and then implement bounded gaps with explicit evidence.

**WP-01 outcome:** Audit report complete and ready for Gate G1 review. No canonical documents or runtime code were modified by this work packet.

---

## Changelog

| Version | Date | Status | Summary |
|---|---|---|---|
| 0.1.0 | 2026-08-01 | review | Completed WP-01 authority map, gap matrix, contradiction register, implementation-evidence map, ADR recommendations and propagation plan. |
