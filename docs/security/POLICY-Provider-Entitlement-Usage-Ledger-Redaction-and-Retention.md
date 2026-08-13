---
title: "Provider Entitlement Usage Ledger Redaction and Retention Policy"
doc_id: "POLICY-PROVIDER-ENTITLEMENT-USAGE-LEDGER-REDACTION-AND-RETENTION"
version: "0.1.1+draft"
status: draft
updated: "2026-08-14"
owner: "Boss / ATHER"
source_of_truth: true
related_issues:
  - 55
  - 59
  - 61
  - 64
  - 110
related_docs:
  - "docs/adr/ADR-024-Provider-Entitlement-Execution-Authority-Boundary.md"
  - "docs/api/API-008-Provider-Entitlement-Routing-Usage-Contract.md"
  - "docs/assurance/security/THREAT-MODEL-Provider-Entitlement-Credential-and-Session-Boundary.md"
  - "docs/security/POLICY-Provider-Entitlement-Sharing-Compatibility.md"
  - "docs/roadmap/BACKLOG-provider-entitlement-runtime.md"
---

# Provider Entitlement Usage Ledger Redaction and Retention Policy

## 1. Purpose and non-claims

This policy states what the entitlement usage ledger may store, what it must
refuse, and how long it keeps operational records. It is the redaction and
retention note required by `TSK-PER-61` in
`docs/roadmap/BACKLOG-provider-entitlement-runtime.md`.

It is not a runtime conformance claim. The ledger module
(`packages/govibe-core/src/entitlement-usage-ledger.mjs`) is repository-observable
code with unit tests. Issue #64 remains the only gate that may report the
entitlement runtime as implemented.

## 2. Record classes

| Class | Schema | Nature |
|---|---|---|
| Usage event | `govibe-entitlement-usage-event/v1` | operational accounting record for one execution binding attempt |
| Quota snapshot | `govibe-entitlement-quota-snapshot/v1` | point-in-time observation of provider quota or rate-limit state |

Both classes are **operational records**, not knowledge. Neither is promoted to
GKS, and neither may be treated as a canonical relation source.

## 3. Prohibited content

The ledger rejects a record outright when any of the following appears at any
nesting depth:

- `credential`, `credentials`, `access_token`, `refresh_token`, `api_key`,
  `secret`, `password`, `authorization`.

Rejection is a hard failure with reason code `USAGE_EVENT_CREDENTIAL_MATERIAL`.
The ledger stores no credential material, no derived token, and no provider
authentication header. It records `entitlement_id` and `binding_id` only, which
are opaque identifiers already governed by ADR-024.

Prompt content, completion content, tool arguments, and file contents are out of
scope for this ledger. It stores counts, units, outcomes and identifiers only.
Field names outside the two `v1` schemas are rejected rather than stored, so a
caller cannot smuggle payload data into an accounting record.

## 4. Reported, estimated and unknown separation

| Bucket | Source of authority | Rule |
|---|---|---|
| `reported_usage` | the provider, as declared by its capability descriptor | a numeric value is accepted only when the descriptor declares that the provider reports that field |
| `estimated_usage` | GoVibe | requires `method` and `confidence`; can never be written into `reported_usage` |
| `unknown_fields` | derived | every reported field that is null is named unless it is explicitly classified as not applicable |
| `not_applicable_fields` | entitlement semantics carried by the execution record | an explicitly named known field must have a null reported value and cannot also be unknown |

Consequences enforced in code:

- a provider with no capability descriptor is treated as **unknown telemetry**,
  not zero telemetry; no reported value is accepted (`USAGE_SEMANTICS_UNKNOWN`);
- a request-metered entitlement cannot record token fields as consumed quota
  (`USAGE_UNIT_CONFLICT`), which keeps API cached-token reporting distinct from
  subscription request quota;
- a scheduler capacity score cannot be attributed to the provider
  (`ESTIMATE_SOURCE_CONFLICT`);
- a rate-limit-only provider cannot carry a remaining-quota figure.

Aggregation keeps the two buckets in separate totals and publishes a `coverage`
count per field. A total of `0` with `coverage: 0` means "nothing was reported",
never "zero was consumed".

### 4.1 Four-way classification

`docs/security/POLICY-Provider-Entitlement-Sharing-Compatibility.md` section 9
requires each telemetry field to be classified as `provider_reported`,
`govibe_estimated`, `unknown`, or `not_applicable`. The `v1` usage-event schema
in API-008 section 10 carries the fourth classification as
`not_applicable_fields`, alongside the reported, estimated, and unknown buckets.
A field may be marked not applicable only when the entitlement semantics make it
inapplicable, and the ledger requires its reported value to be null.

The ledger also requires known usage field names, disjoint unknown and
not-applicable lists, and rejects a reported value that is declared unknown.
Local-compute token fields can therefore be not applicable while a provider-credit
field remains unknown when the provider does not expose it.

## 5. Knowledge boundary

- The ledger module imports no GKS client, no MSP client, and no canonical
  materialization path.
- The ledger exposes no promotion method.
- Any future promotion of an aggregate into knowledge requires MSP mediation and
  an explicit authority decision, per ADR-023 and ADR-024. Automatic promotion
  from a usage record is prohibited.

A unit test asserts both the absent promotion surface and the absent knowledge
imports.

## 6. Retention

| Setting | Value | Behavior |
|---|---|---|
| `retentionDays` unset (default) | `null` | records are retained for the lifetime of the ledger instance; `purgeExpired` removes nothing |
| `retentionDays` set | positive integer | `purgeExpired(now)` removes usage events by `recorded_at` and quota snapshots by `observed_at` older than the window |

Purging is explicit. The ledger does not delete on a timer, because deletion
timing is an operator decision and must be observable.

The current implementation holds records in process memory. A durable store is
not part of issue #61 and must not be described as existing. Retention values for
a deployed store are an operator decision that belongs to the #64 evidence
package.

## 7. Access and aggregation scope

Aggregation dimensions are restricted to an allowlist: organization, user,
workspace, project, task, provider, entitlement, entitlement type, model, and
outcome. A dimension outside that list is rejected
(`USAGE_AGGREGATION_INVALID`), so a caller cannot group by an unvetted field.

## 8. Required tests

- credential material rejected at top level and nested;
- unreported provider fields rejected rather than stored;
- partial-telemetry and rate-limit-only providers preserved as unknown;
- not-applicable fields separated from unknown fields and conflicting classifications rejected;
- estimates rejected without method and confidence;
- retention window purges by record timestamp;
- knowledge-boundary assertion for the module.

## 9. Completion gate

This policy is satisfied for repository scope when the tests above pass on
`main`. Operator retention configuration, durable storage, and security review
sign-off remain open under issues #61 and #64.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1+draft | 2026-08-14 | ATHER | Recorded the API-008 `not_applicable_fields` classification and its ledger enforcement under issue #110; durable storage and security review remain outside this policy. |
| 0.1.0+draft | 2026-08-04 | ATHER | Initial redaction and retention policy for the entitlement usage ledger delivered under issue #61; no runtime conformance claim. |
