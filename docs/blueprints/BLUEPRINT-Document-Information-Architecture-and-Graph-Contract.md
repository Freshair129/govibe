---
title: "Blueprint: Document Information Architecture and Graph Contract"
doc_id: "BLUEPRINT-DOCUMENT-IA-GRAPH-CONTRACT"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-03"
owner: "ARCHON / THESEUS / ATHER"
source_of_truth: true
related_docs:
  - "docs/change-requests/CR-2026-08-03-Document-IA-and-Knowledge-Graph-Readiness.md"
  - "docs/design/GoVibe-Document-Hierarchy.md"
  - "docs/STD-Execution-Governance.md"
---

# Blueprint: Document Information Architecture and Graph Contract

## 1. Architecture Intent

Folders are human navigation projections. GoVibe-authored `doc_id` values are
stable document identities. Canonical GKS `document_id`, version, atom, symbol,
entity, and relation identities are assigned only after MSP authorization.
Moving a file must not create a new semantic identity.

## 2. Target Navigation Projection

```text
docs/
  architecture/{blueprints,lld,c4,sequences}/
  requirements/{srs,srd,specs}/
  contracts/api/
  change-control/{change-requests,rca,migration}/
  assurance/{audit,security}/
  operations/{runbooks,handover}/
  references/{templates,fixtures}/
  archive/{legacy,candidates}/
```

Existing canonical anchors remain in place during Phase 1. A later migration
may project them through navigation links when moving them would create excess
compatibility risk.

## 3. Candidate Graph Contract

Minimum document candidate:

```yaml
candidate_id: local stable identifier, never a gks identifier
doc_id: GoVibe document identity when present
path: repository-relative path
version: source version when present
source_sha256: exact source payload hash
lifecycle: observed value or unresolved
authority: observed value or unresolved
provenance: scanner and baseline commit
confidence: 0.0..1.0
```

Minimum relation candidate:

```yaml
candidate_link_id: local stable identifier
type: GOVERNS | DEFINES | IMPLEMENTS | VALIDATES | DECIDES | DERIVES_FROM | CONFORMS_TO | SUPERSEDES
source: source doc_id or path
target: target doc_id or path
source_sha256: source payload hash
provenance: explicit link, metadata, or validated observation
confidence: 0.0..1.0
status: candidate
```

Generic `RELATED_TO` is allowed only as an unresolved candidate and must include
a reason. A backlink is a reverse projection of the same forward relation; it
must preserve identity and must not create a second semantic edge.

## 4. Retrieval And Impact Rules

- MSP supplies context scope, exclusions, versions, permissions and budget
- traversal is cycle-safe, relation-filtered and bounded by an explicit maximum
- grep and path matching are discovery signals, never completeness proof
- impact output states relation chain, graph distance, score, required action,
  unresolved links and coverage limit
- missing WHY, authority or relation becomes an escalation; agents do not infer it

## 5. Context Isolation

Each worker packet records `contextId`, `cacheId`, `sourceManifestHash`,
`contextHash`, baseline commit, allowed paths, exclusions and budget. Workers do
not mint `kvId`, inspect sibling output, or load private history by default.
Reviewer and integration packets contain only diffs, manifests, evidence and
unresolved items needed by their gate.

## 6. Acceptance Criteria

- Folder and path are not treated as canonical graph identity.
- Every graph output is explicitly candidate and provenance-bearing.
- Every traversal and impact query is bounded and cycle-safe.
- Candidate promotion follows GoVibe -> MSP -> GKS; no direct graph write exists.
- Context packets are reproducible from their recorded hashes.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-03 | ARCHON / THESEUS / ATHER | Defined document identity, candidate graph, bounded retrieval, impact, and context-isolation contracts for cleansing. |
