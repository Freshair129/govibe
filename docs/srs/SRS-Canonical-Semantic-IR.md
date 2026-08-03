---
title: "Software Requirements Specification: Canonical Semantic IR"
doc_id: "SRS-CANONICAL-SEMANTIC-IR"
status: draft
version: "0.1.0+draft"
updated: "2026-08-03"
owner: "ARCHON / ATHER"
source_of_truth: true
related_issue: 91
related_adrs:
  - "ADR-017"
  - "ADR-018"
  - "ADR-023"
  - "ADR-025"
related_docs:
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/integration/CONTRACT-GenesisBlockDB-Adapter.md"
---

# SRS: Canonical Semantic IR

## 1. Purpose

Define implementation-facing requirements for GoVibe Canonical Semantic Intermediate Representation (IR), including semantic front-end extraction, candidate representation, identity resolution, canonicalization, relation provenance, multi-view projection, reverse semantic deltas, conflict handling, and backend-neutral persistence.

## 2. System boundary

```text
Source artifacts
  -> Semantic Front-end
  -> Candidate Semantic IR
  -> Identity Resolution
  -> Canonicalization and Conflict Detection
  -> GKS Canonical Semantic Graph
  -> Projection Back-ends
  -> PRD / Roadmap / Backlog / external work / agent context views
```

Persistence is accessed through a backend-neutral port. GenesisBlockDB is one supported standalone backend through an adapter.

## 3. Definitions

- **Source artifact:** document, issue, diagram, code, event, or evidence supplied to the system.
- **Candidate atom/relation:** extracted or proposed semantic object without canonical authority.
- **Source assertion:** a provenance-bound claim from one source revision.
- **Canonical atom/relation:** approved semantic identity and relation governed by GKS authority.
- **View:** regenerable representation of canonical state for a destination convention.
- **Semantic delta:** proposed canonical mutation derived from an edited view.
- **Persistence backend:** storage/query implementation behind the backend-neutral port.

## 4. Functional requirements

### 4.1 Source ingestion and candidate IR

| ID | Requirement | Priority |
|---|---|---|
| CSIR-FR-001 | The system SHALL assign each source artifact a stable source identity, version, hash, owner, and authority state. | MUST |
| CSIR-FR-002 | The semantic front-end SHALL preserve exact source locators for every extracted candidate. | MUST |
| CSIR-FR-003 | The semantic front-end SHALL emit Candidate Semantic IR and SHALL NOT assign canonical identity. | MUST |
| CSIR-FR-004 | One source span MAY produce multiple candidate atoms when it contains multiple obligations or concepts. | MUST |
| CSIR-FR-005 | Candidate output SHALL conform to a versioned structured schema. | MUST |
| CSIR-FR-006 | Ambiguous or unsupported extraction SHALL be marked for review rather than silently normalized. | MUST |

### 4.2 Identity resolution

| ID | Requirement | Priority |
|---|---|---|
| CSIR-FR-010 | Identity resolution SHALL distinguish semantic identity from wording, section location, template, and source-system record ID. | MUST |
| CSIR-FR-011 | Meaning-preserving rewrites SHOULD reuse the existing canonical atom ID. | MUST |
| CSIR-FR-012 | Similar wording in different scopes SHALL NOT be merged solely by lexical or vector similarity. | MUST |
| CSIR-FR-013 | Identity decisions SHALL return `reuse`, `create`, `conflict`, or `human_review`. | MUST |
| CSIR-FR-014 | Every identity decision SHALL record contributing evidence and scores. | MUST |
| CSIR-FR-015 | Multiple source assertions MAY bind to one canonical atom. | MUST |

### 4.3 Canonicalization and conflict

| ID | Requirement | Priority |
|---|---|---|
| CSIR-FR-020 | Canonicalization SHALL be idempotent for the same candidate set and base revision. | MUST |
| CSIR-FR-021 | Canonicalization SHALL preserve prior canonical identity unless an approved supersession decision exists. | MUST |
| CSIR-FR-022 | Contradictory source assertions SHALL create an explicit conflict record. | MUST |
| CSIR-FR-023 | Conflict handling SHALL preserve both source assertions and authority metadata. | MUST |
| CSIR-FR-024 | Canonical changes SHALL be committed under an explicit graph revision. | MUST |
| CSIR-FR-025 | External providers, adapters, and views SHALL NOT promote candidates directly. | MUST |

### 4.4 Relations and provenance

| ID | Requirement | Priority |
|---|---|---|
| CSIR-FR-030 | Every canonical relation SHALL have a stable relation identity. | MUST |
| CSIR-FR-031 | Every inferred relation SHALL include source or derivation provenance. | MUST |
| CSIR-FR-032 | Relation type and endpoint compatibility SHALL be validated against a versioned registry. | MUST |
| CSIR-FR-033 | Topic similarity alone SHALL NOT establish dependency, implementation, satisfaction, or verification relations. | MUST |
| CSIR-FR-034 | Backlinks SHALL be reverse projections of one canonical relation rather than duplicate semantic edges. | MUST |

### 4.5 Multi-view projection

| ID | Requirement | Priority |
|---|---|---|
| CSIR-FR-040 | The system SHALL generate destination views from a declared canonical graph revision. | MUST |
| CSIR-FR-041 | Each view SHALL declare graph revision, view definition, template version, and generated timestamp. | MUST |
| CSIR-FR-042 | A view SHALL preserve canonical references required for reverse mapping. | MUST |
| CSIR-FR-043 | Deleting a generated view SHALL NOT mutate canonical state. | MUST |
| CSIR-FR-044 | Regenerating the same deterministic view from the same graph and template revision SHALL produce semantically equivalent output. | MUST |
| CSIR-FR-045 | Projection SHALL expose omitted, conflicted, or unresolved canonical items. | MUST |

### 4.6 Reverse delta and round-trip

| ID | Requirement | Priority |
|---|---|---|
| CSIR-FR-050 | Editing a managed view SHALL produce a semantic delta candidate. | MUST |
| CSIR-FR-051 | A reverse pass SHALL validate the source view base revision before applying a delta. | MUST |
| CSIR-FR-052 | Stale or conflicting edits SHALL be rejected or routed to conflict review. | MUST |
| CSIR-FR-053 | Applying a delta SHALL preserve all canonical fields outside the declared edit set. | MUST |
| CSIR-FR-054 | Reverse compilation SHALL use the same canonicalization and authority path as other candidates. | MUST |
| CSIR-FR-055 | No destination tool edit SHALL silently become canonical knowledge. | MUST |

### 4.7 Backend-neutral persistence

| ID | Requirement | Priority |
|---|---|---|
| CSIR-FR-060 | Canonical semantic contracts SHALL NOT depend on GenesisBlockDB implementation structs, storage keys, or query syntax. | MUST |
| CSIR-FR-061 | Persistence SHALL be accessed through a backend-neutral port. | MUST |
| CSIR-FR-062 | A backend adapter SHALL preserve canonical IDs, relations, source assertions, provenance, temporal metadata, and graph revisions. | MUST |
| CSIR-FR-063 | Replacing the persistence backend SHALL NOT change semantic fixtures or canonical identity rules. | MUST |
| CSIR-FR-064 | Backend capability negotiation SHALL be explicit. | MUST |
| CSIR-FR-065 | GoVibe-specific ontology SHALL NOT be required as database-core ontology. | MUST |
| CSIR-FR-066 | GenesisBlockDB SHALL be treated as one standalone supported backend through its adapter. | MUST |

## 5. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| CSIR-NFR-001 | Schema validity | 100% accepted outputs validate against declared schemas |
| CSIR-NFR-002 | Identity preservation | >= 95% on meaning-preserving rewrite fixtures |
| CSIR-NFR-003 | False merge rate | <= 2% on held-out identity fixtures |
| CSIR-NFR-004 | Relation precision | >= 90% on labeled relation fixtures |
| CSIR-NFR-005 | Relation recall | >= 80% on labeled relation fixtures |
| CSIR-NFR-006 | Untouched-field preservation | 100% in deterministic round-trip fixtures |
| CSIR-NFR-007 | Deterministic view reproducibility | 100% for deterministic projections |
| CSIR-NFR-008 | Auditability | Every canonical change traceable to source/candidate/decision/revision |
| CSIR-NFR-009 | Backend substitution | Reference and GenesisBlockDB adapters pass the same semantic conformance fixtures |

## 6. Required schemas

- Candidate Semantic IR
- Canonical atom
- Canonical relation
- Source assertion
- Identity decision
- Conflict candidate
- Canonical graph revision
- Semantic delta
- View definition
- View manifest
- Persistence receipt
- Backend capability manifest

## 7. Required views for PoC

- PRD Markdown
- Roadmap or backlog representation
- Jira-compatible JSON payload
- Agent context packet

These are test projections. They are not separate canonical sources of truth.

## 8. Verification

The requirements SHALL be verified through:

- schema contract tests;
- unit and property tests;
- human-labeled extraction and identity fixtures;
- adversarial false-merge and invented-relation fixtures;
- deterministic projection snapshots;
- full round-trip tests;
- backend conformance tests using an in-memory reference backend and GenesisBlockDB adapter.

## 9. Out of scope

- production-scale distributed consensus;
- mandatory GenesisBlockDB deployment;
- direct definition of NotiKeeper schemas;
- autonomous conflict approval;
- treating generated views as canonical semantic authority.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-03 | ARCHON / ATHER | Initial backend-neutral Canonical Semantic IR SRS. |