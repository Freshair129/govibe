---
name: doc-architect
description: GoVibe-conformant document structure decision engine. Use when setting up project documentation, choosing a doc structure, scaffolding a PRD/SRS/SDD/ADR set, or establishing documentation standards. Overrides rwang:doc-architect inside this repository. Delegates template selection to a Fable 5 decision gate; never ratifies documents.
---

# doc-architect (GoVibe override)

Repository-local override of `rwang:doc-architect`. **Inside this repository, use this
skill; do not use `rwang:doc-architect`.** The upstream skill conflicts with GoVibe's
document governance in nine places — see §9 for the full list and why each was changed.

Canonical authorities this skill obeys, in precedence order:

1. `docs/STD-Document-Versioning-Governance.md` — metadata, versioning, changelog, status
2. `.agents/doc_writer/THESEUS.md` — document types, canonical homes, template registry
3. `docs/STD-Directory-Governance.md` — directory ownership
4. `docs/STD-Execution-Governance.md` §12.1 + `docs/adr/ADR-021-H-Axis-Access-Scope-Semantic-Separation.md` — governance axes
5. `scripts/docs/validate-docs.mjs` — the executable gate

If this skill ever disagrees with one of the above, the authority wins and this skill is
wrong. Fix the skill, not the document.

## Process

```
SCAN → SCORE → RECOMMEND → FABLE-5 DECISION GATE → SCAFFOLD → REGISTER
```

---

## Phase 1 — Project Signal Scan

Unchanged from upstream. Gather by reading the project:

| Signal | How to detect | Weight |
|---|---|---|
| Team size | `CONTRIBUTING.md`, `.github/CODEOWNERS`, or ask | High |
| Codebase scale | file counts by language | Medium |
| Tech stack | `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml` | High |
| Compliance needs | HIPAA / SOC2 / GDPR / PCI references in existing docs | Critical |
| AI/ML presence | model files, training scripts, `torch`/`transformers` deps | High |
| Microservices | docker-compose services, k8s manifests, multiple manifests | Medium |
| Data pipelines | Airflow DAGs, dbt models, Spark jobs | Medium |
| Existing docs | scan `docs/` **and** `docs/DOC-VERSION-REGISTRY.md` | High |
| Git maturity | commit count | Low |
| CI/CD | `.github/workflows`, `.gitlab-ci.yml` | Low |

**GoVibe addition.** Also read `docs/DOC-VERSION-REGISTRY.md` before scoring. A document
already registered there exists whether or not its file looks complete, and must be merged
into rather than re-scaffolded.

---

## Phase 2 — Template Scoring

Templates and the 0–100 scoring rules are unchanged from upstream (`startup-mvp`,
`3layer-appendix`, `aiml-project`, `regulated`, `microservices`, `data-pipeline`, `custom`).

**`ieee-full` is removed from the selectable set.** Its layout inherently requires `STP`,
`SAD`, and `OCD` — three document types GoVibe does not have (§5.3) — so selecting it would
force a §4.2 escalation on every run. The -25 conformance penalty below reduces its score but
cannot zero it, which is not a safe way to exclude a structurally non-conformant template. A
project that genuinely needs a separate Test Plan uses `docs/test-plans/TEST-PLAN-*.md`, which
already exists as a GoVibe type.

Never skip scoring, even when a template is requested by name. Show why it does or does not
fit.

**GoVibe addition — conformance penalty.** Apply after the upstream rules:

```
if template.layout conflicts with a THESEUS canonical home (§5):
    score -= 25      # the layout will need rework to pass docs:validate
```

---

## Phase 3 — Recommendation

Present the top 2–3 templates with score, rationale, what you get, what you miss, and effort
estimate. Then map each to GoVibe canonical homes (§5) so the reviewer sees real target
paths, not abstract layer names.

---

## Phase 4 — Fable 5 Decision Gate

The upstream skill stops here and asks the human. In this repository the owner has delegated
**template selection** to a Fable 5 decision gate. Do not block on the human for this step.

Dispatch one subagent:

```
Agent(
  subagent_type: "general-purpose",
  model: "fable",
  description: "Doc structure decision gate",
  run_in_background: false,
  prompt: <the scored candidates, the project signals, the canonical-home mapping,
           the delegation boundary in §4.2, and the required return shape in §4.1>
)
```

### 4.1 Required return shape

The gate must return exactly this, and nothing is scaffolded until it does:

```json
{
  "selected_template": "3layer-appendix",
  "score": 87,
  "rejected": [{ "template": "aiml-project", "score": 71, "reason": "..." }],
  "modifications": ["add SEC-* requirement block"],
  "canonical_homes": [{ "doc_type": "SRS", "path": "docs/srs/SRS-<slug>.md" }],
  "residual_risk": "no separate Test Plan until the suite is gated in CI",
  "escalate_to_owner": false,
  "escalation_reason": null
}
```

### 4.2 Delegation boundary — what the gate may NOT decide

The gate decides structure. It has no authority over governance state. It **must** set
`escalate_to_owner: true` and scaffold nothing when the work would require any of:

| Not delegable | Authority | Source |
|---|---|---|
| Ratifying a document `draft` → `approved` / `accepted` / `stable` | Owner | STD-Document-Versioning §13; `MASTERPLAN-govibe-production-readiness.md` |
| A `C-3` / `H4` access-scope override | Owner | STD-Execution-Governance §12.1 |
| Introducing a new document type, canonical home, `status` value, or `edition` label | Governance review | THESEUS §Documentation Types; STD-Document-Versioning §6 |
| Marking any document `source_of_truth: true` | Owner | DOC-VERSION-REGISTRY §1 |
| Superseding or archiving an existing registered document | Owner | STD-Document-Versioning §9 |
| Changing the *governance state* of an existing registry row (`status`, `version`, `Group`) or editing `docs/STD-*.md` / an existing `docs/adr/ADR-*.md` | Owner | precedence order above |

Everything the gate produces lands as `status: draft`. A delegated gate can choose the
shape of a document. It cannot declare that document true.

**Appending is not editing.** §6.1 requires a registry row for every document created, and §4.3
requires an ADR recording the decision. Both are *appends of new `draft`/`proposed` records*
and are in scope for the session. What is owner-only is mutating the governance state of a row
or document that already exists. Without this distinction §4.2 and §6.1 contradict each other
and the workflow cannot run without violating its own boundary.

### 4.2.1 The gate's output must be validated, not trusted

§4.2 is only a control if something checks it. Two of the gate's *delegable* return fields can
smuggle a non-delegable move past it, because both are free-form:

- `canonical_homes` — an entry like `{"doc_type":"STP","path":"docs/STP/..."}` introduces a new
  document type *and* a new canonical home (§4.2 row 3, non-delegable) while
  `escalate_to_owner` stays `false`.
- `modifications` — a free-text entry can describe a status change, a `source_of_truth` flip,
  or a supersession, all non-delegable.

Before scaffolding anything, reject the gate's answer if:

1. any `canonical_homes` entry names a `doc_type` or `path` absent from the §5.3 table; or
2. any `modifications` entry names a new document type, canonical home, `status` value, or
   `edition`, or proposes changing `status`, `source_of_truth`, or superseding a document.

A rejected answer is escalated to the owner. Do not silently repair it — a gate that has to be
corrected on this axis has exceeded its remit, and that fact is the signal.

### 4.3 Auditability

Because this replaces a human gate, the decision must leave a record. Write one ADR at
`docs/adr/ADR-<next>-<slug>.md` from `.agents/doc_writer/template/ADR-template.md`, with
`status: "proposed"` (awaiting owner acceptance — ADRs use `proposed`, not `draft`),
recording: the signals scanned, every candidate and its score, the selection, the rejected
alternatives with reasons, and the residual risk. Reference the gate as
`decided_by: "fable-5-decision-gate"` in the ADR body, not as the `owner`.

---

## Phase 5 — Scaffold

### 5.1 Document Control Block — YAML frontmatter, never a table

This is the single most important correction to the upstream skill. `validate-docs.mjs`
parses only a leading `---` block; a markdown control table yields no frontmatter, and the
validator's `if (!frontmatter?.doc_id) continue;` then **silently skips the file**. The
document would not fail the gate — it would become invisible to it, which is worse.

Every generated document starts with:

```yaml
---
title: "<Doc Type>: <Name>"
doc_id: "<DOC-ID-UPPER-KEBAB>"
status: "draft"
version: "0.1.0+draft"
updated: "<YYYY-MM-DD>"
owner: "<owner>"
source_of_truth: false
access_scope: "H<0-4>"
complexity: "C-<0-3>"
related_docs:
  - "<path>"
---
```

Rules:

- `doc_id` must be unique repo-wide and must equal the registry row's `Doc ID`.
- `version` uses `MAJOR.MINOR.PATCH[-stage][+edition]`. New unratified docs use `+draft`;
  the suffix is dropped on owner sign-off. Never `1.0.1b`, never `1.5.0G`.
- `status` comes from the §13 enum only: `draft`, `proposed`, `candidate`, `approved`,
  `accepted`, `stable`, `deprecated`, `archived`, `superseded`. Lowercase. ADRs start at
  `proposed`; roadmap docs are restricted to `draft`/`candidate`/`approved`/`superseded`/`deprecated`.
- `source_of_truth: true` is owner-only (§4.2).
- `access_scope` is the executor tool-permission ceiling `H0..H4`. It is **not** complexity,
  hops, budget, or risk. `H5`/`H6` are abolished. Complexity is the separate `C` axis.

### 5.2 Changelog footer — `## Changelog`, never "Version History"

Every document ends with:

```md
## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | <YYYY-MM-DD> | <owner> | Initial structure scaffolded via doc-architect (Fable 5 gate). |
```

The latest row must match frontmatter `version`. Summaries describe the change in human
terms — not "update" or "fix".

### 5.3 Canonical homes — THESEUS owns the layout

Scaffold only into these paths. Do not invent `docs/SRS/`, `docs/STP/`, `docs/SAD/`, or
`docs/OCD/`: `docs/srs/` already exists in lowercase and collides on case-insensitive
filesystems, and the other three are not GoVibe document types.

| Doc type | Canonical path | Template |
|---|---|---|
| PRD | `docs/PRD-*.md` | `PRD-template.md` |
| SRS | `docs/srs/SRS-*.md` | `SRS-template.md` |
| SDD | `docs/SDD-*.md` or `docs/**/SDD-*.md` | `SDD-template.md` |
| C4 | `docs/architecture/C4-*.md` | `C4-template.md` |
| LLD | `docs/lld/LLD-*.md` | `LLD-template.md` |
| Feature | `docs/features/<system-folder>/FEAT-*.md` | `FEAT-template.md` |
| API / MCP contract | `docs/api/API-*.md` | `API-CONTRACT-template.md` |
| Test Plan | `docs/test-plans/TEST-PLAN-*.md` † | `TEST-PLAN-template.md` |
| ADR | `docs/adr/ADR-*.md` | `ADR-template.md` |
| Runbook | `docs/operations/runbooks/RUNBOOK-*.md` ‡ | `RUNBOOK-template.md` |
| RCA | `docs/change-control/rca/RCA-*.md` ‡ | `RCA-template.md` |
| Migration plan | `docs/migration/MIG-*.md` ‡ | `MIGRATION-PLAN-template.md` |
| UI/UX | `docs/design/UI-UX-*.md` | `UI-UX-DESIGN-template.md` |
| Project structure | `docs/PROJECT-STRUCTURE-*.md` | `PROJECT-STRUCTURE-template.md` |
| CR / WP | `docs/change-control/change-requests/` | `CR-template.md` / `WP-template.md` |

Feature specs go in the folder matching their primary PRD system (THESEUS §Feature Folder
Rule, `SYSTEM-01..10`).

† Declared but not yet materialised — no `TEST-PLAN-*` document exists anywhere in the tree.
First use creates the directory.

‡ **These three paths differ from the THESEUS table.** Verified against the working tree on
2026-08-12; the table in `.agents/doc_writer/THESEUS.md` is stale on each. Scaffold to the
observed home, not the stale declaration:

| Doc type | THESEUS declares | Observed reality | Resolution |
|---|---|---|---|
| Runbook | `docs/runbooks/` | `docs/operations/runbooks/` — 6 files | Observed wins; THESEUS's own Source-of-Truth-Order §8 also cites `docs/operations/runbooks/`, so its own table contradicts it |
| RCA | `docs/rca/` — 2 files | `docs/change-control/rca/` — 1 file | `STD-Document-Versioning-Governance.md` §9.1 names `docs/change-control/rca/` canonical and outranks THESEUS; `docs/rca/` is legacy pending migration |
| Migration plan | `docs/migrations/` | `docs/migration/` (singular) — 2 files | Observed wins |

Do not silently create the stale variant — that would fork each home in two. Creating a
document whose type sits on one of these three rows is a §4.2 escalation candidate if the
owner has not yet reconciled `THESEUS.md`; note the discrepancy in the run report either way.

### 5.4 Filenames carry no version

Write `docs/srs/SRS-image-pipeline.md`, not `SRS-v1.0.md`. Version lives in frontmatter and
in the registry. A version-bearing filename breaks every inbound path reference on each bump
and defeats the registry's canonical-path drift check (STD §10 Phase 3).

### 5.5 Templates come from the registry only

Copy from `.agents/doc_writer/template/`. One known staleness: `ADR-template.md` carries
`status: "draft"`, but STD-Document-Versioning §13 assigns ADRs the `proposed` lifecycle —
override the copied value to `proposed` and note it, rather than propagating the template's
value. Never inline a template body into a generated doc, and never create a new `TEMPLATE.md` elsewhere in the tree — `validate-docs.mjs`
`checkTemplateRegistry()` requires the seventeen canonical templates to live only there, and
THESEUS rule 9 makes that folder exclusive. A genuinely new document type is a §4.2
escalation, not a new file.

### 5.6 Requirement ID scheme

| Prefix | Category | Owning doc |
|---|---|---|
| `FR-xxx` | Functional requirement | SRS |
| `NFR-xxx` | Non-functional requirement | SRS |
| `SEC-xxx` | Security requirement | SRS |
| `DR-xxx` | Data requirement | SRS / SDD |
| `IR-xxx` | Infrastructure requirement | SDD |
| `BR-xxx` | Business rule | PRD |
| `AC-xxx` | Acceptance criterion | SRS / FEAT |
| `ADR-xxx` | Architecture decision | `docs/adr/` |
| `AI-AGT-xxx` | AI agent specification | SDD / feature spec |
| `AI-ETH-xxx` | AI ethics and governance | feature spec |

**`SDD-xxx` is removed.** Upstream used it for "Software Design Decisions", but in GoVibe
`SDD` names the *document type* (`docs/SDD-System-Design.md`). Decisions are `ADR-xxx`. One
token cannot mean both a document class and a requirement class — that is the same
collision `ADR-021` exists to prevent on the `H` axis.

Also per THESEUS writing rule 2: do not introduce new `TDD-*` documents meaning "Technical
Design Document". Use `SDD` for design and `LLD` for low-level design.

### 5.7 Merge, never overwrite

If `docs/` already holds content, or the registry already lists the `doc_id`, merge into the
existing document and append a changelog row. Report every file you would have overwritten
instead of overwriting it.

---

## Phase 6 — Register

### 6.1 DOC-VERSION-REGISTRY is the canonical index

Add one row per created document to the correct section of `docs/DOC-VERSION-REGISTRY.md`:

```md
| <Group> | `<DOC-ID>` | `0.1.0+draft` | draft | <owner> | `<path>` |
```

`Doc ID`, `Version`, `Status`, and `Path` must match the file's frontmatter exactly — the
registry drift check compares them.

### 6.2 `.doc-graph.json` is derived, not authoritative

Upstream calls `docs/.doc-graph.json` "the backbone". In GoVibe it is a **derived index**:
the registry is the audit sitemap (STD §9). Generate the graph after registering, and if the
two ever disagree, the registry is right. Never let a document exist in the graph but not in
the registry.

### 6.3 Verify before reporting

Run and report actual output — not an assertion that it should pass:

```bash
npm run docs:validate
```

A scaffold is complete only when `docs:validate` reports PASS **and** adds no new warnings
attributable to the generated files. Then suggest `rwang:doc-preflight`.

---

## 9. Divergence from `rwang:doc-architect`

Recorded so the override is auditable rather than mysterious.

| # | Upstream | GoVibe override | Why |
|---|---|---|---|
| 1 | Control block as markdown table | YAML frontmatter | Table yields no frontmatter; validator silently skips the file |
| 2 | `## Version History` | `## Changelog` | STD §8; `hasSection()` looks for "Changelog" |
| 3 | `SDD-xxx` = design decision | `ADR-xxx` = decision | `SDD` is a document type here |
| 4 | `Status \| Draft` | lowercase `status:` enum | STD §13 |
| 5 | `PRD-SDD-v1.0.md` | version in frontmatter only | Registry path-drift check |
| 6 | `docs/SRS/`, `docs/STP/`, `docs/SAD/`, `docs/OCD/` | THESEUS canonical homes | `docs/srs/` exists; other three are not GoVibe types |
| 7 | Inline / ad-hoc templates | `.agents/doc_writer/template/` only | `checkTemplateRegistry()`; THESEUS rule 9 |
| 8 | `.doc-graph.json` is the backbone | registry is canonical, graph derived | STD §9 |
| 9 | No governance axes | `access_scope` + `complexity` | STD-Execution-Governance §12.1; ADR-021 |
| — | Phase 4 asks the human | Fable 5 decision gate, bounded by §4.2 and validated by §4.2.1 | Owner delegation, 2026-08-12 |
| — | `ieee-full` selectable | removed from the selectable set | Its layout requires STP/SAD/OCD, which are not GoVibe types |

### 9.1 Verification of claim #1

The "silently skipped" behaviour in §5.1 was confirmed by experiment, not by reading source.
A probe document using the upstream table-style control block was placed under `docs/` and
`npm run docs:validate` was run: it reported `PASS: documentation baseline is valid.` and
mentioned the probe file **zero** times — no error, no warning. The document was invisible
to governance rather than rejected by it. Probe removed after the run.

## Important Rules

- Never skip scoring, even when a template is named.
- Never write a document without YAML frontmatter and a `## Changelog`.
- Never ratify. Everything lands `draft` (ADRs `proposed`) for the owner.
- Never create a document without a registry row.
- Bilingual: answer in the language the user writes in; keep technical terms in English.
- Merge into existing docs rather than overwriting them.
