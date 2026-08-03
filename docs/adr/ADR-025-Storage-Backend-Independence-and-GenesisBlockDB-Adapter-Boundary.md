---
title: "Storage Backend Independence and GenesisBlockDB Adapter Boundary"
doc_id: "ADR-025-STORAGE-BACKEND-INDEPENDENCE"
status: proposed
version: "0.1.0+draft"
updated: "2026-08-03"
owner: "Boss / ARCHON / ATHER"
source_of_truth: true
related_issue: 91
related_docs:
  - "docs/BRD-GoVibe-Platform.md"
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/srs/SRS-Canonical-Semantic-IR.md"
  - "docs/integration/CONTRACT-GenesisBlockDB-Adapter.md"
---

# ADR-025: Storage Backend Independence and GenesisBlockDB Adapter Boundary

## Status

Proposed.

## Context

GoVibe owns product behavior for semantic validation, candidate creation, planning, execution governance, traceability, and convention rendering. The Genesis Knowledge System (GKS) owns canonical semantic identity and relation authority. The Memory & Soul Passport (MSP) owns bounded context selection and continuity.

GenesisBlockDB is a separate embedded, local-first hybrid graph and vector database product. GoVibe is one client. NotiKeeper and future applications may use GenesisBlockDB with their own schemas, ontologies, policies, and lifecycle rules.

Treating GoVibe atom types or governance rules as native GenesisBlockDB semantics would create two forms of lock-in:

1. GoVibe could not replace the persistence backend without changing canonical meaning.
2. Other GenesisBlockDB clients would be forced to adopt GoVibe concepts unrelated to their domains.

## Decision

GoVibe Canonical Semantic IR SHALL be independent of any storage-engine implementation.

GenesisBlockDB SHALL be integrated through a GoVibe-owned adapter contract. It is one supported backend, not the semantic authority and not the only valid backend.

The boundary is:

```text
GoVibe source validation and semantic compilation
  -> Candidate Semantic IR
  -> MSP promotion/authority gate
  -> GKS canonical identity and relation decisions
  -> backend-neutral persistence port
  -> GenesisBlockDB adapter or another compatible adapter
```

### GoVibe owns

- GoVibe atom, relation, facet, planning, governance, and projection semantics;
- Candidate Semantic IR and canonical semantic contracts;
- identity and authority decisions through GKS/MSP responsibilities;
- conflict, promotion, and reverse-delta policies;
- backend-neutral persistence port and conformance tests.

### GenesisBlockDB owns

- generic node, edge, property, vector, temporal, provenance, query, durability, and recovery capabilities;
- client namespaces and client schema references;
- generic storage and query behavior;
- database API, SDK, WAL, index, and deployment contracts.

### The adapter owns

- mapping GoVibe canonical records to generic GenesisBlockDB records;
- preservation of canonical IDs, source assertions, graph revisions, and provenance;
- translation of backend errors into GoVibe persistence errors;
- capability negotiation and compatibility reporting;
- no creation of semantic facts or authority decisions.

## Required invariants

1. Replacing GenesisBlockDB SHALL NOT change GoVibe canonical semantic identity.
2. GenesisBlockDB SHALL NOT require GoVibe-specific atom types in its core.
3. The adapter SHALL preserve canonical identifiers and graph revision semantics.
4. Backend-generated identifiers SHALL NOT replace GoVibe canonical identifiers.
5. A backend write SHALL NOT bypass candidate, authority, conflict, or promotion gates.
6. A backend query SHALL NOT define MSP context-selection policy.
7. Client-specific schema validation SHALL occur in the client or plugin boundary, not as mandatory database-core ontology.

## Consequences

### Positive

- GoVibe remains portable across compatible persistence backends.
- GenesisBlockDB remains usable by NotiKeeper and future clients.
- Semantic ownership and storage ownership are reviewable independently.
- Backend benchmarks do not become semantic correctness claims.

### Negative

- An adapter and conformance suite are required.
- Some GenesisBlockDB capabilities may be unavailable through the minimal portable contract.
- Capability negotiation and migration behavior must be explicit.

## Rejected alternatives

### Make GenesisBlockDB the native owner of GoVibe atoms

Rejected because it couples a standalone database product to one client ontology.

### Let each feature write arbitrary database records directly

Rejected because it bypasses canonical identity, authority, provenance, and conflict controls.

### Define the persistence API from GenesisBlockDB implementation structs

Rejected because storage internals would leak into GoVibe domain contracts.

## Acceptance criteria

- GoVibe BRD and PRD describe GenesisBlockDB as one standalone supported backend.
- A backend-neutral SRS defines persistence invariants.
- A GenesisBlockDB adapter contract exists.
- Conformance tests can be run against a fake/in-memory backend and GenesisBlockDB without changing semantic fixtures.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-03 | Boss / ARCHON / ATHER | Established storage-backend independence and the GenesisBlockDB adapter boundary. |