---
title: "CR: Knowledge-Context Product Alignment"
doc_id: "CR-2026-08-02-KNOWLEDGE-CONTEXT-PRODUCT-ALIGNMENT"
status: "under-review"
version: "0.2.0+draft"
updated: "2026-08-02"
owner: "Boss / THESEUS / ATHER"
source_of_truth: true
related_issue: "#52"
related_adrs: ["ADR-017", "ADR-018", "ADR-019", "ADR-023"]
related_docs:
  - "docs/BRD-GoVibe-Platform.md"
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/adr/ADR-023-Knowledge-Authority-Context-Authority-Boundary.md"
  - "docs/architecture/C4-Knowledge-Context-Authority-Overlay.md"
  - "docs/api/API-007-Knowledge-Context-Authority-Contract.md"
  - "AGENTS.md"
---

# CR: Knowledge-Context Product Alignment

## 1. Trigger

A live review reproduced the failure GoVibe is intended to prevent. Existing documents exposed WHAT the product contained while the relation chain explaining WHY capabilities existed, how authority flowed, and what scope applied was not explicit and enforced enough. The reviewer filled those gaps with model priors.

Observed failures included:

- classifying GoVibe as an enterprise-first governance suite;
- mapping CoVibe and CoDev to company size;
- treating generic Doc-to-Code skills as substitutes for the governed product core;
- treating GKS storage/retrieval as sufficient without MSP context authority;
- inventing non-existent product terms.

This CR treats those failures as evidence, not copy-editing feedback.

## 2. Canonical insight

AI-assisted software failure is often caused not only by missing documents, but by missing, unavailable, or unenforced relationships between artifacts.

```text
human intent / observation
  -> insight
  -> issue
  -> decision
  -> ADR
  -> BRD / PRD requirement
  -> feature / architecture contract
  -> task / context packet
  -> code
  -> test
  -> evidence
```

When an agent receives WHAT without governing WHY, authority, scope, and source lineage, it fills the missing reasoning from training priors. The output may be technically plausible while being wrong for the product.

GoVibe therefore exists to reduce the amount of product and engineering meaning that agents must guess.

## 3. Product target condition

GoVibe is not segmented primarily by company size.

The shared target condition is:

> AI-assisted execution capacity has outgrown the user's or team's ability to define, validate, relate, preserve, and safely reuse the software knowledge required to control that execution.

Typical adopters may include solo builders, SMEs, agencies, product teams, platform teams, and enterprise delivery groups. Organization size is an example attribute, not the root segmentation rule.

- `CoVibe` = single-authority operating mode.
- `CoDev` = multi-authority operating mode.

## 4. Knowledge and context authority

### 4.1 GKS

GKS is the canonical knowledge and relation authority. It owns canonical identities, atoms, containment, semantic relations, graph versions, provenance-bearing mappings, and traceability relations.

GKS answers:

> What knowledge exists, what is canonical, and how is it related?

### 4.2 MSP

MSP is the memory and context authority above GKS. It owns task/agent/workspace/session/turn identity, memory boundaries, source versions, retrieval policy, required/supporting/excluded knowledge, permission, budget, compaction, continuity, and replay lineage.

MSP answers:

> Which subset of canonical knowledge may and must this agent use for this task now?

### 4.3 Mandatory hierarchy

```text
Executor / Agent
  -> GoVibe validation and governed execution surface
  -> MSP memory/context authority
  -> GKS canonical knowledge/relation authority
  -> GenesisBlockDB graph/vector/storage execution
```

A complete relation graph is not a safe context packet. MSP must scope and compact it before execution.

## 5. Core product consequence

Replaceable external skills may perform extraction, generation, review, diagram conversion, or code production. Their outputs remain candidates until they conform to GoVibe contracts.

External providers must not:

- assign canonical GKS identities;
- bypass MSP context policy;
- promote knowledge directly;
- decide scope from a feature label alone;
- discard unresolved assumptions or source relations;
- treat generated documents as agent-usable merely because they exist.

## 6. Propagation completed

### Product authority

- [x] BRD rewritten to v0.2.0+draft.
- [x] PRD rewritten to v0.5.0+draft.
- [x] ADR-023 accepted for GKS/MSP authority boundary.

### Architecture and agent rules

- [x] ADR-017/018/019 updated to v0.2.0.
- [x] AGENTS.md updated to v1.9.0.
- [x] CoVibe module updated to v0.2.0.
- [x] CoDev module updated to v0.2.0.
- [x] CoVibe/CoDev terminology updated to v0.2.0.
- [x] C4 knowledge/context authority overlay added.
- [x] API-007 knowledge/context authority contract added.
- [x] Document Version Registry updated to v0.1.76+draft.

### Remaining gates

- [ ] final CI/docs validation passes on the final head;
- [ ] Boss approval is recorded before canonical promotion/merge;
- [ ] runtime enforcement/tests are implemented before claiming the contracts are fully enforced in code.

## 7. Agent rules introduced

1. Do not infer WHY from a feature, system, or document title.
2. Resolve issue, insight, decision, ADR, requirement, and source relations before implementation posture.
3. Report `missing_relation` or `unresolved_assumption`; do not silently fill gaps.
4. Do not perform unrestricted GKS graph traversal.
5. Use MSP-issued context scope, relation policy, source versions, and budget.
6. Treat external output as candidate until normalized, validated, authorized, and materialized.
7. Classify CoVibe/CoDev by authority boundaries, not company size.

## 8. Acceptance criteria

1. Readers encounter the originating failure pattern before the feature map.
2. Core features trace to issue/insight/decision/ADR relations.
3. GKS and MSP responsibilities cannot be confused.
4. Agents fail closed when WHY, authority, source relation, or context scope is unresolved.
5. CoVibe/CoDev are classified by authority boundaries.
6. External providers cannot create canonical knowledge or bypass MSP/GKS.
7. Registry and CI confirm document parity.

## 9. Approval gates

This is a C-3 product and architecture meaning change.

- G1: Boss approval of problem, target condition, and product authority.
- G2: architecture and document review.
- G3: contract tests and runtime evidence before claiming implementation enforcement.

No document may claim full runtime enforcement merely because this CR and its contracts exist.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0+draft | 2026-08-02 | Boss / THESEUS / ATHER | Recorded BRD/PRD/ADR/AGENTS/feature/C4/API/registry propagation; pending final CI, approval, and runtime enforcement evidence. |
| 0.1.0+draft | 2026-08-02 | Boss / THESEUS | Captured the reproduced relation-loss failure and authorized propagation. |
