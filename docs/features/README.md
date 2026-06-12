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
| `SYSTEM-03::Docs-to-Code-System` | `docs-to-code/` | Roadmap document parsing dependency pending |
| `SYSTEM-04::Diagram-to-Doc-System` | `diagram-to-doc/` | Pending |
| `SYSTEM-05::Agent-Team-Management-System` | `agent-team/` | Agent management, multi-agent collaboration, visual office |
| `SYSTEM-06::Integration-Bridge-System` | `integration-bridge/` | Pending |
| `SYSTEM-07::Governance-Access-Control-System` | `governance-access/` | Pending |
| `SYSTEM-08::Genesis-Knowledge-HCS-System` | `genesis-knowledge-hcs/` | GenesisBlockDB, AST, call graph, Markdown renderer, HNSW |
| `SYSTEM-09::Traceability-Audit-Verification-System` | `traceability-audit/` | AI benchmark, AI stress test |
| `SYSTEM-10::Execution-Governance-System` | `execution-governance/` | Pending |
| Platform runtime | `platform-runtime/` | Mobile Capacitor build |
| Quality and testing | `quality-testing/` | Testing infrastructure, Playwright E2E |

## Authoring Rule
New feature specs should be placed under the folder that matches their PRD system. If a feature spans multiple systems, place it under the primary owning system and add cross-links in the spec.

## Missing High-Priority Specs
- `docs-to-code/FEAT-Docs-to-Code-System.md`
- `diagram-to-doc/FEAT-Diagram-to-Doc-System.md`
- `integration-bridge/FEAT-MCP-Integration-Bridge.md`
- `governance-access/FEAT-RBAC-ABAC-Governance.md`
- `genesis-knowledge-hcs/FEAT-Hierarchy-Compaction-System.md`
- `genesis-knowledge-hcs/FEAT-Hybrid-JIT-Context-System.md`
- `traceability-audit/FEAT-Traceability-Audit-Verification.md`
- `execution-governance/FEAT-Execution-Governance-Standard.md`
