---
doc_id: "AMENDMENT-2026-08-01-H-AXIS-DEFINITION"
title: "Amendment: H-Axis Definition and Parent CR Correction"
status: "candidate"
version: "0.1.0"
updated: "2026-08-01"
owner: "Boss (CEO)"
source_of_truth: false
type: "change-request-amendment"
complexity: "C-3"
access_scope: "H4"
canonical_authority:
  repository: "Freshair129/RWANG-PROMAX"
  path: "skills/rwang/references/EXECUTION-GOVERNANCE.md"
  version: "2.3.0+ga"
related_docs:
  - "docs/STD-Execution-Governance.md"
  - "docs/change-requests/CR-2026-08-01-GoVibe-Architecture-Alignment-and-Operating-Mode-Implementation.md"
  - "docs/audits/AUDIT-2026-08-01-GoVibe-Canonical-Architecture-Alignment-WP01.md"
---

# Amendment: H-Axis Definition and Parent CR Correction

## 1. Canonical decision

For GoVibe and RWANG execution governance, `H` has exactly one binding meaning:

> **H = Access Scope: the enforceable tool and permission ceiling granted to an executor for one bounded task.**

The valid tiers are:

```text
H0, H1, H2, H3, H4
```

`H5` and `H6` are not valid execution-governance tiers.

This decision follows the canonical RWANG PROMAX source:

```text
Freshair129/RWANG-PROMAX
skills/rwang/references/EXECUTION-GOVERNANCE.md
STD-EXECUTION-GOVERNANCE v2.3.0+ga
```

The GoVibe copy at `docs/STD-Execution-Governance.md` is a mirror/pointer and must follow the RWANG canonical source.

---

## 2. Tier semantics

| Tier | Enforceable capability ceiling | Typical bounded scope | Extra rule |
|---|---|---|---|
| `H0` | Read one explicitly bounded file or artifact | Subtask / PR fragment | No repository search or mutation |
| `H1` | `H0` plus repository search such as glob/grep | Task / component | Search only; no multi-file mutation |
| `H2` | `H1` plus write and multi-file edits | Story / feature | Mutation must remain inside approved scope |
| `H3` | `H2` plus shell execution | Epic / module | Commands and side effects require auditability |
| `H4` | `H3` plus network/full approved capability set | Architecture / cross-system / platform | Approval required before implementation |

Default complexity mapping:

```yaml
complexity_access_mapping:
  C-0: H0
  C-1: H1
  C-2: H2
  C-3: H3
```

`C-3` may be raised to `H4` by explicit declaration and owner approval. Platform-level work is therefore `C-3/H4`, not `C-3/H5` or `C-3/H6`.

---

## 3. What H does not mean

`H` must not represent:

- retrieval graph distance
- number of graph hops
- retrieval relevance
- context-window size
- token budget or monetary budget
- document hierarchy depth
- task complexity
- security or business risk
- fan-out, graph degree, or number of agents
- operating mode (`CoVibe` / `CoDev`)

These concerns are separate axes.

---

## 4. Required separate axes

Use the following terms instead of overloading `H`:

| Concern | Canonical/required label |
|---|---|
| Workflow/process complexity | `C-0..C-3` |
| Executor capability ceiling | `H0..H4` |
| Fan-out/coupling width | `W2..W4` |
| Retrieval distance | `hop_limit`, `retrieval_radius`, or an approved retrieval-axis name |
| Context/token allowance | `context_budget` / `token_budget` |
| Security or delivery risk | `risk` |
| Collaboration model | `CoVibe` / `CoDev` |

A future retrieval-axis standard may introduce a different symbol, but it must not reuse `H`.

---

## 5. Parent CR corrections

The following statements in the parent CR are superseded:

| Existing wording | Correct wording |
|---|---|
| `context_tier: H5` | `access_scope: H4` |
| `H0-H6 context expansion semantics` | `retrieval expansion semantics using a separately named retrieval axis; H remains H0-H4 Access Scope` |
| `Context: H0..H6` | `Access Scope: H0..H4` plus separate `Context Budget` and `Retrieval Radius` fields |
| `parent C-3/H5 change packet` | `parent C-3/H4 change packet` |
| `mode, complexity, context tier, fan-out, and risk` | `mode, complexity, access scope, retrieval/context limits, fan-out, and risk` |

These corrections must be propagated into the parent CR during the approved document-correction packet. Until then, this amendment is the controlling interpretation for PR #16 and Gate G1.

---

## 6. C4 and architecture correction requirement

Any C4, SDD, feature spec, atom, schema, or code that uses `H0-H6` as graph-hop distance is non-conformant with the canonical RWANG governance standard.

Required correction pattern:

```text
old:
H = context depth / graph hops / access

new:
H = access capability ceiling only
retrieval radius = separate measured field
context budget = separate bounded field
```

No blind find-and-replace is authorized. Each occurrence must be classified as:

- execution access scope
- retrieval radius
- context budget
- legacy terminology

and migrated to the correct axis.

---

## 7. Gate G1 decision

For Gate G1, approve the following:

```text
H-axis authority: RWANG PROMAX EXECUTION-GOVERNANCE.md
H meaning: Access Scope / capability ceiling
valid range: H0-H4
parent CR classification: C-3/H4
H5/H6: retired and prohibited for execution governance
retrieval hops: separate axis, name to be finalized by architecture ADR or framework standard
```

---

## Changelog

| Version | Date | Status | Summary |
|---|---|---|---|
| 0.1.0 | 2026-08-01 | candidate | Aligned H-axis definition and parent CR correction with canonical RWANG PROMAX Execution Governance v2.3.0+ga. |
