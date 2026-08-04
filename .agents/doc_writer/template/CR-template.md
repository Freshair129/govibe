---
title: "CR: <Decision Title>"
doc_id: "CR-<YYYY-MM-DD>-<SLUG>"
status: "draft"
version: "0.1.0+draft"
updated: "YYYY-MM-DD"
owner: "<owner>"
source_of_truth: true
proposal_author: "<proposal author>"
decision_owner: "<decision owner>"
approval_owner: "<approval owner>"
approval_recorded_at: ""
decision_authorized: false
execution_authorized: false
execution_complete: false
promotion_authorized: false
complexity: "C-<0-3>"
access_scope: "H<0-4>"
risk: "<LOW|MEDIUM|HIGH>"
baseline_commit: "<commit-sha>"
parent_change_request: "<CR-ID or none>"
related_adrs: []
related_apis: []
proposed_work_packets: []
---

# CR: <Decision Title>

## Context

What problem, constraint, or prior decision led to this change request? Include
the governing chain (issue/CR/ADR/API lineage) and the evidence baseline this
proposal is built on.

## Decision Requested

State exactly what the decision owner is being asked to approve, reject, or
defer. If the request has multiple options, enumerate them and give a
recommended selection.

## Scope & Bounded Changes

Enumerate exactly what this change request authorizes, in bounded, checkable
terms. Reference the concrete files, contracts, or work packets in scope.

## Explicit Exclusions

List what this change request does **not** authorize, so scope cannot silently
expand during execution. Call out adjacent promotions, runtime changes, or
authority boundaries that remain untouched.

## Acceptance Criteria

- AC-01: <criterion>
- AC-02: <criterion>

## Rollback

Describe how to revert this change if it is rejected or must be undone after
execution: what commit/diff to revert, what evidence to capture first, and
what must never be silently reintroduced.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | YYYY-MM-DD | <author> | Initial template scaffold aligned with document versioning governance. |
