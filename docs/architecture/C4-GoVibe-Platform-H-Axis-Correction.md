---
title: "C4 Correction: H-Axis Semantic Separation"
doc_id: "C4-GOVIBE-H-AXIS-CORRECTION"
status: "approved"
version: "1.0.0"
updated: "2026-08-01"
owner: "ARCHON"
source_of_truth: true
applies_to: "docs/architecture/C4-GoVibe-Platform.md"
related_adrs: ["ADR-020"]
---

# C4 Correction: H-Axis Semantic Separation

## 1. Binding scope

This document is a binding correction overlay for `docs/architecture/C4-GoVibe-Platform.md` until that C4 document is revised in full.

Where the base C4 uses `H`, `H-level`, `H0-H6`, `HLevelClassifier`, `GraphHopResolver`, or `classifyHLevel` to describe retrieval depth or context expansion, those statements are superseded by this correction and ADR-020.

## 2. Correct architecture separation

```text
Execution Governance
  -> ComplexityClassifier (C-0..C-3)
  -> AccessScopeResolver (H0..H4)
  -> FanOutEvaluator (W2..W4)
  -> RiskEvaluator

Knowledge / Retrieval Runtime
  -> RetrievalPolicyResolver
  -> RetrievalRadiusPlanner
  -> GraphScopeResolver
  -> ContextBudgetPlanner
  -> ContextCompactionEngine
```

Access authorization and knowledge retrieval are related through policy, but they are not the same axis.

## 3. Superseded C4 symbols

| Base C4 symbol or statement | Binding replacement |
|---|---|
| `HLevelClassifier` | `AccessScopeResolver` when selecting capability ceiling; `RetrievalRadiusPlanner` when selecting graph breadth |
| `GraphHopResolver` inside HCS/H-scale | `GraphScopeResolver` governed by an explicit retrieval policy |
| `classifyHLevel(task, sourceDoc)` | `resolveAccessScope(task, policy)` |
| `resolveGraphScope(targetNode, hLevel)` | `resolveGraphScope(targetNode, retrievalPolicy)` |
| `H0-H6` access/context range | `H0-H4` for Access Scope only |
| `H6 reserved for full-network traversal` | removed; full-network traversal, when permitted, is an explicit retrieval-policy decision |
| `context tier` used as H | classify as access scope, retrieval radius, or context budget according to actual behavior |

## 4. Corrected component model

### 4.1 Execution Governance

```text
ExecutionGovernance
+-- ComplexityBasedExecution
|   +-- TaskComplexityClassifier
|   +-- C0C3WorkflowSelector
|   +-- AccessScopeResolver
|   +-- RequiredArtifactResolver
|   +-- VerificationRequirementResolver
+-- FanOutGovernance
|   +-- WScaleEvaluator
|   +-- CouplingGuard
+-- RiskGovernance
|   +-- RiskClassifier
|   +-- ApprovalResolver
+-- DocFirstGate
|   +-- DocsToCodeGate
|   +-- DiagramToDocGate
|   +-- HumanApprovalGate
|   +-- CanonicalSourceChecker
```

### 4.2 Genesis Knowledge / Context Retrieval

```text
GenesisKnowledgeSystem
+-- RetrievalPolicy
|   +-- RetrievalPolicyResolver
|   +-- RetrievalRadiusPlanner
|   +-- GraphScopeResolver
+-- ContextPlanning
|   +-- ContextBudgetPlanner
|   +-- ContextCompactionEngine
|   +-- VirtualDocumentRenderer
+-- AccessIntegration
|   +-- SubjectAccessCheck
|   +-- ResourcePolicyCheck
|   +-- DisclosureLogger
```

The access check constrains whether retrieval may occur and which resources may be disclosed. It does not determine graph distance by encoding distance into H.

## 5. Corrected service signatures

```text
ContextRetrievalService
+-- getContext(request)
+-- validateSubjectAccess(subject, resource, action, accessScope)
+-- resolveAccessScope(task, policy)
+-- resolveRetrievalPolicy(target, task, risk, budget)
+-- resolveGraphScope(targetNode, retrievalPolicy)
+-- compactContext(nodes, contextBudget)
+-- renderVirtualDocument(compactedContext)
+-- recordTraceability(request, result)
```

Example request fields:

```yaml
subject: agent
access_scope: H2
retrieval_policy:
  max_hops: 2
  relation_allowlist: [depends_on, implements, verifies]
context_budget:
  max_tokens: 12000
risk: MEDIUM
```

## 6. Migration requirement

The base C4 must eventually be revised to incorporate these replacements directly. Until then, reviewers and implementation agents must read the base C4 together with this correction.

No runtime schema migration is authorized solely by this overlay.

## Changelog

| Version | Date | Status | Summary |
|---|---|---|---|
| 1.0.0 | 2026-08-01 | approved | Superseded active C4 uses that conflated H with retrieval depth or context expansion. |
