---
title: "WP-<NN>: <Work Packet Title>"
doc_id: "WP-<NN>-<SLUG>"
status: "draft"
version: "0.1.0+draft"
updated: "YYYY-MM-DD"
owner: "<owner>"
proposal_author: "<proposal author>"
approval_owner: "<approval owner>"
source_of_truth: false
approval_recorded_at: ""
execution_authorized: false
execution_complete: false
complexity: "C-<0-3>"
access_scope: "H<0-4>"
risk: "<LOW|MEDIUM|HIGH>"
parent_change_request: "<CR-ID>"
depends_on: ""
related_adrs: []
related_apis: []
---

# WP-<NN>: <Work Packet Title>

## Objective

State the bounded outcome this work packet delivers under its parent change
request's authorization. Name the exact risk being accepted, if any.

## Preconditions

- <precondition, e.g. a prior work packet is complete with reviewed evidence>
- <governing decision or evidence record this packet depends on>

## Bounded scope

1. <exact change #1>
2. <exact change #2>
3. <invariant that must be preserved, e.g. fail-closed validation>

## Explicit exclusions

- <adjacent change this packet does not authorize>
- <promotion or lifecycle change this packet does not authorize>
- <any assertion this packet must not make>

## Acceptance and exit gate

- AC-01: <criterion>
- AC-02: <criterion>
- AC-03: required test/lint/build/docs-validation/diff-check gates pass.
- AC-04: independent review and owner approval recorded before closure.

## Rollback

Capture pre-change source hashes and inverse patches before any runtime or
test mutation. If an approved rollback trigger occurs, restore the exact prior
state, rerun the approved baseline, and record the trigger without widening
scope or restoring an authority bypass.

## Owner accepted-risk record

Record the owner's explicit acceptance (if any) of residual risk this packet
proceeds under, the date, and the exact bounded scope that acceptance covers.
Leave this section as "Not applicable" if no residual risk is accepted.

## Execution closure

Record the merged PR, commit hashes, evidence table (tests, security, CI,
independent review), and closure date once this packet is execution-complete.
Leave this section as "Not yet executed" until closure.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | YYYY-MM-DD | <author> | Initial template scaffold aligned with document versioning governance. |
