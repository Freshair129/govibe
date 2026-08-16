---
doc_id: "ADR-029-GOV-LAYER-LAUNCHER-CONSOLE-BOUNDARY"
title: "ADR-029: Gov-Layer, Launcher, and Console Boundary"
status: "accepted"
version: "0.2.0"
updated: "2026-08-17"
owner: "Boss (CEO)"
source_of_truth: true
type: adr
related_adrs: ["ADR-002", "ADR-012", "ADR-021"]
related_docs:
  - "docs/roadmap/BACKLOG-govlayer-supervision-surfaces.md"
  - "docs/roadmap/MASTERPLAN-govibe-production-readiness.md"
  - "docs/STD-Execution-Governance.md"
  - "PRODUCT.md"
---

# ADR-029: Gov-Layer, Launcher, and Console Boundary

## Status

**Accepted.** The product direction was approved by the owner (Boss) in the
2026-08-17 working session that produced the GoVibe UX Blueprint, and the
owner ratified this document to `accepted` in the same session by explicit
instruction. The same decision authorized the `H4` access-scope override for
the GLS-001 implementation (see the completed handoff in
`docs/roadmap/BACKLOG-govlayer-supervision-surfaces.md`).

## Context

### Market position

The coding-harness market is fragmenting: Claude Code, Codex, Gemini CLI,
deepseek-harness (dsh), OpenClaw, and desktop orchestrators such as
munder-difflin all compete as *executors*. The layer that remains unclaimed is
a harness-agnostic **governance / mission layer**. GoVibe already owns the
ingredients for that layer — the MCP tool surface (ADR-002), the
MissionSnapshot contract, the document-driven roadmap, and the impact engine —
but it lacks two capabilities users expect from a command surface: starting or
addressing an agent from the web UI, and seeing execution as a graph.

### The agent-graph mental model

The owner's approved mental model, which this ADR adopts as vocabulary:

| Term | Meaning | GoVibe mapping |
|---|---|---|
| node | one subagent invoked once, with its own prompt and context window; it finishes and its context is discarded | a run bound to a roadmap Task ID; an A9 console session is the live view of a node executing |
| edge | the artifact that carries one node's output into another's input (a file path, returned JSON) | `artifactLinks` / `verificationLinks` on `WorkflowTaskNode`; enforced by gates, not by model memory |
| state | what survives process death: files, boards, DB rows, worktrees — never chat scrollback | the roadmap masterplan status cells, `.govibe/` metadata, and the MissionSnapshot |
| prompt | the source code of the graph — the typed instruction that declares nodes, fan-out, roles | retained as provenance on the run record |
| harness | the compiler + scheduler that turns the prompt into real execution (queues subagents, intercepts tool calls, makes worktrees, fires hooks) | **always external** — Claude Code, Codex, dsh, etc. |

One sentence: **the harness runs the graph; GoVibe is the state, governance,
and view of the graph.**

### The boundary question

The GoVibe Mode 2 direction states that GoVibe is not another coding agent and
must not own an IDE, a coding agent, or the workspace lifecycle. Adding "click
run and talk to an agent from the web" appears to collide with those
non-goals. This ADR resolves that collision by drawing the boundary precisely
instead of prohibiting supervision entirely.

## Decision

### 1. GoVibe is a Gov layer + Launcher + Console over external harnesses

GoVibe supervises external executors; it never becomes one. Concretely, three
guardrails are binding on all future design and implementation:

1. **No owned agent loop.** GoVibe never calls a model, executes a tool call,
   or manages an executor's context on its behalf. Spawning an external CLI
   agent as a subprocess and streaming its terminal is supervision, not
   execution.
2. **No owned editor.** GoVibe UI never edits workspace files. A terminal
   console is not an IDE.
3. **No owned workspace lifecycle.** Workspace ownership stays external
   (client-owned). GoVibe may own *session* lifecycle — start, attach, stop of
   an executor process — but never git branches, repo layout, or file trees.

### 2. Two supervision surfaces

- **Mission Canvas (view A8).** A node-graph projection of
  `orchestration` / `workflowRuns` snapshot slices. Direction of data is the
  inverse of builder products (SmythOS-class): the runtime emits the graph and
  humans govern it (inspect, approve, rerun). Nodes bind to real Task IDs and
  evidence links; the canvas never renders fabricated structure.
- **Agent Console (view A9).** A PTY module in the sidecar spawns allowlisted
  external CLI agents inside the client-owned workspace and streams terminal
  I/O over the existing WebSocket. The web renders it with a terminal
  emulator. GoVibe's role is process supervisor plus console.

  The console runs the **unmodified vendor CLI binary in a real terminal** —
  exactly as if the user had opened it themselves, only hosted inside the
  GoVibe shell as the single point of command. The user's own authentication,
  subscription, hooks, and MCP configuration apply unchanged. GoVibe therefore
  requires **no API keys, no gateway, and no third-party relay** to command an
  agent — a deliberate product differentiator against harnesses whose built-in
  command surface is their own runtime and needs external provider keys.

  The board-first loop this serves: the user commands the agent in the
  console; the agent writes plans, sprints, and backlog as roadmap documents;
  those documents render as cards on the Roadmap Board; the owner approves by
  ratification; and card status is advanced by system-enforced signals (agent
  hooks and `govibe.roadmap.update` through the MCP surface), never by model
  memory.

### 3. Contract changes go through the versioned contract path

The `agent.session.*` commands/events and a `sessions` snapshot slice are new
MissionSnapshot contract surface. They must be added to both the TypeScript
contract and the runtime snapshot in the same change, with reverse-dependency
impact analysis run before completion. This ADR authorizes the *intent*; the
concrete schema lands with the implementation tasks in
`docs/roadmap/BACKLOG-govlayer-supervision-surfaces.md`.

### 4. Security invariants

1. The sidecar remains loopback-bound (`127.0.0.1`); no network-reachable
   deployment is implied by this ADR.
2. The PTY module spawns only binaries from an explicit allowlist; it never
   executes arbitrary commands received from the web surface.
3. Every session declares an `access_scope` ceiling (`H0`–`H4` per ADR-021 /
   STD-Execution-Governance) at start; the console displays it. `H4` sessions
   require an owner approval gate before start.
4. Canvas actions (approve / rerun / assign) emit audit events and respect the
   same approval gates.

### 5. Mandatory node execution contract

Every node (one subagent invocation) dispatched under GoVibe supervision must
carry a schema-enforced execution contract. A node without a contract is not
schedulable. The contract declares at minimum:

```text
node_id            binding to a roadmap Task ID or packet id
inputs / outputs   the edges: concrete artifact paths or returned payloads
acceptance_criteria  testable Given/When/Then statements
exit_gate          the deterministic command(s) whose pass/fail closes the node
retry              escalation policy — one tier rung at a time per
                   docs/STD-SLM-Tiered-Routing.md; never silent re-runs
rework             a deterministic exit_gate failure returns the work to the
                   same executor with the tool output attached; reviewers
                   above L0 may pass or escalate, never silently rewrite
```

This is an application of the existing Execution Packet contract
(`docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md` §5)
and the tiered review cascade (`docs/features/agent-team/FEAT-Tiered-Review.md`)
to every supervised node, not a new competing schema.

STATE artifacts and node contracts are **generated, not hand-typed**: a
dedicated generator (a script or a bounded subagent) materializes the contract
and the durable state records (board rows, session records, evidence links)
from the plan source. Hooks enforce the edge — a node whose exit gate has not
recorded its evidence cannot hand off, enforced by the system rather than by
model memory. The Mission Canvas renders each node's gate status; a node with
no contract renders as a defect, not as a normal node.

### 6. PM interoperability: interlingua hub with standalone parity

GoVibe is the communication middle layer between agents and the project
management tools different teams actually use. An agent writes plans, sprints,
and backlog into GoVibe's canonical plan model; GoVibe translates the format
per target team and delivers it through that platform's MCP server or API
(e.g. Team A on Notion, Team B on Jira). This extends the interlingua thesis
of ADR-017 from governance semantics to plan distribution.

Binding rules:

1. **Canonical stays home.** The roadmap documents and Task Containers remain
   the single canonical plan. External PM entries are projections carrying a
   backlink to the canonical Task ID.
2. **Outbound first; inbound is observed.** Export/push is the first
   capability. Changes made inside an external PM flow back only as observed
   update candidates for review — they never silently overwrite canonical
   state. This mirrors the observed-vs-canonical promotion pattern already
   used by Deep Scan and GKS.
3. **Lossy projection is declared.** When a target cannot represent a
   canonical field (containers, evidence links, access scopes), the adapter
   records the projection state (`EXACT` / `EQUIVALENT` / `APPROXIMATE` /
   `PARTIAL` / `UNPROJECTABLE`) instead of claiming a complete conversion.
4. **Standalone parity.** With no external PM configured, GoVibe itself is a
   complete PM — board, backlog, containers, approvals — with no degraded
   capability. External adapters are additive, never required.
5. **Adapters behind one contract.** Per-platform behavior lives behind a
   `PmAdapter` contract (the same pattern as the Mode 2 `WorkspaceAdapter`);
   no `if platform == "jira"` business logic in core.

## Consequences

### Positive

- GoVibe gains the "run and command from the web" experience without becoming
  a harness, preserving provider neutrality (any CLI agent that runs in a
  terminal is supportable).
- The canvas engine is reusable for the Genesis Knowledge graph views once
  their producers exist.
- The three guardrails give reviewers a mechanical test for future scope
  questions ("does this add an agent loop, an editor, or workspace
  ownership?").

### Negative

- Process supervision widens the sidecar's responsibility and its security
  surface (PTY, subprocess lifecycle); the allowlist and loopback invariants
  must be tested, not assumed.
- The MissionSnapshot contract grows while GATE-CONTRACT (frontend/runtime
  parity) is still unmet; sequencing must respect the readiness plan's
  contract work.

### Neutral / Trade-offs

- A desktop shell (e.g. Tauri wrapping Mission Control) remains possible later
  and is out of scope here; the web surfaces come first.
- A presence/"virtual office" layer is deferred; agent status cards plus the
  console cover the need at far lower cost.

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Fork munder-difflin as "GoVibe Desktop" | Pixel-art assets are non-commercial; product identity (virtual office) differs; two state models would coexist. Its node-pty/xterm.js pattern is adopted as a reference instead. |
| Fork/adopt SmythOS Studio | Ships its own agent runtime and builder-first canvas — the opposite of the Gov-layer thesis; heavy stack (own runtime, middleware, MySQL). Only its canvas layout conventions are adopted. |
| Adopt deepseek-harness (dsh) web UI | dsh is an executor harness; adopting its UI would abandon the MissionSnapshot contract and make GoVibe a coding agent. dsh remains a candidate *client* behind an adapter. |
| Prohibit web-run entirely (status quo) | Leaves the primary user expectation of a command center unmet and cedes the differentiating gap in the market. |

## Related Documents

- `docs/roadmap/BACKLOG-govlayer-supervision-surfaces.md` — implementation plan bound to this ADR
- `docs/adr/ADR-021-H-Axis-Access-Scope-Semantic-Separation.md` — access-scope semantics used by session ceilings
- `docs/adr/ADR-002-MCP-As-Primary-Orchestration-Interface.md` — the MCP surface this ADR extends, not replaces
- `docs/adr/ADR-012-Visual-Agent-Fleet-Governance.md` — fleet governance the console surfaces build on

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.2.0 | 2026-08-17 | Ratified to accepted by explicit owner (Boss) instruction in session; the same decision authorized the H4 override for GLS-001 implementation. |
| 0.1.0+draft | 2026-08-17 | Initial decision record: Gov layer + Launcher + Console boundary, three guardrails, A8/A9 supervision surfaces, security invariants, the mandatory node execution contract (AC / exit gate / retry / rework, generator-produced STATE and contracts), and the PM interoperability decision (interlingua hub over Notion/Jira-class tools with outbound-first sync and standalone parity) — all recorded on owner direction in the same session. Direction approved by owner; document proposed, not yet ratified. |
