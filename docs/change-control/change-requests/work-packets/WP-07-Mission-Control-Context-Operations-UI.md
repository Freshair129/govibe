---
title: "WP-07: Mission Control Context Operations UI"
doc_id: "WP-07-MISSION-CONTROL-CONTEXT-OPERATIONS-UI"
status: "verification_pending"
version: "0.2.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
complexity: "C-2"
access_scope: "H3"
---

# Objective

Expose an honest Mission Control surface for vault, context, replay, policy, and impact readiness without fabricating authority or evidence that the runtime has not reported.

# Implemented scope

1. Replaces the A4 Brain & Config route with a combined Vault, Context & Impact operational view while preserving the existing BrainConfig panel.
2. Shows MSP boundary availability only when a provider report exists.
3. Shows registration state for all seven governed vault/context commands.
4. Shows impact-engine registration separately from graph coverage.
5. Extracts recent vault/context/replay/impact/policy evidence from the live terminal stream.
6. Displays explicit trust gates for hashes, policy decisions, exact replay source versions, promotion evidence, and blocked reasons.
7. Uses unavailable/not reported states instead of synthetic success data.

# Invariants

- UI is read-only in this slice.
- No direct GKS or GenesisBlockDB operation is introduced.
- Missing context IDs, hashes, policy decisions, or replay results are not invented.
- Command registration is not represented as execution success.
- Impact readiness is not represented as complete graph coverage.

# Acceptance criteria

- A4 renders the context operations surface and existing BrainConfig content.
- Responsive layout works at desktop and narrow widths.
- Missing evidence produces an explicit empty state.
- Registered and unavailable commands are visually distinct.
- Typecheck, tests, build, docs validation, and E2E CI pass.
- PR remains unmerged until explicit owner approval.
