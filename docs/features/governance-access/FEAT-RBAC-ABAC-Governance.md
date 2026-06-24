---
doc_id: "FEAT-RBAC-ABAC-GOVERNANCE"
uid: "01KVXGFVBJRFXNSM9QZ4SDY3ED"
title: "FEAT: RBAC and ABAC Governance"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:f6ab6351b167129a"
updated: "2026-06-24"
owner: "ATHER"
type: feature
---
# FEAT: RBAC and ABAC Governance

**Status:** `DRAFT`
**Date:** 2026-06-12
**Primary PRD System:** `SYSTEM-07::Governance-Access-Control-System`
**Supporting PRD System:** `SYSTEM-10::Execution-Governance-System`
**Owner:** ATHER
**Auditor:** ATHER

## 1. Goal

Define the access-control model where human users are governed by RBAC and agents, subagents, MCP clients, and services are governed by ABAC.

## 2. Policy Model

- `RBAC` for user role, project membership, and permission set
- `ABAC` for subject, resource, action, environment, and project context
- auditable policy enforcement for allow, deny, and obligation handling

## 3. Minimum Responsibilities

- Evaluate user access by role and project boundary.
- Evaluate agent access by attributes and execution context.
- Preserve policy decision logs for audit trails.
- Make deny reasons visible enough for operator debugging.

## 4. Acceptance Criteria

- Human access decisions can be traced to role and project membership.
- Agent access decisions can be traced to subject/resource/action/context attributes.
- Policy denials are logged and reviewable.
- Governance rules can be referenced by roadmap, docs, bridge, and audit systems.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-24 | ATHER | Brought under document governance (docs:backfill): frontmatter + changelog. |
