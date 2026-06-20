---
title: "ADR: MSP/GKS as GoVibe Traceability Gate"
doc_id: "ADR-014-msp-gks-traceability-gate"
status: "accepted"
version: "0.1.0"
updated: "2026-06-21"
owner: "ARCHON / ATHER"
source_of_truth: true
prd_system: "SYSTEM-09::Traceability-Audit-Verification-System"
related_docs:
  - "docs/change-requests/CR-2026-06-14-MSP-GKS-GoVibe-Integration.md"
  - "docs/change-requests/feedback/CR-2026-06-14-MSP-GKS-GoVibe-Integration-feedback.md"
  - "docs/architecture/MSP-GKS-Taxonomy-Mapping.md"
  - "docs/features/traceability-audit/FEAT-MSP-Validate-Evidence-Adapter.md"
  - "docs/architecture/SDD-MSP-External-Evidence-Boundary.md"
  - "docs/architecture/SDD-Symbol-Graph-Traceability-Boundary.md"
---

# ADR: MSP/GKS as GoVibe Traceability Gate

## Status

Accepted

This decision record resolves the required changes raised during review of
`CR-2026-06-14-MSP-GKS-GoVibe-Integration`. All seven decision roles (ARCHON, ATHER,
LYRA, THESEUS, KIN, GHOST, JANUS) returned `approve_with_changes`; none rejected. The
recommended option was "A. Adapter reuse". The GoVibe human owner approved this decision
on 2026-06-21. Implementation and the proof-of-concept remain a separate follow-up FEAT
gated by the validation plan in this ADR; traceability cannot be claimed "done" until that
plan passes.

## Context

GoVibe enforces documentation governance (frontmatter, version, changelog, registry,
`docs:validate`, `diff:check`, `baseline:check`) but has no enforceable dependency-graph
gate that catches a missing PRD/ADR/FEAT/SDD/code-symbol link before commit. An external
MSP/GKS system already provides validation, backlink, symbol-graph, and memory capability:

- MSP is the parent orchestrator and the only agent-facing gatekeeper.
- GKS is the internal knowledge, backlink, graph, vector, and symbol subsystem beneath MSP.
- MSP exposes MCP tools (`msp_validate`, `msp_candidate`, `msp_backlinks_rebuild`,
  `msp_symbol_trace`, `msp_symbol_community`) and CLI surfaces.
- The observed boundary is: agents call MSP; MSP may call GKS internally.

The CR proposed four options (A adapter reuse, B copy-and-develop, C MSP service + GKS
package, D both as services) and recommended Option A for v1. Reviewers approved the
direction but required refinements before approval could be recorded: a formal taxonomy
mapping, an explicit v1 interface choice, a per-artifact gate matrix, a fail/bypass policy,
CI-safe dependency resolution with no absolute local paths, explicit deferrals, and a
verification plan. Those refinements are now satisfied by supporting documents
(`MSP-GKS-Taxonomy-Mapping`, `FEAT-MSP-Validate-Evidence-Adapter`,
`SDD-MSP-External-Evidence-Boundary`, `SDD-Symbol-Graph-Traceability-Boundary`) and are
recorded as binding decisions here.

The external reference paths cited in the CR (`external_refs`) are workstation evidence
paths only. They are not configuration and must never become runtime or CI dependency paths.

## Decision

1. **Adopt Option A (MSP adapter reuse) as GoVibe's traceability/validation gate for v1.**
   GoVibe consumes MSP-derived validation as source evidence through an evidence adapter.
   GKS stays internal behind MSP. GoVibe agents never call GKS directly. A custom
   GoVibe-only traceability graph is not built in v1. A later MSP-service / GKS-package
   split (Option C) is a post-adapter future option, not the MVP default.

2. **v1 interface order: MSP MCP tools first.** Per KIN's review, MSP MCP tools are the
   preferred initial interface because they are the most decoupled. CLI scripts and the
   package API are fallbacks, used only if MCP discovery is blocked. The evidence-packet
   contract in `FEAT-MSP-Validate-Evidence-Adapter` is interface-neutral, so the collection
   interface can change without changing the contract.

3. **Mandatory gate matrix.** For each governance artifact type, MSP evidence must enforce
   the link/validation below at the stated stage. "Stage" is the earliest point the gate is
   evaluated. Mapping confidence and adapter treatment follow `MSP-GKS-Taxonomy-Mapping`.

   | Artifact type | MSP/GKS link or validation enforced | Stage | Map confidence |
   |---|---|---|---|
   | PRD | Product-intent atom present; downstream FEAT intent chain resolvable | Doc review / pre-commit | medium |
   | ADR | Decision atom present with parent PRD link and resolvable decision IDs | Pre-commit | high |
   | FEAT | Feature atom linked to a parent PRD and a governing ADR/SDD | Pre-commit | high |
   | SDD | Design/blueprint linked to a parent ADR/FEAT; architecture refs resolvable | Pre-commit | medium |
   | Agent context | Context packet traces to an authoritative governance source; no orphan context | Pre-commit / CI | low (unmapped until first-class equivalent) |
   | Registry metadata | `doc_id`/version/status consistent with the doc; no duplicate active `doc_id` | CI / baseline | low (unmapped; ATHER-owned) |
   | Code symbols | Changed symbols trace to a FEAT/SDD via `msp_symbol_trace`; no orphan symbol | CI / pre-merge | per symbol-graph boundary |

   Unmapped artifact types (agent context, registry metadata, ROADMAP) are recorded as
   `unmapped_governance_concepts` rather than silently passing, and their existing GoVibe
   owners (ATHER, LYRA) retain authority. MSP pass is never GoVibe final approval; GoVibe's
   own validators (`docs:validate`, `diff:check`, `baseline:check`) remain authoritative.

4. **Hard-fail / soft-fail / bypass-logging policy.**
   - **Hard-fail (block):** a required link is missing — e.g. a FEAT/ADR/SDD with no
     resolvable parent PRD/ADR link, an orphan code symbol, or `msp:validate` exiting
     non-zero on a source claimed as canonical. The gate blocks; the result maps to
     `create_change_request` or `blocked_by_missing_evidence` per the FEAT failure policy.
   - **Soft-fail (warn + logged bypass):** MSP or GKS is unavailable, the MSP repo path is
     unset, or the MSP command cannot be reached. The gate does not block local work but
     emits a logged bypass recording who bypassed, when, the missing dependency, and the
     reason. A soft-fail is never reported as a pass.
   - **Bypass logging:** every soft-fail bypass is recorded as evidence so audits can
     distinguish "gate passed" from "gate skipped because the validator was unavailable".

5. **CI-safe dependency resolution.** MSP/GKS discovery is via environment variable
   (e.g. `MSP_REPO_ROOT`) or package resolution **only**. Absolute local paths must never
   appear in runtime config, CI config, or specs. The `external_refs` in the CR are
   workstation evidence, not configuration. A clean-environment validation must confirm tool
   discovery works without any hardcoded local path; absent discovery config triggers the
   soft-fail path above, not a silent pass.

6. **Deferrals.**
   - A custom GoVibe-only traceability graph is deferred unless the MSP/GKS adapter fit is
     later rejected.
   - Rich Mission Control provenance UI is deferred until the blocking validation gate is
     stable.
   - Mission Control may display MSP/GKS only as provenance/configuration, never as fake
     live execution or as GoVibe-owned runtime state.
   - Broader MSP capabilities (identity passport runtime, episodic memory lifecycle,
     consolidator/compressor, full MCP tool surface) remain reference-only until a separate
     FEAT maps them to a product system, owner, and acceptance gate.

7. **Validation plan (acceptance gate for the follow-up implementation FEAT).** This
   decision is approved now; implementation plus POC are a separate follow-up that cannot
   be marked "done" until the verification from feedback §5 passes:
   - **POC:** run MSP validation from GoVibe against one simple ADR/FEAT dependency case.
   - **Negative link test:** a missing PRD/ADR link must fail the gate (hard-fail).
   - **Positive link test:** a correct PRD/ADR/FEAT/SDD chain must pass.
   - **Failure-mode test:** MSP/GKS unavailable must produce the approved soft-fail (logged
     bypass) or hard-fail behavior, never a false pass.
   - **CI discovery check:** MSP tool discovery works with no hardcoded local path.
   - **UI provenance check:** any Mission Control display is labeled provenance/configuration,
     not live execution.

## Consequences

### Positive

- GoVibe gains an enforceable traceability gate without rebuilding a parallel graph.
- Missing parent artifacts (PRD/ADR/FEAT/SDD) and orphan code symbols become detectable
  before commit/merge instead of relying on checklist memory.
- The MSP boundary stays the single agent-facing surface; GKS internals are not exposed.
- The interface-neutral evidence packet lets collection move from MCP to CLI/package
  without contract churn.
- CI-safe discovery keeps the gate portable across environments.

### Negative

- GoVibe backend availability is coupled to MSP reachability; the soft-fail policy mitigates
  this but introduces a "skipped, not passed" state auditors must track.
- Taxonomy drift between GoVibe docs and MSP atoms remains a maintenance burden; unmapped
  concepts must be surfaced, not inferred.
- Validation latency and dependency-management overhead are added to the gate path.

### Neutral / Trade-offs

- Approval is recorded now, but traceability cannot be claimed complete until the follow-up
  FEAT passes the validation plan — decision and implementation are deliberately separated.
- A future MSP-service / GKS-package split stays open as Option C but is intentionally out
  of v1 scope.

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| B. Copy-and-develop slice (fork MSP/GKS modules into GoVibe) | Fork drift, duplicated maintenance, unclear upstream; only revisited if adapter reuse is blocked. |
| C. MSP service + internal GKS package | Adds service-lifecycle complexity prematurely; retained as a post-adapter future option, not v1. |
| D. MSP service + GKS service | Premature distributed-system cost and public-GKS bypass risk; not recommended now. |
| Build a custom GoVibe-only traceability graph | Rebuilds capability MSP/GKS already provides; deferred unless MSP/GKS fit is rejected. |
| Expose GKS directly to GoVibe agents | Breaks the single MSP boundary and the trust model; explicitly blocked. |

## Related Documents

- `docs/change-requests/CR-2026-06-14-MSP-GKS-GoVibe-Integration.md`
- `docs/change-requests/feedback/CR-2026-06-14-MSP-GKS-GoVibe-Integration-feedback.md`
- `docs/architecture/MSP-GKS-Taxonomy-Mapping.md`
- `docs/features/traceability-audit/FEAT-MSP-Validate-Evidence-Adapter.md`
- `docs/architecture/SDD-MSP-External-Evidence-Boundary.md`
- `docs/architecture/SDD-Symbol-Graph-Traceability-Boundary.md`

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0 | 2026-06-21 | ARCHON / ATHER | Initial decision record adopting MSP/GKS adapter (Option A) as the GoVibe traceability gate; resolves CR-2026-06-14 required changes. |
