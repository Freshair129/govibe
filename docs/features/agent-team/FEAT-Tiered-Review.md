---
title: "FEAT: Tiered Review (Deterministic → SLM → Frontier)"
doc_id: "FEAT-TIERED-REVIEW"
uid: "01KVXGFTXSC09EQQB0A57FY8C1"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:22c0261d043813fa"
updated: "2026-06-23"
owner: "ARCHON / ATHER"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - "docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md"
  - "docs/features/agent-team/FEAT-Per-Agent-Memory-Unit.md"
  - "docs/features/execution-governance/FEAT-Execution-Governance-Standard.md"
  - "docs/adr/ADR-020-Per-Agent-Memory-Unit.md"
---

# FEAT: Tiered Review (Deterministic → SLM → Frontier)

## 1. Goal

Reduce the frontier-model **review tax** (measured at ~28% of hybrid spend in the G-orchestra
sample) **without losing correctness**, by gating agent output through three escalating review
tiers — `L0` deterministic, `L1` local-SLM, `L2` frontier — so a frontier model only reviews what
the cheaper tiers cannot clear. This is the internal structure of the existing Verify Gate, not a
new gate.

## 2. Why This Exists

- Review is input-heavy (cheaper per call than write/produce), but it runs on every task and loops
  on rework, so it accumulates: measured at **$13.38 / 28% of spend** on a real multi-task build.
- Most local-worker failures are **deterministically detectable** for $0 with 100% reliability:
  won't-compile, hallucinated tooling (e.g. `pnpm exec clippy`), `todo!()` stubs, missing files.
  **No LLM should review code that does not compile.**
- The leverage is therefore: (a) catch deterministic errors before any LLM, (b) use a free local
  SLM as an *escalate-only* pre-filter, (c) reserve frontier review for high-stakes sign-off.
- A naive "cheap SLM reviews first" cascade is unsafe if the SLM can trigger rework on its own —
  a wrong rework decision pays the expensive write direction twice (see review economics in
  `FEAT-QUOTA-AWARE-LOCAL-LLM-DECOMPOSITION`).

## 3. Scope

Included:

- `L0` deterministic gate (compile / lint / test / typecheck) run before any LLM review
- `L1` local-SLM review as an escalate-only filter (pass or send up; never unilateral rework)
- `L2` frontier sign-off, mandatory for high-stakes work and never removed from the final gate
- per-tier telemetry (pass/fail + cost) surfacing the review-tax % as the optimization target

Excluded:

- replacing the Verify Gate (this is its internal tiering)
- allowing `L1` SLM to issue final reject/rework decisions on its own
- removing frontier review from the final gate for high-stakes (failOn-critical) work

## 4. Functional Requirements

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-001 | `L0` deterministic checks run first; deterministic failures route to rework without any LLM review. | A non-compiling / failing-test output never reaches `L1`/`L2`; it returns to the worker with the tool output. |
| FR-002 | `L1` local-SLM review is escalate-only. | `L1` may emit `pass` or `escalate`; it cannot emit `rework` on low confidence. |
| FR-003 | `L2` frontier sign-off is mandatory for high-stakes work and is never removed from the final gate. | Tasks flagged `failOn: critical` on core logic always receive an `L2` pass before `done`. |
| FR-004 | Tier escalation is explicit and policy-driven. | Low-stakes work that passes `L0`+`L1` may skip `L2` per `review` policy; the skip is logged, never silent. |
| FR-005 | Per-tier telemetry is recorded. | Each review logs tier, verdict, and cost; the review-tax % is computed and surfaced. |
| FR-006 | The cascade composes the existing Verify Gate, not a new gate. | No second gate is introduced; `L0`–`L2` are the Verify Gate's internal stages. |

## 5. Tier Model

| Tier | Reviewer | Role | Cost |
|---|---|---|---|
| **L0 — Deterministic** | compiler / linter / test / typecheck | catch won't-compile, hallucinated tooling, stubs | $0, 100% reliable |
| **L1 — Local SLM** | local model (e.g. Gemma-12B) | escalate-only pre-filter: "looks risky → send up" / "clean → pass" | $0 |
| **L2 — Frontier** | Sonnet → Opus | final sign-off for high-stakes / where `L1` is unsure | paid, once per task |

## 6. Routing Rules

- Always run `L0` first; a deterministic failure never consumes an LLM review.
- Route to `L1` only after `L0` passes; `L1` either passes or escalates.
- Route to `L2` when the task is high-stakes (`failOn: critical` on core logic) or `L1` escalates.
- `L1` must never send code back to the writer on its own; only `L0` (deterministic) and `L2`
  (frontier) can trigger rework.
- Pair with the per-agent failure memory (`FEAT-PER-AGENT-MEMORY-UNIT`): every reject feeds the
  failure-log so the same error is not produced again, reducing future rework.

## 7. Acceptance Criteria

- A canonical contract exists for a three-tier review cascade as the Verify Gate's internal structure.
- Non-compiling output is caught at `L0` for $0 and never reaches an LLM reviewer.
- `L1` SLM review can only pass or escalate, never reject unilaterally.
- Frontier `L2` sign-off remains mandatory for high-stakes work.
- Review-tax % is measured and reported per run.

## 8. Success Criteria

- Frontier review spend (the ~28% review tax) drops measurably without a rise in escaped defects.
- Deterministically-detectable failures are caught before any paid review.
- The hybrid savings figure improves as review cost falls.

## 9. Definition Of Done

- Feature doc registered in `docs/DOC-VERSION-REGISTRY.md`.
- `docs:validate` passes.
- Future implementation plans can cite this doc when wiring the Verify Gate tiers.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-23 | ARCHON / ATHER | Initial tiered-review contract: L0 deterministic → L1 SLM (escalate-only) → L2 frontier sign-off, as the Verify Gate's internal structure; targets the measured ~28% review tax. |
