---
title: "STD: Document Versioning Governance"
doc_id: "STD-DOCUMENT-VERSIONING-GOVERNANCE"
status: "draft"
version: "0.1.1+draft"
updated: "2026-06-15"
owner: "ATHER / THESEUS"
source_of_truth: true
prd_system: "SYSTEM-09::Traceability-Audit-Verification-System"
related_docs:
  - "docs/STD-Execution-Governance.md"
  - "docs/features/traceability-audit/FEAT-Document-Version-Governance.md"
  - "docs/DOC-VERSION-REGISTRY.md"
---

# STD: Document Versioning Governance

## 1. Purpose

Define one canonical metadata and versioning standard for GoVibe documents so audits can answer:

- which document is current
- which version is active
- who owns it
- whether it is canonical, superseded, deprecated, or archived
- how it changed over time

## 2. Scope

This standard applies to:

- `docs/**/*.md`
- `.agents/**/*.md`

This standard does not apply in v1 to:

- generated exports
- archived HTML candidates
- third-party source mirrors that must remain verbatim

## 3. Required Frontmatter

Every in-scope Markdown document must include YAML frontmatter with at least:

```yaml
title:
doc_id:
status:
version:
updated:
owner:
source_of_truth:
```

Recommended additional fields when relevant:

```yaml
prd_system:
related_docs:
supersedes:
superseded_by:
canonical_path:
```

## 4. Canonical Version Format

GoVibe uses Semantic Versioning as the base:

```text
MAJOR.MINOR.PATCH[-stage][+edition]
```

Examples:

- `1.0.0`
- `1.0.1-beta`
- `1.2.0-rc.1`
- `1.5.0+govibe`
- `1.5.0-beta+govibe`

Rules:

1. `MAJOR.MINOR.PATCH` is mandatory.
2. `stage` is optional and represents release maturity.
3. `edition` is optional and represents distribution lineage or integration label.
4. New documents must not use compressed suffix forms such as `1.0.1b` or custom mixed-case endings such as `1.5.0G`.

## 5. Allowed Stage Values

Allowed `stage` values:

- `alpha`
- `beta`
- `rc`
- `ga`
- `deprecated`
- `archived`

Notes:

- `ga` means generally approved for active use.
- `deprecated` means still referenceable but not preferred for new work.
- `archived` means retained for history only.

## 6. Allowed Edition Values

Allowed `edition` values in v1:

- `govibe`
- `genesis`
- `legacy`
- `local`

If a new edition label is needed, it must be added through governance review before use.

## 7. Legacy Version Mapping

Older documents may still contain shorthand or non-standard version strings. These must be normalized when touched.

| Legacy Form | Canonical Form | Meaning |
|---|---|---|
| `1.0.1b` | `1.0.1-beta` | beta document |
| `1.0.1a` | `1.0.1-alpha` | alpha document |
| `1.5.0G` | `1.5.0+govibe` | GoVibe edition |
| `2.2.0-Release` | `2.2.0-ga` | approved general release |

Unapproved shorthand mappings such as `c`, `d`, `e`, `f`, or freeform uppercase suffixes must not be introduced in new documents.

## 8. Changelog Requirement

Every in-scope Markdown document must end with a footer changelog section:

```md
## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-15 | THESEUS | Initial version |
```

Rules:

1. The latest entry must match the frontmatter `version`.
2. New edits must append a new row or update the latest row before merge.
3. Changelog entries must describe the change in human terms, not only "update" or "fix".

## 9. Registry Requirement

Canonical document versions must be listed in:

- `docs/DOC-VERSION-REGISTRY.md`

The registry is an audit sitemap. It does not replace document content. It records:

- `doc_id`
- active `version`
- `status`
- `owner`
- canonical path
- parent grouping such as PRD, system, module, standard, or runbook

## 10. Enforcement Phases

### Phase 1: New and Touched Documents

- all new docs must follow this standard
- any touched in-scope doc must be normalized before merge

### Phase 2: Validator Enforcement

`docs:validate` should fail when:

- `doc_id` is missing
- `version` is missing
- `version` is not canonical
- `## Changelog` is missing

### Phase 3: Registry Drift Checks

The registry should warn or fail when:

- active version differs from the file frontmatter
- canonical path is stale
- two active files claim the same `doc_id`

### Phase 4: Diff Gate Automation

The repository should provide an automated diff check that validates change scope before commit or push.

Required behavior:

- detect whether changed files touch docs, code, or masterplan sources
- fail when code changes appear without any accompanying docs or masterplan update
- run `docs:validate` for any relevant change set before approval
- provide a staged-only mode for release or pre-commit flows

Canonical command:

```bash
npm run diff:check
```

## 11. Acceptance Criteria

- Every new in-scope Markdown document uses the required frontmatter.
- Every new in-scope Markdown document uses canonical version formatting.
- Every new in-scope Markdown document includes a footer changelog.
- A registry exists for current canonical document versions.
- Legacy shorthand is documented and blocked from new use.

## 12. Open Migration Notes

- Existing documents with shorthand versions need a normalization sweep.
- Existing documents with prose headers need frontmatter upgrades.
- Existing validators need to be extended in a separate implementation slice.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1+draft | 2026-06-15 | ATHER / THESEUS | Added repository diff gate automation requirements for docs/code/masterplan scope validation and staged-only review support. |
| 0.1.0+draft | 2026-06-15 | ATHER / THESEUS | Initial document versioning governance standard for metadata, canonical version format, changelog, and registry requirements. |
