---
title: "WP-06: Context Authority Runtime Repair"
doc_id: "WP-06-CONTEXT-AUTHORITY-RUNTIME-REPAIR"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-03"
owner: "Boss (Product Authority)"
execution_authorized: false
complexity: "C-3"
access_scope: "H3"
risk: "HIGH"
source_of_truth: false
parent_change_request: "FUTURE-CR-CONTEXT-AUTHORITY-RUNTIME-REPAIR"
---

# WP-06: Context Authority Runtime Repair

## Objective

After explicit owner approval, repair the audited 11-test matrix without
synthesizing authority, weakening fail-closed controls, or widening MSP/GKS
access. This draft work packet grants no implementation authority.

## Preconditions

- Owner approves the parent CR and selects API-008 binding identity and legacy
  `resolveContext` dispositions.
- Implementer reproduces 180 pass / 11 fail / 1 skip before mutation.
- ADR-023/API-007 remain governing; ADR-024/API-008 change only under approved
  contract alignment.

## Bounded execution scope

1. Align five executor-adapter fixtures only; do not change production for them.
2. Forward/validate caller authority through `continue.mjs` and WorkspaceService
   before context resolution.
3. Align three capability, one migration, and remaining MSP live fixtures.
4. Implement only the selected legacy and identity-contract dispositions.
5. Add focused regression tests and keep strict security tests unchanged.

## Exit gate

- 192 current test cases: 0 fail; record skip count (target 191 pass/0 fail/1 skip).
- Security suite 35/35 pass without weakened fail-closed assertions.
- Focused tests, lint, build, MCP smoke, `npm run docs:validate`, and
  `npm run diff:check` pass.
- Bounded impact record, independent QA acceptance, evidence hashes, final diff,
  and commit hash are retained.
- No raw secret, unrestricted traversal, direct GKS, or direct GenesisBlockDB.

## Rollback

Capture pre-change hashes and inverse patches; revert in reverse dependency
order, rerun the baseline matrix, and never restore an authority bypass.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-03 | THESEUS / ATHER | Opened owner-gated proposal WP-06; implementation remains unauthorized. |
