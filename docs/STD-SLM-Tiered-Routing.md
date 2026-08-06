---
title: "STD: SLM Tiered Routing Standard"
doc_id: "STD-SLM-TIERED-ROUTING"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-06"
owner: "GoVibe"
auditor: "ATHER"
source_of_truth: true
distribution_role: "canonical"
canonical_repository: "Freshair129/govibe"
canonical_path: "docs/STD-SLM-Tiered-Routing.md"
normative_payload_sha256: "pending-first-ratification"
mirror_targets:
  - repository: "Freshair129/RWANG-PROMAX"
    path: ".claude/skills/tiered-swarm/references/model-tiers.md"
  - repository: "Freshair129/RWANG-PROMAX"
    path: ".claude/skills/tiered-swarm/references/routing-policy.md"
sync_policy:
  semantic_version_lock: "exact"
  integrity_scope: "normative_payload"
  conflict_resolution: "canonical_wins"
related_docs:
  - "docs/STD-Execution-Governance.md"
  - "docs/features/agent-team/FEAT-Tiered-Review.md"
  - "docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md"
  - "docs/features/integration-bridge/FEAT-Qwen-CLI-Model-Routing.md"
  - "docs/roadmap/BACKLOG-production-readiness-execution.md"
---

# STD: SLM Tiered Routing Standard

## 1. Purpose and Authority

This standard is the GoVibe canonical source of truth for routing work across local small
language models (SLMs), local mid models, cloud open-weight models, and frontier models. It was
upstreamed from the RWANG-PROMAX `tiered-swarm` skill on 2026-08-06 per the canonical-over-mirror
discipline in `AGENTS.md` §1.1; the RWANG copies listed in `mirror_targets` are now distribution
mirrors and must not override this document.

The whole policy reduces to one sentence: **route a unit of work to the cheapest tier that has a
machine-checkable way to prove it succeeded, behind a gate that stops a wrong cheap output before
it reaches an authoring agent.**

Scope note: this standard governs model-tier *routing*. Executor permission ceilings remain the
`H` Access Scope axis of `docs/STD-Execution-Governance.md`; context assembly remains the
`T/V/W/M-ctx` profiles of `AGENTS.md` §5. Tier is not H and tier is not a context profile.

## 2. Two-Axis Taxonomy

There are two orthogonal axes. A task first picks a **role** (Axis 2); only text-generation roles
then pick a **tier** (Axis 1). The router is a role, never a tier.

## 3. Axis 1 — Capability Tiers (the escalation ladder)

The rungs describe text-generation reasoning power at a price, nothing else. A task starts at its
`tier_hint` and escalates exactly one rung on a failed verify gate:

```text
T0 local-SLM -> T1 local-mid -> T1.5 cloud-open-weights -> T2 Claude-mid -> T3 Claude-frontier
```

Concrete model lookup (operator-updatable through a version bump of this standard; VRAM figures
are GGUF Q4_K_M estimates, KV cache adds ~0.5-1 GB at 4k ctx):

| Tier | Ladder role | Lookup entries | Resident VRAM | Marginal cost |
|---|---|---|---|---|
| T0 local-SLM | fast classify / triage / cheap judge | vibethinker:3b; chinda-qwen3:4b | ~2.0 / ~2.6 GB | ~$0 |
| T1 local-mid | bulk reasoning, code, structured output | aroow-rust-coder:9b (Rust domain); mellum2:12b-a2.5b (MoE); gemma4-coder:12b; qwythos:9b; gemma4:latest | ~5.6-9.8 GB | ~$0 |
| T1.5 cloud-open-weights | near-frontier code at 5-20x under Claude | kimi-k2.7-code:cloud; deepseek-v4-pro:cloud; qwen3-coder-next:cloud; gemini-3-flash-preview:cloud | 0 GB | ~$0.1-0.5 /M out |
| T2 Claude-mid | quality general / authoring | claude-sonnet-4-6 | n/a | $3 in / $15 out per M |
| T3 Claude-frontier | hard reasoning, adversarial review gate | claude-opus-4-8 | n/a | $5 in / $25 out per M |

claude-haiku-4-5 ($1 in / $5 out per M) sits below Sonnet on the Claude side as a cheap
Claude-tier judge for fuzzy verify checks; it is not part of the local ladder.

**Provenance and uncertainty:** Claude prices above derive from a cache dated 2026-06-04 and
carry an uncertainty flag — re-verify against current published pricing before any billing logic
ships. Local marginal cost is "off the billable axis," not free: a wrong cheap output still costs
the verify pass that catches it plus the redo. Meter local usage anyway (Ollama returns
prompt_eval_count / eval_count per response) at rate 0 so the local/frontier split stays auditable.

## 4. Axis 2 — Role Specialists

Role specialists are selected by task type, not difficulty, and sit sideways from the ladder — an
embedder cannot be "escalated" to a frontier model. Condensed lookup:

| Role | Lookup entry | Constraint |
|---|---|---|
| embed (engine-matched) | bge-m3:latest (or bge-m3:q8) | **Mandatory** for any query against the GenesisBlockDB vector store; any other embedder lands queries in a different metric space and breaks recall |
| embed (code / multimodal / light) | jina-code-embeddings:1.5b; qwen3-vl-embedding:2b; nomic-embed-text | separate or non-engine collections only |
| rerank | bge-reranker-v2-m3 | completes the engine's BQ+rerank recall path |
| VLM / summarizer / commit / TTS | polaris-vga:0.8b; clarityqwen2-summarizer; git-commit-message; orpheus:3b | load on demand, unload after |
| router | rules-first, then a T0 classifier on ambiguity | **a role, not a tier** — it observes and picks; it never receives delegated work |

The router is encoded cheapest-first: deterministic rules at zero VRAM (token count, file type,
domain, presence of a verify command), escalating to a T0 classifier SLM only on ambiguity. The
human orchestrator is the top of this control plane.

## 5. Routing Rules

### 5.1 Cheap-Eligibility Keystone

A task is cheap-eligible **iff** it carries a `verify_command` whose result is unambiguous
pass/fail at ~$0 — a named test, a compile, a schema-validate, or a grep that must resolve to a
real line:

```text
cheap_eligible(task) <=> task has a verify_command that returns pass/fail at ~$0
```

A task with no such check never enters the cheap ladder — it starts at T2 by default. No
machine-checkable acceptance at the unit being routed means no cheap routing. This is the keystone
rule of the whole standard.

### 5.2 Break-Even Inequality

Route cheap only when the expected total cost beats frontier-direct:

```text
E[cost_cheap] = c_cheap + p_fail * (c_verify + c_frontier_fix)  <  c_frontier_direct
```

With local c_cheap ~ 0 and a deterministic verifier c_verify ~ 0 this collapses to:
`route cheap <=> p_fail < c_frontier_direct / c_frontier_fix`. The decisive term is how much more
a fix costs than doing it right the first time:

- Self-contained, independently verifiable output (fix ~ fresh frontier attempt): local-first
  almost always wins.
- Output that feeds downstream agents before verification: the threshold on p_fail is tiny —
  escalate, or insert a verify gate between producer and consumer.

**Architectural consequence:** local-first is permitted only behind a verify gate. An unverified
cheap output never crosses a phase boundary into an authoring agent; remove the gate and the
savings invert into rework.

### 5.3 Escalation Ladder

On a failed verify gate, escalate exactly **one** rung and re-execute. Never skip two rungs —
each rung is a real price band and skipping wastes the cheaper attempt's information. The
break-even applies at every rung boundary, not just local-to-frontier. A task that exhausts the
ladder (fails even at T3) is a spec problem, not a routing problem — surface it to the human; do
not loop.

## 6. Verification Gate (three stages, cheapest first)

The gate runs between every phase boundary and after every per-task execution. Apply stages in
order and stop at the first unambiguous verdict:

1. **Deterministic check (~$0)** — run the `verify_command`. If it returns a clean pass/fail,
   that is the verdict. Most well-specified tasks stop here.
2. **Cheap judge (T0 SLM or claude-haiku-4-5, ~$0)** — only when the deterministic check is
   genuinely fuzzy. Its job is narrow: confirm the output meets the acceptance criterion, not
   redo the work.
3. **Frontier judge (T3, full price)** — only when the cheap judge is still ambiguous AND the
   blast radius is high. Reserve for the review gate and high-propagation findings.

**Gate rule:** every finding that crosses a phase boundary must carry a re-runnable evidence
command, confirmed to resolve before the finding passes downstream. A finding without resolving
evidence is rejected at the gate.

## 7. When NOT to Go Local (start at T2+)

1. **No cheap verifier** — only a subjective "looks good" acceptance.
2. **Low p(correct_cheap)** — a domain the local model is weak at (complex borrow/lifetime
   semantics, WAL/consensus invariants, security-sensitive logic).
3. **High rework blast-radius** — output feeds downstream agents before it can be verified.
4. **Adversarial / final review** — the review gate and final-review-versus-DoD run at T3
   regardless of cost.
5. **Engine-correctness embedding queries** — engine-matched embedder is a role constraint, not
   a tier choice; a cheaper non-engine embedder is a correctness bug, not a saving.

Rule of thumb: local-first is an optimization **conditional on cheap, reliable verifiability**.
Where verifiability is absent or the blast radius is large, the cheapest correct path is the
right tier the first time.

## 8. Hardware Co-Residency (RTX 3060 12GB reference class)

Keep one mid coder plus the engine-matched embed/rerank stack co-resident. Reference slots:

| Slot | Composition | Total |
|---|---|---|
| A (recommended) | aroow-rust-coder:9b + bge-m3 + bge-reranker-v2-m3 + nomic-embed-text | ~7.9 GB |
| B (MoE, tight) | mellum2:12b-a2.5b + bge-m3 + bge-reranker-v2-m3 | ~10.3 GB |
| C (quality + router) | qwythos:9b + bge-m3 + bge-reranker-v2-m3 + vibethinker:3b | ~11.0 GB |

8GB fallback: drop the mid models, keep T0 SLMs co-resident with the embed/rerank stack
(~6.6 GB), and escalate all mid work to T1.5/Claude. Keep bge-m3 resident for engine-targeted
queries even at the cost of swapping the coder to cloud. Hardware class follows the
Planning-Decomposition-Standard: RTX 3060 12GB is the sizing reference, not a product dependency.

## 9. GoVibe Bindings

How this standard attaches to existing GoVibe contracts:

- **Verify Gate tiers:** the three gate stages of §6 map onto
  `docs/features/agent-team/FEAT-Tiered-Review.md` — stage 1 is `L0` deterministic, stage 2 is
  `L1` (escalate-only, never unilateral rework), stage 3 is `L2` frontier sign-off.
- **Packets:** micro/atomic packets per
  `docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md` declare `tier_hint` and
  `model_name: resolved-by-router`; a packet's `l0_gate` **is** its `verify_command`, so authoring
  the gate is what makes the packet cheap-eligible. Packets never pin a concrete model as a
  requirement.
- **Dispatch:** the local `T0 -> T1` rung is the `retryLargerLocalModel` argument of
  `govibe.agent.run` (`scripts/mcp/runtime-core.mjs`); model-name resolution follows
  `docs/features/integration-bridge/FEAT-Qwen-CLI-Model-Routing.md`.
- **Context:** packet workers and T0/T1 judges run on `T-ctx`; frontier review/audit gates run on
  `M-ctx` (`AGENTS.md` §5). Tier escalation never widens context — that is a separate
  `escalate_to_lead` decision.

## 10. Mirror and Sync Governance

- This document is canonical; the RWANG-PROMAX `tiered-swarm` reference files listed in
  `mirror_targets` are distribution mirrors and must declare `source_of_truth: false` with
  canonical repository/path/version pointers.
- The mirror declaration governs cross-repository **semantic authority** only. RWANG's internal
  runtime-enforcement precedence (its governance framework "law wins" rule) continues to govern
  RWANG's own runtime and is out of scope here.
- Semantic changes discovered on the RWANG side must be proposed upstream into this document
  first, then synced back to the mirrors (`AGENTS.md` §1.1 discipline).
- On any version, payload, or authority mismatch the mirror is `drifted`; a drifted mirror cannot
  approve implementation, policy enforcement, or audit conclusions. Canonical wins; fail closed.
- `normative_payload_sha256` is computed over the document body below the frontmatter and is
  stamped at ratification; while this document is `draft` the field reads
  `pending-first-ratification`.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-06 | GoVibe | Upstreamed the RWANG-PROMAX tiered-swarm SLM routing guide as GoVibe canon: two-axis taxonomy, T0-T3 escalation ladder with concrete lookup, cheap-eligibility keystone, break-even inequality, three-stage verification gate, co-residency budgets, and GoVibe bindings (FEAT-Tiered-Review L0/L1/L2, quota-aware packets, retryLargerLocalModel, T-ctx). RWANG copies become distribution mirrors under canonical-wins sync policy. |
