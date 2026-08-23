---
title: "SPEC: Workspace System Specification"
doc_id: "SPEC-WORKSPACE-SYSTEM"
status: "approved"
version: "0.3.4"
updated: "2026-08-20"
owner: "Boss (CEO)"
source_of_truth: true
related_docs:
  - "docs/architecture/ARCH-Vault-and-Context-Model.md"
  - "docs/adr/ADR-022-Vault-Ownership-and-Context-Lineage.md"
  - "docs/api/API-005-GoVibe-Capability-Contracts.md"
  - "docs/api/API-006-Vault-Context-and-Replay-Contracts.md"
  - "docs/STD-Execution-Governance.md"
---

# SPEC: Workspace System Specification

## 1. Purpose and Scope

This specification defines the production contract for the GoVibe Workspace System: the
identity model, on-disk materialization, initialization lifecycle, governed tool surface,
failure semantics, and invariants that every runtime consumer (MCP server, sidecar,
`govibe-core` package, and CLI) must honor.

**In scope**

- Workspace and vault identity derivation and the `.govibe/` / `.brain/` materialization.
- The `govibe.workspace.*` tool contracts and their lifecycle ordering.
- State file schemas, idempotency, and incompatible-state failure behavior.
- MSP parent-boundary requirements for workspace registration.
- Governance-axis conformance for workspace operations.

**Out of scope (canonical owners win)**

- Vault semantics, context assembly profiles, and replay lineage —
  `docs/architecture/ARCH-Vault-and-Context-Model.md`.
- Capability request/response payload shapes —
  `docs/api/API-005-GoVibe-Capability-Contracts.md` and
  `docs/api/API-006-Vault-Context-and-Replay-Contracts.md`.
- Execution governance axes and access defaults — `docs/STD-Execution-Governance.md`.

If this specification conflicts with one of the canonical owners above, the canonical
owner wins and this document must be revised.

## 2. Definitions

| Term | Definition |
|---|---|
| Workspace | One local root directory in which governed agent work happens for one project. Identified by `workspace_id`, never by folder name. |
| Project | The logical product a workspace serves. Identified by `project_id` derived from the project slug. |
| Shared Vault | Governed project source of truth, materialized at `.brain/<project-slug>/`. |
| Workspace Private Vault | One agent's episodic memory in one workspace, materialized at `.brain/private/<agent-id>/`. |
| Global Private Vault | One agent's compressed durable memory across workspaces. No local materialization path. |
| MSP | The mandatory parent boundary that authorizes workspace registration and every canonical knowledge write. |
| V-space | The current workspace. It is not a separate memory tier. |
| Personnel | A human actor operating on a workspace. Exactly one of two employment types: permanent employee (identified by `employee_id`) or contract staff (identified by `staff_id`). |

## 3. Identity Model

Implemented by `packages/govibe-core/src/vaults.mjs` (`createWorkspaceVaultBindings`).

### 3.1 Derivation rules

All identities are stable, deterministic, and derived — never random and never re-minted
for the same inputs:

```text
project_slug             = slugify(project name)          # [a-z0-9-], non-empty
project_id               = "project_"  + sha256(project_slug)[0..24]
workspace_id             = "workspace_" + sha256(project_id, resolved workspace path)[0..24]
shared vault_id          = "vault_" + sha256("shared", project_id)[0..24]
workspace private vault_id = "vault_" + sha256("private", agent_id, workspace_id)[0..24]
global private vault_id  = supplied, or "vault_" + sha256("private", "global", agent_id)[0..24]
```

- `agent_id` MUST match `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$` and MUST NOT contain `..`.
- The same project cloned to two paths yields two distinct `workspace_id`s bound to one
  `project_id`.
- Folder names are materialization details. Consumers MUST resolve identity through
  `.govibe/vaults.json`, never by parsing folder names.

### 3.2 Binding requirements

Per `ARCH-Vault-and-Context-Model.md`:

- Shared project vault: requires `project_id`; `agent_id` is null.
- Workspace private vault: requires `agent_id`, `project_id`, and `workspace_id`.
- Global private vault: requires `agent_id`; project/workspace bindings are null.

The bindings document (`govibe-workspace-vault-bindings/v1`) carries
`primary_shared_vault`, `workspace_private_vaults[]`, `global_private_vault`, and
`mounted_shared_vaults[]`.

### 3.3 Personnel identity (`employee_id` / `staff_id`)

> **Status: identity model implemented, tool-surface attribution pending.** The identity
> model in this section is implemented by `packages/govibe-core/src/personnel.mjs`
> (registry, single-active-identity enforcement, conversion via `supersedes`, allow-only
> append audit) with the agent-namespace guard in `packages/govibe-core/src/vaults.mjs`,
> pinned by `packages/govibe-core/src/personnel.test.mjs`. On an RBAC-enabled workspace the
> tool surface attributes and audits calls under the `employee_`/`staff_` actor value
> (TASK-PRD-016), and when the workspace materializes `.govibe/personnel.json`
> (`govibe-personnel-registry/v1`) the enforcement boundary verifies the presented ID is the
> person's *active* identity — unknown and retired IDs deny with distinct audited reasons
> (TASK-PRD-017). Workspaces without RBAC state still accept the free-form `actor`
> string (§5.1).

Human actors are modeled as **one** `personnel` entity with an `employment_type`
discriminator. The employment type determines which ID namespace identifies the person:

| `employment_type` | Identity field | Format |
|---|---|---|
| `permanent` | `employee_id` | `^employee_[a-z0-9][a-z0-9-]{3,31}$` |
| `contract` | `staff_id` | `^staff_[a-z0-9][a-z0-9-]{3,31}$` |

Normative rules:

1. **Single active identity.** A person holds exactly one active ID at a time — either
   an `employee_id` or a `staff_id`, never both. The two namespaces MUST NOT overlap
   and an ID value is never reused for a different person.
2. **Immutability and conversion.** IDs are immutable once issued. Converting a
   contract hire to permanent (or the reverse) issues a new ID in the target namespace
   and retires the old one with a recorded `supersedes` link; the audit trail under the
   retired ID is preserved, never rewritten.
3. **Actor attribution.** When personnel identity is available, the `actor` value sent
   to `govibe.*` tools MUST be the active `employee_id` or `staff_id`, so MSP
   registration records, scan promotions, and impact runs attribute to a governed
   identity rather than a free-form name.
4. **Distinct from `agent_id`.** `employee_id`/`staff_id` identify humans;
   `agent_id` identifies software agents (§3.1). One namespace MUST NOT be used for
   the other, and personnel IDs never appear in vault binding records.
5. **Consumers MUST NOT branch on field presence.** Code reads `employment_type` to
   distinguish permanent from contract personnel; the ID prefix is a namespace
   convention, not a type flag to be parsed.

## 4. On-Disk Materialization

```text
<workspace>/.govibe/
  config.json                     # govibe-workspace-config/v1
  project-state.json              # govibe-project-state/v1
  skill-lock.json                 # govibe-skill-lock/v1
  vaults.json                     # govibe-workspace-vault-bindings/v1
  skills/                         # pinned built-in skill definitions
  contexts/<cache-id>.json        # materialized context packets
  context-injections/<injection-id>.json

<workspace>/.brain/
  <project-slug>/                 # Shared Vault materialization
    manifest.json                 # govibe-vault-materialization/v1
  private/<agent-id>/             # Workspace Private Vault materialization
    manifest.json                 # govibe-vault-materialization/v1
  <mounted-project-slug>/         # mounted Shared Vault from another project
```

### 4.1 State file schemas

Every state file declares a versioned `schema` string. Readers MUST reject a file whose
`schema` does not match the expected value (see §8 failure semantics).

| File | Schema | Required content |
|---|---|---|
| `config.json` | `govibe-workspace-config/v1` | `workspaceId`, `projectId`, `projectSlug`, `createdAt` |
| `project-state.json` | `govibe-project-state/v1` | `workspaceId`, `projectId`, `objective`, `moduleScope`, `constraints`, `sourceRefs`, `fileRefs`, `verificationExpectations`, `criticalKnownIssues`, `stateKeys`, `knowledgeRefs`, `vaultRefs` |
| `skill-lock.json` | `govibe-skill-lock/v1` | exactly the pinned built-in skill entries, each with `id`, `version`, `contentHash` |
| `vaults.json` | `govibe-workspace-vault-bindings/v1` | full binding document per §3.2 |
| `.brain/**/manifest.json` | `govibe-vault-materialization/v1` | the vault binding record for that materialization |

## 5. Lifecycle and Tool Surface

The public workspace surface is exposed as MCP tools in `scripts/mcp/registry.mjs`,
dispatched by `scripts/mcp/handlers.mjs`, and implemented by
`packages/govibe-core/src/workspace.mjs` and `scripts/mcp/runtime/workspace-service.mjs`.

### 5.1 Canonical lifecycle order

```text
govibe.workspace.initialize
  -> govibe.workspace.scan          (L1 inventory or 12-stage Deep Scan)
  -> govibe.workflow.continue       (context packet assembly)
  -> govibe.plan.create / govibe.workflow.status
  -> govibe.workspace.impact        (before completing semantic changes)
  -> govibe.workspace.validate      (governance gate)
```

Every tool call requires an `actor`. Legacy aliases (`GoVibe:init`, `RWANG:init`, …) are
deprecated compatibility shims that resolve to the canonical names and MUST NOT be used
in new integrations.

### 5.2 `govibe.workspace.initialize`

Prepares vault bindings, `.govibe` state, the pinned built-in scan skill, and MSP
registration. It performs **no scanning** (`deepScanRun: false` in the result).

Required input: `actor`, `workspacePath`. Optional: `agentId` (default `default-agent`),
`globalPrivateVaultId`.

Normative behavior (implemented in `initializeWorkspace`):

1. **MSP required.** If the MSP client cannot register workspaces, initialization MUST
   fail with `Workspace initialization requires the MSP parent boundary.` There is no
   ungoverned local-only mode.
2. Resolve `workspacePath` to its real path; derive all identities per §3.
3. Create `.govibe/`, the Shared Vault directory, and the Workspace Private Vault
   directory using safe, root-contained directory creation.
4. Install the pinned built-in skill under `.govibe/skills/` and record it in
   `skill-lock.json` with `id`, `version`, and `contentHash`.
5. Write each state file **only if missing** (`wx` flag). Existing files are validated,
   never overwritten (see §7).
6. Re-read all persisted state and verify `workspaceId` / `projectId` / skill pin
   consistency before registering.
7. Compute `sourceHash = sha256({workspaceId, projectId, workspacePath, vaultBindings})`
   and call `mspClient.registerWorkspace` with deterministic `recordId`
   (`workspace-<hash[0..24]>`) and `runId` (`workspace-init-<hash[0..24]>`) so retries are
   idempotent at the MSP boundary.
8. Return `status: "registered"` with every persisted path, the vault bindings, the
   skill reference, and the MSP registration record.

### 5.3 `govibe.workspace.scan`

Runs an L1 inventory (`deep: false`) or the canonical twelve-stage Deep Scan
(`deep: true`), and submits knowledge/link candidates through MSP promotion. Scan output
is **observed candidates only**; it never assigns canonical GKS identities. Supports
`runId` + `resume` for interrupted deep scans.

#### 5.3.1 Inventory scope (owner-approved semantic change)

The inventory determines what is submitted to MSP, so its scope is governed behaviour and
not an implementation detail. It is derived from the repository's own ignore rules, not a
hand-maintained list:

- When `workspacePath` **is** the toplevel of a git working tree, the file set is
  `git ls-files` (tracked) plus `git ls-files --others --exclude-standard` (untracked and
  not ignored). Reading git's own answer is what makes negations (`!local_model/...`) and
  partial-path rules (`benchmark_results/v2/` ignored while `benchmark_results/logs/` is
  tracked) come out correct; an approximation of gitignore semantics MUST NOT be
  reimplemented.
- When it is **not** a git toplevel — including a workspace nested inside an enclosing
  repository — the inventory MUST NOT be taken from the enclosing repository's rules. A
  workspace an enclosing repo ignores would otherwise inventory as empty.
- A policy exclusion set (`SCRATCH_PATH_ROOTS`) is layered on both paths for agent scratch
  and generated run state. The fallback path's exclusions MUST approximate the git path's,
  never contradict them: one workspace must not yield two different inventories depending
  on whether `git` happens to be installed.

Every result MUST declare `inventoryMode` and, when the mode was not the git path,
`inventoryModeReason`. A failure that is *unexpected* (git absent, a corrupt repository, a
buffer overrun) MUST be surfaced rather than silently widening scope — falling back to a
directory walk admits paths the ignore rules were excluding, which on this repository
measured 922 → 1726 files including a vendored checkout of a foreign project.

`governingRuleSets` records which rule sets produced the inventory. It MUST NOT contain
absolute paths: `sourceSnapshotHash` is `hash(inventory)` and is the `source_snapshot_hash`
carried on every MSP evidence batch and knowledge candidate, so embedding a workspace path
would make two byte-identical clones hash differently and break the replay comparison
§6 requires.

#### 5.3.2 Observed-graph publication

A deep scan publishes its observed candidates to the Mission Control snapshot's `graph`
and `symbols` slices. These are **observed candidates**, not canonical truth, and the
distinction MUST survive into the UI — a view MUST NOT present them as promoted,
indexed, or GKS-assigned.

Publication is bounded per stage so a high-volume early stage cannot starve later ones.
Bounding MUST be disclosed, never silent: published counts and true totals are reported
with numerator and denominator describing the **same** population, and candidates dropped
by the endpoint filter or the wire bound are reported separately. An L1 scan publishes
nothing, so a workspace with no deep scan keeps an honest empty state.

#### 5.3.3 Snapshot frame budget

The sidecar's WebSocket connect frame carries the **whole** snapshot and is validated
against `MISSION_PROTOCOL_LIMITS.eventBytes`. A frame that exceeds it is not sent, and a
connecting client receives no snapshot at all — so the ceiling is a property of the
snapshot as a whole, not of any one slice.

**Every accumulating snapshot slice MUST be bounded.** The scan slices are held to a
byte budget, which only remains sufficient while the rest of the snapshot stays small:
measured on this repository, non-scan content is ~45 KB against a ~900 KB scan budget,
leaving roughly 55 KB of headroom. A slice that grows without limit therefore does not
merely get large — it invalidates the scan budget's arithmetic and eventually costs every
connecting client its snapshot.

`workflowRuns` was such a slice: it de-duplicated by `runId` but otherwise appended
indefinitely, at roughly 6 KB per run, so on the order of nine deep scans in one session
would breach the ceiling. It is now bounded to the most recent runs, as `terminal`
already was.

Trimming a bounded slice MUST be disclosed on the same terms as §5.3.2 — the reader is
told what was kept, what was dropped, and where the dropped records still exist
(`state/runs/`). Retention MUST keep the newest entries: the tail is what a reader is
looking at.

### 5.4 `govibe.workspace.impact`

Traverses the observed backlink graph
(`packages/govibe-core/src/impact/impact-engine.mjs`) from one or more changed paths.

Input: `actor`, `workspacePath`, `paths[]` (min 1), optional `changeType`
(`editorial | schema_additive | schema_breaking | semantic_change |
authority_boundary_change | runtime_behavior_change`, default `semantic_change`),
`maxDistance` (1–8, default 3), `minimumScore` (0–1, default 0.2).

Every result MUST include, per affected artifact: the relation chain, graph distance,
impact score and confidence, required action (`must_update`, `review_and_update`, or
`review`), and any unresolved links. The runtime MUST NOT claim completeness while
unresolved links exist. Plain substring search is not an acceptable implementation.

Every result MUST also declare its own analysis boundary in `boundary.excluded[]`, one
entry per subtree left out of the link graph, each carrying the `path` and a `reason`.
The link graph is built by walking the filesystem, not the git index, so subtrees that
are on disk but do not govern the workspace MUST be excluded and MUST be reported rather
than silently dropped:

- `nested_git_checkout` — a directory carrying its own `.git` marker (a submodule, or a
  `git worktree add` target parked inside the repository). `git worktree` writes a `.git`
  *file* rather than a directory, so type MUST NOT be used to detect one.
- `scratch_directory` — an immediate child of the workspace root holding agent scratch,
  generated run state, or vendored reference copies (`.claude/`, `.agents/`, `.brain/`,
  `state/`, `benchmark_results/`, `ref/`). Matched against root children only, so a
  governed nested directory that merely shares one of these names is still indexed.

This boundary is a correctness requirement, not an optimisation: `AGENTS.md` §10 makes
impact analysis a precondition for completing a semantic, schema, authority-boundary, or
runtime-behaviour change and obliges the executor to act on every returned `must_update`
and `review_and_update` artifact. A duplicate checkout on disk returns the same governed
document twice as two distinct dependents, inflating that obligation with paths nobody
should edit.

### 5.5 `govibe.workspace.validate`

Validates the current workspace against `docs/STD-Execution-Governance.md`. This is the
workspace-level governance gate; document-level gates remain `npm run docs:validate` and
`npm run baseline:check`.

### 5.6 `govibe.workflow.continue`

Resolves the pinned skill and MSP-mediated vault/context references into an
executor-neutral, replayable context packet for `claude-code`, `codex`, or `crewai`
executors, under a declared context profile (`T-ctx | V-ctx | W-ctx | M-ctx`). Lineage
requirements (retained `contextId`, `cacheId`, optional `kvId`, exact source
versions/hashes, `parent_context_id` chaining for M-ctx) are owned by
`ARCH-Vault-and-Context-Model.md` and API-006 and apply unchanged.

## 6. Role-Based Access Control (RBAC)

> **Status: implemented and enforced per workspace.** The decision core is
> `packages/govibe-core/src/rbac.mjs` (deny-by-default scoped assignments, the §6.2 matrix,
> §6.3 employment-type constraints and separation of duties, H-ceiling intersection,
> allow/deny audit), and `scripts/mcp/runtime/rbac-enforcement.mjs` runs it as a decision
> point in `handleToolCall` before any handler body. Enforcement activates when a workspace
> materializes `.govibe/rbac.json` (`govibe-rbac-state/v1`; unknown schemas hard-fail per
> §10); decisions append to `.govibe/rbac-audit.jsonl`. A workspace without that state file
> keeps the pre-RBAC posture — H ceiling, repository policy, and human gates — so adopting
> RBAC is an explicit per-workspace decision, not a silent flag-day. TASK-PRD-026 (AUD-04)
> routes the sidecar's `workspace.scan` mission command through this SAME `enforceToolRbac`
> decision point (`scripts/mcp/runtime/mission-command-router.mjs`) rather than calling the
> scan service directly, so a governed operation cannot bypass enforcement by arriving over
> HTTP/WebSocket instead of stdio. TASK-PRD-027 (AUD-05) added `govibe.docs.resolve` and
> `govibe.ingest.code` to the §6.2 matrix and put both behind the same path-containment helper
> (`scripts/mcp/path-security.mjs`) the roadmap read/write paths already use, closing the gap
> where both tools read arbitrary files with no containment and no RBAC coverage.

### 6.1 Model

```text
subject (employee_id | staff_id | agent_id)
  -> role assignment (scoped to project_id or workspace_id)
  -> role
  -> permitted operations
```

- **Deny by default.** An operation is allowed only if an active role assignment
  permits it in the target scope.
- **Scoped assignments.** Every assignment binds subject + role + scope
  (`project_id` or `workspace_id`). There are no global implicit grants.
- **Least privilege.** Subjects receive the lowest role that covers their work.
- **RBAC never raises the H ceiling.** The effective permission of any call is the
  intersection of the RBAC grant, the executor's H access scope, repository policy,
  deny rules, and human gates. A role grant cannot authorize what
  `STD-Execution-Governance.md` forbids.

### 6.2 Roles and permission matrix

| Operation | `owner` | `maintainer` | `operator` | `viewer` |
|---|---|---|---|---|
| `govibe.workspace.initialize` | ✔ | ✔ | – | – |
| `govibe.workspace.scan` (deep) | ✔ | ✔ | – | – |
| `govibe.workspace.scan` (L1) | ✔ | ✔ | ✔ | – |
| `govibe.workflow.continue` / `govibe.plan.create` | ✔ | ✔ | ✔ | – |
| `govibe.workspace.impact` / `govibe.workspace.validate` | ✔ | ✔ | ✔ | – |
| `govibe.workflow.status` / `govibe.docs.version` / `govibe.review.run` | ✔ | ✔ | ✔ | ✔ |
| `govibe.docs.resolve` | ✔ | ✔ | ✔ | ✔ |
| `govibe.ingest.code` | ✔ | ✔ | ✔ | – |
| Approve promotions / doc sign-off / `C-3/H4` override | ✔ | – | – | – |

### 6.3 Employment-type constraints

- Contract staff (`staff_id`) MUST NOT hold the `owner` role. Their ceiling is
  `maintainer`, and each grant above `operator` requires an explicit recorded approval
  by an `owner`.
- Permanent employees (`employee_id`) may hold any role per assignment.
- Separation of duties: the subject who executes a promotion or sign-off request
  cannot be the subject who approves it.

### 6.4 Audit

Every allow **and** deny decision is recorded with the subject ID, role, scope,
operation, and timestamp. RBAC decisions attribute to `employee_id`/`staff_id`/
`agent_id` — never to a free-form actor string once personnel identity is available.

## 7. Governance-Axis Conformance

Workspace operations report complexity and access scope per the canonical axes
(`STD-Execution-Governance.md` v2.4.0+ga §12.1, ADR-021):

| Operation | Typical C | Effective H (access scope) | Notes |
|---|---|---|---|
| `workspace.initialize` | C-1 | H1 | Writes only under the workspace root; MSP registration is mediated. |
| `workspace.scan` (L1) | C-1 | H1 | Read inventory + candidate submission via MSP. |
| `workspace.scan` (deep) | C-2 | H2 | Twelve-stage decomposition; still candidate-only output. |
| `workspace.impact` | C-1 | H1 | Read-only traversal of the observed link graph. |
| `workspace.validate` | C-1 | H1 | Read-only governance check. |
| `docs.resolve` | C-1 | H1 | Read-only, containment-checked file resolution from approved selectors. |
| `ingest.code` | C-1 | H1 | Containment-checked read + candidate atom submission via MSP. |

- `H` is the executor tool-permission ceiling only. Retrieval distance in impact
  traversal is expressed as `maxDistance` (an R-axis concern), never as `H`.
- Implementations MUST NOT introduce `context_scaling_tier`, `H = hops`, `H = budget`,
  or `H5/H6` active tiers into workspace schemas, symbols, or metadata. Use
  `access_scope`, `retrieval_radius`/`max_hops`, and `context_budget` respectively.

## 8. Failure Semantics and Idempotency

| Condition | Required behavior |
|---|---|
| Re-initialize an already-initialized workspace with identical identity | Succeed idempotently; existing state files are kept, re-validated, and MSP registration retries with the same deterministic `recordId`. |
| Existing state file with a different `schema` value | Hard fail: `Incompatible existing state: <path>`. Never overwrite, never migrate silently. |
| Existing state whose `workspaceId`/`projectId` differs from derived identity | Hard fail: `Incompatible existing state: <path>`. |
| Skill lock does not pin exactly the expected built-in skill (id, version, `contentHash`) | Hard fail on the lock path. |
| MSP client absent or lacks `registerWorkspace` | Hard fail before any registration side effect. |
| Empty/invalid project slug or unsafe `agent_id` | Hard fail from identity derivation (§3.1). |
| Impact traversal with unresolved links | Return results with the unresolved links listed; MUST NOT report completeness. |

Recovery from an incompatible-state failure is a human decision (repair or remove the
conflicting `.govibe`/`.brain` state); the runtime MUST NOT auto-delete workspace state.

## 9. Security and Privacy Invariants

1. All directory creation under the workspace is root-contained (`mkdirSafe`); path
   escape outside the resolved workspace root is forbidden.
2. Private experience is not Shared Vault truth. Promotion from Workspace Private to
   Shared Vault passes MSP validation; promotion to Global Private passes
   reflect/deduplicate/redact/compress. Raw episodes are never copied wholesale.
3. GoVibe and agents may create candidates but MUST NOT assign canonical GKS identities;
   all canonical knowledge writes pass through MSP. GoVibe MUST NOT call GKS or
   GenesisBlockDB directly.
4. Hidden chain-of-thought is never persisted into any vault.
5. Live-data-only: workspace state surfaced to Mission Control reflects real
   `.govibe`/`.brain`/MSP state or an honest empty state — never fabricated telemetry.

## 10. Compatibility and Versioning

- Every state schema is suffixed `/v1`. A breaking change to any state file requires a
  new schema suffix, a migration plan doc, and an ADR; readers reject unknown schemas
  rather than guessing.
- Tool names under `govibe.workspace.*` are the stable public contract. Renames require
  a deprecation alias entry in `scripts/mcp/registry.mjs` and a change request.
- This document versions per `docs/STD-Document-Versioning-Governance.md`.

## 11. Acceptance Criteria

- AC-01: Initializing a fresh workspace produces all §4 files with correct schemas,
  derived identities per §3, and a successful MSP registration record.
- AC-02: Re-running initialize on the same workspace is a no-op for on-disk state and
  reuses the deterministic MSP `recordId`.
- AC-03: Tampering any state file's `schema` or identity fields causes initialize to
  fail with `Incompatible existing state` and no file is overwritten.
- AC-04: Initialize without an MSP client fails before creating a registration.
- AC-05: `govibe.workspace.impact` returns relation chain, distance, score, required
  action, and unresolved links for a known seeded change.
- AC-06: No workspace schema, symbol, or metadata introduces legacy H semantics (§7).
- AC-07 (on personnel implementation): a person never holds an active `employee_id`
  and `staff_id` simultaneously, and employment-type conversion preserves the audit
  trail under the retired ID via a `supersedes` link.
- AC-08 (on RBAC implementation): operations without a covering role assignment are
  denied and the denial is auditable; a `staff_id` subject can never be granted
  `owner`; no RBAC grant permits an operation above the executor's H ceiling.

## 12. Verification

- `npx vitest run packages/govibe-core/src/workspace-spec-conformance.test.mjs` — AC-01..AC-06
  conformance suite (TASK-PRD-013).
- `npx vitest run packages/govibe-core/src/personnel.test.mjs` — §3.3 personnel identity and
  AC-07 coverage (TASK-PRD-014).
- `npx vitest run packages/govibe-core/src/rbac.test.mjs` — §6 RBAC core and AC-08 coverage
  at registry level (TASK-PRD-015).
- `npx vitest run scripts/mcp/rbac-enforcement.test.mjs` — §6 tool-surface enforcement:
  decision point before handler bodies, per-workspace activation, audit trail
  (TASK-PRD-016).
- `npx vitest run scripts/mcp/runtime-core.test.mjs` — runtime initialize coverage.
- `npx vitest run packages/govibe-core/src/capability-runtime.test.mjs` — capability
  surface including workspace initialization.
- `npx vitest run packages/govibe-core/impact-engine.test.mjs` — impact traversal and §5.4
  analysis-boundary reporting (nested git checkouts, root scratch directories).
- `npm run mcp:smoke` — tool catalog exposure of `govibe.workspace.*`.
- `npm run docs:validate` — this document's governance conformance.
- `node --test scripts/mcp/sidecar-rbac-enforcement.security.mjs` — TASK-PRD-026 (AUD-04):
  sidecar `workspace.scan` mission command through `enforceToolRbac` over HTTP and WebSocket.
- `node --test scripts/mcp/docs-ingest-containment.security.mjs` — TASK-PRD-027 (AUD-05):
  path containment and §6.2 RBAC coverage for `govibe.docs.resolve` / `govibe.ingest.code`.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.3.4 | 2026-08-20 | VIBE / Boss | §5.3.3 added: the snapshot frame budget. The sidecar WebSocket connect frame carries the whole snapshot and is validated against MISSION_PROTOCOL_LIMITS.eventBytes, so the ceiling is a property of the snapshot as a whole rather than of any one slice, and every accumulating slice must therefore be bounded. Measured on this repository: non-scan content ~45 KB against a ~900 KB scan budget, leaving ~55 KB of headroom, while one workflow run serialises to ~6 KB. workflowRuns de-duplicated by runId but otherwise appended indefinitely, so roughly nine deep scans in a session would breach the ceiling and a connecting client would silently receive no snapshot at all -- the unbounded slice does not merely grow, it invalidates the scan budget arithmetic that keeps the frame legal. Now bounded to the most recent runs, as terminal already was, with the trim disclosed on the same terms as §5.3.2 (what was kept, what was dropped, and where the dropped records still exist under state/runs/) and newest-first retention required because the tail is what a reader is looking at. Recorded because the repository Docs-First gate (scripts/docs/diff-check.mjs, pull-request scoped) correctly refused a governed runtime-surface change with no accompanying documentation. Evidence: npm run lint exit 0; npx vitest run 125 files, 1047 passed, 1 skipped; scripts/mcp plus packages/govibe-core 81 files, 714 passed. No status change; approved content addition under the live-document precedent this repo already applies to other approved planning/spec docs. |
| 0.3.3 | 2026-08-20 | VIBE / Boss | §5.3.1 and §5.3.2 added, recording the owner-approved MSP semantic change made under TASK-PRD-007. Inventory scope is now derived from the repository's own git ignore rules rather than a hand-maintained list, because a hand list had already drifted (it omitted `scripts/bench/`, which .gitignore excludes precisely because it holds real customer/account mapping data, and it could not express the `benchmark_results/v2/` vs `benchmark_results/logs/` split or the `!local_model/...` negation). Measured on this repository the inventory went 6,838 -> 922 files, and stage-3 unresolved links 3,226 -> 41, because a stale in-repo git worktree was duplicating ~90 governed documents and poisoning basename/doc_id resolution. §5.3.1 further requires that a non-git-toplevel workspace not inherit an enclosing repository's rules (such a workspace previously inventoried as EMPTY), that an unexpected git failure be surfaced rather than silently widening scope (measured blast radius 922 -> 1,726 files including a vendored foreign checkout), and that `governingRuleSets` carry no absolute path so `sourceSnapshotHash` stays content-addressed for §6 replay comparison. §5.3.2 records that observed candidates published to the Mission Control snapshot must not be presented as canonical, and that per-stage bounding must be disclosed with numerator and denominator describing the same population. Evidence: `npm run baseline:check` exit 0; `npx vitest run` exit 0 (124 files, 1033 passed, 1 skipped); real deep scan of this repository reporting status complete, graphValidation true, inventoryMode git, path-free governingRuleSets, 3563 nodes / 2635 edges / 2024 symbols published with 0 dangling, 0 duplicate and 0 scratch nodes. No status change; approved content addition under the live-document precedent this repo already applies to other approved planning/spec docs. |
| 0.3.2 | 2026-08-20 | VIBE / Boss | §5.4: `govibe.workspace.impact` results now declare their own analysis boundary in `boundary.excluded[]`. The link graph is built by walking the filesystem rather than the git index, so a `git worktree add` target parked inside the repository (`.git` written as a *file*, which the walker's `.git` directory-name exclusion never matched) was indexed as a full second copy of the tree — `docs/specs/SPEC-Workspace-System.md` and its worktree twin were both returned as distinct `review_and_update` dependents at distance 1 for the same change. Nested checkouts and root-level scratch directories are now excluded and reported with a reason rather than silently dropped. This is an AGENTS.md §10 correctness fix: phantom dependents inflate the mandatory required-review set with paths nobody should edit. Measured on this repository, a single-seed impact run drops from 197 affected artifacts to 100, with zero worktree duplicates. Evidence: `npx vitest run packages/govibe-core/impact-engine.test.mjs` (9 passed, 6 new covering `.git`-as-file, `.git`-as-directory, scratch exclusion, the nested `src/state/` name-collision guard, and boundary reporting through `calculateWorkspaceImpact`). Deep scan's separate `ignored` set in `packages/govibe-core/src/scan/scan.mjs` was deliberately NOT changed — it governs what is submitted to MSP and needs owner sign-off. No status change; approved content addition under the live-document precedent this repo already applies to other approved planning/spec docs. |
| 0.3.1 | 2026-08-19 | VIBE / Boss | TASK-PRD-026 (AUD-04): the sidecar's `workspace.scan` mission command now passes through the SAME `enforceToolRbac` decision point as stdio (`scripts/mcp/runtime/mission-command-router.mjs`), attributing the actor from the command payload rather than a hardcoded `mission-control` constant. TASK-PRD-027 (AUD-05): `govibe.docs.resolve` and `govibe.ingest.code` added to the §6.2/§7 tables and put behind `scripts/mcp/path-security.mjs`'s existing containment helper — both previously honored absolute/traversal paths with no containment and sat outside the RBAC matrix entirely. Evidence: `node --test scripts/mcp/sidecar-rbac-enforcement.security.mjs` (5 passed), `node --test scripts/mcp/docs-ingest-containment.security.mjs` (11 passed), `npx vitest run packages/govibe-core/src/rbac.test.mjs scripts/mcp/rbac-enforcement.test.mjs` (44 passed). No status change; approved content addition under the live-document precedent this repo already applies to other approved planning/spec docs. |
| 0.3.0 | 2026-08-09 | Boss (CEO) | Ratified draft → approved by owner decision. Content unchanged from 0.2.4+draft; all acceptance criteria AC-01..AC-08 carry executable evidence via the §12 verification suites, merged to main in PR #128 (merge commit c75e636) with the full baseline gate and CI green. |
| 0.2.4+draft | 2026-08-09 | Boss (CEO) | §3.3 open item closed (TASK-PRD-017): the RBAC enforcement boundary now validates `employee_`/`staff_` actors against the workspace personnel registry snapshot (`.govibe/personnel.json`, `govibe-personnel-registry/v1`) — unknown IDs deny as `unknown_personnel_identity`, retired IDs from employment-type conversion deny as `retired_personnel_identity`, both audited; agent actors and snapshot-less workspaces keep their prior posture; unknown snapshot schemas hard-fail per §10. |
| 0.2.3+draft | 2026-08-09 | Boss (CEO) | §6 status updated to implemented-and-enforced-per-workspace: `scripts/mcp/runtime/rbac-enforcement.mjs` wires the RBAC core into `handleToolCall` as a pre-handler decision point over the §6.2 tool operations (scan split by `deep`), activated by `.govibe/rbac.json` (`govibe-rbac-state/v1`) with allow/deny audit in `.govibe/rbac-audit.jsonl`; workspaces without RBAC state keep the pre-RBAC posture. §3.3 note updated: actor attribution is honored at the RBAC boundary; active-identity validation against a personnel registry remains open. §12 lists the enforcement suite. |
| 0.2.2+draft | 2026-08-09 | Boss (CEO) | §6 status updated from specified-not-implemented to core-implemented: `packages/govibe-core/src/rbac.mjs` lands the deny-by-default decision core (scoped assignments over the §6.2 matrix, §6.3 staff ceiling with recorded owner approval and separation of duties, §6.1 H-ceiling intersection sourced from the §7 table, §6.4 allow/deny audit with snapshot round-trip). §12 lists the RBAC suite. Tool-surface enforcement remains pending under TASK-PRD-016. |
| 0.2.1+draft | 2026-08-09 | Boss (CEO) | §3.3 status updated from specified-not-implemented to identity-model-implemented: `packages/govibe-core/src/personnel.mjs` lands the personnel registry (single active identity, conversion via `supersedes`, append-only audit) and `vaults.mjs` gains the rule-4 guard rejecting `employee_`/`staff_` values as agent identifiers. §12 verification now lists the AC-01..AC-06 conformance suite and the §3.3/AC-07 personnel suite. Tool-surface actor attribution remains pending under TASK-PRD-016; §6 RBAC remains specified-not-implemented. |
| 0.2.0+draft | 2026-08-08 | Boss (CEO) | Added §3.3 personnel identity (`employee_id` for permanent employees, `staff_id` for contract staff; single-active-identity, conversion via `supersedes`, actor attribution, separation from `agent_id`) and §6 RBAC (deny-by-default scoped role model, owner/maintainer/operator/viewer permission matrix over the tool surface, contract-staff ceiling below `owner`, separation of duties, allow/deny audit). Both marked specified-not-implemented; renumbered §7–§12 and added AC-07/AC-08. |
| 0.1.0+draft | 2026-08-08 | Boss (CEO) | Initial workspace-system specification: identity derivation, materialization layout, state schemas, lifecycle/tool contracts, MSP boundary, governance-axis conformance, failure semantics, and acceptance criteria — grounded in `packages/govibe-core/src/workspace.mjs`, `packages/govibe-core/src/vaults.mjs`, and `scripts/mcp/registry.mjs`. |
