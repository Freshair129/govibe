---
title: "WP-08: GKS Canonical Integration and Materialization"
doc_id: "WP-08-GKS-CANONICAL-INTEGRATION-MATERIALIZATION"
status: "verification_pending"
version: "0.2.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
complexity: "C-4"
access_scope: "H4"
---

# Objective

Add the GoVibe-side contract for MSP-mediated promotion of observed candidates into canonical GKS identities and versioned relations without allowing GoVibe to mint canonical IDs or write directly to GKS/GenesisBlockDB.

# Implemented slice

1. Adds `govibe-canonical-materialization-request/v1` validation.
2. Requires all inputs to remain in an explicit candidate namespace.
3. Sends materialization requests only through `msp_knowledge_materialize`.
4. Validates `govibe-canonical-materialization-result/v1` responses.
5. Requires complete one-to-one candidate-to-canonical coverage.
6. Rejects duplicate candidate or canonical mappings.
7. Requires canonical `gks:` identifiers, SHA-256 source hashes, and explicit versions.
8. Validates relation endpoints against the returned canonical mapping set.
9. Exports the contract through `packages/govibe-core/src/index.mjs`.
10. Adds focused tests for canonical identity separation, complete coverage, and relation integrity.

# Authority boundary

- GoVibe discovers and submits candidates.
- MSP authorizes and mediates promotion.
- GKS owns canonical IDs, deduplication, relation resolution, and graph versions.
- GenesisBlockDB persistence remains behind GKS.
- This repository does not implement or impersonate the production GKS service.

# Acceptance criteria

- Candidate IDs cannot be returned as canonical IDs.
- Every submitted candidate has exactly one canonical mapping.
- Canonical relations only reference mapped canonical endpoints.
- Source hashes and versions are mandatory.
- Missing MSP capability fails closed.
- Tests, lint, docs validation, MCP smoke, and build pass.
- PR remains unmerged until explicit owner approval.
