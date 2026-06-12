# GoVibe Feature Specs Index

**Status:** `DRAFT`
**Updated:** 2026-06-12
**Source PRD:** `docs/PRD-GoVibe-Platform-Overview.md`

This folder is organized by PRD product systems. Feature specs remain human-first SWE documents; derived atoms and graph nodes are generated from these docs after review.

## System Folder Map
| PRD System | Folder | Current Feature Specs |
|---|---|---|
| `SYSTEM-01::Mission-Control-Experience-System` | `mission-control/` | Mission Control migration, UI migration, command palette |
| `SYSTEM-02::Project-Roadmap-Management-System` | `project-roadmap/` | Roadmap board migration, document-driven roadmap source |
| `SYSTEM-03::Docs-to-Code-System` | `docs-to-code/` | System spec, roadmap document parsing dependency |
| `SYSTEM-04::Diagram-to-Doc-System` | `diagram-to-doc/` | System spec |
| `SYSTEM-05::Agent-Team-Management-System` | `agent-team/` | Agent management, multi-agent collaboration, visual office |
| `SYSTEM-06::Integration-Bridge-System` | `integration-bridge/` | MCP integration bridge |
| `SYSTEM-07::Governance-Access-Control-System` | `governance-access/` | RBAC / ABAC governance |
| `SYSTEM-08::Genesis-Knowledge-System` | `genesis-knowledge-system/` | GenesisBlockDB, AST, call graph, Markdown renderer, HNSW, compaction, hybrid JIT context |
| `SYSTEM-09::Traceability-Audit-Verification-System` | `traceability-audit/` | AI benchmark, AI stress test, traceability audit verification |
| `SYSTEM-10::Execution-Governance-System` | `execution-governance/` | Execution governance system spec |
| Platform runtime | `platform-runtime/` | Mobile Capacitor build |
| Quality and testing | `quality-testing/` | Testing infrastructure, Playwright E2E |

## Authoring Rule
New feature specs should be placed under the folder that matches their PRD system. If a feature spans multiple systems, place it under the primary owning system and add cross-links in the spec.

## Missing High-Priority Specs
- None at system-entry level.

## Coverage Notes
- `docs-to-code/`, `diagram-to-doc/`, `integration-bridge/`, `governance-access/`, and `execution-governance/` now require detailed follow-up specs per module, but no longer lack a system-level feature entry.
- `genesis-knowledge-system/` is the canonical folder name; references to `genesis-knowledge-hcs/` should be treated as legacy naming and normalized when touched.
