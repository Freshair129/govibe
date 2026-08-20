// TASK-PRD-007 (D1): graph-presentation policy for the Deep Scan "observed" accumulator
// (packages/govibe-core/src/scan/stage-runner.mjs's runDeepScan()).
//
// These are presentation-only limits for Mission Control's graph/symbol views. They never
// change what a stage submits to MSP -- knowledgePayload() in stage-runner.mjs always carries
// the stage adapter's full, uncapped output regardless of this policy.
//
// Each of the twelve canonical stages (stage-contract.mjs's CANONICAL_STAGES) gets its OWN
// per-collection budget, applied independently every time a stage's output is folded into the
// accumulator. This is what stops an early, high-volume stage (stage 1's filesystem inventory
// produces one node per file -- 6729 on this repo) from exhausting the accumulator before later,
// more structurally interesting stages (3 markdown links, 5 symbols, 8 ORM models, ...) ever get
// a chance to contribute anything.
//
// This constant intentionally has NO relationship to any wire-protocol limit. The
// mission-protocol package is scoped to scripts/mcp/runtime/ (the wire boundary) --
// packages/govibe-core/package.json declares no dependency on it, and this package must not
// import across that boundary. Any assertion against a wire/event-size budget belongs in
// scripts/mcp/runtime/workspace-service.mjs, where MISSION_PROTOCOL_LIMITS is legitimately in
// scope, not here.
export const STAGE_GRAPH_BUDGET = Object.freeze({
  nodes: 500,
  edges: 500,
  symbols: 1500,
});

// TASK-PRD-007 (B3, round 3): the SINGLE authoritative "not this project's source" root list.
// scan.mjs's inventoryWorkspace() now reads the repo's real .gitignore rules (via `git ls-files`
// -- tracked + untracked-but-not-ignored -- when workspacePath is a git working tree) for
// everything .gitignore actually says (ref/, scripts/bench/, local_model/, .playwright-cli/,
// engine/orchestration/brain/, JULES_REPORT.md, benchmark_results/v2/ but NOT the tracked
// benchmark_results/logs/, ...). That covers the general case correctly, including negations and
// partial-path rules, without hand-listing any of it here.
//
// This list is deliberately small and covers only roots .gitignore does NOT (fully) declare, but
// that are still not this project's own source by established project convention:
//   .agents/     Measured on this repo: `git ls-files .agents | wc -l` = 146 git-tracked files
//                (round-3's own comment here previously said "~400 tracked docs", measured wrong
//                by 2.7x; corrected round 4/M7). Excluding the whole root from the scan inventory
//                is a deliberate policy choice, NOT a claim that nothing under it is real GoVibe
//                project source -- it is NOT: AGENTS.md SS9 names `.agents/doc_writer/template/`
//                as THESEUS's (Doc Writer) Specialized SSOT, and
//                `scripts/docs/validate-docs.mjs` reads that same path as its required-template
//                root, so `docs:validate` depends on it. The exclusion is a scope-limiting
//                decision with a known, accepted cost -- those 146 tracked files (including the
//                doc-governance template root) do not reach the scan inventory or MSP knowledge
//                candidates -- made because most of the root (session logs, translator
//                provenance) genuinely IS per-agent working material, and this policy has not
//                been asked to separate the SSOT subtree from the scratch majority. Owner
//                decision on whether to narrow this exclusion (e.g. to just the scratch
//                sub-roots) is still pending; keep the exclusion until that decision is made, but
//                do not describe it as "not project source" -- some of it demonstrably is.
//   .claude/     Claude Code session state. Almost entirely covered by .git/info/exclude's
//                `**/.claude/worktrees/` (the stale govibe-mode-2-implementation-854ff6 worktree
//                duplicating ~90 docs) plus the global excludesFile; 2 tracked files remain.
//   .brain/      Materialized vault content (episodic/session memory). .gitignore only covers
//                `.brain/inbound/`, `.brain/knowledge-block/`, and
//                `.brain/cognitive-system-knowledge-block/`; ~15 tracked memory/RCA docs under
//                `.brain/memory/` and `.brain/rca/` also drop out of the inventory under this
//                root-level policy exclusion. Same tradeoff as .agents/ above: a deliberate,
//                scope-limiting policy choice with a known cost, not a claim that every file
//                under the root is not project source.
//   state/runs/  This scan's own per-run output (stage-runner.mjs's runDirectory). Not declared
//                in .gitignore at all -- excluding the whole `state/` root (the old scan.mjs
//                behavior) was wrong: state/PROJECT_STATE.json, state/events.jsonl, and
//                state/progress.jsonl are real, git-tracked project state. Only state/runs/ (scan
//                self-output; excluding it prevents a scan reading its own or a prior run's
//                artifacts as if they were project content) is excluded.
export const SCRATCH_PATH_ROOTS = [".agents/", ".claude/", ".brain/", "state/runs/"];

/** True if `relativePath` (file OR directory, POSIX-separated, no leading "./") falls under a
 * SCRATCH_PATH_ROOTS root. Works for both "x/y" (file) and "x" (bare directory) inputs. */
export function isScratchPath(relativePath) {
  const withTrailingSlash = relativePath.endsWith("/") ? relativePath : `${relativePath}/`;
  return SCRATCH_PATH_ROOTS.some((root) => withTrailingSlash.startsWith(root));
}

// Node/symbol ids and edge from/to references are built from a small, closed set of prefixes by
// createDefaultStageAdapters() (stage-adapters.mjs) -- strip them so path-based checks below see
// the underlying repo-relative path rather than the id wrapper.
const KNOWN_ID_PREFIXES = ["file:", "directory:", "markdown:", "cobol:", "route:", "tool:", "orm:", "symbol:", "community:", "process:"];
const LINK_ID_PATTERN = /^(?:link-candidate|symbol-link-candidate|imports|inherits):[a-z-]+:(.*)$/i;

function stripIdPrefix(value) {
  for (const prefix of KNOWN_ID_PREFIXES) {
    if (value.startsWith(prefix)) return value.slice(prefix.length);
  }
  const match = value.match(LINK_ID_PATTERN);
  return match ? match[1] : value;
}

function candidatePaths(item) {
  const values = [];
  const props = item?.props ?? {};
  if (typeof item?.path === "string") values.push(item.path);
  if (typeof props.path === "string") values.push(props.path);
  if (typeof props.source_path === "string") values.push(props.source_path);
  if (typeof props.target_path === "string") values.push(props.target_path);
  for (const ref of [item?.id, item?.from, item?.to]) {
    if (typeof ref === "string") values.push(stripIdPrefix(ref));
  }
  return values;
}

// TASK-PRD-007 (B3, round 3): scan.mjs's inventoryWorkspace() now excludes SCRATCH_PATH_ROOTS
// (and real .gitignore matches) BEFORE any stage ever sees them, so no stage adapter can produce
// a candidate under those roots any more -- every node/edge/symbol id is built from an
// `inventory.files`/`inventory.directories` entry. This check is kept as a defense-in-depth
// safety net (cheap, and guards a future stage that synthesizes a path not sourced from the
// inventory), not because it is expected to trigger on real scans any more.
/** True if any path this candidate references falls under a scratch root. Presentation-only. */
export function isScratchCandidate(item) {
  return candidatePaths(item).some(isScratchPath);
}
