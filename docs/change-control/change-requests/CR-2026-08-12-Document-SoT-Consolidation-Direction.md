---
title: "CR: Document Source-of-Truth Consolidation Direction"
doc_id: "CR-2026-08-12-DOCUMENT-SOT-CONSOLIDATION-DIRECTION"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-12"
owner: "Boss (CEO)"
source_of_truth: true
proposal_author: "Boss (CEO), counter-proposal by Claude (Mode 2 session)"
decision_owner: "Boss (CEO)"
approval_owner: "Boss (CEO)"
approval_recorded_at: ""
decision_authorized: false
execution_authorized: false
execution_complete: false
promotion_authorized: false
complexity: "C-3"
access_scope: "H2"
risk: "HIGH"
baseline_commit: "53e9269"
parent_change_request: "none"
related_adrs: []
related_apis: []
proposed_work_packets: []
---

# CR: Document Source-of-Truth Consolidation Direction

## Context

This change request exists because the decision it records was reached in conversation and had
no artifact. That is itself the finding: it is the most far-reaching decision of the
2026-08-12 session — what the document source of truth *is* — and it was the only one with no
audit trail, while two narrower decisions got an ADR and an amendment. Adversarial review
flagged the omission against the `AGENTS.md` Docs First rule. Nothing here is authorized; this
records the proposal, the counter-proposal, and the unresolved conflicts.

### Measured state of the current registry

Verified at commit `53e9269` and independently re-derived during review:

| Measurement | Value |
|---|---|
| `docs/**/*.md` total | 257 |
| No YAML frontmatter at all | 61 |
| Has `doc_id` | 194 |
| `doc_id` absent from `DOC-VERSION-REGISTRY.md` | 54 |
| Registry rows that parse | 146 |
| Rows matching their file's `version` + `status` exactly | 145 |
| Non-derivable registry columns | 1 (`Group`) |

Two consequences follow. First, `scripts/docs/validate-docs.mjs:244` reads
`if (!frontmatter?.doc_id) continue;` — so the 61 frontmatter-less files are **skipped
silently**, neither erroring nor warning. They are invisible to the gate rather than rejected
by it. Second, `ADR-021-H-Axis-Access-Scope-Semantic-Separation.md` — the binding H-axis
authority cited by `CLAUDE.md`, the readiness masterplan, and every Mode 2 document — **is not
in the registry**. The registry lists `ADR-013`…`020`, skips `021`, then `022`…`028`.

Drift on rows that exist is therefore near zero; the defect is entirely missing coverage.

## Decision Requested

Choose a direction for the document source of truth. Nothing is implemented under this CR.

### Option A — Unified store (owner's original proposal)

Retire `docs/DOC-VERSION-REGISTRY.md` and `scripts/docs/validate-env.mjs`; replace them with
one store holding slot + graph + semantic + version together, covering docs and code and, if
possible, atomic knowledge.

### Option B — Authored in place, everything else derived (counter-proposal, recommended)

| Layer | Home | Nature |
|---|---|---|
| Source of truth | frontmatter in each `.md` | authored |
| Version index | `DOC-VERSION-REGISTRY.md` | generated from frontmatter |
| Doc graph | derived artifact | disposable |
| Semantic / atoms | GKS via MSP promotion | governed, separate authority |
| Slot accounting | `accounting:check` | computed, no stored state |

Rationale: the four concerns have four different write authorities — version/status/owner is
human-ratified, slot is filesystem-mechanical, graph is parser-derived, semantic is MSP-gated.
Co-locating authored and derived data in one mutable file makes it unanswerable who owns the
file and what a diff means. The industry precedent runs the same way: Sphinx authors `toctree`
in the source and generates a disposable index; Docusaurus builds its graph at build time;
Obsidian has no central registry at all; Bazel puts `BUILD` next to the code it declares. The
one widely-used central-map system, DITA `.ditamap`, is the one known for maintenance pain.

### Option C — Keep both stores, fix enforcement only

Leave `DOC-VERSION-REGISTRY.md` authored. Change nothing structural. Move enforcement from
audit time to creation time and backfill the 54 rows.

## Unresolved Conflicts

These must be settled before Option B could proceed, and they are the reason this CR is
`draft` rather than a recommendation ready to execute.

### UC-01 — Option B destroys a dual-control that currently exists

`scripts/docs/validate-docs.mjs:544-546` requires an `approved` roadmap document to **also** be
approved in the registry. Two independent authored records form a two-record ratification gate.
Generating the registry from frontmatter collapses that to one writer: whoever edits frontmatter
flips both sides at once. This is a governance regression, not a hygiene improvement, and it was
not identified when Option B was first proposed.

Partial mitigation: generate only `Version` and `Path`; keep `Status` and `Group` authored. That
preserves the dual-control but means the registry is not fully generated, so the 54-row gap does
not close by construction — it must still be backfilled.

### UC-02 — Option B makes the drift check vacuous

The Phase 3 registry-drift checks (`validate-docs.mjs:316-339`, STD-Document-Versioning §10
Phase 3) exist *because* the registry is independently authored. Generated output matches by
construction, so the check would always pass while detecting nothing.

### UC-03 — `Group` is not derivable

The assistant's own measurement shows `Group` is the one column with no frontmatter source. A
generated registry therefore still needs an authored input, which reintroduces in a sidecar the
co-location problem Option B was meant to avoid.

### UC-04 — Option B contradicts a document authored the same day

`.claude/skills/doc-architect/SKILL.md` §6.1–6.2 instructs sessions to hand-add registry rows
and states "if the two ever disagree, the registry is right" — the exact inverse of Option B.
Both cannot stand; whichever direction is chosen, the other document must change in the same
change.

### UC-05 — Option A's semantic component is prohibited regardless

Putting semantic/atom records in a doc SoT file would create a canonical semantic store outside
MSP and GKS. `ALIGNMENT-04` assigns `atom_id` ownership to GKS with MSP mediating, and
`CLAUDE.md` states Deep Scan creates observed candidates and never canonical GKS truth. So
Option A cannot be adopted whole, independently of the rest of this CR.

### UC-06 — Option B parks semantic ownership in a subsystem that cannot currently own anything

`packages/govibe-core/src/gks-client.mjs:23-25` returns `createUnavailableGksClient()`
unconditionally; every call throws `DIRECT_GKS_DISABLED`. `.govibe-knowledge-block/` holds 4
files and there is no atom index. Assigning semantic ownership to GKS is governance-correct and
operationally vacuous today. This is the strongest point in Option A's favour and must be
answered rather than deflected: Option B is right about *where* semantics belong and silent
about *when* anything will live there.

### UC-07 — The proposed ratchet must not entrench the debt

The counter-proposal described a baseline ratchet that "stores no new state", which is
incoherent — a ratchet is stored state. More seriously, a gate that only prevents growth
converts today's 61 + 54 into permanent accepted background. Any ratchet must ship with a
stored baseline file and a bound debt-reduction task with a target of zero.

## Scope & Bounded Changes

This change request authorizes **nothing**. It records a decision request. On approval of a
direction, the implementing changes would be raised as separate work packets.

## Explicit Exclusions

- No edit to `docs/DOC-VERSION-REGISTRY.md` structure, `docs/STD-Document-Versioning-Governance.md`,
  `scripts/docs/validate-docs.mjs`, or `scripts/docs/validate-env.mjs` under this CR.
- No backfill of the 54 missing rows, and no registration of `ADR-021`, under this CR.
- No change to the `if (!frontmatter?.doc_id) continue;` skip behaviour under this CR.
- No change to MSP or GKS ownership of atom identity.

## Acceptance Criteria

- AC-01: The owner selects Option A, B, or C, or directs a different one.
- AC-02: If B is selected, UC-01 is resolved with an explicit decision on whether the
  `approved`-status dual-control is preserved or deliberately retired, and UC-04 is closed by
  amending `.claude/skills/doc-architect/SKILL.md` in the same change.
- AC-03: If B or C is selected, a debt-reduction task with a target of zero is bound in a plan
  of record, and the ratchet baseline is a tracked file (UC-07).
- AC-04: `ADR-021` is registered under whichever direction is chosen. Given the H-axis
  remediation phase depends on it, `When` the registry is next audited, `Then` `ADR-021`
  resolves to a row.
- AC-05: Whichever direction is chosen, the frontmatter silent-skip is closed so a
  frontmatter-less document is reported rather than ignored.

## Rollback

Nothing is executed under this CR, so rollback is deletion of this file.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-12 | Boss (CEO) | Record the document-SoT consolidation proposal, the authored-in-place counter-proposal, and seven unresolved conflicts — including that the counter-proposal would destroy an existing two-record ratification control and that it contradicts a skill authored the same day. Raised after review found this decision had no artifact. |
