---
title: "FEAT: Document Version Governance"
doc_id: "FEAT-DOCUMENT-VERSION-GOVERNANCE"
status: "draft"
version: "0.1.0+draft"
updated: "2026-06-15"
owner: "ATHER / THESEUS"
source_of_truth: true
prd_system: "SYSTEM-09::Traceability-Audit-Verification-System"
complexity: "C-3"
context_tier: "H4"
risk: "MEDIUM"
related_docs:
  - "docs/STD-Document-Versioning-Governance.md"
  - "docs/STD-Execution-Governance.md"
  - "docs/DOC-VERSION-REGISTRY.md"
---

# FEAT: Document Version Governance

## 1. Overview

GoVibe needs one enforceable governance layer for document metadata, version syntax, changelog presence, and active-version auditability. Today, the repository mixes frontmatter styles, shorthand version suffixes, prose headers, and inconsistent changelog usage. This feature defines the source rules before validator and migration work begins.

## 2. Goals and Non-Goals

### Goals

- standardize metadata fields across in-scope Markdown documents
- standardize canonical document version syntax
- require footer changelogs for in-scope Markdown documents
- introduce an auditable registry for active canonical document versions
- define migration rules for legacy shorthand version strings

### Non-Goals

- full repository-wide normalization in this doc slice
- automatic rewriting of all historical files
- versioning of generated HTML artifacts

## 3. User Stories

| ID | Role | Story |
|---|---|---|
| US-01 | Auditor | I need to see which version of each canonical document is currently active. |
| US-02 | Doc Writer | I need one required metadata format so new documents do not drift. |
| US-03 | PM / Architect | I need version, status, and owner visibility to audit planning sources across tiers. |

## 4. Requirements

### Functional Requirements

- Every new or touched in-scope Markdown document must include required frontmatter fields.
- Every new or touched in-scope Markdown document must use canonical version syntax.
- Every new or touched in-scope Markdown document must include a footer changelog.
- A central registry must record active canonical versions for audit use.
- Legacy shorthand versions must be explicitly mapped and blocked from new use.

### Non-Functional Requirements

- The standard must be machine-parseable by validators.
- The standard must remain readable for human authors.
- The registry must work as an audit sitemap without duplicating document content.

## 5. Technical Details

- Frontmatter keys will be validated in a future extension of `scripts/docs/validate-docs.mjs`.
- Canonical version parsing should follow `MAJOR.MINOR.PATCH[-stage][+edition]`.
- Registry drift detection should compare file frontmatter against registry rows.
- Initial rollout should target `docs/**/*.md` and `.agents/**/*.md` with scoped exclusions for generated or preserved third-party artifacts.

## 6. PRD System Mapping

- Primary system: `SYSTEM-09::Traceability-Audit-Verification-System`
- Secondary systems: `SYSTEM-02::Project-Roadmap-Management-System`, `SYSTEM-05::Agent-Team-Management-System`

## 7. Acceptance Criteria

- A standard exists for required document metadata.
- A standard exists for canonical version formatting.
- A standard exists for mandatory footer changelogs.
- A registry exists to show currently active canonical document versions.
- A migration rule exists for legacy shorthand versions.

## 8. Success Criteria

- New governance docs can reference one canonical standard instead of re-explaining version rules.
- Auditors can answer "what is the active version?" without scanning raw git history.
- Future validator work has an unambiguous contract to enforce.

## 9. Verification

- Review `docs/STD-Document-Versioning-Governance.md` for required fields, canonical version syntax, and changelog requirements.
- Review `docs/DOC-VERSION-REGISTRY.md` for active-version sitemap structure.
- Confirm the feature leaves validator implementation to a later approved slice.

## 10. Definition of Done

- Doc-first governance spec is written and reviewable.
- Canonical version syntax is explicitly defined.
- Legacy shorthand mapping is documented.
- Registry structure is defined and committed.

## 11. Open Questions

- Which directories should be permanently exempt from strict metadata enforcement?
- Should registry drift start as warning-only before becoming a hard fail?

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-15 | ATHER / THESEUS | Initial feature specification for document metadata, version syntax, changelog enforcement, and active-version registry governance. |
