---
title: "Audit: Cognitive System Inbound Knowledge Triage"
doc_id: "AUDIT-COGNITIVE-SYSTEM-INBOUND-TRIAGE-2026-06-16"
uid: "01KVXGFT5B1XRW5J5FXC6C5YFK"
status: "approved"
version: "0.1.1"
content_hash: "atom:e2c1c377f2fc2963"
updated: "2026-06-16"
owner: "ATHER / LYRA"
source_of_truth: true
related_docs:
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/features/traceability-audit/FEAT-MSP-Validate-Evidence-Adapter.md"
  - "docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md"
  - "docs/runbooks/RUNBOOK-MSP-Validate-Evidence-Adapter.md"
  - "docs/architecture/MSP-GKS-Taxonomy-Mapping.md"
---

# Audit: Cognitive System Inbound Knowledge Triage

## 1. Purpose

This audit prevents wholesale import of `cognitive_system` knowledge into GoVibe.

GoVibe may derive selected patterns from inbound MSP/GKS sources, but the inbound files are not canonical GoVibe documents until they pass GoVibe review, mapping, and validation gates.

## 2. Evidence Snapshot

Checked on 2026-06-16 from `G:\govibe`.

Current untracked inbound areas:

- `.brain/inbound/`
- `.brain/cognitive-system-knowledge-block/`

Reality-check findings:

- `.brain/inbound/` contains a small curated packet set with MSP/GKS architecture, symbol graph, authority, routing, context, and scoring materials.
- `.brain/cognitive-system-knowledge-block/` contains a large exported knowledge vault, including Obsidian configuration, plugin artifacts, usage logs, episodes, ADRs, blueprints, concepts, specs, and audits.
- Some inbound files declare `has_secret: true`, `leak_risk: high`, or `status: superseded`.
- Several source files include mojibake text in Thai fields, so text encoding must be checked before any canonical import.

## 3. Non-Negotiable Import Rules

- Do not commit `.brain/cognitive-system-knowledge-block/` wholesale.
- `.gitignore` blocks `.brain/cognitive-system-knowledge-block/` to reduce accidental wholesale import.
- Do not treat MSP/GKS `status: stable` as GoVibe approval.
- Do not treat `msp:validate` pass as GoVibe pass.
- Do not promote files with `has_secret: true`, `leak_risk: high`, or `status: superseded` without explicit ATHER review.
- Do not rewrite inbound source files during triage.
- Do not create GoVibe PRD, FEAT, SDD, or code changes from inbound material without a mapped GoVibe owner and approval gate.

## 4. Decision States

| State | Meaning | Next Gate |
|---|---|---|
| `derive_candidate` | Source has a pattern that may become a GoVibe doc section or feature. | LYRA scope check, THESEUS draft, ATHER audit |
| `reference_only` | Source is useful for context but should not be imported as canonical. | Cite as provenance only |
| `blocked_security_review` | Source declares possible secret or high leak risk. | ATHER security/governance review |
| `superseded_do_not_import` | Source is explicitly superseded. | Use replacement source only |
| `needs_encoding_review` | Source has mojibake or unreadable text. | Encoding cleanup before review |
| `out_of_scope_for_mvp` | Source is valid but not needed for MVP developer trial. | Park for post-MVP |

## 5. Inbound Packet Triage

| Source | Source Status | Decision | GoVibe Target | Reason |
|---|---|---|---|---|
| `.brain/inbound/BLUEPRINT--SYMBOL-GRAPH-CORE.md` | stable | `derive_candidate` | SYSTEM-03, SYSTEM-09 | Symbol graph, parser, store, Leiden adapter align with traceability and diff-check goals. |
| `.brain/inbound/CONCEPT--ABAC-POLICY-ENGINE.md` | stable | `derive_candidate` | SYSTEM-07 | PDP/PEP and policy-as-data can refine governance access without replacing GoVibe authority. |
| `.brain/inbound/CONCEPT--HOP-BASED-RESOLUTION.md` | stable | `derive_candidate` | SYSTEM-06, SYSTEM-09 | Hop-based retrieval can inform evidence lookup and context resolution. Requires encoding review. |
| `.brain/inbound/CONCEPT--RESOLUTION-GRADIENT.md` | stable | `derive_candidate` | SYSTEM-06 | Graded retrieval fits quota-aware context loading and token reduction. |
| `.brain/inbound/CONCEPT--SPECIFICATION-TO-SYSTEM.md` | stable | `reference_only` | SYSTEM-04, SYSTEM-09 | Useful philosophy, but broad enough to cause scope creep if promoted directly. |
| `.brain/inbound/FEAT--SYMBOLS-MULTI-LANG.md` | stable | `derive_candidate` | SYSTEM-03, SYSTEM-09 | Multi-language symbol support is relevant after MVP traceability baseline. |
| `.brain/inbound/FLOW--SYSTEM-DATA-FLOW.md` | active | `reference_only` | SYSTEM-09 | DFD helps compare MSP/GKS flow against GoVibe adapter boundaries. |
| `.brain/inbound/FRAMEWORK--AGENT-DISPATCH.md` | stable | `derive_candidate` | SYSTEM-05 | Agent tier routing can refine dynamic executor routing and quota-aware decomposition. |
| `.brain/inbound/FRAMEWORK--AUTHORITY-MATRIX.md` | stable, `has_secret: true` | `blocked_security_review` | SYSTEM-07 | Authority mapping is relevant, but source metadata flags high leak risk. |
| `.brain/inbound/FRAMEWORK--MOSCOW-METHOD.md` | stable | `reference_only` | SYSTEM-02 | GoVibe already has planning standards; use only if LYRA requests prioritization refinement. |
| `.brain/inbound/FRAMEWORK--MSP-ARCHITECTURE.md` | superseded | `superseded_do_not_import` | none | Explicitly superseded by MSP architecture v2. |
| `.brain/inbound/FRAMEWORK--MSP-ARCHITECTURE-V2.md` | stable/active | `derive_candidate` | SYSTEM-06, SYSTEM-09 | Best candidate for MSP boundary, adapter trust model, and external service framing. |
| `.brain/inbound/FRAMEWORK--RICE-SCORING.md` | stable | `reference_only` | SYSTEM-02 | Optional prioritization method; not needed for MVP gate. |
| `.brain/inbound/FRAMEWORK--SCOPE-CREEP-PREVENTION.md` | stable | `derive_candidate` | SYSTEM-05, SYSTEM-08 | Supports LYRA scope-control and change-request enforcement. |
| `.brain/inbound/FRAMEWORK--SYMBOL-GRAPH.md` | stable | `derive_candidate` | SYSTEM-03, SYSTEM-09 | Directly relevant to doc-code diff, backlinks, symbol links, and community detection. |
| `.brain/inbound/FRAMEWORK--UNIVERSAL-CONTEXT-FRAMEWORK.md` | stable | `derive_candidate` | SYSTEM-06, SYSTEM-07 | Identity-aware, policy-controlled context can refine GoVibe gateway and context container design. |
| `.brain/inbound/FRAMEWORK--WORKFLOW-DYNAMICS.md` | stable | `reference_only` | SYSTEM-02, SYSTEM-05 | Useful comparison model, but too broad for direct MVP adoption. Requires encoding review. |
| `.brain/inbound/GEMINI.md` | project guidance | `reference_only` | external executor runbooks | Use only to understand source project conventions. Real repo checks still override this file. |
| `.brain/inbound/STACK--MSP-NODE-RUNTIME.md` | stable | `reference_only` | SYSTEM-06 | Runtime inventory may inform adapter setup, not GoVibe architecture ownership. |
| `.brain/inbound/UNIVERSAL-CONTEXT-FRAMEWORK_spec.md` | draft 0.1.1 | `derive_candidate` | SYSTEM-06, SYSTEM-07 | Large source spec for context gateway, ABAC, vault/tenant, and subagent scoping. Must be summarized, not copied. |

## 6. Promotion Order

Priority 1 for MVP developer trial:

1. `FRAMEWORK--MSP-ARCHITECTURE-V2.md`
2. `FRAMEWORK--SYMBOL-GRAPH.md`
3. `BLUEPRINT--SYMBOL-GRAPH-CORE.md`
4. `FRAMEWORK--SCOPE-CREEP-PREVENTION.md`
5. `CONCEPT--ABAC-POLICY-ENGINE.md`
6. `FRAMEWORK--UNIVERSAL-CONTEXT-FRAMEWORK.md`

Priority 2 after MVP baseline:

1. `CONCEPT--RESOLUTION-GRADIENT.md`
2. `CONCEPT--HOP-BASED-RESOLUTION.md`
3. `FEAT--SYMBOLS-MULTI-LANG.md`
4. `FRAMEWORK--AGENT-DISPATCH.md`
5. `UNIVERSAL-CONTEXT-FRAMEWORK_spec.md`

Do not promote in MVP:

- `.brain/cognitive-system-knowledge-block/` as a whole
- Obsidian plugin/config artifacts
- usage logs and episodes
- superseded MSP architecture v1
- files with high leak risk before ATHER review

## 7. Required Evidence Before Derivation

Each promoted derivation must include:

```yaml
source_path:
source_doc_id:
source_status:
source_risk_flags:
govibe_target_system:
govibe_target_doc:
derived_summary:
unmapped_concepts:
security_review:
approval_owner:
validator_used:
govibe_decision:
```

## 8. Acceptance Criteria

- Inbound cognitive-system knowledge has a visible GoVibe triage record.
- GoVibe has a clear rule against importing the knowledge block wholesale.
- Every inbound file in `.brain/inbound/` has an initial decision state.
- High-risk, superseded, and encoding-risk sources are flagged before promotion.
- MVP-relevant derive candidates are prioritized.

## 9. Success Criteria

- LYRA can plan the next import slice without reading the whole knowledge block.
- ATHER can reject direct promotion of risky or superseded sources.
- THESEUS can derive small GoVibe context/docs from selected sources with provenance.
- KIN can map MSP/GKS taxonomy without giving MSP authority over GoVibe validation.

## 10. Definition Of Done

- This audit is registered in `docs/DOC-VERSION-REGISTRY.md`.
- `.brain/cognitive-system-knowledge-block/` is ignored by Git so raw exports cannot be committed by a broad add.
- `npm run docs:validate` passes.
- No inbound source files are modified by this audit.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1 | 2026-06-21 | ATHER / LYRA | Signed off; promoted draft -> approved (MSP/GKS gate decision recorded in ADR-014). |
| 0.1.1+draft | 2026-06-16 | ATHER / LYRA | Added Git ignore enforcement for the raw cognitive-system knowledge-block export. |
| 0.1.0+draft | 2026-06-16 | ATHER / LYRA | Added initial triage for cognitive-system inbound knowledge and blocked wholesale import. |
