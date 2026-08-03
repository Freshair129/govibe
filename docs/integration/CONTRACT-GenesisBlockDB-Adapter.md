---
title: "GoVibe to GenesisBlockDB Adapter Contract"
doc_id: "CONTRACT-GOVIBE-GENESISBLOCKDB-ADAPTER"
status: draft
version: "0.1.0+draft"
updated: "2026-08-03"
owner: "ARCHON / ATHER"
source_of_truth: true
related_issue: 91
related_adrs:
  - "ADR-025"
---

# GoVibe to GenesisBlockDB Adapter Contract

## 1. Purpose

Define the integration boundary between GoVibe canonical semantic services and GenesisBlockDB without making either product own the other product's domain model.

GenesisBlockDB is a standalone client-neutral database product. GoVibe is one client. This contract is a GoVibe adapter contract, not a GenesisBlockDB product definition.

## 2. Boundary

```text
GoVibe domain and semantic contracts
  -> Persistence Port
  -> GenesisBlockDB Adapter
  -> GenesisBlockDB generic graph/vector/temporal APIs
```

The adapter translates representation. It does not decide semantic identity, authority, context, promotion, or conflict.

## 3. Required inputs

The adapter SHALL accept backend-neutral records containing at minimum:

```yaml
canonical_record:
  canonical_id: string
  record_kind: atom | relation | source_assertion | graph_revision | event
  client_namespace: govibe
  schema_ref: string
  schema_version: string
  properties: object
  provenance: object
  valid_time: object
  transaction_time: object
  graph_revision: string
```

## 4. Required mappings

### 4.1 Identity

- Preserve `canonical_id` exactly.
- Backend-native identifiers may be stored as implementation metadata only.
- Never derive canonical identity from storage location, row ID, vector ID, or edge key.

### 4.2 Namespace and schema

- Use a GoVibe client namespace.
- Persist GoVibe schema references as client metadata.
- Do not register GoVibe atom types as mandatory GenesisBlockDB core types.

### 4.3 Atoms

Map a GoVibe canonical atom to a generic GenesisBlockDB node or equivalent record while preserving:

- canonical ID;
- type and facets as client-defined labels/properties;
- canonical summary and attributes;
- lifecycle state;
- graph revision;
- source assertion references;
- valid and transaction times.

### 4.4 Relations

Map a GoVibe canonical relation to a generic typed edge or equivalent record while preserving:

- relation ID;
- source and target canonical IDs;
- client-defined relation type;
- direction;
- provenance;
- confidence and authority state;
- graph revision;
- temporal validity.

### 4.5 Source assertions

Support multiple source assertions bound to one canonical atom without duplicating the canonical atom.

### 4.6 Embeddings

Embeddings are retrieval/index data, not canonical identity. The adapter SHALL preserve model, dimension, collection, and generation metadata.

## 5. Write contract

The adapter SHALL:

1. receive only approved canonical mutations or explicitly marked candidate storage operations;
2. perform idempotent writes using client mutation IDs;
3. preserve atomic graph-revision boundaries where supported;
4. reject incompatible schema or capability versions;
5. return a stable persistence receipt;
6. never promote candidate knowledge.

Example receipt:

```yaml
persistence_receipt:
  mutation_id: string
  backend: genesisblockdb
  backend_version: string
  graph_revision: string
  committed: true
  backend_refs: []
  warnings: []
```

## 6. Read contract

The adapter SHALL support:

- canonical ID lookup;
- revision-consistent graph neighborhood retrieval;
- relation and facet filtering;
- provenance lookup;
- temporal `as-of` retrieval when negotiated;
- vector and hybrid retrieval as optional capabilities;
- explicit capability response when a requested operation is unsupported.

Read results SHALL be translated back to backend-neutral GoVibe records before entering GKS/MSP services.

## 7. Capability negotiation

```yaml
backend_capabilities:
  atomic_graph_revision: required | supported | unsupported
  bitemporal_query: supported | unsupported
  vector_search: supported | unsupported
  hybrid_query: supported | unsupported
  provenance_index: supported | unsupported
  client_schema_ref: required
  max_batch_size: integer
```

GoVibe SHALL fail closed when a required capability is absent.

## 8. Error model

The adapter SHALL map database-specific failures to:

- `BACKEND_UNAVAILABLE`
- `CAPABILITY_UNSUPPORTED`
- `SCHEMA_INCOMPATIBLE`
- `REVISION_CONFLICT`
- `ATOMIC_COMMIT_FAILED`
- `QUERY_FAILED`
- `DURABILITY_UNCONFIRMED`
- `DATA_INTEGRITY_FAILURE`

Backend error details may be attached as diagnostic evidence but SHALL NOT leak into canonical semantic meaning.

## 9. Security and authority

- Credentials and tenant boundaries are adapter/runtime concerns.
- MSP authorization must be completed before protected reads.
- The adapter must not widen requested graph radius, namespace, or revision.
- Backend access does not grant canonical mutation authority.

## 10. Conformance tests

The same semantic fixtures SHALL pass against:

1. an in-memory reference backend;
2. the GenesisBlockDB adapter.

Minimum tests:

- canonical ID preservation;
- multiple assertions per atom;
- typed relation round-trip;
- graph revision consistency;
- stale revision rejection;
- temporal metadata preservation;
- backend substitution without semantic fixture changes;
- no GoVibe ontology required by the database core.

## 11. Non-goals

- Defining GenesisBlockDB internals.
- Defining NotiKeeper schemas.
- Granting the adapter authority over GKS or MSP decisions.
- Requiring every backend to expose every GenesisBlockDB capability.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-03 | ARCHON / ATHER | Initial backend-neutral GenesisBlockDB adapter contract. |