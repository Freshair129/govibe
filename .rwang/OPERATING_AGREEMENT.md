# RWANG Operating Agreement — GoVibe (Option A: Thin Overlay)

**Ratified:** 2026-07-09 by the project owner · **Mode:** `overlay`

GoVibe is a mature, already-implemented repository with its own governance. RWANG runs here as a **thin overlay**, not as the primary planning system. This agreement is binding on every agent that reads RWANG state.

## In scope for RWANG
- **Version registry** (`.rwang/`) for **root owner materials only** — currently `PRODUCT.md` (DOC-0001), `GoVibe_Implementation_Plan.md` (DOC-0002).
- **Write-gate** at `.githooks/pre-commit` (this repo sets `core.hooksPath=.githooks`; `.git/hooks/` is inert here).
- **Orchestration layers** `state/` (runtime) and `queue/` (machine) per RWANG:MasterPlan §8.
- **Core rules R1–R6** apply to all task-level work.

## Explicitly OUT of scope (do not do)
- **Do NOT generate** `MASTER_PLAN.md` or the Phase 0–6 canonical doc set. Phases 1–7 are not RWANG-driven for this repo.
- **Do NOT double-register** the `docs/` tree into `.rwang/`. `docs/` is governed natively by `docs/DOC-VERSION-REGISTRY.md` + `docs:validate` / `baseline:check` — that remains the single source of truth for docs.
- **Do NOT modify** owner materials, `README.md`, or agent-pointer files as part of RWANG operations.

## Hashing rule (prevents false gate blocks)
`core.autocrlf=true` (CRLF working tree, LF blobs). Register/bump MUST record the **git-blob** hash (`git show :<path> | sha256sum`), never the working-tree hash.

## Changing this agreement
Requires an explicit owner decision (a new `RWANG:` invocation or an approved `ARCHITECTURE_CHANGE_REQUEST.md`). Absent that, agents treat the above as frozen.
